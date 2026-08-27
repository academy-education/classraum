import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireAdmin, countRows } from '../_lib/admin-auth'
import { includeTestRequested, realAcademyIds, realAcademyUserIds, testAcademySummary } from '../_lib/test-academies'
import { settle, withRetry, valueOrNull, type Settled } from '../_lib/resilience'
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
 * `countRows`). A failed count must never be indistinguishable from an empty
 * platform — that constraint is unchanged and is why nothing below ever
 * falls back to a zero.
 *
 * What DID change (2026-08-24) is the blast radius. Every read used to sit
 * in one `Promise.all` under one `try`, so a single `TypeError: fetch
 * failed` on one of the ten sparkline buckets returned 500 and blanked the
 * whole page:
 *
 *     Failed to load dashboard data
 *     count(users_trend_2026-08-13) failed: TypeError: fetch failed
 *
 * At ~40 requests per load that is not a rare event. Now:
 *
 *   · every read is wrapped in `withRetry`, which retries transient faults
 *     (network) and does NOT retry deterministic ones (bad table, denied);
 *   · the reads are grouped into SECTIONS, one per dashboard tile, each run
 *     through `settle`. A section that still fails yields `null` for its
 *     fields and its name in `degraded[]`. The client renders that one tile
 *     as unavailable and keeps the rest of the page.
 *
 * `null` is load-bearing: it is the value that says "we do not know", which
 * is a different fact from 0. See _lib/resilience.ts.
 */
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  /* Demo and seed academies are excluded unless the caller asks for
     them (?includeTest=1 — the panel's "show test data" switch).
     MEASURED 2026-08-26, this is not a rounding difference: 12 academies
     shown where 2 are real, 449 users where 43 belong to a real academy,
     194 students where 32 do. A dashboard reporting fixtures as
     performance is worse than one reporting nothing.

     `realIds === null` means DO NOT FILTER — either the caller asked to
     see everything, or the lookup failed. Failing toward showing too
     much is deliberate: an inflated number an admin can explain beats a
     deflated one that quietly hides a paying customer. */
  const includeTest = includeTestRequested(request)
  const [realIds, realUserIds] = await Promise.all([
    realAcademyIds(includeTest),
    realAcademyUserIds(includeTest),
  ])
  const academyScope = <Q extends { in: (c: string, v: string[]) => Q }>(q: Q, column: string): Q =>
    realIds === null ? q : q.in(column, realIds)

  const head = (table: TableName) =>
    dbAdmin.from(table).select('*', { count: 'exact', head: true })

  /** A count that retries a transient fault before giving up. */
  const count = (build: () => ReturnType<typeof head>, label: string) =>
    withRetry(() => countRows(build, label), { label })

  // ---- 10-day trend window (shared by three sections) ----
  const last10Days = Array.from({ length: 10 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (9 - i))
    return d.toISOString().split('T')[0]
  })

  const cumulativeTrend = (
    table: TableName,
    apply?: (q: ReturnType<typeof head>) => ReturnType<typeof head>
  ) =>
    Promise.all(
      last10Days.map(date =>
        count(() => {
          const base = head(table)
          return (apply ? apply(base) : base).lte('created_at', `${date}T23:59:59`)
        }, `${table}_trend_${date}`)
      )
    )

  const pctChange = (series: number[]) =>
    series.length > 1
      ? ((series[series.length - 1] - series[0]) / Math.max(series[0], 1)) * 100
      : 0

  const datedRows = async (
    table: 'study_payments' | 'study_payment_refunds',
    fromIso: string,
    toIso: string
  ): Promise<DatedAmount[]> => {
    const out: DatedAmount[] = []
    const CHUNK = 1000
    for (let from = 0; ; from += CHUNK) {
      const { data, error } = await withRetry(
        async () =>
          await dbAdmin
            .from(table)
            .select('amount_won, created_at')
            .gte('created_at', fromIso)
            .lt('created_at', toIso)
            .order('created_at')
            .range(from, from + CHUNK - 1),
        { label: `${table}[${from}]` }
      )
      if (error) throw new Error(`${table}: ${error.message}`)
      const rows = data || []
      out.push(...rows.map(r => ({ amountWon: r.amount_won, at: r.created_at })))
      if (rows.length < CHUNK) break
    }
    return out
  }

  // ─────────────────────── Sections ───────────────────────
  //
  // One `settle` per dashboard TILE. The grouping is deliberate: a tile's
  // headline number, its sparkline and its growth figure share a section so
  // they cannot disagree — you never get a live number beside a stale trend.
  // Sections are independent, so a failure costs exactly one tile.

  const academiesSection = settle('academies', async () => {
    const [total, trend, activeAcademyRows] = await Promise.all([
      count(() => academyScope(head('academies'), 'id'), 'academies'),
      cumulativeTrend('academies', q => academyScope(q, 'id')),
      // Distinct academies carrying an active/trialing subscription.
      withRetry(
        async () => {
          const q = dbAdmin
            .from('academy_subscriptions')
            .select('academy_id')
            .in('status', ['active', 'trialing'])
          const { data, error } = await (realIds === null ? q : q.in('academy_id', realIds))
          if (error) throw new Error(`active academies: ${error.message}`)
          return data || []
        },
        { label: 'active_academies' }
      ),
    ])
    return {
      totalAcademies: total,
      activeAcademies: new Set(activeAcademyRows.map(r => r.academy_id)).size,
      academiesTrend: trend,
      academiesGrowth: Math.round(pctChange(trend) * 10) / 10,
    }
  })

  const usersSection = settle('users', async () => {
    const [total, trend] = await Promise.all([
      count(() => (realUserIds === null ? head('users') : head('users').in('id', realUserIds)), 'users'),
      cumulativeTrend('users', q => (realUserIds === null ? q : q.in('id', realUserIds))),
    ])
    return {
      totalUsers: total,
      usersTrend: trend,
      usersGrowth: Math.round(pctChange(trend) * 10) / 10,
    }
  })

  const subscriptionsSection = settle('subscriptions', async () => {
    const [active, trial, trend] = await Promise.all([
      count(
        () => head('academy_subscriptions').in('status', ['active', 'trialing']),
        'active_subscriptions'
      ),
      count(() => head('academy_subscriptions').eq('status', 'trialing'), 'trial_subscriptions'),
      cumulativeTrend('academy_subscriptions', q => q.in('status', ['active', 'trialing'])),
    ])
    return {
      activeSubscriptions: active,
      trialAcademies: trial,
      subscriptionsTrend: trend,
      subscriptionsGrowth: Math.round(pctChange(trend) * 10) / 10,
    }
  })

  // ---- Support: count what the Support PAGE shows ----
  //
  // These three counts used to read `support_tickets`, which is EMPTY (0
  // rows) and has been for the life of the table. The admin Support page
  // (SupportManagement.tsx) has always read `chat_conversations`, and lists
  // 5 conversations there. So the dashboard KPI and the sidebar badge both
  // showed "0 support tickets" while the page one click away listed five
  // open conversations.
  //
  // The page's own header cards define the vocabulary, and this matches them
  // exactly: "active" is `status <> 'closed'` there, so it is
  // `status <> 'closed'` here. `support_tickets` is not consulted at all — a
  // table nobody writes to cannot be the source for a headline number.
  const supportSection = settle('support', async () => {
    const [open, unread, closed] = await Promise.all([
      count(() => head('chat_conversations').neq('status', 'closed'), 'support_conversations'),
      // Unread is defined by the page as messages FROM THE USER that are
      // still is_read = false — the same predicate, not a re-invention.
      count(
        () => head('chat_messages').eq('is_read', false).eq('sender_type', 'user'),
        'unread_support_messages'
      ),
      count(() => head('chat_conversations').eq('status', 'closed'), 'closed_support_conversations'),
    ])
    return { supportTickets: open, unreadSupportTickets: unread, closedSupportTickets: closed }
  })

  const healthSection = settle('health', async () => {
    const [critical, totalActive] = await Promise.all([
      count(
        () => head('alerts').eq('resolved', false).in('severity', ['critical', 'high']),
        'critical_alerts'
      ),
      count(() => head('alerts').eq('resolved', false), 'active_alerts'),
    ])
    // 100% minus a penalty per unresolved alert.
    const systemHealth = Math.max(
      0,
      Math.min(100, 100 - critical * 5 - Math.max(0, totalActive - critical) * 1)
    )
    return {
      systemHealth: Math.round(systemHealth * 10) / 10,
      servicesOperational: critical === 0,
    }
  })

  // ---- Revenue: this month vs last month, plus the 10-day sparkline ----
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
  const revenueSection = settle('revenue', async () => {
    // lastNMonthsKST returns OLDEST FIRST, so index 0 is last month.
    const [lastMonth, thisMonth] = lastNMonthsKST(2)

    const trendWindowStart = new Date(`${last10Days[0]}T00:00:00+09:00`).toISOString()
    const trendWindowEnd = new Date(
      new Date(`${last10Days[last10Days.length - 1]}T00:00:00+09:00`).getTime() +
        24 * 60 * 60 * 1000
    ).toISOString()

    const [twoMonthPayments, twoMonthRefunds, windowPayments, windowRefunds] = await Promise.all([
      datedRows('study_payments', lastMonth.startIso, thisMonth.endIso),
      datedRows('study_payment_refunds', lastMonth.startIso, thisMonth.endIso),
      datedRows('study_payments', trendWindowStart, trendWindowEnd),
      datedRows('study_payment_refunds', trendWindowStart, trendWindowEnd),
    ])

    const [lastMonthRevenue, monthlyRevenue] = monthlyNetRevenueKST(
      [lastMonth, thisMonth],
      twoMonthPayments,
      twoMonthRefunds
    )

    const revenueGrowth =
      lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

    // The sparkline in the same card comes from the same source as the
    // headline number, for the same reason. Daily buckets, KST, net of
    // refunds — one query over the 10-day window, bucketed in JS.
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
    add(windowPayments, 1)
    add(windowRefunds, -1)

    return {
      monthlyRevenue,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      revenueTrend: last10Days.map(d => byDay.get(d) || 0),
    }
  })

  const alertsSection = settle('alerts', async () => {
    const { data, error } = await withRetry(
      async () =>
        await dbAdmin
          .from('alerts')
          .select('id, severity, title, message, created_at, resolved')
          .order('created_at', { ascending: false })
          .limit(10),
      { label: 'alerts_feed' }
    )
    if (error) throw new Error(`alerts: ${error.message}`)
    return (data || []).map(a => ({
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
  })

  const [academies, users, subscriptions, support, health, revenue, alerts] = await Promise.all([
    academiesSection,
    usersSection,
    subscriptionsSection,
    supportSection,
    healthSection,
    revenueSection,
    alertsSection,
  ])

  const sections: Record<string, Settled<unknown>> = {
    academies,
    users,
    subscriptions,
    support,
    health,
    revenue,
    alerts,
  }
  const degraded = Object.entries(sections)
    .filter(([, s]) => !s.ok)
    .map(([name, s]) => ({ section: name, detail: (s as { error: string }).error }))

  // Null, never zero. A tile with a null field renders "unavailable"; a
  // tile with 0 renders 0, and those must stay different facts.
  const nulls = <T extends Record<string, unknown>>(keys: readonly (keyof T)[]) =>
    Object.fromEntries(keys.map(k => [k, null])) as { [K in keyof T]: null }

  return NextResponse.json({
    stats: {
      ...(valueOrNull(academies) ??
        nulls<{
          totalAcademies: number
          activeAcademies: number
          academiesTrend: number[]
          academiesGrowth: number
        }>(['totalAcademies', 'activeAcademies', 'academiesTrend', 'academiesGrowth'])),
      ...(valueOrNull(users) ??
        nulls<{ totalUsers: number; usersTrend: number[]; usersGrowth: number }>([
          'totalUsers',
          'usersTrend',
          'usersGrowth',
        ])),
      ...(valueOrNull(subscriptions) ??
        nulls<{
          activeSubscriptions: number
          trialAcademies: number
          subscriptionsTrend: number[]
          subscriptionsGrowth: number
        }>([
          'activeSubscriptions',
          'trialAcademies',
          'subscriptionsTrend',
          'subscriptionsGrowth',
        ])),
      ...(valueOrNull(support) ??
        nulls<{
          supportTickets: number
          unreadSupportTickets: number
          closedSupportTickets: number
        }>(['supportTickets', 'unreadSupportTickets', 'closedSupportTickets'])),
      ...(valueOrNull(health) ??
        nulls<{ systemHealth: number; servicesOperational: boolean }>([
          'systemHealth',
          'servicesOperational',
        ])),
      ...(valueOrNull(revenue) ??
        nulls<{ monthlyRevenue: number; revenueGrowth: number; revenueTrend: number[] }>([
          'monthlyRevenue',
          'revenueGrowth',
          'revenueTrend',
        ])),
    },
    alerts: valueOrNull(alerts),
    degraded,
  })
}
