import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyCronAuth } from '@/lib/cron-auth'
import { syncStudyPaymentRefund } from '@/lib/study/sync-refund'
import { recordHeartbeat } from '@/lib/ops/heartbeat'

/**
 * Nightly reconcile of study_payments against PortOne.
 *
 * `refunded_at` is normally written by the admin refund action or by the
 * Transaction.Cancelled webhook — but webhooks CAN be lost (delivery failure,
 * a deploy mid-flight, or a refund issued in the PortOne dashboard before the
 * webhook wiring existed). When that happens the admin keeps counting money
 * that's already been returned, which is exactly the drift this found on the
 * first run: 9 of 13 payments were refunded at PortOne but still read as Paid,
 * overstating net revenue by ₩99,200.
 *
 * So we re-check the still-"paid" rows against PortOne every night. The
 * per-row verification lives in syncStudyPaymentRefund (which only stamps
 * when PortOne itself reports CANCELLED/PARTIAL_CANCELLED), making this safe
 * to run repeatedly and impossible to fool with a bad webhook body.
 *
 * Scope: only rows not already marked refunded, newest first, capped per run
 * so one night can't fan out into thousands of PortOne calls. Older rows are
 * effectively settled — a refund window that long is rare — and the cap is
 * reported so silent truncation can't hide.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_PER_RUN = 200

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Heartbeat timing starts past the auth guard — a 401'd request never
  // ran the job, so nothing below may report on its behalf.
  const startedAt = Date.now()

  const { data: rows, error } = await supabaseAdmin
    .from('study_payments')
    .select('payment_id')
    .is('refunded_at', null)
    .order('created_at', { ascending: false })
    .limit(MAX_PER_RUN)
  if (error) {
    console.error('[cron/study-refund-sync] list failed', error)
    // No row was reconciled — recorded explicitly because this branch
    // returns rather than throws, and a silent 500 would read as healthy.
    await recordHeartbeat(
      'study-refund-sync',
      { ok: false, detail: { stage: 'list', error: error.message } },
      Date.now() - startedAt,
    )
    return NextResponse.json({ error: 'list failed' }, { status: 500 })
  }

  const summary = { checked: 0, reconciled: 0, unverifiable: 0 }
  for (const r of rows ?? []) {
    summary.checked++
    const result = await syncStudyPaymentRefund(
      r.payment_id as string,
      'nightly PortOne reconcile',
    )
    if (result.status === 'marked') {
      summary.reconciled++
      console.warn('[cron/study-refund-sync] reconciled a missed refund', r.payment_id)
    } else if (result.status === 'unverifiable') {
      summary.unverifiable++
    }
  }

  const truncated = (rows?.length ?? 0) === MAX_PER_RUN
  await recordHeartbeat(
    'study-refund-sync',
    { ok: true, detail: { ...summary, truncated } },
    Date.now() - startedAt,
  )

  return NextResponse.json({ ok: true, ...summary, truncated })
}
