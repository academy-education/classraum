import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { showSuccessToast, showErrorToast } from '@/stores'
import type {
  AcademyStats,
  SessionAnalytics,
  AssignmentAnalytics,
  UserGrowthTrends,
  ClassroomUtilization,
  NotificationAnalytics,
  PaymentAnalytics,
  RecurringTemplateAnalytics,
  RevenueTrends,
  StudentPaymentBehavior,
  DashboardFilters,
  MaterializedViewResponse,
  RefreshStatus,
  TimePeriod
} from '@/lib/types/materializedViews'

// Query key factory for materialized views
export const materializedViewKeys = {
  all: ['materialized-views'] as const,
  academyStats: (academyId: string) => [...materializedViewKeys.all, 'academy-stats', academyId] as const,
  sessionAnalytics: (academyId: string, period: TimePeriod) => 
    [...materializedViewKeys.all, 'session-analytics', academyId, period] as const,
  assignmentAnalytics: (academyId: string, period: TimePeriod) => 
    [...materializedViewKeys.all, 'assignment-analytics', academyId, period] as const,
  userGrowthTrends: (academyId: string, period: TimePeriod) => 
    [...materializedViewKeys.all, 'user-growth', academyId, period] as const,
  classroomUtilization: (academyId: string) => 
    [...materializedViewKeys.all, 'classroom-utilization', academyId] as const,
  notificationAnalytics: (academyId: string, period: TimePeriod) => 
    [...materializedViewKeys.all, 'notification-analytics', academyId, period] as const,
  paymentAnalytics: (academyId: string, period: TimePeriod) => 
    [...materializedViewKeys.all, 'payment-analytics', academyId, period] as const,
  recurringTemplateAnalytics: (academyId: string) => 
    [...materializedViewKeys.all, 'recurring-template-analytics', academyId] as const,
  revenueTrends: (academyId: string, period: TimePeriod) => 
    [...materializedViewKeys.all, 'revenue-trends', academyId, period] as const,
  studentPaymentBehavior: (academyId: string) => 
    [...materializedViewKeys.all, 'student-payment-behavior', academyId] as const,
  refreshStatus: () => [...materializedViewKeys.all, 'refresh-status'] as const,
}

// =====================================================
// Individual Materialized View Hooks
// =====================================================

