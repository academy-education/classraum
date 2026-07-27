import { dbAdmin } from '@/lib/supabase-admin'
import { getPaymentInfo } from '@/lib/portone-charge'

/**
 * Reconcile a refund that happened OUTSIDE our admin console — e.g. an
 * operator cancelled the payment directly in the PortOne dashboard, or a
 * chargeback came through. Without this, `study_payments.refunded_at` only
 * gets stamped when *we* issue the refund, so the admin would keep showing
 * 결제 완료 (Paid) for money that is already gone.
 *
 * Ownership is decided by a `study_payments` lookup rather than a paymentId
 * prefix, so this covers every kind we sell (credit packs `spk-`/`study-pack-`,
 * exam passes `pas-`, and subscription charges `study-sub-*`) without needing
 * to know the id shape.
 *
 * Security: the webhook signature is advisory on these endpoints, so we
 * re-fetch the payment from PortOne and only stamp when PortOne itself
 * reports it cancelled. A forged webhook therefore can't mark paid money as
 * refunded. Idempotent — a second delivery is a no-op.
 */

export type RefundSyncResult =
  | { status: 'not_ours' }
  | { status: 'already_refunded' }
  | { status: 'not_cancelled' }
  | { status: 'marked' }
  /** Couldn't reach PortOne to verify — caller should ask for a redelivery. */
  | { status: 'unverifiable'; retryable: true }

export async function syncStudyPaymentRefund(
  paymentId: string,
  reason = 'PortOne cancellation webhook',
): Promise<RefundSyncResult> {
  if (!paymentId) return { status: 'not_ours' }

  const { data: row } = await dbAdmin
    .from('study_payments')
    .select('payment_id, refunded_at')
    .eq('payment_id', paymentId)
    .maybeSingle()
  if (!row) return { status: 'not_ours' }
  if (row.refunded_at) return { status: 'already_refunded' }

  // Trust PortOne's API, not the webhook body.
  const info = await getPaymentInfo(paymentId)
  if (!info.ok) return { status: 'unverifiable', retryable: true }
  if (info.status !== 'CANCELLED' && info.status !== 'PARTIAL_CANCELLED') {
    return { status: 'not_cancelled' }
  }

  const { error } = await dbAdmin
    .from('study_payments')
    .update({ refunded_at: new Date().toISOString(), refund_reason: reason })
    .eq('payment_id', paymentId)
    // Don't clobber a refund another delivery stamped while we were verifying.
    .is('refunded_at', null)
  if (error) {
    console.error('[syncStudyPaymentRefund] update failed', paymentId, error.message)
    return { status: 'unverifiable', retryable: true }
  }
  return { status: 'marked' }
}
