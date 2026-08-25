import { useState, useCallback, useEffect } from 'react'
import { db } from '@/lib/supabase'
import { queryCache, CACHE_TTL } from '@/lib/queryCache'
import { triggerSessionCreatedNotifications } from '@/lib/notification-triggers'

// Both unions mirror classroom_sessions_status_check / _location_check.
const SESSION_STATUSES = ['scheduled', 'completed', 'cancelled'] as const
type SessionStatus = (typeof SESSION_STATUSES)[number]

const SESSION_LOCATIONS = ['offline', 'online'] as const
type SessionLocation = (typeof SESSION_LOCATIONS)[number]

function toSessionStatus(v: string): SessionStatus {
  if ((SESSION_STATUSES as readonly string[]).includes(v)) {
    return v as SessionStatus
  }
  console.warn(`Unexpected session status from DB: ${v}`)
  return 'scheduled'
}

function toSessionLocation(v: string): SessionLocation {
  if ((SESSION_LOCATIONS as readonly string[]).includes(v)) {
    return v as SessionLocation
  }
  console.warn(`Unexpected session location from DB: ${v}`)
  return 'offline'
}

// Columns required to insert a classroom_session. Session (below) also carries
// joined display fields (classroom_name, teacher_name, ...) which are not
// columns, so Partial<Session> is not a valid insert payload.
export interface NewSession {
  classroom_id: string
  status: SessionStatus
  date: string
  start_time: string
  end_time: string
  location: SessionLocation
  notes?: string | null
  substitute_teacher?: string | null
  room_number?: string | null
}

interface Session {
  id: string
  classroom_id: string
  classroom_name?: string
  classroom_color?: string
  teacher_name?: string
  substitute_teacher_name?: string
  status: SessionStatus
  date: string
  start_time: string
  end_time: string
  location: SessionLocation
  notes?: string
  substitute_teacher?: string
  created_at: string
  updated_at: string
  student_count?: number
  assignment_count?: number
}

interface Classroom {
  id: string
  name: string
  // Both nullable in the DB: a classroom may have no colour and no teacher.
  color: string | null
  teacher_id: string | null
}

interface Teacher {
  id: string
  name: string
  user_id: string
}

