import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendPostmarkEmail } from '@/lib/postmark'
import { notifyStudent } from '@/lib/study/notify'

/**
 * GET /api/cron/study-weekly-recap — sends a personalized last-week
 * summary email to every student who:
 *  - has prefs.onboarded_at set (real users, not abandoned signups)
 *  - had at least one study_attempt in the past 7 days
 *  - has an email on file
 *
 * Body content: hours studied, accuracy, streak, top topic studied,
 * mastered topics this week, plus a tap-back-into-the-app link.
 *
 * Auth: CRON_SECRET_KEY bearer header, same convention as the other
 * crons. Runs weekly via Vercel cron (Monday 09:00 KST = Sunday 00:00 UTC).
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 300

interface AttemptRow {
  is_correct: boolean
  time_spent_seconds: number | null
  created_at: string
  topic_id: string | null
  session: { student_id: string } | { student_id: string }[] | null
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET_KEY}`
  if (!process.env.CRON_SECRET_KEY || authHeader !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // 1) Find every onboarded student with activity in the last 7 days.
  const { data: activeStudentIds } = await supabaseAdmin
    .from('study_user_prefs')
    .select('student_id')
    .not('onboarded_at', 'is', null)

  if (!activeStudentIds || activeStudentIds.length === 0) {
    return NextResponse.json({ checked: 0, sent: 0 })
  }

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const row of activeStudentIds) {
    const studentId = row.student_id as string

    // Pull this student's last-week attempts.
    const { data: attempts } = await supabaseAdmin
      .from('study_attempts')
      .select(`
        is_correct, time_spent_seconds, created_at, topic_id,
        session:study_sessions!inner ( student_id )
      `)
      .eq('session.student_id', studentId)
      .gte('created_at', sevenDaysAgo)

    if (!attempts || attempts.length === 0) {
      skipped++
      continue
    }

    // User row for email + display name.
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('email, name')
      .eq('id', studentId)
      .maybeSingle()
    const email = userRow?.email as string | undefined
    const name = (userRow?.name as string | undefined) ?? 'Student'
    if (!email) { skipped++; continue }

    // Compute metrics.
    const total = attempts.length
    const correct = (attempts as AttemptRow[]).filter(a => a.is_correct).length
    const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100)
    const totalSeconds = (attempts as AttemptRow[]).reduce(
      (s, a) => s + ((a.time_spent_seconds as number | null) ?? 0),
      0,
    )
    const hours = Math.round((totalSeconds / 3600) * 10) / 10

    // Top topic this week.
    const topicCounts = new Map<string, number>()
    for (const a of attempts as AttemptRow[]) {
      if (a.topic_id) topicCounts.set(a.topic_id, (topicCounts.get(a.topic_id) ?? 0) + 1)
    }
    let topTopicName: string | null = null
    if (topicCounts.size > 0) {
      const [topId] = [...topicCounts.entries()].sort((a, b) => b[1] - a[1])[0]
      const { data: t } = await supabaseAdmin
        .from('study_topics')
        .select('name_en')
        .eq('id', topId)
        .maybeSingle()
      topTopicName = (t?.name_en as string | undefined) ?? null
    }

    // Topics newly crossed into mastery (score >= 80) this week.
    // Approximation: any mastery row updated in the last week with a
    // current score >= 80.
    const { data: masteredThisWeek } = await supabaseAdmin
      .from('study_mastery')
      .select(`score, updated_at, topic:study_topics ( name_en )`)
      .eq('student_id', studentId)
      .gte('updated_at', sevenDaysAgo)
      .gte('score', 80)
    const masteredNames = ((masteredThisWeek ?? []) as unknown as Array<{
      topic: { name_en: string } | { name_en: string }[] | null
    }>)
      .map(m => {
        const tx = m.topic
        return Array.isArray(tx) ? tx[0]?.name_en : tx?.name_en
      })
      .filter((x): x is string => !!x)
      .slice(0, 5)

    const htmlBody = renderRecapEmail({
      name,
      hours,
      accuracy,
      total,
      topTopicName,
      masteredNames,
    })

    const result = await sendPostmarkEmail({
      to: email,
      subject: `Your week in Classraum Study — ${hours}h, ${accuracy}% accuracy`,
      htmlBody,
    })
    if (result.sent) sent++
    else failed++

    // In-app inbox row alongside the email — students who don't open
    // email still see the recap when they tap the bell.
    void notifyStudent({
      studentId,
      kind: 'study_weekly_recap',
      title: `이번 주 학습 요약 — ${hours}h, 정답률 ${accuracy}%`,
      message: `${total}문항 학습 완료${topTopicName ? ` · 최다 학습: ${topTopicName}` : ''}`,
      link: '/mobile/study/stats',
    })
  }

  return NextResponse.json({
    checked: activeStudentIds.length,
    sent,
    skipped,
    failed,
  })
}

/** Inline-styled HTML email. Postmark-friendly (no external CSS,
 *  no remote images, table-based for clients that drop flexbox). */
