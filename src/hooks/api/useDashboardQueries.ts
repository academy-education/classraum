import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Query key factory for dashboard-related queries
export const dashboardKeys = {
  all: ['dashboard'] as const,
  metrics: (academyId: string, filters?: DashboardFilters) => 
    [...dashboardKeys.all, 'metrics', academyId, filters] as const,
  trends: (academyId: string, period: string) => 
    [...dashboardKeys.all, 'trends', academyId, period] as const,
  recentActivity: (academyId: string, limit?: number) => 
    [...dashboardKeys.all, 'activity', academyId, limit] as const,
  upcomingSessions: (academyId: string, days?: number) => 
    [...dashboardKeys.all, 'sessions', academyId, days] as const,
}

// Types
interface DashboardFilters {
  dateRange: 'week' | 'month' | 'quarter' | 'year'
  startDate?: string
  endDate?: string
}

interface DashboardMetrics {
  userGrowth: {
    current: number
    previous: number
    percentageChange: number
    isPositive: boolean
  }
  revenueStats: {
    current: number
    previous: number
    percentageChange: number
    isPositive: boolean
    target: number
    targetPercentage: number
  }
  classroomGrowth: {
    current: number
    previous: number
    percentageChange: number
    isPositive: boolean
  }
  sessionStats: {
    completed: number
    upcoming: number
    cancelled: number
    averageAttendance: number
  }
  paymentStats: {
    pending: number
    overdue: number
    completed: number
    totalAmount: number
  }
}

interface TrendData {
  period: string
  date: string
  students: number
  revenue: number
  sessions: number
  attendance: number
}

interface RecentActivity {
  id: string
  type: 'user_joined' | 'payment_received' | 'session_completed' | 'report_generated'
  title: string
  description: string
  user?: {
    name: string
    avatar_url?: string
  }
  metadata?: Record<string, unknown>
  created_at: string
}

interface UpcomingSession {
  id: string
  title: string
  classroom: {
    name: string
    capacity: number
  }
  teacher: {
    name: string
    avatar_url?: string
  }
  start_time: string
  end_time: string
  enrolled_count: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
}

