import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

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

// Helper functions for fetching specific metrics
async function fetchUserMetrics(academyId: string, startDate: Date, endDate: Date) {
  // Fetch user creation data grouped by date and type
  const { data, error } = await supabase
    .rpc('get_user_trends', {
      p_academy_id: academyId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString()
    })

  if (error) throw error

  // Process the data into trends
  const trends = {
    managers: [] as TrendData[],
    teachers: [] as TrendData[],
    parents: [] as TrendData[],
    students: [] as TrendData[]
  }

  // Calculate growth
  const currentTotal = data?.current_total || 0
  const previousTotal = data?.previous_total || 0
  const percentageChange = previousTotal > 0 
    ? ((currentTotal - previousTotal) / previousTotal) * 100 
    : 0

  return {
    trends,
    growth: {
      total: currentTotal,
      percentageChange: Math.abs(percentageChange),
      isPositive: percentageChange >= 0
    }
  }
}

async function fetchClassroomMetrics(academyId: string, startDate: Date, endDate: Date) {
  const { data, error } = await supabase
    .rpc('get_classroom_trends', {
      p_academy_id: academyId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString()
    })

  if (error) throw error

  return {
    trends: data?.trends || [],
    growth: {
      total: data?.current_total || 0,
      percentageChange: Math.abs(data?.percentage_change || 0),
      isPositive: (data?.percentage_change || 0) >= 0
    }
  }
}

async function fetchSessionMetrics(academyId: string, startDate: Date, endDate: Date) {
  const { data, error } = await supabase
    .rpc('get_session_metrics', {
      p_academy_id: academyId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString()
    })

  if (error) throw error

  return {
    trends: data?.trends || [],
    stats: {
      upcoming: data?.upcoming || 0,
      completed: data?.completed || 0,
      cancelled: data?.cancelled || 0
    }
  }
}

async function fetchRevenueMetrics(academyId: string, startDate: Date, endDate: Date) {
  const { data, error } = await supabase
    .rpc('get_revenue_metrics', {
      p_academy_id: academyId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString()
    })

  if (error) throw error

  return {
    trends: data?.trends || [],
    stats: {
      total: data?.total || 0,
      pending: data?.pending || 0,
      percentageChange: Math.abs(data?.percentage_change || 0),
      isPositive: (data?.percentage_change || 0) >= 0
    }
  }
}