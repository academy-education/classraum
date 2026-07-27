import { create } from 'zustand'
import { db } from '@/lib/supabase'

interface TrendData {
  date: string
  value: number
}

interface DashboardFilters {
  dateRange: 'week' | 'month' | 'quarter' | 'year' | 'custom'
  startDate?: string
  endDate?: string
  showComparison: boolean
}

interface DashboardMetrics {
  // User metrics
  userTrends: {
    managers: TrendData[]
    teachers: TrendData[]
    parents: TrendData[]
    students: TrendData[]
  }
  userGrowth: {
    total: number
    percentageChange: number
    isPositive: boolean
  }
  
  // Classroom metrics
  classroomTrends: TrendData[]
  classroomGrowth: {
    total: number
    percentageChange: number
    isPositive: boolean
  }
  
  // Session metrics
  sessionTrends: TrendData[]
  sessionStats: {
    upcoming: number
    completed: number
    cancelled: number
  }
  
  // Revenue metrics
  revenueTrends: TrendData[]
  revenueStats: {
    total: number
    pending: number
    percentageChange: number
    isPositive: boolean
  }
}

interface DashboardState {
  // Data
  metrics: DashboardMetrics | null
  filters: DashboardFilters
  
  // Loading states
  loading: boolean
  refreshing: boolean
  error: string | null
  lastUpdated: string | null
  
  // Actions
  setFilters: (filters: Partial<DashboardFilters>) => void
  fetchDashboardData: (academyId: string) => Promise<void>
  refreshDashboard: (academyId: string) => Promise<void>
  clearDashboard: () => void
}

const defaultFilters: DashboardFilters = {
  dateRange: 'month',
  showComparison: true
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Initial state
  metrics: null,
  filters: defaultFilters,
  loading: false,
  refreshing: false,
  error: null,
  lastUpdated: null,

  // Actions
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),

  fetchDashboardData: async (academyId) => {
    const { loading, refreshing } = get()
    if (loading || refreshing) return

    set({ loading: true, error: null })

    try {
      const { filters } = get()
      
      // Calculate date range
      const endDate = new Date()
      let startDate = new Date()
      
      switch (filters.dateRange) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7)
          break
        case 'month':
          startDate.setDate(endDate.getDate() - 30)
          break
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3)
          break
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
        case 'custom':
          if (filters.startDate) startDate = new Date(filters.startDate)
          if (filters.endDate) endDate.setTime(new Date(filters.endDate).getTime())
          break
      }

      // Fetch all metrics in parallel using optimized queries
      const [
        userMetrics,
        classroomMetrics,
        sessionMetrics,
        revenueMetrics
      ] = await Promise.all([
        fetchUserMetrics(academyId, startDate, endDate),
        fetchClassroomMetrics(academyId, startDate, endDate),
        fetchSessionMetrics(academyId, startDate, endDate),
        fetchRevenueMetrics(academyId, startDate, endDate)
      ])

      set({
        metrics: {
          userTrends: userMetrics.trends,
          userGrowth: userMetrics.growth,
          classroomTrends: classroomMetrics.trends,
          classroomGrowth: classroomMetrics.growth,
          sessionTrends: sessionMetrics.trends,
          sessionStats: sessionMetrics.stats,
          revenueTrends: revenueMetrics.trends,
          revenueStats: revenueMetrics.stats
        },
        loading: false,
        lastUpdated: new Date().toISOString()
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
        loading: false
      })
    }
  },

  refreshDashboard: async (academyId) => {
    set({ refreshing: true })
    await get().fetchDashboardData(academyId)
    set({ refreshing: false })
  },

  clearDashboard: () => set({
    metrics: null,
    filters: defaultFilters,
    loading: false,
    refreshing: false,
    error: null,
    lastUpdated: null
  })
}))

// ---------------------------------------------------------------------------
// Metric helpers
//
// These previously called four RPCs — get_user_trends, get_classroom_trends,
// get_session_metrics and get_revenue_metrics — none of which exist in the
// database. Confirmed against pg_proc: every call returned PGRST202 (function
// not found), each helper threw, and fetchDashboardData landed in its catch on
// every single invocation. `metrics` was therefore permanently null and the
// store only ever produced an error string. Typing the client is what surfaced
// it: the RPC names are not in Database['public']['Functions'].
//
// They are reimplemented here as direct table reads against the real schema.
// ---------------------------------------------------------------------------

