import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { verifyCronAuth } from '@/lib/cron-auth'
import { withHeartbeat } from '@/lib/ops/heartbeat'
import { deliveryStatus } from '@/lib/ops/cron-status'
import { sendChargeReceipt } from '@/lib/study/charge-receipt'

/**
 * Daily receipt sweep: send the receipt for any non-refunded Classraum Study
 * charge that does not have one yet.
 *
 * Two jobs in one, deliberately:
 *   1. BACKFILL. Charges made before receipts existed (before RECEIPTS_LAUNCH)
 *      get one, email-only, with a line explaining why it is arriving now.
 *      The first run after deploy sends all of them.
 *   2. SAFETY NET. A live receipt whose email failed releases its claim; this
 *      picks it up the next morning. So does any charge from a path that
 *      forgot to call sendChargeReceipt.
 * Exactly-once comes from sendChargeReceipt's own claim, so overlapping with a
 * live charge or re-running is harmless. Charges under 15 minutes old are left
 * to their live path. Sends are spaced for Resend's rate limit.
 *
 * `?dry=1` lists what would be sent (kind, amount, date, email domain only)
 * without sending — for a manual check with the cron bearer.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 300
// Compared as Dates: rows come back as UTC ('+00:00') and this is KST, so a
// string comparison would misclassify charges near the boundary.
const RECEIPTS_LAUNCH = new Date('2026-09-30T00:00:00+09:00').getTime()
const isBackfill = (createdAt: string) => new Date(createdAt).getTime() < RECEIPTS_LAUNCH
const PER_RUN = 60
const SPACING_MS = 650

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const dry = new URL(req.url).searchParams.get('dry') === '1'

  const { data: rows, error } = await dbAdmin.from('study_payments')
    .select('payment_id, student_id, kind, amount_won, created_at')
    .is('receipt_sent_at', null).is('refunded_at', null).is('receipt_held_reason', null)
    .lt('created_at', new Date(Date.now() - 15 * 60e3).toISOString())
    .order('created_at', { ascending: true })
    .limit(PER_RUN)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (dry) {
    const ids = [...new Set((rows ?? []).map(r => r.student_id))]
    const { data: users } = ids.length ? await dbAdmin.from('users').select('id, email').in('id', ids) : { data: [] }
    const domain = new Map((users ?? []).map(u => [u.id, (u.email ?? '').split('@')[1] ?? '(none)']))
    return NextResponse.json({
      dry: true, pending: rows?.length ?? 0,
      items: (rows ?? []).map(r => ({ kind: r.kind, amountWon: r.amount_won, createdAt: r.created_at,
        backfill: isBackfill(r.created_at), emailDomain: domain.get(r.student_id) ?? '(no user)' })),
    })
  }

  const summary = await withHeartbeat('study-receipt-sweep', async () => {
    const out = { pending: rows?.length ?? 0, sent: 0, skipped: 0, failed: 0, reasons: [] as string[] }
    for (const [i, r] of (rows ?? []).entries()) {
      if (i) await new Promise(res => setTimeout(res, SPACING_MS))
      const o = await sendChargeReceipt(r.payment_id, { backfill: isBackfill(r.created_at) })
      if (o.status === 'sent') out.sent++
      else { out[o.status === 'failed' ? 'failed' : 'skipped']++; out.reasons.push(`${r.payment_id.slice(0, 12)}…: ${o.reason}`) }
    }
    return out
    // A receipt that failed to send is a charge the student was not told
    // about; the sweep retries it tomorrow, but today's run is not clean.
  }, deliveryStatus)
  return NextResponse.json(summary)
}
