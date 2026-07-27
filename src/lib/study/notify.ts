import { dbAdmin } from '@/lib/supabase-admin'
import { sendPushToStudent } from '@/lib/study/push'
import { safeNotificationPath } from '@/lib/study/notification-link'

/**
 * notifyStudent — server-side helper to insert into the existing
 * `notifications` table. Study-domain events (league promotion,
 * weekly recap, etc.) land in the same inbox as system notifications
 * so students have one place to check.
 *
 * The existing /mobile/notifications page already renders this table
 * + the bell-icon unread badge in MobileHeader already counts it, so
 * this just adds new rows. No new UI required.
 *
 * `kind` becomes the `type` column for filtering on the notifications
 * page. `link` writes navigation_data so taps deep-link properly.
 *
 * Navigation contract: study rows store the deep link as
 * `navigation_data: { url: '<app-relative path>' }`. The mobile inbox
 * (src/app/mobile/notifications/page.tsx) reads `url` first, validates
 * it with `safeNotificationPath`, and only falls back to a per-kind
 * route (see `studyFallbackRoute`) when it is missing or invalid. Links
 * are validated here too so a bad value never reaches the database.
 */

export type StudyNotificationKind =
  | 'study_league_promoted'
  | 'study_league_demoted'
  | 'study_weekly_recap'
  | 'study_streak_milestone'
  | 'study_streak_at_risk'
  | 'study_streak_saved'
  | 'study_daily_challenge'
  | 'study_duel_won'
  | 'study_duel_lost'
  | 'study_response_graded'
  | 'study_payment_failed'
  | 'study_subscription_expired'

export async function notifyStudent({
  studentId, kind, title, message, link, push,
}: {
  studentId: string
  kind: StudyNotificationKind
  title: string
  message: string
  link?: string
  /** Also deliver as a device push (same title/body). No-ops when FCM
   *  isn't configured or the student has no active tokens. */
  push?: boolean
}): Promise<void> {
  const safeLink = safeNotificationPath(link)
  if (link && !safeLink) {
    console.error('[notify] dropping unsafe link', link)
  }
  try {
    const { error } = await dbAdmin
      .from('notifications')
      .insert({
        user_id: studentId,
        type: kind,
        title,
        message,
        is_read: false,
        navigation_data: safeLink ? { url: safeLink } : null,
      })
    if (error) console.error('[notify]', error)
  } catch (e) {
    console.error('[notify] failed', e)
  }
  if (push) {
    try {
      await sendPushToStudent(studentId, { title, body: message, url: safeLink ?? undefined })
    } catch (e) {
      console.error('[notify] push failed', e)
    }
  }
}
