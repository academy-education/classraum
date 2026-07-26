import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyCronAuth } from '@/lib/cron-auth'
import { chargeBillingKey } from '@/lib/portone-charge'
import { recordSubscriptionPayment } from '@/lib/study/record-subscription-payment'
import { resolvePlan, STUDY_PLANS, GRANT_INTERVAL_DAYS, isPassPlan } from '@/lib/study/plans'
import { notifyStudent } from '@/lib/study/notify'
import { recordHeartbeat } from '@/lib/ops/heartbeat'
import { raiseAlert } from '@/lib/ops/alert'

const SUB_LINK = '/mobile/study/subscription'

/** Dunning: a failed charge usually means an expired/blocked card the
 *  student doesn't know about. A prompt to re-enter it recovers a large
 *  share of would-be churn. Fired on the drop to past_due and on expiry. */
async function notifyPaymentFailed(studentId: string) {
  await notifyStudent({
    studentId,
    kind: 'study_payment_failed',
    title: '결제에 실패했어요',
    message: '카드 결제가 처리되지 않았어요. 학습 구독을 유지하려면 결제 수단을 업데이트해 주세요.',
    link: SUB_LINK,
    push: true,
  })
}
async function notifySubscriptionExpired(studentId: string) {
  await notifyStudent({
    studentId,
    kind: 'study_subscription_expired',
    title: '구독이 만료됐어요',
    message: '결제가 계속 실패해 구독이 만료됐어요. 언제든 다시 시작할 수 있어요 — 크레딧은 그대로 남아 있어요.',
    link: SUB_LINK,
    push: true,
  })
}

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

interface RunSummary {
  cancelled: number
  charged: number
  granted: number
  failed: number
  expired: number
  skipped: number
  errors: string[]
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const summary: RunSummary = { cancelled: 0, charged: 0, granted: 0, failed: 0, expired: 0, skipped: 0, errors: [] }

  // Heartbeat sits inside the auth guard — a 401'd request never ran the
  // job, so letting it report would mask a dead cron to the watchdog.
  //
  // NOT withHeartbeat: that helper only knows "threw / didn't throw", and
  // every DB write here resolves with { error } rather than throwing. A
  // run where the renewal update failed did NOT do its work, so it has to
  // report ok:false — otherwise the watchdog shows a green cron over
  // subscriptions that were charged but never advanced.
  const started = Date.now()
  try {
    await runBillingCycle(now, summary)
  } catch (err) {
    await recordHeartbeat(
      'study-billing',
      { ok: false, detail: { error: err instanceof Error ? err.message : String(err) } },
      Date.now() - started,
    )
    throw err
  }
  // Counters only. `errors` is an unbounded string list — the count is
  // enough for the health view; the full list stays in the response.
  const { errors, ...counts } = summary
  const ok = errors.length === 0
  await recordHeartbeat(
    'study-billing',
    { ok, detail: { ...counts, errorCount: errors.length, errors: errors.slice(0, 10) } },
    Date.now() - started,
  )

  return NextResponse.json({ ok, summary, ranAt: now.toISOString() })
}

