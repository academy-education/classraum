import { getPaymentInfo } from '@/lib/portone-charge'
import { resolvePack, resolvePass, STUDY_PLANS } from '@/lib/study/plans'
import { grantCreditPack, grantExamPass } from '@/lib/study/grant-purchase'

/**
 * Shared handler for one-time study-purchase webhooks (credit packs +
 * exam passes), called from BOTH:
 *   - /api/study/payment-webhook  (our noticeUrls target)
 *   - /api/payments/webhook       (the console-configured webhook — the
 *     fallback PortOne uses when a payment is sent WITHOUT noticeUrls,
 *     e.g. a stale app bundle)
 *
 * so a study payment grants no matter which URL PortOne happens to hit.
 *
 * Study one-time paymentIds are namespaced `spk-` (packs) / `pas-`
 * (passes) — we CLAIM those ids (handled=true) so the academy webhook
 * never mis-processes them, and grant on the paid event. Security comes
 * from re-fetching the payment (getPaymentInfo) and matching customData,
 * so a valid webhook signature is not required (the grant only fires for
 * a genuinely PAID payment that belongs to the student in its customData).
 * Idempotency is the study_payments PK inside the grant helpers.
 *
 * Handles both webhook body formats: 2024-04-25 (`{type, data:{paymentId}}`)
 * and legacy 2024-01-01 (`{status, payment_id}`).
 */

export interface StudyWebhookOutcome {
  handled: boolean
  applied?: string
  reason?: string
}

function normalize(event: Record<string, unknown>): { isPaid: boolean; paymentId: string } {
  if (typeof event.type === 'string') {
    const data = (event.data ?? {}) as Record<string, unknown>
    return {
      isPaid: event.type === 'Transaction.Paid',
      paymentId: typeof data.paymentId === 'string' ? data.paymentId : '',
    }
  }
  return {
    isPaid: event.status === 'Paid',
    paymentId: typeof event.payment_id === 'string' ? event.payment_id : '',
  }
}

export async function tryHandleStudyOneTimeWebhook(rawBody: string): Promise<StudyWebhookOutcome> {
  let event: Record<string, unknown>
  try { event = JSON.parse(rawBody) } catch { return { handled: false, reason: 'bad json' } }

  const { isPaid, paymentId } = normalize(event)
  if (!paymentId) return { handled: false, reason: 'no paymentId' }

  // Only claim study one-time purchase ids (spk-/pas-). Subscription
  // first-charges (sub-*) and academy invoices (inv_*) are not ours.
  if (!paymentId.startsWith('spk-') && !paymentId.startsWith('pas-')) {
    return { handled: false, reason: 'not a study one-time paymentId' }
  }
  // It IS a study payment — claim it so the caller stops here. Non-paid
  // events (Ready etc.) are claimed but no-op.
  if (!isPaid) return { handled: true, reason: 'non-paid study event' }

  const info = await getPaymentInfo(paymentId)
  if (!info.ok || info.status !== 'PAID' || info.currency !== 'KRW') {
    return { handled: true, reason: `unverifiable (${String(info.status)})` }
  }
  const cd = info.customData ?? {}
  const studentId = typeof cd.student_id === 'string' ? cd.student_id : ''
  if (!studentId) return { handled: true, reason: 'no student_id' }

  if (cd.kind === 'study_credit_pack') {
    const pack = resolvePack(typeof cd.pack === 'string' ? cd.pack : '')
    if (cd.pack !== pack.id || info.amountTotal !== pack.priceWon) {
      return { handled: true, reason: 'pack/amount mismatch' }
    }
    const outcome = await grantCreditPack({ studentId, packId: pack.id, paymentId })
    return { handled: true, applied: outcome.status }
  }

  if (cd.kind === 'study_exam_pass') {
    const passTerms = resolvePass(typeof cd.pass === 'string' ? cd.pass : '')
    const passPlan = passTerms ? STUDY_PLANS[passTerms.id] : undefined
    if (!passTerms || !passPlan) return { handled: true, reason: 'unknown pass' }
    if (cd.pass !== passPlan.id || info.amountTotal !== passPlan.priceWon) {
      return { handled: true, reason: 'pass/amount mismatch' }
    }
    const outcome = await grantExamPass({ studentId, passId: passPlan.id, paymentId })
    return { handled: true, applied: outcome.status }
  }

  return { handled: true, reason: `unexpected kind (${String(cd.kind)})` }
}
