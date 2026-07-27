import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'
import { REFERRAL_SIGNUP_CREDITS, normalizeReferralCode } from '@/lib/study/referral'
import { FREE_CREDITS } from '@/lib/study/plans'
import { trackEvent } from '@/lib/study/analytics'
import { raiseAlert } from '@/lib/ops/alert'

/**
 * POST /api/study/referral/redeem — a new student redeems a friend's
 * referral code. BOTH sides get +REFERRAL_SIGNUP_CREDITS purchased test
 * credits, exactly once.
 *
 * Body: { code }.
 *
 * Idempotency / race-safety (this endpoint moves economic value):
 *   - A caller who already has a redemption row (referee_id = me) is
 *     rejected 409 before any reward. This is the double-call guard.
 *   - The redemption row is inserted FIRST; UNIQUE(referee_id) means two
 *     concurrent redeems collapse to one winner (the loser hits 23505 →
 *     409). Only the request that actually inserts the row goes on to
 *     grant credits, so a referee can never be rewarded twice.
 *   - Rewards are written only AFTER the redemption row is committed.
 *
 * Credits are added to the purchased bucket via the same atomic RPC the
 * pack-purchase route uses. The RPC updates study_subscriptions by
 * student_id and silently no-ops when the row is missing, so BOTH sides are
 * provisioned a free row first. `rewarded: true` is written only after both
 * grants are verified; if either fails the row stays rewarded=false and a
 * critical alert carries what's needed to pay it out by hand (the referee
 * can never re-run this endpoint). `creditsAdded` reflects what the CALLER
 * (referee) received.
 */

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(
    `referral-redeem:user:${user.id}`,
    { windowMs: 60 * 1000, max: 10 },
  )
  if (blocked) return blocked

  let body: { code?: string } = {}
  try { body = await req.json() } catch { /* handled below */ }
  const code = typeof body.code === 'string' ? normalizeReferralCode(body.code) : ''
  if (!code) {
    return NextResponse.json({ error: 'missing code', code: 'missing_code' }, { status: 400 })
  }

  // Already referred? Reject before touching any credits.
  const { data: mine } = await dbAdmin
    .from('study_referral_redemptions')
    .select('id')
    .eq('referee_id', user.id)
    .maybeSingle()
  if (mine) {
    return NextResponse.json({ error: 'already redeemed', code: 'already_redeemed' }, { status: 409 })
  }

  // Resolve the code to its owner.
  const { data: owner } = await dbAdmin
    .from('study_referral_codes')
    .select('student_id')
    .eq('code', code)
    .maybeSingle()
  if (!owner) {
    return NextResponse.json({ error: 'unknown code', code: 'unknown_code' }, { status: 404 })
  }
  const referrerId = owner.student_id as string

  if (referrerId === user.id) {
    return NextResponse.json({ error: 'cannot redeem your own code', code: 'self_referral' }, { status: 400 })
  }

  // Insert the redemption row FIRST — this is the race guard. If a
  // concurrent request already inserted for this referee, the unique
  // constraint on referee_id rejects us and we treat it as already
  // redeemed (no reward).
  const { data: inserted, error: insertErr } = await dbAdmin
    .from('study_referral_redemptions')
    .insert({ referrer_id: referrerId, referee_id: user.id, code, rewarded: false })
    .select('id')
    .single()
  if (insertErr || !inserted) {
    if (isUniqueViolation(insertErr)) {
      return NextResponse.json({ error: 'already redeemed', code: 'already_redeemed' }, { status: 409 })
    }
    console.error('[study/referral/redeem] redemption insert failed', {
      refereeId: user.id, referrerId, error: insertErr,
    })
    return NextResponse.json({ error: 'could not redeem code' }, { status: 500 })
  }

  // We own the (only) redemption row now — grant both sides exactly once.
  // Neither side is guaranteed a study_subscriptions row: a referee
  // redeeming straight from signup hasn't hit SubscriptionGate yet, and a
  // referrer can own a code (minted by the referral GET) without ever having
  // subscribed. The credit RPC keys on student_id and silently no-ops when
  // the row is missing, so provision the free row for BOTH sides first —
  // otherwise the referrer's reward never lands.
  await ensureFreeSubscription(user.id)
  await ensureFreeSubscription(referrerId)
  const referee = await grantReferralCredits(user.id, inserted.id)
  const referrer = await grantReferralCredits(referrerId, inserted.id)

  // `rewarded: true` is the permanent record that both sides were paid, and
  // this redemption can never be retried (the referee is 409'd from here on).
  // So only write it when the credits actually landed — otherwise alert with
  // everything needed to pay them by hand.
  if (referee.ok && referrer.ok) {
    const { error: rewardedErr } = await dbAdmin
      .from('study_referral_redemptions')
      .update({ rewarded: true })
      .eq('id', inserted.id)
    if (rewardedErr) {
      await raiseAlert({
        severity: 'warning',
        title: 'Referral rewarded flag not written',
        message:
          'Both referral rewards were granted but the redemption row still reads rewarded=false. ' +
          'The credits ARE in both accounts — do not re-grant; fix the flag so stats are correct.',
        dedupeKey: `referral-rewarded-flag-failed:${inserted.id}`,
        error: rewardedErr,
        context: { redemptionId: inserted.id, refereeId: user.id, referrerId },
      })
    }
  } else {
    await raiseAlert({
      severity: 'critical',
      title: 'Referral credits were not granted',
      message:
        `A referral was redeemed but ${!referee.ok && !referrer.ok ? 'neither side' : !referee.ok ? 'the referee' : 'the referrer'} ` +
        `received the ${REFERRAL_SIGNUP_CREDITS} promised credits. The redemption row is left ` +
        `rewarded=false and cannot be retried by the user — grant the missing credits manually.`,
      dedupeKey: `referral-grant-failed:${inserted.id}`,
      error: referee.error ?? referrer.error,
      context: {
        redemptionId: inserted.id,
        refereeId: user.id,
        referrerId,
        refereeGranted: referee.ok,
        referrerGranted: referrer.ok,
        credits: REFERRAL_SIGNUP_CREDITS,
      },
    })
  }

  const refereeAdded = referee.credits
  void trackEvent(user.id, 'referral_redeemed', { referrerId, creditsAdded: refereeAdded })
  // Referrals only grant credits. Friendships are created exclusively
  // through the explicit friends system — no auto-friending here.

  return NextResponse.json({
    success: true,
    creditsAdded: refereeAdded,
  })
}

