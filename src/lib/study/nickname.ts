/**
 * Nickname rules for Classraum Study.
 *
 * A nickname is a public, unique handle: it shows on leaderboards in place
 * of the masked real name, and it's how friends find each other by search.
 * Kept deliberately permissive on script (Latin + Korean + digits +
 * underscore) since the audience is Korean-first, but bounded in length and
 * free of whitespace/punctuation so it renders cleanly in a leaderboard row.
 */

export const NICKNAME_MIN = 2
export const NICKNAME_MAX = 16

/** Letters (any language, so Hangul works), digits, and underscore. */
const NICKNAME_RE = /^[\p{L}\p{N}_]+$/u

export type NicknameError = 'too_short' | 'too_long' | 'charset' | 'empty'

/** Trim + collapse — the stored/compared form. Does not lowercase (display
 *  keeps the user's casing; uniqueness is enforced case-insensitively at the
 *  DB index). */
export function normalizeNickname(raw: string): string {
  return raw.normalize('NFC').trim()
}

/** Validate a candidate. Returns null when OK, else the failure reason. */
export function validateNickname(raw: string): NicknameError | null {
  const n = normalizeNickname(raw)
  if (n.length === 0) return 'empty'
  // Count by code points, not UTF-16 units, so a 2-emoji-ish name isn't
  // miscounted (and Hangul syllables count as one each).
  const len = [...n].length
  if (len < NICKNAME_MIN) return 'too_short'
  if (len > NICKNAME_MAX) return 'too_long'
  if (!NICKNAME_RE.test(n)) return 'charset'
  return null
}
