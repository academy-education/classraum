import { NextRequest, NextResponse } from 'next/server'
import { requireStudyUser } from '@/lib/study/auth'
import { enforceRateLimit } from '@/lib/rate-limit'
import { getBillingKeyInfo, getPaymentInfo } from '@/lib/portone-charge'
import { resolvePack, resolvePass, STUDY_PLANS } from '@/lib/study/plans'
import { grantCreditPack, grantExamPass } from '@/lib/study/grant-purchase'
import { activateSubscriptionFromBillingKey } from '@/lib/study/activate-subscription'

/**
 * POST /api/study/subscription/recover — finish a purchase whose CLIENT
 * lost track of what was being bought.
 *
 * ── The problem this exists for ──────────────────────────────────────
 *
 * The buyer leaves for the PG and comes back holding only a billingKey
 * (or paymentId) in the query string. Which plan/pass/pack it was for
 * lived in browser storage — and browser storage does not survive the
 * return landing in a DIFFERENT browsing context.
 *
 * Measured, both platforms, 2026-08-13:
 *   iOS      /mobile/* was claimed as a Universal Link, so the return
 *            was handed to the app instead of Safari. Fixed by moving
 *            checkout to the unclaimed /pay/* (bobby@ then completed a
 *            real payment: native=false on BOTH events, kind='plan').
 *   Android  kim@ started in SamsungBrowser (native=false) and the
 *            return arrived in the app WebView (native=true, UA "; wv)")
 *            — even though /pay/ is NOT claimed in AndroidManifest.xml.
 *            The Android claim list is compiled into the APK, so unlike
 *            iOS it cannot be corrected by a deploy.
 *
 * ── Why this is the right layer, not a workaround ────────────────────
 *
 * The identity of a purchase belongs with the PAYMENT, not with the
 * browser that happened to start it. We already stamp it at issuance —
 *   customData: { kind, plan|pass|pack, student_id }
 * — and the BillingKey.Issued webhook already reads it back exactly this
 * way. This endpoint is that same lookup, reachable on the return leg
 * instead of only from a server-to-server callback. The client-side
 * intent becomes a fast path; losing it now costs a round trip rather
 * than a customer, on any browser, claimed path or not.
 *
 * ── Ownership ────────────────────────────────────────────────────────
 *
 * A billingKey/paymentId travels in a URL, so possession proves nothing.
 * Every branch below requires customData.student_id to equal the AUTHED
 * user before anything is charged or granted. A key belonging to someone
 * else is refused, not redeemed — which also means a shared or forwarded
 * return link cannot move a purchase between accounts.
 */
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  // Each call costs two PortOne round trips; a lost return is a handful
  // of retries, never dozens.
  const blocked = enforceRateLimit(`study-recover:${user.id}`, { windowMs: 60_000, max: 10 })
  if (blocked) return blocked

  let body: { billingKey?: unknown; paymentId?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  const billingKey = typeof body.billingKey === 'string' ? body.billingKey : ''
  const paymentId = typeof body.paymentId === 'string' ? body.paymentId : ''
  if (!billingKey && !paymentId) {
    return NextResponse.json({ error: 'billingKey or paymentId required' }, { status: 400 })
  }

  /* ── Recurring: a registered card ─────────────────────────────────── */
  if (billingKey) {
    const info = await getBillingKeyInfo(billingKey)
    // Could not reach PortOne — do NOT tell the buyer this failed, the
    // card is registered and the webhook backstop may still land it.
    if (!info.ok) {
      return NextResponse.json({ error: 'lookup_failed', retry: true }, { status: 503 })
    }
    const cd = info.customData ?? {}
    if (cd.kind !== 'study_subscription') {
      return NextResponse.json({ error: 'not_a_subscription_key' }, { status: 409 })
    }
    if (typeof cd.student_id !== 'string' || cd.student_id !== user.id) {
      // Someone else's key, or one issued before student_id was stamped.
      return NextResponse.json({ error: 'not_your_key' }, { status: 403 })
    }
    const planId = typeof cd.plan === 'string' ? cd.plan : undefined
    if (planId && !STUDY_PLANS[planId]) {
      return NextResponse.json({ error: 'unknown_plan' }, { status: 409 })
    }
    // onlyIfNoActiveSub: the client may have succeeded already, or the
    // webhook may have beaten us here. Never double-charge a race.
    const outcome = await activateSubscriptionFromBillingKey({
      studentId: user.id, billingKey, planId, onlyIfNoActiveSub: true,
    })
    if (outcome.status === 'charge_failed') {
      return NextResponse.json({ error: 'charge_failed', code: outcome.code, message: outcome.message }, { status: 402 })
    }
    if (outcome.status === 'error') {
      return NextResponse.json({ error: 'activation_failed', retry: true }, { status: 503 })
    }
    // 'activated' and 'already_active' are both success to the buyer.
    return NextResponse.json({ ok: true, kind: 'plan', applied: outcome.status })
  }

  /* ── One-time: a pass or a credit pack ────────────────────────────── */
  const info = await getPaymentInfo(paymentId)
  if (!info.ok) {
    return NextResponse.json({ error: 'lookup_failed', retry: true }, { status: 503 })
  }
  // Only a settled KRW payment grants anything. This is the check that
  // makes the endpoint safe to call with an arbitrary paymentId.
  if (info.status !== 'PAID' || info.currency !== 'KRW') {
    return NextResponse.json({ error: 'not_paid', status: info.status }, { status: 409 })
  }
  const cd = info.customData ?? {}
  if (typeof cd.student_id !== 'string' || cd.student_id !== user.id) {
    return NextResponse.json({ error: 'not_your_payment' }, { status: 403 })
  }

  if (cd.kind === 'study_credit_pack') {
    const pack = resolvePack(typeof cd.pack === 'string' ? cd.pack : '')
    // resolvePack falls back to a default, so compare ids explicitly —
    // and check the AMOUNT, so a cheap payment cannot claim a big pack.
    if (cd.pack !== pack.id || info.amountTotal !== pack.priceWon) {
      return NextResponse.json({ error: 'pack_mismatch' }, { status: 409 })
    }
    const outcome = await grantCreditPack({ studentId: user.id, packId: pack.id, paymentId })
    if (outcome.status === 'error') {
      return NextResponse.json({ error: 'grant_failed', retry: true }, { status: 503 })
    }
    return NextResponse.json({ ok: true, kind: 'pack', applied: outcome.status })
  }

  if (cd.kind === 'study_exam_pass') {
    const passTerms = resolvePass(typeof cd.pass === 'string' ? cd.pass : '')
    const passPlan = passTerms ? STUDY_PLANS[passTerms.id] : undefined
    if (!passTerms || !passPlan) return NextResponse.json({ error: 'unknown_pass' }, { status: 409 })
    if (cd.pass !== passPlan.id || info.amountTotal !== passPlan.priceWon) {
      return NextResponse.json({ error: 'pass_mismatch' }, { status: 409 })
    }
    const outcome = await grantExamPass({ studentId: user.id, passId: passPlan.id, paymentId })
    if (outcome.status === 'error') {
      return NextResponse.json({ error: 'grant_failed', retry: true }, { status: 503 })
    }
    return NextResponse.json({ ok: true, kind: 'pass', applied: outcome.status })
  }

  return NextResponse.json({ error: 'unexpected_kind' }, { status: 409 })
}
