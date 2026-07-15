import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyCronAuth } from '@/lib/cron-auth'
import { chargeBillingKey } from '@/lib/portone-charge'
import { resolvePlan, STUDY_PLANS, GRANT_INTERVAL_DAYS, isPassPlan } from '@/lib/study/plans'

/**
 * Daily cron — renew study subscriptions and finalize cancellations.
 *
 * Three lifecycle transitions handled per run:
 *
 *   1. status='active' AND current_period_end <= now AND
 *      cancel_at_period_end = false
 *      → Charge the plan's price (pending_plan wins if a downgrade is
 *        scheduled) against the stored billing key. On success advance
 *        current_period_end by 30 days and RESET the monthly credit
 *        grant to the plan's allotment. On failure flip to
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

const PAST_DUE_RETRY_DAYS = 3

interface SubscriptionRow {
  id: string
  student_id: string
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired'
  plan: string | null
  pending_plan: string | null
  current_period_end: string
  cancel_at_period_end: boolean
  portone_subscription_id: string | null
  last_payment_attempt_at: string | null
}

const SUB_COLUMNS = 'id, student_id, status, plan, pending_plan, current_period_end, cancel_at_period_end, portone_subscription_id, last_payment_attempt_at'

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const summary = { cancelled: 0, charged: 0, granted: 0, failed: 0, expired: 0, skipped: 0, errors: [] as string[] }

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
    .select(SUB_COLUMNS)
    .eq('status', 'active')
    .eq('cancel_at_period_end', false)
    .lte('current_period_end', now.toISOString())
  for (const row of (dueRows ?? []) as SubscriptionRow[]) {
    // Seasonal passes are cancel_at_period_end=true so they shouldn't
    // reach here, but never charge a renewal for one as defense-in-depth.
    if (isPassPlan(row.plan)) {
      summary.skipped++
      continue
    }
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
    .select(SUB_COLUMNS)
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

  // ── 4. Monthly credit-grant refresh (annual subs) ──────────────
  // Active subs whose next_grant_at has passed but whose charge isn't
  // due yet (i.e. annual plans mid-year) get their monthly grant reset
  // without a charge. Monthly plans refresh via the renewal charge, so
  // their next_grant_at moves forward there and this rarely fires.
  const { data: grantRows } = await supabaseAdmin
    .from('study_subscriptions')
    .select('id, student_id, plan, next_grant_at')
    .eq('status', 'active')
    .not('next_grant_at', 'is', null)
    .lte('next_grant_at', now.toISOString())
    .gt('current_period_end', now.toISOString()) // charge not due → handled by §2 otherwise
  for (const row of (grantRows ?? []) as { id: string; student_id: string; plan: string; next_grant_at: string }[]) {
    const plan = resolvePlan(row.plan)
    const nextGrant = new Date(now.getTime() + GRANT_INTERVAL_DAYS * 24 * 60 * 60 * 1000)
    await supabaseAdmin
      .from('study_subscriptions')
      .update({
        grant_credits_remaining: plan.monthlyCredits,
        next_grant_at: nextGrant.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', row.id)
    await supabaseAdmin.from('study_credit_ledger').insert({
      student_id: row.student_id,
      delta: plan.monthlyCredits,
      bucket: 'grant',
      kind: 'grant',
      note: `monthly grant refresh ${plan.id}`,
    })
    summary.granted = (summary.granted ?? 0) + 1
  }

  return NextResponse.json({ ok: true, summary, ranAt: now.toISOString() })
}

async function chargeAndAdvance(
  row: SubscriptionRow,
  now: Date,
  summary: { charged: number; failed: number; errors: string[] }
) {
  // Scheduled downgrades take effect NOW, at the period boundary:
  // the renewal charges the pending plan's price and the row flips
  // to it. (Upgrades never sit in pending_plan — change-plan applies
  // them immediately with an immediate charge.)
  const effectivePlan = row.pending_plan && STUDY_PLANS[row.pending_plan]
    ? STUDY_PLANS[row.pending_plan]!
    : resolvePlan(row.plan)

  // Namespace by the period boundary so re-runs on the same day for
  // the same period don't double-charge.
  const periodMarker = row.current_period_end.split('T')[0]
  const paymentId = `study-sub-renew-${row.student_id}-${periodMarker}`

  const result = await chargeBillingKey({
    billingKey: row.portone_subscription_id!,
    paymentId,
    amount: effectivePlan.priceWon,
    orderName: effectivePlan.orderName,
    customerId: row.student_id,
    customData: {
      kind: 'study_subscription',
      attempt: 'renewal',
      student_id: row.student_id,
      period_end: row.current_period_end,
      plan: effectivePlan.id,
    },
  })

  if (result.ok) {
    // Advance the charge period by the plan's cadence (30 = monthly,
    // 365 = annual). Credits refresh on the renewal AND every 30 days in
    // between (via next_grant_at) so annual subs still get monthly grants.
    const base = Math.max(now.getTime(), new Date(row.current_period_end).getTime())
    const nextEnd = new Date(base + effectivePlan.intervalDays * 24 * 60 * 60 * 1000)
    const nextGrant = new Date(now.getTime() + GRANT_INTERVAL_DAYS * 24 * 60 * 60 * 1000)
    await supabaseAdmin
      .from('study_subscriptions')
      .update({
        status: 'active',
        plan: effectivePlan.id,
        pending_plan: null,
        price_cents: effectivePlan.priceWon * 100,
        current_period_start: now.toISOString(),
        current_period_end: nextEnd.toISOString(),
        next_grant_at: nextGrant.toISOString(),
        last_payment_id: paymentId,
        last_payment_attempt_at: now.toISOString(),
        last_payment_failure: null,
        // Monthly grant RESETS each cycle (no rollover); purchased
        // pack credits are untouched.
        grant_credits_remaining: effectivePlan.monthlyCredits,
        updated_at: now.toISOString(),
      })
      .eq('id', row.id)
    await supabaseAdmin.from('study_credit_ledger').insert({
      student_id: row.student_id,
      delta: effectivePlan.monthlyCredits,
      bucket: 'grant',
      kind: 'grant',
      note: `renewal ${effectivePlan.id} (${paymentId})`,
    })
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
