"use client"

import { useCallback, useState, useRef, useEffect } from 'react'
import { useStableCallback } from '@/hooks/useStableCallback'
import { useRouter } from 'next/navigation'
import { useSafeParams } from '@/hooks/useSafeParams'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId'
import { getTeacherNamesWithCache } from '@/utils/mobileCache'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SessionDetailSkeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft,
  School,
  User,
  Clock,
  Calendar,
  MapPin,
  Users,
  GraduationCap,
  Book,
  RefreshCw,
  DoorOpen
} from 'lucide-react'
import { MOBILE_FEATURES } from '@/config/mobileFeatures'

interface SessionDetails {
  id: string
  date: string
  start_time: string
  end_time: string
  location?: string
  room_number?: string
  status: string
  academy_name?: string
  classroom: {
    id: string
    name: string
    color: string
    grade?: string
    subject?: string
    notes?: string
    teacher_name: string
    student_count: number
    enrolled_students: Array<{
      id: string
      name: string
      school_name?: string
    }>
  }
}

export default function MobileSessionDetailsPage() {
  const router = useRouter()
  const params = useSafeParams()
  const { t } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const { language } = useLanguage()
  const { effectiveUserId, isReady, isLoading: authLoading, hasAcademyIds, academyIds } = useEffectiveUserId()

  const sessionId = params?.id || ''

  // Pull-to-refresh states
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const formatTimeWithTranslation = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':').map(Number)
    const hour12 = hours % 12 || 12
    const ampm = hours < 12 ? t('common.am') : t('common.pm')
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`
  }

  const fetchSessionDetailsOptimized = useCallback(async (sessionId: string): Promise<SessionDetails | null> => {
    if (!sessionId || !effectiveUserId || !hasAcademyIds) return null

    try {
      console.log('🔍 [Session] Fetching session details for:', { sessionId, effectiveUserId, academyIds })

      // Step 1: Get student's enrolled classrooms using RPC to bypass RLS
      const { data: enrolledClassrooms } = await supabase
        .rpc('get_student_classrooms', {
          student_uuid: effectiveUserId,
          academy_uuids: academyIds
        })

      const classroomIds = enrolledClassrooms?.map((cs: any) => cs.classroom_id) || []

      if (classroomIds.length === 0) {
        console.log('🔍 [Session] No enrolled classrooms found')
        throw new Error('No access to any classrooms')
      }

      console.log('🔍 [Session] Student enrolled in classrooms:', classroomIds)

      // Step 2: Get all sessions for enrolled classrooms using direct query to get room_number
      const { data: sessions, error: sessionError } = await supabase
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
            teacher_id,
            grade,
            subject,
            notes
          )
        `)
        .in('classroom_id', classroomIds)
        .is('deleted_at', null)

      if (sessionError) {
        console.error('🚫 [Session] Sessions query error:', sessionError)
        throw sessionError
      }

      // Step 3: Find the specific session
      const sessionData = sessions?.find((session: any) => session.id === sessionId)

      if (!sessionData) {
        console.error('🚫 [Session] Session not found or no access')
        throw new Error('Session not found or access denied')
      }

      console.log('✅ [Session] Session data fetched:', sessionData)

      // Extract classroom information from the session data
      const classroom = Array.isArray(sessionData.classrooms) ? sessionData.classrooms[0] : sessionData.classrooms as any

      // Get the total count of students in the classroom using our RLS-bypassing function
      const { data: studentCountResult, error: countError } = await supabase
        .rpc('get_classroom_student_count', { classroom_uuid: classroom.id })

      if (countError) {
        console.error('Error getting student count:', countError)
      }

      const studentCount = studentCountResult || 0

      // OPTIMIZATION: Use cached teacher name fetching
      const teacherMap = await getTeacherNamesWithCache([classroom.teacher_id])
      const teacherName = teacherMap.get(classroom.teacher_id) || 'Unknown Teacher'

      // Fetch academy name separately
      let academyName = 'Academy'
      if (classroom.academy_id) {
        const { data: academyData } = await supabase
          .from('academies')
          .select('name')
          .eq('id', classroom.academy_id)
          .single()

        console.log('🏫 Session Details: Academy ID:', classroom.academy_id)
        console.log('🏫 Session Details: Academy data fetched:', academyData)

        academyName = academyData?.name || 'Academy'

        console.log('🏫 Session Details: Final academy name:', academyName)
      }

      console.log('Student count for classroom:', studentCount)

      const formattedSession: SessionDetails = {
        id: sessionData.id,
        date: sessionData.date,
        start_time: sessionData.start_time.slice(0, 5), // Format HH:MM
        end_time: sessionData.end_time.slice(0, 5), // Format HH:MM
        location: sessionData.location,
        room_number: sessionData.room_number,
        status: sessionData.status,
        academy_name: academyName,
        classroom: {
          id: classroom.id,
          name: classroom.name,
          color: classroom.color || '#3B82F6',
          grade: classroom.grade,
          subject: classroom.subject,
          notes: classroom.notes,
          teacher_name: teacherName,
          student_count: studentCount || 0,
          enrolled_students: []
        }
      }

      return formattedSession
    } catch (error) {
      console.error('❌ [Session] Error fetching session details:', {
        error,
        sessionId,
        effectiveUserId,
        errorMessage: (error as any)?.message,
        errorDetails: (error as any)?.details,
        errorHint: (error as any)?.hint
      })
      return null
    }
  }, [effectiveUserId, hasAcademyIds, academyIds, user])
  
  // Progressive loading for session details
  // Replace useMobileData with direct useEffect pattern like working pages
  const [session, setSession] = useState<SessionDetails | null>(null)
  const [loading, setLoading] = useState(() => {
    const shouldSuppress = simpleTabDetection.isReturningToTab()
    if (shouldSuppress) {
      console.log('🚫 [SessionDetails] Suppressing initial loading - navigation detected')
      return false
    }
    return true
  })

  const refetchSession = useStableCallback(async () => {
    if (!sessionId || !effectiveUserId || !isReady) {
      setSession(null)
      setLoading(false)
      return
    }

    try {
      if (!simpleTabDetection.isReturningToTab()) {
        setLoading(true)
      }
      console.log('🏠 [Session] Starting fetch for:', sessionId)
      const result = await fetchSessionDetailsOptimized(sessionId)
      console.log('✅ [Session] Fetch successful:', result)
      setSession(result)
    } catch (error) {
      console.error('❌ [Session] Fetch error:', error)
      setSession(null)
    } finally {
      setLoading(false)
      simpleTabDetection.markAppLoaded()
    }
  })

  // Direct useEffect pattern like working pages
  useEffect(() => {
    if (sessionId && effectiveUserId && isReady && hasAcademyIds) {
      refetchSession()
    }
  }, [sessionId, effectiveUserId, isReady, hasAcademyIds])

  const formatDate = (date: string): string => {
    const locale = language === 'korean' ? 'ko-KR' : 'en-US'
    const dateObj = new Date(date)
    
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }
    return dateObj.toLocaleDateString(locale, options)
  }

  const getDuration = () => {
    if (!session) return ''
    
    const startTime = new Date(`2000-01-01T${session.start_time}:00`)
    const endTime = new Date(`2000-01-01T${session.end_time}:00`)
    const durationMs = endTime.getTime() - startTime.getTime()
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60))
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (durationHours > 0) {
      return t('mobile.schedule.durationHours', { hours: durationHours, minutes: durationMinutes })
    } else {
      return t('mobile.schedule.durationMinutes', { minutes: durationMinutes })
    }
  }

  // Pull-to-refresh handlers
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setPullDistance(0)
    
    try {
      await refetchSession()
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0 && !isRefreshing) {
      const currentY = e.touches[0].clientY
      const diff = currentY - startY.current
      
      if (diff > 0) {
        setPullDistance(Math.min(diff, 100))
      }
    }
  }

  const handleTouchEnd = () => {
    if (pullDistance > 80 && !isRefreshing) {
      handleRefresh()
    } else {
      setPullDistance(0)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('mobile.session.title')}
          </h1>
        </div>
        <SessionDetailSkeleton />
      </div>
    )
  }

  // Show message when user is not ready (no student selected for parents)
  if (!isReady || !effectiveUserId || !hasAcademyIds) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">
            {t('mobile.session.sessionDetails')}
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

  if (!session) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('mobile.session.title')}
          </h1>
        </div>
        <Card className="p-6">
          <div className="text-center">
            <p className="text-gray-500">{t('mobile.session.notFound')}</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="p-4 relative overflow-y-auto"
      style={{ touchAction: MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH && pullDistance > 0 ? 'none' : 'auto' }}
      {...(MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH && {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd
      })}
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
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {session.classroom.name}
          </h1>
          <p className="text-sm text-gray-600">{t('mobile.session.classDetails')}</p>
        </div>
      </div>

      {/* Session Info Card */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div 
            className="w-16 h-16 rounded-lg flex items-center justify-center text-white"
            style={{ backgroundColor: session.classroom.color }}
          >
            <School className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{session.classroom.name}</h2>
            <p className="text-xs text-gray-500">{session.academy_name}</p>
            <p className="text-sm text-gray-600">{formatDate(session.date)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{t('mobile.session.time')}</p>
                <p className="text-sm text-gray-600">{formatTimeWithTranslation(session.start_time)} - {formatTimeWithTranslation(session.end_time)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{t('mobile.session.duration')}</p>
                <p className="text-sm text-gray-600">{getDuration()}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{t('mobile.session.teacher')}</p>
                <p className="text-sm text-gray-600">{session.classroom.teacher_name}</p>
              </div>
            </div>

            {session.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('mobile.session.location')}</p>
                  <p className="text-sm text-gray-600">
                    {session.location === 'offline'
                      ? t('sessions.offline')
                      : session.location === 'online'
                      ? t('sessions.online')
                      : session.location
                    }
                  </p>
                </div>
              </div>
            )}

            {session.room_number && (
              <div className="flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('sessions.room')}</p>
                  <p className="text-sm text-gray-600">{session.room_number}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 flex items-center justify-center">
                <div className={`w-2 h-2 rounded-full ${
                  session.status === 'scheduled' ? 'bg-green-400' :
                  session.status === 'completed' ? 'bg-primary' :
                  session.status === 'cancelled' ? 'bg-red-400' :
                  'bg-gray-400'
                }`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{t('mobile.session.status')}</p>
                <p className="text-sm text-gray-600">
                  {session.status === 'scheduled' 
                    ? t('mobile.session.statusScheduled')
                    : session.status === 'completed'
                    ? t('mobile.session.statusCompleted') 
                    : session.status === 'cancelled'
                    ? t('mobile.session.statusCancelled')
                    : session.status
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Classroom Details */}
      <div className="space-y-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{t('mobile.session.classroomInfo')}</h3>
        
        <div className="grid grid-cols-1 gap-4">
          {session.classroom.grade && (
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {t('classrooms.grade') || 'Grade'}
                  </p>
                  <p className="text-sm text-gray-600">{session.classroom.grade}</p>
                </div>
              </div>
            </Card>
          )}

          {session.classroom.subject && (
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Book className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('classrooms.subject')}</p>
                  <p className="text-sm text-gray-600">{session.classroom.subject}</p>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{t('common.students')}</p>
                <p className="text-sm text-gray-600">
                  {language === 'korean' 
                    ? `${session.classroom.student_count}명`
                    : `${session.classroom.student_count} ${String(t('common.students')).toLowerCase()}`
                  }
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Notes */}
      {session.classroom.notes && (
        <Card className="p-4 mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">{t('classrooms.notes')}</h4>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">{session.classroom.notes}</p>
          </div>
        </Card>
      )}
      </div>
    </div>
  )
}