import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { queryCache, CACHE_TTL } from '@/lib/queryCache'

interface Session {
  id: string
  classroom_id: string
  classroom_name?: string
  classroom_color?: string
  teacher_name?: string
  substitute_teacher_name?: string
  status: 'scheduled' | 'completed' | 'cancelled'
  date: string
  start_time: string
  end_time: string
  location: 'offline' | 'online'
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
  color?: string
  teacher_id: string
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
    if (!academyId) return

    setLoading(true)
    try {
      const cacheKey = `sessions_${academyId}_${filterClassroomId || 'all'}_${filterDate || 'all'}`
      let cachedSessions = queryCache.get<Session[]>(cacheKey)

      if (!cachedSessions) {
        // Build query with filters
        let query = supabase
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

        // Apply filters
        if (filterClassroomId) {
          query = query.eq('classroom_id', filterClassroomId)
        }
        if (filterDate) {
          query = query.eq('date', filterDate)
        }

        const { data, error } = await query

        if (error) throw error

        // Get all unique teacher IDs (including substitutes)
        const teacherIds = new Set<string>()
        ;(data || []).forEach((session: any) => {
          if (session.classrooms?.teacher_id) {
            teacherIds.add(session.classrooms.teacher_id)
          }
          if (session.substitute_teacher) {
            teacherIds.add(session.substitute_teacher)
          }
        })

        // Fetch all teacher names in one query
        const { data: teachersData } = teacherIds.size > 0 ? await supabase
          .from('users')
          .select('id, name')
          .in('id', Array.from(teacherIds)) : { data: [] }

        const teacherMap = new Map(
          (teachersData || []).map(teacher => [teacher.id, teacher.name])
        )

        // Get assignment counts for all sessions in one query
        const sessionIds = (data || []).map(session => session.id)
        const { data: assignmentsData } = sessionIds.length > 0 ? await supabase
          .from('assignments')
          .select('classroom_session_id')
          .in('classroom_session_id', sessionIds)
          .is('deleted_at', null) : { data: [] }

        const assignmentCounts = new Map<string, number>()
        ;(assignmentsData || []).forEach((assignment: any) => {
          const sessionId = assignment.classroom_session_id
          assignmentCounts.set(sessionId, (assignmentCounts.get(sessionId) || 0) + 1)
        })

        // Process sessions with all related data
        const processedSessions = (data || []).map((session: any) => ({
          ...session,
          classroom_name: session.classrooms?.name || 'Unknown Classroom',
          classroom_color: session.classrooms?.color,
          teacher_name: teacherMap.get(session.classrooms?.teacher_id) || 'Unknown Teacher',
          substitute_teacher_name: session.substitute_teacher ? 
            teacherMap.get(session.substitute_teacher) : undefined,
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
    if (!academyId) return

    try {
      const cacheKey = `classrooms_${academyId}`
      let cachedClassrooms = queryCache.get<Classroom[]>(cacheKey)

      if (!cachedClassrooms) {
        const { data, error } = await supabase
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
    if (!academyId) return

    try {
      const cacheKey = `teachers_${academyId}`
      let cachedTeachers = queryCache.get<Teacher[]>(cacheKey)

      if (!cachedTeachers) {
        const { data, error } = await supabase
          .from('teachers')
          .select(`
            id,
            user_id,
            users!inner(
              name
            )
          `)
          .eq('academy_id', academyId)
          .eq('active', true)

        if (error) throw error

        const processedTeachers = (data || []).map((teacher: any) => ({
          id: teacher.id,
          user_id: teacher.user_id,
          name: teacher.users?.name || 'Unknown Teacher'
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
  const createSession = useCallback(async (sessionData: Partial<Session>) => {
    try {
      const { data, error } = await supabase
        .from('classroom_sessions')
        .insert([sessionData])
        .select()

      if (error) throw error

      // Invalidate cache
      queryCache.invalidatePattern(`sessions_${academyId}`)
      
      // Refresh data
      await fetchSessions()
      
      return data[0]
    } catch (error) {
      console.error('Error creating session:', error)
      throw error
    }
  }, [academyId, fetchSessions])

  // Update session
  const updateSession = useCallback(async (sessionId: string, updates: Partial<Session>) => {
    try {
      const { data, error } = await supabase
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
      const { error } = await supabase
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