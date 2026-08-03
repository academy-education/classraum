import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { sendPostmarkEmail } from '@/lib/postmark'
import { notifyStudent } from '@/lib/study/notify'
import { withHeartbeat } from '@/lib/ops/heartbeat'
import { verifyCronAuth } from '@/lib/cron-auth'
import { readStudyRecapOptOuts } from '@/lib/study/emailPrefs'

/**
 * GET /api/cron/study-weekly-recap — sends a personalized last-week
 * summary email to every student who:
 *  - has prefs.onboarded_at set (real users, not abandoned signups)
 *  - had at least one study_attempt in the past 7 days
 *  - has an email on file
 *  - has not switched the recap off (user_preferences
 *    .email_notifications.study_recap === false). Absent = still sends;
 *    see readStudyRecapOptOuts for why that direction is load-bearing.
 *
 * Body content: hours studied, accuracy, streak, top topic studied,
 * mastered topics this week, plus a tap-back-into-the-app link.
 *
 * Auth: CRON_SECRET_KEY bearer header, same convention as the other
 * crons. Runs weekly via Vercel cron (Monday 09:00 KST = Sunday 00:00 UTC).
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 300

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
  const summary = await withHeartbeat('study-weekly-recap', runRecap)
  return NextResponse.json(summary)
}

async function runRecap() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // 1) Find every onboarded student with activity in the last 7 days.
  const { data: activeStudentIds } = await dbAdmin
    .from('study_user_prefs')
    .select('student_id')
    .not('onboarded_at', 'is', null)

  if (!activeStudentIds || activeStudentIds.length === 0) {
    return { checked: 0, sent: 0 }
  }

  // 2) Who has switched this email off? One batched read up front
  //    rather than a per-student lookup inside the loop. The gate
  //    itself is applied further down, around the SEND only — see the
  //    comment there for why the in-app row is not gated with it.
  const optedOut = await readStudyRecapOptOuts(
    activeStudentIds.map(r => r.student_id as string),
  )

  let sent = 0
  let skipped = 0
  let failed = 0
  let optedOutCount = 0

  for (const row of activeStudentIds) {
    const studentId = row.student_id

    // Pull this student's last-week attempts.
    const { data: attempts } = await dbAdmin
      .from('study_attempts')
      .select(`
        is_correct, time_spent_seconds, created_at, topic_id,
        session:study_sessions!inner ( student_id, archived )
      `)
      .eq('session.student_id', studentId)
      .eq('session.archived', false)
      .gte('created_at', sevenDaysAgo)

    if (!attempts || attempts.length === 0) {
      skipped++
      continue
    }

    // User row for email + display name.
    const { data: userRow } = await dbAdmin
      .from('users')
      .select('email, name')
      .eq('id', studentId)
      .maybeSingle()
    const email = userRow?.email
    const name = userRow?.name ?? 'Student'
    if (!email) { skipped++; continue }

    // Compute metrics.
    const total = attempts.length
    const correct = attempts.filter(a => a.is_correct).length
    const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100)
    const totalSeconds = attempts.reduce((s, a) => s + (a.time_spent_seconds ?? 0), 0)
    const hours = Math.round((totalSeconds / 3600) * 10) / 10

    // Top topic this week.
    const topicCounts = new Map<string, number>()
    for (const a of attempts) {
      if (a.topic_id) topicCounts.set(a.topic_id, (topicCounts.get(a.topic_id) ?? 0) + 1)
    }
    let topTopicName: string | null = null
    if (topicCounts.size > 0) {
      const [topId] = [...topicCounts.entries()].sort((a, b) => b[1] - a[1])[0]
      const { data: t } = await dbAdmin
        .from('study_topics')
        .select('name_en')
        .eq('id', topId)
        .maybeSingle()
      topTopicName = t?.name_en ?? null
    }

    // Topics newly crossed into mastery (score >= 80) this week.
    // Approximation: any mastery row updated in the last week with a
    // current score >= 80.
    const { data: masteredThisWeek } = await dbAdmin
      .from('study_mastery')
      .select(`score, updated_at, topic:study_topics ( name_en )`)
      .eq('student_id', studentId)
      .gte('updated_at', sevenDaysAgo)
      .gte('score', 80)
    const masteredNames = (masteredThisWeek ?? [])
      .map(m => m.topic?.name_en)
      .filter((x): x is string => !!x)
      .slice(0, 5)

    // The opt-out gates the EMAIL ONLY. The setting lives under "email
    // notifications" on the profile page, so suppressing the in-app
    // inbox row from it would be a silent over-reach — a student who
    // muted their inbox did not ask to stop seeing the recap in the
    // app. Counted separately from `skipped` (quiet week / no address):
    // an opt-out is a choice, and a rise in it is a signal.
    if (optedOut.has(studentId)) {
      optedOutCount++
    } else {
      const result = await sendPostmarkEmail({
        to: email,
        subject: `Your week in Classraum Study — ${hours}h, ${accuracy}% accuracy`,
        htmlBody: renderRecapEmail({
          name, hours, accuracy, total, topTopicName, masteredNames,
        }),
      })
      if (result.sent) sent++
      else failed++
    }

    // In-app inbox row alongside the email — students who don't open
    // email still see the recap when they tap the bell.
    void notifyStudent({
      studentId,
      kind: 'study_weekly_recap',
      variant: topTopicName ? 'withTopic' : 'default',
      titleParams: { hours, accuracy },
      messageParams: { total, ...(topTopicName ? { topic: topTopicName } : {}) },
      link: '/mobile/study/stats',
    })
  }

  return {
    checked: activeStudentIds.length,
    sent,
    skipped,
    failed,
    optedOut: optedOutCount,
  }
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
        You're getting this because you studied with Classraum this week.
        To stop it, open the app and go to Account → Study → Weekly recap email.
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
