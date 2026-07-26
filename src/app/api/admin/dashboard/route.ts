import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin, countRows } from '../_lib/admin-auth'

/**
 * GET /api/admin/dashboard
 *
 * Every figure on the admin dashboard, computed server-side with the service
 * role key.
 *
 * WHY THIS ROUTE EXISTS
 * ---------------------
 * AdminDashboard.tsx used to run all of these queries directly from the
 * browser via the anon-key client (`@/lib/supabase`). Those queries are
 * subject to RLS, and a denied `head + count` request comes back as
 * `{ count: null, error: null }` — no error at all. Combined with the
 * `count || 0` idiom used at every call site, an RLS denial rendered as a
 * confident `0`. That is exactly how the dashboard displayed
 * "Total academies: 0" against a table holding 10 rows.
 *
 * Same reasoning as /api/admin/academies/route.ts, which already moved its
 * reads server-side for this precise problem.
 *
 * Failure policy: any count that comes back non-numeric throws (see
 * `countRows`), the route returns 500, and the client renders an error state.
 * A failed load must never be indistinguishable from an empty platform.
 */
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const head = (table: string) =>
      supabaseAdmin.from(table).select('*', { count: 'exact', head: true })

    const [
      totalAcademies,
      totalUsers,
      activeSubscriptions,
      trialAcademies,
      supportTickets,
      urgentTickets,
      normalTickets,
      criticalAlerts,
      totalActiveAlerts,
    ] = await Promise.all([
      countRows(() => head('academies'), 'academies'),
      countRows(() => head('users'), 'users'),
      countRows(
        () => head('academy_subscriptions').in('status', ['active', 'trialing']),
        'active_subscriptions'
      ),
      countRows(
        () => head('academy_subscriptions').eq('status', 'trialing'),
        'trial_subscriptions'
      ),
      countRows(
        () => head('support_tickets').in('status', ['open', 'in_progress']),
        'support_tickets'
      ),
      countRows(
        () => head('support_tickets').in('status', ['open', 'in_progress']).eq('priority', 'high'),
        'urgent_tickets'
      ),
      countRows(
        () => head('support_tickets').in('status', ['open', 'in_progress']).in('priority', ['low', 'medium']),
        'normal_tickets'
      ),
      countRows(
        () => head('alerts').eq('resolved', false).in('severity', ['critical', 'high']),
        'critical_alerts'
      ),
      countRows(() => head('alerts').eq('resolved', false), 'active_alerts'),
    ])

    // Distinct academies carrying an active/trialing subscription.
    const { data: activeAcademyRows, error: activeAcademyErr } = await supabaseAdmin
      .from('academy_subscriptions')
      .select('academy_id')
      .in('status', ['active', 'trialing'])
    if (activeAcademyErr) throw new Error(`active academies: ${activeAcademyErr.message}`)
    const activeAcademies = new Set((activeAcademyRows || []).map(r => r.academy_id)).size

    // ---- Revenue: this month vs last month ----
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const startOfLastMonth = new Date(startOfMonth)
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1)

    const sumPaid = async (fromIso: string, toIso?: string) => {
      let q = supabaseAdmin
        .from('invoices')
        .select('final_amount')
        .eq('status', 'paid')
        .gte('paid_at', fromIso)
      if (toIso) q = q.lt('paid_at', toIso)
      const { data, error } = await q
      if (error) throw new Error(`invoice sum: ${error.message}`)
      return (data || []).reduce((s, i: { final_amount: number | null }) => s + (i.final_amount || 0), 0)
    }

    const monthlyRevenue = await sumPaid(startOfMonth.toISOString())
    const lastMonthRevenue = await sumPaid(startOfLastMonth.toISOString(), startOfMonth.toISOString())
    const revenueGrowth =
      lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

    // ---- 10-day trends ----
    const last10Days = Array.from({ length: 10 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (9 - i))
      return d.toISOString().split('T')[0]
    })

    const cumulativeTrend = (table: string, apply?: (q: ReturnType<typeof head>) => ReturnType<typeof head>) =>
      Promise.all(
        last10Days.map(date =>
          countRows(() => {
            const base = head(table)
            return (apply ? apply(base) : base).lte('created_at', `${date}T23:59:59`)
          }, `${table}_trend_${date}`)
        )
      )

    const revenueTrendPromise = Promise.all(
      last10Days.map(async date => {
        const { data, error } = await supabaseAdmin
          .from('invoices')
          .select('final_amount')
          .eq('status', 'paid')
          .gte('paid_at', `${date}T00:00:00`)
          .lte('paid_at', `${date}T23:59:59`)
        if (error) throw new Error(`revenue trend ${date}: ${error.message}`)
        return (data || []).reduce((s, i: { final_amount: number | null }) => s + (i.final_amount || 0), 0)
      })
    )

    const [academiesTrend, usersTrend, subscriptionsTrend, revenueTrend] = await Promise.all([
      cumulativeTrend('academies'),
      cumulativeTrend('users'),
      cumulativeTrend('academy_subscriptions', q => q.in('status', ['active', 'trialing'])),
      revenueTrendPromise,
    ])

    const pctChange = (series: number[]) =>
      series.length > 1
        ? ((series[series.length - 1] - series[0]) / Math.max(series[0], 1)) * 100
        : 0

    // System health: 100% minus a penalty per unresolved alert.
    const criticalImpact = criticalAlerts * 5
    const otherAlertsImpact = Math.max(0, totalActiveAlerts - criticalAlerts) * 1
    const systemHealth = Math.max(0, Math.min(100, 100 - criticalImpact - otherAlertsImpact))

    // ---- Alerts feed ----
    const { data: alertRows, error: alertErr } = await supabaseAdmin
      .from('alerts')
      .select('id, severity, title, message, created_at, resolved')
      .order('created_at', { ascending: false })
      .limit(10)
    if (alertErr) throw new Error(`alerts: ${alertErr.message}`)

    const alerts = (alertRows || []).map(a => ({
      id: a.id,
      type:
        a.severity === 'critical' || a.severity === 'high'
          ? 'error'
          : a.severity === 'medium'
            ? 'warning'
            : 'info',
      title: a.title,
      message: a.message,
      timestamp: a.created_at,
      resolved: a.resolved || false,
    }))

    return NextResponse.json({
      stats: {
        totalAcademies,
        activeAcademies,
        totalUsers,
        monthlyRevenue,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        activeSubscriptions,
        trialAcademies,
        supportTickets,
        urgentTickets,
        normalTickets,
        systemHealth: Math.round(systemHealth * 10) / 10,
        servicesOperational: criticalAlerts === 0,
        academiesTrend,
        usersTrend,
        subscriptionsTrend,
        revenueTrend,
        academiesGrowth: Math.round(pctChange(academiesTrend) * 10) / 10,
        usersGrowth: Math.round(pctChange(usersTrend) * 10) / 10,
        subscriptionsGrowth: Math.round(pctChange(subscriptionsTrend) * 10) / 10,
      },
      alerts,
    })
  } catch (e) {
    console.error('[Admin dashboard API] Error:', e)
    return NextResponse.json(
      { error: 'Failed to load dashboard data', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