// A single PostgREST response is capped at 1000 rows, so every trend query
// pages. Otherwise a busy academy silently under-reports past the first page.
const PAGE_SIZE = 1000

async function fetchAllRows<T>(
  fetchPage: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const all: T[] = []
  for (let page = 0; ; page++) {
    const from = page * PAGE_SIZE
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1)
    // Throw rather than return a partial list: a truncated trend that looks
    // complete is worse than a visible failure.
    if (error) throw new Error(error.message)
    const rows = data ?? []
    all.push(...rows)
    if (rows.length < PAGE_SIZE) break
  }
  return all
}

/** The comparison window is the same length, immediately before the current one. */
function previousWindow(startDate: Date, endDate: Date): { start: Date; end: Date } {
  const span = endDate.getTime() - startDate.getTime()
  return { start: new Date(startDate.getTime() - span), end: startDate }
}

function growthFrom(current: number, previous: number) {
  // With no previous activity there is no meaningful percentage; report 0%
  // rather than infinity. `total` still carries the real current figure.
  const percentageChange = previous > 0 ? ((current - previous) / previous) * 100 : 0
  return {
    total: current,
    percentageChange: Math.abs(percentageChange),
    isPositive: percentageChange >= 0
  }
}

/** Buckets `{ day, amount }` pairs into a date-ascending TrendData series. */
function bucketByDay(entries: Array<{ day: string; amount: number }>): TrendData[] {
  const totals = new Map<string, number>()
  for (const { day, amount } of entries) {
    totals.set(day, (totals.get(day) ?? 0) + amount)
  }
  return Array.from(totals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))
}

const ROLE_TABLES = ['managers', 'teachers', 'parents', 'students'] as const
type RoleTable = (typeof ROLE_TABLES)[number]

/**
 * Rows created in [start, end) for one role table. `.gte('created_at', ...)`
 * excludes NULLs in Postgres, so every row this returns has a non-null
 * created_at — which is why the caller can bucket it without a null branch.
 */
async function fetchRoleCreatedAt(
  table: RoleTable,
  academyId: string,
  start: Date,
  end: Date
): Promise<string[]> {
  const rows = await fetchAllRows<{ created_at: string | null }>((from, to) =>
    db
      .from(table)
      .select('created_at')
      .eq('academy_id', academyId)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .order('created_at', { ascending: true })
      .range(from, to)
  )
  // Narrowing, not defaulting: the gte filter above already excluded NULLs,
  // so this drops nothing in practice and never invents a date.
  return rows
    .map(r => r.created_at)
    .filter((v): v is string => v !== null)
}

async function fetchUserMetrics(academyId: string, startDate: Date, endDate: Date) {
  const previous = previousWindow(startDate, endDate)

  const [current, prior] = await Promise.all([
    Promise.all(
      ROLE_TABLES.map(t => fetchRoleCreatedAt(t, academyId, startDate, endDate))
    ),
    Promise.all(
      ROLE_TABLES.map(t => fetchRoleCreatedAt(t, academyId, previous.start, previous.end))
    )
  ])

  const [managers, teachers, parents, students] = current.map(dates =>
    bucketByDay(dates.map(d => ({ day: d.slice(0, 10), amount: 1 })))
  )

  const currentTotal = current.reduce((n, dates) => n + dates.length, 0)
  const previousTotal = prior.reduce((n, dates) => n + dates.length, 0)

  return {
    trends: { managers, teachers, parents, students },
    growth: growthFrom(currentTotal, previousTotal)
  }
}

