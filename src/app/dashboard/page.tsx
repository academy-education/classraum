"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { Sidebar } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ClassroomsPage } from '@/components/ui/classrooms-page'
import { SessionsPage } from '@/components/ui/sessions-page'
import { AssignmentsPage } from '@/components/ui/assignments-page'
import { AttendancePage } from '@/components/ui/attendance-page'
import { PaymentsPage } from '@/components/ui/payments-page'
import ReportsPage from '@/components/ui/reports-page'
import { UpgradePage } from '@/components/ui/upgrade-page'
import { OrderSummaryPage } from '@/components/ui/order-summary-page'
import { TeachersPage } from '@/components/ui/teachers-page'
import { StudentsPage } from '@/components/ui/students-page'
import { ParentsPage } from '@/components/ui/parents-page'
import { FamiliesPage } from '@/components/ui/families-page'
import { SettingsPage } from '@/components/ui/settings-page'
import { NotificationDropdown } from '@/components/ui/notification-dropdown'
import { NotificationsPage } from '@/components/ui/notifications-page'
import { ChatWidget } from '@/components/ui/chat-widget'
import { 
  Bell,
  User,
  TrendingUp,
  TrendingDown,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
  Minus,
  UserPlus,
  CreditCard,
  Clock,
  ChevronRight
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

export default function DashboardPage() {
  const router = useRouter()
  const { t, language } = useTranslation()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeNav, setActiveNav] = useState('home')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [userCount, setUserCount] = useState(0)
  const [isGrowthPositive, setIsGrowthPositive] = useState(true)
  const [showUsersAdded, setShowUsersAdded] = useState(false)
  const [usersAdded, setUsersAdded] = useState(0)
  const [classroomCount, setClassroomCount] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [isClassroomGrowthPositive, setIsClassroomGrowthPositive] = useState(true)
  const [showClassroomsAdded, setShowClassroomsAdded] = useState(false)
  const [classroomsAdded, setClassroomsAdded] = useState(0)
  const [academyId, setAcademyId] = useState('')
  const [userId, setUserId] = useState('')
  const [activeSessionsThisWeek, setActiveSessionsThisWeek] = useState(0)
  const [upcomingSessionsToday, setUpcomingSessionsToday] = useState(0)
  const [totalStudentsPresent, setTotalStudentsPresent] = useState(0)
  const [sessionsWithAttendance, setSessionsWithAttendance] = useState(0)
  const [weeklySessionData, setWeeklySessionData] = useState<{date: string, sessions: number, present: number}[]>([])
  const [weeklyRevenueData, setWeeklyRevenueData] = useState<{date: string, revenue: number}[]>([])
  const [totalRevenueWeek, setTotalRevenueWeek] = useState(0)
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const bellButtonRef = useRef<HTMLButtonElement>(null)
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | undefined>(undefined)
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(undefined)
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined)
  const [selectedPlan, setSelectedPlan] = useState<{
    name: string
    price: string
    description: string
    features: string[]
    additionalCosts?: string[]
  } | undefined>(undefined)
  const [showChatWidget, setShowChatWidget] = useState(false)

  const handleNavigateToSessions = (classroomId?: string) => {
    setSelectedClassroomId(classroomId)
    setSelectedDate(undefined) // Clear date filter when navigating normally
    setActiveNav('sessions')
  }

  const handleNavigateToTodaySessions = () => {
    setSelectedClassroomId(undefined) // Clear classroom filter
    setSelectedDate(new Date().toISOString().split('T')[0]) // Set to today's date
    setActiveNav('sessions')
  }

  const handleNavigateToAssignments = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setActiveNav('assignments')
  }

  const handleNavigateToAttendance = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setActiveNav('attendance')  
  }

  const handleNavigateToOrderSummary = (plan: {
    name: string
    price: string
    description: string
    features: string[]
    additionalCosts?: string[]
  }) => {
    setSelectedPlan(plan)
    setActiveNav('order-summary')
  }

  const handleBackToUpgrade = () => {
    setSelectedPlan(undefined)
    setActiveNav('upgrade')
  }

  const handleActivityClick = (activity: any) => {
    if (activity.navigationData?.page) {
      setActiveNav(activity.navigationData.page)
      
      // Clear any existing filters when navigating from activities
      setSelectedClassroomId(undefined)
      setSelectedSessionId(undefined)
      setSelectedDate(undefined)
    }
  }

  const handleHelpClick = () => {
    setShowChatWidget(true)
  }

  // Fetch unread notification count
  const fetchUnreadNotificationCount = useCallback(async () => {
    if (!userId) return
    
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) throw error
      setUnreadNotificationCount(count || 0)
    } catch (error) {
      console.error('Error fetching notification count:', error)
    }
  }, [userId])

  // Handle notification click with smart navigation
  const handleNotificationClick = useCallback(async (notification: any) => {
    try {
      // Mark notification as read if it's unread
      if (!notification.is_read) {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true, updated_at: new Date().toISOString() })
          .eq('id', notification.id)

        if (error) throw error
        
        // Update notification count
        fetchUnreadNotificationCount()
      }

      // Parse navigation data
      const navigationData = notification.navigation_data || {}
      const targetPage = navigationData.page
      const filters = navigationData.filters || {}

      // Navigate based on notification type and data
      if (targetPage && targetPage !== 'dashboard') {
        // Set the target page
        setActiveNav(targetPage)

        // Apply filters based on navigation data
        if (filters.classroomId) {
          setSelectedClassroomId(filters.classroomId)
        }
        if (filters.sessionId) {
          setSelectedSessionId(filters.sessionId)
        }
        
        // Clear conflicting filters
        if (targetPage === 'sessions' && !filters.sessionId) {
          setSelectedSessionId(undefined)
        }
        if (targetPage !== 'sessions' && targetPage !== 'assignments' && targetPage !== 'attendance') {
          setSelectedSessionId(undefined)
        }
      } else {
        // Default to dashboard for alerts or notifications without specific pages
        setActiveNav('dashboard')
      }

      // Close the dropdown
      setNotificationDropdownOpen(false)
      
    } catch (error) {
      console.error('Error handling notification click:', error)
    }
  }, [fetchUnreadNotificationCount])

  // Fetch sessions data
  const fetchSessionsData = useCallback(async () => {
    if (!academyId) return
    
    try {
      // Get current week's start and end dates
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0)
      
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6) // End of week (Saturday)
      endOfWeek.setHours(23, 59, 59, 999)

      // Get today's start and end
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date()
      endOfDay.setHours(23, 59, 59, 999)

      // Count sessions this week (using classroom_sessions table)
      const { count: weeklyCount, error: weeklyError } = await supabase
        .from('classroom_sessions')
        .select('*, classrooms!inner(academy_id)', { count: 'exact', head: true })
        .eq('classrooms.academy_id', academyId)
        .gte('date', startOfWeek.toISOString().split('T')[0])
        .lte('date', endOfWeek.toISOString().split('T')[0])
        .is('deleted_at', null)

      if (!weeklyError) {
        setActiveSessionsThisWeek(weeklyCount || 0)
      } else {
        console.error('Error fetching weekly sessions:', weeklyError)
      }

      // Count sessions today (using classroom_sessions table) 
      const { count: todayCount, error: todayError } = await supabase
        .from('classroom_sessions')
        .select('*, classrooms!inner(academy_id)', { count: 'exact', head: true })
        .eq('classrooms.academy_id', academyId)
        .eq('date', startOfDay.toISOString().split('T')[0])
        .is('deleted_at', null)

      if (!todayError) {
        setUpcomingSessionsToday(todayCount || 0)
      } else {
        console.error('Error fetching today\'s sessions:', todayError)
      }

      // Get detailed session and attendance data for the week
      const { data: sessionsThisWeek, error: sessionsError } = await supabase
        .from('classroom_sessions')
        .select('id, date, classrooms!inner(academy_id)')
        .eq('classrooms.academy_id', academyId)
        .gte('date', startOfWeek.toISOString().split('T')[0])
        .lte('date', endOfWeek.toISOString().split('T')[0])
        .is('deleted_at', null)

      if (!sessionsError && sessionsThisWeek) {
        // Get attendance data for these sessions
        const sessionIds = sessionsThisWeek.map(s => s.id)
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('session_attendance')
          .select('session_id, status')
          .in('session_id', sessionIds)

        // Group data by date
        const dailyData: {[key: string]: {sessions: number, present: number}} = {}
        
        // Initialize all days of the week
        for (let i = 0; i < 7; i++) {
          const currentDate = new Date(startOfWeek)
          currentDate.setDate(startOfWeek.getDate() + i)
          const dateKey = currentDate.toISOString().split('T')[0]
          dailyData[dateKey] = { sessions: 0, present: 0 }
        }

        // Count sessions per day
        sessionsThisWeek.forEach(session => {
          dailyData[session.date].sessions++
        })

        // Count present students per day (group by session first, then by date)
        if (!attendanceError && attendanceData) {
          const sessionDateMap: {[sessionId: string]: string} = {}
          sessionsThisWeek.forEach(session => {
            sessionDateMap[session.id] = session.date
          })

          attendanceData.forEach(record => {
            if (record.status === 'present') {
              const sessionDate = sessionDateMap[record.session_id]
              if (sessionDate && dailyData[sessionDate]) {
                dailyData[sessionDate].present++
              }
            }
          })
        }

        // Convert to array format for the graph
        const chartData = Object.entries(dailyData).map(([date, data]) => ({
          date,
          sessions: data.sessions,
          present: data.present
        }))

        setWeeklySessionData(chartData)
        
        // Set totals
        const totalPresent = chartData.reduce((sum, day) => sum + day.present, 0)
        const daysWithSessions = chartData.filter(day => day.sessions > 0).length
        setTotalStudentsPresent(totalPresent)
        setSessionsWithAttendance(daysWithSessions)
      } else {
        console.error('Error fetching sessions data:', sessionsError)
        setWeeklySessionData([])
        setTotalStudentsPresent(0)
        setSessionsWithAttendance(0)
      }

      // Get daily revenue data for the week
      const { data: revenueThisWeek, error: revenueWeekError } = await supabase
        .from('invoices')
        .select('final_amount, paid_at')
        .eq('academy_id', academyId)
        .eq('status', 'paid')
        .gte('paid_at', startOfWeek.toISOString())
        .lte('paid_at', endOfWeek.toISOString())

      if (!revenueWeekError && revenueThisWeek) {
        // Group revenue by date
        const dailyRevenue: {[key: string]: number} = {}
        
        // Initialize all days of the week
        for (let i = 0; i < 7; i++) {
          const currentDate = new Date(startOfWeek)
          currentDate.setDate(startOfWeek.getDate() + i)
          const dateKey = currentDate.toISOString().split('T')[0]
          dailyRevenue[dateKey] = 0
        }

        // Sum revenue per day
        revenueThisWeek.forEach(invoice => {
          const paidDate = new Date(invoice.paid_at).toISOString().split('T')[0]
          if (dailyRevenue[paidDate] !== undefined) {
            dailyRevenue[paidDate] += parseFloat(invoice.final_amount)
          }
        })

        // Convert to array format for the graph
        const revenueChartData = Object.entries(dailyRevenue).map(([date, revenue]) => ({
          date,
          revenue: Math.round(revenue)
        }))

        setWeeklyRevenueData(revenueChartData)
        setTotalRevenueWeek(revenueChartData.reduce((sum, day) => sum + day.revenue, 0))
      } else {
        console.error('Error fetching revenue data:', revenueWeekError)
        setWeeklyRevenueData([])
        setTotalRevenueWeek(0)
      }

      // Debug: Log session counts
      console.log('Session counts:', {
        weeklyCount: weeklyCount || 0,
        todayCount: todayCount || 0,
        academyId,
        weekStart: startOfWeek.toISOString().split('T')[0],
        weekEnd: endOfWeek.toISOString().split('T')[0],
        today: startOfDay.toISOString().split('T')[0],
        weeklyError,
        todayError
      })

      // Fetch recent activities (last 5 activities)
      const activities = []
      
      // Get recent enrollments (students)
      const { data: recentStudents, error: studentsError } = await supabase
        .from('students')
        .select('user_id, users!inner(name), created_at')
        .eq('academy_id', academyId)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(3)

      if (!studentsError && recentStudents) {
        recentStudents.forEach(student => {
          activities.push({
            type: 'student_enrolled',
            title: t("dashboard.newStudentEnrolled"),
            description: `${student.users.name} ${t("dashboard.joinedTheAcademy")}`,
            timestamp: student.created_at,
            icon: 'user',
            navigationData: {
              page: 'students',
              studentId: student.user_id
            }
          })
        })
      }

      // Get recent payments
      const { data: recentPayments, error: paymentsError } = await supabase
        .from('invoices')
        .select('id, final_amount, status, created_at, paid_at, students!inner(user_id, users!inner(name))')
        .eq('academy_id', academyId)
        .eq('status', 'paid')
        .order('paid_at', { ascending: false })
        .limit(2)

      if (!paymentsError && recentPayments) {
        recentPayments.forEach(payment => {
          activities.push({
            type: 'payment_received',
            title: t("dashboard.paymentReceived"),
            description: `${payment.students.users.name} ${t("dashboard.from")} ₩${parseInt(payment.final_amount).toLocaleString()}`,
            timestamp: payment.paid_at || payment.created_at,
            icon: 'payment',
            navigationData: {
              page: 'payments',
              invoiceId: payment.id,
              studentId: payment.students.user_id
            }
          })
        })
      }

      // Sort activities by timestamp and take the most recent 5
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setRecentActivities(activities.slice(0, 5))

    } catch (error) {
      console.error('Error fetching sessions data:', error)
    }
  }, [academyId])

  // Fetch notification count when user changes
  useEffect(() => {
    if (userId) {
      fetchUnreadNotificationCount()
      
      // Set up real-time subscription for notification changes
      const subscription = supabase
        .channel('notifications_changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          }, 
          () => {
            fetchUnreadNotificationCount()
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [userId, fetchUnreadNotificationCount])

  // Fetch sessions data when academyId changes
  useEffect(() => {
    if (academyId) {
      fetchSessionsData()
    }
  }, [academyId, fetchSessionsData])

  // Clear filters when navigating away from specific tabs
  useEffect(() => {
    if (activeNav !== 'sessions') {
      setSelectedClassroomId(undefined)
    }
    if (activeNav !== 'assignments' && activeNav !== 'attendance') {
      setSelectedSessionId(undefined)
    }
    if (activeNav !== 'order-summary') {
      setSelectedPlan(undefined)
    }
  }, [activeNav])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get user from session (faster than separate calls)
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setTimeout(() => router.push('/auth'), 2100)
          return
        }

        // Store user ID for settings page
        setUserId(user.id)

        // Check user role
        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (error || !userData) {
          setTimeout(() => router.push('/auth'), 2100)
          return
        }

        if (userData.role === 'manager' || userData.role === 'teacher') {
          setIsAuthorized(true)
          // Get user name for display
          const { data: userProfile } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', user.id)
            .single()
          
          if (userProfile) {
            setUserName(userProfile.name || 'User')
            setUserEmail(userProfile.email || user.email || '')
            
            // Fetch user count for the academy from role-specific tables
            // First, get the academy_id from the appropriate role table
            let academyId = null
            
            if (userData.role === 'manager') {
              const { data: managerData } = await supabase
                .from('managers')
                .select('academy_id')
                .eq('user_id', user.id)
                .single()
              academyId = managerData?.academy_id
            } else if (userData.role === 'teacher') {
              const { data: teacherData } = await supabase
                .from('teachers')
                .select('academy_id')
                .eq('user_id', user.id)
                .single()
              academyId = teacherData?.academy_id
            }
            
            // Store academy_id in state for child components
            if (academyId) {
              setAcademyId(academyId)
            }
            
            if (academyId) {
              // Debug: log the academy_id being used
              // console.log('Academy ID:', academyId)
              
              // Count all active users across role tables for this academy
              console.log('Starting user count queries for academy:', academyId)
              
              // Debug: First get actual manager data to see what's accessible
              const { data: managerData, error: managerDataError } = await supabase
                .from('managers')
                .select('user_id, academy_id, active')
                .eq('academy_id', academyId)
                .eq('active', true)

              console.log('Manager debug data:', { 
                managerData, 
                managerDataError, 
                expectedAcademyId: academyId,
                managerCount: managerData?.length || 0,
                currentUserId: userId
              })
              
              const { count: managerCount, error: managerError } = await supabase
                .from('managers')
                .select('user_id', { count: 'exact', head: true })
                .eq('academy_id', academyId)
                .eq('active', true)
              
              console.log('Manager query result:', { managerCount, managerError })
              
              // Debug: First get actual teacher data to see what's there
              const { data: teacherData, error: teacherDataError } = await supabase
                .from('teachers')
                .select('user_id, academy_id, active')
                .eq('academy_id', academyId)
                .eq('active', true)

              console.log('Teacher debug data:', { 
                teacherData, 
                teacherDataError, 
                expectedAcademyId: academyId,
                teacherCount: teacherData?.length || 0
              })

              const { count: teacherCount, error: teacherError } = await supabase
                .from('teachers')
                .select('user_id', { count: 'exact', head: true })
                .eq('academy_id', academyId)
                .eq('active', true)
              
              console.log('Teacher query result:', { teacherCount, teacherError })
              
              const { count: parentCount, error: parentError } = await supabase
                .from('parents')
                .select('user_id', { count: 'exact', head: true })
                .eq('academy_id', academyId)
                .eq('active', true)
              
              console.log('Parent query result:', { parentCount, parentError })
              
              const { count: studentCount, error: studentError } = await supabase
                .from('students')
                .select('user_id', { count: 'exact', head: true })
                .eq('academy_id', academyId)
                .eq('active', true)
              
              console.log('Student query result:', { studentCount, studentError })
              
              // Debug: Log the individual counts to see what's happening
              console.log('User counts:', {
                managers: managerCount || 0,
                teachers: teacherCount || 0, 
                parents: parentCount || 0,
                students: studentCount || 0,
                total: (managerCount || 0) + (teacherCount || 0) + (parentCount || 0) + (studentCount || 0),
                academyId,
                managerError,
                teacherError,
                parentError,
                studentError
              })

              // Fetch total revenue from paid invoices this month only
              const startOfMonth = new Date()
              startOfMonth.setDate(1)
              startOfMonth.setHours(0, 0, 0, 0)
              
              const endOfMonth = new Date(startOfMonth)
              endOfMonth.setMonth(startOfMonth.getMonth() + 1)
              endOfMonth.setSeconds(-1)

              const { data: revenueData, error: revenueError } = await supabase
                .from('invoices')
                .select('final_amount, paid_at, students!inner(academy_id)')
                .eq('status', 'paid')
                .eq('students.academy_id', academyId)
                .gte('paid_at', startOfMonth.toISOString())
                .lt('paid_at', endOfMonth.toISOString())

              if (!revenueError && revenueData) {
                const revenue = revenueData.reduce((sum, invoice) => sum + parseFloat(invoice.final_amount), 0)
                setTotalRevenue(revenue)
                console.log('Revenue data:', { 
                  invoiceCount: revenueData.length, 
                  totalRevenue: revenue, 
                  revenueError 
                })
              } else {
                console.error('Error fetching revenue:', revenueError)
              }
              
              const totalCount = (managerCount || 0) + (teacherCount || 0) + (parentCount || 0) + (studentCount || 0)
              
              console.log('Final user count calculation:', {
                managerCount: managerCount || 0,
                teacherCount: teacherCount || 0,
                parentCount: parentCount || 0,
                studentCount: studentCount || 0,
                total: totalCount
              })
              
              setUserCount(totalCount)
              
              // Calculate month-over-month growth based on user creation dates
              // Since all users were created in July 2025 with no previous month data,
              // show the number of users added instead of percentage
              setShowUsersAdded(true)
              setUsersAdded(totalCount)
              setIsGrowthPositive(true)
              
              // Get actual classroom count for this academy (using deleted_at for soft delete)
              const { count: actualClassroomCount, error: classroomError } = await supabase
                .from('classrooms')
                .select('*', { count: 'exact', head: true })
                .eq('academy_id', academyId)
                .is('deleted_at', null)
              
              if (!classroomError) {
                const classroomCount = actualClassroomCount || 0
                setClassroomCount(classroomCount)
                setShowClassroomsAdded(true)
                setClassroomsAdded(classroomCount)
                setIsClassroomGrowthPositive(true)
              } else {
                console.error('Error fetching classroom count:', classroomError)
                // Fallback to 0 if there's an error
                setClassroomCount(0)
              }
            }
          }
        } else {
          setTimeout(() => router.push('/mobile'), 2100)
        }
      } catch {
        setTimeout(() => router.push('/auth'), 2100)
      }
      // Don't set loading to false here - let LoadingScreen control it
    }

    checkAuth()
  }, [router])

  if (loading) {
    return <LoadingScreen onComplete={() => setLoading(false)} />
  }

  if (!isAuthorized) {
    return null // Will redirect
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      {sidebarVisible && (
        <Sidebar activeItem={activeNav} onItemChange={setActiveNav} userName={userName} onHelpClick={handleHelpClick} />
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSidebarVisible(!sidebarVisible)}
                className="p-2"
              >
                {sidebarVisible ? (
                  <PanelLeftClose className="w-4 h-4 text-gray-600" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4 text-gray-600" />
                )}
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Button 
                  ref={bellButtonRef}
                  variant="ghost" 
                  size="sm" 
                  className="relative p-2"
                  onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                >
                  <Bell className="w-4 h-4 text-gray-600" />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[12px] h-3 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center px-0.5">
                      {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                    </span>
                  )}
                </Button>
                
                <NotificationDropdown
                  userId={userId}
                  isOpen={notificationDropdownOpen}
                  onClose={() => setNotificationDropdownOpen(false)}
                  onNavigateToNotifications={() => {
                    setActiveNav('notifications')
                    setNotificationDropdownOpen(false)
                  }}
                  onNotificationUpdate={fetchUnreadNotificationCount}
                  onNotificationClick={handleNotificationClick}
                  bellButtonRef={bellButtonRef}
                />
              </div>
              
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {activeNav === 'classrooms' ? (
            <div className="h-full overflow-y-auto scroll-smooth">
              <ClassroomsPage academyId={academyId} onNavigateToSessions={handleNavigateToSessions} />
            </div>
          ) : activeNav === 'sessions' ? (
            <div className="h-full overflow-y-auto scroll-smooth">
              <SessionsPage 
                academyId={academyId} 
                filterClassroomId={selectedClassroomId}
                filterDate={selectedDate}
                onNavigateToAssignments={handleNavigateToAssignments}
                onNavigateToAttendance={handleNavigateToAttendance}
              />
            </div>
          ) : activeNav === 'assignments' ? (
            <div className="h-full overflow-y-auto scroll-smooth">
              <AssignmentsPage academyId={academyId} filterSessionId={selectedSessionId} />
            </div>
          ) : activeNav === 'attendance' ? (
            <div className="h-full overflow-y-auto scroll-smooth">
              <AttendancePage academyId={academyId} filterSessionId={selectedSessionId} />
            </div>
          ) : activeNav === 'payments' ? (
            <div className="h-full overflow-y-auto scroll-smooth">
              <PaymentsPage academyId={academyId} />
            </div>
          ) : activeNav === 'reports' ? (
            <div className="h-full overflow-y-auto scroll-smooth">
              <ReportsPage academyId={academyId} />
            </div>
          ) : activeNav === 'upgrade' ? (
            <div className="h-full overflow-y-auto scroll-smooth">
              <UpgradePage academyId={academyId} onNavigateToOrderSummary={handleNavigateToOrderSummary} />
            </div>
          ) : activeNav === 'order-summary' ? (
            <div className="h-full overflow-y-auto scroll-smooth">
              <OrderSummaryPage academyId={academyId} selectedPlan={selectedPlan} onBack={handleBackToUpgrade} />
            </div>
          ) : activeNav === 'teachers' ? (
            <div className="h-full overflow-y-auto scroll-smooth">
              <TeachersPage academyId={academyId} />
            </div>
          ) : activeNav === 'families' ? (
            <div className="h-full overflow-y-auto scroll-smooth">
              <FamiliesPage academyId={academyId} />
            </div>
          ) : activeNav === 'parents' ? (
            <div className="h-full overflow-y-auto scroll-smooth">
              <ParentsPage academyId={academyId} />
            </div>
          ) : activeNav === 'students' ? (
            <div className="h-full overflow-y-auto scroll-smooth">
              <StudentsPage academyId={academyId} />
            </div>
          ) : activeNav === 'settings' ? (
            <div className="h-full overflow-y-auto scroll-smooth">
              <SettingsPage userId={userId} />
            </div>
          ) : activeNav === 'notifications' ? (
            <div className="h-full overflow-y-auto scroll-smooth">
              <NotificationsPage 
                userId={userId}
                onNavigate={(page, filters) => {
                  setActiveNav(page)
                  if (filters?.classroomId) setSelectedClassroomId(filters.classroomId)
                  if (filters?.sessionId) setSelectedSessionId(filters.sessionId)
                }} 
              />
            </div>
          ) : (
            // Default Dashboard Content
            <div className="h-full overflow-y-auto scroll-smooth">
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
              <div className="flex items-center text-sm text-gray-500">
                <CreditCard className="w-4 h-4 mr-1" />
                <span>{t("dashboard.fromPaidInvoices")}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{t("dashboard.paymentsReceivedThisMonth")}</p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">{t("dashboard.allActiveUsers")}</h3>
                <div className={`flex items-center text-sm ${
                  showUsersAdded ? 'text-blue-600' :
                  userCount === 0 ? 'text-gray-600' : 
                  isGrowthPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {showUsersAdded ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : userCount === 0 ? (
                    <Minus className="w-4 h-4 mr-1" />
                  ) : isGrowthPositive ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  <span>
                    {showUsersAdded ? `+${usersAdded}` :
                     userCount === 0 ? '0%' : 
                     `${isGrowthPositive ? '+' : '-'}${userCount}`}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">{userCount.toLocaleString()}</div>
              <div className="flex items-center text-sm text-gray-500">
                {showUsersAdded ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : userCount === 0 ? (
                  <Minus className="w-4 h-4 mr-1" />
                ) : isGrowthPositive ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                <span>
                  {showUsersAdded ? t("dashboard.newUsersAddedThisMonth") :
                   userCount === 0 ? t("dashboard.noChange") : 
                   `${isGrowthPositive ? t("dashboard.up") : t("dashboard.down")} ${userCount} ${t("dashboard.users")} this month`}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{t("dashboard.totalActiveUsersInAcademy")}</p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">{t("dashboard.totalClassrooms")}</h3>
                <div className={`flex items-center text-sm ${
                  showClassroomsAdded ? 'text-blue-600' :
                  classroomCount === 0 ? 'text-gray-600' : 
                  isClassroomGrowthPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {showClassroomsAdded ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : classroomCount === 0 ? (
                    <Minus className="w-4 h-4 mr-1" />
                  ) : isClassroomGrowthPositive ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  <span>
                    {showClassroomsAdded ? `+${classroomsAdded} ${t("dashboard.classrooms")}` :
                     classroomCount === 0 ? '0%' : 
                     `${isClassroomGrowthPositive ? '+' : '-'}${classroomCount} ${t("dashboard.classrooms")}`}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">{classroomCount.toLocaleString()}</div>
              <div className="flex items-center text-sm text-gray-500">
                {showClassroomsAdded ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : classroomCount === 0 ? (
                  <Minus className="w-4 h-4 mr-1" />
                ) : isClassroomGrowthPositive ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                <span>
                  {showClassroomsAdded ? t("dashboard.newClassroomsAddedThisMonth") :
                   classroomCount === 0 ? t("dashboard.noChange") : 
                   `${isClassroomGrowthPositive ? t("dashboard.up") : t("dashboard.down")} ${classroomCount} ${t("dashboard.classrooms")} this month`}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{t("dashboard.totalClassroomsInAcademy")}</p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">{t("dashboard.activeSessionsThisWeek")}</h3>
                <div className="flex items-center text-blue-600 text-sm">
                  <Activity className="w-4 h-4 mr-1" />
                  <span>{upcomingSessionsToday > 0 ? `${upcomingSessionsToday} ${t("dashboard.today")}` : `0 ${t("dashboard.today")}`}</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">{activeSessionsThisWeek}</div>
              <div className="flex items-center text-sm text-gray-500">
                <Activity className="w-4 h-4 mr-1" />
                <span>{t("dashboard.sessionsScheduledThisWeek")}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{t("dashboard.includesUpcomingSessions")}</p>
            </div>
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-stretch">
            {/* Revenue Graph */}
            <Card className="p-6 bg-gradient-to-br from-cyan-600 to-teal-600 text-white relative overflow-hidden flex flex-col">
              <div className="relative z-10 flex-1 flex flex-col">
                <div className="w-fit bg-cyan-500 text-xs font-medium px-2 py-1 rounded mb-3">
                  {t("dashboard.revenue").toUpperCase()}
                </div>
                <h3 className="text-lg font-bold mb-2">
                  ₩{totalRevenueWeek.toLocaleString()} {t("dashboard.thisWeek")}
                </h3>
                <p className="text-cyan-100 text-sm mb-3">
                  {t("dashboard.fromPaidInvoices")}
                </p>
                
                {/* Weekly Revenue Line Chart */}
                <div className="mb-4">
                  <div className="relative h-32">
                    <svg width="100%" height="100%" viewBox="0 0 400 128" className="overflow-visible">
                      {(() => {
                        const maxRevenue = Math.max(...weeklyRevenueData.map(d => d.revenue), 50000) // Minimum scale
                        
                        const chartLeft = 30
                        const chartRight = 370
                        const chartTop = 15
                        const chartBottom = 100
                        const chartWidth = chartRight - chartLeft
                        const chartHeight = chartBottom - chartTop
                        
                        return (
                          <>
                            {/* Y-axis */}
                            <line 
                              x1={chartLeft} 
                              y1={chartTop} 
                              x2={chartLeft} 
                              y2={chartBottom} 
                              stroke="rgba(255,255,255,0.3)" 
                              strokeWidth="1"
                            />
                            
                            {/* X-axis */}
                            <line 
                              x1={chartLeft} 
                              y1={chartBottom} 
                              x2={chartRight} 
                              y2={chartBottom} 
                              stroke="rgba(255,255,255,0.3)" 
                              strokeWidth="1"
                            />
                            
                            {/* Y-axis labels */}
                            {[0, Math.ceil(maxRevenue/2), maxRevenue].map((value, index) => {
                              const y = chartBottom - (value / maxRevenue) * chartHeight
                              const displayValue = value >= 1000 ? `${Math.round(value/1000)}K` : value.toString()
                              return (
                                <g key={`revenue-y-${index}`}>
                                  <line 
                                    x1={chartLeft-3} 
                                    y1={y} 
                                    x2={chartLeft+3} 
                                    y2={y} 
                                    stroke="rgba(255,255,255,0.3)" 
                                    strokeWidth="1"
                                  />
                                  <text 
                                    x={chartLeft-8} 
                                    y={y+3} 
                                    fill="rgba(255,255,255,0.7)" 
                                    fontSize="9" 
                                    textAnchor="end"
                                  >
                                    ₩{displayValue}
                                  </text>
                                  {/* Grid line */}
                                  <line 
                                    x1={chartLeft} 
                                    y1={y} 
                                    x2={chartRight} 
                                    y2={y} 
                                    stroke="rgba(255,255,255,0.1)" 
                                    strokeWidth="1"
                                    strokeDasharray="2,2"
                                  />
                                </g>
                              )
                            })}
                            
                            {/* X-axis labels and grid lines */}
                            {weeklyRevenueData.map((day, index) => {
                              const x = chartLeft + (index * (chartWidth / 6))
                              const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })
                              return (
                                <g key={`revenue-x-${index}`}>
                                  <line 
                                    x1={x} 
                                    y1={chartBottom-3} 
                                    x2={x} 
                                    y2={chartBottom+3} 
                                    stroke="rgba(255,255,255,0.3)" 
                                    strokeWidth="1"
                                  />
                                  <text 
                                    x={x} 
                                    y={chartBottom+18} 
                                    fill="rgba(255,255,255,0.7)" 
                                    fontSize="11" 
                                    textAnchor="middle"
                                  >
                                    {dayName.charAt(0)}
                                  </text>
                                  {/* Vertical grid line */}
                                  <line 
                                    x1={x} 
                                    y1={chartTop} 
                                    x2={x} 
                                    y2={chartBottom} 
                                    stroke="rgba(255,255,255,0.1)" 
                                    strokeWidth="1"
                                    strokeDasharray="2,2"
                                  />
                                </g>
                              )
                            })}
                            
                            {/* Revenue line */}
                            <polyline
                              fill="none"
                              stroke="#06b6d4"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={weeklyRevenueData.map((day, index) => {
                                const x = chartLeft + (index * (chartWidth / 6))
                                const y = chartBottom - (day.revenue / maxRevenue) * chartHeight
                                return `${x},${y}`
                              }).join(' ')}
                            />
                            
                            {/* Data points for revenue */}
                            {weeklyRevenueData.map((day, index) => {
                              const x = chartLeft + (index * (chartWidth / 6))
                              const y = chartBottom - (day.revenue / maxRevenue) * chartHeight
                              return (
                                <circle
                                  key={`revenue-${index}`}
                                  cx={x}
                                  cy={y}
                                  r="5"
                                  fill="#06b6d4"
                                  stroke="white"
                                  strokeWidth="2"
                                >
                                  <title>{`₩${day.revenue.toLocaleString()} on ${new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}`}</title>
                                </circle>
                              )
                            })}
                          </>
                        )
                      })()}
                    </svg>
                  </div>
                </div>

                <div className="mt-auto">
                  <Button 
                    className="bg-white text-cyan-600 hover:bg-gray-100 text-sm h-8"
                    onClick={() => setActiveNav('payments')}
                  >
                    {t("dashboard.viewPayments")}
                  </Button>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500 rounded-full -mr-12 -mt-12 opacity-20" />
              <div className="absolute bottom-0 right-0 w-16 h-16 bg-teal-400 rounded-full -mr-8 -mb-8 opacity-30" />
            </Card>

            {/* Sessions Graph */}
            <Card className="p-6 bg-gradient-to-br from-gray-600 to-gray-700 text-white relative overflow-hidden flex flex-col">
              <div className="relative z-10 flex-1 flex flex-col">
                <div className="w-fit bg-gray-500 text-xs font-medium px-2 py-1 rounded mb-3">
                  {t("dashboard.thisWeek").toUpperCase()}
                </div>
                <h3 className="text-lg font-bold mb-2">
                  {activeSessionsThisWeek > 0 
                    ? `${activeSessionsThisWeek} ${activeSessionsThisWeek > 1 ? t("navigation.sessions") : t("sessions.session")} ${t("dashboard.thisWeek")}`
                    : `${t("dashboard.noSessionsToday")}`
                  }
                </h3>
                <p className="text-gray-100 text-sm mb-3">
                  {sessionsWithAttendance > 0 
                    ? `${sessionsWithAttendance} ${t("dashboard.days")} • ${totalStudentsPresent} ${t("dashboard.studentsPresent")}`
                    : t("dashboard.noAttendanceRecordedYet")
                  }
                </p>
                
                {/* Weekly Line Chart */}
                <div className="mb-4">
                  <div className="relative h-32">
                    <svg width="100%" height="100%" viewBox="0 0 400 128" className="overflow-visible">
                      {(() => {
                        const maxSessions = Math.max(...weeklySessionData.map(d => d.sessions), 1)
                        const maxPresent = Math.max(...weeklySessionData.map(d => d.present), 1)
                        const maxValue = Math.max(maxSessions, maxPresent, 5) // Minimum scale of 5
                        
                        const chartLeft = 30
                        const chartRight = 370
                        const chartTop = 15
                        const chartBottom = 100
                        const chartWidth = chartRight - chartLeft
                        const chartHeight = chartBottom - chartTop
                        
                        return (
                          <>
                            {/* Y-axis */}
                            <line 
                              x1={chartLeft} 
                              y1={chartTop} 
                              x2={chartLeft} 
                              y2={chartBottom} 
                              stroke="rgba(255,255,255,0.3)" 
                              strokeWidth="1"
                            />
                            
                            {/* X-axis */}
                            <line 
                              x1={chartLeft} 
                              y1={chartBottom} 
                              x2={chartRight} 
                              y2={chartBottom} 
                              stroke="rgba(255,255,255,0.3)" 
                              strokeWidth="1"
                            />
                            
                            {/* Y-axis labels */}
                            {[0, Math.ceil(maxValue/2), maxValue].map((value, index) => {
                              const y = chartBottom - (value / maxValue) * chartHeight
                              return (
                                <g key={`y-${index}`}>
                                  <line 
                                    x1={chartLeft-3} 
                                    y1={y} 
                                    x2={chartLeft+3} 
                                    y2={y} 
                                    stroke="rgba(255,255,255,0.3)" 
                                    strokeWidth="1"
                                  />
                                  <text 
                                    x={chartLeft-8} 
                                    y={y+3} 
                                    fill="rgba(255,255,255,0.7)" 
                                    fontSize="10" 
                                    textAnchor="end"
                                  >
                                    {value}
                                  </text>
                                  {/* Grid line */}
                                  <line 
                                    x1={chartLeft} 
                                    y1={y} 
                                    x2={chartRight} 
                                    y2={y} 
                                    stroke="rgba(255,255,255,0.1)" 
                                    strokeWidth="1"
                                    strokeDasharray="2,2"
                                  />
                                </g>
                              )
                            })}
                            
                            {/* X-axis labels and grid lines */}
                            {weeklySessionData.map((day, index) => {
                              const x = chartLeft + (index * (chartWidth / 6))
                              const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })
                              return (
                                <g key={`x-${index}`}>
                                  <line 
                                    x1={x} 
                                    y1={chartBottom-3} 
                                    x2={x} 
                                    y2={chartBottom+3} 
                                    stroke="rgba(255,255,255,0.3)" 
                                    strokeWidth="1"
                                  />
                                  <text 
                                    x={x} 
                                    y={chartBottom+18} 
                                    fill="rgba(255,255,255,0.7)" 
                                    fontSize="11" 
                                    textAnchor="middle"
                                  >
                                    {dayName.charAt(0)}
                                  </text>
                                  {/* Vertical grid line */}
                                  <line 
                                    x1={x} 
                                    y1={chartTop} 
                                    x2={x} 
                                    y2={chartBottom} 
                                    stroke="rgba(255,255,255,0.1)" 
                                    strokeWidth="1"
                                    strokeDasharray="2,2"
                                  />
                                </g>
                              )
                            })}
                            
                            {/* Generate points for sessions line */}
                            <polyline
                              fill="none"
                              stroke="#60a5fa"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={weeklySessionData.map((day, index) => {
                                const x = chartLeft + (index * (chartWidth / 6))
                                const y = chartBottom - (day.sessions / maxValue) * chartHeight
                                return `${x},${y}`
                              }).join(' ')}
                            />
                            
                            {/* Generate points for present students line */}
                            <polyline
                              fill="none"
                              stroke="#4ade80"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={weeklySessionData.map((day, index) => {
                                const x = chartLeft + (index * (chartWidth / 6))
                                const y = chartBottom - (day.present / maxValue) * chartHeight
                                return `${x},${y}`
                              }).join(' ')}
                            />
                            
                            {/* Data points for sessions */}
                            {weeklySessionData.map((day, index) => {
                              const x = chartLeft + (index * (chartWidth / 6))
                              const y = chartBottom - (day.sessions / maxValue) * chartHeight
                              return (
                                <circle
                                  key={`session-${index}`}
                                  cx={x}
                                  cy={y}
                                  r="5"
                                  fill="#60a5fa"
                                  stroke="white"
                                  strokeWidth="2"
                                >
                                  <title>{`${day.sessions} sessions on ${new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}`}</title>
                                </circle>
                              )
                            })}
                            
                            {/* Data points for present students */}
                            {weeklySessionData.map((day, index) => {
                              const x = chartLeft + (index * (chartWidth / 6))
                              const y = chartBottom - (day.present / maxValue) * chartHeight
                              return (
                                <circle
                                  key={`present-${index}`}
                                  cx={x}
                                  cy={y}
                                  r="5"
                                  fill="#4ade80"
                                  stroke="white"
                                  strokeWidth="2"
                                >
                                  <title>{`${day.present} ${t("dashboard.studentsPresent")} on ${new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}`}</title>
                                </circle>
                              )
                            })}
                          </>
                        )
                      })()}
                    </svg>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex justify-center space-x-4 mt-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-0.5 bg-blue-400 rounded"></div>
                      <span className="text-xs text-gray-300">{t("navigation.sessions")}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-0.5 bg-green-400 rounded"></div>
                      <span className="text-xs text-gray-300">{t("attendance.present")}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-auto">
                  <Button 
                    className="bg-white text-gray-600 hover:bg-gray-100 text-sm h-8"
                    onClick={() => setActiveNav('sessions')}
                  >
                    {t("dashboard.viewAllSessions")}
                  </Button>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-gray-500 rounded-full -mr-12 -mt-12 opacity-20" />
              <div className="absolute bottom-0 right-0 w-16 h-16 bg-gray-400 rounded-full -mr-8 -mb-8 opacity-30" />
            </Card>
            
            <Card className="p-5 bg-gradient-to-br from-blue-600 to-blue-700 text-white relative overflow-hidden flex flex-col">
              <div className="relative z-10 flex-1 flex flex-col">
                <div className="w-fit bg-blue-500 text-xs font-medium px-2 py-1 rounded mb-3">
                  {t("dashboard.today").toUpperCase()}
                </div>
                <h3 className="text-lg font-bold mb-2">
                  {upcomingSessionsToday > 0 
                    ? `${upcomingSessionsToday} ${t("dashboard.sessionToday")}`
                    : t("dashboard.noSessionsToday")
                  }
                </h3>
                <p className="text-blue-100 text-sm mb-4">
                  {upcomingSessionsToday > 0 
                    ? t("dashboard.checkYourSchedule")
                    : t("dashboard.takeABreakOrPlan")
                  }
                </p>
                <div className="mt-auto">
                  <Button 
                    className="bg-white text-blue-600 hover:bg-gray-100 text-sm h-8"
                    onClick={handleNavigateToTodaySessions}
                  >
                    {upcomingSessionsToday > 0 ? t("dashboard.viewSessions") : t("dashboard.scheduleSession")}
                  </Button>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 rounded-full -mr-12 -mt-12 opacity-20" />
              <div className="absolute bottom-0 right-0 w-16 h-16 bg-blue-400 rounded-full -mr-8 -mb-8 opacity-30" />
            </Card>
          </div>
          
          {/* Recent Activity Feed */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t("dashboard.recentActivity")}</h3>
                <p className="text-sm text-gray-500">{t("dashboard.latestUpdatesFromAcademy")}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setActiveNav('notifications')}
                className="flex items-center gap-2"
              >
                <Bell className="w-4 h-4" />
                {t("common.viewAll")}
              </Button>
            </div>
            
            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
                  <div 
                    key={index} 
                    className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 cursor-pointer group" 
                    onClick={() => handleActivityClick(activity)}
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                      {activity.icon === 'user' ? (
                        <UserPlus className="w-5 h-5 text-blue-600" />
                      ) : activity.icon === 'payment' ? (
                        <CreditCard className="w-5 h-5 text-green-600" />
                      ) : (
                        <Activity className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(activity.timestamp).toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">{t("dashboard.noSessionsToday")}</h4>
                  <p className="text-gray-500">{t("dashboard.checkYourSchedule")}</p>
                </div>
              )}
            </div>
          </Card>
            </div>
          </div>
          )}
        </main>
      </div>

      {/* Chat Widget */}
      {showChatWidget && (
        <ChatWidget
          userId={userId}
          userName={userName}
          userEmail={userEmail}
          onClose={() => setShowChatWidget(false)}
        />
      )}
    </div>
  )
}