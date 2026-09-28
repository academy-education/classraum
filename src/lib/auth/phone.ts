/**
 * Phone number rules, in one place.
 *
 * WHY THIS EXISTS NOW: phone is no longer collected at signup. The old
 * form required it; a social signup cannot ask for it (there is no form),
 * and `users.phone` is nullable, so an OAuth account simply has none.
 * The number is genuinely needed exactly once — at checkout, where Inicis
 * V2 refuses to open the card window without `customer.phoneNumber` — so
 * that is where it is asked for.
 *
 * The check is deliberately LOOSE, and identical to the one the auth page
 * has always used: 9–15 digits once separators are stripped. That covers
 * KR mobiles (010-XXXX-XXXX) and international numbers. It is a
 * plausibility gate, not a validation — the PG is the real validator, and
 * a stricter rule here would reject real numbers while still not
 * guaranteeing a working one.
 */

/** Digits only, with the separators people actually type removed. */
export function phoneDigits(value: string | null | undefined): string {
  return String(value ?? '').replace(/[\s\-().+]/g, '')
}

export function isPlausiblePhone(value: string | null | undefined): boolean {
  return /^\d{9,15}$/.test(phoneDigits(value))
}

/**
 * What gets stored and sent to the PG.
 *
 * Trimmed, but otherwise AS TYPED — the hyphens in 010-1234-5678 are how
 * Korean users read a number back and confirm it is theirs, and Inicis
 * accepts them. Returns null for anything implausible so a caller cannot
 * accidentally persist junk into users.phone.
 */
export function normalizePhone(value: string | null | undefined): string | null {
  const trimmed = String(value ?? '').trim()
  return isPlausiblePhone(trimmed) ? trimmed : null
}

/**
 * A comparison key for "is this the same phone?".
 *
 * One person signed up four times on 2026-09-26 and stored the same number
 * three ways: `508227384`, `+966508227384`, `966508227384`. Country code
 * and leading zero are the parts people drop or add, and the last nine
 * digits are the part they never change — so that is the key (KR
 * 010-1234-5678 → `012345678`, the Saudi number → `508227384`). Shorter
 * numbers key on all their digits. Empty for anything implausible.
 */
export function phoneKey(value: string | null | undefined): string {
  const d = phoneDigits(value)
  if (!isPlausiblePhone(value)) return ''
  return d.length > 9 ? d.slice(-9) : d
}
