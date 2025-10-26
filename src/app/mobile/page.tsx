"use client"

import { useEffect, useCallback, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useMobileDashboard } from './hooks/useMobileDashboard'
import { getTeacherNamesWithCache } from '@/utils/mobileCache'
import { useMobileStore } from '@/stores/mobileStore'
import { Card } from '@/components/ui/card'
import { AnimatedStatSkeleton, StaggeredListSkeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { Calendar, Clock, ClipboardList, ChevronRight, Receipt, RefreshCw, School, User, ChevronLeft, MapPin, DoorOpen } from 'lucide-react'
import { useSelectedStudentStore } from '@/stores/selectedStudentStore'
import { useStableCallback } from '@/hooks/useStableCallback'
import { SkeletonErrorBoundary } from '@/components/error-boundaries/SkeletonErrorBoundary'
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { formatDateLocal } from '@/utils/dateUtils'
import { MOBILE_FEATURES } from '@/config/mobileFeatures'
import { getSessionsForDateRange } from '@/lib/virtual-sessions'

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
  room_number?: string
  day_of_week: string
  status: string
  duration_hours?: number
  duration_minutes?: number
  teacher_name?: string
  academy_name?: string
  attendance_status?: 'present' | 'absent' | 'late' | 'excused' | null
  is_virtual?: boolean
}

interface DbSessionData {
  id: string
  date: string
  start_time: string
  end_time: string
  status: string
  location?: string
  room_number?: string
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






// Deprecated: Use formatDateLocal from @/utils/dateUtils instead
// Kept for backward compatibility during transition
const formatDateKST = formatDateLocal

export default function MobilePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { user } = usePersistentMobileAuth()
  const { effectiveUserId, isReady, isLoading: authLoading, hasAcademyIds, academyIds } = useEffectiveUserId()

