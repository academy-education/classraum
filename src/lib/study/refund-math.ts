/**
 * Pure math for partial study-payment refunds.
 *
 * The admin refund route (POST /api/admin/study/payments) uses this to
 * compute the remaining refundable amount and to reject requests before any
 * money moves. The DB function admin_insert_study_refund re-checks the same
 * rule atomically under a row lock (the authoritative guard against
 * concurrent refunds); this module exists so the rule is unit-testable and
 * so the route and dialog agree on the numbers.
 */

export interface RefundRecordLike {
  amountWon: number
}

/** Total already refunded across the ledger. */
export function refundedTotalWon(refunds: readonly RefundRecordLike[]): number {
  return refunds.reduce((sum, r) => sum + (Number.isFinite(r.amountWon) ? r.amountWon : 0), 0)
}

/** What is still refundable: payment amount minus prior refunds (never below 0). */
export function remainingWon(amountWon: number | null | undefined, refunds: readonly RefundRecordLike[]): number {
  const total = typeof amountWon === 'number' && Number.isFinite(amountWon) ? amountWon : 0
  return Math.max(0, total - refundedTotalWon(refunds))
}

/**
 * "Refund unused credits" preset:
 *   refund = floor(paymentWon × unusedCredits ÷ grantedCredits)
 * in whole won, with unused clamped into [0, granted]. Returns null when the
 * granted count is unknown/zero (no meaningful pro-rating exists) — callers
 * must then show no prefill rather than guess. The result is a SUGGESTION:
 * it still goes through validateRefundAmount against the remaining balance
 * like any manually typed amount.
 */
export function creditPresetWon(
  paymentWon: number | null | undefined,
  unusedCredits: number,
  grantedCredits: number,
): number | null {
  if (typeof paymentWon !== 'number' || !Number.isFinite(paymentWon) || paymentWon <= 0) return null
  if (!Number.isFinite(grantedCredits) || grantedCredits <= 0) return null
  const clamped = Math.min(Math.max(0, unusedCredits), grantedCredits)
  return Math.floor((paymentWon * clamped) / grantedCredits)
}

export type RefundValidation =
  | { ok: true; amountWon: number }
  | { ok: false; error: 'nothing_remaining' | 'invalid_amount' | 'exceeds_remaining' }

/**
 * Validate a requested refund amount against the remaining balance.
 * `requested` undefined → refund the full remaining amount.
 */
export function validateRefundAmount(requested: number | undefined, remaining: number): RefundValidation {
  if (remaining <= 0) return { ok: false, error: 'nothing_remaining' }
  if (requested === undefined) return { ok: true, amountWon: remaining }
  if (typeof requested !== 'number' || !Number.isInteger(requested) || requested <= 0) {
    return { ok: false, error: 'invalid_amount' }
  }
  if (requested > remaining) return { ok: false, error: 'exceeds_remaining' }
  return { ok: true, amountWon: requested }
}
