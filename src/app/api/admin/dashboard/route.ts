import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireAdmin, countRows } from '../_lib/admin-auth'
import type { Database } from '@/lib/database.types'
import { lastNMonthsKST, monthlyNetRevenueKST, type DatedAmount } from '@/lib/admin/revenue'

/**
 * The `head()` helper below takes a table name dynamically. Under the typed
 * client a bare `string` is not a table name, so it is constrained to the
 * real set — a typo like `student_payments` (a table that never existed) is
 * now a compile error instead of a PostgREST 404 that renders as a zero.
 */
/**
 * Only the tables this route counts — NOT the full
 * `keyof Database['public']['Tables']`.
 *
 * The wide union made TypeScript instantiate a query builder for all 96
 * tables at each call site and it gave up with TS2589 ("type
 * instantiation is excessively deep"). Narrowing keeps the guarantee
 * that matters — a table name that does not exist is still a compile
 * error, which is what would have caught `student_payments` — while
 * staying cheap to check. Add a name here when this route counts a new
 * table.
 */
type TableName = Extract<
  keyof Database['public']['Tables'],
  'academies' | 'users' | 'academy_subscriptions' | 'chat_conversations' | 'chat_messages' | 'alerts'
>

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
    const head = (table: TableName) =>
      dbAdmin.from(table).select('*', { count: 'exact', head: true })

    const [
      totalAcademies,
      totalUsers,
      activeSubscriptions,
      trialAcademies,
      supportTickets,
      unreadSupportTickets,
      closedSupportTickets,
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
      // ---- Support: count what the Support PAGE shows ----
      //
      // These three counts read `support_tickets`, which is EMPTY (0 rows)
      // and has been for the life of the table. The admin Support page
      // (SupportManagement.tsx) has always read `chat_conversations`, and
      // lists 5 conversations there. So the dashboard KPI and the sidebar
      // badge both showed "0 support tickets" while the page one click away
      // listed five open conversations.
      //
      // The page's own header cards define the vocabulary, and this now
      // matches them exactly: "active" is `status <> 'closed'` there, so it
      // is `status <> 'closed'` here. `support_tickets` is not consulted at
      // all — a table nobody writes to cannot be the source for a headline
      // number.
      countRows(
        () => head('chat_conversations').neq('status', 'closed'),
        'support_conversations'
      ),
      // Unread is defined by the page as messages FROM THE USER that are
      // still is_read = false — the same predicate, not a re-invention.
      countRows(
        () => head('chat_messages').eq('is_read', false).eq('sender_type', 'user'),
        'unread_support_messages'
      ),
      countRows(
        () => head('chat_conversations').eq('status', 'closed'),
        'closed_support_conversations'
      ),
      countRows(
        () => head('alerts').eq('resolved', false).in('severity', ['critical', 'high']),
        'critical_alerts'
      ),
      countRows(() => head('alerts').eq('resolved', false), 'active_alerts'),
    ])

    // Distinct academies carrying an active/trialing subscription.
    const { data: activeAcademyRows, error: activeAcademyErr } = await dbAdmin
      .from('academy_subscriptions')
      .select('academy_id')
      .in('status', ['active', 'trialing'])
    if (activeAcademyErr) throw new Error(`active academies: ${activeAcademyErr.message}`)
    const activeAcademies = new Set((activeAcademyRows || []).map(r => r.academy_id)).size

    // ---- Revenue: this month vs last month ----
    //
    // SOURCE OF TRUTH: study payments minus the refund ledger, bucketed by
    // KST calendar month — the SAME aggregation the chart directly beneath
    // this KPI uses (@/lib/admin/revenue, unit-tested).
    //
    // This KPI used to sum `invoices.final_amount` where status = 'paid'.
    // `invoices` is academy→student billing — money a hagwon collects from
    // its own parents — NOT money Classraum received; charts/route.ts says
    // so in its own header comment. Worse, it cut the month at server-local
    // midnight (UTC on Vercel), so late-evening KST payments landed in the
    // wrong month.
    //
    // The visible symptom was a KPI reading "Monthly revenue ₩0" sitting
    // directly above a chart reading ₩119,400 for the same month, on the
    // same screen. A KPI and the chart under it must not be able to
    // disagree; the only way to guarantee that is one source, not two that
    // happen to agree today.
    // lastNMonthsKST returns OLDEST FIRST, so index 0 is last month.
    const [lastMonth, thisMonth] = lastNMonthsKST(2)

    const datedRows = async (
      table: 'study_payments' | 'study_payment_refunds',
      fromIso: string,
      toIso: string
    ): Promise<DatedAmount[]> => {
      const out: DatedAmount[] = []
      const CHUNK = 1000
      for (let from = 0; ; from += CHUNK) {
        const { data, error } = await dbAdmin
          .from(table)
          .select('amount_won, created_at')
          .gte('created_at', fromIso)
          .lt('created_at', toIso)
          .order('created_at')
          .range(from, from + CHUNK - 1)
        if (error) throw new Error(`${table}: ${error.message}`)
        const rows = data || []
        out.push(...rows.map(r => ({ amountWon: r.amount_won, at: r.created_at })))
        if (rows.length < CHUNK) break
      }
      return out
    }

    const [twoMonthPayments, twoMonthRefunds] = await Promise.all([
      datedRows('study_payments', lastMonth.startIso, thisMonth.endIso),
      datedRows('study_payment_refunds', lastMonth.startIso, thisMonth.endIso),
    ])

    const [lastMonthRevenue, monthlyRevenue] = monthlyNetRevenueKST(
      [lastMonth, thisMonth],
      twoMonthPayments,
      twoMonthRefunds
    )

    const revenueGrowth =
      lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

    // ---- 10-day trends ----
    const last10Days = Array.from({ length: 10 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (9 - i))
      return d.toISOString().split('T')[0]
    })

    const cumulativeTrend = (table: TableName, apply?: (q: ReturnType<typeof head>) => ReturnType<typeof head>) =>
      Promise.all(
        last10Days.map(date =>
          countRows(() => {
            const base = head(table)
            return (apply ? apply(base) : base).lte('created_at', `${date}T23:59:59`)
          }, `${table}_trend_${date}`)
        )
      )

    // The sparkline in the same card must come from the same source as the
    // headline number, for the same reason. Daily buckets, KST, net of
    // refunds — one query over the 10-day window, bucketed in JS.
    const trendWindowStart = new Date(`${last10Days[0]}T00:00:00+09:00`).toISOString()
    const trendWindowEnd = new Date(
      new Date(`${last10Days[last10Days.length - 1]}T00:00:00+09:00`).getTime() + 24 * 60 * 60 * 1000
    ).toISOString()

    const revenueTrendPromise = (async () => {
      const [payments, refunds] = await Promise.all([
        datedRows('study_payments', trendWindowStart, trendWindowEnd),
        datedRows('study_payment_refunds', trendWindowStart, trendWindowEnd),
      ])
      const KST_OFFSET_MS = 9 * 60 * 60 * 1000
      const dayKey = (iso: string) =>
        new Date(Date.parse(iso) + KST_OFFSET_MS).toISOString().split('T')[0]
      const byDay = new Map(last10Days.map(d => [d, 0]))
      const add = (rows: DatedAmount[], sign: 1 | -1) => {
        for (const r of rows) {
          if (!r.at) continue
          const k = dayKey(r.at)
          if (!byDay.has(k)) continue
          byDay.set(k, (byDay.get(k) || 0) + sign * (r.amountWon ?? 0))
        }
      }
      add(payments, 1)
      add(refunds, -1)
      return last10Days.map(d => byDay.get(d) || 0)
    })()

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
    const { data: alertRows, error: alertErr } = await dbAdmin
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
        unreadSupportTickets,
        closedSupportTickets,
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