async function fetchClassroomMetrics(academyId: string, startDate: Date, endDate: Date) {
  const previous = previousWindow(startDate, endDate)

  const page =
    (start: Date, end: Date) =>
    (from: number, to: number) =>
      db
        .from('classrooms')
        .select('created_at')
        .eq('academy_id', academyId)
        .is('deleted_at', null)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())
        .order('created_at', { ascending: true })
        .range(from, to)

  const [current, prior] = await Promise.all([
    fetchAllRows<{ created_at: string | null }>(page(startDate, endDate)),
    fetchAllRows<{ created_at: string | null }>(page(previous.start, previous.end))
  ])

  // As above: the gte filter guarantees created_at is non-null here.
  const days = current
    .map(r => r.created_at)
    .filter((v): v is string => v !== null)
    .map(d => ({ day: d.slice(0, 10), amount: 1 }))

  return {
    trends: bucketByDay(days),
    growth: growthFrom(current.length, prior.length)
  }
}

async function fetchSessionMetrics(academyId: string, startDate: Date, endDate: Date) {
  // classroom_sessions has no academy_id; it is scoped through its classroom.
  // `date` is a DATE column, so the window is compared as YYYY-MM-DD.
  const from = startDate.toISOString().slice(0, 10)
  const until = endDate.toISOString().slice(0, 10)

  const rows = await fetchAllRows<{ date: string; status: string }>((rangeFrom, rangeTo) =>
    db
      .from('classroom_sessions')
      .select('date, status, classrooms!inner(academy_id)')
      .eq('classrooms.academy_id', academyId)
      .is('deleted_at', null)
      .gte('date', from)
      .lte('date', until)
      .order('date', { ascending: true })
      .range(rangeFrom, rangeTo)
  )

  // classroom_sessions.status is CHECK-constrained to exactly these three
  // values. 'upcoming' is this window's scheduled sessions.
  const countOf = (status: string) => rows.filter(r => r.status === status).length

  return {
    trends: bucketByDay(rows.map(r => ({ day: r.date, amount: 1 }))),
    stats: {
      upcoming: countOf('scheduled'),
      completed: countOf('completed'),
      cancelled: countOf('cancelled')
    }
  }
}

async function fetchRevenueMetrics(academyId: string, startDate: Date, endDate: Date) {
  const previous = previousWindow(startDate, endDate)

  // Academy revenue lives in `invoices` (academy_id + final_amount) — what the
  // academy bills its students. Paid revenue is dated by paid_at.
  const paidPage =
    (start: Date, end: Date) =>
    (from: number, to: number) =>
      db
        .from('invoices')
        .select('paid_at, final_amount')
        .eq('academy_id', academyId)
        .eq('status', 'paid')
        .is('deleted_at', null)
        .gte('paid_at', start.toISOString())
        .lt('paid_at', end.toISOString())
        .order('paid_at', { ascending: true })
        .range(from, to)

  const [paid, priorPaid, pending] = await Promise.all([
    fetchAllRows<{ paid_at: string | null; final_amount: number }>(
      paidPage(startDate, endDate)
    ),
    fetchAllRows<{ paid_at: string | null; final_amount: number }>(
      paidPage(previous.start, previous.end)
    ),
    // Pending invoices have no paid_at, so they are windowed by created_at
    // (NOT NULL in the schema).
    fetchAllRows<{ final_amount: number }>((from, to) =>
      db
        .from('invoices')
        .select('final_amount')
        .eq('academy_id', academyId)
        .eq('status', 'pending')
        .is('deleted_at', null)
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())
        .order('created_at', { ascending: true })
        .range(from, to)
    )
  ])

  const sum = (rows: Array<{ final_amount: number }>) =>
    rows.reduce((total, r) => total + r.final_amount, 0)

  const total = sum(paid)
  const previousTotal = sum(priorPaid)

  // The gte('paid_at') filter guarantees paid_at is non-null on these rows.
  const days = paid
    .filter((r): r is { paid_at: string; final_amount: number } => r.paid_at !== null)
    .map(r => ({ day: r.paid_at.slice(0, 10), amount: r.final_amount }))

  const growth = growthFrom(total, previousTotal)

  return {
    trends: bucketByDay(days),
    stats: {
      total,
      pending: sum(pending),
      percentageChange: growth.percentageChange,
      isPositive: growth.isPositive
    }
  }
}
