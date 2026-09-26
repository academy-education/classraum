/**
 * Email plausibility, in one place.
 *
 * WHY THIS EXISTS: on 2026-09-26 a student signed up with
 * `name@gmailcom` — the dot before `com` missing. The browser's
 * `type="email"` check accepts that (RFC-wise `user@host` is a valid
 * address), Supabase accepted it, the account was auto-confirmed, and the
 * student then used it for the rest of the day. Nothing we send to that
 * address will ever arrive, and a password reset is impossible.
 *
 * Like `isPlausiblePhone`, this is a plausibility gate, not a validation:
 * it requires `local@domain.tld` with a dot in the domain and a 2+ letter
 * tld. That rejects the typo we actually saw and nothing a real person
 * types on purpose.
 */

const PLAUSIBLE_EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

export function isPlausibleEmail(value: string | null | undefined): boolean {
  const v = String(value ?? '').trim()
  return v.length <= 254 && PLAUSIBLE_EMAIL.test(v)
}

/**
 * The domains our users actually sign up with, so a dotless typo can be
 * offered back as a one-tap fix ("Did you mean name@gmail.com?").
 * Only fires when the typed domain is exactly a known domain with its
 * dots removed — never a fuzzy guess, which would suggest wrong
 * addresses with the same confidence.
 */
const KNOWN_DOMAINS = [
  'gmail.com', 'naver.com', 'daum.net', 'hanmail.net', 'kakao.com', 'nate.com',
  'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'me.com',
]

export function suggestEmailFix(value: string | null | undefined): string | null {
  const v = String(value ?? '').trim()
  const at = v.lastIndexOf('@')
  if (at <= 0) return null
  const local = v.slice(0, at)
  const domain = v.slice(at + 1).toLowerCase()
  if (!domain || domain.includes('.')) return null
  const match = KNOWN_DOMAINS.find(d => d.replace(/\./g, '') === domain)
  return match ? `${local}@${match}` : null
}
