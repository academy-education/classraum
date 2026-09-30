import { dbAdmin } from '@/lib/supabase-admin'
import { sendChargeReceipt } from '@/lib/study/charge-receipt'

/**
 * Record a study subscription charge (first charge / renewal / upgrade) into
 * `study_payments` so it shows up in the admin payments view alongside credit
 * packs and exam passes — and so it can be refunded from there.
 *
 * Idempotent on the `payment_id` primary key: a duplicate insert (e.g. a cron
 * re-run for the same period, or a webhook racing the cron) is a harmless
 * no-op. Best-effort by design — a failure here must NEVER fail the charge or
 * the credit grant, so it only logs.
 */
export async function recordSubscriptionPayment(opts: {
  paymentId: string
  studentId: string
  amountWon: number
}): Promise<void> {
  const { error } = await dbAdmin.from('study_payments').insert({
    payment_id: opts.paymentId,
    student_id: opts.studentId,
    kind: 'study_subscription',
    amount_won: opts.amountWon,
  })
  // 23505 = unique_violation → already recorded, expected on re-runs.
  if (error && error.code !== '23505') {
    console.error('[recordSubscriptionPayment] insert failed', opts.paymentId, error.message)
    return
  }
  // Every charge gets a receipt (first payment, renewal, plan change). On a
  // re-run the row already exists and the receipt's own claim makes this a
  // no-op; sendChargeReceipt never throws, so it cannot fail the charge.
  await sendChargeReceipt(opts.paymentId)
}
