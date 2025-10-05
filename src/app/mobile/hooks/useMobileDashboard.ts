"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

export interface StudentSession {
  id: string
  date: string
  status: 'scheduled' | 'completed' | 'cancelled'
  classroom: {
    id: string
    name: string
    color: string
  }
  attendance?: {
    status: 'present' | 'absent' | 'late' | 'excused'
  }[]
}

export interface UpcomingAssignment {
  id: string
  title: string
  description: string | null
  due_date: string | null
  classroom: {
    id: string
    name: string
    color: string
  }
}

export interface RecentGrade {
  id: string
  score: number | null
  assignment: {
    id: string
    title: string
  }
  classroom: {
    id: string
    name: string
    color: string
  }
}

export interface Invoice {
  id: string
  amount: number
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  dueDate: string
  description: string
  academyName: string
}

export interface DashboardData {
  upcomingSessions: StudentSession[]
  todaysSessions: StudentSession[]
  upcomingAssignments: UpcomingAssignment[]
  recentGrades: RecentGrade[]
  recentInvoices: Invoice[]
  pendingAssignmentsCount: number
}

interface UseMobileDashboardReturn {
  data: DashboardData
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const initialDashboardData: DashboardData = {
  upcomingSessions: [],
  todaysSessions: [],
  upcomingAssignments: [],
  recentGrades: [],
  recentInvoices: [],
  pendingAssignmentsCount: 0
}

export const useMobileDashboard = (user: User | null | any, studentId: string | null): UseMobileDashboardReturn => {
  // Initialize with sessionStorage data synchronously to prevent flash
  const [data, setData] = useState<DashboardData>(() => {
    if (typeof window === 'undefined') return initialDashboardData

    // Try to get student ID from prop or user object
    const effectiveStudentId = studentId || (user?.role === 'student' ? user?.userId : null)
    if (!effectiveStudentId) return initialDashboardData

    try {
      const sessionCacheKey = `mobile-dashboard-${effectiveStudentId}`
      const sessionCachedData = sessionStorage.getItem(sessionCacheKey)
      const sessionCacheTimestamp = sessionStorage.getItem(`${sessionCacheKey}-timestamp`)

      if (sessionCachedData && sessionCacheTimestamp) {
        const timeDiff = Date.now() - parseInt(sessionCacheTimestamp)
        const cacheValidFor = 5 * 60 * 1000 // 5 minutes

        if (timeDiff < cacheValidFor) {
          const parsed = JSON.parse(sessionCachedData)
          // Only use cache if it has the invoices field
          if (parsed.recentInvoices !== undefined) {
            console.log('✅ [useMobileDashboard] Loaded cached data on init for student:', effectiveStudentId)
            return parsed
          } else {
            // Invalid cache - clear it immediately
            sessionStorage.removeItem(sessionCacheKey)
            sessionStorage.removeItem(`${sessionCacheKey}-timestamp`)
          }
        }
      }
    } catch (error) {
      console.warn('[useMobileDashboard] Cache read error:', error)
    }

    return initialDashboardData
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    if (!user || !studentId) {
      return
    }

    // Check cache first to avoid unnecessary API calls
    const sessionCacheKey = `mobile-dashboard-${studentId}`
    const sessionCachedData = sessionStorage.getItem(sessionCacheKey)
    const sessionCacheTimestamp = sessionStorage.getItem(`${sessionCacheKey}-timestamp`)

    if (sessionCachedData && sessionCacheTimestamp) {
      const timeDiff = Date.now() - parseInt(sessionCacheTimestamp)
      const cacheValidFor = 5 * 60 * 1000 // 5 minutes

      if (timeDiff < cacheValidFor) {
        try {
          const parsed = JSON.parse(sessionCachedData)
          if (parsed.recentInvoices !== undefined) {
            console.log('✅ [useMobileDashboard] Using cached data, skipping fetch')
            setData(parsed)
            return
          }
        } catch (error) {
          console.warn('[useMobileDashboard] Cache parse error:', error)
        }
      }
    }

    setLoading(true)
    setError(null)

    try {
      const today = new Date().toISOString().split('T')[0]
      const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // First get the student's enrolled classroom IDs
      const { data: studentData } = await supabase
        .from('students')
        .select('classroom_students(classroom_id)')
        .eq('user_id', user.userId)
        .single()

      const classroomIds = studentData?.classroom_students?.map((cs: any) => cs.classroom_id) || []

      if (classroomIds.length === 0) {
        setData(initialDashboardData)
        setLoading(false)
        return
      }

      // Fetch all data in parallel
      const [upcomingSessionsResult, todaysSessionsResult, upcomingAssignmentsResult, recentGradesResult, recentInvoicesResult, pendingGradesResult] = await Promise.all([
        // Upcoming sessions (next 7 days, excluding today)
        supabase
          .from('classroom_sessions')
          .select(`
            id,
            date,
            status,
            classroom_id,
            classrooms!inner(
              id,
              name,
              color
            )
          `)
          .in('classroom_id', classroomIds)
          .gt('date', today)
          .lte('date', sevenDaysLater)
          .is('deleted_at', null)
          .order('date', { ascending: true })
          .limit(5),

        // Today's sessions
        supabase
          .from('classroom_sessions')
          .select(`
            id,
            date,
            status,
            classroom_id,
            classrooms!inner(
              id,
              name,
              color
            )
          `)
          .in('classroom_id', classroomIds)
          .eq('date', today)
          .is('deleted_at', null)
          .order('date', { ascending: true }),

        // Upcoming assignments - get via classroom_session_id
        supabase
          .from('assignments')
          .select(`
            id,
            title,
            description,
            due_date,
            classroom_session_id
          `)
          .gte('due_date', today)
          .is('deleted_at', null)
          .order('due_date', { ascending: true })
          .limit(100),

        // Recent grades (last 14 days)
        supabase
          .from('assignment_grades')
          .select('id, score, created_at, assignment_id')
          .eq('student_id', studentId)
          .gte('created_at', fourteenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(5),

        // Recent invoices
        supabase
          .from('invoices')
          .select(`
            id,
            final_amount,
            status,
            due_date,
            academy_id
          `)
          .eq('student_id', studentId)
          .order('due_date', { ascending: false })
          .limit(5),

        // Pending assignment grades (for pending assignments count - only 'pending' status)
        supabase
          .from('assignment_grades')
          .select('id, assignment_id, status')
          .eq('student_id', studentId)
          .eq('status', 'pending')
      ])

      // Get unique academy IDs from invoices
      const invoicesData = recentInvoicesResult.data || []
      const academyIds = [...new Set(invoicesData.map((inv: any) => inv.academy_id).filter(Boolean))]

      // Fetch academy names if we have any
      let academiesMap: Record<string, string> = {}
      if (academyIds.length > 0) {
        const { data: academiesData } = await supabase
          .from('academies')
          .select('id, name')
          .in('id', academyIds)

        academiesMap = (academiesData || []).reduce((acc: Record<string, string>, academy: any) => {
          acc[academy.id] = academy.name
          return acc
        }, {})
      }

      // Process assignments and grades data
      const assignmentsData = upcomingAssignmentsResult.data || []
      const gradesData = recentGradesResult.data || []

      // Get classroom_session details for assignments to find classroom_id
      const assignmentSessionIds = assignmentsData.map((a: any) => a.classroom_session_id).filter(Boolean)
      let sessionClassroomMap: Record<string, string> = {}

      if (assignmentSessionIds.length > 0) {
        const { data: sessionDetails } = await supabase
          .from('classroom_sessions')
          .select('id, classroom_id')
          .in('id', assignmentSessionIds)

        sessionClassroomMap = (sessionDetails || []).reduce((acc: Record<string, string>, session: any) => {
          acc[session.id] = session.classroom_id
          return acc
        }, {})
      }

      // Filter assignments to only those in student's classrooms
      const filteredAssignments = assignmentsData.filter((a: any) => {
        const classroomId = sessionClassroomMap[a.classroom_session_id]
        return classroomId && classroomIds.includes(classroomId)
      }).slice(0, 5)

      // Fetch assignment details for grades
      const gradeAssignmentIds = gradesData.map((g: any) => g.assignment_id).filter(Boolean)
      let assignmentsMap: Record<string, any> = {}

      if (gradeAssignmentIds.length > 0) {
        const { data: assignmentDetails } = await supabase
          .from('assignments')
          .select('id, title, classroom_session_id')
          .in('id', gradeAssignmentIds)

        assignmentsMap = (assignmentDetails || []).reduce((acc: Record<string, any>, assignment: any) => {
          acc[assignment.id] = assignment
          return acc
        }, {})
      }

      // Get unique classroom IDs from both assignments and grades
      const assignmentClassroomIds = filteredAssignments
        .map((a: any) => sessionClassroomMap[a.classroom_session_id])
        .filter(Boolean)
      const gradeClassroomIds = Object.values(assignmentsMap)
        .map((a: any) => sessionClassroomMap[a.classroom_session_id])
        .filter(Boolean)

      const detailClassroomIds = [...new Set([...assignmentClassroomIds, ...gradeClassroomIds])]

      let classroomsMap: Record<string, any> = {}
      if (detailClassroomIds.length > 0) {
        const { data: classroomsData } = await supabase
          .from('classrooms')
          .select('id, name, color')
          .in('id', detailClassroomIds)

        classroomsMap = (classroomsData || []).reduce((acc: Record<string, any>, classroom: any) => {
          acc[classroom.id] = { id: classroom.id, name: classroom.name, color: classroom.color }
          return acc
        }, {})
      }

      const newData: DashboardData = {
        upcomingSessions: (upcomingSessionsResult.data || []).map((item: any) => ({
          ...item,
          classroom: Array.isArray(item.classrooms) ? item.classrooms[0] : item.classrooms
        })),
        todaysSessions: (todaysSessionsResult.data || []).map((item: any) => ({
          ...item,
          classroom: Array.isArray(item.classrooms) ? item.classrooms[0] : item.classrooms
        })),
        upcomingAssignments: filteredAssignments.map((item: any) => {
          const classroomId = sessionClassroomMap[item.classroom_session_id]
          return {
            ...item,
            classroom: classroomsMap[classroomId] || { id: '', name: 'Unknown', color: '#gray' }
          }
        }),
        recentGrades: gradesData.map((item: any) => {
          const assignment = assignmentsMap[item.assignment_id] || { id: item.assignment_id, title: 'Unknown', classroom_session_id: null }
          const classroomId = sessionClassroomMap[assignment.classroom_session_id]
          const classroom = classroomsMap[classroomId] || { id: '', name: 'Unknown', color: '#gray' }
          return {
            ...item,
            assignment: assignment,
            classroom: classroom
          }
        }),
        recentInvoices: invoicesData.map((item: any) => ({
          id: item.id,
          amount: item.final_amount,
          status: item.status,
          dueDate: item.due_date,
          description: item.id, // We'll use the ID to generate invoice number in the UI
          academyName: academiesMap[item.academy_id] || 'Academy'
        })),
        pendingAssignmentsCount: pendingGradesResult.data?.length || 0
      }

      // Cache in sessionStorage for persistence across page reloads
      try {
        const sessionCacheKey = `mobile-dashboard-${studentId}`
        sessionStorage.setItem(sessionCacheKey, JSON.stringify(newData))
        sessionStorage.setItem(`${sessionCacheKey}-timestamp`, Date.now().toString())
      } catch (cacheError) {
        console.warn('[useMobileDashboard] Failed to cache data:', cacheError)
      }

      setData(newData)
    } catch (err) {
      console.error('[useMobileDashboard] Error fetching data:', err)
      setError('Failed to load dashboard data')
      // Set empty data on error to prevent undefined issues
      setData(initialDashboardData)
    } finally {
      setLoading(false)
    }
  }, [user, studentId])

  // Fetch on mount and when dependencies change
  // fetchDashboardData already includes user and studentId in its dependencies
  useEffect(() => {
    if (!user || !studentId) return
    fetchDashboardData()
  }, [fetchDashboardData])

  return {
    data,
    loading,
    error,
    refetch: fetchDashboardData
  }
}
