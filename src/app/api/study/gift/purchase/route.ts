import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { chargeBillingKey } from '@/lib/portone-charge'
import { GIFT, generateGiftCode } from '@/lib/study/gifts'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/gift/purchase — buy a one-time 3-month Premium gift.
 *
 * A parent (any authenticated study user) charges ₩45,000 once against a
 * freshly issued billing key, and we mint a single redemption code they
 * hand to their student. NO subscription row is written for the
 * purchaser — a gift is not a plan; the value lands only when the
 * student redeems the code (POST /api/study/gift/redeem).
 *
 * Body: { billingKey } — issued by the PortOne browser overlay, same as
 * the subscribe / pass flows. Web only (native clients hide the CTA per
 * Apple's anti-steering rules).
 *
 * Idempotency: paymentId is epoch-namespaced per attempt; PortOne dedups
 * on paymentId server-side. The code row is written only after a
 * successful charge, in the same request. On a unique-code collision we
 * retry a couple times with a fresh code before failing.
 */

export const dynamic = 'force-dynamic'

const MAX_CODE_ATTEMPTS = 3

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  // Real-money endpoint: one charge per 15s per user. Absorbs double-taps
  // and retry loops before they reach the card.
  const blocked = enforceRateLimit(
    `gift-purchase:user:${user.id}`,
    { windowMs: 15 * 1000, max: 1 },
  )
  if (blocked) return blocked

  let body: { billingKey?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const billingKey = body.billingKey
  if (!billingKey || typeof billingKey !== 'string') {
    return NextResponse.json({ error: 'missing billingKey' }, { status: 400 })
  }

  const paymentId = `study-gift-${user.id}-${Date.now()}`
  const result = await chargeBillingKey({
    billingKey,
    paymentId,
    amount: GIFT.priceWon,
    orderName: GIFT.orderName,
    customerId: user.id,
    customData: {
      kind: 'study_gift',
      gift: GIFT.id,
      purchaser_id: user.id,
    },
  })
  if (!result.ok) {
    return NextResponse.json(
      { error: 'charge failed', code: result.code, message: result.message },
      { status: 402 },
    )
  }

  // Success — mint the redemption code. Retry on the (astronomically
  // unlikely) unique-code collision so a random clash never loses the
  // charge. paid_amount_cents records what the parent paid, in minor
  // units, consistent with study_subscriptions.price_cents.
  let lastError: unknown = null
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateGiftCode()
    const { error: insertError } = await supabaseAdmin
      .from('study_gift_codes')
      .insert({
        code,
        purchaser_id: user.id,
        months: GIFT.months,
        credits: GIFT.credits,
        status: 'unredeemed',
        paid_amount_cents: GIFT.priceWon * 100,
        payment_id: paymentId,
      })
    if (!insertError) {
      return NextResponse.json({ success: true, code, paymentId })
    }
    // 23505 = unique_violation (code clash) — retry with a fresh code.
    // Any other error is a real write failure: stop and reconcile.
    lastError = insertError
    const pgCode = (insertError as { code?: string }).code
    if (pgCode !== '23505') break
  }

  console.error('[study/gift/purchase] charge ok but code write failed', {
    purchaserId: user.id, paymentId, error: lastError,
  })
  return NextResponse.json({
    error: 'charge ok but gift code write failed; support will reconcile',
    paymentId,
  }, { status: 500 })
}
