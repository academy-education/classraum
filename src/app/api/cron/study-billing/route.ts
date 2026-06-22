import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyCronAuth } from '@/lib/cron-auth'
import { chargeBillingKey } from '@/lib/portone-charge'

/**
 * Daily cron — renew study subscriptions and finalize cancellations.
 *
 * Three lifecycle transitions handled per run:
 *
 *   1. status='active' AND current_period_end <= now AND
 *      cancel_at_period_end = false
 *      → Charge ₩9,900 against the stored billing key. On success
 *        advance current_period_end by 30 days. On failure flip to
 *        status='past_due' with last_payment_failure populated.
 *
 *   2. cancel_at_period_end = true AND current_period_end <= now
 *      → Flip status='cancelled'. No charge attempted.
 *
 *   3. status='past_due' AND last_payment_attempt_at older than 3 days
 *      → Retry the charge once. On second failure flip to
 *        status='expired' so the student is asked to re-enter a card.
 *
 * Idempotency: paymentId is namespaced
 *   study-sub-renew-{studentId}-{period_end_iso}
 * so two cron runs on the same calendar period don't double-charge —
 * PortOne dedups on paymentId server-side as the safety net.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const PRICE_WON = 9900
const PERIOD_DAYS = 30
const PAST_DUE_RETRY_DAYS = 3

interface SubscriptionRow {
  id: string
  student_id: string
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired'
  current_period_end: string
  cancel_at_period_end: boolean
  portone_subscription_id: string | null
  last_payment_attempt_at: string | null
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const summary = { cancelled: 0, charged: 0, failed: 0, expired: 0, skipped: 0, errors: [] as string[] }

  // ── 1. Finalize cancellations whose period just ended ───────────
  const { data: toCancel } = await supabaseAdmin
    .from('study_subscriptions')
    .select('id')
    .in('status', ['active', 'trial'])
    .eq('cancel_at_period_end', true)
    .lte('current_period_end', now.toISOString())
  for (const row of toCancel ?? []) {
    const { error } = await supabaseAdmin
      .from('study_subscriptions')
      .update({ status: 'cancelled', updated_at: now.toISOString() })
      .eq('id', row.id)
    if (error) summary.errors.push(`cancel ${row.id}: ${error.message}`)
    else summary.cancelled++
  }

  // ── 2. Renewal charges for active subscriptions due today ──────
  const { data: dueRows } = await supabaseAdmin
    .from('study_subscriptions')
    .select('id, student_id, status, current_period_end, cancel_at_period_end, portone_subscription_id, last_payment_attempt_at')
    .eq('status', 'active')
    .eq('cancel_at_period_end', false)
    .lte('current_period_end', now.toISOString())
  for (const row of (dueRows ?? []) as SubscriptionRow[]) {
    if (!row.portone_subscription_id) {
      summary.skipped++
      continue
    }
    await chargeAndAdvance(row, now, summary)
  }

  // ── 3. Past-due retries that have aged out ─────────────────────
  const retryCutoff = new Date(now.getTime() - PAST_DUE_RETRY_DAYS * 24 * 60 * 60 * 1000)
  const { data: pastDueRows } = await supabaseAdmin
    .from('study_subscriptions')
    .select('id, student_id, status, current_period_end, cancel_at_period_end, portone_subscription_id, last_payment_attempt_at')
    .eq('status', 'past_due')
    .lt('last_payment_attempt_at', retryCutoff.toISOString())
  for (const row of (pastDueRows ?? []) as SubscriptionRow[]) {
    if (!row.portone_subscription_id) {
      // No key on file (e.g. first charge failed in Phase 4.6 path).
      // Flip directly to expired so the UI prompts a fresh checkout.
      await supabaseAdmin
        .from('study_subscriptions')
        .update({ status: 'expired', updated_at: now.toISOString() })
        .eq('id', row.id)
      summary.expired++
      continue
    }
    const beforeStatus = row.status
    await chargeAndAdvance(row, now, summary)
    // If the retry failed again, expire the row instead of leaving it
    // stuck on past_due forever.
    if (beforeStatus === 'past_due') {
      const { data: after } = await supabaseAdmin
        .from('study_subscriptions')
        .select('status')
        .eq('id', row.id)
        .single()
      if (after?.status === 'past_due') {
        await supabaseAdmin
          .from('study_subscriptions')
          .update({ status: 'expired', updated_at: now.toISOString() })
          .eq('id', row.id)
        summary.expired++
      }
    }
  }

  return NextResponse.json({ ok: true, summary, ranAt: now.toISOString() })
}

async function chargeAndAdvance(
  row: SubscriptionRow,
  now: Date,
  summary: { charged: number; failed: number; errors: string[] }
) {
  // Namespace by the period boundary so re-runs on the same day for
  // the same period don't double-charge.
  const periodMarker = row.current_period_end.split('T')[0]
  const paymentId = `study-sub-renew-${row.student_id}-${periodMarker}`

  const result = await chargeBillingKey({
    billingKey: row.portone_subscription_id!,
    paymentId,
    amount: PRICE_WON,
    orderName: 'Classraum Study — Monthly',
    customerId: row.student_id,
    customData: {
      kind: 'study_subscription',
      attempt: 'renewal',
      student_id: row.student_id,
      period_end: row.current_period_end,
    },
  })

  if (result.ok) {
    const nextEnd = new Date(Math.max(now.getTime(), new Date(row.current_period_end).getTime()) + PERIOD_DAYS * 24 * 60 * 60 * 1000)
    await supabaseAdmin
      .from('study_subscriptions')
      .update({
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: nextEnd.toISOString(),
        last_payment_id: paymentId,
        last_payment_attempt_at: now.toISOString(),
        last_payment_failure: null,
        updated_at: now.toISOString(),
      })
      .eq('id', row.id)
    summary.charged++
  } else {
    await supabaseAdmin
      .from('study_subscriptions')
      .update({
        status: 'past_due',
        last_payment_attempt_at: now.toISOString(),
        last_payment_failure: (result.message ?? 'unknown').slice(0, 500),
        updated_at: now.toISOString(),
      })
      .eq('id', row.id)
    summary.failed++
    if (result.code) summary.errors.push(`${row.id}: ${result.code} ${result.message ?? ''}`)
  }
}
