import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { isPassPlan } from '@/lib/study/plans'
import { normalizeGiftCode } from '@/lib/study/gifts'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/gift/redeem — redeem a gift code for Premium.
 *
 * The student enters the code their parent gave them. We grant Premium
 * WITHOUT a card, modelled exactly like the seasonal exam pass:
 * status='active', plan='premium_v1', cancel_at_period_end=true,
 * current_period_end = now + months*30 days, next_grant_at=null. The
 * gift credits go to the purchased bucket via the atomic RPC. (The DB
 * use_study_credit RPC is status-agnostic and premium feature gates
 * check status==='active', so a card-less premium row works.)
 *
 * Body: { code }. Guards:
 *   - unknown code            → 404 not_found
 *   - already redeemed / race → 409 already_redeemed
 *   - redeeming your own gift → 403 self_gift
 *   - already on a live recurring plan → 409 already_subscribed
 *     (we refuse to clobber a paying subscriber's renewal)
 *
 * Double-redeem is prevented by an atomic conditional UPDATE
 * (... WHERE status='unredeemed' RETURNING): the first request wins the
 * row, a concurrent second sees 0 rows updated and gets 409.
 */

export const dynamic = 'force-dynamic'

const DAYS_PER_MONTH = 30

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  // Codes are guessable-resistant, but still rate-limit redemption to
  // blunt brute-force enumeration: a few tries per 10s per user.
  const blocked = enforceRateLimit(
    `gift-redeem:user:${user.id}`,
    { windowMs: 10 * 1000, max: 5 },
  )
  if (blocked) return blocked

  let body: { code?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const raw = typeof body.code === 'string' ? body.code : ''
  const code = normalizeGiftCode(raw)
  if (!code) {
    return NextResponse.json({ error: 'missing code', code: 'missing_code' }, { status: 400 })
  }

  // Case-insensitive lookup. Match on lower(code) so a code typed in any
  // case resolves (the mint stores uppercase, but be forgiving on input).
  const { data: gift, error: lookupError } = await supabaseAdmin
    .from('study_gift_codes')
    .select('id, purchaser_id, months, credits, status')
    .ilike('code', code)
    .maybeSingle()

  if (lookupError) {
    console.error('[study/gift/redeem] lookup failed', { userId: user.id, error: lookupError })
    return NextResponse.json({ error: 'lookup failed' }, { status: 500 })
  }
  if (!gift) {
    return NextResponse.json({ error: 'code not found', code: 'not_found' }, { status: 404 })
  }
  if (gift.status !== 'unredeemed') {
    return NextResponse.json({ error: 'code already redeemed', code: 'already_redeemed' }, { status: 409 })
  }
  // A parent shouldn't redeem their own gift — it's meant for the student.
  if (gift.purchaser_id === user.id) {
    return NextResponse.json({ error: 'cannot redeem your own gift', code: 'self_gift' }, { status: 403 })
  }

  // Don't clobber a live recurring subscription. A row that is active on
  // a recurring paid plan (not itself a seasonal pass) already gets
  // Premium/credits — overwriting it with a gift window would drop the
  // renewal schedule. Passes and non-active rows are safe to overwrite.
  const { data: sub } = await supabaseAdmin
    .from('study_subscriptions')
    .select('status, plan')
    .eq('student_id', user.id)
    .maybeSingle()
  if (sub && sub.status === 'active' && !isPassPlan(sub.plan)) {
    return NextResponse.json({ error: 'already on an active plan', code: 'already_subscribed' }, { status: 409 })
  }

  // Atomically claim the code: only the request that flips it from
  // 'unredeemed' wins. A concurrent redeem sees 0 rows and 409s.
  const now = new Date()
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from('study_gift_codes')
    .update({ status: 'redeemed', redeemed_by: user.id, redeemed_at: now.toISOString() })
    .eq('id', gift.id)
    .eq('status', 'unredeemed')
    .select('id')

  if (claimError) {
    console.error('[study/gift/redeem] claim update failed', { userId: user.id, giftId: gift.id, error: claimError })
    return NextResponse.json({ error: 'redeem failed' }, { status: 500 })
  }
  if (!claimed || claimed.length === 0) {
    // Lost the race — someone redeemed it between our read and update.
    return NextResponse.json({ error: 'code already redeemed', code: 'already_redeemed' }, { status: 409 })
  }

  // Grant Premium for months*30 days. Mirror the pass: cancel_at_period_end
  // = true so the billing cron finalizes (never renews) it; next_grant_at
  // = null so the grant refresher never touches it. Gift credits go to the
  // purchased bucket via the RPC below, so grant_credits_remaining = 0.
  const months = gift.months
  const credits = gift.credits
  const periodEnd = new Date(now.getTime() + months * DAYS_PER_MONTH * 24 * 60 * 60 * 1000)
  const { error: upsertError } = await supabaseAdmin
    .from('study_subscriptions')
    .upsert({
      student_id: user.id,
      status: 'active',
      plan: 'premium_v1',
      pending_plan: null,
      price_cents: 0,
      currency: 'KRW',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_grant_at: null,
      cancel_at_period_end: true,
      // A gift grants no stored card — never charge this student.
      portone_subscription_id: null,
      last_payment_failure: null,
      grant_credits_remaining: 0,
      updated_at: now.toISOString(),
    }, { onConflict: 'student_id' })

  if (upsertError) {
    // Code is already claimed (marked redeemed) but Premium didn't land —
    // reconciliation, not a re-redeem. Log loud so support can repair.
    console.error('[study/gift/redeem] code claimed but premium grant failed', {
      userId: user.id, giftId: gift.id, error: upsertError,
    })
    return NextResponse.json({
      error: 'code redeemed but premium grant failed; support will reconcile',
      code: 'grant_failed',
    }, { status: 500 })
  }

  // Grant the gift credits atomically into the purchased bucket (never
  // clobbers an existing purchased balance).
  const { error: creditErr } = await supabaseAdmin.rpc('increment_study_purchased_credits', {
    p_student_id: user.id,
    p_delta: credits,
  })
  if (creditErr) {
    console.error('[study/gift/redeem] premium ok but credit grant failed', {
      userId: user.id, giftId: gift.id, error: creditErr,
    })
    return NextResponse.json({
      error: 'premium active but credit grant failed; support will reconcile',
      code: 'credit_failed',
    }, { status: 500 })
  }
  await supabaseAdmin.from('study_credit_ledger').insert({
    student_id: user.id,
    delta: credits,
    bucket: 'purchased',
    kind: 'purchase',
    note: `gift redeem ${gift.id}`,
  })

  return NextResponse.json({
    success: true,
    months,
    creditsAdded: credits,
    current_period_end: periodEnd.toISOString(),
  })
}
