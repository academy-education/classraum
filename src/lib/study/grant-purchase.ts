import { dbAdmin } from '@/lib/supabase-admin'
import { resolvePack, resolvePass, STUDY_PLANS, isPassPlan } from '@/lib/study/plans'
import { trackEvent } from '@/lib/study/analytics'
import { grantTestEntitlement, pointStudyPathAtTest } from '@/lib/study/entitlements'
import { raiseAlert } from '@/lib/ops/alert'

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

/** Insert the idempotency row.
 *
 *  'new'       — we own the grant.
 *  'duplicate' — ONLY a Postgres unique violation (23505): someone already
 *                redeemed this paymentId, so this call is a no-op.
 *  'failed'    — any other error. supabase-js resolves errors instead of
 *                throwing, so this used to be read as 'duplicate': the card
 *                was charged, nothing was granted, nothing was recorded, and
 *                BOTH the client path and the webhook backstop reported
 *                `already_processed` — making the charge unrecoverable. A
 *                real failure must surface so the caller can retry/alert; no
 *                row was written, so a retry grants exactly once. */
export async function recordPayment(
  paymentId: string,
  studentId: string,
  kind: 'study_credit_pack' | 'study_exam_pass',
  amountWon: number,
): Promise<{ status: 'new' | 'duplicate' } | { status: 'failed'; error: unknown }> {
  const { error } = await dbAdmin.from('study_payments').insert({
    payment_id: paymentId,
    student_id: studentId,
    kind,
    amount_won: amountWon,
  })
  if (!error) return { status: 'new' }
  if ((error as { code?: string }).code === '23505') return { status: 'duplicate' }
  return { status: 'failed', error }
}

/** Shared handling for a failed idempotency insert: the money moved, we have
 *  no record of it and granted nothing. Pages a human and tells the caller to
 *  fail loudly so the webhook backstop can still recover the grant. */
