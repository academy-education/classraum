/**
 * The single source of truth for legal `notifications.type` values.
 *
 * WHY THIS EXISTS
 * ---------------
 * `notifications.type` carries a Postgres CHECK constraint. supabase-js
 * `.insert()` RESOLVES with `{ error }` on a constraint violation — it does
 * not throw — so an insert with an illegal `type` is rejected by the DB and,
 * at every call site that ignored the result, vanished without a trace. Four
 * notification kinds shipped that way and were never delivered once.
 *
 * The list below must stay in lockstep with the CHECK constraint. The
 * authoritative migration is
 * `database/migrations/052_notifications_allow_system_and_level_test.sql`.
 * If you add a value here, add it there (and vice-versa) in the same PR —
 * `src/lib/__tests__/notification-types.test.ts` fails otherwise.
 */
export const NOTIFICATION_TYPES = [
  // --- academy / core product (8) ---
  'session',
  'attendance',
  'billing',
  'assignment',
  'alert',
  'grade',
  'success',
  'report',
  // --- cross-cutting (2) ---
  'system',
  'level_test',
  // --- study domain (12) — mirrors StudyNotificationKind in lib/study/notify.ts ---
  'study_league_promoted',
  'study_league_demoted',
  'study_weekly_recap',
  'study_streak_milestone',
  'study_streak_at_risk',
  'study_streak_saved',
  'study_daily_challenge',
  'study_duel_won',
  'study_duel_lost',
  'study_response_graded',
  'study_payment_failed',
  'study_subscription_expired',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

/**
 * Shape of a row written to `notifications`. Type call sites against this
 * (`const rows: NotificationInsert[] = ...`) so an illegal `type` is a
 * COMPILE error instead of a silent runtime rejection.
 */
export interface NotificationInsert {
  user_id: string
  type: NotificationType
  title: string
  message: string
  is_read: boolean
  title_key?: string
  message_key?: string
  title_params?: Record<string, string | number | undefined>
  message_params?: Record<string, string | number | undefined>
  navigation_data?: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
}

export function isNotificationType(value: string): value is NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(value)
}
