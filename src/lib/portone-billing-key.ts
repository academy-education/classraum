/**
 * PortOne V2 billing-key cancellation.
 *
 * Used during the Phase 3 academy-cascade cron — when an academy is
 * permanently deleted we must explicitly release the customer's stored
 * card token at PortOne, otherwise it lingers indefinitely on their side.
 *
 * Endpoint: DELETE https://api.portone.io/billing-keys/{billingKey}
 *   Auth:    Authorization: PortOne <PORTONE_API_SECRET>
 *   Query:   storeId (optional but recommended)
 *   Response 200 → deleted
 *   Response 404 → BillingKeyNotFound (idempotent success — already gone)
 *   Response 409 → BillingKeyAlreadyDeleted (idempotent success)
 *   Other     → log + return failure; cascade continues regardless
 *
 * NEVER throws — the academy delete must succeed even if PortOne's
 * cleanup fails. Caller is expected to log + stamp
 * `academy_subscriptions.billing_key_cancelled_at` on success.
 */

const PORTONE_API_URL = 'https://api.portone.io'

export interface DeleteBillingKeyResult {
  /** True if the billing key was deleted OR was already gone. */
  cancelled: boolean
  /** Filled when cancelled === false; for logging only. */
  error?: string
  /** PortOne error code, if any. */
  code?: string
  /** Raw HTTP status from PortOne. */
  status?: number
}

/**
 * Delete a PortOne V2 billing key. Idempotent: missing / already-deleted
 * keys are treated as success.
 *
 * @param billingKey  The opaque billing-key string returned by PortOne
 *                    at issuance time and stored on academy_subscriptions.
 * @param storeId     Optional PortOne store id. Defaults to env value.
 */
export async function deletePortOneBillingKey(
  billingKey: string,
  storeId?: string
): Promise<DeleteBillingKeyResult> {
  const apiSecret = process.env.PORTONE_API_SECRET
  if (!apiSecret) {
    return {
      cancelled: false,
      error: 'PORTONE_API_SECRET not configured',
    }
  }

  if (!billingKey || typeof billingKey !== 'string') {
    return {
      cancelled: false,
      error: 'billingKey is required',
    }
  }

  const effectiveStoreId = storeId ?? process.env.NEXT_PUBLIC_PORTONE_STORE_ID
  const qs = effectiveStoreId
    ? `?storeId=${encodeURIComponent(effectiveStoreId)}`
    : ''
  const url = `${PORTONE_API_URL}/billing-keys/${encodeURIComponent(
    billingKey
  )}${qs}`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `PortOne ${apiSecret}`,
        'Content-Type': 'application/json',
      },
    })
  } catch (e) {
    return {
      cancelled: false,
      error: `network: ${(e as Error).message}`,
    }
  }

  // 200 = success; PortOne returns an empty body or { revokedAt } here.
  if (response.ok) {
    return { cancelled: true, status: response.status }
  }

  // Parse the structured error so we can detect idempotent cases.
  let body: { type?: string; message?: string } = {}
  try {
    body = await response.json()
  } catch {
    /* ignore — non-JSON error */
  }

  const code = body.type || ''
  // Idempotent cases per the PortOne V2 OpenAPI spec:
  //   404 BillingKeyNotFoundError / BillingKeyNotIssuedError
  //   409 BillingKeyAlreadyDeletedError
  // Treat all of these as "already done" — exactly what we want for a
  // cleanup cron that may retry.
  if (
    response.status === 404 ||
    code === 'BILLING_KEY_NOT_FOUND' ||
    code === 'BILLING_KEY_NOT_ISSUED' ||
    code === 'BILLING_KEY_ALREADY_DELETED'
  ) {
    return { cancelled: true, status: response.status, code }
  }

  return {
    cancelled: false,
    status: response.status,
    code,
    error: body.message || `HTTP ${response.status}`,
  }
}
