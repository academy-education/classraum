import { STUDY_PLANS, STUDY_PASSES, CREDIT_PACKS } from '@/lib/study/plans'

/**
 * Attribute a study payment to the credits it granted, for the refund
 * dialog's "refund unused credits" preset.
 *
 * study_payments records only (kind, amount_won) — not the pack/pass/plan id
 * — so attribution matches the paid price against the catalog in plans.ts:
 *   • study_credit_pack   → CREDIT_PACKS by priceWon   → purchased bucket
 *   • study_exam_pass     → STUDY_PASSES by priceWon   → study_pass_credits
 *   • study_subscription  → STUDY_PLANS by priceWon    → grant bucket
 *
 * When the price matches nothing, or matches entries that granted DIFFERENT
 * credit counts, the attribution is ambiguous and the caller must show no
 * prefill (never guess). Matching entries with the SAME credit count are
 * fine — the formula only needs the count.
 */

export type CreditBucket = 'grant' | 'purchased' | 'pass'

export type CreditAttribution =
  | { ok: true; grantedCredits: number; bucket: CreditBucket; passTests?: string[] }
  | { ok: false; reason: 'zero_amount' | 'unknown_kind' | 'no_catalog_match' | 'ambiguous_catalog_match' | 'zero_credit_grant' }

export function attributePaymentCredits(kind: string, amountWon: number | null | undefined): CreditAttribution {
  if (typeof amountWon !== 'number' || amountWon <= 0) return { ok: false, reason: 'zero_amount' }

  if (kind === 'study_credit_pack') {
    const matches = CREDIT_PACKS.filter(p => p.priceWon === amountWon)
    if (matches.length === 0) return { ok: false, reason: 'no_catalog_match' }
    const credits = new Set(matches.map(m => m.credits))
    if (credits.size !== 1) return { ok: false, reason: 'ambiguous_catalog_match' }
    const granted = matches[0].credits
    if (granted <= 0) return { ok: false, reason: 'zero_credit_grant' }
    return { ok: true, grantedCredits: granted, bucket: 'purchased' }
  }

  if (kind === 'study_exam_pass') {
    const matches = STUDY_PASSES.filter(p => p.priceWon === amountWon)
    if (matches.length === 0) return { ok: false, reason: 'no_catalog_match' }
    const credits = new Set(matches.map(m => m.credits))
    if (credits.size !== 1) return { ok: false, reason: 'ambiguous_catalog_match' }
    const granted = matches[0].credits
    if (granted <= 0) return { ok: false, reason: 'zero_credit_grant' }
    return { ok: true, grantedCredits: granted, bucket: 'pass', passTests: matches.map(m => m.test) }
  }

  if (kind === 'study_subscription') {
    const matches = Object.values(STUDY_PLANS).filter(p => p.priceWon === amountWon)
    if (matches.length === 0) return { ok: false, reason: 'no_catalog_match' }
    const credits = new Set(matches.map(m => m.monthlyCredits))
    if (credits.size !== 1) return { ok: false, reason: 'ambiguous_catalog_match' }
    const granted = matches[0].monthlyCredits
    if (granted <= 0) return { ok: false, reason: 'zero_credit_grant' }
    return { ok: true, grantedCredits: granted, bucket: 'grant' }
  }

  return { ok: false, reason: 'unknown_kind' }
}
