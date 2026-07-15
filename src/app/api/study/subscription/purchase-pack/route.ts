import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { chargeBillingKey } from '@/lib/portone-charge'
import { resolvePack } from '@/lib/study/plans'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/subscription/purchase-pack — one-time charge for a
 * test-credit top-up pack. Open to ANY authenticated study user — free,
 * General, Premium, or lapsed. Credits are status-agnostic (the DB
 * credit RPC only checks that credits exist, not the plan), so a free
 * user who buys a pack can spend it immediately.
 *
 * Body: { packId?, billingKey? }. packId is 5 / 15 / 40 / 3-micro;
 * defaults to the 5-pack. billingKey is optional — a buyer with a stored
 * card omits it; a card-less buyer (free user) issues one via the PortOne
 * overlay client-side and passes it here, and we store it for reuse.
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

  let body: { packId?: string; billingKey?: string } = {}
  try { body = await req.json() } catch { /* default pack */ }
  const pack = resolvePack(body.packId)

  const { data: sub } = await supabaseAdmin
    .from('study_subscriptions')
    .select('status, plan, portone_subscription_id, purchased_credits_remaining')
    .eq('student_id', user.id)
    .maybeSingle()

  // No plan gate — any authenticated user can buy credits. Resolve the
  // card to charge: a stored key wins; otherwise the client issues one
  // via the PortOne overlay and passes it. No key either way → tell the
  // client to issue one and retry.
  const storedKey = sub?.portone_subscription_id ?? null
  const providedKey = typeof body.billingKey === 'string' && body.billingKey ? body.billingKey : null
  const billingKey = storedKey ?? providedKey
  if (!billingKey) {
    return NextResponse.json({ error: 'no payment method on file', code: 'no_billing_key' }, { status: 402 })
  }

  const paymentId = `study-pack-${user.id}-${Date.now()}`
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

  // Ensure a subscription row exists to hold the credits (the increment
  // RPC updates by student_id) and persist a freshly issued card for
  // reuse. A brand-new buyer with no row gets a minimal Free row; an
  // existing row that lacked a card records the one we just charged.
  const nowIso = new Date().toISOString()
  if (!sub) {
    await supabaseAdmin.from('study_subscriptions').insert({
      student_id: user.id,
      status: 'free',
      plan: 'free_v1',
      currency: 'KRW',
      portone_subscription_id: billingKey,
      grant_credits_remaining: 0,
      purchased_credits_remaining: 0,
      updated_at: nowIso,
    })
  } else if (!storedKey && providedKey) {
    await supabaseAdmin
      .from('study_subscriptions')
      .update({ portone_subscription_id: providedKey, updated_at: nowIso })
      .eq('student_id', user.id)
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