async function runBillingCycle(now: Date, summary: RunSummary) {
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
      if (await markExpired(row, now, summary)) summary.expired++
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
        if (await markExpired(row, now, summary)) summary.expired++
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
    // Order matters for idempotency: the subscription update is what moves
    // next_grant_at forward, so if IT fails the row stays due and the next
    // run retries — no double grant. If the update lands but the ledger
    // insert fails the balance is still correct (grant_credits_remaining is
    // the source of truth); only the audit line is missing.
    const { error: subErr } = await supabaseAdmin
      .from('study_subscriptions')
      .update({
        grant_credits_remaining: plan.monthlyCredits,
        next_grant_at: nextGrant.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', row.id)
    if (subErr) {
      summary.errors.push(`grant ${row.id}: ${subErr.message}`)
      await raiseAlert({
        severity: 'warning',
        title: 'Monthly credit grant not applied',
        message:
          `The monthly credit refresh for subscription ${row.id} could not be written. ` +
          'The subscriber is a month short of credits until the next run succeeds.',
        dedupeKey: `study-grant-refresh-failed:${row.id}`,
        error: subErr,
        context: { subscriptionId: row.id, studentId: row.student_id, plan: plan.id },
      })
      continue
    }
    const { error: ledgerErr } = await supabaseAdmin.from('study_credit_ledger').insert({
      student_id: row.student_id,
      delta: plan.monthlyCredits,
      bucket: 'grant',
      kind: 'grant',
      note: `monthly grant refresh ${plan.id}`,
    })
    if (ledgerErr) {
      // Balance is right, audit trail isn't. Worth knowing, not worth
      // withholding the grant we already applied.
      summary.errors.push(`grant-ledger ${row.id}: ${ledgerErr.message}`)
      await raiseAlert({
        severity: 'warning',
        title: 'Credit-grant ledger row missing',
        message:
          `The monthly grant for subscription ${row.id} was applied but its ledger row failed to insert. ` +
          'The balance is correct; the audit trail is incomplete.',
        dedupeKey: `study-grant-ledger-failed:${row.id}`,
        error: ledgerErr,
        context: { subscriptionId: row.id, studentId: row.student_id, plan: plan.id },
      })
    }
    summary.granted = (summary.granted ?? 0) + 1
  }
}

/**
 * Flip a subscription to `expired` and, only if that write actually
 * landed, tell the student. Returns true when the transition was
 * persisted. Notifying off an unverified write told students their
 * subscription had expired while the DB still said past_due — the
 * support ticket that follows is unanswerable.
 */
async function markExpired(
  row: SubscriptionRow,
  now: Date,
  summary: RunSummary,
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('study_subscriptions')
    .update({ status: 'expired', updated_at: now.toISOString() })
    .eq('id', row.id)
  if (error) {
    summary.errors.push(`expire ${row.id}: ${error.message}`)
    await raiseAlert({
      severity: 'warning',
      title: 'Subscription expiry not recorded',
      message:
        `Subscription ${row.id} should have flipped to expired after repeated payment failures ` +
        'but the write failed. It is still past_due and no expiry notice was sent.',
      dedupeKey: `study-expire-failed:${row.id}`,
      error,
      context: { subscriptionId: row.id, studentId: row.student_id },
    })
    return false
  }
  await notifySubscriptionExpired(row.student_id)
  return true
}

async function chargeAndAdvance(
  row: SubscriptionRow,
  now: Date,
  summary: RunSummary
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
    const { error: subErr } = await supabaseAdmin
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

    // Money has already left the student's card at this point. If the
    // entitlement writes didn't land, this is NOT a clean charge: the
    // period never advanced and the monthly credits never refreshed, so
    // the subscriber paid for a month they can't use. Page a human.
    if (subErr) {
      summary.errors.push(`renew-advance ${row.id}: ${subErr.message}`)
      await raiseAlert({
        severity: 'critical',
        title: 'Renewal charged but subscription not advanced',
        message:
          `Payment ${paymentId} succeeded at PortOne for ₩${effectivePlan.priceWon}, but the ` +
          `study_subscriptions update for ${row.id} failed. The period was not extended and the ` +
          'monthly credit grant was not refreshed — the student paid and got nothing. ' +
          'Fix the row by hand or refund the charge.',
        dedupeKey: `study-renewal-advance-failed:${row.id}`,
        error: subErr,
        context: {
          subscriptionId: row.id,
          studentId: row.student_id,
          paymentId,
          plan: effectivePlan.id,
          amountWon: effectivePlan.priceWon,
        },
      })
      // Still record the payment — an unrecorded charge is invisible to
      // the admin payments view and therefore un-refundable, which is
      // strictly worse than a charge attached to a stale subscription.
      await recordSubscriptionPayment({ paymentId, studentId: row.student_id, amountWon: effectivePlan.priceWon })
      summary.failed++
      return
    }

    const { error: ledgerErr } = await supabaseAdmin.from('study_credit_ledger').insert({
      student_id: row.student_id,
      delta: effectivePlan.monthlyCredits,
      bucket: 'grant',
      kind: 'grant',
      note: `renewal ${effectivePlan.id} (${paymentId})`,
    })
    if (ledgerErr) {
      // The grant itself is on the subscription row (already written), so
      // the student has their credits; only the audit line is missing.
      summary.errors.push(`renew-ledger ${row.id}: ${ledgerErr.message}`)
      await raiseAlert({
        severity: 'warning',
        title: 'Renewal credit-ledger row missing',
        message:
          `Renewal ${paymentId} advanced subscription ${row.id} and refreshed its credits, but the ` +
          'ledger row failed to insert. Balance is correct; the audit trail is incomplete.',
        dedupeKey: `study-renewal-ledger-failed:${row.id}`,
        error: ledgerErr,
        context: { subscriptionId: row.id, studentId: row.student_id, paymentId },
      })
    }
    // Record the charge so it appears in the admin payments view / is refundable.
    await recordSubscriptionPayment({ paymentId, studentId: row.student_id, amountWon: effectivePlan.priceWon })
    summary.charged++
  } else {
    const { error: pastDueErr } = await supabaseAdmin
      .from('study_subscriptions')
      .update({
        status: 'past_due',
        last_payment_attempt_at: now.toISOString(),
        last_payment_failure: (result.message ?? 'unknown').slice(0, 500),
        updated_at: now.toISOString(),
      })
      .eq('id', row.id)
    if (pastDueErr) {
      // Dunning state didn't stick: last_payment_attempt_at is unchanged,
      // so the retry sweep will pick this row up again on the next run
      // (safe — the paymentId is period-namespaced and PortOne dedupes).
      // Don't send the dunning notice off a write that didn't happen.
      summary.errors.push(`past-due ${row.id}: ${pastDueErr.message}`)
      await raiseAlert({
        severity: 'warning',
        title: 'Dunning state not recorded',
        message:
          `The charge for subscription ${row.id} failed and the past_due transition could not be ` +
          'written. No dunning notice was sent and the retry clock did not advance.',
        dedupeKey: `study-past-due-failed:${row.id}`,
        error: pastDueErr,
        context: { subscriptionId: row.id, studentId: row.student_id, paymentId },
      })
    } else {
      // Dunning notice — tell the student their card failed and link them
      // to update it. This is the single biggest involuntary-churn recovery
      // lever; without it a dead card silently expires the subscription.
      await notifyPaymentFailed(row.student_id)
    }
    summary.failed++
    if (result.code) summary.errors.push(`${row.id}: ${result.code} ${result.message ?? ''}`)
  }
}
