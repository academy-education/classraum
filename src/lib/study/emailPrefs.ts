import { dbAdmin } from '@/lib/supabase-admin'

/**
 * Study-mode email opt-outs.
 *
 * `user_preferences.email_notifications` is a jsonb bag of per-category
 * flags. Four of them are academy concerns (assignments / grades /
 * announcements / reminders); `study_recap` is the study weekly-recap
 * email and is read here.
 *
 * OPT-OUT, NOT OPT-IN. Only the literal boolean `false` suppresses an
 * email. Every other shape — key absent, whole column absent, `{}`,
 * `null`, a non-object, or a row that does not exist at all — means the
 * student still receives it. That is not defensive padding, it is the
 * required behaviour: the recap has been going out to every onboarded
 * student since it shipped, nobody has a `study_recap` key yet, and a
 * key-absent read of "off" would silently unsubscribe the entire user
 * base on deploy.
 *
 * The same rule is applied on the client in
 * `src/app/mobile/profile/hooks/useMobileProfile.ts` (`!== false`), so
 * the toggle a student sees and the decision the cron makes agree.
 */

/** The jsonb key. One place, so the cron and the UI cannot drift. */
export const STUDY_RECAP_PREF_KEY = 'study_recap' as const

/**
 * Ids (from the given list) that have explicitly switched the study
 * weekly recap OFF. Anyone absent from the returned set still gets it.
 *
 * A read failure returns an EMPTY set — i.e. nobody is suppressed. The
 * alternative (treat an unreadable preferences table as "everyone
 * opted out") would turn a transient database error into a silently
 * skipped send with a cheerful `sent: 0` in the cron summary.
 */
export async function readStudyRecapOptOuts(ids: string[]): Promise<Set<string>> {
  const out = new Set<string>()
  if (ids.length === 0) return out

  // Chunked: `.in()` goes into the URL and a few thousand uuids would
  // blow the request line long before it blew any row limit.
  const CHUNK = 200
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK)
    const { data, error } = await dbAdmin
      .from('user_preferences')
      .select('user_id, email_notifications')
      .in('user_id', slice)

    if (error) {
      console.warn('[study/emailPrefs] opt-out read failed — sending to this chunk anyway', {
        code: (error as { code?: string }).code,
        chunkStart: i,
      })
      continue
    }

    for (const row of data ?? []) {
      if (isStudyRecapOptedOut(row.email_notifications)) out.add(row.user_id as string)
    }
  }
  return out
}

/**
 * True only when `email_notifications.study_recap` is literally `false`.
 * Exported so the rule is testable without a database.
 */
export function isStudyRecapOptedOut(emailNotifications: unknown): boolean {
  if (!emailNotifications || typeof emailNotifications !== 'object') return false
  if (Array.isArray(emailNotifications)) return false
  return (emailNotifications as Record<string, unknown>)[STUDY_RECAP_PREF_KEY] === false
}
