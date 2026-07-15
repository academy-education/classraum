import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'
import { REFERRAL_SIGNUP_CREDITS, normalizeReferralCode } from '@/lib/study/referral'
import { trackEvent } from '@/lib/study/analytics'
import { ensureAcceptedFriendship } from '@/lib/study/friends'

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
 * student_id, so a side with no subscription row yet is a silent no-op
 * there — we therefore check each side has a row and only reward (and
 * ledger) the sides that do. `creditsAdded` reflects what the CALLER
 * (referee) received (0 if they have no subscription row yet).
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
  const { data: mine } = await supabaseAdmin
    .from('study_referral_redemptions')
    .select('id')
    .eq('referee_id', user.id)
    .maybeSingle()
  if (mine) {
    return NextResponse.json({ error: 'already redeemed', code: 'already_redeemed' }, { status: 409 })
  }

  // Resolve the code to its owner.
  const { data: owner } = await supabaseAdmin
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
  const { data: inserted, error: insertErr } = await supabaseAdmin
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
  const refereeAdded = await grantReferralCredits(user.id, inserted.id)
  await grantReferralCredits(referrerId, inserted.id)

  await supabaseAdmin
    .from('study_referral_redemptions')
    .update({ rewarded: true })
    .eq('id', inserted.id)

  void trackEvent(user.id, 'referral_redeemed', { referrerId, creditsAdded: refereeAdded })
  // A referral is a real social connection — auto-add the pair as friends
  // so they land on each other's friends leaderboard immediately.
  void ensureAcceptedFriendship(user.id, referrerId)

  return NextResponse.json({
    success: true,
    creditsAdded: refereeAdded,
  })
}

/**
 * Add REFERRAL_SIGNUP_CREDITS to a student's purchased bucket and write a
 * ledger row — but only if they have a subscription row for the RPC to
 * update (it keys on student_id and would otherwise silently no-op).
 * Returns the credits actually granted (0 when there's no row yet).
 */
async function grantReferralCredits(studentId: string, sourceId: string): Promise<number> {
  const { data: sub } = await supabaseAdmin
    .from('study_subscriptions')
    .select('student_id')
    .eq('student_id', studentId)
    .maybeSingle()
  if (!sub) return 0

  const { error: rpcErr } = await supabaseAdmin.rpc('increment_study_purchased_credits', {
    p_student_id: studentId,
    p_delta: REFERRAL_SIGNUP_CREDITS,
  })
  if (rpcErr) {
    console.error('[study/referral/redeem] credit grant failed', { studentId, error: rpcErr })
    return 0
  }

  await supabaseAdmin.from('study_credit_ledger').insert({
    student_id: studentId,
    delta: REFERRAL_SIGNUP_CREDITS,
    bucket: 'purchased',
    kind: 'referral',
    source_id: sourceId,
    note: 'referral reward',
  })
  return REFERRAL_SIGNUP_CREDITS
}

function isUniqueViolation(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'code' in error &&
    (error as { code?: string }).code === '23505'
}