// Academy Statistics
export const useAcademyStats = (academyId: string) => {
  return useQuery({
    queryKey: materializedViewKeys.academyStats(academyId),
    queryFn: async (): Promise<AcademyStats> => {
      const { data, error } = await supabase
        .from('mv_academy_stats')
        .select('*')
        .eq('academy_id', academyId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!academyId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Session Analytics
export const useSessionAnalytics = (academyId: string, period: TimePeriod = 'month') => {
  return useQuery({
    queryKey: materializedViewKeys.sessionAnalytics(academyId, period),
    queryFn: async (): Promise<SessionAnalytics[]> => {
      const startDate = getStartDateForPeriod(period)
      
      const { data, error } = await supabase
        .from('mv_session_analytics')
        .select('*')
        .eq('academy_id', academyId)
        .gte('date', startDate)
        .order('date', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!academyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Assignment Analytics
export const useAssignmentAnalytics = (academyId: string, period: TimePeriod = 'month') => {
  return useQuery({
    queryKey: materializedViewKeys.assignmentAnalytics(academyId, period),
    queryFn: async (): Promise<AssignmentAnalytics[]> => {
      const startDate = getStartDateForPeriod(period)
      
      const { data, error } = await supabase
        .from('mv_assignment_analytics')
        .select('*')
        .eq('academy_id', academyId)
        .gte('date', startDate)
        .order('date', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!academyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// User Growth Trends
export const useUserGrowthTrends = (academyId: string, period: TimePeriod = 'month') => {
  return useQuery({
    queryKey: materializedViewKeys.userGrowthTrends(academyId, period),
    queryFn: async (): Promise<UserGrowthTrends[]> => {
      const startDate = getStartDateForPeriod(period)
      
      const { data, error } = await supabase
        .from('mv_user_growth_trends')
        .select('*')
        .eq('academy_id', academyId)
        .gte('registration_date', startDate)
        .order('registration_date', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!academyId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  })
}

// Classroom Utilization
export const useClassroomUtilization = (academyId: string) => {
  return useQuery({
    queryKey: materializedViewKeys.classroomUtilization(academyId),
    queryFn: async (): Promise<ClassroomUtilization[]> => {
      const { data, error } = await supabase
        .from('mv_classroom_utilization')
        .select('*')
        .eq('academy_id', academyId)
        .order('overall_attendance_rate', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!academyId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Notification Analytics
export const useNotificationAnalytics = (academyId: string, period: TimePeriod = 'month') => {
  return useQuery({
    queryKey: materializedViewKeys.notificationAnalytics(academyId, period),
    queryFn: async (): Promise<NotificationAnalytics[]> => {
      const startDate = getStartDateForPeriod(period)
      
      const { data, error } = await supabase
        .from('mv_notification_analytics')
        .select('*')
        .eq('academy_id', academyId)
        .gte('date', startDate)
        .order('date', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!academyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Payment Analytics
export const usePaymentAnalytics = (academyId: string, period: TimePeriod = 'month') => {
  return useQuery({
    queryKey: materializedViewKeys.paymentAnalytics(academyId, period),
    queryFn: async (): Promise<PaymentAnalytics[]> => {
      const startDate = getStartDateForPeriod(period)
      
      const { data, error } = await supabase
        .from('mv_payment_analytics')
        .select('*')
        .eq('academy_id', academyId)
        .gte('date', startDate)
        .order('date', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!academyId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  })
}

// Recurring Template Analytics
export const useRecurringTemplateAnalytics = (academyId: string) => {
  return useQuery({
    queryKey: materializedViewKeys.recurringTemplateAnalytics(academyId),
    queryFn: async (): Promise<RecurringTemplateAnalytics[]> => {
      const { data, error } = await supabase
        .from('mv_recurring_template_analytics')
        .select('*')
        .eq('academy_id', academyId)
        .order('total_monthly_revenue', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!academyId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Revenue Trends
export const useRevenueTrends = (academyId: string, period: TimePeriod = 'month') => {
  return useQuery({
    queryKey: materializedViewKeys.revenueTrends(academyId, period),
    queryFn: async (): Promise<RevenueTrends[]> => {
      const startDate = getStartDateForPeriod(period)
      
      const { data, error } = await supabase
        .from('mv_revenue_trends')
        .select('*')
        .eq('academy_id', academyId)
        .gte('revenue_date', startDate)
        .order('revenue_date', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!academyId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  })
}

// Student Payment Behavior
export const useStudentPaymentBehavior = (academyId: string) => {
  return useQuery({
    queryKey: materializedViewKeys.studentPaymentBehavior(academyId),
    queryFn: async (): Promise<StudentPaymentBehavior[]> => {
      const { data, error } = await supabase
        .from('mv_student_payment_behavior')
        .select('*')
        .eq('academy_id', academyId)
        .order('payment_success_rate', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!academyId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// =====================================================
// Aggregated Dashboard Hooks
// =====================================================

// Complete dashboard data in a single hook
export const useDashboardData = (academyId: string, filters?: DashboardFilters) => {
  const period = filters?.dateRange || 'month'
  
  // Fetch all dashboard data in parallel
  const academyStatsQuery = useAcademyStats(academyId)
  const sessionAnalyticsQuery = useSessionAnalytics(academyId, period)
  const assignmentAnalyticsQuery = useAssignmentAnalytics(academyId, period)
  const userGrowthQuery = useUserGrowthTrends(academyId, period)
  const classroomUtilizationQuery = useClassroomUtilization(academyId)
  const notificationAnalyticsQuery = useNotificationAnalytics(academyId, period)
  const paymentAnalyticsQuery = usePaymentAnalytics(academyId, period)
  const recurringTemplateQuery = useRecurringTemplateAnalytics(academyId)
  const revenueTrendsQuery = useRevenueTrends(academyId, period)
  const studentPaymentBehaviorQuery = useStudentPaymentBehavior(academyId)

  // Aggregate loading and error states
  const isLoading = [
    academyStatsQuery,
    sessionAnalyticsQuery,
    assignmentAnalyticsQuery,
    userGrowthQuery,
    classroomUtilizationQuery,
    notificationAnalyticsQuery,
    paymentAnalyticsQuery,
    recurringTemplateQuery,
    revenueTrendsQuery,
    studentPaymentBehaviorQuery
  ].some(query => query.isLoading)

  const isError = [
    academyStatsQuery,
    sessionAnalyticsQuery,
    assignmentAnalyticsQuery,
    userGrowthQuery,
    classroomUtilizationQuery,
    notificationAnalyticsQuery,
    paymentAnalyticsQuery,
    recurringTemplateQuery,
    revenueTrendsQuery,
    studentPaymentBehaviorQuery
  ].some(query => query.isError)

  const errors = [
    academyStatsQuery.error,
    sessionAnalyticsQuery.error,
    assignmentAnalyticsQuery.error,
    userGrowthQuery.error,
    classroomUtilizationQuery.error,
    notificationAnalyticsQuery.error,
    paymentAnalyticsQuery.error,
    recurringTemplateQuery.error,
    revenueTrendsQuery.error,
    studentPaymentBehaviorQuery.error
  ].filter(Boolean)

  // Aggregate data
  const data = {
    academyStats: academyStatsQuery.data,
    sessionAnalytics: sessionAnalyticsQuery.data || [],
    assignmentAnalytics: assignmentAnalyticsQuery.data || [],
    userGrowthTrends: userGrowthQuery.data || [],
    classroomUtilization: classroomUtilizationQuery.data || [],
    notificationAnalytics: notificationAnalyticsQuery.data || [],
    paymentAnalytics: paymentAnalyticsQuery.data || [],
    recurringTemplateAnalytics: recurringTemplateQuery.data || [],
    revenueTrends: revenueTrendsQuery.data || [],
    studentPaymentBehavior: studentPaymentBehaviorQuery.data || [],
  }

  // Refetch functions
  const refetchAll = async () => {
    await Promise.all([
      academyStatsQuery.refetch(),
      sessionAnalyticsQuery.refetch(),
      assignmentAnalyticsQuery.refetch(),
      userGrowthQuery.refetch(),
      classroomUtilizationQuery.refetch(),
      notificationAnalyticsQuery.refetch(),
      paymentAnalyticsQuery.refetch(),
      recurringTemplateQuery.refetch(),
      revenueTrendsQuery.refetch(),
      studentPaymentBehaviorQuery.refetch()
    ])
  }

  return {
    data,
    isLoading,
    isError,
    errors,
    refetchAll,
    // Individual query states for granular control
    queries: {
      academyStats: academyStatsQuery,
      sessionAnalytics: sessionAnalyticsQuery,
      assignmentAnalytics: assignmentAnalyticsQuery,
      userGrowth: userGrowthQuery,
      classroomUtilization: classroomUtilizationQuery,
      notificationAnalytics: notificationAnalyticsQuery,
      paymentAnalytics: paymentAnalyticsQuery,
      recurringTemplate: recurringTemplateQuery,
      revenueTrends: revenueTrendsQuery,
      studentPaymentBehavior: studentPaymentBehaviorQuery
    }
  }
}

// =====================================================
// Materialized View Refresh Hooks
// =====================================================

// Refresh all materialized views
export const useRefreshMaterializedViews = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('refresh_dashboard_materialized_views')
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate all materialized view queries
      queryClient.invalidateQueries({ queryKey: materializedViewKeys.all })
      showSuccessToast(
        'Dashboard refreshed',
        'All dashboard data has been updated with the latest information.'
      )
    },
    onError: (error: Error) => {
      showErrorToast(
        'Refresh failed',
        error.message || 'Failed to refresh dashboard data. Please try again.'
      )
    },
  })
}

// Refresh payment-specific views
export const useRefreshPaymentViews = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('refresh_payment_materialized_views')
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate payment-related queries
      queryClient.invalidateQueries({ 
        queryKey: [...materializedViewKeys.all, 'payment-analytics'] 
      })
      queryClient.invalidateQueries({ 
        queryKey: [...materializedViewKeys.all, 'recurring-template-analytics'] 
      })
      queryClient.invalidateQueries({ 
        queryKey: [...materializedViewKeys.all, 'revenue-trends'] 
      })
      queryClient.invalidateQueries({ 
        queryKey: [...materializedViewKeys.all, 'student-payment-behavior'] 
      })
      
      showSuccessToast(
        'Payment data refreshed',
        'Payment and revenue data has been updated.'
      )
    },
    onError: (error: Error) => {
      showErrorToast(
        'Refresh failed',
        error.message || 'Failed to refresh payment data. Please try again.'
      )
    },
  })
}

// Get refresh status
export const useRefreshStatus = () => {
  return useQuery({
    queryKey: materializedViewKeys.refreshStatus(),
    queryFn: async (): Promise<RefreshStatus> => {
      // Query system tables to get materialized view refresh information
      const { data, error } = await supabase
        .from('pg_stat_user_tables')
        .select('schemaname, relname, n_tup_ins, n_tup_upd, n_tup_del, last_vacuum, last_autovacuum')
        .like('relname', 'mv_%')

      if (error) throw error

      // Mock refresh status - in production, you'd track this in a dedicated table
      return {
        isRefreshing: false,
        lastRefreshAttempt: new Date().toISOString(),
        lastSuccessfulRefresh: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        refreshErrors: [],
        estimatedRefreshTime: 30000, // 30 seconds
        views: data?.map(view => ({
          viewName: view.relname,
          lastRefresh: view.last_vacuum || view.last_autovacuum || new Date().toISOString(),
          refreshDuration: Math.random() * 5000 + 1000, // Mock duration
          rowCount: (view.n_tup_ins || 0) + (view.n_tup_upd || 0),
          sizeBytes: Math.random() * 1000000 + 100000, // Mock size
          isStale: Math.random() > 0.7, // Mock staleness
          nextScheduledRefresh: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        })) || []
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

// =====================================================
// Utility Functions
// =====================================================

function getStartDateForPeriod(period: TimePeriod): string {
  const now = new Date()
  let startDate: Date

  switch (period) {
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'quarter':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      break
    default: // month
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  return startDate.toISOString().split('T')[0]
}

// Calculate percentage change between two values
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

// Format currency values
export function formatCurrency(amount: number, currency = 'KRW'): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format percentage values
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}