import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { sendPushToStudent } from '@/lib/study/push'
import { notifyStudent, studentNotifLang } from '@/lib/study/notify'
import { renderStudyPush } from '@/lib/study/notification-copy'
import { DAILY_CHALLENGE_QUESTION_COUNT } from '@/lib/study/daily-challenge'
import { withHeartbeat } from '@/lib/ops/heartbeat'
import { verifyCronAuth } from '@/lib/cron-auth'

/**
 * GET /api/cron/study-push-reminders — daily evening nudge.
 *
 * One notification per idle student, picked by priority:
 *   1. Streak at risk — active streak ≥ 2 whose last activity was
 *      yesterday and nothing today. Losing a streak hurts more than
 *      any generic nudge motivates; this is the highest-value push
 *      we can send. Also lands in the in-app inbox.
 *   2. SRS backlog — flashcards due for review.
 *   3. Daily challenge — today's micro-quiz not done yet
 *      (DAILY_CHALLENGE_QUESTION_COUNT questions).
 *   4. Generic idle nudge.
 *
 * Schedule: 18:00 KST (= 09:00 UTC) — after most school days end,
 * before evening study window. Students with any XP today are
 * skipped entirely (they don't need a reminder).
 *
 * Silently skips users with no device tokens or when Firebase isn't
 * configured (so the cron stays green during incremental rollout).
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  // Shared guard: accepts CRON_SECRET (the name Vercel Cron actually
  // requires to send its Authorization header) as well as the legacy
  // CRON_SECRET_KEY, and allows genuinely-local dev through. This
  // route previously inlined its own CRON_SECRET_KEY check, so the
  // CRON_SECRET fix did not reach it and it would still 401 in prod.
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Heartbeat sits inside the auth guard — a 401'd request never ran the
  // job, so letting it report would mask a dead cron to the watchdog.
  // withHeartbeat rethrows, so the route's error behaviour is unchanged.
  const summary = await withHeartbeat('study-push-reminders', runReminders)
  return NextResponse.json(summary)
}

async function runReminders() {
  const { data: prefs } = await dbAdmin
    .from('study_user_prefs')
    .select('student_id')
    .not('onboarded_at', 'is', null)

  if (!prefs || prefs.length === 0) {
    return { checked: 0, sent: 0 }
  }

  const nowIso = new Date().toISOString()
  const todayUtc = nowIso.slice(0, 10)
  const startOfTodayUtc = `${todayUtc}T00:00:00Z`

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const row of prefs) {
    const studentId = row.student_id
    // Use the SAME resolution every other study notification uses:
    // study pref → account pref → English. Reading only
    // study_user_prefs.default_language here (and defaulting a NULL to
    // English) diverged from `studentNotifLang`, and because the value
    // was then FORCED onto notifyStudent via `lang:` below, it also
    // overrode the account-level Korean fallback for the streak row.
    // The column is nullable (default 'ko'), so that path is reachable.
    const lang = await studentNotifLang(studentId)

    const { count: todayXp } = await dbAdmin
      .from('study_xp_events')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .gte('created_at', startOfTodayUtc)
    if ((todayXp ?? 0) > 0) { skipped++; continue }

    // 1. Streak at risk — same walk-back the /streak route uses, but
    // WITHOUT yesterday-grace: we specifically want "streak survives
    // only if they study today".
    const streak = await currentStreakEndingYesterday(studentId)
    if (streak >= 2) {
      await notifyStudent({
        studentId,
        kind: 'study_streak_at_risk',
        variant: 'default',
        titleParams: { days: streak },
        messageParams: { days: streak },
        // We already resolved this student's language above; pass it so
        // notifyStudent doesn't re-query. It only affects the stored
        // plaintext and the push body — the inbox row renders from keys.
        lang,
        link: '/mobile/study',
        push: true,
      })
      sent++
      continue
    }

    // 2. SRS backlog.
    const { count: dueCount } = await dbAdmin
      .from('study_flashcard_reviews')
      .select('student_id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .lte('due_at', nowIso)
    if ((dueCount ?? 0) > 0) {
      const due = dueCount ?? 0
      // 'srsDue' and 'idleNudge' are push-copy keys, not
      // StudyNotificationKinds, so they have no kind to map from — the
      // category is stated here instead. Both are nudges to come back
      // and study, which is exactly what the "reminders" switch means.
      const result = await sendPushToStudent(studentId, {
        ...renderStudyPush(lang, 'srsDue', { due }),
        url: '/mobile/study/review',
      }, { category: 'reminders' })
      if (result.skipped) skipped++
      else if (result.sent > 0) sent++
      else failed++
      continue
    }

    // 3. Daily challenge not done → point at it specifically. The
    // challenge session is tagged config.dailyChallenge = 'YYYY-MM-DD'.
    const { data: challengeDone } = await dbAdmin
      .from('study_sessions')
      .select('id')
      .eq('student_id', studentId)
      .contains('config', { dailyChallenge: todayUtc })
      .limit(1)
    const payload = (!challengeDone || challengeDone.length === 0)
      ? {
          // Same keys the `study_daily_challenge` kind registers, so the
          // challenge nudge has one wording rather than a hand-copied twin.
          ...renderStudyPush(lang, 'dailyChallenge', {
            questions: DAILY_CHALLENGE_QUESTION_COUNT,
          }),
          url: '/mobile/study',
        }
      : {
          ...renderStudyPush(lang, 'idleNudge'),
          url: '/mobile/study',
        }

    const result = await sendPushToStudent(studentId, payload, { category: 'reminders' })
    if (result.skipped) skipped++
    else if (result.sent > 0) sent++
    else failed++
  }

  return { checked: prefs.length, sent, skipped, failed }
}

/** Consecutive-day streak whose most recent day is YESTERDAY (UTC).
 *  Returns 0 when the student studied today (not at risk), or when
 *  yesterday was idle (streak already broken — nothing to save). */
async function currentStreakEndingYesterday(studentId: string): Promise<number> {
  const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await dbAdmin
    .from('study_sessions')
    .select('last_active_at')
    .eq('student_id', studentId)
    .gte('last_active_at', cutoff)
    .order('last_active_at', { ascending: false })
    .limit(500)

  const days = new Set<string>()
  for (const row of data ?? []) {
    if (row.last_active_at) days.add(row.last_active_at.slice(0, 10))
  }

  const dayKey = (d: Date) => d.toISOString().slice(0, 10)
  const today = new Date()
  if (days.has(dayKey(today))) return 0

  const cursor = new Date(today.getTime() - 86_400_000)
  if (!days.has(dayKey(cursor))) return 0

  let count = 0
  while (days.has(dayKey(cursor)) && count < 400) {
    count++
    cursor.setTime(cursor.getTime() - 86_400_000)
  }
  return count
}
