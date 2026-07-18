import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, type WebhookHeaders } from '@/lib/portone-webhook'
import { getPaymentInfo } from '@/lib/portone-charge'
import { resolvePack, resolvePass, STUDY_PLANS } from '@/lib/study/plans'
import { grantCreditPack, grantExamPass } from '@/lib/study/grant-purchase'

/**
 * PortOne webhook backstop for one-time study purchases (credit packs +
 * exam passes).
 *
 * Why this exists: the pack/pass checkout grants credits from the CLIENT
 * after requestPayment resolves. On mobile/Capacitor that return trip is
 * fragile — a dropped redirect, a WebView reload, or a session-restore
 * race (we've seen the redemption 401) means the card is charged but the
 * client never redeems, so the buyer gets nothing.
 *
 * Webhook format: PortOne can send EITHER the 2024-04-25 Standard-Webhooks
 * body (`{ type: 'Transaction.Paid', data: { paymentId } }`) OR the legacy
 * 2024-01-01 body (`{ status: 'Paid', payment_id, tx_id }`), depending on
 * the console's webhook-version setting. We normalize both. The legacy
 * body carries no customData, so either way we fetch the payment to learn
 * the product + buyer and to confirm it's genuinely PAID.
 *
 * Idempotency: the grant helpers insert the study_payments PK before
 * granting, so the client redemption and this webhook can't double-credit.
 * Always 200 for events we skip, so PortOne stops retrying.
 */

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const raw = await req.text()

  const secret = process.env.PORTONE_WEBHOOK_SECRET
  if (secret) {
    const headers: WebhookHeaders = {
      'webhook-id': req.headers.get('webhook-id') ?? '',
      'webhook-signature': req.headers.get('webhook-signature') ?? '',
      'webhook-timestamp': req.headers.get('webhook-timestamp') ?? '',
    }
    try {
      verifyWebhookSignature(secret, raw, headers)
    } catch {
      console.warn('[study/payment-webhook] signature verification failed')
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }
  }

  let event: Record<string, unknown>
  try { event = JSON.parse(raw) } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }

  // Normalize the two webhook body formats to (isPaid, paymentId).
  const { isPaid, paymentId } = normalizePaymentEvent(event)
  if (!isPaid) {
    return NextResponse.json({ ok: true, ignored: 'not a paid event' })
  }
  if (!paymentId) {
    return NextResponse.json({ ok: true, ignored: 'no paymentId' })
  }

  // Authoritative fetch: confirm PAID + read the customData (product +
  // buyer) that the legacy webhook body doesn't include.
  const info = await getPaymentInfo(paymentId)
  if (!info.ok) {
    console.warn('[study/payment-webhook] payment fetch failed', { paymentId, message: info.message })
    return NextResponse.json({ ok: true, ignored: 'payment fetch failed' })
  }
  if (info.status !== 'PAID') {
    return NextResponse.json({ ok: true, ignored: `status ${String(info.status)}` })
  }
  if (info.currency !== 'KRW') {
    return NextResponse.json({ ok: true, ignored: `currency ${String(info.currency)}` })
  }

  const cd = info.customData ?? {}
  const kind = cd.kind
  const studentId = typeof cd.student_id === 'string' ? cd.student_id : ''
  if ((kind !== 'study_credit_pack' && kind !== 'study_exam_pass') || !studentId) {
    return NextResponse.json({ ok: true, ignored: 'not a one-time study purchase' })
  }

  if (kind === 'study_credit_pack') {
    const pack = resolvePack(typeof cd.pack === 'string' ? cd.pack : '')
    if (cd.pack !== pack.id || info.amountTotal !== pack.priceWon) {
      return NextResponse.json({ ok: true, ignored: 'pack/amount mismatch' })
    }
    const outcome = await grantCreditPack({ studentId, packId: pack.id, paymentId })
    return NextResponse.json({ ok: true, applied: outcome.status })
  }

  // study_exam_pass
  const passTerms = resolvePass(typeof cd.pass === 'string' ? cd.pass : '')
  const passPlan = passTerms ? STUDY_PLANS[passTerms.id] : undefined
  if (!passTerms || !passPlan) {
    return NextResponse.json({ ok: true, ignored: 'unknown pass' })
  }
  if (cd.pass !== passPlan.id || info.amountTotal !== passPlan.priceWon) {
    return NextResponse.json({ ok: true, ignored: 'pass/amount mismatch' })
  }
  const outcome = await grantExamPass({ studentId, passId: passPlan.id, paymentId })
  return NextResponse.json({ ok: true, applied: outcome.status })
}

/**
 * Both webhook formats → (isPaid, paymentId).
 *   2024-04-25: { type: 'Transaction.Paid', data: { paymentId } }
 *   2024-01-01: { status: 'Paid', payment_id, tx_id }
 */
function normalizePaymentEvent(event: Record<string, unknown>): { isPaid: boolean; paymentId: string } {
  if (typeof event.type === 'string') {
    const data = (event.data ?? {}) as Record<string, unknown>
    return {
      isPaid: event.type === 'Transaction.Paid',
      paymentId: typeof data.paymentId === 'string' ? data.paymentId : '',
    }
  }
  // Legacy 2024-01-01 shape.
  return {
    isPaid: event.status === 'Paid',
    paymentId: typeof event.payment_id === 'string' ? event.payment_id : '',
  }
}
