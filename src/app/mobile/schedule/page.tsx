"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { Card } from '@/components/ui/card'
import { StaggeredListSkeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { Calendar, Clock, MapPin, User, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { getTeacherNamesWithCache } from '@/utils/mobileCache'
import { useMobileStore } from '@/stores/mobileStore'

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
  teacher_name?: string // Additional field for UI display
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

export default function MobileSchedulePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const { language } = useLanguage()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  // Pull-to-refresh states
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // Use Zustand store for persistent caching
  const {
    setScheduleCache,
    monthlySessionDates,
    setMonthlySessionDates
  } = useMobileStore()
  
  const monthlyDatesSet = new Set(monthlySessionDates)

  // Format date key for current selected date
  const year = selectedDate.getFullYear()
  const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
  const day = String(selectedDate.getDate()).padStart(2, '0')
  const dateKey = `${year}-${month}-${day}`
  
  // Use state to manage sessions instead of progressive loading for date-specific data
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)
  
  const fetchScheduleForDate = useCallback(async (dateKey: string): Promise<Session[]> => {
    if (!user?.userId || !user?.academyId) {
      return []
    }
    
    console.log('Fetching schedule for:', { 
      dateKey, 
      userId: user.userId, 
      academyId: user.academyId 
    })
    
    try {
      
      // OPTIMIZATION: Combined query to get sessions for student's enrolled classrooms only
      // This eliminates the need for separate student enrollment check
      const { data, error } = await supabase
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
            teacher_id,
            classroom_students!inner(
              student_id
            )
          )
        `)
        .eq('date', dateKey)
        .eq('status', 'scheduled')
        .eq('classrooms.academy_id', user.academyId)
        .eq('classrooms.classroom_students.student_id', user.userId)
        .order('start_time', { ascending: true })
      
      console.log('Query result:', { data, error })
      
      if (error) throw error
      
      const filteredData = data || []
      
      // OPTIMIZATION: Use cached teacher names with batch fetching
      const teacherIds = [...new Set(filteredData.map((s) => {
        const classrooms = (s as unknown as {classrooms: {teacher_id: string} | Array<{teacher_id: string}>}).classrooms
        if (Array.isArray(classrooms)) {
          return classrooms[0]?.teacher_id
        } else if (classrooms && 'teacher_id' in classrooms) {
          return classrooms.teacher_id
        }
        return null
      }).filter(Boolean) as string[])]
      const teacherMap = await getTeacherNamesWithCache(teacherIds)
      
      const formattedSessions: Session[] = filteredData.map((session) => {
        const classrooms = (session as unknown as {classrooms: {id: string, name: string, color: string, teacher_id: string} | Array<{id: string, name: string, color: string, teacher_id: string}>}).classrooms
        const classroom = Array.isArray(classrooms) ? classrooms[0] : classrooms
        const teacherName = teacherMap.get(classroom?.teacher_id || '') || 'Unknown Teacher'
        
        // Calculate duration
        const startTime = new Date(`2000-01-01T${session.start_time}`)
        const endTime = new Date(`2000-01-01T${session.end_time}`)
        const durationMs = endTime.getTime() - startTime.getTime()
        const durationHours = Math.floor(durationMs / (1000 * 60 * 60))
        const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
        
        return {
          id: session.id,
          date: session.date,
          start_time: session.start_time.slice(0, 5), // Format HH:MM
          end_time: session.end_time.slice(0, 5), // Format HH:MM
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
          teacher_name: teacherName
        }
      })
      
      // Cache the result in Zustand store using current state  
      const currentCache = useMobileStore.getState().scheduleCache
      setScheduleCache({
        ...currentCache,
        [dateKey]: formattedSessions
      })
      
      return formattedSessions
    } catch (error) {
      console.error('Error fetching schedule:', error)
      return []
    }
  }, [user, setScheduleCache])

  const fetchMonthlySessionDates = useCallback(async () => {
    if (!user?.userId || !user?.academyId) return
    
    try {
      // Get first and last day of current month
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      
      const startDate = firstDay.toISOString().split('T')[0]
      const endDate = lastDay.toISOString().split('T')[0]
      
      console.log('Fetching monthly sessions from:', startDate, 'to:', endDate)
      
      // OPTIMIZATION: Single query with all filters applied directly
      const { data: sessions, error } = await supabase
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
            teacher_id,
            classroom_students!inner(
              student_id
            )
          )
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('status', 'scheduled')
        .eq('classrooms.academy_id', user.academyId)
        .eq('classrooms.classroom_students.student_id', user.userId)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
      
      if (error) {
        console.error('Error fetching monthly sessions:', error)
        return
      }
      
      const studentSessions = sessions || []
      
      // OPTIMIZATION: Use cached teacher names with batch fetching
      const teacherIds = [...new Set(studentSessions.map((s: DbSessionData) => {
        const classrooms = (s as unknown as {classrooms: {teacher_id: string} | Array<{teacher_id: string}>}).classrooms
        if (Array.isArray(classrooms)) {
          return classrooms[0]?.teacher_id
        } else if (classrooms && 'teacher_id' in classrooms) {
          return classrooms.teacher_id
        }
        return null
      }).filter(Boolean) as string[])]
      const teacherMap = await getTeacherNamesWithCache(teacherIds)
      
      // Format sessions and organize by date
      const newScheduleCache: Record<string, Session[]> = {}
      const sessionDates = new Set<string>()
      
      studentSessions.forEach((session: DbSessionData) => {
        const classrooms = (session as unknown as {classrooms: {id: string, name: string, color: string, teacher_id: string} | Array<{id: string, name: string, color: string, teacher_id: string}>}).classrooms
        const classroom = Array.isArray(classrooms) ? classrooms[0] : classrooms
        const teacherName = teacherMap.get(classroom?.teacher_id || '') || 'Unknown Teacher'
        
        // Calculate duration
        const startTime = new Date(`2000-01-01T${session.start_time}`)
        const endTime = new Date(`2000-01-01T${session.end_time}`)
        const durationMs = endTime.getTime() - startTime.getTime()
        const durationHours = Math.floor(durationMs / (1000 * 60 * 60))
        const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
        
        const formattedSession: Session = {
          id: session.id,
          date: session.date,
          start_time: session.start_time.slice(0, 5), // Format HH:MM
          end_time: session.end_time.slice(0, 5), // Format HH:MM
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
          teacher_name: teacherName
        }
        
        // Add to sessions cache
        if (!newScheduleCache[session.date]) {
          newScheduleCache[session.date] = []
        }
        newScheduleCache[session.date].push(formattedSession)
        
        // Add date to session dates set
        sessionDates.add(session.date)
      })
      
      // OPTIMIZATION: Also cache empty arrays for dates with no sessions in this month
      // This prevents unnecessary API calls for empty dates
      const currentDate = new Date(firstDay)
      while (currentDate <= lastDay) {
        const dateStr = currentDate.toISOString().split('T')[0]
        if (!newScheduleCache[dateStr]) {
          newScheduleCache[dateStr] = [] // Cache empty array for dates with no sessions
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Update cache and session dates in Zustand store
      const currentCache = useMobileStore.getState().scheduleCache
      setScheduleCache({
        ...currentCache,
        ...newScheduleCache
      })
      
      setMonthlySessionDates(Array.from(sessionDates))
      
      console.log('Monthly cache: populated', Object.keys(newScheduleCache).length, 'dates, sessions on', sessionDates.size, 'days')
      
    } catch (error) {
      console.error('Error fetching monthly sessions:', error)
    }
  }, [user, currentMonth, setScheduleCache, setMonthlySessionDates])

  // Fetch schedule when date or user changes
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.userId || !user?.academyId) {
        setSessions([])
        return
      }
      
      setLoading(true)
      
      try {
        // Get fresh cache reference inside the effect
        const currentCache = useMobileStore.getState().scheduleCache;
        
        // Check cache first - should hit for all dates in current month after monthly fetch
        if (currentCache[dateKey]) {
          console.log('✓ Cache HIT:', dateKey, '- sessions:', currentCache[dateKey].length)
          setSessions(currentCache[dateKey])
          setLoading(false)
          return
        }
        
        // Cache miss - this should only happen for dates outside current month or before initial monthly fetch
        console.log('✗ Cache MISS: Fetching', dateKey, '(outside month or before initial load)')
        const freshData = await fetchScheduleForDate(dateKey)
        setSessions(freshData)
      } catch (error) {
        console.error('Error fetching schedule:', error)
        setSessions([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [dateKey, user?.userId, user?.academyId, fetchScheduleForDate, selectedDate])
  
  // Monthly data fetching  
  useEffect(() => {
    if (user?.userId && user?.academyId) {
      fetchMonthlySessionDates()
    }
  }, [currentMonth, user, fetchMonthlySessionDates])

  const getDayOfWeek = (date: Date): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[date.getDay()]
  }

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
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Pull-to-refresh handlers
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setPullDistance(0)
    
    try {
      // Clear cache for current month
      const currentCache = useMobileStore.getState().scheduleCache
      const clearedCache: Record<string, Session[]> = {}
      
      // Clear only current month's cache entries
      Object.keys(currentCache).forEach(key => {
        const keyDate = new Date(key)
        if (keyDate.getMonth() !== currentMonth.getMonth() || 
            keyDate.getFullYear() !== currentMonth.getFullYear()) {
          clearedCache[key] = currentCache[key]
        }
      })
      
      setScheduleCache(clearedCache)
      
      // Refetch monthly data
      await fetchMonthlySessionDates()
      
      // Refetch current date's data
      const freshData = await fetchScheduleForDate(dateKey)
      setSessions(freshData)
      
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

  return (
    <div 
      ref={scrollRef}
      className="p-4 relative overflow-y-auto"
      style={{ touchAction: pullDistance > 0 ? 'none' : 'auto' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
              className={`w-5 h-5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span className="text-sm text-blue-600 font-medium">
              {isRefreshing ? t('common.refreshing') : t('common.pullToRefresh')}
            </span>
          </div>
        </div>
      )}
      
      <div style={{ transform: `translateY(${pullDistance}px)` }} className="transition-transform">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('mobile.schedule.title')}
        </h1>
      </div>

      {/* Month Calendar */}
      <div className="mb-6 bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <h3 className="font-semibold text-gray-900">
            {currentMonth.toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US', { month: 'long', year: 'numeric' })}
          </h3>
          
          <button
            onClick={() => navigateMonth('next')}
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
          {getDaysInMonth(currentMonth).map((day, index) => {
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
                    ? 'bg-blue-600 text-white'
                    : isCurrentDay
                    ? 'bg-blue-100 text-blue-600'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {day.getDate()}
                {hasSession && (
                  <div className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full ${
                    isSelected || isCurrentDay ? 'bg-white' : 'bg-blue-600'
                  }`} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Date Display */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {formatDate(selectedDate)}
        </h2>
        {isToday(selectedDate) && (
          <p className="text-sm text-blue-600 font-medium">{t('mobile.schedule.today')}</p>
        )}
      </div>

      {/* Schedule List */}
      {loading ? (
        <StaggeredListSkeleton items={5} />
      ) : sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((session) => {
            const borderColor = session.classroom.color ? `border-l-[${session.classroom.color}]` : 'border-l-blue-200'
            
            return (
              <Card key={session.id} className="p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => router.push(`/mobile/session/${session.id}`)}>
                <div className="flex gap-4">
                  {/* Time Column */}
                  <div className="flex flex-col items-center justify-center text-center min-w-[60px]">
                    <p className="text-sm font-semibold text-gray-900">{session.start_time}</p>
                    <div className="w-px h-4 bg-gray-300 my-1"></div>
                    <p className="text-sm text-gray-500">{session.end_time}</p>
                  </div>
                  
                  {/* Details Column */}
                  <div className={`flex-1 border-l-2 ${borderColor} pl-4`} style={{ borderLeftColor: session.classroom.color }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: session.classroom.color }}
                      />
                      <h3 className="font-semibold text-gray-900">
                        {session.classroom.name}
                      </h3>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{session.teacher_name}</span>
                      </div>
                      
                      {session.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>
                            {session.location === 'offline' 
                              ? t('sessions.offline')
                              : session.location === 'online'
                              ? t('sessions.online') 
                              : session.location
                            }
                          </span>
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
                      
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{t('mobile.schedule.duration')}: {' '}
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
            )
          })}
        </div>
      ) : (
        <Card className="p-6">
          <div className="text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">{t('mobile.schedule.noClasses')}</p>
          </div>
        </Card>
      )}
      </div>
    </div>
  )
}