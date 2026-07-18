import { NextRequest, NextResponse } from 'next/server'
import { STUDY_PLANS } from '@/lib/study/plans'
import { requireStudyUser } from '@/lib/study/auth'
import { activateSubscriptionFromBillingKey } from '@/lib/study/activate-subscription'

/**
 * POST /api/study/subscription/billing-key
 *
 * Called by the web subscribe page after the PortOne browser SDK
 * returns a billing key. We store the key, immediately charge the
 * first month, and on success flip the row to status='active' with
 * a new 30-day period.
 *
 * This replaces the Phase-4 stub /checkout endpoint. The UI gates
 * native (Capacitor) clients away from the subscribe flow entirely
 * — only web hits this route.
 *
 * Idempotency: paymentId is namespaced
 *   `study-sub-init-{studentId}-{epochMs}`
 * so retries from the same client within seconds produce different
 * payment IDs and don't collide. PortOne dedups by paymentId on
 * its side as a safety net.
 */

export const dynamic = 'force-dynamic'


export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  let body: { billingKey?: string; plan?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const billingKey = body.billingKey
  if (!billingKey || typeof billingKey !== 'string') {
    return NextResponse.json({ error: 'missing billingKey' }, { status: 400 })
  }
  // Tiered plans — must be an exact catalog id; missing defaults to
  // General for backward compatibility with pre-tier clients.
  if (body.plan && !STUDY_PLANS[body.plan]) {
    return NextResponse.json({ error: 'unknown plan' }, { status: 400 })
  }

  // Charge + activate via the shared helper — the SAME code the
  // BillingKey.Issued webhook backstop runs, so a dropped client return
  // can't leave a registered-but-uncharged card behind.
  const outcome = await activateSubscriptionFromBillingKey({
    studentId: user.id,
    billingKey,
    planId: body.plan,
  })

  if (outcome.status === 'charge_failed') {
    return NextResponse.json(
      { error: 'charge failed', code: outcome.code, message: outcome.message },
      { status: 402 }
    )
  }
  if (outcome.status === 'error') {
    return NextResponse.json({ error: outcome.message, paymentId: outcome.paymentId }, { status: outcome.httpStatus })
  }
  if (outcome.status === 'already_active') {
    // Re-submit of a key that already activated — idempotent success.
    return NextResponse.json({ success: true, alreadyActive: true })
  }
  return NextResponse.json({
    success: true,
    current_period_end: outcome.periodEnd,
    paymentId: outcome.paymentId,
  })
}
