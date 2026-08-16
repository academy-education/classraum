import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireAdmin, countRows } from '../../_lib/admin-auth'
import { lastNMonthsKST, monthlyNetRevenueKST, type DatedAmount } from '@/lib/admin/revenue'

/**
 * GET /api/admin/dashboard/charts
 *
 * 12 months of cumulative academies / users plus monthly NET platform
 * revenue.
 *
 * Revenue = study payments (study_payments.amount_won) MINUS the refund
 * ledger (study_payment_refunds), each row bucketed into the calendar month
 * of its own timestamp in Asia/Seoul. The previous version summed paid
 * `invoices` instead — that is academy→student billing, not money Classraum
 * received — never subtracted refunds, and cut months at server-local
 * midnight (UTC on Vercel), so late-night KST payments landed in the wrong
 * month. Aggregation logic lives in @/lib/admin/revenue (unit-tested).
 *
 * Moved off the browser anon client for the same reason as the parent route:
 * an RLS-denied count returns `{ count: null, error: null }`, and the old
 * `count || 0` turned that silent denial into a chart full of zeroes.
 */

/** Page past the PostgREST 1000-row cap — a single .select() over a growing
 *  table silently truncates (see CLAUDE.md). */
const CHUNK = 1000
async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += CHUNK) {
    const { data, error } = await page(from, from + CHUNK - 1)
    if (error) throw new Error(error.message)
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < CHUNK) break
  }
  return out
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const months = lastNMonthsKST(12)
    const windowStart = months[0].startIso
    const windowEnd = months[months.length - 1].endIso

    // Net revenue inputs for the whole window, one query each.
    const [payments, refunds] = await Promise.all([
      fetchAllPages<{ amount_won: number | null; created_at: string | null }>((from, to) =>
        dbAdmin
          .from('study_payments')
          .select('amount_won, created_at')
          .gte('created_at', windowStart)
          .lt('created_at', windowEnd)
          .order('created_at')
          .range(from, to)
      ),
      fetchAllPages<{ amount_won: number | null; created_at: string | null }>((from, to) =>
        dbAdmin
          .from('study_payment_refunds')
          .select('amount_won, created_at')
          .gte('created_at', windowStart)
          .lt('created_at', windowEnd)
          .order('created_at')
          .range(from, to)
      ),
    ])

    const toDated = (rows: { amount_won: number | null; created_at: string | null }[]): DatedAmount[] =>
      rows.map(r => ({ amountWon: r.amount_won, at: r.created_at }))

    const revenueByMonth = monthlyNetRevenueKST(months, toDated(payments), toDated(refunds))

    const series = await Promise.all(
      months.map(async (month, i) => {
        const [academies, users] = await Promise.all([
          countRows(
            () =>
              dbAdmin
                .from('academies')
                .select('*', { count: 'exact', head: true })
                .lt('created_at', month.endIso),
            `academies_${month.endIso}`
          ),
          countRows(
            () =>
              dbAdmin
                .from('users')
                .select('*', { count: 'exact', head: true })
                .lt('created_at', month.endIso),
            `users_${month.endIso}`
          ),
        ])

        return {
          monthIndex: month.month,
          revenue: revenueByMonth[i],
          academies,
          users,
        }
      })
    )

    return NextResponse.json({ series })
  } catch (e) {
    console.error('[Admin dashboard charts API] Error:', e)
    return NextResponse.json(
      { error: 'Failed to load chart data', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
