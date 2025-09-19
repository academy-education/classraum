"use client"

import { useEffect, useCallback, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useDashboardData } from '@/stores/mobileStore'
import { useMobileData } from '@/hooks/useProgressiveLoading'
import { getTeacherNamesWithCache } from '@/utils/mobileCache'
import { Card } from '@/components/ui/card'
import { AnimatedStatSkeleton, HomeInvoiceCardSkeleton, StaggeredListSkeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { Calendar, Clock, ClipboardList, ChevronRight, Receipt, RefreshCw, School, User, ChevronLeft, MapPin } from 'lucide-react'
import { useMobileStore } from '@/stores/mobileStore'
import { useSelectedStudentStore } from '@/stores/selectedStudentStore'

interface UpcomingSession {
  id: string
  className: string
  classroomColor: string
  time: string
  date: string
  teacherName: string
  academyName: string
}

interface Invoice {
  id: string
  amount: number
  status: string
  dueDate: string
  description: string
  academyName: string
}

interface Session {
  id: string
  date: string
  start_time: string
  end_time: string
  classroom: {
    id: string
    name: string
    color?: string
    teacher_id: string
  }
  location?: string
  day_of_week: string
  status: string
  duration_hours?: number
  duration_minutes?: number
  teacher_name?: string
  academy_name?: string
  attendance_status?: 'present' | 'absent' | 'late' | 'excused' | null
}

interface DbSessionData {
  id: string
  date: string
  start_time: string
  end_time: string
  status: string
  location?: string
  classroom_id: string
  classrooms?: {
    id: string
    name: string
    color: string
    academy_id: string
    teacher_id: string
    classroom_students?: {
      student_id: string
    }[]
  }[]
}






export default function MobilePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { user } = usePersistentMobileAuth()
  const { setData } = useDashboardData()
  const { selectedStudent } = useSelectedStudentStore()

  // Debug flag for mobile calendar logs - set to false to disable verbose logging
  const ENABLE_MOBILE_DEBUG = false

  // Use selected student ID for parents, otherwise use current user ID - memoized to prevent infinite loops
  const effectiveUserId = useMemo(() => {
    const result = user?.role === 'parent' && selectedStudent ? selectedStudent.id : user?.userId
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [HOME DEBUG] Effective User ID calculation:', {
        userRole: user?.role,
        userId: user?.userId,
        selectedStudentId: selectedStudent?.id,
        selectedStudentName: selectedStudent?.name,
        effectiveUserId: result
      })
    }
    return result
  }, [user?.role, user?.userId, selectedStudent])


  // Stabilize academyIds array to prevent infinite loops
  const stableAcademyIds = useMemo(() => {
    return user?.academyIds || []
  }, [user?.academyIds])

  // Schedule-related states
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [sessions, setSessions] = useState<Session[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [calendarView, setCalendarView] = useState<'weekly' | 'monthly'>('monthly')
  const [isLoadingMonthlyData, setIsLoadingMonthlyData] = useState(false)

  // Pull-to-refresh states
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Use Zustand store for schedule caching
  const {
    setScheduleCache,
    monthlySessionDates,
    setMonthlySessionDates
  } = useMobileStore()

  const monthlyDatesSet = new Set(monthlySessionDates)

  const formatTimeWithTranslation = useCallback((date: Date): string => {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const hour12 = hours % 12 || 12
    const ampm = hours < 12 ? t('common.am') : t('common.pm')
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`
  }, [t])

  const formatDateWithTranslation = useCallback((date: Date): string => {
    const locale = language === 'korean' ? 'ko-KR' : 'en-US'
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric'
    }
    return date.toLocaleDateString(locale, options)
  }, [language])

  // Schedule helper functions
  const getDayOfWeek = useCallback((date: Date): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[date.getDay()]
  }, [])

  const formatDate = (date: Date): string => {
    const locale = language === 'korean' ? 'ko-KR' : 'en-US'
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
    return date.toLocaleDateString(locale, options)
  }

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Schedule data fetching
  const fetchScheduleForDate = useCallback(async (dateKey: string): Promise<Session[]> => {

    if (!user?.userId || !stableAcademyIds || stableAcademyIds.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [SCHEDULE DEBUG] Early exit - missing data')
      }
      return []
    }

    try {
      // First get the student's enrolled classrooms
      const { data: enrolledClassrooms } = await supabase
        .rpc('get_student_classrooms', {
          student_uuid: effectiveUserId,
          academy_uuids: stableAcademyIds
        })

      const classroomIds = enrolledClassrooms?.map((cs: any) => cs.classroom_id) || []

      if (classroomIds.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 [SCHEDULE DEBUG] No enrolled classrooms found')
        }
        return []
      }

      // Use RPC function to bypass RLS like the dashboard does
      let { data, error } = await supabase
        .rpc('get_classroom_sessions', {
          classroom_uuids: classroomIds
        })

      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 [SCHEDULE DEBUG] Using RPC function for sessions:', {
          rpc_function: 'get_classroom_sessions',
          classroom_uuids: classroomIds,
          error: error,
          result_count: data?.length || 0
        })
      }

      // Fallback to direct query if RPC fails
      if (error || !data || data.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 [SCHEDULE DEBUG] Sessions RPC failed, trying direct query...')
        }
        const result = await supabase
          .from('classroom_sessions')
          .select(`
            id,
            date,
            start_time,
            end_time,
            status,
            location,
            classroom_id,
            classrooms!inner(
              id,
              name,
              color,
              academy_id,
              teacher_id
            )
          `)
          .eq('date', dateKey)
          .in('classroom_id', classroomIds)
          .is('deleted_at', null)
          .order('start_time', { ascending: true })

        data = result.data
        error = result.error
      }

      // Filter by date client-side since RPC returns all sessions
      const filteredData = data?.filter((session: any) => session.date === dateKey) || []

      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [SCHEDULE DEBUG] Sessions query result:', {
          error,
          dataCount: data?.length || 0,
          filteredCount: filteredData?.length || 0
        })
      }

      if (error) throw error

      // Fetch attendance data separately to avoid RLS issues with complex joins
      const attendanceMap = new Map()
      if (filteredData.length > 0) {
        const sessionIds = filteredData.map((session: any) => session.id)
        if (process.env.NODE_ENV === 'development') {
          console.log('Fetching attendance for sessions:', sessionIds)
        }

        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('classroom_session_id, status, student_id')
          .in('classroom_session_id', sessionIds)
          .eq('student_id', effectiveUserId)

        if (attendanceData) {
          attendanceData.forEach(att => {
            attendanceMap.set(att.classroom_session_id, att.status)
          })
        }
      }

      const teacherIds = Array.from(new Set(filteredData.map((s: any) => {
        const classrooms = (s as unknown as {classrooms: {teacher_id: string} | Array<{teacher_id: string}>}).classrooms
        if (Array.isArray(classrooms)) {
          return classrooms[0]?.teacher_id
        } else if (classrooms && 'teacher_id' in classrooms) {
          return classrooms.teacher_id
        }
        return null
      }).filter(Boolean) as string[]))
      const teacherMap = await getTeacherNamesWithCache(teacherIds)

      const academyIds = Array.from(new Set(filteredData.map((s: any) => {
        const classrooms = s.classrooms as any
        const classroom = Array.isArray(classrooms) ? classrooms[0] : classrooms
        return classroom?.academy_id
      }).filter(Boolean))) as string[]

      const academyNamesMap = new Map<string, string>()
      if (academyIds.length > 0) {
        const { data: academies } = await supabase
          .from('academies')
          .select('id, name')
          .in('id', academyIds)

        academies?.forEach(academy => {
          academyNamesMap.set(academy.id, academy.name)
        })
      }

      const formattedSessions: Session[] = filteredData.map((session: any) => {
        const classrooms = session.classrooms as any
        const classroom = Array.isArray(classrooms) ? classrooms[0] : classrooms
        const teacherName = teacherMap.get(classroom?.teacher_id || '') || 'Unknown Teacher'
        const academyName = academyNamesMap.get(classroom?.academy_id) || 'Academy'

        const startTime = new Date(`2000-01-01T${session.start_time || '00:00'}`)
        const endTime = new Date(`2000-01-01T${session.end_time || '00:00'}`)
        const durationMs = endTime.getTime() - startTime.getTime()
        const durationHours = Math.floor(durationMs / (1000 * 60 * 60))
        const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

        // Get attendance status from the separate query
        const attendance_status = attendanceMap.get(session.id) || null

        return {
          id: session.id,
          date: session.date,
          start_time: session.start_time?.slice(0, 5) || '00:00',
          end_time: session.end_time?.slice(0, 5) || '00:00',
          classroom: {
            id: classroom?.id || '',
            name: classroom?.name || 'Unknown Classroom',
            color: classroom?.color || '#3B82F6',
            teacher_id: classroom?.teacher_id || ''
          },
          location: session.location || '',
          day_of_week: getDayOfWeek(new Date(dateKey)),
          status: session.status,
          duration_hours: durationHours,
          duration_minutes: durationMinutes,
          teacher_name: teacherName,
          academy_name: academyName,
          attendance_status: attendance_status
        }
      })

      // Use student-specific cache key to prevent cache conflicts
      const studentCacheKey = `student_${effectiveUserId}_${dateKey}`
      const currentCache = useMobileStore.getState().scheduleCache
      setScheduleCache({
        ...currentCache,
        [studentCacheKey]: formattedSessions
      })

      return formattedSessions
    } catch (error) {
      console.error('Error fetching schedule:', error)
      return []
    }
  }, [user?.userId, stableAcademyIds, effectiveUserId, setScheduleCache, getDayOfWeek])

  const fetchMonthlySessionDates = useCallback(async () => {
    if (!user?.userId || !stableAcademyIds || stableAcademyIds.length === 0) return
    if (isLoadingMonthlyData) return // Prevent multiple simultaneous calls


    setIsLoadingMonthlyData(true)
    try {
      // First get the student's enrolled classrooms
      const { data: enrolledClassrooms } = await supabase
        .rpc('get_student_classrooms', {
          student_uuid: effectiveUserId,
          academy_uuids: stableAcademyIds
        })

      const classroomIds = enrolledClassrooms?.map((cs: any) => cs.classroom_id) || []
      if (process.env.NODE_ENV === 'development' && ENABLE_MOBILE_DEBUG) {
        console.log('🔍 [MONTHLY DEBUG] Student enrolled in classrooms:', classroomIds)
      }

      if (classroomIds.length === 0) {
        if (process.env.NODE_ENV === 'development' && ENABLE_MOBILE_DEBUG) {
          console.log('🔍 [MONTHLY DEBUG] No enrolled classrooms found')
        }
        setIsLoadingMonthlyData(false)
        return
      }

      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)

      const startDate = firstDay.toISOString().split('T')[0]
      const endDate = lastDay.toISOString().split('T')[0]

      // Use RPC function to bypass RLS like the dashboard does
      let { data, error } = await supabase
        .rpc('get_classroom_sessions', {
          classroom_uuids: classroomIds
        })

      if (process.env.NODE_ENV === 'development' && ENABLE_MOBILE_DEBUG) {
        console.log('🔧 [MONTHLY DEBUG] Using RPC function for sessions:', {
          rpc_function: 'get_classroom_sessions',
          classroom_uuids: classroomIds,
          error: error,
          result_count: data?.length || 0
        })
      }

      // Fallback to direct query if RPC fails
      if (error || !data || data.length === 0) {
        if (process.env.NODE_ENV === 'development' && ENABLE_MOBILE_DEBUG) {
          console.log('🔄 [MONTHLY DEBUG] Sessions RPC failed, trying direct query...')
        }
        const result = await supabase
          .from('classroom_sessions')
          .select(`
            id,
            date,
            start_time,
            end_time,
            status,
            location,
            classroom_id,
            classrooms!inner(
              id,
              name,
              color,
              academy_id,
              teacher_id
            )
          `)
          .gte('date', startDate)
          .lte('date', endDate)
          .in('classroom_id', classroomIds)
          .is('deleted_at', null)
          .order('date', { ascending: true })
          .order('start_time', { ascending: true })

        data = result.data
        error = result.error
      }

      // Filter by date range client-side since RPC returns all sessions
      const sessions = data?.filter((session: any) =>
        session.date >= startDate && session.date <= endDate
      ) || []

      if (process.env.NODE_ENV === 'development' && ENABLE_MOBILE_DEBUG) {
        console.log('🔍 [MONTHLY DEBUG] Monthly sessions result:', {
          error,
          totalSessions: data?.length || 0,
          filteredSessions: sessions?.length || 0,
          dateRange: `${startDate} to ${endDate}`
        })
      }

      if (error) {
        console.error('Error fetching monthly sessions:', error)
        return // Exit early if error
      }

      const studentSessions = sessions

      const teacherIds = Array.from(new Set(studentSessions.map((s: DbSessionData) => {
        const classrooms = (s as unknown as {classrooms: {teacher_id: string} | Array<{teacher_id: string}>}).classrooms
        if (Array.isArray(classrooms)) {
          return classrooms[0]?.teacher_id
        } else if (classrooms && 'teacher_id' in classrooms) {
          return classrooms.teacher_id
        }
        return null
      }).filter(Boolean) as string[]))
      const teacherMap = await getTeacherNamesWithCache(teacherIds)

      const academyIds = Array.from(new Set(studentSessions.map((s: DbSessionData) => {
        const classrooms = s.classrooms as any
        const classroom = Array.isArray(classrooms) ? classrooms[0] : classrooms
        return classroom?.academy_id
      }).filter(Boolean))) as string[]

      const academyNamesMap = new Map<string, string>()
      if (academyIds.length > 0) {
        const { data: academies } = await supabase
          .from('academies')
          .select('id, name')
          .in('id', academyIds)

        academies?.forEach(academy => {
          academyNamesMap.set(academy.id, academy.name)
        })
      }

      // Fetch attendance data for all sessions in this month
      const attendanceMap = new Map()
      if (studentSessions.length > 0) {
        const sessionIds = studentSessions.map((session: any) => session.id)
        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('classroom_session_id, status, student_id')
          .in('classroom_session_id', sessionIds)
          .eq('student_id', effectiveUserId)

        if (attendanceData) {
          attendanceData.forEach(att => {
            attendanceMap.set(att.classroom_session_id, att.status)
          })
        }
      }

      const newScheduleCache: Record<string, Session[]> = {}
      const sessionDates = new Set<string>()

      studentSessions.forEach((session: DbSessionData) => {
        const classrooms = session.classrooms as any
        const classroom = Array.isArray(classrooms) ? classrooms[0] : classrooms
        const teacherName = teacherMap.get(classroom?.teacher_id || '') || 'Unknown Teacher'
        const academyName = academyNamesMap.get(classroom?.academy_id) || 'Academy'

        const startTime = new Date(`2000-01-01T${session.start_time || '00:00'}`)
        const endTime = new Date(`2000-01-01T${session.end_time || '00:00'}`)
        const durationMs = endTime.getTime() - startTime.getTime()
        const durationHours = Math.floor(durationMs / (1000 * 60 * 60))
        const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

        const formattedSession: Session = {
          id: session.id,
          date: session.date,
          start_time: session.start_time?.slice(0, 5) || '00:00',
          end_time: session.end_time?.slice(0, 5) || '00:00',
          classroom: {
            id: classroom?.id || '',
            name: classroom?.name || 'Unknown Classroom',
            color: classroom?.color || '#3B82F6',
            teacher_id: classroom?.teacher_id || ''
          },
          location: session.location || '',
          day_of_week: getDayOfWeek(new Date(session.date)),
          status: session.status,
          duration_hours: durationHours,
          duration_minutes: durationMinutes,
          teacher_name: teacherName,
          academy_name: academyName,
          attendance_status: attendanceMap.get(session.id) || null
        }

        if (!newScheduleCache[session.date]) {
          newScheduleCache[session.date] = []
        }
        newScheduleCache[session.date].push(formattedSession)

        sessionDates.add(session.date)
      })

      const currentDate = new Date(firstDay)
      while (currentDate <= lastDay) {
        const dateStr = currentDate.toISOString().split('T')[0]
        if (!newScheduleCache[dateStr]) {
          newScheduleCache[dateStr] = []
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }

      const currentCache = useMobileStore.getState().scheduleCache
      setScheduleCache({
        ...currentCache,
        ...newScheduleCache
      })

      setMonthlySessionDates(Array.from(sessionDates))

    } catch (error) {
      console.error('Error fetching monthly sessions:', error)
    } finally {
      setIsLoadingMonthlyData(false)
    }
  }, [user?.userId, stableAcademyIds, effectiveUserId, currentMonth, setScheduleCache, setMonthlySessionDates, getDayOfWeek, isLoadingMonthlyData])

  const fetchDashboardDataOptimized = useCallback(async () => {
    if (!user?.userId || !stableAcademyIds || stableAcademyIds.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [DASHBOARD DEBUG] Early exit - missing required data:', {
          hasUserId: !!user?.userId,
          hasAcademyIds: stableAcademyIds?.length > 0,
          effectiveUserId: effectiveUserId
        })
      }
      return null
    }

    try {

      // Get today's date and next week for date filtering
      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      if (process.env.NODE_ENV === 'development') {
        console.log('=== DASHBOARD QUERY DEBUG ===')
        console.log('Today:', today)
        console.log('Effective User ID (for queries):', effectiveUserId)
        console.log('Original User ID:', user?.userId)
        console.log('User Role:', user?.role)
        console.log('Selected Student:', selectedStudent)
        console.log('Academy IDs:', stableAcademyIds)
      }
      
      // First, get the classrooms this student is enrolled in - FIXED: Use RPC to bypass RLS
      const { data: enrolledClassrooms } = await supabase
        .rpc('get_student_classrooms', {
          student_uuid: effectiveUserId,
          academy_uuids: stableAcademyIds
        })

      const classroomIds = enrolledClassrooms?.map((cs: any) => cs.classroom_id) || []
      if (process.env.NODE_ENV === 'development') {
        console.log('Student enrolled in classroom IDs:', classroomIds)
      }

      if (classroomIds.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Student not enrolled in any classrooms')
        }
        return {
          todaysClassCount: 0,
          pendingAssignmentsCount: 0,
          upcomingSessions: [],
          invoices: [],
          lastUpdated: Date.now()
        }
      }

      // Step 2: Get sessions for enrolled classrooms - FIXED: Use RPC to bypass RLS
      const { data: initialSessions, error: sessionsError } = await supabase
        .rpc('get_classroom_sessions', {
          classroom_uuids: classroomIds
        })

      let sessions = initialSessions

      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 [DASHBOARD DEBUG] Using RPC function for sessions:', {
          rpc_function: 'get_classroom_sessions',
          classroom_uuids: classroomIds,
          error: sessionsError,
          result_count: sessions?.length || 0
        })
      }

      // Fallback to direct query if RPC fails
      if (sessionsError || !sessions || sessions.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 [DASHBOARD DEBUG] Sessions RPC failed, trying direct query...')
        }
        const { data: directSessions } = await supabase
          .from('classroom_sessions')
          .select('id, classroom_id, date, start_time, end_time')
          .in('classroom_id', classroomIds)
        sessions = directSessions
      }

      if (!sessions || sessions.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('No sessions found for enrolled classrooms')
        }
        return {
          todaysClassCount: 0,
          pendingAssignmentsCount: 0,
          upcomingSessions: [],
          invoices: [],
          lastUpdated: Date.now()
        }
      }

      const sessionIds = sessions.map((s: any) => s.id)
      if (process.env.NODE_ENV === 'development') {
        console.log('Session IDs found:', sessionIds.length)
      }

      // Step 3: Get assignments for those sessions - FIXED: Use RPC to bypass RLS
      let assignmentsResult = await supabase
        .rpc('get_assignments_for_sessions', {
          session_uuids: sessionIds
        })

      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 [DASHBOARD DEBUG] Using RPC function for assignments:', {
          rpc_function: 'get_assignments_for_sessions',
          session_uuids: sessionIds,
          error: assignmentsResult.error,
          result_count: assignmentsResult.data?.length || 0
        })
      }

      // Fallback to direct query if RPC fails
      if (assignmentsResult.error || !assignmentsResult.data || assignmentsResult.data.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 [DASHBOARD DEBUG] Assignments RPC failed, trying direct query...')
        }
        assignmentsResult = await supabase
          .from('assignments')
          .select('id, due_date, classroom_session_id')
          .in('classroom_session_id', sessionIds)
          .gte('due_date', today)
          .is('deleted_at', null)
      }

      // OPTIMIZATION: Combined query to get dashboard data
      const [
        todaySessionsResult,
        upcomingSessionsResult,
        invoicesResult
      ] = await Promise.all([
        // Query 1: Today's sessions count - Simplified with known classroom IDs
        supabase
          .from('classroom_sessions')
          .select('id')
          .eq('date', today)
          .eq('status', 'scheduled')
          .in('classroom_id', classroomIds),

        // Query 2: Upcoming sessions with all needed data including teacher names and academy info
        supabase
          .from('classroom_sessions')
          .select(`
            id,
            date,
            start_time,
            end_time,
            classrooms!inner(
              id,
              name,
              color,
              academy_id,
              teacher_id,
              academies!inner(
                name
              )
            )
          `)
          .gte('date', today)
          .lte('date', nextWeek)
          .eq('status', 'scheduled')
          .in('classroom_id', classroomIds)
          .order('date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(5),

        // Query 3: Get recent invoices for the student
        supabase
          .from('invoices')
          .select(`
            id,
            amount,
            final_amount,
            discount_amount,
            status,
            due_date,
            paid_at,
            payment_method,
            created_at,
            academy_id,
            recurring_payment_templates(
              name
            ),
            students!inner(
              academy_id,
              academies!inner(
                name
              )
            )
          `)
          .eq('student_id', effectiveUserId)
          .order('created_at', { ascending: false })
          .limit(5)
      ])

      // Initialize dashboard data object
      const dashboardData = {
        todaysClassCount: 0,
        pendingAssignmentsCount: 0,
        upcomingSessions: [] as UpcomingSession[],
        invoices: [] as Invoice[],
        lastUpdated: Date.now()
      }

      // Process today's sessions count
      if (todaySessionsResult.error) {
        console.error('Error fetching today sessions:', todaySessionsResult.error)
        dashboardData.todaysClassCount = 0
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('Today sessions raw result:', todaySessionsResult.data)
          console.log('Today sessions count:', (todaySessionsResult.data || []).length)
        }
        dashboardData.todaysClassCount = (todaySessionsResult.data || []).length
      }

      // Process upcoming sessions

      if (upcomingSessionsResult.error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error fetching upcoming sessions:', upcomingSessionsResult.error)
        }
        dashboardData.upcomingSessions = []
      } else {
        const sessions = upcomingSessionsResult.data || []

        // OPTIMIZATION: Use cached teacher names with batch fetching
        const teacherIds = Array.from(new Set(sessions.map((s) => {
          const classrooms = s.classrooms as Record<string, unknown> | Record<string, unknown>[]
          const teacherId = Array.isArray(classrooms) ? classrooms[0]?.teacher_id : classrooms?.teacher_id
          return teacherId
        }).filter(Boolean)))
        const teacherNamesMap = await getTeacherNamesWithCache(teacherIds as string[])


        const formattedSessions: UpcomingSession[] = sessions.map((session) => {
          try {
            // Validate required fields first
            if (!session.date || !session.start_time || !session.end_time) {
              throw new Error('Missing required date/time fields')
            }
            
            const sessionDate = new Date(session.date + 'T' + session.start_time)
            const endTime = new Date(session.date + 'T' + session.end_time)
            
            // Check if dates are valid
            if (isNaN(sessionDate.getTime()) || isNaN(endTime.getTime())) {
              throw new Error('Invalid date/time values')
            }
            
            // Handle both array and object formats for classrooms
            const classroom = Array.isArray(session.classrooms)
              ? (session.classrooms as any)?.[0]
              : (session.classrooms as any)
            const teacherName = teacherNamesMap.get(classroom?.teacher_id) || 'Unknown Teacher'
            // Extract academy name from nested academies structure
            let academyName = 'Academy'
            if (classroom?.academies) {
              const academies = classroom.academies
              if (Array.isArray(academies) && academies.length > 0) {
                academyName = academies[0]?.name || 'Academy'
              } else if (typeof academies === 'object' && academies?.name) {
                academyName = academies.name
              }
            }

            return {
              id: session.id,
              className: classroom?.name || 'Unknown Class',
              classroomColor: classroom?.color || '#3B82F6',
              time: `${formatTimeWithTranslation(sessionDate)} - ${formatTimeWithTranslation(endTime)}`,
              date: formatDateWithTranslation(sessionDate),
              teacherName,
              academyName
            }
          } catch (dateError) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Error formatting session date:', dateError, 'Session data:', session)
            }
            
            // Fallback to basic time formatting if translation fails
            let fallbackTime = 'Time TBD'
            let fallbackDate = session.date || 'Date TBD'
            
            try {
              if (session.start_time && session.end_time) {
                // Simple fallback formatting
                fallbackTime = `${session.start_time.slice(0, 5)} - ${session.end_time.slice(0, 5)}`
              }
              if (session.date) {
                fallbackDate = new Date(session.date).toLocaleDateString()
              }
            } catch (fallbackError) {
              if (process.env.NODE_ENV === 'development') {
                console.warn('Fallback formatting also failed:', fallbackError)
              }
            }
            
            // Handle both array and object formats for classrooms
            const classroom = Array.isArray(session.classrooms)
              ? (session.classrooms as any)?.[0]
              : (session.classrooms as any)
            const teacherName = teacherNamesMap.get(classroom?.teacher_id) || 'Unknown Teacher'
            // Extract academy name from nested academies structure
            let academyName = 'Academy'
            if (classroom?.academies) {
              const academies = classroom.academies
              if (Array.isArray(academies) && academies.length > 0) {
                academyName = academies[0]?.name || 'Academy'
              } else if (typeof academies === 'object' && academies?.name) {
                academyName = academies.name
              }
            }

            return {
              id: session.id,
              className: classroom?.name || 'Unknown Class',
              classroomColor: classroom?.color || '#3B82F6',
              time: fallbackTime,
              date: fallbackDate,
              teacherName,
              academyName
            }
          }
        })
        
        // Store the formatted sessions in the dashboard data
        dashboardData.upcomingSessions = formattedSessions

        // Process assignments - count pending assignments directly
        if (assignmentsResult.error) {
          console.error('Error fetching assignments:', assignmentsResult.error)
          dashboardData.pendingAssignmentsCount = 0
        } else {
          const assignments = assignmentsResult.data || []
          if (process.env.NODE_ENV === 'development') {
            console.log('Assignments raw result:', assignments)
          }

          if (assignments.length > 0) {
            // Get assignment grades for this student separately
            const assignmentIds = assignments.map((a: any) => a.id)
            const { data: grades } = await supabase
              .from('assignment_grades')
              .select('assignment_id, student_id, status')
              .in('assignment_id', assignmentIds)
              .eq('student_id', effectiveUserId)

            if (process.env.NODE_ENV === 'development') {
              console.log('Assignment grades for student:', grades)
            }

            let pendingCount = 0
            assignments.forEach((assignment: {
              id: string
              due_date: string
              classroom_session_id: string
            }) => {
              // Find the grade record for this student
              const userGrade = grades?.find(
                (grade) => grade.assignment_id === assignment.id
              )

              // Count as pending if:
              // 1. No grade record exists (null status), OR
              // 2. Grade record exists with status 'pending'
              if (!userGrade || userGrade.status === 'pending') {
                pendingCount++
                if (process.env.NODE_ENV === 'development') {
                  console.log('Found pending assignment:', assignment.id, 'due:', assignment.due_date, 'status:', userGrade?.status || 'no grade record')
                }
              }
            })

            if (process.env.NODE_ENV === 'development') {
              console.log('Total pending assignments count:', pendingCount)
            }
            dashboardData.pendingAssignmentsCount = pendingCount
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.log('No assignments found')
            }
            dashboardData.pendingAssignmentsCount = 0
          }
        }

        // Process invoices
        if (invoicesResult.error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Error fetching invoices:', invoicesResult.error)
          }
          dashboardData.invoices = []
        } else {
          const invoices = invoicesResult.data || []
          
          const formattedInvoices: Invoice[] = invoices.map((invoice) => {
            return {
              id: invoice.id,
              amount: invoice.final_amount || invoice.amount,
              status: invoice.status,
              dueDate: invoice.due_date,
              description: (invoice.recurring_payment_templates as Array<{name: string}>)?.[0]?.name || String(t('mobile.invoices.invoice')),
              academyName: (() => {
                const student = invoice.students as unknown as Record<string, unknown>
                if (student?.academies) {
                  const academies = student.academies
                  if (typeof academies === 'string') {
                    return academies
                  } else if (typeof academies === 'object' && academies && (academies as Record<string, unknown>).name) {
                    return String((academies as Record<string, unknown>).name)
                  } else if (Array.isArray(academies) && academies[0] && (academies[0] as Record<string, unknown>)?.name) {
                    return String((academies[0] as Record<string, unknown>).name)
                  }
                }
                return 'Academy'
              })()
            }
          })
          
          dashboardData.invoices = formattedInvoices
        }

        // Return the fetched data
        return dashboardData
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      return {
        todaysClassCount: 0,
        pendingAssignmentsCount: 0,
        upcomingSessions: [],
        invoices: [],
        lastUpdated: Date.now()
      }
    }
  }, [user, stableAcademyIds, effectiveUserId, selectedStudent, t, formatTimeWithTranslation, formatDateWithTranslation])

  // Progressive loading for dashboard data
  const dashboardFetcher = useCallback(async () => {
    if (!user?.userId || !stableAcademyIds || stableAcademyIds.length === 0) return null
    return await fetchDashboardDataOptimized()
  }, [user?.userId, stableAcademyIds, fetchDashboardDataOptimized])
  
  const {
    data: dashboardData,
    isLoading,
    refetch: refetchDashboard
  } = useMobileData(
    'mobile-dashboard',
    dashboardFetcher,
    {
      immediate: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      backgroundRefresh: true,
      refreshInterval: 30000 // 30 seconds
    }
  )
  
  // Update Zustand store when data is fetched
  useEffect(() => {
    if (dashboardData) {
      setData({
        ...dashboardData,
        cacheVersion: 0 // Will be updated by the store
      })
    }
  }, [dashboardData, setData])

  // Student-specific cache namespacing instead of aggressive clearing
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [HOME DEBUG] Effective user changed, switching to cache namespace for:', effectiveUserId)
    }

    // Instead of clearing all cache, create student-specific namespaces
    // This allows for instant switching between students with cached data
    const currentCache = useMobileStore.getState().scheduleCache

    // Check if we have any cached data for the current effective user
    const studentNamespace = `student_${effectiveUserId}`
    const hasStudentCache = Object.keys(currentCache).some(key => key.startsWith(studentNamespace))

    if (hasStudentCache) {
      console.log('🎯 [CACHE] Found existing cache for student:', effectiveUserId)
      // Cache exists for this student - data will be loaded automatically
    } else {
      console.log('🔄 [CACHE] No cache found for student, will fetch fresh data:', effectiveUserId)
      // Only clear monthly session dates for this specific user
      // Keep other students' data intact
      setMonthlySessionDates([])
    }

    // Note: setScheduleCache is not called here - we rely on the fetchSchedule function
    // to handle student-specific cache keys automatically
  }, [effectiveUserId, setMonthlySessionDates])

  // Schedule effects
  useEffect(() => {
    const year = selectedDate.getFullYear()
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const day = String(selectedDate.getDate()).padStart(2, '0')
    const dateKey = `${year}-${month}-${day}`

    if (process.env.NODE_ENV === 'development') {
      console.log('Selected date changed to:', dateKey)
    }

    const fetchData = async () => {
      if (!user?.userId || !stableAcademyIds || stableAcademyIds.length === 0) {
        setSessions(prev => prev.length === 0 ? prev : [])
        return
      }

      setScheduleLoading(true)

      try {
        // Check for student-specific cached data first
        const studentCacheKey = `student_${effectiveUserId}_${dateKey}`
        const currentCache = useMobileStore.getState().scheduleCache

        if (currentCache[studentCacheKey]) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🎯 Using cached data for student', effectiveUserId, 'on date:', dateKey)
          }
          setSessions(currentCache[studentCacheKey])
          setScheduleLoading(false)
          return
        }

        const freshData = await fetchScheduleForDate(dateKey)
        setSessions(freshData)
      } catch (error) {
        console.error('Error fetching schedule:', error)
        setSessions([])
      } finally {
        setScheduleLoading(false)
      }
    }

    fetchData()
  }, [selectedDate, user?.userId, stableAcademyIds, fetchScheduleForDate])

  useEffect(() => {
    if (user?.userId && stableAcademyIds && stableAcademyIds.length > 0) {
      fetchMonthlySessionDates()
    }
  }, [currentMonth, user?.userId, stableAcademyIds, fetchMonthlySessionDates])

  // Calendar navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + (direction === 'next' ? 1 : -1))
    setCurrentMonth(newMonth)
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const firstDayOfWeek = firstDayOfMonth.getDay()
    const daysInMonth = lastDayOfMonth.getDate()

    const days = []

    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date)
    const dayOfWeek = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek)

    const weekDays = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      weekDays.push(day)
    }
    return weekDays
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    const adjustment = direction === 'prev' ? -7 : 7
    newDate.setDate(newDate.getDate() + adjustment)
    setSelectedDate(newDate)
    setCurrentMonth(newDate)
  }

  // Pull-to-refresh handlers with proper touch delegation
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setPullDistance(0)

    try {
      // Clear schedule cache for current month
      const currentCache = useMobileStore.getState().scheduleCache
      const clearedCache: Record<string, Session[]> = {}

      Object.keys(currentCache).forEach(key => {
        const keyDate = new Date(key)
        if (keyDate.getMonth() !== currentMonth.getMonth() ||
            keyDate.getFullYear() !== currentMonth.getFullYear()) {
          clearedCache[key] = currentCache[key]
        }
      })

      setScheduleCache(clearedCache)

      // Refresh both dashboard and schedule data
      await Promise.all([
        refetchDashboard(),
        fetchMonthlySessionDates()
      ])

      // Refresh current date's schedule
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.getDate()).padStart(2, '0')
      const dateKey = `${year}-${month}-${day}`
      const freshData = await fetchScheduleForDate(dateKey)
      setSessions(freshData)

    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Enhanced touch handlers with better delegation and passive listeners
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only handle touch if we're at the top of the scroll and not already refreshing
    if (scrollRef.current?.scrollTop === 0 && !isRefreshing) {
      startY.current = e.touches[0].clientY
      // Don't prevent default - let native scroll behavior work
    }
  }, [isRefreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Only handle pull-to-refresh if we're at the top and not refreshing
    if (scrollRef.current?.scrollTop === 0 && !isRefreshing && startY.current > 0) {
      const currentY = e.touches[0].clientY
      const diff = currentY - startY.current

      // Only handle downward pulls
      if (diff > 0) {
        // Prevent native scroll only when we're actively pulling to refresh
        if (diff > 10) {
          e.preventDefault()
        }
        setPullDistance(Math.min(diff, 100))
      }
    }
  }, [isRefreshing])

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 80 && !isRefreshing) {
      handleRefresh()
    } else {
      setPullDistance(0)
    }
    // Reset start position
    startY.current = 0
  }, [pullDistance, isRefreshing, handleRefresh])

  // Add passive event listeners for better scroll performance
  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    const touchStartHandler = (e: TouchEvent) => {
      if (element.scrollTop === 0 && !isRefreshing) {
        startY.current = e.touches[0].clientY
      }
    }

    const touchMoveHandler = (e: TouchEvent) => {
      if (element.scrollTop === 0 && !isRefreshing && startY.current > 0) {
        const currentY = e.touches[0].clientY
        const diff = currentY - startY.current

        if (diff > 0) {
          // Only prevent default for significant pulls to avoid scroll conflicts
          if (diff > 10) {
            e.preventDefault()
          }
          setPullDistance(Math.min(diff, 100))
        }
      }
    }

    const touchEndHandler = () => {
      if (pullDistance > 80 && !isRefreshing) {
        handleRefresh()
      } else {
        setPullDistance(0)
      }
      startY.current = 0
    }

    // Add listeners with proper passive settings
    element.addEventListener('touchstart', touchStartHandler, { passive: true })
    element.addEventListener('touchmove', touchMoveHandler, { passive: false })
    element.addEventListener('touchend', touchEndHandler, { passive: true })

    return () => {
      element.removeEventListener('touchstart', touchStartHandler)
      element.removeEventListener('touchmove', touchMoveHandler)
      element.removeEventListener('touchend', touchEndHandler)
    }
  }, [pullDistance, isRefreshing, handleRefresh])

  // Use progressive loading data or fallbacks
  // const upcomingSessions = dashboardData?.upcomingSessions || [] // Not used currently
  const invoices = dashboardData?.invoices || []
  const todaysClassCount = dashboardData?.todaysClassCount || 0
  const pendingAssignmentsCount = dashboardData?.pendingAssignmentsCount || 0

  return (
    <div
      ref={scrollRef}
      className="p-4 relative overflow-y-auto"
      style={{
        touchAction: pullDistance > 10 ? 'none' : 'auto',
        overscrollBehavior: 'contain'
      }}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-300 z-10"
          style={{ 
            height: `${pullDistance}px`,
            opacity: pullDistance > 80 ? 1 : pullDistance / 80
          }}
        >
          <div className="flex items-center gap-2">
            <RefreshCw 
              className={`w-5 h-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span className="text-sm text-primary font-medium">
              {isRefreshing ? t('common.refreshing') : t('common.pullToRefresh')}
            </span>
          </div>
        </div>
      )}
      
      <div style={{ transform: `translateY(${pullDistance}px)` }} className="transition-transform">
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('mobile.home.welcome')}, {user?.userName}!
        </h1>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {isLoading ? (
          <>
            <AnimatedStatSkeleton />
            <AnimatedStatSkeleton />
          </>
        ) : (
          <>
            <Card className="p-4">
              <div className="flex flex-col justify-between h-20">
                <p className="text-sm text-gray-600">{t('mobile.home.todaysClasses')}</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-primary" />
                  <p className="text-2xl font-bold">{todaysClassCount}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex flex-col justify-between h-20">
                <p className="text-sm text-gray-600">{t('mobile.home.pendingAssignments')}</p>
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-6 h-6 text-orange-500" />
                  <p className="text-2xl font-bold">{pendingAssignmentsCount}</p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Calendar Widget */}
      <div className="mb-6 bg-white rounded-lg p-4 shadow-sm">
        {/* Calendar View Toggle */}
        <div className="flex justify-center mb-6">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setCalendarView('weekly')}
              className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                calendarView === 'weekly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('mobile.calendar.weekly')}
            </button>
            <button
              onClick={() => setCalendarView('monthly')}
              className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                calendarView === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('mobile.calendar.monthly')}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => calendarView === 'monthly' ? navigateMonth('prev') : navigateWeek('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>

          <h3 className="font-semibold text-gray-900">
            {calendarView === 'monthly'
              ? currentMonth.toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US', { month: 'long', year: 'numeric' })
              : `${getWeekDays(selectedDate)[0].toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })} - ${getWeekDays(selectedDate)[6].toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
            }
          </h3>

          <button
            onClick={() => calendarView === 'monthly' ? navigateMonth('next') : navigateWeek('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day Headers */}
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <div key={index} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarView === 'monthly'
            ? getDaysInMonth(currentMonth).map((day, index) => {
                if (!day) {
                  return <div key={index} className="aspect-square" />
                }

                const isSelected = day.toDateString() === selectedDate.toDateString()
                const isCurrentDay = isToday(day)
                const dateString = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
                const hasSession = monthlyDatesSet.has(dateString)

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(new Date(day))}
                    className={`aspect-square rounded-lg text-sm font-medium transition-colors relative ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : isCurrentDay
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {day.getDate()}
                    {hasSession && (
                      <div className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full ${
                        isSelected || isCurrentDay ? 'bg-white' : 'bg-primary'
                      }`} />
                    )}
                  </button>
                )
              })
            : getWeekDays(selectedDate).map((day, index) => {
                const isSelected = day.toDateString() === selectedDate.toDateString()
                const isCurrentDay = isToday(day)
                const dateString = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
                const hasSession = monthlyDatesSet.has(dateString)

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(new Date(day))}
                    className={`aspect-square rounded-lg text-sm font-medium transition-colors relative ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : isCurrentDay
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {day.getDate()}
                    {hasSession && (
                      <div className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full ${
                        isSelected || isCurrentDay ? 'bg-white' : 'bg-primary'
                      }`} />
                    )}
                  </button>
                )
              })
          }
        </div>
      </div>

      {/* Selected Date Display */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {formatDate(selectedDate)}
        </h2>
        {isToday(selectedDate) && (
          <p className="text-sm text-primary font-medium">{t('mobile.schedule.today')}</p>
        )}
      </div>

      {/* Daily Schedule Section */}
      <div className="mb-6">
        <div className="mb-3">
        </div>

        {scheduleLoading ? (
          <StaggeredListSkeleton items={3} />
        ) : sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Card key={session.id} className="p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => router.push(`/mobile/session/${session.id}`)}>
                <div className="flex gap-4">
                  {/* Time Column */}
                  <div className="flex flex-col items-center justify-center text-center min-w-[60px]">
                    <p className="text-sm font-semibold text-gray-900">{session.start_time}</p>
                    <div className="w-px h-4 bg-gray-300 my-1"></div>
                    <p className="text-sm text-gray-500">{session.end_time}</p>
                    {/* Show attendance status if available */}
                    {session.attendance_status && (
                      <div className="mt-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          session.attendance_status === 'present' ? 'bg-green-100 text-green-800' :
                          session.attendance_status === 'absent' ? 'bg-red-100 text-red-800' :
                          session.attendance_status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                          session.attendance_status === 'excused' ? 'bg-blue-100 text-blue-800' :
                          session.attendance_status === 'pending' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {session.attendance_status === 'present' ? t('attendance.present') :
                           session.attendance_status === 'absent' ? t('attendance.absent') :
                           session.attendance_status === 'late' ? t('attendance.late') :
                           session.attendance_status === 'excused' ? t('attendance.excused') :
                           session.attendance_status === 'pending' ? t('attendance.pending') :
                           session.attendance_status}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Details Column */}
                  <div className="flex-1 border-l-2 pl-4" style={{ borderLeftColor: session.classroom.color }}>
                    <div className="mb-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 mb-1"
                        style={{ backgroundColor: session.classroom.color }}
                      />
                      <p className="text-base font-semibold text-gray-900 mb-1">{session.academy_name}</p>
                      <div className="flex items-center gap-1 mb-1">
                        <School className="w-3 h-3 text-gray-400" />
                        <p className="text-sm text-gray-700">{session.classroom.name}</p>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                        <User className="w-3 h-3 text-gray-400" />
                        <span>{session.teacher_name}</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      {session.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span className="text-sm">
                            {session.location === 'offline'
                              ? t('sessions.offline')
                              : session.location === 'online'
                              ? t('sessions.online')
                              : session.location
                            }
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 flex items-center justify-center">
                          <div className={`w-2 h-2 rounded-full ${
                            session.status === 'scheduled' ? 'bg-green-400' :
                            session.status === 'completed' ? 'bg-primary' :
                            session.status === 'cancelled' ? 'bg-red-400' :
                            'bg-gray-400'
                          }`} />
                        </div>
                        <span className="text-sm">
                          {session.status === 'scheduled'
                            ? t('mobile.session.statusScheduled')
                            : session.status === 'completed'
                            ? t('mobile.session.statusCompleted')
                            : session.status === 'cancelled'
                            ? t('mobile.session.statusCancelled')
                            : session.status
                          }
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-sm">{t('mobile.schedule.duration')}: {' '}
                          {(session.duration_hours || 0) > 0
                            ? t('mobile.schedule.durationHours', {
                                hours: session.duration_hours || 0,
                                minutes: session.duration_minutes || 0
                              })
                            : t('mobile.schedule.durationMinutes', { minutes: session.duration_minutes || 0 })
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Arrow Column */}
                  <div className="flex items-center">
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-4 text-center">
            <div className="flex flex-col items-center gap-1">
              <Calendar className="w-6 h-6 text-gray-300" />
              <div className="text-gray-500 font-medium text-sm leading-tight">{t('mobile.schedule.noClasses')}</div>
            </div>
          </Card>
        )}
      </div>

      {/* Upcoming Classes Section - Hidden for now */}
      {/* <div className="mb-6">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('mobile.home.upcomingClasses')}
          </h2>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <HomeSessionCardSkeleton key={i} />
            ))}
          </div>
        ) : upcomingSessions.length > 0 ? (
          <div className="space-y-2">
            {upcomingSessions.map((session) => (
              <Card key={session.id} className="p-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => router.push(`/mobile/session/${session.id}`)}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: session.classroomColor }}
                    />
                    <div>
                      <p className="text-base font-semibold text-gray-900 mb-1">{session.academyName || 'Loading...'}</p>
                      <div className="flex items-center gap-1 mb-1">
                        <School className="w-3 h-3 text-gray-400" />
                        <p className="text-sm text-gray-700">{session.className}</p>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                        <User className="w-3 h-3 text-gray-400" />
                        <span>{session.teacherName}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>{session.date}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{session.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-4 text-center">
            <div className="flex flex-col items-center gap-1">
              <Calendar className="w-6 h-6 text-gray-300" />
              <div className="text-gray-500 font-medium text-sm leading-tight">{t('mobile.home.noUpcomingClasses')}</div>
              <div className="text-gray-400 text-xs leading-tight">{t('mobile.home.noUpcomingClassesDesc')}</div>
            </div>
          </Card>
        )}
      </div> */}

      {/* Recent Invoices Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('mobile.home.recentInvoices')}
          </h2>
          <button 
            onClick={() => router.push('/mobile/invoices')}
            className="text-sm text-primary hover:text-primary/90"
          >
            {t('mobile.home.viewAll')}
          </button>
        </div>
        
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <HomeInvoiceCardSkeleton key={i} />
            ))}
          </div>
        ) : invoices.length > 0 ? (
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <Card key={invoice.id} className="p-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => router.push(`/mobile/invoice/${invoice.id}`)}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{invoice.description}</p>
                      <p className="text-sm text-gray-500">{invoice.academyName}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <span>{t('mobile.invoices.due')} {formatDateWithTranslation(new Date(invoice.dueDate))}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">₩{invoice.amount.toLocaleString()}</p>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          invoice.status === 'failed' ? 'bg-red-100 text-red-800' :
                          invoice.status === 'refunded' ? 'bg-primary/10 text-primary' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {t(`mobile.invoices.status.${invoice.status}`) || invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center">
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-4 text-center">
            <div className="flex flex-col items-center gap-1">
              <Receipt className="w-6 h-6 text-gray-300" />
              <div className="text-gray-500 font-medium text-sm leading-tight">{t('mobile.home.noRecentInvoices')}</div>
              <div className="text-gray-400 text-xs leading-tight">{t('mobile.home.noRecentInvoicesDesc')}</div>
            </div>
          </Card>
        )}
      </div>

      {/* Bottom spacing for proper scrolling */}
      <div className="pb-24"></div>
      </div>
    </div>
  )
}