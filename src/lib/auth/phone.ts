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