function renderRecapEmail(input: {
  name: string
  hours: number
  accuracy: number
  total: number
  topTopicName: string | null
  masteredNames: string[]
}): string {
  const mastered = input.masteredNames.length > 0
    ? `<p style="margin: 16px 0 0; color: #374151; font-size: 14px;">
         <strong style="color: #059669;">Mastered this week:</strong>
         ${input.masteredNames.map(n => `<span style="display: inline-block; background: #d1fae5; color: #065f46; font-weight: 600; font-size: 12px; padding: 2px 8px; border-radius: 9999px; margin: 0 4px 4px 0;">${escapeHtml(n)}</span>`).join('')}
       </p>`
    : ''

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your week in Study</title></head>
<body style="margin: 0; padding: 24px; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; margin: 0 auto;">
    <tr>
      <td style="padding-bottom: 16px;">
        <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: #2885E8;">Weekly recap</span>
        <h1 style="margin: 8px 0 4px; font-size: 24px; line-height: 1.2; color: #111827;">Hi ${escapeHtml(input.name)}, here's your week 👋</h1>
      </td>
    </tr>
    <tr>
      <td style="background: linear-gradient(135deg, #2885E8 0%, #4f46e5 100%); border-radius: 16px; padding: 24px; color: white;">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em; opacity: 0.85; margin-bottom: 8px;">Last 7 days</div>
        <div style="display: table; width: 100%;">
          <div style="display: table-cell; padding-right: 16px;">
            <div style="font-size: 28px; font-weight: 700; line-height: 1;">${input.hours}h</div>
            <div style="font-size: 11px; opacity: 0.85; margin-top: 4px;">studied</div>
          </div>
          <div style="display: table-cell; padding: 0 16px;">
            <div style="font-size: 28px; font-weight: 700; line-height: 1;">${input.accuracy}%</div>
            <div style="font-size: 11px; opacity: 0.85; margin-top: 4px;">accuracy</div>
          </div>
          <div style="display: table-cell; padding-left: 16px;">
            <div style="font-size: 28px; font-weight: 700; line-height: 1;">${input.total}</div>
            <div style="font-size: 11px; opacity: 0.85; margin-top: 4px;">questions</div>
          </div>
        </div>
      </td>
    </tr>
    ${input.topTopicName ? `
    <tr>
      <td style="padding-top: 20px; color: #374151; font-size: 14px; line-height: 1.6;">
        Most-studied topic: <strong>${escapeHtml(input.topTopicName)}</strong>
      </td>
    </tr>
    ` : ''}
    <tr>
      <td>${mastered}</td>
    </tr>
    <tr>
      <td style="padding-top: 28px;">
        <a href="https://app.classraum.com/mobile/study" style="display: inline-block; background: #111827; color: white; text-decoration: none; padding: 12px 20px; border-radius: 12px; font-weight: 600; font-size: 14px;">Open Study →</a>
      </td>
    </tr>
    <tr>
      <td style="padding-top: 32px; color: #9ca3af; font-size: 11px;">
        You're getting this because you opted in to study reminders. Manage in Settings.
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
