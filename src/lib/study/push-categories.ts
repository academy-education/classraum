// `import type` matters: notify.ts imports sendPushToStudent from push.ts,
// which imports this file. A value import would close that cycle at
// runtime; a type import is erased entirely.
import type { StudyNotificationKind } from '@/lib/study/notify'

/**
 * Which push notifications a student can switch off, and which they cannot.
 *
 * ── Why this exists ──────────────────────────────────────────────────
 *
 * `user_preferences.push_notifications` was written by the profile toggle
 * and read by NOBODY. sendPushToStudent selected device_tokens and sent;
 * it never consulted the preference. A student who switched notifications
 * off kept receiving them — 1 user of 420 on 2026-08-11, and the one who
 * had explicitly asked not to be.
 *
 * A dead settings toggle is a bug. A dead CONSENT toggle is a broken
 * promise, which is why this got fixed ahead of nicer-looking work.
 *
 * ── Four groups, not twelve ────────────────────────────────────────
 *
 * There are 12 notification kinds. Twelve switches is a settings screen
 * nobody reads, and an unread settings screen sends people to the OS to
 * mute the app entirely — strictly worse for both sides than a coarse
 * control they actually use.
 */
export type PushCategory = 'reminders' | 'progress' | 'social' | 'account'

/**
 * ACCOUNT IS NOT OPTIONAL.
 *
 * "Your payment failed" and "your subscription expired" are service
 * messages to a paying customer. Letting a toggle flipped months ago
 * suppress them turns a settings choice into a billing surprise — the
 * student's card lapses, they hear nothing, and they discover it when a
 * test will not start. The DB column has no `account` key precisely so
 * this cannot be disabled by writing JSON directly either.
 */
const ALWAYS_ON: PushCategory = 'account'

/**
 * Every kind maps to exactly one category.
 *
 * Typed as a total Record so adding a StudyNotificationKind without
 * classifying it fails the build. The alternative — a partial map with a
 * default — would silently drop new kinds into whichever bucket the
 * default happened to be, which is how a marketing push ends up
 * classified as "account" and unmutable.
 */
export const KIND_CATEGORY: Record<StudyNotificationKind, PushCategory> = {
  study_streak_at_risk: 'reminders',
  study_streak_saved: 'reminders',
  study_streak_milestone: 'reminders',
  study_daily_challenge: 'reminders',

  study_response_graded: 'progress',
  study_weekly_recap: 'progress',

  study_league_promoted: 'social',
  study_league_demoted: 'social',
  study_duel_won: 'social',
  study_duel_lost: 'social',

  study_payment_failed: 'account',
  study_subscription_expired: 'account',
}

/** The categories a student can actually turn off (account is excluded). */
export const SWITCHABLE_CATEGORIES: readonly PushCategory[] = ['reminders', 'progress', 'social']

/** Row shape this reads. Both fields may be absent on older rows. */
export interface PushPrefsRow {
  push_notifications?: boolean | null
  push_categories?: unknown
}

/**
 * May this student be sent a push in this category?
 *
 * ── FAIL OPEN. This is the load-bearing property. ────────────────────
 *
 * Absent row, absent column, malformed JSON, unknown category, failed
 * read — every one of them means SEND. The dangerous direction here is
 * silence: reading "unknown" as "opted out" would mute all 420 live users
 * the moment it deployed, and nobody reports the notification they did
 * not receive. A wrongly-sent push generates a complaint; a wrongly-
 * suppressed one generates nothing, so only one of the two failure modes
 * is self-reporting.
 *
 * The one deliberate exception is the MASTER switch: `push_notifications
 * === false` is an explicit choice by the user and stops everything
 * except account. Note `=== false`, not falsy — null and undefined are
 * "never set", which is not the same as "turned off".
 */
export function pushCategoryAllowed(
  category: PushCategory | null | undefined,
  row: PushPrefsRow | null | undefined,
): boolean {
  // Account overrides everything, including the master switch.
  if (category === ALWAYS_ON) return true

  // Master off — an explicit choice, so honour it.
  if (row?.push_notifications === false) return false

  // Uncategorised: we cannot classify it, so we do not suppress it.
  if (!category) return true

  const cats = row?.push_categories
  if (!cats || typeof cats !== 'object' || Array.isArray(cats)) return true

  // Missing key = enabled. ONLY an explicit `false` opts out.
  return (cats as Record<string, unknown>)[category] !== false
}

/**
 * Category for a notification kind, or null if it has none.
 *
 * Takes a plain string rather than the union because the SENDER does not
 * always have one. The study-push-reminders cron pushes `srsDue` and
 * `idleNudge`, which are push-copy keys and not StudyNotificationKinds at
 * all — gating only on the union would have left the app's two most
 * frequent pushes ungoverned, which is most of what a student would want
 * to switch off. Those callers pass their category explicitly.
 */
export function categoryForKind(kind: string | null | undefined): PushCategory | null {
  if (!kind) return null
  return (KIND_CATEGORY as Record<string, PushCategory>)[kind] ?? null
}
