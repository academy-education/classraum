import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { chargeBillingKey } from '@/lib/portone-charge'
import { STUDY_PLANS, resolvePlan, GRANT_INTERVAL_DAYS } from '@/lib/study/plans'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/subscription/billing-key
 *
 * Called by the web subscribe page after the PortOne browser SDK
 * returns a billing key. We store the key, immediately charge the
 * first month, and on success flip the row to status='active' with
 * a new 30-day period.
 *
 * This replaces the Phase-4 stub /checkout endpoint. The UI gates
 * native (Capacitor) clients away from the subscribe flow entirely
 * — only web hits this route.
 *
 * Idempotency: paymentId is namespaced
 *   `study-sub-init-{studentId}-{epochMs}`
 * so retries from the same client within seconds produce different
 * payment IDs and don't collide. PortOne dedups by paymentId on
 * its side as a safety net.
 */

export const dynamic = 'force-dynamic'


export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  let body: { billingKey?: string; plan?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const billingKey = body.billingKey
  if (!billingKey || typeof billingKey !== 'string') {
    return NextResponse.json({ error: 'missing billingKey' }, { status: 400 })
  }
  // Tiered plans — must be an exact catalog id; missing defaults to
  // General for backward compatibility with pre-tier clients.
  if (body.plan && !STUDY_PLANS[body.plan]) {
    return NextResponse.json({ error: 'unknown plan' }, { status: 400 })
  }
  const plan = resolvePlan(body.plan)

  // First charge. Namespace with init + epoch so retries don't
  // collide with the renewal cron's monthly paymentIds.
  const paymentId = `study-sub-init-${user.id}-${Date.now()}`
  const result = await chargeBillingKey({
    billingKey,
    paymentId,
    amount: plan.priceWon,
    orderName: plan.orderName,
    customerId: user.id,
    customData: {
      kind: 'study_subscription',
      attempt: 'initial',
      student_id: user.id,
      plan: plan.id,
    },
  })

  if (!result.ok) {
    // Persist the failure for the management UI to surface, but DON'T
    // store the billing key — a bad first charge could mean the card
    // is dead, so we don't want renewal cron to keep retrying it.
    await supabaseAdmin
      .from('study_subscriptions')
      .upsert({
        student_id: user.id,
        status: 'past_due',
        last_payment_attempt_at: new Date().toISOString(),
        last_payment_failure: result.message ?? 'unknown',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'student_id' })

    return NextResponse.json(
      { error: 'charge failed', code: result.code, message: result.message },
      { status: 402 }
    )
  }

  // Success — store the billing key, mark active, advance period. The
  // charge cadence follows the plan (30 = monthly, 365 = annual); the
  // credit grant refreshes every GRANT_INTERVAL_DAYS regardless, tracked
  // by next_grant_at so annual subscribers still get monthly credits.
  const now = new Date()
  const periodEnd = new Date(now.getTime() + plan.intervalDays * 24 * 60 * 60 * 1000)
  const nextGrantAt = new Date(now.getTime() + GRANT_INTERVAL_DAYS * 24 * 60 * 60 * 1000)
  const { error: upsertError } = await supabaseAdmin
    .from('study_subscriptions')
    .upsert({
      student_id: user.id,
      status: 'active',
      plan: plan.id,
      price_cents: plan.priceWon * 100,
      currency: 'KRW',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_grant_at: nextGrantAt.toISOString(),
      cancel_at_period_end: false,
      portone_subscription_id: billingKey,
      last_payment_id: paymentId,
      last_payment_attempt_at: now.toISOString(),
      last_payment_failure: null,
      // Fresh cycle → fresh monthly test-credit grant (purchased pack
      // credits, if any, are preserved by not touching that column).
      grant_credits_remaining: plan.monthlyCredits,
      updated_at: now.toISOString(),
    }, { onConflict: 'student_id' })

  if (!upsertError) {
    await supabaseAdmin.from('study_credit_ledger').insert({
      student_id: user.id,
      delta: plan.monthlyCredits,
      bucket: 'grant',
      kind: 'grant',
      note: `initial charge ${plan.id} (${paymentId})`,
    })
  }

  if (upsertError) {
    // Charge already succeeded — if we can't write the row this is a
    // reconciliation problem, not a refund-immediately one. Log loud
    // so support can repair from the webhook later.
    console.error('[study/subscription/billing-key] charge ok but upsert failed', {
      studentId: user.id, paymentId, error: upsertError,
    })
    return NextResponse.json({
      error: 'charge ok but state write failed; support will reconcile',
      paymentId,
    }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    current_period_end: periodEnd.toISOString(),
    paymentId,
  })
}
