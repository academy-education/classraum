import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin, countRows } from '../../_lib/admin-auth'

/**
 * GET /api/admin/dashboard/charts
 *
 * 12 months of cumulative academies / users plus monthly paid-invoice revenue.
 *
 * Moved off the browser anon client for the same reason as the parent route:
 * an RLS-denied count returns `{ count: null, error: null }`, and the old
 * `count || 0` turned that silent denial into a chart full of zeroes.
 */
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (11 - i))
      return {
        monthIndex: date.getMonth(),
        monthStart: new Date(date.getFullYear(), date.getMonth(), 1),
        monthEnd: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59),
      }
    })

    const series = await Promise.all(
      months.map(async month => {
        const endIso = month.monthEnd.toISOString()

        const [academies, users] = await Promise.all([
          countRows(
            () =>
              supabaseAdmin
                .from('academies')
                .select('*', { count: 'exact', head: true })
                .lte('created_at', endIso),
            `academies_${endIso}`
          ),
          countRows(
            () =>
              supabaseAdmin
                .from('users')
                .select('*', { count: 'exact', head: true })
                .lte('created_at', endIso),
            `users_${endIso}`
          ),
        ])

        const { data: invoices, error } = await supabaseAdmin
          .from('invoices')
          .select('final_amount')
          .eq('status', 'paid')
          .gte('paid_at', month.monthStart.toISOString())
          .lte('paid_at', endIso)
        if (error) throw new Error(`invoices ${endIso}: ${error.message}`)

        return {
          monthIndex: month.monthIndex,
          revenue: (invoices || []).reduce(
            (s, i: { final_amount: number | null }) => s + (i.final_amount || 0),
            0
          ),
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
