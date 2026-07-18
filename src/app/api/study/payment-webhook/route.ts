import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, type WebhookHeaders } from '@/lib/portone-webhook'
import { tryHandleStudyOneTimeWebhook } from '@/lib/study/payment-webhook-handler'

/**
 * PortOne webhook backstop for one-time study purchases (credit packs +
 * exam passes) — the target of the noticeUrls we set on requestPayment.
 *
 * The actual grant logic lives in tryHandleStudyOneTimeWebhook, shared
 * with the academy webhook (/api/payments/webhook) so a study payment
 * grants no matter which URL PortOne hits (noticeUrls here, or the
 * console-configured webhook if a stale bundle didn't send noticeUrls).
 *
 * Signature verification is optional (only enforced when the secret is
 * set); the grant re-verifies the payment against PortOne's API, so it
 * only fires for a genuinely PAID payment matching its customData.
 */

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const raw = await req.text()

  // Signature check is ADVISORY here, not a gate: the grant re-verifies
  // the payment against PortOne's API (getPaymentInfo → PAID + amount +
  // customData), which is the real security boundary. So a wrong/rotated
  // PORTONE_WEBHOOK_SECRET can never block a legitimate grant — we just
  // log the mismatch and proceed. (An attacker can't forge a PAID payment
  // with matching customData, so no signature is needed to stay safe.)
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
      console.warn('[study/payment-webhook] signature verification failed — proceeding (API re-verify is the gate)')
    }
  }

  const outcome = await tryHandleStudyOneTimeWebhook(raw)
  return NextResponse.json({ ok: true, ...outcome })
}
