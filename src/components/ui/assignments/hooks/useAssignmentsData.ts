"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { db } from '@/lib/supabase'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { clearCachesOnRefresh, markRefreshHandled } from '@/utils/cacheRefresh'
// Import directly from the shared cache module rather than through the
// 2,000-line assignments-page re-export. Behavior identical; bundle is
// not.
import { invalidateAssignmentsCache } from '@/lib/cache'

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
  // Joined data from the db query in fetchAssignments — present on
  // every assignment when fetched, used by the page-level classroom filter.
  classroom_sessions?: {
    id: string
    classroom_id: string
    // Selected by the STEP 1 embed so the page never has to re-fetch
    // sessions to render a date/time.
    date?: string
    start_time?: string
    end_time?: string
    classrooms?: {
      id: string
      academy_id: string
    }
  }
}

export interface Session {
  id: string
  classroom_name: string
  classroom_id: string
  // classrooms.subject_id is nullable.
  subject_id?: string | null
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
  attendance_status?: 'present' | 'late' | 'absent' | 'pending' | 'excused'
}

// Cache version constant - increment when changing data fetch logic
const CACHE_VERSION = 'v6'

// Mirrors public.classrooms: every column except id/name is nullable.
type Classroom = {
  id: string
  name: string
  subject_id?: string | null
  color?: string | null
  teacher_id?: string | null
  paused?: boolean | null
}

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

  // ONE classrooms fetch per mount, shared by fetchAssignments,
  // fetchClassrooms and fetchSessions.
  //
  // `classroomsCache` above cannot dedupe them: all three run inside the
  // same Promise.all, so every one of them sees an empty ref and issues
  // its own query — three identical round trips on every page load. The
  // PROMISE has to be shared, not the resolved value.
  type ClassroomsLoad = { data: Classroom[] | null; error: unknown }
  const classroomsPromise = useRef<Promise<ClassroomsLoad> | null>(null)
  const classroomsPromiseAcademy = useRef<string | null>(null)

  const loadClassrooms = useCallback((): Promise<ClassroomsLoad> => {
    // A different academy invalidates the shared promise.
    if (classroomsPromiseAcademy.current !== academyId) {
      classroomsPromise.current = null
      classroomsCache.current = null
      classroomsPromiseAcademy.current = academyId
    }

    if (!classroomsPromise.current) {
      classroomsPromise.current = (async (): Promise<ClassroomsLoad> => {
        const { data, error } = await db
          .from('classrooms')
          .select('id, name, subject_id, color, teacher_id, paused')
          .eq('academy_id', academyId)
          .is('deleted_at', null)
          .order('name')

        if (!error && data && data.length > 0) {
          classroomsCache.current = data
          // Keep feeding the cache the classrooms page reads.
          try {
            const cacheKey = `classrooms-${academyId}`
            sessionStorage.setItem(cacheKey, JSON.stringify(data))
            sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
          } catch (cacheError) {
            console.warn('Failed to cache classrooms:', cacheError)
          }
        }
        return { data, error }
      })()
    }
    return classroomsPromise.current
  }, [academyId])

  // Force the next loadClassrooms() to hit the database again.
  const invalidateClassrooms = useCallback(() => {
    classroomsPromise.current = null
    classroomsCache.current = null
  }, [])

  // Separate function to fetch classrooms for the filter dropdown
  const fetchClassrooms = useCallback(async () => {
    if (!academyId) {
      console.warn('fetchClassrooms: No academyId available yet')
      return
    }

    try {
      const { data: allClassrooms, error: classroomsError } = await loadClassrooms()

      if (classroomsError) {
        console.error('Error fetching classrooms:', classroomsError)
        setClassrooms([])
      } else if (allClassrooms && allClassrooms.length > 0) {
        // Store only active (non-paused) classrooms for the dropdown
        setClassrooms(allClassrooms.filter(c => !c.paused))
      } else {
        setClassrooms([])
      }
    } catch (error) {
      console.error('Error in fetchClassrooms:', error)
      setClassrooms([])
    }
  }, [academyId, loadClassrooms])

  // Check if current user is a manager for this academy
  const checkUserRole = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await db.auth.getUser()


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

      const { data, error } = await db
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
      // Assignments query uses inner joins to filter by academy_id, so it doesn't need classroom results.
      //
      // PostgREST caps a single response at ~1000 rows, so this MUST paginate:
      // academies with >1000 assignments were silently missing the overflow.
      // Order deterministically (created_at, then id as a tiebreaker) so
      // pages never skip or duplicate a row across .range() calls.
      const ASSIGNMENTS_PAGE_SIZE = 1000
      type PgError = { message?: string; details?: string; hint?: string; code?: string }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchAllAssignments = async (): Promise<{ data: any[] | null; error: PgError | null }> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const all: any[] = []
        let from = 0
        // Safety bound so a pathological loop can't run forever.
        for (let page = 0; page < 100; page++) {
          let query = db
            .from('assignments')
            .select(`
              *,
              classroom_sessions!inner(
                id,
                date,
                start_time,
                end_time,
                classroom_id,
                classrooms!inner(
                  id,
                  academy_id
                )
              )
            `)
            .eq('classroom_sessions.classrooms.academy_id', academyId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .order('id', { ascending: true })
            .range(from, from + ASSIGNMENTS_PAGE_SIZE - 1)

          // Apply session filter if provided
          if (filterSessionId) {
            query = query.eq('classroom_session_id', filterSessionId)
          }

          const { data, error } = await query
          if (error) return { data: null, error }
          const rows = (data as Assignment[] | null) || []
          all.push(...rows)
          if (rows.length < ASSIGNMENTS_PAGE_SIZE) break
          from += ASSIGNMENTS_PAGE_SIZE
        }
        return { data: all, error: null }
      }

      const [classroomsResult, assignmentsResult] = await Promise.all([
        // Shared with fetchClassrooms/fetchSessions — see loadClassrooms.
        loadClassrooms(),
        fetchAllAssignments()
      ])

      const allClassrooms = classroomsResult.data
      if (classroomsResult.error || !allClassrooms || allClassrooms.length === 0) {
        setAssignments([])
        setTotalCount(0)
        setLoading(false)
        return []
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

      // STEP 3: Fetch categories for the assignments.
      //
      // Session date/start_time/end_time used to be re-fetched here in ~30
      // parallel `classroom_sessions .in(...50 ids)` calls — ~6.9s of DB
      // work for the largest academy. The STEP 1 query already INNER JOINs
      // classroom_sessions (that join is what scopes the query to the
      // academy); it simply was not selecting those three columns. It is
      // now, so every assignment already carries its session and the
      // batching is gone.
      const categoryIdsNeeded = [...new Set(sorted.map(a => a.assignment_categories_id).filter(Boolean))]

      const categoriesDataResult = categoryIdsNeeded.length > 0
        ? await db
            .from('assignment_categories')
            .select('id, name')
            .in('id', categoryIdsNeeded)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        : { data: [] as any[] }

      // STEP 4: Join in memory.
      // Assignments already have full data from the initial query
      // (select('*') + the classroom_sessions embed). The embedded
      // `classrooms` is only {id, academy_id} (it exists to drive the
      // academy filter), so it is replaced by the full classroom row —
      // exactly as before.
      const data = sorted.map(assignment => {
        const session = assignment.classroom_sessions
        const category = categoriesDataResult.data?.find(c => c.id === assignment.assignment_categories_id)
        const classroom = session ? allClassrooms.find(c => c.id === session.classroom_id) : null

        return {
          ...assignment,
          classroom_sessions: session ? {
            id: session.id,
            date: session.date,
            start_time: session.start_time,
            end_time: session.end_time,
            classroom_id: session.classroom_id,
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
            const { data, error } = await db
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
      //
      // This used to send `.in('assignment_id', [<every assignment id>])` —
      // a ~55 KB URL for the largest academy, against a table that holds
      // single-digit row counts, to get back `[]`. It now filters through
      // the same inner-join chain the assignments query uses, so the URL is
      // a constant ~200 bytes. Rows for assignments that are not on screen
      // (soft-deleted, or filtered out by filterSessionId) may come back;
      // they land in a lookup map that is only ever read by assignment id,
      // so nothing rendered changes.
      const fetchAllAttachments = async () => {
        if (assignmentIds.length === 0) {
          return { data: [] }
        }

        try {
          const PAGE = 1000
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const all: any[] = []
          for (let page = 0; page < 100; page++) {
            const { data, error } = await db
              .from('assignment_attachments')
              .select(`
                assignment_id,
                file_name,
                file_url,
                file_size,
                file_type,
                assignments!inner(
                  classroom_sessions!inner(
                    classrooms!inner(academy_id)
                  )
                )
              `)
              .eq('assignments.classroom_sessions.classrooms.academy_id', academyId)
              .order('assignment_id', { ascending: true })
              .order('file_url', { ascending: true })
              .range(page * PAGE, page * PAGE + PAGE - 1)

            if (error) {
              console.warn('📎 [Attachments] Query error, skipping:', error.message)
              return { data: [] }
            }

            const rows = data || []
            all.push(...rows)
            if (rows.length < PAGE) break
          }

          return { data: all }
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
          ? db
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
  }, [academyId, filterSessionId, loadClassrooms])

  // The session dropdown for the create/edit modal.
  //
  // CORRECTNESS: this used to be a single unpaginated query. PostgREST
  // caps a response at 1,000 rows, so an academy with more sessions than
  // that silently lost the overflow and those sessions could not be
  // picked in the modal. fetchAssignments was fixed for exactly this and
  // the fix was never applied here. Ordering must be deterministic down
  // to a unique tiebreaker (id) or .range() pages can skip/duplicate rows.
  const SESSIONS_PAGE_SIZE = 1000
  const fetchSessions = useCallback(async (): Promise<Session[]> => {
    if (!academyId) return []

    try {
      // PERFORMANCE: Use cached classrooms data if available, otherwise query
      let classroomsLocal = classroomsCache.current

      if (!classroomsLocal) {
        // Shared with fetchAssignments/fetchClassrooms — see loadClassrooms.
        const { data } = await loadClassrooms()
        classroomsLocal = data || []
        classroomsCache.current = classroomsLocal
      }

      if (!classroomsLocal || classroomsLocal.length === 0) {
        setSessions([])
        return []
      }

      const classroomIds = classroomsLocal.map(c => c.id)
      const classroomMap = Object.fromEntries(classroomsLocal.map(c => [c.id, c]))

      // Get sessions for these classrooms (including past sessions for editing existing assignments)
      type SessionRow = { id: string; date: string; start_time: string; end_time: string; classroom_id: string }
      const rows: SessionRow[] = []
      let from = 0
      // Safety bound so a pathological loop can't run forever.
      for (let page = 0; page < 100; page++) {
        const { data, error } = await db
          .from('classroom_sessions')
          .select('id, date, start_time, end_time, classroom_id')
          .in('classroom_id', classroomIds)
          .is('deleted_at', null)
          // Removed date filter to include past sessions needed for editing existing assignments
          .order('date', { ascending: false }) // Most recent first
          .order('start_time', { ascending: true })
          .order('id', { ascending: true }) // unique tiebreaker — see above
          .range(from, from + SESSIONS_PAGE_SIZE - 1)

        if (error) {
          console.error('Error fetching sessions:', error)
          return []
        }

        const batch = (data as SessionRow[] | null) || []
        rows.push(...batch)
        if (batch.length < SESSIONS_PAGE_SIZE) break
        from += SESSIONS_PAGE_SIZE
      }

      const sessionsData = rows.map(session => {
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
      })

      setSessions(sessionsData)
      return sessionsData
    } catch (error: unknown) {
      console.error('Error fetching sessions:', error)
      return []
    }
  }, [academyId, loadClassrooms])

  // LAZY: the session list is only ever read by the create/edit modal, so
  // it is no longer fetched on page load. Callers that are about to open
  // that modal await this; it dedupes concurrent callers and returns the
  // list directly (React state is not readable synchronously here).
  const sessionsPromise = useRef<Promise<Session[]> | null>(null)
  const sessionsPromiseAcademy = useRef<string | null>(null)

  const ensureSessions = useCallback((): Promise<Session[]> => {
    if (sessionsPromiseAcademy.current !== academyId) {
      sessionsPromise.current = null
      sessionsPromiseAcademy.current = academyId
    }
    if (!sessionsPromise.current) {
      sessionsPromise.current = fetchSessions().catch(err => {
        // Do not memoize a failure — the next open should retry.
        sessionsPromise.current = null
        console.error('Error fetching sessions:', err)
        return [] as Session[]
      })
    }
    return sessionsPromise.current
  }, [academyId, fetchSessions])

  // Convenience function to refresh all data in parallel
  const refreshData = useCallback(async () => {
    // An explicit refresh must re-read classrooms, not replay the shared
    // promise from the previous load.
    invalidateClassrooms()
    // Sessions stay lazy: only re-fetch them if something has already
    // asked for them (i.e. the modal has been opened this visit).
    const refreshSessions = sessionsPromise.current !== null
    if (refreshSessions) sessionsPromise.current = null
    await Promise.all([
      fetchAssignments(),
      fetchClassrooms(),
      refreshSessions ? ensureSessions() : Promise.resolve([]),
      checkUserRole().then(setIsManager)
    ])
  }, [invalidateClassrooms, fetchAssignments, fetchClassrooms, ensureSessions, checkUserRole])

  // OPTIMIZED: Consolidated useEffect - runs all fetches once on mount and when dependencies change
  useEffect(() => {
    if (!academyId) return


    // Check if page was refreshed - if so, clear caches to force fresh data
    const wasRefreshed = clearCachesOnRefresh(academyId)
    if (wasRefreshed) {
      markRefreshHandled()
      // Also explicitly invalidate assignment cache
      invalidateAssignmentsCache(academyId)
      invalidateClassrooms()
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
        // Still load secondary data in background.
        // NOT sessions — see ensureSessions: the modal fetches them.
        fetchClassrooms()
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
      // NOT fetchSessions — see ensureSessions: the modal fetches them.
      checkUserRole().then(setIsManager)
    ]).then(() => {
    }).catch((error) => {
      console.error('❌ Error loading data:', error)
    })
  }, [academyId, filterSessionId, fetchAssignments, fetchClassrooms, checkUserRole, invalidateClassrooms])

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
    ensureSessions,
    checkUserRole,
    refreshData,
  }
}
