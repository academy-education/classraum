/**
 * Shared contract for the `navigation_data.url` deep link that
 * `notifyStudent` (src/lib/study/notify.ts) writes onto study
 * notification rows, and that the mobile inbox
 * (src/app/mobile/notifications/page.tsx) consumes on tap.
 *
 * The value is stored in the database and therefore untrusted at read
 * time: a malformed or malicious row must never be turned into an open
 * redirect. Only same-origin, app-relative paths are accepted.
 *
 * This module is intentionally dependency-free so it can be imported
 * from both server code and the client bundle.
 */

/** Upper bound so a pathological row can't be shoved into router.push. */
const MAX_LINK_LENGTH = 2048

/**
 * Returns the link when it is a safe same-origin app-relative path,
 * otherwise `null`.
 *
 * Accepted: `/mobile/study`, `/mobile/study/league?tab=1#top`
 * Rejected: `//evil.com`, `/\evil.com`, `https://evil.com`,
 *           `javascript:alert(1)`, `mobile/study` (no leading slash),
 *           empty / undefined / non-string, anything containing
 *           whitespace or control characters.
 */
export function safeNotificationPath(link: unknown): string | null {
  if (typeof link !== 'string') return null

  const value = link.trim()
  if (!value) return null
  if (value.length > MAX_LINK_LENGTH) return null

  // Must be app-relative: exactly one leading slash.
  if (!value.startsWith('/')) return null

  // Protocol-relative ("//evil.com") and the backslash variants browsers
  // normalize to it ("/\evil.com", "\\evil.com").
  if (value.startsWith('//') || value.startsWith('/\\')) return null

  // Backslashes anywhere are never legitimate in our routes and are a
  // common normalization-bypass trick.
  if (value.includes('\\')) return null

  // Whitespace / control characters (incl. the "\njavascript:" trick).
  if (/[\u0000-\u0020\u007f]/.test(value)) return null

  // Belt-and-braces: any scheme-looking prefix is out. A leading "/"
  // already rules this out, but keep the explicit check so the intent
  // survives future edits.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return null

  return value
}

/**
 * Fallback destination for a study notification row whose stored
 * `navigation_data.url` is missing or failed validation. Keyed by the
 * `type` column (see StudyNotificationKind in src/lib/study/notify.ts).
 *
 * Every path here is a real route under src/app/mobile/study/.
 */
const STUDY_FALLBACK_ROUTES: Record<string, string> = {
  study_league_promoted: '/mobile/study/league',
  study_league_demoted: '/mobile/study/league',
  study_weekly_recap: '/mobile/study/stats',
  study_streak_milestone: '/mobile/study',
  study_streak_at_risk: '/mobile/study',
  study_streak_saved: '/mobile/study',
  study_daily_challenge: '/mobile/study',
  study_duel_won: '/mobile/study/friends',
  study_duel_lost: '/mobile/study/friends',
  study_response_graded: '/mobile/study/history',
  study_payment_failed: '/mobile/study/subscription',
  study_subscription_expired: '/mobile/study/subscription',
}

/**
 * Returns the fallback study route for a notification `type`, or `null`
 * when the type isn't a study kind. Unknown `study_*` kinds land on the
 * study home rather than nowhere.
 */
export function studyFallbackRoute(type: unknown): string | null {
  if (typeof type !== 'string') return null
  if (STUDY_FALLBACK_ROUTES[type]) return STUDY_FALLBACK_ROUTES[type]
  return type.startsWith('study_') ? '/mobile/study' : null
}
