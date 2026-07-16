import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendPushToStudent } from '@/lib/study/push'

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
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: studentId,
        type: kind,
        title,
        message,
        is_read: false,
        navigation_data: link ? { url: link } : null,
      })
    if (error) console.error('[notify]', error)
  } catch (e) {
    console.error('[notify] failed', e)
  }
  if (push) {
    try {
      await sendPushToStudent(studentId, { title, body: message, url: link })
    } catch (e) {
      console.error('[notify] push failed', e)
    }
  }
}