/**
 * Provision the free study_subscriptions row for a side that doesn't have
 * one yet (referee OR referrer). Mirrors the SubscriptionGate first-visit insert
 * (status 'free', FREE_CREDITS one-time grant); the gate later sees the
 * existing row and lets them straight through. A concurrent gate insert
 * losing the race is fine — the unique violation is swallowed.
 */
async function ensureFreeSubscription(studentId: string): Promise<void> {
  const { data: existing } = await dbAdmin
    .from('study_subscriptions')
    .select('student_id')
    .eq('student_id', studentId)
    .maybeSingle()
  if (existing) return

  const { error } = await dbAdmin
    .from('study_subscriptions')
    .insert({
      student_id: studentId,
      status: 'free',
      plan: 'free_v1',
      grant_credits_remaining: FREE_CREDITS,
    })
  if (error && !isUniqueViolation(error)) {
    // Not fatal here: grantReferralCredits re-reads the row and reports a
    // hard failure (which alerts) if it still isn't there.
    console.error('[study/referral/redeem] free-row provision failed', { studentId, error })
  }
}

interface GrantResult {
  /** true only when the credits are provably in the student's balance. */
  ok: boolean
  /** Credits actually granted (0 on any failure). */
  credits: number
  error?: unknown
}

/**
 * Add REFERRAL_SIGNUP_CREDITS to a student's purchased bucket and write a
 * ledger row. Requires a subscription row for the RPC to update (it keys on
 * student_id and would otherwise silently no-op) — callers must have run
 * ensureFreeSubscription() first; a missing row here is a real failure, not
 * a benign skip.
 */
async function grantReferralCredits(studentId: string, sourceId: string): Promise<GrantResult> {
  const { data: sub, error: subErr } = await dbAdmin
    .from('study_subscriptions')
    .select('student_id')
    .eq('student_id', studentId)
    .maybeSingle()
  if (subErr || !sub) {
    return { ok: false, credits: 0, error: subErr ?? new Error('no study_subscriptions row to credit') }
  }

  const { error: rpcErr } = await dbAdmin.rpc('increment_study_purchased_credits', {
    p_student_id: studentId,
    p_delta: REFERRAL_SIGNUP_CREDITS,
  })
  if (rpcErr) return { ok: false, credits: 0, error: rpcErr }

  // The balance moved — the grant succeeded. A failed ledger row is an
  // audit-trail gap, not a lost reward, so it must NOT be reported as a
  // failed grant (that would invite a manual double-grant).
  const { error: ledgerErr } = await dbAdmin.from('study_credit_ledger').insert({
    student_id: studentId,
    delta: REFERRAL_SIGNUP_CREDITS,
    bucket: 'purchased',
    kind: 'referral',
    source_id: sourceId,
    note: 'referral reward',
  })
  if (ledgerErr) {
    await raiseAlert({
      severity: 'warning',
      title: 'Referral credit ledger row missing',
      message:
        `${REFERRAL_SIGNUP_CREDITS} referral credits were added to a balance but the ledger ` +
        `insert failed, so the balance no longer reconciles against the ledger. Do not re-grant.`,
      dedupeKey: `referral-ledger-failed:${sourceId}:${studentId}`,
      error: ledgerErr,
      context: { studentId, redemptionId: sourceId, credits: REFERRAL_SIGNUP_CREDITS },
    })
  }
  return { ok: true, credits: REFERRAL_SIGNUP_CREDITS }
}

function isUniqueViolation(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'code' in error &&
    (error as { code?: string }).code === '23505'
}
