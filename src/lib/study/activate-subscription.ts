import { createHash } from 'crypto'
import { dbAdmin } from '@/lib/supabase-admin'
import { chargeBillingKey, chargeAlreadyPaid } from '@/lib/portone-charge'
import { recordSubscriptionPayment } from '@/lib/study/record-subscription-payment'
import { resolvePlan, GRANT_INTERVAL_DAYS, isPurchasableStudyPlan } from '@/lib/study/plans'
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
 * Idempotency: the first-charge paymentId is DERIVED FROM THE BILLING KEY
 * (each checkout issues a new key), so every caller for one key charges
 * the same paymentId and PortOne — whose idempotency key it is — charges
 * the card at most once. The row guards below are an optimisation, not
 * the guarantee:
 *   - a row already active on THIS billing key → no-op (client already
 *     completed, or a webhook retry)
 *   - `onlyIfNoActiveSub` (the webhook) also no-ops if the student has
 *     ANY active/trial subscription.
 *
 * They are a read followed by a charge, so on their own they were NOT
 * safe: the client POST and the BillingKey.Issued webhook arrive within
 * a second of each other, both read "no active sub", and with the old
 * `-${Date.now()}` paymentId each charged the card under its own id —
 * two real charges for one subscription. The loser of that race now gets
 * ALREADY_PAID from PortOne; once a re-read of the payment confirms it is
 * PAID, that is treated as the concurrent success it is.
 */

/** The first-charge paymentId for a billing key. Same length as the old
 *  `-${Date.now()}` suffix (13 chars) so the id shape is unchanged. */
export function initialPaymentIdFor(studentId: string, billingKey: string): string {
  const h = createHash('sha256').update(billingKey).digest('hex').slice(0, 13)
  return `study-sub-init-${studentId}-${h}`
}

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
  // Last line of defence for every caller (billing-key, webhook backstop,
  // recover): only monthly plans start a subscription. An absent planId
  // keeps resolving to general_v1 for pre-tier clients.
  if (opts.planId && !isPurchasableStudyPlan(opts.planId)) {
    return { status: 'error', httpStatus: 400, message: 'plan not available', paymentId: '' }
  }
  const plan = resolvePlan(opts.planId)

  const { data: sub } = await dbAdmin
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

  // First charge. Namespaced with init so it never collides with the
  // renewal cron's period ids; keyed on the billing key so concurrent
  // callers for one checkout share one PortOne idempotency key.
  const paymentId = initialPaymentIdFor(opts.studentId, opts.billingKey)
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

  if (!result.ok && await chargeAlreadyPaid(result, paymentId, plan.priceWon)) {
    // A concurrent caller for this same key charged it a moment ago. If it
    // already wrote the activation we are done; if not (it is still in
    // flight, or died after the charge) fall through and write the same
    // activation ourselves — the money moved, so the state must follow.
    const { data: current } = await dbAdmin
      .from('study_subscriptions')
      .select('status, last_payment_id')
      .eq('student_id', opts.studentId)
      .maybeSingle()
    if (current?.last_payment_id === paymentId) return { status: 'already_active' }
  } else if (!result.ok) {
    // Persist the failure for the management UI, but DON'T store the
    // billing key — a bad first charge could mean a dead card, and we
    // don't want the renewal cron to keep retrying it.
    const nowIso = new Date().toISOString()
    // The charge already failed, so these writes only record WHY. Losing
    // them leaves the management UI with no failure reason (and, in the
    // past_due branch, no dunning state), so log rather than swallow.
    let failureWriteErr: unknown = null
    if (sub?.status === 'active') {
      // A failed NEW subscribe attempt must NOT downgrade an existing
      // active subscription/pass — only note the failure, keep them active.
      const { error } = await dbAdmin
        .from('study_subscriptions')
        .update({ last_payment_attempt_at: nowIso, last_payment_failure: result.message ?? 'unknown', updated_at: nowIso })
        .eq('student_id', opts.studentId)
      failureWriteErr = error
    } else {
      const { error } = await dbAdmin
        .from('study_subscriptions')
        .upsert({
          student_id: opts.studentId,
          status: 'past_due',
          last_payment_attempt_at: nowIso,
          last_payment_failure: result.message ?? 'unknown',
          updated_at: nowIso,
        }, { onConflict: 'student_id' })
      failureWriteErr = error
    }
    if (failureWriteErr) {
      console.error('[study/activate-subscription] payment-failure state write failed', {
        studentId: opts.studentId, paymentId, error: failureWriteErr,
      })
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
  const { error: upsertError } = await dbAdmin
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

  // The grant is already on the row above — a lost ledger row is an audit
  // gap (balance no longer reconciles), never a reason to re-grant.
  const { error: ledgerErr } = await dbAdmin.from('study_credit_ledger').insert({
    student_id: opts.studentId,
    delta: plan.monthlyCredits,
    bucket: 'grant',
    kind: 'grant',
    note: `initial charge ${plan.id} (${paymentId})`,
  })
  if (ledgerErr) {
    console.error('[study/activate-subscription] ledger row missing', {
      studentId: opts.studentId, paymentId, credits: plan.monthlyCredits, error: ledgerErr,
    })
  }
  // Record the charge so it surfaces in the admin payments view / is refundable.
  await recordSubscriptionPayment({ paymentId, studentId: opts.studentId, amountWon: plan.priceWon })

  void trackEvent(opts.studentId, 'checkout_completed', { plan: plan.id, priceWon: plan.priceWon })
  // Referral stage 2: grant both sides the premium-conversion bonus once.
  void grantReferralConversionIfEligible(opts.studentId)

  return { status: 'activated', periodEnd: periodEnd.toISOString(), paymentId }
}
