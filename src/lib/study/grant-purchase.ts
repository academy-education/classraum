import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolvePack, resolvePass, STUDY_PLANS, isPassPlan } from '@/lib/study/plans'
import { trackEvent } from '@/lib/study/analytics'
import { grantTestEntitlement, pointStudyPathAtTest } from '@/lib/study/entitlements'

/**
 * Shared grant logic for one-time study purchases (credit packs + exam
 * passes). ONE implementation, called by two entry points so they can
 * never drift:
 *
 *   1. The synchronous client path — the purchase-pack / purchase-pass
 *      routes, after the browser returns a paid paymentId and the route
 *      has verified it.
 *   2. The webhook backstop — /api/study/payment-webhook, when PortOne
 *      reports Transaction.Paid but the client never made it back to
 *      redeem (dropped redirect, WebView reload, session-restore race).
 *      PortOne strongly recommends a webhook exactly for this: without
 *      it, a charged card whose client return is lost grants nothing.
 *
 * Idempotency is the study_payments PK on payment_id. We ALWAYS insert
 * that row BEFORE granting, so if the same payment arrives twice (client
 * + webhook, or a webhook retry) the second caller loses the insert and
 * we no-op — the card is never credited twice.
 *
 * Callers are responsible for verifying the payment is genuinely PAID
 * (amount, currency, customData) before calling these — the helpers
 * assume a trusted, verified purchase and only do record + grant.
 */

export type GrantOutcome =
  | { status: 'granted'; creditsAdded: number; periodEnd?: string }
  | { status: 'already_processed' }
  | { status: 'error'; httpStatus: number; message: string }

/** Insert the idempotency row. 'new' = we own the grant; 'duplicate' =
 *  someone already redeemed this paymentId (no-op). */
async function recordPayment(
  paymentId: string,
  studentId: string,
  kind: 'study_credit_pack' | 'study_exam_pass',
  amountWon: number,
): Promise<'new' | 'duplicate'> {
  const { error } = await supabaseAdmin.from('study_payments').insert({
    payment_id: paymentId,
    student_id: studentId,
    kind,
    amount_won: amountWon,
  })
  return error ? 'duplicate' : 'new'
}

export async function grantCreditPack(opts: {
  studentId: string
  packId: string
  paymentId: string
  /** A freshly issued card to persist for reuse (client billing-key path
   *  only). The webhook has none. */
  billingKeyToPersist?: string | null
}): Promise<GrantOutcome> {
  const pack = resolvePack(opts.packId)

  const recorded = await recordPayment(opts.paymentId, opts.studentId, 'study_credit_pack', pack.priceWon)
  if (recorded === 'duplicate') return { status: 'already_processed' }

  // Ensure a subscription row exists to hold the credits, and persist a
  // freshly issued card if we were given one and the row lacks one.
  const nowIso = new Date().toISOString()
  const { data: sub } = await supabaseAdmin
    .from('study_subscriptions')
    .select('portone_subscription_id')
    .eq('student_id', opts.studentId)
    .maybeSingle()
  if (!sub) {
    await supabaseAdmin.from('study_subscriptions').insert({
      student_id: opts.studentId,
      status: 'free',
      plan: 'free_v1',
      currency: 'KRW',
      portone_subscription_id: opts.billingKeyToPersist ?? null,
      grant_credits_remaining: 0,
      purchased_credits_remaining: 0,
      updated_at: nowIso,
    })
  } else if (!sub.portone_subscription_id && opts.billingKeyToPersist) {
    await supabaseAdmin
      .from('study_subscriptions')
      .update({ portone_subscription_id: opts.billingKeyToPersist, updated_at: nowIso })
      .eq('student_id', opts.studentId)
  }

  const { error: updateErr } = await supabaseAdmin.rpc('increment_study_purchased_credits', {
    p_student_id: opts.studentId,
    p_delta: pack.credits,
  })
  if (updateErr) {
    // Charge captured + payment recorded, but the credit write failed.
    // Do NOT unwind the study_payments row — leaving it means a retry
    // won't double-grant; support reconciles from the loud log.
    console.error('[grant] pack recorded but credit write failed', {
      studentId: opts.studentId, paymentId: opts.paymentId, error: updateErr,
    })
    return { status: 'error', httpStatus: 500, message: 'credit write failed; support will reconcile' }
  }
  await supabaseAdmin.from('study_credit_ledger').insert({
    student_id: opts.studentId,
    delta: pack.credits,
    bucket: 'purchased',
    kind: 'purchase',
    note: `${pack.id} (${opts.paymentId})`,
  })

  void trackEvent(opts.studentId, 'pack_purchased', {
    packId: pack.id, credits: pack.credits, priceWon: pack.priceWon,
  })

  return { status: 'granted', creditsAdded: pack.credits }
}

