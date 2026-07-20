import { supabaseAdmin } from '@/lib/supabase-admin'
import { chargeBillingKey } from '@/lib/portone-charge'
import { resolvePlan, GRANT_INTERVAL_DAYS } from '@/lib/study/plans'
import { trackEvent } from '@/lib/study/analytics'
import { grantReferralConversionIfEligible } from '@/lib/study/referral-conversion'

/**
 * Shared first-charge + activation for a recurring subscription tier,
 * given an issued billing key. ONE implementation, called by:
 *
 *   1. POST /api/study/subscription/billing-key — the client path, run
 *      when the subscribe page posts the freshly issued key.
 *   2. The subscription webhook's BillingKey.Issued handler — the
 *      backstop, run when the client never posted (dropped redirect /
 *      closed WebView). Without it, the card is registered but the first
 *      charge never fires, so the buyer has no subscription.
 *
 * Idempotency: subscription first-charges use a timestamped paymentId
 * (each attempt issues a NEW billing key), so there's no PK to dedupe on
 * like the one-time flow. Instead we guard on the subscription row:
 *   - a row already active on THIS billing key → no-op (client already
 *     completed, or a webhook retry)
 *   - `onlyIfNoActiveSub` (the webhook) also no-ops if the student has
 *     ANY active/trial subscription, so the backstop never charges
 *     someone a client retry already subscribed.
 */

export type ActivateOutcome =
  | { status: 'activated'; periodEnd: string; paymentId: string }
  | { status: 'already_active' }
  | { status: 'charge_failed'; code?: string; message?: string }
  | { status: 'error'; httpStatus: number; message: string; paymentId: string }

export async function activateSubscriptionFromBillingKey(opts: {
  studentId: string
  billingKey: string
  planId?: string
  /** Webhook backstop: skip entirely if the student already has any
   *  active/trial subscription (prevents a double charge racing a
   *  successful client retry). */
  onlyIfNoActiveSub?: boolean
}): Promise<ActivateOutcome> {
  const plan = resolvePlan(opts.planId)

  const { data: sub } = await supabaseAdmin
    .from('study_subscriptions')
    .select('status, portone_subscription_id')
    .eq('student_id', opts.studentId)
    .maybeSingle()

  // Exact-key idempotency: this billing key already activated a row.
  if (sub?.status === 'active' && sub.portone_subscription_id === opts.billingKey) {
    return { status: 'already_active' }
  }
  // Backstop-only guard: don't charge if they're already subscribed by
  // any means (e.g. a client retry that succeeded first).
  if (opts.onlyIfNoActiveSub && (sub?.status === 'active' || sub?.status === 'trial')) {
    return { status: 'already_active' }
  }

  // First charge. Namespace with init + epoch so retries don't collide
  // with the renewal cron's monthly paymentIds.
  const paymentId = `study-sub-init-${opts.studentId}-${Date.now()}`
  const result = await chargeBillingKey({
    billingKey: opts.billingKey,
    paymentId,
    amount: plan.priceWon,
    orderName: plan.orderName,
    customerId: opts.studentId,
    customData: {
      kind: 'study_subscription',
      attempt: 'initial',
      student_id: opts.studentId,
      plan: plan.id,
    },
  })

  if (!result.ok) {
    // Persist the failure for the management UI, but DON'T store the
    // billing key — a bad first charge could mean a dead card, and we
    // don't want the renewal cron to keep retrying it.
    const nowIso = new Date().toISOString()
    if (sub?.status === 'active') {
      // A failed NEW subscribe attempt must NOT downgrade an existing
      // active subscription/pass — only note the failure, keep them active.
      await supabaseAdmin
        .from('study_subscriptions')
        .update({ last_payment_attempt_at: nowIso, last_payment_failure: result.message ?? 'unknown', updated_at: nowIso })
        .eq('student_id', opts.studentId)
    } else {
      await supabaseAdmin
        .from('study_subscriptions')
        .upsert({
          student_id: opts.studentId,
          status: 'past_due',
          last_payment_attempt_at: nowIso,
          last_payment_failure: result.message ?? 'unknown',
          updated_at: nowIso,
        }, { onConflict: 'student_id' })
    }
    return { status: 'charge_failed', code: result.code, message: result.message }
  }

  // Success — store the key, mark active, advance the period. Charge
  // cadence follows the plan (30 = monthly, 365 = annual); the credit
  // grant refreshes every GRANT_INTERVAL_DAYS via next_grant_at so annual
  // subscribers still get monthly credits.
  const now = new Date()
  const periodEnd = new Date(now.getTime() + plan.intervalDays * 24 * 60 * 60 * 1000)
  const nextGrantAt = new Date(now.getTime() + GRANT_INTERVAL_DAYS * 24 * 60 * 60 * 1000)
  const { error: upsertError } = await supabaseAdmin
    .from('study_subscriptions')
    .upsert({
      student_id: opts.studentId,
      status: 'active',
      plan: plan.id,
      price_cents: plan.priceWon * 100,
      currency: 'KRW',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_grant_at: nextGrantAt.toISOString(),
      cancel_at_period_end: false,
      portone_subscription_id: opts.billingKey,
      last_payment_id: paymentId,
      last_payment_attempt_at: now.toISOString(),
      last_payment_failure: null,
      grant_credits_remaining: plan.monthlyCredits,
      updated_at: now.toISOString(),
    }, { onConflict: 'student_id' })

  if (upsertError) {
    console.error('[study/activate-subscription] charge ok but state write failed', {
      studentId: opts.studentId, paymentId, error: upsertError,
    })
    return { status: 'error', httpStatus: 500, message: 'charge ok but state write failed; support will reconcile', paymentId }
  }

  await supabaseAdmin.from('study_credit_ledger').insert({
    student_id: opts.studentId,
    delta: plan.monthlyCredits,
    bucket: 'grant',
    kind: 'grant',
    note: `initial charge ${plan.id} (${paymentId})`,
  })

  void trackEvent(opts.studentId, 'checkout_completed', { plan: plan.id, priceWon: plan.priceWon })
  // Referral stage 2: grant both sides the premium-conversion bonus once.
  void grantReferralConversionIfEligible(opts.studentId)

  return { status: 'activated', periodEnd: periodEnd.toISOString(), paymentId }
}
