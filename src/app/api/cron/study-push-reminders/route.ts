import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendPushToStudent } from '@/lib/study/push'

/**
 * GET /api/cron/study-push-reminders — daily nudge for students who
 * either have a backlog of SRS-due flashcards or haven't earned any
 * XP today. Sends one targeted notification, opens to the most
 * relevant surface.
 *
 * Schedule: 18:00 KST (= 09:00 UTC) — after most school days end,
 * before evening study window.
 *
 * Silently skips users with no device tokens or when Firebase isn't
 * configured (so the cron stays green during incremental rollout).
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET_KEY}`
  if (!process.env.CRON_SECRET_KEY || authHeader !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: prefs } = await supabaseAdmin
    .from('study_user_prefs')
    .select('student_id, default_language')
    .not('onboarded_at', 'is', null)

  if (!prefs || prefs.length === 0) {
    return NextResponse.json({ checked: 0, sent: 0 })
  }

  const nowIso = new Date().toISOString()
  const startOfTodayUtc = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').toISOString()

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const row of prefs) {
    const studentId = row.student_id as string
    const lang = (row.default_language as string | null) === 'ko' ? 'ko' : 'en'

    const { count: todayXp } = await supabaseAdmin
      .from('study_xp_events')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .gte('created_at', startOfTodayUtc)
    if ((todayXp ?? 0) > 0) { skipped++; continue }

    const { count: dueCount } = await supabaseAdmin
      .from('study_flashcard_reviews')
      .select('student_id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .lte('due_at', nowIso)

    const due = dueCount ?? 0
    const payload = due > 0
      ? buildDueReviewPayload(due, lang)
      : buildIdleNudgePayload(lang)

    const result = await sendPushToStudent(studentId, payload)
    if (result.skipped) skipped++
    else if (result.sent > 0) sent++
    else failed++
  }

  return NextResponse.json({ checked: prefs.length, sent, skipped, failed })
}

function buildDueReviewPayload(due: number, lang: 'ko' | 'en') {
  if (lang === 'ko') {
    return {
      title: '복습할 카드가 있어요',
      body: `오늘 ${due}장이 준비되어 있어요. 5분이면 충분해요.`,
      url: '/mobile/study/review',
    }
  }
  return {
    title: `${due} cards ready to review`,
    body: 'Spend 5 minutes now — keep your streak alive.',
    url: '/mobile/study/review',
  }
}

function buildIdleNudgePayload(lang: 'ko' | 'en') {
  if (lang === 'ko') {
    return {
      title: '오늘 한 문제만 풀어볼까요?',
      body: '5분이면 XP가 쌓이고 리그 순위가 올라가요.',
      url: '/mobile/study',
    }
  }
  return {
    title: 'One question, five minutes',
    body: 'Keep your league rank up — open Study and try one.',
    url: '/mobile/study',
  }
}