  // Client-only username to prevent hydration mismatch - initialize from sessionStorage
  const [clientUserName, setClientUserName] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const cachedUser = sessionStorage.getItem('mobile-user')
      if (cachedUser) {
        const parsed = JSON.parse(cachedUser)
        return parsed.userName || null
      }
    } catch (error) {
      console.warn('[MobilePage] Failed to load cached username:', error)
    }
    return null
  })

  useEffect(() => {
    if (user?.userName && user.userName !== clientUserName) {
      setClientUserName(user.userName)
    }
  }, [user?.userName, clientUserName])

  // Use new dashboard pattern hook (sessionStorage-based, no skeleton flash)
  const { data: dashboardData, loading: dashboardLoading, refetch: refetchDashboard } = useMobileDashboard(user, effectiveUserId)

  // Debug flag for mobile calendar logs - set to false to disable verbose logging
  const ENABLE_MOBILE_DEBUG = true

  // TEMPORARY: Add global cache clearing function for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).clearMobileCache = () => {
        // console.log('🔥 Clearing all mobile cache...')
        // Clear mobile store data (commented out due to type issue)
        // useMobileStore.getState().clearSessionsData?.()
        // Also clear any browser caches
        if (window.sessionStorage) {
          const keys = Object.keys(sessionStorage)
          keys.forEach(key => {
            if (key.includes('mobile') || key.includes('cache')) {
              sessionStorage.removeItem(key)
            }
          })
        }
        // Force page refresh
        window.location.reload()
      }
      // console.log('🔧 Added global function: clearMobileCache() - call this in console to clear cache')
    }
  }, [])

  // States that need to be available to functions
  // Initial loading state - only show on first load, not on tab returns
  const [_initialLoading, _setInitialLoading] = useState(() => !simpleTabDetection.isTrueTabReturn())
  const [isLoadingMonthlyData, setIsLoadingMonthlyData] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Initialize sessions from cache synchronously to prevent skeleton flash
  const [sessions, setSessions] = useState<Session[]>(() => {
    if (typeof window === 'undefined') return []

    try {
      const today = new Date()
      const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const scheduleCache = useMobileStore.getState().scheduleCache

      // Try to get cached sessions for today
      const cacheKeys = Object.keys(scheduleCache)
      const todayCacheKey = cacheKeys.find(key => key.includes(dateKey))

      if (todayCacheKey && scheduleCache[todayCacheKey]) {
        console.log('✅ [Sessions Init] Using cached sessions on mount')
        return scheduleCache[todayCacheKey]
      }
    } catch (error) {
      console.warn('[Sessions Init] Failed to read cache:', error)
    }

    return []
  })

  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [hasLoadedSchedule, setHasLoadedSchedule] = useState(false)
  const [calendarView, setCalendarView] = useState<'weekly' | 'monthly'>('monthly')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isMountedRef = useRef(true)

  // Schedule data fetching - now defined after useEffectiveUserId hook
  const fetchScheduleForDate = useCallback(async (dateKey: string): Promise<Session[]> => {

    if (!effectiveUserId || !hasAcademyIds) {
      if (process.env.NODE_ENV === 'development') {
        // console.log('🔍 [SCHEDULE DEBUG] Early exit - missing data')
      }
      return []
    }

    try {
      // First get the student's enrolled classrooms
      const { data: enrolledClassrooms } = await supabase
        .rpc('get_student_classrooms', {
          student_uuid: effectiveUserId,
          academy_uuids: academyIds
        })

      // Deduplicate classroom IDs to prevent duplicate virtual sessions
      const classroomIds = [...new Set(enrolledClassrooms?.map((cs: any) => cs.classroom_id) || [])]

      if (classroomIds.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          // console.log('🔍 [SCHEDULE DEBUG] No enrolled classrooms found')
        }
        return []
      }

      // Query real sessions for the date
      const result = await supabase
        .from('classroom_sessions')
        .select(`
          id,
          date,
          start_time,
          end_time,
          status,
          location,
          room_number,
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

      const data = result.data
      const error = result.error

      if (error) throw error

      // Filter by date client-side
      const realSessions = data?.filter((session: any) => session.date === dateKey) || []

      // Fetch classroom data for all classrooms to populate virtual sessions
      const { data: classroomsData } = await supabase
        .from('classrooms')
        .select('id, name, color, academy_id, teacher_id')
        .in('id', classroomIds)

      const classroomsMap = new Map(classroomsData?.map(c => [c.id, c]) || [])

      // Get virtual sessions for each classroom and merge with real sessions
      const dateObj = new Date(dateKey)
      const allSessionsPromises = classroomIds.map(async (classroomId) => {
        const classroomRealSessions = realSessions.filter((s: any) => s.classroom_id === classroomId)
        return await getSessionsForDateRange(
          classroomId,
          dateObj,
          dateObj,
          classroomRealSessions
        )
      })

      const allSessionsArrays = await Promise.all(allSessionsPromises)
      const mergedSessions = allSessionsArrays.flat()

      // Add classroom data to virtual sessions
      const sessionsWithClassrooms = mergedSessions.map((session: any) => {
        if (session.is_virtual && !session.classrooms) {
          const classroomData = classroomsMap.get(session.classroom_id)
          return {
            ...session,
            classrooms: classroomData ? [classroomData] : []
          }
        }
        return session
      })

      // Deduplicate sessions by ID and filter to only include sessions for this specific date
      const sessionMap = new Map()
      sessionsWithClassrooms
        .filter((session: any) => session.date === dateKey)
        .forEach((session: any) => {
          if (!sessionMap.has(session.id)) {
            sessionMap.set(session.id, session)
          }
        })

      const filteredData = Array.from(sessionMap.values())

      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 [SCHEDULE DEBUG] Sessions with virtual:', {
          realCount: realSessions.length,
          mergedCount: filteredData.length,
          virtualCount: filteredData.filter((s: any) => s.is_virtual).length,
          dateKey: dateKey,
          sampleVirtual: filteredData.find((s: any) => s.is_virtual)
        })
      }

      // Fetch attendance data separately to avoid RLS issues with complex joins
      const attendanceMap = new Map()
      if (filteredData.length > 0) {
        const sessionIds = filteredData.map((session: any) => session.id)
        if (process.env.NODE_ENV === 'development') {
          // console.log('Fetching attendance for sessions:', sessionIds)
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

      const sessionAcademyIds = Array.from(new Set(filteredData.map((s: any) => {
        const classrooms = s.classrooms as any
        const classroom = Array.isArray(classrooms) ? classrooms[0] : classrooms
        return classroom?.academy_id
      }).filter(Boolean))) as string[]

      const academyNamesMap = new Map<string, string>()
      if (sessionAcademyIds.length > 0) {
        const { data: academies } = await supabase
          .from('academies')
          .select('id, name')
          .in('id', sessionAcademyIds)

        // Check mount status after async operation
        if (!isMountedRef.current) return []

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
          room_number: session.room_number || '',
          day_of_week: getDayOfWeek(new Date(dateKey)),
          status: session.status,
          duration_hours: durationHours,
          duration_minutes: durationMinutes,
          teacher_name: teacherName,
          academy_name: academyName,
          attendance_status: attendance_status,
          is_virtual: session.is_virtual || false
        }
      })

      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 [SCHEDULE DEBUG] Formatted sessions:', {
          total: formattedSessions.length,
          virtualCount: formattedSessions.filter(s => s.is_virtual).length,
          sampleVirtual: formattedSessions.find(s => s.is_virtual)
        })
      }

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
  }, [effectiveUserId, hasAcademyIds, academyIds, ENABLE_MOBILE_DEBUG])

  const fetchMonthlySessionDates = useCallback(async () => {
    if (!effectiveUserId || !hasAcademyIds) return
    if (isLoadingMonthlyData) return // Prevent multiple simultaneous calls


    setIsLoadingMonthlyData(true)
    try {
      // First get the student's enrolled classrooms
      const { data: enrolledClassrooms } = await supabase
        .rpc('get_student_classrooms', {
          student_uuid: effectiveUserId,
          academy_uuids: academyIds
        })

      // Deduplicate classroom IDs to prevent duplicate virtual sessions
      const classroomIds = [...new Set(enrolledClassrooms?.map((cs: any) => cs.classroom_id) || [])]
      if (process.env.NODE_ENV === 'development' && ENABLE_MOBILE_DEBUG) {
        // console.log('🔍 [MONTHLY DEBUG] Student enrolled in classrooms:', classroomIds)
      }

      if (classroomIds.length === 0) {
        if (process.env.NODE_ENV === 'development' && ENABLE_MOBILE_DEBUG) {
          // console.log('🔍 [MONTHLY DEBUG] No enrolled classrooms found')
        }
        // Clear calendar dots when student has no classrooms
        setMonthlySessionDates([])
        setScheduleCache({})
        setIsLoadingMonthlyData(false)
        return
      }

      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)

      const startDate = formatDateKST(firstDay)
      const endDate = formatDateKST(lastDay)

      // Query real sessions for the month
      const result = await supabase
        .from('classroom_sessions')
        .select(`
          id,
          date,
          start_time,
          end_time,
          status,
          location,
          room_number,
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

      const data = result.data
      const error = result.error

      if (error) {
        console.error('Error fetching monthly sessions:', error)
        return // Exit early if error
      }

      // Filter by date range client-side
      const realSessions = data?.filter((session: any) =>
        session.date >= startDate && session.date <= endDate
      ) || []

      // Fetch classroom data for all classrooms to populate virtual sessions
      const { data: classroomsData } = await supabase
        .from('classrooms')
        .select('id, name, color, academy_id, teacher_id')
        .in('id', classroomIds)

      const classroomsMap = new Map(classroomsData?.map(c => [c.id, c]) || [])

      // Get virtual sessions for each classroom and merge with real sessions
      const allSessionsPromises = classroomIds.map(async (classroomId) => {
        const classroomRealSessions = realSessions.filter((s: any) => s.classroom_id === classroomId)
        return await getSessionsForDateRange(
          classroomId,
          firstDay,
          lastDay,
          classroomRealSessions
        )
      })

      const allSessionsArrays = await Promise.all(allSessionsPromises)
      const mergedSessions = allSessionsArrays.flat()

      // Add classroom data to virtual sessions
      const sessionsWithClassrooms = mergedSessions.map((session: any) => {
        if (session.is_virtual && !session.classrooms) {
          const classroomData = classroomsMap.get(session.classroom_id)
          return {
            ...session,
            classrooms: classroomData ? [classroomData] : []
          }
        }
        return session
      })

      // Deduplicate sessions by ID and filter to only include sessions within the month range
      const sessionMap = new Map()
      sessionsWithClassrooms
        .filter((session: any) => session.date >= startDate && session.date <= endDate)
        .forEach((session: any) => {
          if (!sessionMap.has(session.id)) {
            sessionMap.set(session.id, session)
          }
        })

      const studentSessions = Array.from(sessionMap.values())

      if (process.env.NODE_ENV === 'development' && ENABLE_MOBILE_DEBUG) {
        // console.log('🔍 [MONTHLY DEBUG] Monthly sessions with virtual:', {
        //   realCount: realSessions.length,
        //   mergedCount: studentSessions.length,
        //   dateRange: `${startDate} to ${endDate}`
        // })
      }

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

      const sessionAcademyIds = Array.from(new Set(studentSessions.map((s: DbSessionData) => {
        const classrooms = s.classrooms as any
        const classroom = Array.isArray(classrooms) ? classrooms[0] : classrooms
        return classroom?.academy_id
      }).filter(Boolean))) as string[]

      const academyNamesMap = new Map<string, string>()
      if (sessionAcademyIds.length > 0) {
        const { data: academies } = await supabase
          .from('academies')
          .select('id, name')
          .in('id', sessionAcademyIds)

        // Check mount status after async operation
        if (!isMountedRef.current) return []

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
          room_number: session.room_number || '',
          day_of_week: getDayOfWeek(new Date(session.date)),
          status: session.status,
          duration_hours: durationHours,
          duration_minutes: durationMinutes,
          teacher_name: teacherName,
          academy_name: academyName,
          attendance_status: attendanceMap.get(session.id) || null,
          is_virtual: session.is_virtual || false
        }

        // Use student-specific cache key to match daily fetch format
        const studentCacheKey = `student_${effectiveUserId}_${session.date}`
        if (!newScheduleCache[studentCacheKey]) {
          newScheduleCache[studentCacheKey] = []
        }

        // Check for duplicates before adding to cache
        const isDuplicate = newScheduleCache[studentCacheKey].some(s => s.id === formattedSession.id)
        if (!isDuplicate) {
          newScheduleCache[studentCacheKey].push(formattedSession)
        }

        sessionDates.add(session.date)
      })

      const currentDate = new Date(firstDay)
      while (currentDate <= lastDay) {
        // Use KST formatting to avoid timezone shifts
        const dateStr = formatDateKST(currentDate)

        // Use student-specific cache key to match daily fetch format
        const studentCacheKey = `student_${effectiveUserId}_${dateStr}`
        if (!newScheduleCache[studentCacheKey]) {
          newScheduleCache[studentCacheKey] = []
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Clean up old cache entries that don't use student-specific keys
      const currentCache = useMobileStore.getState().scheduleCache
      const cleanedCache: Record<string, Session[]> = {}
      Object.keys(currentCache).forEach(key => {
        // Keep only student-specific cache keys or keys not matching date format
        if (key.startsWith('student_') || !key.match(/^\d{4}-\d{2}-\d{2}$/)) {
          cleanedCache[key] = currentCache[key]
        }
      })

      setScheduleCache({
        ...cleanedCache,
        ...newScheduleCache
      })

      setMonthlySessionDates(Array.from(sessionDates))

    } catch (error) {
      console.error('Error fetching monthly sessions:', error)
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMonthlyData(false)
      }
    }
  }, [effectiveUserId, hasAcademyIds, academyIds, currentMonth, ENABLE_MOBILE_DEBUG])

  // Old dashboard fetching logic removed - now using useMobileDashboard hook



  // Use stable academyIds from useEffectiveUserId hook

  // States moved to before function definitions to prevent ReferenceErrors

  // Use Zustand store for schedule caching
  const {
    setScheduleCache,
    monthlySessionDates,
    setMonthlySessionDates
  } = useMobileStore()

  const monthlyDatesSet = new Set(monthlySessionDates)

  const _formatTimeWithTranslation = useStableCallback((date: Date): string => {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const hour12 = hours % 12 || 12
    const ampm = hours < 12 ? t('common.am') : t('common.pm')
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`
  })

  const _formatDateWithTranslation = useStableCallback((date: Date): string => {
    const locale = language === 'korean' ? 'ko-KR' : 'en-US'
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric'
    }
    return date.toLocaleDateString(locale, options)
  })

  // Schedule helper functions
  const getDayOfWeek = useStableCallback((date: Date): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[date.getDay()]
  })

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

  // Loading state managed by useMobileDashboard hook
  const isLoading = dashboardLoading

  // Student-specific cache namespacing instead of aggressive clearing
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // console.log('🔍 [HOME DEBUG] Effective user changed, switching to cache namespace for:', effectiveUserId)
    }

    // Instead of clearing all cache, create student-specific namespaces
    // This allows for instant switching between students with cached data
    const currentCache = useMobileStore.getState().scheduleCache
    const studentNamespace = `student_${effectiveUserId}`
    const hasStudentCache = Object.keys(currentCache).some(key => key.startsWith(studentNamespace))

    if (hasStudentCache) {
      // console.log('🎯 [CACHE] Found existing cache for student:', effectiveUserId)
      // Cache exists for this student - data will be loaded automatically
    } else {
      // console.log('🔄 [CACHE] No cache found for student, will fetch fresh data:', effectiveUserId)
      // Don't clear monthly session dates - let them persist from Zustand cache
      // They will be refreshed by fetchMonthlySessionDates when needed
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
      // console.log('Selected date changed to:', dateKey)
    }

    const fetchData = async () => {
      if (!effectiveUserId || !hasAcademyIds) {
        if (isMountedRef.current) {
          setSessions(prev => prev.length === 0 ? prev : [])
        }
        return
      }

      try {
        // Check for student-specific cached data first
        const studentCacheKey = `student_${effectiveUserId}_${dateKey}`
        const currentCache = useMobileStore.getState().scheduleCache

        if (currentCache[studentCacheKey]) {
          if (process.env.NODE_ENV === 'development') {
            // console.log('🎯 Using cached data for student', effectiveUserId, 'on date:', dateKey, 'sessions:', currentCache[studentCacheKey].length)
          }
          setSessions(currentCache[studentCacheKey])
          setScheduleLoading(false)
          setHasLoadedSchedule(true)
          return
        }

        // Only set loading to true if we don't have cached data
        if (isMountedRef.current) {
          setScheduleLoading(true)
        }

        if (process.env.NODE_ENV === 'development') {
          // console.log('🔄 No valid cache found for student', effectiveUserId, 'on date:', dateKey, 'fetching fresh data...')
        }

        const freshData = await fetchScheduleForDate(dateKey)
        setSessions(freshData)
        setHasLoadedSchedule(true)
      } catch (error) {
        console.error('Error fetching schedule:', error)
        setSessions([])
        setHasLoadedSchedule(true)
      } finally {
        setScheduleLoading(false)
      }
    }

    fetchData()
  }, [selectedDate, fetchScheduleForDate])

  useEffect(() => {
    if (effectiveUserId && hasAcademyIds) {
      fetchMonthlySessionDates()
    }
  }, [effectiveUserId, hasAcademyIds, currentMonth])

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
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()
    const dayOfWeek = date.getDay()

    // Calculate the start of the week (Sunday)
    const startDate = day - dayOfWeek

    const weekDays = []
    for (let i = 0; i < 7; i++) {
      // Use Date constructor with year, month, day to avoid timezone issues
      weekDays.push(new Date(year, month, startDate + i))
    }
    return weekDays
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const day = selectedDate.getDate()
    const adjustment = direction === 'prev' ? -7 : 7
    const newDate = new Date(year, month, day + adjustment)
    setSelectedDate(newDate)
    setCurrentMonth(newDate)
  }

  // Pull-to-refresh handlers with proper touch delegation
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setPullDistance(0)

    try {
      // PERFORMANCE: Invalidate mobile dashboard cache
      if (effectiveUserId) {
        const cacheKey = `mobile-dashboard-${effectiveUserId}`
        sessionStorage.removeItem(cacheKey)
        sessionStorage.removeItem(`${cacheKey}-timestamp`)
        console.log('[Performance] Mobile dashboard cache invalidated on pull-to-refresh')
      }

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
        refetchDashboard(), // Use new hook refetch
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
  const _handleTouchStart = useStableCallback((e: React.TouchEvent) => {
    // Only handle touch if we're at the top of the scroll and not already refreshing
    if (scrollRef.current?.scrollTop === 0 && !isRefreshing) {
      startY.current = e.touches[0].clientY
      // Don't prevent default - let native scroll behavior work
    }
  })

  const _handleTouchMove = useStableCallback((e: React.TouchEvent) => {
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
  })

  const _handleTouchEnd = useStableCallback(() => {
    if (pullDistance > 80 && !isRefreshing) {
      handleRefresh()
    } else {
      setPullDistance(0)
    }
    // Reset start position
    startY.current = 0
  })

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

  // Extract data from new dashboard hook (handle null)
  const todaysSessionsCount = dashboardData?.todaysSessions?.length || 0
  const upcomingAssignmentsCount = dashboardData?.pendingAssignmentsCount || 0
  const recentGrades = dashboardData?.recentGrades || []
  const recentInvoices = dashboardData?.recentInvoices || []


  // Show loading skeleton while auth is loading
  if (authLoading) {
    return (
      <div className="p-4">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-32 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <AnimatedStatSkeleton />
          <AnimatedStatSkeleton />
        </div>
        <div className="space-y-4">
          <StaggeredListSkeleton items={3} />
        </div>
      </div>
    )
  }

  // Show loading skeleton when no data AND loading (initial load without cache)
  if (!dashboardData && dashboardLoading) {
    return (
      <div className="p-4 space-y-6">
        {/* Welcome Section - Show actual title instead of skeleton */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {clientUserName ? `${t('mobile.home.welcome')}, ${clientUserName}!` : `${t('mobile.home.welcome')}!`}
          </h1>
        </div>

        {/* Stats Section Skeleton */}
        <div className="grid grid-cols-2 gap-4">
          <AnimatedStatSkeleton />
          <AnimatedStatSkeleton />
        </div>

        {/* Calendar Section Skeleton */}
        <div className="h-96 bg-gray-200 animate-pulse rounded-lg" />

        {/* Sessions List Skeleton */}
        <StaggeredListSkeleton items={3} />
      </div>
    )
  }

  // Show loading skeleton while auth is loading (prevents flash of "select student" message)
  if (authLoading) {
    return (
      <div className="p-4 space-y-6">
        {/* Welcome Section Skeleton */}
        <div className="mb-6">
          <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        </div>

        {/* Stats Section Skeleton */}
        <div className="grid grid-cols-2 gap-4">
          <AnimatedStatSkeleton />
          <AnimatedStatSkeleton />
        </div>

        {/* Calendar Section Skeleton */}
        <div className="h-96 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    )
  }

  // Only show "select student" message when auth is fully loaded AND user is not ready AND we don't have any cached data
  if (!isReady && !authLoading && !dashboardData) {
    return (
      <div className="p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('mobile.home.welcome')}!
          </h1>
        </div>
        <Card className="p-6 text-center">
          <div className="space-y-2">
            <School className="w-8 h-8 mx-auto text-gray-300" />
            <p className="text-gray-600">
              {!effectiveUserId ? t('mobile.common.selectStudent') : t('mobile.common.noAcademies')}
            </p>
          </div>
        </Card>
      </div>
    )
  }

  // Show message for parents with no selected student
  if (isReady && user?.role === 'parent' && !effectiveUserId) {
    return (
      <div className="p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('mobile.home.welcome')}, {user?.userName}!
          </h1>
        </div>
        <Card className="p-6 text-center">
          <div className="space-y-4">
            <School className="w-12 h-12 mx-auto text-gray-300" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('mobile.common.noStudentsLinked')}
              </h3>
              <p className="text-gray-600">
                {t('mobile.common.noStudentsLinkedDesc')}
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="p-4 relative overflow-y-auto"
      style={{
        touchAction: MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH && pullDistance > 10 ? 'none' : 'auto',
        overscrollBehavior: 'contain'
      }}
    >
      {/* Pull-to-refresh indicator */}
      {MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH && (pullDistance > 0 || isRefreshing) && (
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

      <div style={{ transform: MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH ? `translateY(${pullDistance}px)` : 'none' }} className="transition-transform">
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {clientUserName ? `${t('mobile.home.welcome')}, ${clientUserName}!` : `${t('mobile.home.welcome')}!`}
        </h1>
      </div>

      {/* Quick Stats Cards */}
      <SkeletonErrorBoundary>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Only show skeleton when loading AND no cached data */}
          {(isLoading && !dashboardData) ? (
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
                    <p className="text-2xl font-bold">{todaysSessionsCount}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex flex-col justify-between h-20">
                  <p className="text-sm text-gray-600">{t('mobile.home.pendingAssignments')}</p>
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-6 h-6 text-orange-500" />
                    <p className="text-2xl font-bold">{upcomingAssignmentsCount}</p>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </SkeletonErrorBoundary>

      {/* Calendar Widget */}
      <SkeletonErrorBoundary>
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
      </SkeletonErrorBoundary>

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
      <SkeletonErrorBoundary>
        <div className="mb-6">
          <div className="mb-3">
          </div>

          {/* Only show skeleton when loading AND we haven't loaded schedule data yet */}
          {(scheduleLoading && !hasLoadedSchedule) ? (
            <StaggeredListSkeleton items={3} />
          ) : sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session) => {
                if (process.env.NODE_ENV === 'development' && session.is_virtual) {
                  console.log('🔴 [RENDER] Virtual session:', {
                    id: session.id,
                    is_virtual: session.is_virtual,
                    classroom: session.classroom.name
                  })
                }
                return (
                <Card
                  key={session.id}
                  className={`p-4 transition-colors ${session.is_virtual ? 'cursor-default' : 'cursor-pointer'} hover:bg-gray-50`}
                  onClick={(e) => {
                    if (session.is_virtual) {
                      e.preventDefault()
                      e.stopPropagation()
                      return
                    }
                    router.push(`/mobile/session/${session.id}`)
                  }}
                >
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
                      {session.room_number && (
                        <div className="flex items-center gap-1">
                          <DoorOpen className="w-3 h-3 text-gray-400" />
                          <span className="text-sm">{session.room_number}</span>
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

                  {/* Arrow Column - only show for real sessions */}
                  {!session.is_virtual && (
                    <div className="flex items-center">
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>
              </Card>
                )
              })}
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
      </SkeletonErrorBoundary>

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
      <SkeletonErrorBoundary
        loading={dashboardLoading && recentInvoices.length === 0}
        skeleton={<StaggeredListSkeleton items={3} />}
      >
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('mobile.home.recentInvoices')}
            </h2>
            {recentInvoices.length > 0 && (
              <button
                onClick={() => router.push('/mobile/invoices')}
                className="text-blue-600 text-sm font-medium"
              >
                {t('common.viewAll')}
              </button>
            )}
          </div>

          {recentInvoices.length > 0 ? (
            <div className="space-y-2">
              {recentInvoices.map((invoice: any) => (
                <Card
                  key={invoice.id}
                  className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => router.push(`/mobile/invoice/${invoice.id}`)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Receipt className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{t('mobile.invoices.invoice')}</p>
                        <p className="text-sm text-gray-500 truncate">{invoice.academyName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="font-semibold text-gray-900">₩{invoice.amount.toLocaleString()}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            invoice.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : invoice.status === 'overdue'
                              ? 'bg-red-100 text-red-700'
                              : invoice.status === 'cancelled'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {t(`mobile.invoices.status.${invoice.status}`)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-4 text-center">
              <div className="flex flex-col items-center gap-1">
                <Receipt className="w-6 h-6 text-gray-300" />
                <div className="text-gray-500 font-medium text-sm leading-tight">{t('mobile.home.noRecentInvoices')}</div>
              </div>
            </Card>
          )}
        </div>
      </SkeletonErrorBoundary>

      {/* Bottom spacing for proper scrolling */}
      <div className="pb-6"></div>
      </div>
    </div>
  )
}