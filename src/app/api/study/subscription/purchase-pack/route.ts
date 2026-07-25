import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { chargeBillingKey, verifyOneTimePayment } from '@/lib/portone-charge'
import { resolvePack } from '@/lib/study/plans'
import { requireStudyUser } from '@/lib/study/auth'
import { grantCreditPack } from '@/lib/study/grant-purchase'

/**
 * POST /api/study/subscription/purchase-pack — one-time charge for a
 * test-credit top-up pack. Open to ANY authenticated study user — free,
 * General, Premium, or lapsed. Credits are status-agnostic (the DB
 * credit RPC only checks that credits exist, not the plan), so a free
 * user who buys a pack can spend it immediately.
 *
 * Body: { packId?, paymentId? }. packId is 5 / 15 / 40 / 3-micro; defaults to
 * the 5-pack.
 *
 * Payment method: a credit pack is a ONE-OFF purchase, so it ALWAYS goes
 * through a fresh one-time checkout window (the client requests a payment,
 * the buyer enters a card, and we verify the resulting paymentId here). We
 * deliberately do NOT reuse the subscriber's stored subscription card — that
 * billing key is reserved for subscription renewals only. A buyer therefore
 * gets prompted for a card on every top-up, and can use a different card
 * from the one on their subscription.
 *
 * Idempotency: paymentId is epoch-namespaced per attempt; PortOne
 * dedups on paymentId server-side. The credit add happens only after
 * a successful charge, in the same request.
 */

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  let body: { packId?: string; billingKey?: string; paymentId?: string } = {}
  try { body = await req.json() } catch { /* default pack */ }
  const pack = resolvePack(body.packId)

  // A pack is paid via a one-time checkout window. We NEVER charge the
  // subscription's stored card here (that key is for renewals only) — so
  // without a verified one-time paymentId (or an explicitly-provided fresh
  // key), we answer `no_billing_key` and the client opens the card window.
  const providedPaymentId = typeof body.paymentId === 'string' && body.paymentId ? body.paymentId : null
  const providedKey = typeof body.billingKey === 'string' && body.billingKey ? body.billingKey : null
  const billingKey = providedKey

  let paymentId: string
  // One-off pack purchases never persist a card — each top-up prompts again.
  const billingKeyToPersist: string | null = null
  if (providedPaymentId) {
    const v = await verifyOneTimePayment({
      paymentId: providedPaymentId,
      expectedAmount: pack.priceWon,
      expectedKind: 'study_credit_pack',
    })
    if (!v.ok) {
      return NextResponse.json({ error: 'payment verification failed', message: v.message }, { status: 402 })
    }
    // The paid payment must be for THIS pack and THIS buyer — customData
    // is written at request time and immutable at PortOne.
    if (v.customData?.pack !== pack.id || v.customData?.student_id !== user.id) {
      return NextResponse.json({ error: 'payment does not match this purchase' }, { status: 402 })
    }
    paymentId = providedPaymentId
  } else {
    if (!billingKey) {
      return NextResponse.json({ error: 'no payment method on file', code: 'no_billing_key' }, { status: 402 })
    }
    // Real-money charge: one per 15s per student, absorbing double-taps
    // before they reach the card. Only the billing-key branch is
    // limited — the card-less probe above must stay free (it's the
    // first POST of every one-time checkout), and the paymentId
    // redemption path is already exactly-once via the study_payments
    // PK, so limiting it could only strand a paid buyer with a 429.
    const blocked = enforceRateLimit(
      `purchase-pack:user:${user.id}`,
      { windowMs: 15 * 1000, max: 1 },
    )
    if (blocked) return blocked
    paymentId = `study-pack-${user.id}-${Date.now()}`
    const result = await chargeBillingKey({
      billingKey,
      paymentId,
      amount: pack.priceWon,
      orderName: pack.orderName,
      customerId: user.id,
      customData: {
        kind: 'study_credit_pack',
        pack: pack.id,
        student_id: user.id,
      },
    })
    if (!result.ok) {
      return NextResponse.json(
        { error: 'charge failed', code: result.code, message: result.message },
        { status: 402 },
      )
    }
    // A pack purchase never stores the card — the next top-up prompts again.
  }

  // Record + grant via the shared helper — the SAME code the webhook
  // backstop runs, so a lost client return can't diverge from this path.
  const outcome = await grantCreditPack({
    studentId: user.id,
    packId: pack.id,
    paymentId,
    billingKeyToPersist,
  })
  if (outcome.status === 'already_processed') {
    return NextResponse.json({ error: 'payment already processed', code: 'already_processed' }, { status: 409 })
  }
  if (outcome.status === 'error') {
    return NextResponse.json({ error: outcome.message, paymentId }, { status: outcome.httpStatus })
  }
  return NextResponse.json({
    success: true,
    creditsAdded: outcome.creditsAdded,
    paymentId,
  })
}
