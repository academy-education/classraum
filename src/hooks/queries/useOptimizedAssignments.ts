import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { usePerformanceMonitor } from '../performance/usePerformanceMonitor'

interface Assignment {
  id: string
  classroom_session_id: string
  classroom_name?: string
  classroom_color?: string
  teacher_name?: string
  session_date?: string
  session_time?: string
  title: string
  description?: string
  assignment_type: 'quiz' | 'homework' | 'test' | 'project'
  due_date?: string
  assignment_categories_id?: string
  category_name?: string
  attachments?: any[]
  created_at: string
  updated_at: string
  student_count?: number
  submitted_count?: number
}

interface AttachmentFile {
  id?: string
  name: string
  url: string
  size: number
  type: string
  uploaded?: boolean
}

const ASSIGNMENTS_QUERY_KEY = 'assignments'

async function fetchOptimizedAssignments(academyId: string, onQueryCount?: (count: number) => void) {
  let queryCount = 0
  
  try {
    // OPTIMIZED: Single query with all joins to get assignments with full context
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        classroom_sessions!inner(
          id,
          date,
          start_time,
          end_time,
          classrooms!inner(
            id,
            name,
            color,
            academy_id,
            teacher_id
          )
        ),
        assignment_categories(name)
      `)
      .eq('classroom_sessions.classrooms.academy_id', academyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    
    queryCount++
    onQueryCount?.(queryCount)

    if (error) throw error
    if (!data || data.length === 0) return { assignments: [], grades: [] }

    // OPTIMIZED: Extract IDs for parallel batch queries
    const assignmentClassroomIds = [...new Set(data.map(a => a.classroom_sessions?.classrooms?.id).filter(Boolean))]
    const teacherIds = [...new Set(data.map(a => a.classroom_sessions?.classrooms?.teacher_id).filter(Boolean))]
    const assignmentIds = data.map(a => a.id)

    // OPTIMIZED: Execute all supplementary queries in parallel
    const [studentCountsResult, submissionCountsResult, attachmentsResult, allGradesResult, teachersResult] = await Promise.all([
      // Student counts per classroom
      assignmentClassroomIds.length > 0 
        ? supabase
            .from('classroom_students')
            .select('classroom_id')
            .in('classroom_id', assignmentClassroomIds)
        : Promise.resolve({ data: [] }),
      
      // Submission counts per assignment
      assignmentIds.length > 0
        ? supabase
            .from('assignment_grades')
            .select('assignment_id')
            .in('assignment_id', assignmentIds)
            .in('status', ['submitted'])
        : Promise.resolve({ data: [] }),
      
      // Attachments per assignment
      assignmentIds.length > 0
        ? supabase
            .from('assignment_attachments')
            .select('assignment_id, file_name, file_url, file_size, file_type')
            .in('assignment_id', assignmentIds)
        : Promise.resolve({ data: [] }),
      
      // All grades for pending count
      assignmentIds.length > 0
        ? supabase
            .from('assignment_grades')
            .select('*')
            .in('assignment_id', assignmentIds)
        : Promise.resolve({ data: [] }),
      
      // Teacher names
      teacherIds.length > 0
        ? supabase
            .from('users')
            .select('id, name')
            .in('id', teacherIds)
        : Promise.resolve({ data: [] })
    ])

    queryCount += 5 // Add 5 for the parallel queries
    onQueryCount?.(queryCount)

    // Process data efficiently
    const studentCountMap = new Map<string, number>()
    const submissionCountMap = new Map<string, number>()
    const attachmentMap = new Map<string, AttachmentFile[]>()
    const teacherMap = new Map<string, string>()

    // Process teacher names
    teachersResult.data?.forEach((teacher: any) => {
      teacherMap.set(teacher.id, teacher.name)
    })

    // Process student counts
    studentCountsResult.data?.forEach((record: any) => {
      const count = studentCountMap.get(record.classroom_id) || 0
      studentCountMap.set(record.classroom_id, count + 1)
    })

    // Process submission counts
    submissionCountsResult.data?.forEach((record: any) => {
      const count = submissionCountMap.get(record.assignment_id) || 0
      submissionCountMap.set(record.assignment_id, count + 1)
    })

    // Process attachments
    attachmentsResult.data?.forEach((attachment: any) => {
      const existing = attachmentMap.get(attachment.assignment_id) || []
      existing.push({
        name: attachment.file_name,
        url: attachment.file_url,
        size: attachment.file_size,
        type: attachment.file_type,
        uploaded: true
      })
      attachmentMap.set(attachment.assignment_id, existing)
    })

    // Process assignments with all data available
    const assignmentsWithDetails = data.map((assignment): Assignment => {
      const session = assignment.classroom_sessions
      const classroom = session?.classrooms
      const teacherName = classroom?.teacher_id ? teacherMap.get(classroom.teacher_id) : null

      return {
        ...assignment,
        assignment_categories_id: assignment.assignment_categories_id,
        classroom_name: classroom?.name || 'Unknown Classroom',
        classroom_color: classroom?.color || '#6B7280',
        teacher_name: teacherName || 'Unknown Teacher',
        session_date: session?.date,
        session_time: `${session?.start_time} - ${session?.end_time}`,
        category_name: assignment.assignment_categories?.name,
        attachments: attachmentMap.get(assignment.id) || [],
        student_count: studentCountMap.get(classroom?.id) || 0,
        submitted_count: submissionCountMap.get(assignment.id) || 0
      }
    })

    return {
      assignments: assignmentsWithDetails,
      grades: allGradesResult.data || []
    }
  } catch (error) {
    console.error('Error fetching optimized assignments:', error)
    throw error
  }
}

export function useOptimizedAssignments(academyId: string, enabled: boolean = true) {
  const queryClient = useQueryClient()
  const performance = usePerformanceMonitor({ 
    key: 'assignments-react-query',
    enabled: true 
  })

  const query = useQuery({
    queryKey: [ASSIGNMENTS_QUERY_KEY, academyId],
    queryFn: async () => {
      performance.startMeasurement()
      
      const result = await fetchOptimizedAssignments(academyId, (count) => {
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
  const invalidateAssignments = () => {
    queryClient.invalidateQueries({ queryKey: [ASSIGNMENTS_QUERY_KEY, academyId] })
  }

  // Prefetch for performance
  const prefetchAssignments = () => {
    queryClient.prefetchQuery({
      queryKey: [ASSIGNMENTS_QUERY_KEY, academyId],
      queryFn: () => fetchOptimizedAssignments(academyId),
      staleTime: 2 * 60 * 1000,
    })
  }

  return {
    ...query,
    assignments: query.data?.assignments || [],
    grades: query.data?.grades || [],
    invalidateAssignments,
    prefetchAssignments,
    performanceMetrics: performance.metrics,
    averageLoadTime: performance.getAverageLoadTime(),
    cacheHitRate: performance.getCacheHitRate()
  }
}