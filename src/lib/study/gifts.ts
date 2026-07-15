/**
 * Gift SKU catalog for Classraum Study.
 *
 * A parent buys a one-time "gift" (no recurring charge, no card stored on
 * the student), receives a human-friendly redemption code, and hands it
 * to their student. The student redeems the code for a fixed window of
 * Premium plus a batch of test credits — modelled exactly like the
 * seasonal exam pass: an active premium_v1 row with
 * cancel_at_period_end = true and next_grant_at = null, so the billing
 * cron finalizes it at expiry and never charges a renewal.
 *
 * Single source of truth for price / duration / credits so a change is
 * one edit. Kept in its OWN file (not plans.ts) so the gift SKU can ship
 * independently of the recurring plan catalog.
 */

export interface StudyGift {
  id: string
  /** Price in whole won (PortOne charges won, not minor units). */
  priceWon: number
  /** Months of Premium granted on redemption. Window = months * 30 days. */
  months: number
  /** Test credits dropped into the purchased bucket on redemption. */
  credits: number
  /** PortOne order name on the parent's card statement. */
  orderName: string
  name_en: string
  name_ko: string
}

/**
 * The 3-month Premium gift. The redemption grants Premium (plan
 * premium_v1) for `months * 30` days and `credits` purchased credits.
 */
export const GIFT: StudyGift = {
  id: 'gift_premium_3mo_v1',
  priceWon: 45000,
  months: 3,
  credits: 20,
  orderName: 'Classraum Study — 3-Month Premium Gift',
  name_en: '3-Month Premium Gift',
  name_ko: '3개월 프리미엄 선물',
}

// Unambiguous alphabet: no 0/O, no 1/I, no vowels-that-form-words risk is
// acceptable but we drop the visually confusable pairs. 32 symbols.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const GROUP_LEN = 4
const GROUPS = 2

/**
 * Produce a human-friendly redemption code like `GIFT-7K3P-QW9F`.
 *
 * Uses crypto.getRandomValues (unpredictable — a guessable code is a
 * theft vector) over an unambiguous alphabet with no 0/O/1/I so the code
 * survives being read aloud or copied from a screenshot. Rejection
 * sampling keeps the distribution uniform across the 32-symbol alphabet.
 */
export function generateGiftCode(): string {
  const groups: string[] = []
  for (let g = 0; g < GROUPS; g++) {
    let out = ''
    while (out.length < GROUP_LEN) {
      const buf = new Uint8Array(GROUP_LEN)
      crypto.getRandomValues(buf)
      for (let i = 0; i < buf.length && out.length < GROUP_LEN; i++) {
        const v = buf[i]!
        // Reject the top of the byte range that doesn't divide evenly into
        // 32, so every symbol is equally likely.
        if (v >= 256 - (256 % CODE_ALPHABET.length)) continue
        out += CODE_ALPHABET[v % CODE_ALPHABET.length]
      }
    }
    groups.push(out)
  }
  return `GIFT-${groups.join('-')}`
}

/** Normalize a user-entered code: trim + uppercase. Case-insensitive
 *  matching happens in the redeem route via a lower(code) lookup. */
export function normalizeGiftCode(input: string): string {
  return input.trim().toUpperCase()
}
