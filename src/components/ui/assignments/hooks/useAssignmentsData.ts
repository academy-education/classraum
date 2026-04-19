"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { clearCachesOnRefresh, markRefreshHandled } from '@/utils/cacheRefresh'
import { invalidateAssignmentsCache } from '@/components/ui/assignments-page'

// ---- Interfaces (re-exported for consumers) ----

export interface AttachmentFile {
  id?: string
  name: string
  url: string
  size: number
  type: string
  uploaded?: boolean
}

export interface Assignment {
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
  attachments?: AttachmentFile[]
  created_at: string
  updated_at: string
  student_count?: number
  submitted_count?: number
  pending_count?: number
}

export interface Session {
  id: string
  classroom_name: string
  classroom_id: string
  subject_id?: string
  date: string
  start_time: string
  end_time: string
}

export interface AssignmentGrade {
  id: string
  assignment_id: string
  student_id: string
  student_name: string
  status: 'pending' | 'submitted' | 'not submitted' | 'excused' | 'overdue'
  score?: number
  feedback?: string
  submitted_date?: string
  created_at?: string
  updated_at?: string
  attendance_status?: 'present' | 'late' | 'absent' | 'pending'
}

// Cache version constant - increment when changing data fetch logic
const CACHE_VERSION = 'v6'

type Classroom = { id: string; name: string; subject_id?: string; color?: string; teacher_id?: string; paused?: boolean }