export async function grantExamPass(opts: {
  studentId: string
  passId: string
  paymentId: string
}): Promise<GrantOutcome> {
  const passTerms = resolvePass(opts.passId)
  if (!passTerms) return { status: 'error', httpStatus: 400, message: 'unknown pass' }
  const passPlan = STUDY_PLANS[passTerms.id]
  if (!passPlan) return { status: 'error', httpStatus: 400, message: 'unknown pass plan' }

  const recorded = await recordPayment(opts.paymentId, opts.studentId, 'study_exam_pass', passPlan.priceWon)
  if (recorded === 'duplicate') return { status: 'already_processed' }

  // Date-anchored passes run until a fixed exam date; rolling passes run
  // a fixed number of days from now.
  const now = new Date()
  const periodEnd = passTerms.examDate
    ? new Date(`${passTerms.examDate}T23:59:59+09:00`)
    : new Date(now.getTime() + (passTerms.durationDays ?? 90) * 24 * 60 * 60 * 1000)

  // Preserve an existing stored card so the buyer can still top up packs,
  // and (critically) preserve any grant-bucket credits they already have —
  // buying a pass must not wipe free/monthly credits.
  const { data: sub } = await supabaseAdmin
    .from('study_subscriptions')
    .select('portone_subscription_id, grant_credits_remaining')
    .eq('student_id', opts.studentId)
    .maybeSingle()

  const { error: upsertError } = await supabaseAdmin
    .from('study_subscriptions')
    .upsert({
      student_id: opts.studentId,
      status: 'active',
      plan: passPlan.id,
      pending_plan: null,
      price_cents: passPlan.priceWon * 100,
      currency: 'KRW',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_grant_at: null,
      cancel_at_period_end: true,
      portone_subscription_id: sub?.portone_subscription_id ?? null,
      last_payment_id: opts.paymentId,
      last_payment_attempt_at: now.toISOString(),
      last_payment_failure: null,
      // Keep existing grant-bucket credits — the pass adds to the purchased
      // bucket (RPC below) and must never zero out credits the buyer had.
      grant_credits_remaining: sub?.grant_credits_remaining ?? 0,
      updated_at: now.toISOString(),
    }, { onConflict: 'student_id' })
  if (upsertError) {
    console.error('[grant] pass recorded but state write failed', {
      studentId: opts.studentId, paymentId: opts.paymentId, error: upsertError,
    })
    return { status: 'error', httpStatus: 500, message: 'pass state write failed; support will reconcile' }
  }

  const { error: creditErr } = await supabaseAdmin.rpc('increment_study_purchased_credits', {
    p_student_id: opts.studentId,
    p_delta: passTerms.credits,
  })
  if (creditErr) {
    console.error('[grant] pass active but credit grant failed', {
      studentId: opts.studentId, paymentId: opts.paymentId, error: creditErr,
    })
    return { status: 'error', httpStatus: 500, message: 'pass active but credit grant failed; support will reconcile' }
  }
  await supabaseAdmin.from('study_credit_ledger').insert({
    student_id: opts.studentId,
    delta: passTerms.credits,
    bucket: 'purchased',
    kind: 'purchase',
    note: `${passPlan.id} (${opts.paymentId})`,
  })

  // Test-scoped access: record the entitlement (stackable — a SAT pass and a
  // TOEFL pass coexist) so this pass unlocks its test until the period ends,
  // and point the study path at that test. All-access passes ('*') skip the
  // path pointer since they don't correspond to a single test.
  try {
    await grantTestEntitlement({ studentId: opts.studentId, test: passTerms.test, expiresAt: periodEnd, source: 'pass' })
    if (passTerms.test === 'sat' || passTerms.test === 'toefl') {
      await pointStudyPathAtTest(opts.studentId, passTerms.test)
    }
  } catch (e) {
    // Access-grant failure shouldn't fail the (already succeeded) purchase —
    // log for reconciliation; the entitlement can be backfilled.
    console.error('[grant] pass credits ok but entitlement write failed', {
      studentId: opts.studentId, paymentId: opts.paymentId, error: e,
    })
  }

  void trackEvent(opts.studentId, 'pass_purchased', {
    passId: passPlan.id, credits: passTerms.credits, priceWon: passPlan.priceWon,
  })

  return { status: 'granted', creditsAdded: passTerms.credits, periodEnd: periodEnd.toISOString() }
}

/** Guard re-export so the webhook can skip pass grants that would clobber
 *  a live recurring subscription (mirrors the route's pre-purchase gate). */
export { isPassPlan }
