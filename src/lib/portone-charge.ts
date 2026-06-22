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
const PORTONE_API_URL = 'https://api.portone.io/v2/payments/billing-key'

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

export async function chargeBillingKey(input: PortOneChargeInput): Promise<PortOneChargeResult> {
  const cfg = getPortOneConfig()
  if (!cfg.apiSecret) {
    return { ok: false, message: 'PORTONE_API_SECRET not configured' }
  }

  let response: Response
  try {
    response = await fetch(PORTONE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `PortOne ${cfg.apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storeId: cfg.storeId,
        billingKey: input.billingKey,
        paymentId: input.paymentId,
        orderName: input.orderName,
        amount: { total: input.amount, currency: 'KRW' },
        customer: { id: input.customerId },
        customData: input.customData ?? {},
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

  // 200 OK but status may still be e.g. 'FAILED' for asynchronously
  // failing PGs — treat anything not PAID as a failure.
  const status = typeof body.status === 'string' ? body.status : undefined
  if (status !== 'PAID') {
    return {
      ok: false,
      status,
      httpStatus: response.status,
      payment: body,
      message: typeof body.message === 'string' ? body.message : `status=${status ?? 'unknown'}`,
    }
  }

  return {
    ok: true,
    status,
    httpStatus: response.status,
    payment: body,
  }
}