export function useAssignmentsData(academyId: string, filterSessionId?: string) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [pendingGradesCount, setPendingGradesCount] = useState<number>(0)
  const [totalCount, setTotalCount] = useState(0)
  const [isManager, setIsManager] = useState(false)

  // PERFORMANCE: Cache classrooms data to avoid duplicate queries
  const classroomsCache = useRef<Classroom[] | null>(null)

  // Separate function to fetch classrooms for the filter dropdown
  // Uses shared cache from classrooms page for better performance
  const fetchClassrooms = useCallback(async () => {
    if (!academyId) {
      console.warn('fetchClassrooms: No academyId available yet')
      return
    }

    try {
      // Check shared cache from classrooms page first
      const cacheKey = `classrooms-${academyId}`
      const cachedData = sessionStorage.getItem(cacheKey)
      const cacheTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

      if (cachedData && cacheTimestamp) {
        const timeDiff = Date.now() - parseInt(cacheTimestamp)
        const cacheValidFor = 10 * 60 * 1000 // 10 minutes

        if (timeDiff < cacheValidFor) {
          const parsed = JSON.parse(cachedData)
          // Handle both object structure { classrooms: [...] } and plain array
          const allClassrooms = parsed.classrooms || parsed
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const activeClassrooms = allClassrooms.filter((c: any) => !c.paused)
          setClassrooms(activeClassrooms)
          // Also cache for fetchSessions
          classroomsCache.current = allClassrooms
          return
        }
      }

      // Cache miss - fetch from database
      const { data: allClassrooms, error: classroomsError } = await supabase
        .from('classrooms')
        .select('id, name, subject_id, color, teacher_id, paused')
        .eq('academy_id', academyId)
        .is('deleted_at', null)
        .order('name')

      if (classroomsError) {
        console.error('Error fetching classrooms:', classroomsError)
        setClassrooms([])
      } else if (allClassrooms && allClassrooms.length > 0) {
        // Store only active (non-paused) classrooms for the dropdown
        const activeClassrooms = allClassrooms.filter(c => !c.paused)
        setClassrooms(activeClassrooms)
        // Also cache for fetchSessions
        classroomsCache.current = allClassrooms

        // Cache the results for other pages to use
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(allClassrooms))
          sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
        } catch (cacheError) {
          console.warn('Failed to cache classrooms:', cacheError)
        }
      } else {
        setClassrooms([])
      }
    } catch (error) {
      console.error('Error in fetchClassrooms:', error)
      setClassrooms([])
    }
  }, [academyId])

  // Check if current user is a manager for this academy
  const checkUserRole = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()


      if (authError) {
        console.error('[Auth Debug] Authentication error:', authError)
        return false
      }

      if (!user) {
        console.warn('[Auth Debug] No authenticated user found')
        return false
      }

      if (!academyId) {
        console.warn('[Auth Debug] No academyId available yet')
        return false
      }

      const { data, error } = await supabase
        .from('managers')
        .select('user_id')
        .eq('academy_id', academyId)
        .eq('user_id', user.id)
        .single()


      if (error && error.code !== 'PGRST116') {
        console.error('[Auth Debug] Error checking manager role:', error)
        return false
      }

      return !!data
    } catch (error) {
      console.error('[Auth Debug] Exception in checkUserRole:', error)
      return false
    }
  }, [academyId])

  const fetchAssignments = useCallback(async (skipLoading = false) => {

    if (!academyId) {
      console.warn('fetchAssignments: No academyId available yet')
      // Keep loading state - skeleton will continue to show
      return []
    }

    try {
      if (!skipLoading) {
        setLoading(true)
      }

      // PERFORMANCE: Check cache first (valid for 2 minutes)
      const cacheKey = `assignments-${CACHE_VERSION}-${academyId}${filterSessionId ? `-session${filterSessionId}` : ''}`
      const cachedData = sessionStorage.getItem(cacheKey)
      const cacheTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

      if (cachedData && cacheTimestamp) {
        const timeDiff = Date.now() - parseInt(cacheTimestamp)
        const cacheValidFor = 2 * 60 * 1000 // 2 minutes

        if (timeDiff < cacheValidFor) {
          const parsed = JSON.parse(cachedData)
          setAssignments(parsed.assignments)
          setPendingGradesCount(parsed.pendingGradesCount || 0)
          setTotalCount(parsed.totalCount || 0)
          setInitialized(true)
          setLoading(false)

          return parsed.assignments
        }
      }

      setInitialized(true)

      // STEP 1: Fetch classrooms and assignments in parallel
      // Assignments query uses inner joins to filter by academy_id, so it doesn't need classroom results
      let assignmentsQuery = supabase
        .from('assignments')
        .select(`
          *,
          classroom_sessions!inner(
            id,
            classroom_id,
            classrooms!inner(
              id,
              academy_id
            )
          )
        `)
        .eq('classroom_sessions.classrooms.academy_id', academyId)
        .is('deleted_at', null)

      // Apply session filter if provided
      if (filterSessionId) {
        assignmentsQuery = assignmentsQuery.eq('classroom_session_id', filterSessionId)
      }

      const [classroomsResult, assignmentsResult] = await Promise.all([
        supabase
          .from('classrooms')
          .select('id, name, subject_id, color, teacher_id, paused')
          .eq('academy_id', academyId)
          .is('deleted_at', null)
          .order('name'),
        assignmentsQuery
      ])

      const allClassrooms = classroomsResult.data
      if (classroomsResult.error || !allClassrooms || allClassrooms.length === 0) {
        setAssignments([])
        setTotalCount(0)
        setLoading(false)
        return []
      }

      // Cache classrooms for fetchSessions to avoid duplicate query
      // Only write cache if not already populated (fetchClassrooms may run in parallel)
      if (!classroomsCache.current) {
        classroomsCache.current = allClassrooms
      }

      const assignmentsForSorting = assignmentsResult.data
      if (assignmentsResult.error) {
        console.error('Error fetching assignments:', {
          message: assignmentsResult.error.message,
          details: assignmentsResult.error.details,
          hint: assignmentsResult.error.hint,
          code: assignmentsResult.error.code
        })
        setAssignments([])
        setLoading(false)
        return []
      }

      if (!assignmentsForSorting || assignmentsForSorting.length === 0) {
        setAssignments([])
        setTotalCount(0)
        setLoading(false)
        return []
      }

      // Total count from the fetched assignments
      const totalCount = assignmentsForSorting.length
      setTotalCount(totalCount)

      // STEP 2: Sort in memory
      const sorted = assignmentsForSorting.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      // STEP 3: Fetch sessions and categories for the assignments
      const sessionIdsNeeded = [...new Set(sorted.map(a => a.classroom_session_id))]
      const categoryIdsNeeded = [...new Set(sorted.map(a => a.assignment_categories_id).filter(Boolean))]

      const BATCH_SIZE = 50

      const batchIds = <T,>(ids: T[]): T[][] => {
        const batches: T[][] = []
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          batches.push(ids.slice(i, i + BATCH_SIZE))
        }
        return batches
      }

      // Batch fetch sessions
      const sessionBatches = batchIds(sessionIdsNeeded)
      const sessionPromises = sessionBatches.map(batch =>
        supabase
          .from('classroom_sessions')
          .select('id, date, start_time, end_time, classroom_id')
          .in('id', batch)
      )

      // Fetch categories (usually small, no need to batch)
      const categoriesPromise = categoryIdsNeeded.length > 0
        ? supabase
            .from('assignment_categories')
            .select('id, name')
            .in('id', categoryIdsNeeded)
        : Promise.resolve({ data: [] })

      // Execute session + category fetches in parallel
      const [sessionResults, categoriesDataResult] = await Promise.all([
        Promise.all(sessionPromises),
        categoriesPromise
      ])

      const sessionsData = sessionResults.flatMap(r => r.data || [])

      // STEP 4: Get classrooms for the sessions (use cached data)
      const sessionClassroomIds = [...new Set(sessionsData.map(s => s.classroom_id).filter(Boolean))]
      const classroomsForSessions = allClassrooms.filter(c => sessionClassroomIds.includes(c.id))

      // STEP 5: Join in memory
      // Assignments already have full data from the initial query (select('*'))
      const data = sorted.map(assignment => {
        const session = sessionsData.find(s => s.id === assignment.classroom_session_id)
        const category = categoriesDataResult.data?.find(c => c.id === assignment.assignment_categories_id)
        const classroom = session ? classroomsForSessions.find(c => c.id === session.classroom_id) : null

        return {
          ...assignment,
          classroom_sessions: session ? {
            ...session,
            classrooms: classroom
          } : null,
          assignment_categories: category || null
        }
      }) || []

      if (data.length === 0) {
        setAssignments([])
        setLoading(false)
        return []
      }

      // Extract IDs for supplementary queries from all assignments
      const teacherIds = [...new Set(data.map(a => a.classroom_sessions?.classrooms?.teacher_id).filter(Boolean))]
      const assignmentIds = data.map(a => a.id)

      // STEP 9: Execute supplementary queries
      // Use RPC function to fetch aggregated grade counts (avoids row limits)

      // Helper function to fetch grade counts using RPC
      const fetchGradeCounts = async (): Promise<Map<string, { total: number; submitted: number; pending: number }>> => {

        const countsMap = new Map<string, { total: number; submitted: number; pending: number }>()

        if (assignmentIds.length === 0) {
          return countsMap
        }

        try {
          // Use RPC function that returns aggregated counts per assignment
          // Fetch in batches to overcome Supabase's 1000 row default limit
          const BATCH_SIZE = 1000
          let offset = 0
          let hasMore = true

          while (hasMore) {
            const { data, error } = await supabase
              .rpc('get_assignment_grade_counts_for_academy', { p_academy_id: academyId })
              .range(offset, offset + BATCH_SIZE - 1)

            if (error) {
              console.error('❌ [Grades] Error fetching grade counts via RPC:', error)
              break
            }


            // Build map from results - use String() for consistent key comparison
            data?.forEach((row: { assignment_id: string; total_count: number; submitted_count: number; pending_count: number }) => {
              countsMap.set(String(row.assignment_id), {
                total: Number(row.total_count) || 0,
                submitted: Number(row.submitted_count) || 0,
                pending: Number(row.pending_count) || 0
              })
            })

            // Check if we got less than BATCH_SIZE, meaning no more data
            if (!data || data.length < BATCH_SIZE) {
              hasMore = false
            } else {
              offset += BATCH_SIZE
            }
          }


          return countsMap
        } catch (err) {
          console.error('❌ [Grades] Exception fetching grade counts:', err)
          return countsMap
        }
      }

      // Helper function to fetch attachments (single query, graceful failure)
      const fetchAllAttachments = async () => {
        if (assignmentIds.length === 0) {
          return { data: [] }
        }

        try {
          const { data, error } = await supabase
            .from('assignment_attachments')
            .select('assignment_id, file_name, file_url, file_size, file_type')
            .in('assignment_id', assignmentIds)

          if (error) {
            console.warn('📎 [Attachments] Query error, skipping:', error.message)
            return { data: [] }
          }

          return { data: data || [] }
        } catch (err) {
          console.warn('📎 [Attachments] Error fetching attachments, skipping:', err)
          return { data: [] }
        }
      }

      const [
        gradeCountsMap,
        attachmentsResult,
        teachersResult
      ] = await Promise.all([
        // Grade counts using aggregated RPC
        fetchGradeCounts(),

        // Attachments using batched fetching
        fetchAllAttachments(),

        // Teacher names
        teacherIds.length > 0
          ? supabase
              .from('users')
              .select('id, name')
              .in('id', teacherIds)
          : Promise.resolve({ data: [] })
      ])

      // Calculate total pending grades for the header card
      let totalPendingGrades = 0
      gradeCountsMap.forEach(counts => {
        totalPendingGrades += counts.pending
      })

      // Create lookup maps
      const attachmentMap = new Map<string, AttachmentFile[]>()
      const teacherMap = new Map<string, string>()

      // Process teacher names
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      teachersResult.data?.forEach((teacher: any) => {
        teacherMap.set(teacher.id, teacher.name)
      })

      // Debug: Check if first assignment exists in grade counts map
      if (data.length > 0 && gradeCountsMap.size > 0) {
        const firstAssignment = data[0]
        const firstId = String(firstAssignment.id)
        void firstId
      }

      // Process attachments
      attachmentsResult.data?.forEach((attachment: {
        assignment_id: string;
        file_name: string;
        file_url: string;
        file_size: number;
        file_type: string;
      }) => {
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

      // OPTIMIZED: Process assignments with all data available
      const assignmentsWithDetails = data.map((assignment) => {
        const session = assignment.classroom_sessions
        const classroom = session?.classrooms
        const teacherName = classroom?.teacher_id ? teacherMap.get(classroom.teacher_id) : null

        // Preserve debug logging for Global Warming essay
        if (assignment.title === "Write an Essay about Global Warming" ||
            assignment.description === "Write an Essay about Global Warming" ||
            (assignment.title && assignment.title.includes("Global Warming")) ||
            (assignment.description && assignment.description.includes("Global Warming"))) {
        }

        // Use String() to ensure consistent ID comparison with maps
        const assignmentId = String(assignment.id)
        const gradeCounts = gradeCountsMap.get(assignmentId) || { total: 0, submitted: 0, pending: 0 }

        return {
          ...assignment,
          assignment_categories_id: assignment.assignment_categories_id,
          classroom_name: classroom?.name || 'Unknown Classroom',
          classroom_color: classroom?.color || '#6B7280',
          teacher_name: teacherName || 'Unknown Teacher',
          session_date: session?.date,
          session_time: `${session?.start_time} - ${session?.end_time}`,
          category_name: assignment.assignment_categories?.name,
          attachments: attachmentMap.get(assignmentId) || [],
          student_count: gradeCounts.total,
          submitted_count: gradeCounts.submitted,
          pending_count: gradeCounts.pending
        }
      })

      setAssignments(assignmentsWithDetails)

      // Set pending grades count from aggregated RPC result
      setPendingGradesCount(totalPendingGrades)

      // PERFORMANCE: Cache the results BEFORE returning
      try {
        const dataToCache = {
          assignments: assignmentsWithDetails,
          pendingGradesCount: totalPendingGrades,
          totalCount: totalCount
        }
        sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache))
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache assignments:', cacheError)
      }

      setLoading(false)
      return assignmentsWithDetails
    } catch (error: unknown) {
      console.error('Error fetching assignments:', error)
      setAssignments([])
      setLoading(false)
      return []
    }
  }, [academyId, filterSessionId])

  const fetchSessions = useCallback(async () => {
    if (!academyId) return

    try {
      // PERFORMANCE: Use cached classrooms data if available, otherwise query
      let classroomsLocal = classroomsCache.current

      if (!classroomsLocal) {
        const { data } = await supabase
          .from('classrooms')
          .select('id, name, subject_id, color, teacher_id')
          .eq('academy_id', academyId)
          .is('deleted_at', null)

        classroomsLocal = data || []
        classroomsCache.current = classroomsLocal
      }

      if (!classroomsLocal || classroomsLocal.length === 0) {
        setSessions([])
        return
      }

      const classroomIds = classroomsLocal.map(c => c.id)
      const classroomMap = Object.fromEntries(classroomsLocal.map(c => [c.id, c]))

      // Get sessions for these classrooms (including past sessions for editing existing assignments)
      const { data, error } = await supabase
        .from('classroom_sessions')
        .select('id, date, start_time, end_time, classroom_id')
        .in('classroom_id', classroomIds)
        .is('deleted_at', null)
        // Removed date filter to include past sessions needed for editing existing assignments
        .order('date', { ascending: false }) // Most recent first
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error fetching sessions:', error)
        return
      }

      const sessionsData = data?.map(session => {
        const classroom = classroomMap[session.classroom_id]
        const classroomName = classroom?.name || 'Unknown Classroom'

        return {
          id: session.id,
          classroom_name: classroomName,
          classroom_id: session.classroom_id,
          subject_id: classroom?.subject_id,
          date: session.date,
          start_time: session.start_time,
          end_time: session.end_time
        };
      }) || []

      setSessions(sessionsData)
    } catch (error: unknown) {
      console.error('Error fetching sessions:', error)
    }
  }, [academyId])

  // Convenience function to refresh all data in parallel
  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchAssignments(),
      fetchClassrooms(),
      fetchSessions(),
      checkUserRole().then(setIsManager)
    ])
  }, [fetchAssignments, fetchClassrooms, fetchSessions, checkUserRole])

  // OPTIMIZED: Consolidated useEffect - runs all fetches once on mount and when dependencies change
  useEffect(() => {
    if (!academyId) return


    // Check if page was refreshed - if so, clear caches to force fresh data
    const wasRefreshed = clearCachesOnRefresh(academyId)
    if (wasRefreshed) {
      markRefreshHandled()
      // Also explicitly invalidate assignment cache
      invalidateAssignmentsCache(academyId)
    }

    // Check cache SYNCHRONOUSLY before setting loading state
    // Cache key only includes server-side filters (filterSessionId) for better cache hit rate
    const cacheKey = `assignments-${CACHE_VERSION}-${academyId}${filterSessionId ? `-session${filterSessionId}` : ''}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cacheTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cacheTimestamp) {
      const timeDiff = Date.now() - parseInt(cacheTimestamp)
      const cacheValidFor = 2 * 60 * 1000 // 2 minutes

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        setAssignments(parsed.assignments)
        setPendingGradesCount(parsed.pendingGradesCount || 0)
        setTotalCount(parsed.totalCount || 0)
        setLoading(false)
        // Still load secondary data in background
        fetchClassrooms()
        fetchSessions()
        checkUserRole().then(setIsManager)
        return // Skip fetchAssignments - we have cached data
      }
    }

    // Cache miss - show loading and fetch all data
    if (!simpleTabDetection.isTrueTabReturn()) {
      setLoading(true)
    }

    // Run all fetches in parallel for better performance
    Promise.all([
      fetchAssignments(),
      fetchClassrooms(),
      fetchSessions(),
      checkUserRole().then(setIsManager)
    ]).then(() => {
    }).catch((error) => {
      console.error('❌ Error loading data:', error)
    })
  }, [academyId, filterSessionId, fetchAssignments, fetchClassrooms, fetchSessions, checkUserRole])

  return {
    assignments, setAssignments,
    sessions, setSessions,
    classrooms, setClassrooms,
    loading, setLoading,
    initialized, setInitialized,
    pendingGradesCount, setPendingGradesCount,
    totalCount, setTotalCount,
    isManager,
    fetchAssignments,
    fetchClassrooms,
    fetchSessions,
    checkUserRole,
    refreshData,
  }
}