// Fetch dashboard metrics
export const useDashboardMetrics = (academyId: string, filters?: DashboardFilters) => {
  return useQuery({
    queryKey: dashboardKeys.metrics(academyId, filters),
    queryFn: async (): Promise<DashboardMetrics> => {
      const { dateRange = 'month' } = filters || {}
      
      // Calculate date ranges
      const now = new Date()
      let startDate: Date
      let previousStartDate: Date
      
      switch (dateRange) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
          previousStartDate = new Date(startDate.getTime() - 3 * 30 * 24 * 60 * 60 * 1000)
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          previousStartDate = new Date(startDate.getFullYear() - 1, 0, 1)
          break
        default: // month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          previousStartDate = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1)
      }

      // Fetch current period data
      const [
        currentUsersResult,
        previousUsersResult,
        currentRevenueResult,
        previousRevenueResult,
        classroomsResult,
        sessionsResult,
        paymentsResult
      ] = await Promise.all([
        // Current period users
        supabase
          .from('profiles')
          .select('id')
          .eq('academy_id', academyId)
          .gte('created_at', startDate.toISOString()),
        
        // Previous period users  
        supabase
          .from('profiles')
          .select('id')
          .eq('academy_id', academyId)
          .gte('created_at', previousStartDate.toISOString())
          .lt('created_at', startDate.toISOString()),
        
        // Current period revenue
        supabase
          .from('invoices')
          .select('final_amount')
          .eq('academy_id', academyId)
          .eq('status', 'paid')
          .is('deleted_at', null)
          .gte('paid_at', startDate.toISOString()),

        // Previous period revenue
        supabase
          .from('invoices')
          .select('final_amount')
          .eq('academy_id', academyId)
          .eq('status', 'paid')
          .is('deleted_at', null)
          .gte('paid_at', previousStartDate.toISOString())
          .lt('paid_at', startDate.toISOString()),
        
        // Classrooms
        supabase
          .from('classrooms')
          .select('id')
          .eq('academy_id', academyId),
        
        // Sessions
        supabase
          .from('sessions')
          .select('id, status, attendance_count')
          .eq('academy_id', academyId)
          .gte('start_time', startDate.toISOString()),
        
        // Invoices (payment data)
        supabase
          .from('invoices')
          .select('status, final_amount')
          .eq('academy_id', academyId)
          .is('deleted_at', null)
      ])

      // Calculate metrics
      const currentUsers = currentUsersResult.data?.length || 0
      const previousUsers = previousUsersResult.data?.length || 0
      const userGrowthPercentage = previousUsers > 0 
        ? ((currentUsers - previousUsers) / previousUsers) * 100 
        : currentUsers > 0 ? 100 : 0

      const currentRevenue = currentRevenueResult.data?.reduce((sum, p) => sum + Number(p.final_amount), 0) || 0
      const previousRevenue = previousRevenueResult.data?.reduce((sum, p) => sum + Number(p.final_amount), 0) || 0
      const revenueGrowthPercentage = previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : currentRevenue > 0 ? 100 : 0

      const totalClassrooms = classroomsResult.data?.length || 0
      const sessions = sessionsResult.data || []
      const invoices = paymentsResult.data || []

      const completedSessions = sessions.filter(s => s.status === 'completed').length
      const upcomingSessions = sessions.filter(s => s.status === 'scheduled').length
      const cancelledSessions = sessions.filter(s => s.status === 'cancelled').length

      const averageAttendance = sessions.length > 0
        ? sessions.reduce((sum, s) => sum + (s.attendance_count || 0), 0) / sessions.length
        : 0

      const pendingPayments = invoices.filter(p => p.status === 'pending').length
      const overduePayments = 0 // Note: invoices don't track overdue status directly
      const completedPayments = invoices.filter(p => p.status === 'paid').length
      const totalAmount = invoices.reduce((sum, p) => sum + Number(p.final_amount), 0)

      return {
        userGrowth: {
          current: currentUsers,
          previous: previousUsers,
          percentageChange: userGrowthPercentage,
          isPositive: userGrowthPercentage >= 0,
        },
        revenueStats: {
          current: currentRevenue,
          previous: previousRevenue,
          percentageChange: revenueGrowthPercentage,
          isPositive: revenueGrowthPercentage >= 0,
          target: 100000, // Mock target
          targetPercentage: currentRevenue > 0 ? (currentRevenue / 100000) * 100 : 0,
        },
        classroomGrowth: {
          current: totalClassrooms,
          previous: Math.max(0, totalClassrooms - 2), // Mock previous
          percentageChange: 8.5, // Mock percentage
          isPositive: true,
        },
        sessionStats: {
          completed: completedSessions,
          upcoming: upcomingSessions,
          cancelled: cancelledSessions,
          averageAttendance,
        },
        paymentStats: {
          pending: pendingPayments,
          overdue: overduePayments,
          completed: completedPayments,
          totalAmount,
        },
      }
    },
    enabled: !!academyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Fetch trend data
export const useDashboardTrends = (academyId: string, period: 'week' | 'month' | 'quarter') => {
  return useQuery({
    queryKey: dashboardKeys.trends(academyId, period),
    queryFn: async (): Promise<TrendData[]> => {
      const now = new Date()
      let startDate: Date
      let intervalDays: number

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          intervalDays = 1
          break
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          intervalDays = 7
          break
        default: // month
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          intervalDays = 1
      }

      // Generate date range
      const dates: string[] = []
      for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + intervalDays)) {
        dates.push(d.toISOString().split('T')[0])
      }

      // Mock trend data - in real app, would fetch from database
      return dates.map((date, index) => ({
        period: period,
        date,
        students: Math.floor(Math.random() * 50) + 100 + index * 2,
        revenue: Math.floor(Math.random() * 10000) + 50000 + index * 1000,
        sessions: Math.floor(Math.random() * 10) + 15 + Math.floor(index / 2),
        attendance: Math.floor(Math.random() * 20) + 75,
      }))
    },
    enabled: !!academyId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Fetch recent activity
export const useRecentActivity = (academyId: string, limit = 10) => {
  return useQuery({
    queryKey: dashboardKeys.recentActivity(academyId, limit),
    queryFn: async (): Promise<RecentActivity[]> => {
      // In a real app, this would be a dedicated activity log table
      // For now, we'll fetch recent data from various tables
      
      const [recentUsers, recentPayments, recentSessions] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, avatar_url, created_at')
          .eq('academy_id', academyId)
          .order('created_at', { ascending: false })
          .limit(3),
        
        supabase
          .from('invoices')
          .select('id, final_amount, status, paid_at, students!inner(user_id, users(name))')
          .eq('academy_id', academyId)
          .eq('status', 'paid')
          .is('deleted_at', null)
          .order('paid_at', { ascending: false })
          .limit(3),
        
        supabase
          .from('sessions')
          .select('id, title, status, end_time, profiles(name, avatar_url)')
          .eq('academy_id', academyId)
          .eq('status', 'completed')
          .order('end_time', { ascending: false })
          .limit(3)
      ])

      const activities: RecentActivity[] = []

      // Add user activities
      recentUsers.data?.forEach(user => {
        activities.push({
          id: `user-${user.id}`,
          type: 'user_joined',
          title: 'New user joined',
          description: `${user.name} joined the academy`,
          user: {
            name: user.name,
            avatar_url: user.avatar_url,
          },
          created_at: user.created_at,
        })
      })

      // Add payment activities
      recentPayments.data?.forEach(payment => {
        activities.push({
          id: `payment-${payment.id}`,
          type: 'payment_received',
          title: 'Payment received',
          description: `₩${payment.amount.toLocaleString()} payment completed`,
          user: payment.profiles ? {
            name: (payment.profiles as { name?: string; avatar_url?: string }).name || 'Unknown User',
            avatar_url: (payment.profiles as { name?: string; avatar_url?: string }).avatar_url,
          } : undefined,
          metadata: { amount: payment.amount },
          created_at: payment.created_at,
        })
      })

      // Add session activities
      recentSessions.data?.forEach(session => {
        activities.push({
          id: `session-${session.id}`,
          type: 'session_completed',
          title: 'Session completed',
          description: `"${session.title}" session finished`,
          user: session.profiles ? {
            name: (session.profiles as { name?: string; avatar_url?: string }).name || 'Unknown User',
            avatar_url: (session.profiles as { name?: string; avatar_url?: string }).avatar_url,
          } : undefined,
          created_at: session.end_time,
        })
      })

      // Sort by date and limit
      return activities
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit)
    },
    enabled: !!academyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Fetch upcoming sessions
export const useUpcomingSessions = (academyId: string, days = 7) => {
  return useQuery({
    queryKey: dashboardKeys.upcomingSessions(academyId, days),
    queryFn: async (): Promise<UpcomingSession[]> => {
      const startDate = new Date()
      const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000)

      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          title,
          start_time,
          end_time,
          status,
          classrooms(name, capacity),
          profiles(name, avatar_url),
          session_enrollments(count)
        `)
        .eq('academy_id', academyId)
        .in('status', ['scheduled', 'in_progress'])
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: true })

      if (error) throw error

      return data?.map(session => ({
        id: session.id,
        title: session.title,
        start_time: session.start_time,
        end_time: session.end_time,
        status: session.status,
        classroom: {
          name: (session.classrooms as { name?: string; capacity?: number })?.name || 'Unknown',
          capacity: (session.classrooms as { name?: string; capacity?: number })?.capacity || 0,
        },
        teacher: {
          name: (session.profiles as { name?: string; avatar_url?: string })?.name || 'Unknown User',
          avatar_url: (session.profiles as { name?: string; avatar_url?: string })?.avatar_url,
        },
        enrolled_count: session.session_enrollments?.[0]?.count || 0,
      })) || []
    },
    enabled: !!academyId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  })
}

// Refresh dashboard data utility
export const useRefreshDashboard = (academyId: string) => {
  const queryClient = useQueryClient()

  return {
    refreshAll: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
    refreshMetrics: (filters?: DashboardFilters) => {
      queryClient.invalidateQueries({ 
        queryKey: dashboardKeys.metrics(academyId, filters) 
      })
    },
    refreshTrends: (period: string) => {
      queryClient.invalidateQueries({ 
        queryKey: dashboardKeys.trends(academyId, period) 
      })
    },
    refreshActivity: () => {
      queryClient.invalidateQueries({ 
        queryKey: dashboardKeys.recentActivity(academyId) 
      })
    },
    refreshSessions: () => {
      queryClient.invalidateQueries({ 
        queryKey: dashboardKeys.upcomingSessions(academyId) 
      })
    },
  }
}