import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { usePerformanceMonitor } from '../performance/usePerformanceMonitor'

interface AttendanceRecord {
  id: string
  session_id: string
  classroom_name?: string
  classroom_color?: string
  teacher_name?: string
  session_date?: string
  session_time?: string
  location: 'offline' | 'online'
  created_at: string
  updated_at: string
  student_count?: number
  present_count?: number
  absent_count?: number
  late_count?: number
  excused_count?: number
}

const ATTENDANCE_QUERY_KEY = 'attendance'

async function fetchOptimizedAttendance(academyId: string, t: (key: string) => string, onQueryCount?: (count: number) => void) {
  let queryCount = 0

  try {
    // OPTIMIZED: Single query with joins to get sessions with classroom and teacher info
    const { data: sessions, error: sessionsError } = await supabase
      .from('classroom_sessions')
      .select(`
        *,
        classrooms!inner(
          id,
          name,
          color,
          academy_id,
          teacher_id
        )
      `)
      .eq('classrooms.academy_id', academyId)
      .is('deleted_at', null)
      .order('date', { ascending: false })

    queryCount++
    onQueryCount?.(queryCount)

    if (sessionsError) throw sessionsError
    if (!sessions || sessions.length === 0) return []

    // OPTIMIZED: Extract IDs for parallel queries
    const sessionIds = sessions.map(s => s.id)
    const teacherIds = [...new Set(sessions.map(s => s.classrooms?.teacher_id).filter(Boolean))]

    // OPTIMIZED: Execute teacher names and attendance data queries in parallel
    const [teachersResult, attendanceResult] = await Promise.all([
      // Teacher names
      teacherIds.length > 0
        ? supabase
            .from('users')
            .select('id, name')
            .in('id', teacherIds)
        : Promise.resolve({ data: [] }),
      
      // Attendance data
      sessionIds.length > 0
        ? supabase
            .from('attendance')
            .select('classroom_session_id, status')
            .in('classroom_session_id', sessionIds)
        : Promise.resolve({ data: [] })
    ])

    queryCount += 2
    onQueryCount?.(queryCount)

    // OPTIMIZED: Create lookup maps
    const teacherMap = new Map<string, string>()
    teachersResult.data?.forEach((teacher: any) => {
      teacherMap.set(teacher.id, teacher.name)
    })

    // OPTIMIZED: Group attendance by session more efficiently
    const attendanceBySession = new Map<string, Record<string, number>>()
    attendanceResult.data?.forEach((att: any) => {
      const sessionId = att.classroom_session_id
      const sessionData = attendanceBySession.get(sessionId) || {}
      sessionData[att.status] = (sessionData[att.status] || 0) + 1
      sessionData.total = (sessionData.total || 0) + 1
      attendanceBySession.set(sessionId, sessionData)
    })

    // OPTIMIZED: Process sessions with all data available
    const attendanceRecordsWithDetails: AttendanceRecord[] = sessions.map(session => {
      const classroom = session.classrooms
      const teacherName = classroom?.teacher_id ? teacherMap.get(classroom.teacher_id) : null
      const attendanceCounts = attendanceBySession.get(session.id) || {}

      return {
        id: session.id,
        session_id: session.id,
        classroom_name: classroom?.name || t('common.unknownClassroom'),
        classroom_color: classroom?.color,
        teacher_name: teacherName || t('common.unknownTeacher'),
        session_date: session.date,
        session_time: `${session.start_time} - ${session.end_time}`,
        location: session.location as 'offline' | 'online',
        created_at: session.created_at,
        updated_at: session.updated_at,
        student_count: attendanceCounts.total || 0,
        present_count: attendanceCounts.present || 0,
        absent_count: attendanceCounts.absent || 0,
        late_count: attendanceCounts.late || 0,
        excused_count: attendanceCounts.excused || 0
      }
    })

    return attendanceRecordsWithDetails
  } catch (error) {
    console.error('Error fetching optimized attendance:', error)
    throw error
  }
}

export function useOptimizedAttendance(
  academyId: string, 
  t: (key: string) => string,
  enabled: boolean = true
) {
  const queryClient = useQueryClient()
  const performance = usePerformanceMonitor({ 
    key: 'attendance-react-query',
    enabled: true 
  })

  const query = useQuery({
    queryKey: [ATTENDANCE_QUERY_KEY, academyId],
    queryFn: async () => {
      performance.startMeasurement()
      
      const result = await fetchOptimizedAttendance(academyId, t, (count) => {
        // Track query count for performance monitoring
        for (let i = 0; i < count; i++) {
          performance.recordQuery()
        }
      })
      
      performance.endMeasurement(false) // Not a cache hit since we're fetching
      return result
    },
    enabled: enabled && !!academyId,
    staleTime: 2 * 60 * 1000, // 2 minutes - same as our sessionStorage cache
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })

  // Invalidation helper
  const invalidateAttendance = () => {
    queryClient.invalidateQueries({ queryKey: [ATTENDANCE_QUERY_KEY, academyId] })
  }

  // Prefetch for performance
  const prefetchAttendance = () => {
    queryClient.prefetchQuery({
      queryKey: [ATTENDANCE_QUERY_KEY, academyId],
      queryFn: () => fetchOptimizedAttendance(academyId, t),
      staleTime: 2 * 60 * 1000,
    })
  }

  return {
    ...query,
    attendanceRecords: query.data || [],
    invalidateAttendance,
    prefetchAttendance,
    performanceMetrics: performance.metrics,
    averageLoadTime: performance.getAverageLoadTime(),
    cacheHitRate: performance.getCacheHitRate()
  }
}