/**
 * Pure decision logic for refund REVOCATIONS — what a refund may also
 * take back, beyond returning money.
 *
 * The admin refund dialog offers two admin-picked checkboxes:
 *   • revokeCredits — claw back the remaining credits from the bucket
 *     this payment filled (grant / purchased / pass:<test>), using the
 *     same catalog attribution as the "refund unused credits" preset.
 *   • revokeAccess  — take back the access the payment bought:
 *       pass payments → expire the pass subscription row + delete its
 *                       study_entitlements row (the Stellar closure ops)
 *       plan payments → set the subscription to expired at once
 *     Credit packs buy no access, so the option does not apply to them.
 *
 * This module holds the RULES only (unit-testable, shared by route and
 * dialog); the route performs the actual writes with the service role
 * and records a compensating study_credit_ledger row (kind 'refund')
 * for any credit clawback, like the manual Stellar clawback did.
 */

export type AccessRevocationKind = 'pass' | 'plan'

/** What kind of access this payment kind bought, if any. */
export function accessRevocationFor(paymentKind: string): AccessRevocationKind | null {
  if (paymentKind === 'study_exam_pass') return 'pass'
  if (paymentKind === 'study_subscription') return 'plan'
  return null // credit packs buy credits, not access
}

/**
 * How many credits a clawback removes: everything still in the bucket,
 * capped at what this payment granted (never claw back credits from a
 * different purchase), never negative.
 */
export function revocableCredits(bucketRemaining: number, grantedCredits: number): number {
  if (!Number.isFinite(bucketRemaining) || !Number.isFinite(grantedCredits)) return 0
  return Math.max(0, Math.min(bucketRemaining, grantedCredits))
}

export type RevocationValidation =
  | { ok: true }
  | {
      ok: false
      error:
        | 'revoke_access_not_applicable'
        | 'revoke_access_requires_full_refund'
        | 'revoke_credits_unattributable'
    }

/**
 * Validate a revocation request against the refund it rides on.
 *
 * Rules:
 *   - revokeAccess only for payment kinds that bought access (pass/plan).
 *   - revokeAccess only when THIS refund takes the remaining balance to 0
 *     (refuse on partials — access must not vanish while money is kept).
 *   - revokeCredits only when the payment's credit grant is unambiguously
 *     attributable (same standard as the credit preset: never guess).
 *
 * `requestedWon` is the already-validated refund amount; `remainingWon`
 * is the balance BEFORE this refund.
 */
export function validateRevocationRequest(opts: {
  paymentKind: string
  revokeCredits: boolean
  revokeAccess: boolean
  requestedWon: number
  remainingWon: number
  /** Credit attribution resolved unambiguously (bucket + granted count)? */
  attributed: boolean
}): RevocationValidation {
  if (opts.revokeAccess) {
    if (accessRevocationFor(opts.paymentKind) === null) {
      return { ok: false, error: 'revoke_access_not_applicable' }
    }
    if (opts.requestedWon !== opts.remainingWon) {
      return { ok: false, error: 'revoke_access_requires_full_refund' }
    }
  }
  if (opts.revokeCredits && !opts.attributed) {
    return { ok: false, error: 'revoke_credits_unattributable' }
  }
  return { ok: true }
}