async function recordFailure(
  paymentId: string,
  studentId: string,
  kind: 'study_credit_pack' | 'study_exam_pass',
  error: unknown,
): Promise<GrantOutcome> {
  await raiseAlert({
    severity: 'critical',
    title: 'Study purchase could not be recorded',
    message:
      `The card was charged for a ${kind} but writing study_payments failed, so nothing was ` +
      `granted. No idempotency row exists, so a retry (client or webhook backstop) will grant ` +
      `exactly once — verify the student received their credits.`,
    dedupeKey: `study-payment-record-failed:${paymentId}`,
    error,
    context: { paymentId, studentId, kind },
  })
  return { status: 'error', httpStatus: 500, message: 'could not record payment; please retry' }
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
  if (recorded.status === 'duplicate') return { status: 'already_processed' }
  if (recorded.status === 'failed') {
    return recordFailure(opts.paymentId, opts.studentId, 'study_credit_pack', recorded.error)
  }

  // Ensure a subscription row exists to hold the credits, and persist a
  // freshly issued card if we were given one and the row lacks one.
  const nowIso = new Date().toISOString()
  const { data: sub } = await dbAdmin
    .from('study_subscriptions')
    .select('portone_subscription_id')
    .eq('student_id', opts.studentId)
    .maybeSingle()
  if (!sub) {
    // increment_study_purchased_credits is an upsert as of migration 055,
    // so the credits below no longer depend on this create succeeding.
    // It stays because it is also where a freshly issued billing key gets
    // persisted, and bailing on failure keeps the retry path intact (the
    // study_payments row is already ours, so the webhook backstop recovers).
    const { error: createErr } = await dbAdmin.from('study_subscriptions').insert({
      student_id: opts.studentId,
      status: 'free',
      plan: 'free_v1',
      // Free row: an unset price_cents used to inherit a 990000 default,
      // which the admin subscriptions table rendered as ₩9,900.
      price_cents: 0,
      currency: 'KRW',
      portone_subscription_id: opts.billingKeyToPersist ?? null,
      grant_credits_remaining: 0,
      purchased_credits_remaining: 0,
      updated_at: nowIso,
    })
    // 23505 = a concurrent create won; the row exists either way.
    if (createErr && (createErr as { code?: string }).code !== '23505') {
      console.error('[grant] pack recorded but subscription row create failed', {
        studentId: opts.studentId, paymentId: opts.paymentId, error: createErr,
      })
      return { status: 'error', httpStatus: 500, message: 'could not provision account; support will reconcile' }
    }
  } else if (!sub.portone_subscription_id && opts.billingKeyToPersist) {
    // Card persistence is a convenience (top-ups can re-issue a key), so a
    // failure must not fail a completed purchase — but it must be visible.
    const { error: keyErr } = await dbAdmin
      .from('study_subscriptions')
      .update({ portone_subscription_id: opts.billingKeyToPersist, updated_at: nowIso })
      .eq('student_id', opts.studentId)
    if (keyErr) {
      console.error('[grant] billing key not persisted', {
        studentId: opts.studentId, paymentId: opts.paymentId, error: keyErr,
      })
    }
  }

  const { error: updateErr } = await dbAdmin.rpc('increment_study_purchased_credits', {
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
  // Balance already moved, so a lost ledger row is an audit-trail gap, never
  // a reason to re-grant — but the balance stops reconciling, so log it.
  const { error: packLedgerErr } = await dbAdmin.from('study_credit_ledger').insert({
    student_id: opts.studentId,
    delta: pack.credits,
    bucket: 'purchased',
    kind: 'purchase',
    note: `${pack.id} (${opts.paymentId})`,
  })
  if (packLedgerErr) {
    console.error('[grant] pack credits granted but ledger row missing', {
      studentId: opts.studentId, paymentId: opts.paymentId, credits: pack.credits, error: packLedgerErr,
    })
  }

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
  if (recorded.status === 'duplicate') return { status: 'already_processed' }
  if (recorded.status === 'failed') {
    return recordFailure(opts.paymentId, opts.studentId, 'study_exam_pass', recorded.error)
  }

  // Date-anchored passes run until a fixed exam date; rolling passes run
  // a fixed number of days from now.
  const now = new Date()
  const periodEnd = passTerms.examDate
    ? new Date(`${passTerms.examDate}T23:59:59+09:00`)
    : new Date(now.getTime() + (passTerms.durationDays ?? 90) * 24 * 60 * 60 * 1000)

  // Preserve an existing stored card so the buyer can still top up packs,
  // and (critically) preserve any grant-bucket credits they already have —
  // buying a pass must not wipe free/monthly credits.
  const { data: sub } = await dbAdmin
    .from('study_subscriptions')
    .select('portone_subscription_id, grant_credits_remaining')
    .eq('student_id', opts.studentId)
    .maybeSingle()

  const { error: upsertError } = await dbAdmin
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

  // Pass credits go into the TEST-SCOPED pool (spendable only on this
  // pass's test, or any test for the '*' all-access pass) — not the
  // generic purchased bucket.
  const { error: creditErr } = await dbAdmin.rpc('increment_study_pass_credits', {
    p_student: opts.studentId,
    p_test: passTerms.test,
    p_delta: passTerms.credits,
  })
  if (creditErr) {
    console.error('[grant] pass active but credit grant failed', {
      studentId: opts.studentId, paymentId: opts.paymentId, error: creditErr,
    })
    return { status: 'error', httpStatus: 500, message: 'pass active but credit grant failed; support will reconcile' }
  }
  // As above: audit-trail only, but a silent gap makes the pass balance
  // impossible to reconcile against the ledger.
  const { error: passLedgerErr } = await dbAdmin.from('study_credit_ledger').insert({
    student_id: opts.studentId,
    delta: passTerms.credits,
    bucket: `pass:${passTerms.test}`,
    kind: 'purchase',
    note: `${passPlan.id} (${opts.paymentId})`,
  })
  if (passLedgerErr) {
    console.error('[grant] pass credits granted but ledger row missing', {
      studentId: opts.studentId, paymentId: opts.paymentId, credits: passTerms.credits, error: passLedgerErr,
    })
  }

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
    // the pass is active and its credits landed, and the payment row means a
    // retry can't re-run this. But the buyer's test STAYS LOCKED until the
    // entitlement is backfilled, so this has to page someone rather than
    // vanish into a serverless log.
    await raiseAlert({
      severity: 'critical',
      title: 'Exam pass purchased but access not granted',
      message:
        `The pass was paid for and its credits were granted, but writing the study_entitlements ` +
        `row failed — the buyer's test is still locked. Backfill the entitlement for this ` +
        `student/test; the purchase itself is complete and must not be re-charged.`,
      dedupeKey: `study-entitlement-write-failed:${opts.paymentId}`,
      error: e,
      context: {
        studentId: opts.studentId,
        paymentId: opts.paymentId,
        test: passTerms.test,
        passId: passPlan.id,
        expiresAt: periodEnd.toISOString(),
      },
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
