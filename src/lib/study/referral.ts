/**
 * Referral-loop constants + helpers for Classraum Study (B2C).
 *
 * ONE reward (since 2026-10-01): the invited friend gets
 * REFERRAL_INVITEE_CREDITS never-expiring purchased-bucket credits when they
 * redeem the code, exactly once. The inviter gets nothing, and nothing is
 * paid when the friend later subscribes (that is still recorded, unpaid, in
 * referral-conversion.ts).
 *
 * Until then it was two stages: +1 to BOTH sides on redeem, +5 to BOTH on
 * the friend's first payment. Credits already paid under that scheme stay
 * where they are; the referral page reads them from the ledger.
 *
 * Granting + idempotency live in the redeem route. This file owns the reward
 * size + the code generator so tests, routes and every page agree.
 */

/** Credits the INVITED friend gets on redeeming a code. Every surface must
 *  read this constant: the referral page, its share text, the invite landing
 *  page and the profile row all print it. */
export const REFERRAL_INVITEE_CREDITS = 5

/** Length of a generated referral code. */
export const REFERRAL_CODE_LENGTH = 6

/**
 * Unambiguous uppercase alphabet — excludes 0/O, 1/I/L, and the
 * digit-confusable letters so a code read off a screen or dictated over
 * the phone can't be mistyped. 31 symbols.
 */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/**
 * Generate a short, uppercase, unambiguous referral code using a CSPRNG.
 * Rejection-sampled so the alphabet is drawn uniformly (no modulo bias).
 * `crypto.getRandomValues` is available in the route (edge/node) runtime
 * and in the browser.
 */
export function generateReferralCode(length: number = REFERRAL_CODE_LENGTH): string {
  const alphabetLen = CODE_ALPHABET.length
  // Largest multiple of alphabetLen that fits in a byte — bytes at or
  // above this are discarded so every symbol is equally likely.
  const cutoff = Math.floor(256 / alphabetLen) * alphabetLen
  let out = ''
  const buf = new Uint8Array(length)
  while (out.length < length) {
    crypto.getRandomValues(buf)
    for (let i = 0; i < buf.length && out.length < length; i++) {
      const b = buf[i]!
      if (b < cutoff) out += CODE_ALPHABET[b % alphabetLen]
    }
  }
  return out
}

/** Normalize user-entered codes: trim + uppercase so redeem is
 *  case/whitespace-insensitive against the stored (uppercase) code. */
export function normalizeReferralCode(raw: string): string {
  return raw.trim().toUpperCase()
}

/**
 * Could this string be one of our codes? Shape only — says nothing about
 * whether the code EXISTS.
 *
 * Used by the public /invite/[code] page so a URL that could never be a
 * real code 404s instead of rendering a branded page for arbitrary input.
 * The existence check is deliberately NOT done there: /invite is
 * unauthenticated, so looking a code up would let anyone probe which codes
 * are real, and with a 6-character alphabet that is a cheap enumeration.
 * A wrong-but-well-formed code therefore renders the page and fails at
 * redeem, behind auth, where the redeem route already answers
 * `unknown_code`.
 */
export function isWellFormedReferralCode(raw: string): boolean {
  const c = normalizeReferralCode(raw)
  if (c.length !== REFERRAL_CODE_LENGTH) return false
  for (const ch of c) if (!CODE_ALPHABET.includes(ch)) return false
  return true
}
