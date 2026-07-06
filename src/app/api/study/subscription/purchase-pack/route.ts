import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { chargeBillingKey } from '@/lib/portone-charge'
import { CREDIT_PACK, resolvePlan } from '@/lib/study/plans'

/**
 * POST /api/study/subscription/purchase-pack — one-time charge for a
 * test-credit top-up pack. Premium members only (product decision:
 * packs are a Premium perk). Charges the stored billing key, then
 * adds the credits to the purchased bucket (which never expires and
 * is consumed only after the monthly grant runs out).
 *
 * Idempotency: paymentId is epoch-namespaced per attempt; PortOne
 * dedups on paymentId server-side. The credit add happens only after
 * a successful charge, in the same request.
 */

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: sub } = await supabaseAdmin
    .from('study_subscriptions')
    .select('status, plan, portone_subscription_id, purchased_credits_remaining')
    .eq('student_id', user.id)
    .maybeSingle()
  if (!sub || sub.status !== 'active') {
    return NextResponse.json({ error: 'active subscription required' }, { status: 403 })
  }
  if (resolvePlan(sub.plan).tier !== 'premium') {
    return NextResponse.json({ error: 'premium required', code: 'premium_required' }, { status: 403 })
  }
  if (!sub.portone_subscription_id) {
    return NextResponse.json({ error: 'no payment method on file' }, { status: 402 })
  }

  const paymentId = `study-pack-${user.id}-${Date.now()}`
  const result = await chargeBillingKey({
    billingKey: sub.portone_subscription_id,
    paymentId,
    amount: CREDIT_PACK.priceWon,
    orderName: CREDIT_PACK.orderName,
    customerId: user.id,
    customData: {
      kind: 'study_credit_pack',
      pack: CREDIT_PACK.id,
      student_id: user.id,
    },
  })
  if (!result.ok) {
    return NextResponse.json(
      { error: 'charge failed', code: result.code, message: result.message },
      { status: 402 },
    )
  }

  const { error: updateErr } = await supabaseAdmin
    .from('study_subscriptions')
    .update({
      purchased_credits_remaining: (sub.purchased_credits_remaining ?? 0) + CREDIT_PACK.credits,
      updated_at: new Date().toISOString(),
    })
    .eq('student_id', user.id)
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
    delta: CREDIT_PACK.credits,
    bucket: 'purchased',
    kind: 'purchase',
    note: `${CREDIT_PACK.id} (${paymentId})`,
  })

  return NextResponse.json({
    success: true,
    creditsAdded: CREDIT_PACK.credits,
    paymentId,
  })
}