export function useSessionData(academyId: string, filterClassroomId?: string, filterDate?: string) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch sessions with optimized queries (avoiding N+1)
  const fetchSessions = useCallback(async () => {
    if (!academyId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const cacheKey = `sessions_${academyId}_${filterClassroomId || 'all'}_${filterDate || 'all'}`
      let cachedSessions = queryCache.get<Session[]>(cacheKey)

      if (!cachedSessions) {
        /* PostgREST caps a single response at ~1000 rows, so this MUST
           paginate. Unpaginated, the demo academy's 1462 sessions came
           back as 1000 — and because the sort is date ASCENDING, the
           rows dropped were the LATEST ones: the page ended on
           2026-08-04 while "today" was 2026-08-25, so the list and the
           calendar showed only history and no current or upcoming
           class at all. The same defect was fixed on the assignments
           page (ae9d96c) and this surface was missed.

           Order deterministically — date, start_time, then id as a
           tiebreaker — so pages never skip or duplicate a row across
           .range() calls. Sessions share a date and a start_time all
           the time, which is exactly when a non-unique sort silently
           reorders between requests. */
        const SESSIONS_PAGE_SIZE = 1000
        type PgError = { message?: string; details?: string; hint?: string; code?: string }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fetchAllSessions = async (): Promise<{ data: any[] | null; error: PgError | null }> => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const all: any[] = []
          let from = 0
          // Safety bound so a pathological loop cannot run forever.
          for (let page = 0; page < 100; page++) {
            let query = db
              .from('classroom_sessions')
              .select(`
                *,
                classrooms!inner(
                  id,
                  name,
                  color,
                  teacher_id,
                  academy_id
                )
              `)
              .eq('classrooms.academy_id', academyId)
              .order('date', { ascending: true })
              .order('start_time', { ascending: true })
              .order('id', { ascending: true })
              .range(from, from + SESSIONS_PAGE_SIZE - 1)

            // Apply filters
            if (filterClassroomId) {
              query = query.eq('classroom_id', filterClassroomId)
            }
            if (filterDate) {
              query = query.eq('date', filterDate)
            }

            const { data, error } = await query
            if (error) return { data: null, error }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rows = (data as any[] | null) || []
            all.push(...rows)
            if (rows.length < SESSIONS_PAGE_SIZE) break
            from += SESSIONS_PAGE_SIZE
          }
          return { data: all, error: null }
        }

        const { data, error } = await fetchAllSessions()

        if (error) throw error

        // Get all unique teacher IDs (including substitutes)
        const teacherIds = new Set<string>()
        ;(data || []).forEach((session) => {
          if (session.classrooms?.teacher_id) {
            teacherIds.add(session.classrooms.teacher_id)
          }
          if (session.substitute_teacher) {
            teacherIds.add(session.substitute_teacher)
          }
        })

        // Fetch all teacher names in one query
        const { data: teachersData } = teacherIds.size > 0 ? await db
          .from('users')
          .select('id, name')
          .in('id', Array.from(teacherIds)) : { data: [] }

        const teacherMap = new Map(
          (teachersData || []).map(teacher => [teacher.id, teacher.name])
        )

        // Get assignment counts for all sessions in one query
        const sessionIds = (data || []).map(session => session.id)
        const { data: assignmentsData } = sessionIds.length > 0 ? await db
          .from('assignments')
          .select('classroom_session_id')
          .in('classroom_session_id', sessionIds)
          .is('deleted_at', null) : { data: [] }

        const assignmentCounts = new Map<string, number>()
        ;(assignmentsData || []).forEach((assignment: { classroom_session_id: string }) => {
          const sessionId = assignment.classroom_session_id
          assignmentCounts.set(sessionId, (assignmentCounts.get(sessionId) || 0) + 1)
        })

        // Process sessions with all related data
        const processedSessions = (data || []).map((session): Session => ({
          ...session,
          classroom_name: session.classrooms?.name || 'Unknown Classroom',
          classroom_color: session.classrooms?.color ?? undefined,
          // classrooms.teacher_id is nullable, so an unassigned classroom has
          // no teacher to look up.
          teacher_name: (session.classrooms?.teacher_id
            ? teacherMap.get(session.classrooms.teacher_id)
            : undefined) || 'Unknown Teacher',
          substitute_teacher_name: session.substitute_teacher ?
            teacherMap.get(session.substitute_teacher) : undefined,
          status: toSessionStatus(session.status),
          location: toSessionLocation(session.location),
          notes: session.notes ?? undefined,
          substitute_teacher: session.substitute_teacher ?? undefined,
          created_at: session.created_at ?? '',
          updated_at: session.updated_at ?? '',
          assignment_count: assignmentCounts.get(session.id) || 0
        }))

        cachedSessions = processedSessions
        queryCache.set(cacheKey, cachedSessions, CACHE_TTL.SHORT) // 1 minute cache
      }

      setSessions(cachedSessions)
    } catch (error) {
      console.error('Error fetching sessions:', error)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [academyId, filterClassroomId, filterDate])

  // Fetch classrooms
  const fetchClassrooms = useCallback(async () => {
    if (!academyId) {
      setClassrooms([])
      return
    }

    try {
      const cacheKey = `classrooms_${academyId}`
      let cachedClassrooms = queryCache.get<Classroom[]>(cacheKey)

      if (!cachedClassrooms) {
        const { data, error } = await db
          .from('classrooms')
          .select('id, name, color, teacher_id')
          .eq('academy_id', academyId)
          .is('deleted_at', null)
          .order('name')

        if (error) throw error

        cachedClassrooms = data || []
        queryCache.set(cacheKey, cachedClassrooms, CACHE_TTL.MEDIUM) // 5 minute cache
      }

      setClassrooms(cachedClassrooms)
    } catch (error) {
      console.error('Error fetching classrooms:', error)
      setClassrooms([])
    }
  }, [academyId])

  // Fetch teachers
  const fetchTeachers = useCallback(async () => {
    if (!academyId) {
      setTeachers([])
      return
    }

    try {
      const cacheKey = `teachers_${academyId}`
      let cachedTeachers = queryCache.get<Teacher[]>(cacheKey)

      if (!cachedTeachers) {
        // `teachers` has no `id` column — its primary key is user_id.
        // Selecting it errored, the throw below emptied the list, and the
        // teacher picker on the sessions page was permanently blank with
        // no way to assign anyone.
        //
        // user_id is also the correct identifier regardless:
        // classrooms.teacher_id is a foreign key to users(id).
        const { data, error } = await db
          .from('teachers')
          .select(`
            user_id,
            users!inner(
              name
            )
          `)
          .eq('academy_id', academyId)
          .eq('active', true)

        if (error) throw error

        const processedTeachers = (data || []).map((teacher: Record<string, unknown>) => ({
          id: teacher.user_id as string,
          user_id: teacher.user_id as string,
          name: ((teacher.users as Record<string, unknown>)?.name as string) || 'Unknown Teacher'
        }))

        cachedTeachers = processedTeachers
        queryCache.set(cacheKey, cachedTeachers, CACHE_TTL.MEDIUM) // 5 minute cache
      }

      setTeachers(cachedTeachers)
    } catch (error) {
      console.error('Error fetching teachers:', error)
      setTeachers([])
    }
  }, [academyId])

  // Create session
  const createSession = useCallback(async (sessionData: NewSession) => {
    try {
      const { data, error } = await db
        .from('classroom_sessions')
        .insert([sessionData])
        .select()

      if (error) throw error

      const newSession = data[0]

      // Send session creation notification
      try {
        await triggerSessionCreatedNotifications(newSession.id)
      } catch (notificationError) {
        console.error('Error sending session creation notification:', notificationError)
        // Don't fail the session creation if notification fails
      }

      // Invalidate cache
      queryCache.invalidatePattern(`sessions_${academyId}`)

      // Refresh data
      await fetchSessions()

      return newSession
    } catch (error) {
      console.error('Error creating session:', error)
      throw error
    }
  }, [academyId, fetchSessions])

  // Update session
  const updateSession = useCallback(async (sessionId: string, updates: Partial<Session>) => {
    try {
      const { data, error } = await db
        .from('classroom_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select()

      if (error) throw error

      // Invalidate cache
      queryCache.invalidatePattern(`sessions_${academyId}`)
      
      // Refresh data
      await fetchSessions()
      
      return data[0]
    } catch (error) {
      console.error('Error updating session:', error)
      throw error
    }
  }, [academyId, fetchSessions])

  // Delete session
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      const { error } = await db
        .from('classroom_sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error

      // Invalidate cache
      queryCache.invalidatePattern(`sessions_${academyId}`)
      
      // Refresh data
      await fetchSessions()
    } catch (error) {
      console.error('Error deleting session:', error)
      throw error
    }
  }, [academyId, fetchSessions])

  // Initial data fetch
  useEffect(() => {
    if (academyId) {
      Promise.all([
        fetchSessions(),
        fetchClassrooms(),
        fetchTeachers()
      ])
    }
  }, [academyId, fetchSessions, fetchClassrooms, fetchTeachers])

  // Calculate session stats
  const sessionStats = {
    total: sessions.length,
    today: sessions.filter(session => 
      session.date === new Date().toISOString().split('T')[0]
    ).length,
    thisWeek: sessions.filter(session => {
      const sessionDate = new Date(session.date)
      const today = new Date()
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()))
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      return sessionDate >= startOfWeek && sessionDate <= endOfWeek
    }).length,
    scheduled: sessions.filter(session => session.status === 'scheduled').length,
    completed: sessions.filter(session => session.status === 'completed').length,
    cancelled: sessions.filter(session => session.status === 'cancelled').length
  }

  return {
    // Data
    sessions,
    classrooms,
    teachers,
    sessionStats,
    
    // Loading state
    loading,
    
    // Actions
    fetchSessions,
    createSession,
    updateSession,
    deleteSession
  }
}