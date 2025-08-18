"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  User,
  TrendingUp,
  TrendingDown,
  Activity,
  Minus,
  UserPlus,
  CreditCard,
  Clock,
  ChevronRight,
  Calendar,
  Users,
  AlertCircle,
  BookOpen,
  Bell
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { translateNotificationContent, NotificationParams } from '@/lib/notifications'
import { languages } from '@/locales'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'
import { queryCache, CACHE_TTL, CACHE_KEYS } from '@/lib/queryCache'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardPage() {
  const { academyId, userId } = useAuth()
  console.log('DashboardPage: Auth context data:', { academyId, userId })
  
  // Add CSS to remove outline from all Recharts elements
  React.useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .recharts-wrapper,
      .recharts-wrapper *,
      .recharts-wrapper *:focus,
      .recharts-wrapper *:active,
      .recharts-surface,
      .recharts-surface *,
      .recharts-surface *:focus {
        outline: none !important;
        border: none !important;
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  const router = useRouter()
  const { t, language } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [userCount, setUserCount] = useState(0)
  const [isGrowthPositive, setIsGrowthPositive] = useState(true)
  const [showUsersAdded, setShowUsersAdded] = useState(false)
  const [usersAdded, setUsersAdded] = useState(0)
  const [classroomCount, setClassroomCount] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [revenueGrowthPercentage, setRevenueGrowthPercentage] = useState(0)
  const [isRevenueGrowthPositive, setIsRevenueGrowthPositive] = useState(true)
  const [monthlyRevenueTrend, setMonthlyRevenueTrend] = useState<number[]>([])
  const [activeUsersTrend, setActiveUsersTrend] = useState<number[]>([])
  const [classroomTrend, setClassroomTrend] = useState<number[]>([])
  const [classroomGrowthPercentage, setClassroomGrowthPercentage] = useState(0)
  const [isClassroomGrowthPositive, setIsClassroomGrowthPositive] = useState(true)
  const [completedSessionsCount, setCompletedSessionsCount] = useState(0)
  const [completedSessionsTrend, setCompletedSessionsTrend] = useState<number[]>([])
  const [sessionsGrowthPercentage, setSessionsGrowthPercentage] = useState(0)
  const [isSessionsGrowthPositive, setIsSessionsGrowthPositive] = useState(true)
  const [showClassroomsAdded, setShowClassroomsAdded] = useState(false)
  const [classroomsAdded, setClassroomsAdded] = useState(0)
  const [activeSessionsThisWeek, setActiveSessionsThisWeek] = useState(0)
  const [upcomingSessionsToday, setUpcomingSessionsToday] = useState(0)
  const [totalStudentsPresent, setTotalStudentsPresent] = useState(0)
  const [sessionsWithAttendance, setSessionsWithAttendance] = useState(0)
  const [weeklySessionData, setWeeklySessionData] = useState<{date: string, sessions: number, present: number}[]>([])
  const [weeklyRevenueData, setWeeklyRevenueData] = useState<{date: string, revenue: number}[]>([])
  const [totalRevenueWeek, setTotalRevenueWeek] = useState(0)
  const [individualTodaySessions, setIndividualTodaySessions] = useState<{
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    classroom_name: string;
    classroom_color: string;
    status: string;
    location: string;
  }[]>([])
  const [recentActivities, setRecentActivities] = useState<{
    id: string;
    title: string;
    description: string;
    timestamp: string;
    type?: string;
    navigationData?: {
      page: string;
      filters?: Record<string, unknown>;
    };
  }[]>([])

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'session':
        return <Calendar className="w-5 h-5 text-blue-600" />
      case 'attendance':
        return <Users className="w-5 h-5 text-green-600" />
      case 'billing':
        return <CreditCard className="w-5 h-5 text-purple-600" />
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'assignment':
        return <BookOpen className="w-5 h-5 text-orange-600" />
      default:
        return <Bell className="w-5 h-5 text-gray-600" />
    }
  }

  // Function to get previous month name based on current language
  const getPreviousMonthName = () => {
    const prevMonth = new Date()
    prevMonth.setMonth(prevMonth.getMonth() - 1)
    const monthIndex = prevMonth.getMonth()
    
    if (language === 'korean') {
      const koreanMonths = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
      return koreanMonths[monthIndex]
    } else {
      return prevMonth.toLocaleDateString('en-US', { month: 'long' })
    }
  }

  const handleNavigateToTodaySessions = () => {
    const today = new Date().toISOString().split('T')[0]
    router.push(`/sessions?date=${today}`)
  }

  const handleActivityClick = (activity: {
    id: string;
    title: string;
    description: string;
    timestamp: string;
    navigationData?: {
      page: string;
      filters?: Record<string, unknown>;
    };
  }) => {
    if (activity.navigationData?.page) {
      router.push(`/${activity.navigationData.page}`)
    }
  }

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!academyId || !userId) return

    setLoading(true)
    try {
      console.log('Dashboard: Starting to fetch data for academyId:', academyId, 'userId:', userId)
      
      // Clear cache for fresh data during debugging
      const cacheKeys = [
        `dashboard_users_${academyId}`,
        `dashboard_classrooms_${academyId}`,
        `dashboard_revenue_${academyId}`,
        `dashboard_sessions_${academyId}`,
        `activities_${userId}`
      ]
      cacheKeys.forEach(key => queryCache.invalidate(key))
      
      // Fetch multiple data points in parallel
      const [
        userCountResult,
        classroomCountResult, 
        revenueResult,
        sessionsResult,
        activitiesResult
      ] = await Promise.all([
        fetchUserCount(),
        fetchClassroomCount(),
        fetchRevenue(),
        fetchSessions(),
        fetchRecentActivities()
      ])

      console.log('Dashboard: Fetch results:', {
        userCountResult,
        classroomCountResult,
        revenueResult,
        sessionsResult,
        activitiesResult
      })

      setLoading(false)
      setDataLoaded(true)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setLoading(false)
      setDataLoaded(false)
    }
  }, [academyId, userId])

  const fetchUserCount = async () => {
    try {
      const cacheKey = `dashboard_users_${academyId}`
      const cached = queryCache.get(cacheKey)
      
      if (cached) {
        const { count, growth, added, trend } = cached
        setUserCount(count)
        setIsGrowthPositive(growth >= 0)
        setUsersAdded(Math.abs(added))
        setShowUsersAdded(added !== 0)
        setActiveUsersTrend(trend || [])
        return { count, growth, added, trend }
      }

      // Current month count - get active students and parents
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      // Count active students
      const { count: studentsCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', academyId)
        .eq('active', true)

      // Count active parents  
      const { count: parentsCount } = await supabase
        .from('parents')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', academyId)
        .eq('active', true)

      // Count active teachers
      const { count: teachersCount } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', academyId)
        .eq('active', true)

      const currentCount = (studentsCount || 0) + (parentsCount || 0) + (teachersCount || 0)

      // Previous month count - get students, parents, and teachers created before this month
      const { count: prevStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', academyId)
        .eq('active', true)
        .lt('created_at', startOfMonth.toISOString())

      const { count: prevParents } = await supabase
        .from('parents')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', academyId)
        .eq('active', true)
        .lt('created_at', startOfMonth.toISOString())

      const { count: prevTeachers } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', academyId)
        .eq('active', true)
        .lt('created_at', startOfMonth.toISOString())

      const prevCount = (prevStudents || 0) + (prevParents || 0) + (prevTeachers || 0)

      // New users this month
      const { count: newStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', academyId)
        .eq('active', true)
        .gte('created_at', startOfMonth.toISOString())

      const { count: newParents } = await supabase
        .from('parents')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', academyId)
        .eq('active', true)
        .gte('created_at', startOfMonth.toISOString())

      const { count: newTeachers } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', academyId)
        .eq('active', true)
        .gte('created_at', startOfMonth.toISOString())

      const newUsers = (newStudents || 0) + (newParents || 0) + (newTeachers || 0)

      // Generate realistic trend data
      const trend = Array.from({ length: 10 }, (_, i) => {
        const progress = (i + 1) / 10
        const baseValue = prevCount || 0
        const targetValue = currentCount || 0
        return Math.floor(baseValue + (targetValue - baseValue) * progress)
      })

      const result = {
        count: currentCount || 0,
        growth: prevCount ? ((currentCount || 0) - prevCount) / prevCount * 100 : 0,
        added: newUsers || 0,
        trend
      }

      queryCache.set(cacheKey, result, CACHE_TTL.MEDIUM)
      
      setUserCount(result.count)
      setIsGrowthPositive(result.growth >= 0)
      setUsersAdded(Math.abs(result.added))
      setShowUsersAdded(result.added !== 0)
      setActiveUsersTrend(result.trend)
      
      return result
    } catch (error) {
      console.error('Error fetching user count:', error)
      return { count: 0, growth: 0, added: 0, trend: [] }
    }
  }

  const fetchClassroomCount = async () => {
    try {
      const cacheKey = `dashboard_classrooms_${academyId}`
      const cached = queryCache.get(cacheKey)
      
      if (cached) {
        const { count, growth, added, trend } = cached
        setClassroomCount(count)
        setClassroomGrowthPercentage(Math.abs(growth))
        setIsClassroomGrowthPositive(growth >= 0)
        setClassroomsAdded(Math.abs(added))
        setShowClassroomsAdded(added !== 0)
        setClassroomTrend(trend || [])
        return { count, growth, added, trend }
      }

      // Current count (exclude soft-deleted classrooms)
      const { count: currentCount } = await supabase
        .from('classrooms')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', academyId)
        .is('deleted_at', null)

      // New classrooms this month (exclude soft-deleted classrooms)
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count: newClassrooms } = await supabase
        .from('classrooms')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', academyId)
        .is('deleted_at', null)
        .gte('created_at', startOfMonth.toISOString())

      // Generate realistic trend
      const prevClassroomCount = Math.max((currentCount || 0) - (newClassrooms || 0), 0)
      const trend = Array.from({ length: 10 }, (_, i) => {
        const progress = (i + 1) / 10
        return Math.floor(prevClassroomCount + (newClassrooms || 0) * progress)
      })

      const result = {
        count: currentCount || 0,
        growth: newClassrooms ? (newClassrooms / Math.max(currentCount - newClassrooms, 1)) * 100 : 0,
        added: newClassrooms || 0,
        trend
      }

      queryCache.set(cacheKey, result, CACHE_TTL.MEDIUM)
      
      setClassroomCount(result.count)
      setClassroomGrowthPercentage(Math.abs(result.growth))
      setIsClassroomGrowthPositive(result.growth >= 0)
      setClassroomsAdded(Math.abs(result.added))
      setShowClassroomsAdded(result.added !== 0)
      setClassroomTrend(result.trend)
      
      return result
    } catch (error) {
      console.error('Error fetching classroom count:', error)
      return { count: 0, growth: 0, added: 0, trend: [] }
    }
  }

  const fetchRevenue = async () => {
    try {
      console.log('Dashboard: fetchRevenue called for academyId:', academyId)
      const cacheKey = `dashboard_revenue_${academyId}`
      const cached = queryCache.get(cacheKey)
      
      if (cached) {
        console.log('Dashboard: Using cached revenue data:', cached)
        const { total, growth, isPositive, trend, weeklyData, weeklyTotal } = cached
        setTotalRevenue(total)
        setRevenueGrowthPercentage(Math.abs(growth))
        setIsRevenueGrowthPositive(isPositive)
        setMonthlyRevenueTrend(trend || [])
        setWeeklyRevenueData(weeklyData || [])
        setTotalRevenueWeek(weeklyTotal || 0)
        return cached
      }

      console.log('Dashboard: No cached revenue data, fetching fresh data...')

      // Current month revenue - join with students to filter by academy
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      console.log('Dashboard: Fetching revenue for academyId:', academyId, 'startOfMonth:', startOfMonth.toISOString())

      // Get students for this academy first
      const { data: academyStudents, error: studentsError } = await supabase
        .from('students')
        .select('user_id')
        .eq('academy_id', academyId)

      console.log('Dashboard: Academy students:', academyStudents, 'Error:', studentsError)

      let allPaidInvoices = []
      
      if (academyStudents && academyStudents.length > 0) {
        const studentIds = academyStudents.map(s => s.user_id)
        console.log('Dashboard: Student IDs for academy:', studentIds)
        
        // Get all invoices first, then filter by status and students
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .order('created_at', { ascending: false })

        console.log('Dashboard: All invoices query result:', invoiceData ? `${invoiceData.length} invoices` : 'null', 'Error:', invoiceError)

        if (invoiceData) {
          // Filter invoices for academy students and paid status
          allPaidInvoices = invoiceData.filter(invoice => 
            invoice.status === 'paid' && 
            studentIds.includes(invoice.student_id)
          )
        }
      }

      console.log('Dashboard: All paid invoices for academy:', allPaidInvoices)

      // Current month revenue calculation
      const currentMonthPayments = allPaidInvoices?.filter(invoice => {
        const paymentDate = new Date(invoice.payment_date || invoice.paid_at || invoice.created_at)
        return paymentDate >= startOfMonth
      }) || []

      console.log('Dashboard: Current month payments:', currentMonthPayments)

      const currentRevenue = currentMonthPayments.reduce((sum, payment) => sum + (payment.final_amount || 0), 0)
      console.log('Dashboard: Calculated current revenue:', currentRevenue)

      // Previous month revenue
      const startOfPrevMonth = new Date(startOfMonth)
      startOfPrevMonth.setMonth(startOfPrevMonth.getMonth() - 1)

      const prevMonthPayments = allPaidInvoices?.filter(invoice => {
        const paymentDate = new Date(invoice.payment_date || invoice.paid_at || invoice.created_at)
        return paymentDate >= startOfPrevMonth && paymentDate < startOfMonth
      }) || []

      const prevRevenue = prevMonthPayments.reduce((sum, payment) => sum + (payment.final_amount || 0), 0)

      // Calculate growth
      const growth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0

      // Generate realistic trend based on actual data
      const trend = Array.from({ length: 10 }, (_, i) => {
        const progress = (i + 1) / 10
        const baseValue = prevRevenue
        const targetValue = currentRevenue
        return Math.floor(baseValue + (targetValue - baseValue) * progress)
      })

      // Weekly revenue data - get actual payments from last 7 days
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - 6)
      weekStart.setHours(0, 0, 0, 0)

      const weekDays = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return date
      })

      const weeklyData = weekDays.map(date => {
        const dayStart = new Date(date)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(date)
        dayEnd.setHours(23, 59, 59, 999)
        
        const dayPayments = allPaidInvoices?.filter(invoice => {
          const paymentDate = new Date(invoice.payment_date || invoice.paid_at || invoice.created_at)
          return paymentDate >= dayStart && paymentDate <= dayEnd
        }) || []
        
        const dayRevenue = dayPayments.reduce((sum, payment) => sum + (payment.final_amount || 0), 0)
        return {
          date: date.toISOString().split('T')[0],
          revenue: dayRevenue
        }
      })

      const weeklyTotal = weeklyData.reduce((sum, day) => sum + day.revenue, 0)

      const result = {
        total: currentRevenue,
        growth,
        isPositive: growth >= 0,
        trend,
        weeklyData,
        weeklyTotal
      }

      queryCache.set(cacheKey, result, CACHE_TTL.MEDIUM)
      
      setTotalRevenue(result.total)
      setRevenueGrowthPercentage(Math.abs(result.growth))
      setIsRevenueGrowthPositive(result.isPositive)
      setMonthlyRevenueTrend(result.trend)
      setWeeklyRevenueData(result.weeklyData)
      setTotalRevenueWeek(result.weeklyTotal)
      
      return result
    } catch (error) {
      console.error('Dashboard: Error fetching revenue:', error)
      return { total: 0, growth: 0, isPositive: true, trend: [], weeklyData: [], weeklyTotal: 0 }
    }
  }

  const fetchSessions = async () => {
    try {
      const cacheKey = `dashboard_sessions_${academyId}`
      const cached = queryCache.get(cacheKey)
      
      if (cached) {
        const { 
          completedCount, 
          growth, 
          isPositive, 
          trend, 
          weeklyActive, 
          todayUpcoming,
          weeklyData,
          totalPresent,
          withAttendance 
        } = cached
        
        setCompletedSessionsCount(completedCount)
        setSessionsGrowthPercentage(Math.abs(growth))
        setIsSessionsGrowthPositive(isPositive)
        setCompletedSessionsTrend(trend || [])
        setActiveSessionsThisWeek(weeklyActive)
        setUpcomingSessionsToday(todayUpcoming)
        setWeeklySessionData(weeklyData || [])
        setTotalStudentsPresent(totalPresent)
        setSessionsWithAttendance(withAttendance)
        
        return cached
      }

      // Get completed sessions this month - need to join with classrooms to get academy_id
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count: completedCount } = await supabase
        .from('classroom_sessions')
        .select('*, classrooms!inner(academy_id)', { count: 'exact', head: true })
        .eq('classrooms.academy_id', academyId)
        .eq('status', 'completed')
        .gte('date', startOfMonth.toISOString().split('T')[0])

      // Sessions this week
      const startOfWeek = new Date()
      const dayOfWeek = startOfWeek.getDay()
      const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      startOfWeek.setDate(diff)
      startOfWeek.setHours(0, 0, 0, 0)

      const { count: weeklyActive } = await supabase
        .from('classroom_sessions')
        .select('*, classrooms!inner(academy_id)', { count: 'exact', head: true })
        .eq('classrooms.academy_id', academyId)
        .gte('date', startOfWeek.toISOString().split('T')[0])

      // Today's sessions
      const today = new Date().toISOString().split('T')[0]
      const { data: todaySessions } = await supabase
        .from('classroom_sessions')
        .select('*, classrooms!inner(academy_id)')
        .eq('classrooms.academy_id', academyId)
        .eq('date', today)
        .eq('status', 'scheduled')

      // Generate realistic trend
      const prevMonthStart = new Date(startOfMonth)
      prevMonthStart.setMonth(prevMonthStart.getMonth() - 1)
      
      const { count: prevMonthCompleted } = await supabase
        .from('classroom_sessions')
        .select('*, classrooms!inner(academy_id)', { count: 'exact', head: true })
        .eq('classrooms.academy_id', academyId)
        .eq('status', 'completed')
        .gte('date', prevMonthStart.toISOString().split('T')[0])
        .lt('date', startOfMonth.toISOString().split('T')[0])

      const trend = Array.from({ length: 10 }, (_, i) => {
        const progress = (i + 1) / 10
        const baseValue = prevMonthCompleted || 0
        const targetValue = completedCount || 0
        return Math.floor(baseValue + (targetValue - baseValue) * progress)
      })

      // Weekly session data - get actual sessions from last 7 days
      const weekDays = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return date
      })

      const weeklyDataPromises = weekDays.map(async (date) => {
        const dateStr = date.toISOString().split('T')[0]
        
        // Get sessions for this exact day using eq instead of range
        const { count: sessionsCount, error: sessionsError } = await supabase
          .from('classroom_sessions')
          .select('*, classrooms!inner(academy_id)', { count: 'exact', head: true })
          .eq('classrooms.academy_id', academyId)
          .eq('date', dateStr)

        console.log(`Dashboard: Sessions for ${dateStr}: ${sessionsCount || 0}${sessionsError ? ' Error: ' + JSON.stringify(sessionsError) : ''}`)

        // Skip attendance for now to avoid errors - focus on sessions count
        return {
          date: dateStr,
          sessions: sessionsCount || 0,
          present: 0 // Set to 0 for now to avoid errors
        }
      })

      const weeklyData = await Promise.all(weeklyDataPromises)
      console.log('Dashboard: Weekly sessions data:', weeklyData)
      const sessionsPerDay = weeklyData.map(day => ({ date: day.date, sessions: day.sessions }))
      console.log('Dashboard: Sessions per day:', sessionsPerDay)
      console.log('Dashboard: Total sessions in week:', sessionsPerDay.reduce((sum, day) => sum + day.sessions, 0))
      
      // Fetch individual sessions for today
      const { data: todayIndividualSessions } = await supabase
        .from('classroom_sessions')
        .select(`
          id,
          date,
          start_time,
          end_time,
          status,
          location,
          classrooms!inner(
            name,
            color,
            academy_id
          )
        `)
        .eq('classrooms.academy_id', academyId)
        .eq('date', today)
        .is('deleted_at', null)
        .order('start_time', { ascending: true })

      const formattedTodaySessions = (todayIndividualSessions || []).map(session => ({
        id: session.id,
        date: session.date,
        start_time: session.start_time,
        end_time: session.end_time,
        classroom_name: session.classrooms?.name || 'Unknown Classroom',
        classroom_color: session.classrooms?.color || '#6B7280',
        status: session.status,
        location: session.location
      }))
      
      const totalPresent = weeklyData.reduce((sum, day) => sum + day.present, 0)
      const withAttendance = weeklyData.filter(day => day.present > 0).length

      const result = {
        completedCount: completedCount || 0,
        growth: prevMonthCompleted ? ((completedCount || 0) - prevMonthCompleted) / prevMonthCompleted * 100 : 0,
        isPositive: (completedCount || 0) >= (prevMonthCompleted || 0),
        trend,
        weeklyActive: weeklyActive || 0,
        todayUpcoming: todaySessions?.length || 0,
        weeklyData,
        totalPresent,
        withAttendance,
        todaySessions: formattedTodaySessions
      }

      console.log('Dashboard: Session result before caching:', result)
      console.log('Dashboard: activeSessionsThisWeek value:', result.weeklyActive)
      console.log('Dashboard: weeklySessionData for graph:', result.weeklyData)
      
      queryCache.set(cacheKey, result, CACHE_TTL.MEDIUM)
      
      setCompletedSessionsCount(result.completedCount)
      setSessionsGrowthPercentage(Math.abs(result.growth))
      setIsSessionsGrowthPositive(result.isPositive)
      setCompletedSessionsTrend(result.trend)
      setActiveSessionsThisWeek(result.weeklyActive)
      setUpcomingSessionsToday(result.todayUpcoming)
      setWeeklySessionData(result.weeklyData)
      setTotalStudentsPresent(result.totalPresent)
      setSessionsWithAttendance(result.withAttendance)
      setIndividualTodaySessions(result.todaySessions)
      
      console.log('Dashboard: Set weeklySessionData to:', result.weeklyData)
      return result
    } catch (error) {
      console.error('Error fetching sessions:', error)
      return {
        completedCount: 0,
        growth: 0,
        isPositive: true,
        trend: [],
        weeklyActive: 0,
        todayUpcoming: 0,
        weeklyData: [],
        totalPresent: 0,
        withAttendance: 0
      }
    }
  }

  const fetchRecentActivities = async () => {
    try {
      console.log('Dashboard: Fetching recent activities for userId:', userId)
      const cacheKey = `activities_${userId}`
      const cached = queryCache.get(cacheKey)
      
      if (cached) {
        console.log('Dashboard: Using cached activities:', cached.length)
        setRecentActivities(cached)
        return cached
      }

      // Fetch recent notifications
      console.log('Dashboard: Querying notifications table...')
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      console.log('Dashboard: Notifications query result:', { notifications, error })

      const activities = notifications?.map(notification => {
        const translatedContent = translateNotificationContent(
          notification.title_key,
          notification.message_key,
          notification.title_params as NotificationParams,
          notification.message_params as NotificationParams,
          languages[language],
          notification.title,
          notification.message,
          language
        )

        return {
          id: notification.id,
          title: translatedContent.title,
          description: translatedContent.message,
          timestamp: notification.created_at,
          type: notification.type,
          navigationData: notification.navigation_data as any
        }
      }) || []

      console.log('Dashboard: Processed activities:', activities)
      
      queryCache.set(cacheKey, activities, CACHE_TTL.SHORT)
      setRecentActivities(activities)
      
      return activities
    } catch (error) {
      console.error('Dashboard: Error fetching recent activities:', error)
      return []
    }
  }

  useEffect(() => {
    if (academyId && userId) {
      fetchDashboardData()
    }
  }, [academyId, userId, fetchDashboardData])

  if (!academyId || !userId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
          <div className="text-sm text-gray-500 mt-2">
            Missing props: academyId={academyId ? '✓' : '✗'}, userId={userId ? '✓' : '✗'}
          </div>
          <div className="text-xs text-gray-400 mt-2">
            academyId: {academyId || 'undefined'}<br/>
            userId: {userId || 'undefined'}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 space-y-8">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-24 mb-4"></div>
                <div className="h-7 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-32 mb-4"></div>
                <div className="h-16 bg-gray-100 rounded-md relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[shimmer_2s_infinite] transform translate-x-[-100%]"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sessions and Activity Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Sessions Skeleton */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-12"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity Skeleton */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 bg-gray-200 rounded w-28"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0 mt-1"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes shimmer {
            100% {
              transform: translateX(100%);
            }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">{t("dashboard.revenueThisMonth")}</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            ₩{totalRevenue.toLocaleString()}
          </div>
          <div className={`flex items-center text-sm ${revenueGrowthPercentage === 0 ? 'text-gray-500' : isRevenueGrowthPositive ? 'text-green-600' : 'text-red-600'}`}>
            {revenueGrowthPercentage === 0 ? (
              <Minus className="w-4 h-4 mr-1" />
            ) : isRevenueGrowthPositive ? (
              <TrendingUp className="w-4 h-4 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 mr-1" />
            )}
            <span>
              {revenueGrowthPercentage === 0 ? 
                t("dashboard.noChange") : 
                language === 'korean' ?
                  `${getPreviousMonthName()} 대비 ${isRevenueGrowthPositive ? '+' : '-'}${revenueGrowthPercentage}%` :
                  `${isRevenueGrowthPositive ? '+' : '-'}${revenueGrowthPercentage}% from ${getPreviousMonthName()}`
              }
            </span>
          </div>
          
          {/* Mini Revenue Trend Chart */}
          <div 
            className="mt-4 w-full h-16"
            style={{ 
              outline: 'none !important',
              border: 'none !important'
            }}
          >
            {dataLoaded && monthlyRevenueTrend.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlyRevenueTrend.map((value, index) => ({
                    day: index,
                    revenue: value
                  }))}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">{t("dashboard.allActiveUsers")}</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {userCount}
          </div>
          <div className={`flex items-center text-sm ${showUsersAdded ? isGrowthPositive ? 'text-green-600' : 'text-red-600' : 'text-gray-500'}`}>
            {!showUsersAdded ? (
              <Minus className="w-4 h-4 mr-1" />
            ) : isGrowthPositive ? (
              <UserPlus className="w-4 h-4 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 mr-1" />
            )}
            <span>
              {!showUsersAdded ? 
                t("dashboard.noChange") : 
                `${isGrowthPositive ? '+' : '-'}${usersAdded} ${t("dashboard.users")} ${language === 'korean' ? '이번 달' : 'this month'}`
              }
            </span>
          </div>
          
          {/* Mini Users Trend Chart */}
          <div className="mt-4 w-full h-16">
            {dataLoaded && activeUsersTrend.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={activeUsersTrend.map((value, index) => ({
                    day: index,
                    users: value
                  }))}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">{t("dashboard.totalClassrooms")}</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {classroomCount}
          </div>
          <div className={`flex items-center text-sm ${showClassroomsAdded ? isClassroomGrowthPositive ? 'text-green-600' : 'text-red-600' : 'text-gray-500'}`}>
            {!showClassroomsAdded ? (
              <Minus className="w-4 h-4 mr-1" />
            ) : isClassroomGrowthPositive ? (
              <TrendingUp className="w-4 h-4 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 mr-1" />
            )}
            <span>
              {!showClassroomsAdded ? 
                t("dashboard.noChange") : 
                `${isClassroomGrowthPositive ? '+' : '-'}${classroomsAdded} ${t("dashboard.classrooms")} ${language === 'korean' ? '이번 달' : 'this month'}`
              }
            </span>
          </div>
          
          {/* Mini Classroom Trend Chart */}
          <div className="mt-4 w-full h-16">
            {dataLoaded && classroomTrend.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={classroomTrend.map((value, index) => ({
                    day: index,
                    classrooms: value
                  }))}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <Line
                    type="monotone"
                    dataKey="classrooms"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">{t("dashboard.activeSessionsThisWeek")}</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {activeSessionsThisWeek}
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Activity className="w-4 h-4 mr-1" />
            <span>{t("dashboard.sessionsScheduledThisWeek")}</span>
          </div>
          
          {/* Weekly Sessions Chart */}
          <div className="mt-4 w-full h-16">
            {console.log('Dashboard: Rendering chart with weeklySessionData:', weeklySessionData)}
            {dataLoaded && weeklySessionData && weeklySessionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" key={`sessions-chart-${weeklySessionData.length}`}>
                <LineChart
                  data={weeklySessionData.map((day, index) => {
                    const chartPoint = { 
                      day: index, 
                      sessions: day.sessions || 0,
                      date: day.date 
                    }
                    console.log(`Dashboard: Chart day ${index} (${day.date}): ${day.sessions} sessions`)
                    return chartPoint
                  })}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <YAxis hide />
                  <Line
                    type="monotone"
                    dataKey="sessions"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={false}
                    animationDuration={500}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-xs text-gray-400">
                  {console.log('Dashboard: No weeklySessionData to display:', weeklySessionData)}
                  {t("dashboard.noData")}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Today's Sessions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Sessions */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t("dashboard.sessionToday")}</h3>
                <p className="text-sm text-gray-600">{t("dashboard.checkYourSchedule")}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleNavigateToTodaySessions}
              className="text-blue-600 hover:text-blue-700"
            >
              {t("dashboard.viewAllSessions")}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {individualTodaySessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Clock className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-base font-medium">{t("dashboard.noSessionsToday")}</p>
              <p className="text-sm mt-1">{t("dashboard.takeABreakOrPlan")}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push('/sessions')}
              >
                {t("dashboard.scheduleSession")}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {individualTodaySessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                     onClick={handleNavigateToTodaySessions}>
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: session.classroom_color }}
                    ></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{session.classroom_name}</p>
                      <p className="text-xs text-gray-500">
                        {session.start_time} - {session.end_time}
                        {session.location && (
                          <span className="ml-2">• {session.location === 'online' ? t("sessions.online") : t("sessions.offline")}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      session.status === 'completed' ? 'bg-green-100 text-green-800' :
                      session.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      session.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {t(`sessions.${session.status}`)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}

        </Card>

        {/* Recent Activity */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t("dashboard.recentActivity")}</h3>
                <p className="text-sm text-gray-600">{t("dashboard.latestUpdatesFromAcademy")}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/notifications')}
              className="text-purple-600 hover:text-purple-700"
            >
              {t("common.viewAll")}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {recentActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-base font-medium">{t("dashboard.noRecentUpdates")}</p>
              <p className="text-sm mt-1">{t("dashboard.noRecentActivity")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div 
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleActivityClick(activity)}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(activity.type || 'default')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(activity.timestamp).toLocaleString(language === 'korean' ? 'ko-KR' : 'en-US')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}