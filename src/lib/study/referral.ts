/**
 * Referral-loop constants + helpers for Classraum Study (B2C).
 *
 * A student invites a friend with their code; when the friend redeems it,
 * BOTH sides get REFERRAL_REWARD_CREDITS purchased test credits, exactly
 * once. Reward-granting + idempotency live in the redeem route; this file
 * only owns the reward size and the code generator so tests and routes
 * agree on both.
 */

/** Credits granted to EACH side (referrer + referee) on a successful
 *  redemption. Purchased-bucket credits, so they never expire. */
export const REFERRAL_REWARD_CREDITS = 5

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
