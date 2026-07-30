import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { sendPushToStudent } from '@/lib/study/push'
import { notifyStudent } from '@/lib/study/notify'
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
 *   3. Daily challenge — today's 5-question micro-quiz not done yet.
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
    .select('student_id, default_language')
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
    const lang = row.default_language === 'ko' ? 'ko' : 'en'

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
        // We already read this student's preference above; pass it so
        // notifyStudent doesn't re-query. It only affects the stored
        // plaintext and the push body — the inbox row renders from keys.
        lang: lang === 'ko' ? 'korean' : 'english',
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
      const result = await sendPushToStudent(studentId, lang === 'ko'
        ? {
            title: '복습할 카드가 있어요',
            body: `오늘 ${due}장이 준비되어 있어요. 5분이면 충분해요.`,
            url: '/mobile/study/review',
          }
        : {
            title: `${due} cards ready to review`,
            body: 'Spend 5 minutes now — keep your knowledge fresh.',
            url: '/mobile/study/review',
          })
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
      ? (lang === 'ko'
          ? {
              title: '오늘의 챌린지가 기다리고 있어요',
              body: '5문제 · 5분 · 50 XP — 지금 도전해 보세요.',
              url: '/mobile/study',
            }
          : {
              title: "Today's challenge is waiting",
              body: '5 questions · 5 minutes · 50 XP — take it now.',
              url: '/mobile/study',
            })
      : (lang === 'ko'
          ? {
              title: '오늘 한 문제만 풀어볼까요?',
              body: '5분이면 XP가 쌓이고 리그 순위가 올라가요.',
              url: '/mobile/study',
            }
          : {
              title: 'One question, five minutes',
              body: 'Keep your league rank up — open Study and try one.',
              url: '/mobile/study',
            })

    const result = await sendPushToStudent(studentId, payload)
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
