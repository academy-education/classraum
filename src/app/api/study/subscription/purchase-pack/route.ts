import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { chargeBillingKey } from '@/lib/portone-charge'
import { resolvePack } from '@/lib/study/plans'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/subscription/purchase-pack — one-time charge for a
 * test-credit top-up pack. Available to any active OR trial subscriber
 * (General included — they exhaust their 8 monthly credits fast). Body
 * takes an optional `packId` (5 / 15 / 40); defaults to the 5-pack.
 * Charges the stored billing key, then adds the credits to the
 * purchased bucket (which never expires and is consumed only after the
 * monthly grant runs out).
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

  // Real-money endpoint: one charge per 15s per student. Absorbs
  // double-taps and retry loops before they reach the card.
  const blocked = enforceRateLimit(
    `purchase-pack:user:${user.id}`,
    { windowMs: 15 * 1000, max: 1 },
  )
  if (blocked) return blocked

  let body: { packId?: string } = {}
  try { body = await req.json() } catch { /* default pack */ }
  const pack = resolvePack(body.packId)

  const { data: sub } = await supabaseAdmin
    .from('study_subscriptions')
    .select('status, plan, portone_subscription_id, purchased_credits_remaining')
    .eq('student_id', user.id)
    .maybeSingle()
  // Any paying/trialing member can top up — no premium gate. Free rows
  // (status 'free') still can't, since they have no billing key anyway.
  if (!sub || (sub.status !== 'active' && sub.status !== 'trial')) {
    return NextResponse.json({ error: 'active subscription required' }, { status: 403 })
  }
  if (!sub.portone_subscription_id) {
    return NextResponse.json({ error: 'no payment method on file', code: 'no_billing_key' }, { status: 402 })
  }

  const paymentId = `study-pack-${user.id}-${Date.now()}`
  const result = await chargeBillingKey({
    billingKey: sub.portone_subscription_id,
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

  // Atomic increment via RPC — a read-modify-write here spanned the
  // card charge, so a concurrent purchase or credit consumption could
  // silently lose paid credits.
  const { error: updateErr } = await supabaseAdmin.rpc('increment_study_purchased_credits', {
    p_student_id: user.id,
    p_delta: pack.credits,
  })
  if (updateErr) {
    // Charge succeeded but the credit write failed — log loudly for
    // manual reconciliation rather than double-charging on retry.
    console.error('[study/purchase-pack] charge ok but credit write failed', {
      studentId: user.id, paymentId, error: updateErr,
    })
    return NextResponse.json({
      error: 'charge ok but credit write failed; support will reconcile',
      paymentId,
    }, { status: 500 })
  }
  await supabaseAdmin.from('study_credit_ledger').insert({
    student_id: user.id,
    delta: pack.credits,
    bucket: 'purchased',
    kind: 'purchase',
    note: `${pack.id} (${paymentId})`,
  })

  return NextResponse.json({
    success: true,
    creditsAdded: pack.credits,
    paymentId,
  })
}
