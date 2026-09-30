import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { verifyCronAuth } from '@/lib/cron-auth'
import { withHeartbeat } from '@/lib/ops/heartbeat'
import { sendResendEmail } from '@/lib/resend'
import { isPlausibleEmail } from '@/lib/auth/email'
import { studentNotifLang } from '@/lib/study/notify'
import { STUDY_PLANS } from '@/lib/study/plans'
import { buildRenewalReminderEmail } from '@/lib/study/receipt-email'

/**
 * Daily: email each auto-renewing subscriber ahead of the charge — once per
 * billing period — with the plan, amount, date and a cancel link.
 *
 * Window is (now+12h, now+3d]: the reminder normally lands ~3 days ahead, and
 * a missed daily run still reminds on the next one rather than skipping the
 * period. Exactly-once per period by a conditional claim on
 * renewal_reminded_for (= the current_period_end reminded for), released if the
 * send fails. Cancelled-at-period-end, free, and non-renewing (pass-style,
 * 3650-day) plans are never reminded.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60
const APP_ORIGIN = () => process.env.AUTH_EMAIL_APP_ORIGIN || 'https://app.classraum.com'

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const summary = await withHeartbeat('study-renewal-reminders', async () => {
    const now = Date.now()
    const from = new Date(now + 12 * 3600e3).toISOString(), to = new Date(now + 3 * 86400e3).toISOString()
    const { data: subs, error } = await dbAdmin.from('study_subscriptions')
      .select('id, student_id, plan, pending_plan, current_period_end, renewal_reminded_for')
      .eq('status', 'active').eq('cancel_at_period_end', false)
      .gt('current_period_end', from).lte('current_period_end', to)
    if (error) throw new Error(`load: ${error.message}`)

    let sent = 0, skipped = 0
    const failures: string[] = []
    for (const s of subs ?? []) {
      const plan = STUDY_PLANS[s.plan], next = STUDY_PLANS[s.pending_plan ?? s.plan]
      if (!plan || !next || next.priceWon <= 0 || next.intervalDays >= 3650 || !s.current_period_end) { skipped++; continue }

      const { data: claimed, error: claimErr } = await dbAdmin.from('study_subscriptions')
        .update({ renewal_reminded_for: s.current_period_end })
        .eq('id', s.id)
        .or(`renewal_reminded_for.is.null,renewal_reminded_for.neq."${s.current_period_end}"`)
        .select('id').maybeSingle()
      if (claimErr) { failures.push(`${s.id}: claim ${claimErr.message}`); continue }
      if (!claimed) { skipped++; continue }   // already reminded for this period

      const [{ data: user }, langPref] = await Promise.all([
        dbAdmin.from('users').select('email').eq('id', s.student_id).maybeSingle(),
        studentNotifLang(s.student_id),
      ])
      const lang = langPref === 'korean' ? 'ko' : 'en'
      if (!isPlausibleEmail(user?.email)) { skipped++; continue }
      const mail = buildRenewalReminderEmail({
        lang, planName: lang === 'ko' ? next.name_ko : next.name_en, amountWon: next.priceWon,
        renewsOn: s.current_period_end, appOrigin: APP_ORIGIN(),
      })
      const r = await sendResendEmail({ to: user!.email as string, subject: mail.subject, html: mail.html, text: mail.text })
      if (r.sent) { sent++; continue }
      failures.push(`${s.id}: ${r.error}`)
      const { error: relErr } = await dbAdmin.from('study_subscriptions').update({ renewal_reminded_for: s.renewal_reminded_for }).eq('id', s.id)
      if (relErr) failures.push(`${s.id}: release ${relErr.message}`)
    }
    if (failures.length) throw new Error(`${failures.length} reminder(s) failed: ${failures.slice(0, 5).join('; ')}`)
    return { due: subs?.length ?? 0, sent, skipped }
  })
  return NextResponse.json(summary)
}
