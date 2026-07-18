import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, type WebhookHeaders } from '@/lib/portone-webhook'
import { verifyOneTimePayment } from '@/lib/portone-charge'
import { resolvePack, resolvePass, STUDY_PLANS } from '@/lib/study/plans'
import { grantCreditPack, grantExamPass } from '@/lib/study/grant-purchase'

/**
 * PortOne webhook backstop for one-time study purchases (credit packs +
 * exam passes).
 *
 * Why this exists: the pack/pass checkout grants credits from the CLIENT
 * after requestPayment resolves. On mobile/Capacitor that return trip is
 * fragile — a dropped redirect, a WebView reload, or a session-restore
 * race means the card is charged but the client never redeems, so the
 * buyer gets nothing. PortOne's docs strongly recommend a webhook for
 * exactly this: "클라이언트에서 결제 완료에 대한 응답을 받지 못하는 경우 …
 * 웹훅을 통해 누락 없이 결제 정보를 동기화할 수 있습니다."
 *
 * On Transaction.Paid we re-verify the payment against PortOne's API
 * (never trust the webhook body alone), then run the SAME grant helpers
 * the client path uses. Idempotency is the study_payments PK, so whoever
 * lands first (client or webhook) wins and the other no-ops — the card
 * is never credited twice.
 *
 * Registration: this URL is passed as `noticeUrls` on the pack/pass
 * requestPayment call, and can also be set in the PortOne console. The
 * signing secret is PORTONE_WEBHOOK_SECRET. Always return 200 for events
 * we intentionally skip so PortOne stops retrying.
 */

export const dynamic = 'force-dynamic'

interface WebhookPayload {
  type?: string
  data?: {
    paymentId?: string
    customData?: string | Record<string, unknown>
  }
}

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

  let event: WebhookPayload
  try { event = JSON.parse(raw) } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }

  const type = event.type ?? ''
  // Only a completed payment grants anything. Ready/Failed/Cancelled are
  // no-ops here (failures never charged; refunds are handled elsewhere).
  if (type !== 'Transaction.Paid') {
    return NextResponse.json({ ok: true, ignored: type || 'no type' })
  }

  const paymentId = event.data?.paymentId ?? ''
  const customData = parseCustomData(event.data?.customData)
  const kind = customData?.kind
  const studentId = typeof customData?.student_id === 'string' ? customData.student_id : ''

  // Not one of our one-time study purchases — could be a subscription
  // charge, an invoice, or another store's traffic sharing this URL.
  if ((kind !== 'study_credit_pack' && kind !== 'study_exam_pass') || !paymentId || !studentId) {
    return NextResponse.json({ ok: true, ignored: 'not a one-time study purchase' })
  }

  if (kind === 'study_credit_pack') {
    const packId = typeof customData?.pack === 'string' ? customData.pack : ''
    const pack = resolvePack(packId)
    // Authoritative re-check against PortOne: must be PAID, KRW, exact
    // amount, and carry our pack kind. Never trust the webhook body.
    const v = await verifyOneTimePayment({
      paymentId,
      expectedAmount: pack.priceWon,
      expectedKind: 'study_credit_pack',
    })
    if (!v.ok) {
      console.warn('[study/payment-webhook] pack verify failed', { paymentId, message: v.message })
      // 200 so PortOne stops retrying a payment we can't/​won't honor;
      // the client path (or reconciliation) remains the fallback.
      return NextResponse.json({ ok: true, ignored: 'verify failed' })
    }
    if (v.customData?.pack !== pack.id || v.customData?.student_id !== studentId) {
      return NextResponse.json({ ok: true, ignored: 'customData mismatch' })
    }
    const outcome = await grantCreditPack({ studentId, packId: pack.id, paymentId })
    return NextResponse.json({ ok: true, applied: outcome.status })
  }

  // study_exam_pass
  const passId = typeof customData?.pass === 'string' ? customData.pass : ''
  const passTerms = resolvePass(passId)
  const passPlan = passTerms ? STUDY_PLANS[passTerms.id] : undefined
  if (!passTerms || !passPlan) {
    return NextResponse.json({ ok: true, ignored: 'unknown pass' })
  }
  const v = await verifyOneTimePayment({
    paymentId,
    expectedAmount: passPlan.priceWon,
    expectedKind: 'study_exam_pass',
  })
  if (!v.ok) {
    console.warn('[study/payment-webhook] pass verify failed', { paymentId, message: v.message })
    return NextResponse.json({ ok: true, ignored: 'verify failed' })
  }
  if (v.customData?.pass !== passPlan.id || v.customData?.student_id !== studentId) {
    return NextResponse.json({ ok: true, ignored: 'customData mismatch' })
  }
  const outcome = await grantExamPass({ studentId, passId: passPlan.id, paymentId })
  return NextResponse.json({ ok: true, applied: outcome.status })
}

function parseCustomData(input: unknown): { kind?: string; pack?: string; pass?: string; student_id?: string } | null {
  if (!input) return null
  if (typeof input === 'object') return input as Record<string, string>
  if (typeof input === 'string') {
    try { return JSON.parse(input) } catch { return null }
  }
  return null
}
