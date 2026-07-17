import { getPortOneConfig } from '@/lib/portone-config'

/**
 * Single-charge helper against a stored PortOne v2 billing key.
 * Used by:
 *   - /api/study/subscription/billing-key (first month after issue)
 *   - /api/cron/study-billing            (monthly renewal)
 *
 * paymentId MUST be unique per attempt — PortOne uses it as the
 * idempotency key. Callers should namespace it with the study sub id
 * + a period marker (e.g. timestamp or YYYY-MM) so a retry within
 * the same period doesn't double-charge.
 */
// V2 billing-key payment: paymentId (the idempotency key) lives in
// the URL path, not the body. https://developers.portone.io/api/rest-v2
const PORTONE_API_BASE = 'https://api.portone.io'

export interface PortOneChargeInput {
  billingKey: string
  paymentId: string
  amount: number // KRW, whole won (NOT minor units — PortOne API is in won)
  orderName: string
  customerId: string
  customData?: Record<string, unknown>
}

export interface PortOneChargeResult {
  ok: boolean
  /** PortOne's reported status when the charge resolves. 'PAID' on success. */
  status?: string
  /** Raw payment object — useful for downstream webhook reconciliation. */
  payment?: Record<string, unknown>
  /** Code (e.g. PG_PROVIDER) when the charge bounces. */
  code?: string
  /** Human-readable failure reason. */
  message?: string
  httpStatus?: number
}

export interface VerifyOneTimeInput {
  paymentId: string
  /** Expected charge in whole won — mismatch fails verification. */
  expectedAmount: number
  /** Expected customData.kind (e.g. 'study_exam_pass'). */
  expectedKind: string
}

export interface VerifyOneTimeResult {
  ok: boolean
  message?: string
  /** Parsed customData from the payment, for product/buyer checks. */
  customData?: Record<string, unknown>
}

/**
 * Verify a client-initiated one-time payment (browser-SDK requestPayment)
 * before granting the product: the payment must exist, be PAID, in KRW,
 * for exactly the expected amount, and carry the expected customData
 * kind. Callers must ALSO check customData product/buyer fields and
 * record the paymentId for idempotency — PortOne does not prevent the
 * same paid payment from being redeemed twice on our side.
 */
export async function verifyOneTimePayment(input: VerifyOneTimeInput): Promise<VerifyOneTimeResult> {
  const cfg = getPortOneConfig()
  if (!cfg.apiSecret) return { ok: false, message: 'PORTONE_API_SECRET not configured' }

  let response: Response
  try {
    response = await fetch(`${PORTONE_API_BASE}/payments/${encodeURIComponent(input.paymentId)}`, {
      headers: { Authorization: `PortOne ${cfg.apiSecret}` },
    })
  } catch (e) {
    return { ok: false, message: `network: ${(e as Error).message}` }
  }
  let body: Record<string, unknown> = {}
  try { body = await response.json() } catch { /* non-JSON */ }
  if (!response.ok) {
    return { ok: false, message: typeof body.message === 'string' ? body.message : `HTTP ${response.status}` }
  }

  if (body.status !== 'PAID') {
    return { ok: false, message: `payment status ${String(body.status)}` }
  }
  const amount = body.amount as { total?: number } | undefined
  if (!amount || amount.total !== input.expectedAmount) {
    return { ok: false, message: `amount mismatch (got ${amount?.total}, expected ${input.expectedAmount})` }
  }
  if (body.currency !== 'KRW') {
    return { ok: false, message: `currency ${String(body.currency)}` }
  }
  let customData: Record<string, unknown> = {}
  try {
    customData = typeof body.customData === 'string' ? JSON.parse(body.customData) : (body.customData as Record<string, unknown>) ?? {}
  } catch { /* leave empty → kind check fails */ }
  if (customData.kind !== input.expectedKind) {
    return { ok: false, message: `customData kind mismatch (${String(customData.kind)})` }
  }
  return { ok: true, customData }
}

export async function chargeBillingKey(input: PortOneChargeInput): Promise<PortOneChargeResult> {
  const cfg = getPortOneConfig()
  if (!cfg.apiSecret) {
    return { ok: false, message: 'PORTONE_API_SECRET not configured' }
  }

  let response: Response
  try {
    response = await fetch(`${PORTONE_API_BASE}/payments/${encodeURIComponent(input.paymentId)}/billing-key`, {
      method: 'POST',
      headers: {
        Authorization: `PortOne ${cfg.apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storeId: cfg.storeId,
        billingKey: input.billingKey,
        orderName: input.orderName,
        amount: { total: input.amount },
        currency: 'KRW',
        customer: { id: input.customerId },
        // The V2 API takes customData as a string, not an object.
        customData: JSON.stringify(input.customData ?? {}),
      }),
    })
  } catch (e) {
    return { ok: false, message: `network: ${(e as Error).message}` }
  }

  let body: Record<string, unknown> = {}
  try { body = await response.json() } catch { /* non-JSON */ }

  if (!response.ok) {
    return {
      ok: false,
      httpStatus: response.status,
      code: typeof body.type === 'string' ? body.type : undefined,
      message: typeof body.message === 'string' ? body.message : `HTTP ${response.status}`,
    }
  }

  // A 200 from POST /payments/{id}/billing-key IS the success response
  // (PayWithBillingKeyResponse) — there is no top-level status field;
  // failures come back as non-2xx with a typed error body above.
  return {
    ok: true,
    status: 'PAID',
    httpStatus: response.status,
    payment: (body.payment as Record<string, unknown> | undefined) ?? body,
  }
}
