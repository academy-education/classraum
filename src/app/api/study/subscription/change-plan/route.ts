import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { chargeBillingKey } from '@/lib/portone-charge'
import { STUDY_PLANS, resolvePlan, GRANT_INTERVAL_DAYS } from '@/lib/study/plans'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/subscription/change-plan — switch between General
 * and Premium.
 *
 * Semantics (v1, simple and honest):
 *   - UPGRADE (general → premium): charge the premium price NOW,
 *     start a fresh 30-day period, and reset the monthly grant to the
 *     premium allotment. The remaining general period is forfeited —
 *     the UI says so before confirming.
 *   - DOWNGRADE (premium → general): no charge now; pending_plan is
 *     set and the renewal cron applies it (price + grant) at the next
 *     period boundary. Premium perks stay until then.
 *   - Cancelling a scheduled downgrade: send the current plan id and
 *     pending_plan clears.
 */

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  let body: { plan?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const target = body.plan ? STUDY_PLANS[body.plan] : undefined
  if (!target) return NextResponse.json({ error: 'unknown plan' }, { status: 400 })

  const { data: sub } = await supabaseAdmin
    .from('study_subscriptions')
    .select('status, plan, pending_plan, portone_subscription_id, purchased_credits_remaining')
    .eq('student_id', user.id)
    .maybeSingle()
  if (!sub || sub.status !== 'active') {
    return NextResponse.json({ error: 'active subscription required' }, { status: 403 })
  }
  const current = resolvePlan(sub.plan)

  // Same plan → treat as "cancel scheduled change".
  if (target.id === current.id) {
    await supabaseAdmin
      .from('study_subscriptions')
      .update({ pending_plan: null, updated_at: new Date().toISOString() })
      .eq('student_id', user.id)
    return NextResponse.json({ success: true, plan: current.id, pending_plan: null })
  }

  // DOWNGRADE — schedule for the period boundary.
  if (target.priceWon < current.priceWon) {
    await supabaseAdmin
      .from('study_subscriptions')
      .update({ pending_plan: target.id, updated_at: new Date().toISOString() })
      .eq('student_id', user.id)
    return NextResponse.json({ success: true, plan: current.id, pending_plan: target.id })
  }

  // UPGRADE — immediate charge, fresh period, fresh grant.
  if (!sub.portone_subscription_id) {
    return NextResponse.json({ error: 'no payment method on file' }, { status: 402 })
  }
  const paymentId = `study-sub-upgrade-${user.id}-${Date.now()}`
  const result = await chargeBillingKey({
    billingKey: sub.portone_subscription_id,
    paymentId,
    amount: target.priceWon,
    orderName: target.orderName,
    customerId: user.id,
    customData: {
      kind: 'study_subscription',
      attempt: 'upgrade',
      student_id: user.id,
      plan: target.id,
    },
  })
  if (!result.ok) {
    return NextResponse.json(
      { error: 'charge failed', code: result.code, message: result.message },
      { status: 402 },
    )
  }

  const now = new Date()
  // Period follows the target plan's cadence (30 = monthly, 365 = annual)
  // — an upgrade to annual must give a full year, not 30 days. The credit
  // grant still refreshes every 30 days via next_grant_at.
  const periodEnd = new Date(now.getTime() + target.intervalDays * 24 * 60 * 60 * 1000)
  const nextGrantAt = new Date(now.getTime() + GRANT_INTERVAL_DAYS * 24 * 60 * 60 * 1000)
  const { error: updateErr } = await supabaseAdmin
    .from('study_subscriptions')
    .update({
      plan: target.id,
      pending_plan: null,
      price_cents: target.priceWon * 100,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_grant_at: nextGrantAt.toISOString(),
      last_payment_id: paymentId,
      last_payment_attempt_at: now.toISOString(),
      last_payment_failure: null,
      grant_credits_remaining: target.monthlyCredits,
      updated_at: now.toISOString(),
    })
    .eq('student_id', user.id)
  if (updateErr) {
    console.error('[study/change-plan] charge ok but state write failed', {
      studentId: user.id, paymentId, error: updateErr,
    })
    return NextResponse.json({
      error: 'charge ok but state write failed; support will reconcile',
      paymentId,
    }, { status: 500 })
  }
  await supabaseAdmin.from('study_credit_ledger').insert({
    student_id: user.id,
    delta: target.monthlyCredits,
    bucket: 'grant',
    kind: 'grant',
    note: `upgrade to ${target.id} (${paymentId})`,
  })

  return NextResponse.json({
    success: true,
    plan: target.id,
    current_period_end: periodEnd.toISOString(),
    paymentId,
  })
}
