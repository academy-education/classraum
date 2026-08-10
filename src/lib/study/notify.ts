import { dbAdmin } from '@/lib/supabase-admin'
import { sendPushToStudent } from '@/lib/study/push'
import { categoryForKind } from '@/lib/study/push-categories'
import { safeNotificationPath } from '@/lib/study/notification-link'
import {
  STUDY_NOTIFICATION_COPY,
  translateStudyKey,
  type StudyCopy,
  type StudyCopyVariant,
  type StudyNotifLang,
  type StudyNotifParams,
} from '@/lib/study/notification-copy'

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
 * LANGUAGE CONTRACT — read this before adding a call site.
 * -------------------------------------------------------
 * Callers pass a `variant` naming an entry in STUDY_NOTIFICATION_COPY
 * plus PARAMS. They do NOT pass copy. The row stores `title_key` /
 * `message_key` / `*_params`, which the mobile inbox renders through
 * `t()` in whatever language the reader has selected — that is the
 * whole point, and it is what study notifications did not do before:
 * every call site used to pass a hand-written string (usually Korean),
 * freezing the language at INSERT time.
 *
 * `title` and `message` are NOT NULL columns, so they are still written
 * — rendered here in the student's own preferred language. They serve
 * two purposes: a fallback for any reader that has not been taught the
 * key columns, and the push payload, which is delivered by FCM and has
 * no read-time render step at all.
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

/**
 * The student's preferred language, for the stored-plaintext fallback
 * and the push body. `study_user_prefs.default_language` is the study
 * surface's own setting ('ko' | 'en'); `user_preferences.language` is
 * the account-wide one ('korean' | 'english'). Study wins when set.
 * Defaults to English rather than guessing.
 */
export async function studentNotifLang(studentId: string): Promise<StudyNotifLang> {
  try {
    const { data: studyPref } = await dbAdmin
      .from('study_user_prefs')
      .select('default_language')
      .eq('student_id', studentId)
      .maybeSingle()
    if (studyPref?.default_language) {
      return studyPref.default_language === 'ko' ? 'korean' : 'english'
    }
    const { data: accountPref } = await dbAdmin
      .from('user_preferences')
      .select('language')
      .eq('user_id', studentId)
      .maybeSingle()
    if (accountPref?.language === 'korean') return 'korean'
  } catch (e) {
    console.error('[notify] language lookup failed', e)
  }
  return 'english'
}

export async function notifyStudent<K extends StudyNotificationKind>({
  studentId, kind, variant, titleParams, messageParams, link, push, lang,
}: {
  studentId: string
  kind: K
  /** Names a copy entry in STUDY_NOTIFICATION_COPY[kind]. */
  variant: StudyCopyVariant<K>
  titleParams?: StudyNotifParams
  messageParams?: StudyNotifParams
  link?: string
  /** Also deliver as a device push (same title/body). No-ops when FCM
   *  isn't configured or the student has no active tokens. */
  push?: boolean
  /** Override the language used for the stored plaintext + push body.
   *  Omit and it is read from the student's preferences. */
  lang?: StudyNotifLang
}): Promise<void> {
  const copy = (STUDY_NOTIFICATION_COPY[kind] as Record<string, StudyCopy>)[variant]
  if (!copy) {
    // Unreachable through the type system; a runtime guard so a bad
    // dynamic call can't write a row with null keys and no text.
    console.error('[notify] unknown copy variant', { kind, variant })
    return
  }

  const safeLink = safeNotificationPath(link)
  if (link && !safeLink) {
    console.error('[notify] dropping unsafe link', link)
  }

  const effectiveLang = lang ?? await studentNotifLang(studentId)
  const title = translateStudyKey(effectiveLang, copy.titleKey, titleParams)
  const message = translateStudyKey(effectiveLang, copy.messageKey, messageParams)

  try {
    const { error } = await dbAdmin
      .from('notifications')
      .insert({
        user_id: studentId,
        type: kind,
        // NOT NULL columns — the reader prefers the keys below.
        title,
        message,
        title_key: copy.titleKey,
        message_key: copy.messageKey,
        title_params: (titleParams ?? {}) as Record<string, string | number>,
        message_params: (messageParams ?? {}) as Record<string, string | number>,
        is_read: false,
        navigation_data: safeLink ? { url: safeLink } : null,
      })
    if (error) console.error('[notify]', error)
  } catch (e) {
    console.error('[notify] failed', e)
  }
  if (push) {
    try {
      // The kind decides which settings switch governs this push. The
      // in-app inbox row above is NOT gated — muting a push is not a
      // request to stop seeing the item when you open the app.
      await sendPushToStudent(
        studentId,
        { title, body: message, url: safeLink ?? undefined },
        { category: categoryForKind(kind) },
      )
    } catch (e) {
      console.error('[notify] push failed', e)
    }
  }
}
