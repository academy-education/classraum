"use client"

import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

export interface Assignment {
  id: string
  title: string
  description: string | null
  due_date: string | null
  /** Per-student status from assignment_grades.status. Null when the student has no grade row yet. */
  status: 'pending' | 'submitted' | 'not submitted' | 'overdue' | 'excused' | null
  created_at: string
  classroom: {
    id: string
    name: string
    color: string
  }
  submissions?: {
    id: string
    status: 'pending' | 'submitted' | 'graded'
    submitted_at: string | null
  }[]
  grades?: {
    id: string
    score: number
    max_score: number
  }[]
}

interface UseMobileAssignmentsReturn {
  assignments: Assignment[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useMobileAssignments = (user: User | null | any, studentId: string | null): UseMobileAssignmentsReturn => {
  // Initialize with sessionStorage data synchronously to prevent flash
  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    if (typeof window === 'undefined' || !studentId) return []

    try {
      const sessionCacheKey = `mobile-assignments-${studentId}`
      const sessionCachedData = sessionStorage.getItem(sessionCacheKey)
      const sessionCacheTimestamp = sessionStorage.getItem(`${sessionCacheKey}-timestamp`)

      if (sessionCachedData && sessionCacheTimestamp) {
        const timeDiff = Date.now() - parseInt(sessionCacheTimestamp)
        const cacheValidFor = 5 * 60 * 1000 // 5 minutes

        if (timeDiff < cacheValidFor) {
          const parsed = JSON.parse(sessionCachedData)
          return parsed
        }
      }
    } catch (error) {
      console.warn('[useMobileAssignments] Failed to read sessionStorage:', error)
    }

    return []
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAssignments = useCallback(async () => {
    if (!user || !studentId) return

    // Check sessionStorage first for persistence across page reloads
    const sessionCacheKey = `mobile-assignments-${studentId}`
    const sessionCachedData = sessionStorage.getItem(sessionCacheKey)
    const sessionCacheTimestamp = sessionStorage.getItem(`${sessionCacheKey}-timestamp`)

    if (sessionCachedData && sessionCacheTimestamp) {
      const timeDiff = Date.now() - parseInt(sessionCacheTimestamp)
      const cacheValidFor = 5 * 60 * 1000 // 5 minutes

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(sessionCachedData)
        setAssignments(parsed)
        setLoading(false)
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      // First get the student's enrolled classroom IDs
      const { data: studentData, error: studentError } = await db
        .from('students')
        .select('classroom_students(classroom_id)')
        .eq('user_id', user.id)
        .single()

      if (studentError) {
        console.error('[useMobileAssignments] Failed to load enrolled classrooms:', studentError)
        throw studentError
      }

      const classroomIds = studentData?.classroom_students?.map((cs: any) => cs.classroom_id) || []

      if (classroomIds.length === 0) {
        setAssignments([])
        setLoading(false)
        return
      }

      const { data, error: fetchError } = await db
        .from('assignments')
        .select(`
          id,
          title,
          description,
          due_date,
          created_at,
          classroom_sessions!inner(
            classroom_id,
            classrooms!inner(
              id,
              name,
              color
            )
          )
        `)
        .in('classroom_sessions.classroom_id', classroomIds)
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('[useMobileAssignments] Failed to load assignments:', fetchError)
        throw fetchError
      }

      // Per-student status lives on assignment_grades, not on assignments.
      const assignmentIds = (data || []).map((item: any) => item.id)
      const statusMap: Record<string, Assignment['status']> = {}

      if (assignmentIds.length > 0) {
        const { data: gradeRows, error: gradeError } = await db
          .from('assignment_grades')
          .select('assignment_id, status')
          .eq('student_id', studentId)
          .in('assignment_id', assignmentIds)

        if (gradeError) {
          console.error('[useMobileAssignments] Failed to load assignment statuses:', gradeError)
        } else {
          for (const row of gradeRows || []) {
            statusMap[(row as any).assignment_id] = (row as any).status
          }
        }
      }

      // Transform the data to match the Assignment type
      const assignmentsData: Assignment[] = (data || []).map((item: any) => {
        const session = Array.isArray(item.classroom_sessions) ? item.classroom_sessions[0] : item.classroom_sessions
        const classroom = Array.isArray(session?.classrooms) ? session.classrooms[0] : session?.classrooms

        return {
          id: item.id,
          title: item.title,
          description: item.description,
          due_date: item.due_date,
          status: statusMap[item.id] ?? null,
          created_at: item.created_at,
          classroom,
          submissions: item.submissions,
          grades: item.grades
        }
      })

      // Cache in sessionStorage for persistence across page reloads
      try {
        const sessionCacheKey = `mobile-assignments-${studentId}`
        sessionStorage.setItem(sessionCacheKey, JSON.stringify(assignmentsData))
        sessionStorage.setItem(`${sessionCacheKey}-timestamp`, Date.now().toString())
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache mobile assignments data in sessionStorage:', cacheError)
      }

      setAssignments(assignmentsData)
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching mobile assignments:', err)
      }
      setError('Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }, [user, studentId])

  // Immediate check for navigation suppression with cached data
  useEffect(() => {
    if (!user || !studentId) return

    // Check sessionStorage first for persistence across page reloads
    const sessionCacheKey = `mobile-assignments-${studentId}`
    const sessionCachedData = sessionStorage.getItem(sessionCacheKey)
    const sessionCacheTimestamp = sessionStorage.getItem(`${sessionCacheKey}-timestamp`)

    if (sessionCachedData && sessionCacheTimestamp && loading) {
      const timeDiff = Date.now() - parseInt(sessionCacheTimestamp)
      const cacheValidFor = 5 * 60 * 1000 // 5 minutes

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(sessionCachedData)
        setAssignments(parsed)
        setLoading(false)
        return
      }
    }

    fetchAssignments()
  }, [fetchAssignments, user, studentId, loading])

  return {
    assignments,
    loading,
    error,
    refetch: fetchAssignments
  }
}
