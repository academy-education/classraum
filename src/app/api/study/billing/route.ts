import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { fetchPortOnePayment } from '@/lib/study/charge-receipt'

/**
 * GET /api/study/billing — the signed-in student's charges, newest first, each
 * with its Inicis card slip (신용카드 매출전표) link.
 *
 * Rows written before receipts existed have no receipt_url / order_name yet;
 * those are read from PortOne on first view and saved, so each charge costs one
 * PortOne call ever. Refunded charges are listed too — a refund is part of the
 * history, and the slip shows the cancellation.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireStudyUser(req)
  if (auth.response) return auth.response

  const { data, error } = await dbAdmin
    .from('study_payments')
    .select('payment_id, kind, amount_won, created_at, paid_at, refunded_at, order_name, receipt_url')
    .eq('student_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: 'could not load billing history' }, { status: 500 })

  const rows = data ?? []
  const missing = rows.filter(r => !r.receipt_url || !r.order_name).slice(0, 12)
  // Best-effort: each save checks its own error and logs it; a failed save
  // only means the slip link is fetched from PortOne again on the next view.
  await Promise.all(missing.map(async r => {
    const p = await fetchPortOnePayment(r.payment_id)
    if (!p) return
    r.receipt_url = p.receiptUrl ?? r.receipt_url
    r.order_name = p.orderName ?? r.order_name
    r.paid_at = p.paidAt ?? r.paid_at
    const { error: saveErr } = await dbAdmin.from('study_payments')
      .update({ receipt_url: r.receipt_url, order_name: r.order_name, paid_at: r.paid_at })
      .eq('payment_id', r.payment_id)
    if (saveErr) console.error('[study/billing] backfill save failed', r.payment_id, saveErr.message)
  }))

  return NextResponse.json({
    items: rows.map(r => ({
      paymentId: r.payment_id,
      kind: r.kind,
      amountWon: r.amount_won,
      paidAt: r.paid_at ?? r.created_at,
      refundedAt: r.refunded_at,
      orderName: r.order_name,
      receiptUrl: r.receipt_url,
    })),
  })
}
