import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { chargeBillingKey } from '@/lib/portone-charge'
import { STUDY_PLANS, STUDY_PASSES, resolvePass, isPassPlan } from '@/lib/study/plans'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/subscription/purchase-pass — one-time 수능 대비 패스.
 *
 * A seasonal, non-recurring pass: charges ₩39,000 once against a freshly
 * issued billing key, then grants Premium features until the KSAT exam
 * date plus a batch of test credits. Modelled as an active subscription
 * row with cancel_at_period_end = true so the daily billing cron
 * finalizes it (→ cancelled) at the exam date and NEVER charges a
 * renewal. isPassPlan guards keep this row out of the renewal and
 * reactivate paths.
 *
 * Body: { billingKey } — issued by the PortOne browser overlay, same as
 * the subscribe flow. Web only (native clients hide the CTA).
 *
 * Gating: available to anyone NOT already on an active recurring paid
 * plan (free, trial, expired, cancelled, past_due, or no row). We refuse
 * to overwrite a live recurring subscription — that would silently drop
 * their renewal.
 */

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  // Real-money endpoint: one charge per 15s per student.
  const blocked = enforceRateLimit(
    `purchase-pass:user:${user.id}`,
    { windowMs: 15 * 1000, max: 1 },
  )
  if (blocked) return blocked

  let body: { billingKey?: string; passId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const billingKey = body.billingKey
  if (!billingKey || typeof billingKey !== 'string') {
    return NextResponse.json({ error: 'missing billingKey' }, { status: 400 })
  }

  // Default to the first pass for pre-passId clients; otherwise resolve the
  // requested sitting pass.
  const passTerms = resolvePass(body.passId) ?? STUDY_PASSES[0]!
  const passPlan = STUDY_PLANS[passTerms.id]!

  // Date-anchored passes run until a fixed exam date (and refuse once it
  // has passed); rolling passes run a fixed number of days from purchase.
  const now = new Date()
  const periodEnd = passTerms.examDate
    ? new Date(`${passTerms.examDate}T23:59:59+09:00`)
    : new Date(now.getTime() + (passTerms.durationDays ?? 90) * 24 * 60 * 60 * 1000)
  if (periodEnd.getTime() <= now.getTime()) {
    return NextResponse.json({ error: 'pass out of season', code: 'pass_unavailable' }, { status: 409 })
  }

  const { data: sub } = await supabaseAdmin
    .from('study_subscriptions')
    .select('status, plan')
    .eq('student_id', user.id)
    .maybeSingle()
  // Don't clobber a live recurring subscription. A row that is active on
  // a recurring paid plan (not itself a pass) already gets Premium/credits
  // — selling them a pass on top would drop their renewal schedule.
  if (sub && sub.status === 'active' && !isPassPlan(sub.plan)) {
    return NextResponse.json({ error: 'already on an active plan', code: 'already_subscribed' }, { status: 409 })
  }
  if (sub && sub.status === 'active' && isPassPlan(sub.plan)) {
    return NextResponse.json({ error: 'pass already active', code: 'pass_active' }, { status: 409 })
  }

  const paymentId = `study-pass-${user.id}-${Date.now()}`
  const result = await chargeBillingKey({
    billingKey,
    paymentId,
    amount: passPlan.priceWon,
    orderName: passPlan.orderName,
    customerId: user.id,
    customData: {
      kind: 'study_exam_pass',
      pass: passPlan.id,
      student_id: user.id,
    },
  })
  if (!result.ok) {
    return NextResponse.json(
      { error: 'charge failed', code: result.code, message: result.message },
      { status: 402 },
    )
  }

  // Success — write the pass row. cancel_at_period_end=true so the cron
  // finalizes (never renews) it; next_grant_at=null so §4 never refreshes
  // a monthly grant. Store the billing key so the buyer can top up credit
  // packs during the pass window.
  const { error: upsertError } = await supabaseAdmin
    .from('study_subscriptions')
    .upsert({
      student_id: user.id,
      status: 'active',
      plan: passPlan.id,
      pending_plan: null,
      price_cents: passPlan.priceWon * 100,
      currency: 'KRW',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_grant_at: null,
      cancel_at_period_end: true,
      portone_subscription_id: billingKey,
      last_payment_id: paymentId,
      last_payment_attempt_at: now.toISOString(),
      last_payment_failure: null,
      // Pass credits go to the purchased bucket via the atomic RPC below;
      // the pass never carries a monthly grant.
      grant_credits_remaining: 0,
      updated_at: now.toISOString(),
    }, { onConflict: 'student_id' })

  if (upsertError) {
    console.error('[study/purchase-pass] charge ok but state write failed', {
      studentId: user.id, paymentId, error: upsertError,
    })
    return NextResponse.json({
      error: 'charge ok but state write failed; support will reconcile',
      paymentId,
    }, { status: 500 })
  }

  // Grant the pass credits atomically (never clobbers an existing
  // purchased balance).
  const { error: creditErr } = await supabaseAdmin.rpc('increment_study_purchased_credits', {
    p_student_id: user.id,
    p_delta: passTerms.credits,
  })
  if (creditErr) {
    console.error('[study/purchase-pass] pass row ok but credit grant failed', {
      studentId: user.id, paymentId, error: creditErr,
    })
    // Row is already Premium-active; the credit shortfall is a
    // reconciliation issue, not a refund-now one.
    return NextResponse.json({
      error: 'pass active but credit grant failed; support will reconcile',
      paymentId,
    }, { status: 500 })
  }
  await supabaseAdmin.from('study_credit_ledger').insert({
    student_id: user.id,
    delta: passTerms.credits,
    bucket: 'purchased',
    kind: 'purchase',
    note: `${passPlan.id} (${paymentId})`,
  })

  return NextResponse.json({
    success: true,
    current_period_end: periodEnd.toISOString(),
    creditsAdded: passTerms.credits,
    paymentId,
  })
}
