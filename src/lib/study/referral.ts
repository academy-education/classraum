/**
 * Referral-loop constants + helpers for Classraum Study (B2C).
 *
 * Two-stage rewards, both in never-expiring purchased-bucket credits:
 *   1. SIGNUP  — when the friend redeems the code, BOTH sides get
 *      REFERRAL_SIGNUP_CREDITS, exactly once (a small "you joined" nudge).
 *   2. PREMIUM — when that referred friend FIRST becomes a paying
 *      subscriber, BOTH sides get REFERRAL_PREMIUM_CREDITS, exactly once
 *      (the real reward — quality referrals, not just signups).
 *
 * Signup granting + idempotency live in the redeem route; the premium
 * grant lives in referral-conversion.ts (called from the subscribe path).
 * This file only owns the reward sizes + the code generator so tests and
 * routes agree.
 */

/** Credits to EACH side (referrer + referee) when the code is redeemed. */
export const REFERRAL_SIGNUP_CREDITS = 1

/** Extra credits to EACH side when the referred friend first goes paid. */
export const REFERRAL_PREMIUM_CREDITS = 10

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
