"use client"

import { useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useMobileData } from '@/hooks/useProgressiveLoading'
import { getTeacherNamesWithCache } from '@/utils/mobileCache'
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
  Book 
} from 'lucide-react'

interface SessionDetails {
  id: string
  date: string
  start_time: string
  end_time: string
  location?: string
  status: string
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
  const params = useParams()
  const { t } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const { language } = useLanguage()

  const sessionId = params?.id as string

  const formatTimeWithTranslation = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':').map(Number)
    const hour12 = hours % 12 || 12
    const ampm = hours < 12 ? t('common.am') : t('common.pm')
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`
  }

  const fetchSessionDetailsOptimized = useCallback(async (sessionId: string): Promise<SessionDetails | null> => {
    if (!sessionId || !user?.userId) return null

    try {
      
      // Get session with classroom details
      const { data: sessionData, error: sessionError } = await supabase
        .from('classroom_sessions')
        .select(`
          id,
          date,
          start_time,
          end_time,
          location,
          status,
          classrooms!inner(
            id,
            name,
            color,
            grade,
            subject,
            notes,
            teacher_id
          )
        `)
        .eq('id', sessionId)
        .single()

      if (sessionError) throw sessionError
      if (!sessionData) throw new Error('Session not found')

      // Get the total count of students in the classroom using our RLS-bypassing function
      const classroom = Array.isArray(sessionData.classrooms) ? sessionData.classrooms[0] : sessionData.classrooms
      const { data: studentCountResult, error: countError } = await supabase
        .rpc('get_classroom_student_count', { classroom_uuid: classroom.id })

      if (countError) {
        console.error('Error getting student count:', countError)
      }

      const studentCount = studentCountResult || 0

      // OPTIMIZATION: Use cached teacher name fetching
      const teacherMap = await getTeacherNamesWithCache([classroom.teacher_id])
      const teacherName = teacherMap.get(classroom.teacher_id) || 'Unknown Teacher'

      console.log('Student count for classroom:', studentCount)

      const formattedSession: SessionDetails = {
        id: sessionData.id,
        date: sessionData.date,
        start_time: sessionData.start_time.slice(0, 5), // Format HH:MM
        end_time: sessionData.end_time.slice(0, 5), // Format HH:MM
        location: sessionData.location,
        status: sessionData.status,
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
      console.error('Error fetching session details:', error)
      return null
    }
  }, [user])
  
  // Progressive loading for session details
  const sessionFetcher = useCallback(async () => {
    if (!sessionId || !user?.userId) return null
    return await fetchSessionDetailsOptimized(sessionId)
  }, [sessionId, user, fetchSessionDetailsOptimized])
  
  const {
    data: session,
    isLoading: loading
  } = useMobileData(
    `session-${sessionId}`,
    sessionFetcher,
    {
      immediate: true,
      staleTime: 10 * 60 * 1000, // 10 minutes (session details don't change frequently)
      backgroundRefresh: false // Session details are relatively static
    }
  )

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

  if (loading) {
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
    <div className="p-4">
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

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 flex items-center justify-center">
                <div className={`w-2 h-2 rounded-full ${
                  session.status === 'scheduled' ? 'bg-green-400' :
                  session.status === 'completed' ? 'bg-blue-400' :
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
                    : `${session.classroom.student_count} ${t('common.students').toLowerCase()}`
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
  )
}