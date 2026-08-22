import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '../../../_lib/admin-auth'

/**
 * GET /api/admin/academies/[id]/billing
 *
 * Invoice totals + the most recent invoices for one academy.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Billing tab of AcademyDetailModal rendered two unconditional string
 * literals — "No invoices yet" and "Invoice history will appear here once
 * payments are made" — and issued NO query whatsoever. It was not an empty
 * state computed from data; it was hard-coded prose that could never change.
 * 클래스라움 데모 학원 has 1,824 live invoices totalling ₩431,470,000 collected.
 *
 * `invoices` is academy→student billing (see the note in
 * /api/admin/dashboard/charts/route.ts). That is exactly what this tab is
 * about, so it is the right table here — unlike the platform revenue KPI,
 * which is money Classraum itself received.
 *
 * SOFT DELETES ARE EXCLUDED. `invoices.deleted_at` is set on withdrawn
 * invoices; counting them would report 2,015 rows for an academy that has
 * 1,824. Every figure below carries the same `deleted_at is null` filter so
 * the count and the sums can never describe different populations.
 *
 * Sums are computed in SQL via an RPC-free aggregation over paged reads:
 * a bare `.select()` is capped at 1000 rows by PostgREST, which would have
 * silently under-reported this academy by 45%.
 */

const CHUNK = 1000

type InvoiceRow = {
  final_amount: number | null
  status: string | null
  paid_at: string | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: academyId } = await params

  try {
    // ---- Totals over EVERY live invoice (paged past the 1000-row cap) ----
    const all: InvoiceRow[] = []
    for (let from = 0; ; from += CHUNK) {
      const { data, error } = await dbAdmin
        .from('invoices')
        .select('final_amount, status, paid_at')
        .eq('academy_id', academyId)
        .is('deleted_at', null)
        .order('created_at')
        .range(from, from + CHUNK - 1)
      if (error) throw new Error(`invoice totals: ${error.message}`)
      const rows = (data || []) as InvoiceRow[]
      all.push(...rows)
      if (rows.length < CHUNK) break
    }

    const sumWhere = (pred: (r: InvoiceRow) => boolean) =>
      all.filter(pred).reduce((s, r) => s + Number(r.final_amount || 0), 0)
    const countWhere = (pred: (r: InvoiceRow) => boolean) => all.filter(pred).length

    const isPaid = (r: InvoiceRow) => r.status === 'paid'
    const isPending = (r: InvoiceRow) => r.status === 'pending'

    // ---- The most recent invoices, for the list under the totals ----
    const { data: recent, error: recentError } = await dbAdmin
      .from('invoices')
      .select('id, invoice_name, final_amount, status, due_date, paid_at, created_at, payment_method')
      .eq('academy_id', academyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10)
    if (recentError) throw new Error(`recent invoices: ${recentError.message}`)

    // Last payment date, for the "last payment" figure.
    const lastPaidAt = all
      .filter(r => isPaid(r) && r.paid_at)
      .map(r => r.paid_at as string)
      .sort()
      .pop() || null

    return NextResponse.json({
      totals: {
        invoiceCount: all.length,
        paidCount: countWhere(isPaid),
        paidAmount: sumWhere(isPaid),
        pendingCount: countWhere(isPending),
        pendingAmount: sumWhere(isPending),
        lastPaidAt,
      },
      recent: (recent || []).map(r => ({
        id: r.id,
        name: r.invoice_name,
        amount: Number(r.final_amount || 0),
        status: r.status,
        dueDate: r.due_date,
        paidAt: r.paid_at,
        createdAt: r.created_at,
        paymentMethod: r.payment_method,
      })),
    })
  } catch (e) {
    console.error('[Admin academy billing API] Error:', e)
    return NextResponse.json(
      { error: 'Failed to load billing data', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
