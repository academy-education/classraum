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
  score: number
  max_score: number
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
  recentInvoices: []
}

export const useMobileDashboard = (user: User | null | any, studentId: string | null): UseMobileDashboardReturn => {
  // Initialize with sessionStorage data synchronously to prevent flash
  const [data, setData] = useState<DashboardData>(() => {
    if (typeof window === 'undefined') return initialDashboardData
    if (!studentId) return initialDashboardData

    try {
      const sessionCacheKey = `mobile-dashboard-${studentId}`
      const sessionCachedData = sessionStorage.getItem(sessionCacheKey)
      const sessionCacheTimestamp = sessionStorage.getItem(`${sessionCacheKey}-timestamp`)

      if (sessionCachedData && sessionCacheTimestamp) {
        const timeDiff = Date.now() - parseInt(sessionCacheTimestamp)
        const cacheValidFor = 5 * 60 * 1000 // 5 minutes

        if (timeDiff < cacheValidFor) {
          const parsed = JSON.parse(sessionCachedData)
          // Only use cache if it has the invoices field
          if (parsed.recentInvoices !== undefined) {
            console.log('🔍 [INVOICE DEBUG - INIT] Using valid cache with invoices:', parsed.recentInvoices.length)
            return parsed
          } else {
            // Invalid cache - clear it immediately
            console.log('🔍 [INVOICE DEBUG - INIT] Invalid cache detected, clearing')
            sessionStorage.removeItem(sessionCacheKey)
            sessionStorage.removeItem(`${sessionCacheKey}-timestamp`)
          }
        }
      }
    } catch (error) {
      console.warn('[useMobileDashboard] Cache read error:', error)
    }

    console.log('🔍 [INVOICE DEBUG - INIT] Returning initial empty data, will fetch fresh')
    return initialDashboardData
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    if (!user || !studentId) {
      return
    }

    console.log('🔍 [INVOICE DEBUG] fetchDashboardData called, will fetch fresh data')

    setLoading(true)
    setError(null)

    try {
      console.log('🔍 [INVOICE DEBUG] Starting fetch with studentId:', studentId)

      const today = new Date().toISOString().split('T')[0]
      const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // First get the student's enrolled classroom IDs
      const { data: studentData } = await supabase
        .from('students')
        .select('classroom_students(classroom_id)')
        .eq('user_id', user.id)
        .single()

      const classroomIds = studentData?.classroom_students?.map((cs: any) => cs.classroom_id) || []

      if (classroomIds.length === 0) {
        setData(initialDashboardData)
        setLoading(false)
        return
      }

      console.log('🔍 [INVOICE DEBUG] About to fetch invoices for studentId:', studentId)

      // Fetch all data in parallel
      console.log('🔍 [INVOICE DEBUG] Starting Promise.all with classroomIds:', classroomIds)
      const [upcomingSessionsResult, todaysSessionsResult, upcomingAssignmentsResult, recentGradesResult, recentInvoicesResult] = await Promise.all([
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

        // Upcoming assignments
        supabase
          .from('assignments')
          .select(`
            id,
            title,
            description,
            due_date,
            classroom_id,
            classrooms!inner(
              id,
              name,
              color
            )
          `)
          .in('classroom_id', classroomIds)
          .gte('due_date', today)
          .is('deleted_at', null)
          .order('due_date', { ascending: true })
          .limit(5),

        // Recent grades (last 14 days)
        supabase
          .from('grades')
          .select(`
            id,
            score,
            max_score,
            created_at,
            assignments!inner(
              id,
              title,
              classroom_id,
              classrooms!inner(
                id,
                name,
                color
              )
            )
          `)
          .eq('user_id', user.id)
          .gte('created_at', fourteenDaysAgo)
          .is('deleted_at', null)
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
          .limit(5)
      ])

      const newData: DashboardData = {
        upcomingSessions: (upcomingSessionsResult.data || []).map((item: any) => ({
          ...item,
          classroom: Array.isArray(item.classrooms) ? item.classrooms[0] : item.classrooms
        })),
        todaysSessions: (todaysSessionsResult.data || []).map((item: any) => ({
          ...item,
          classroom: Array.isArray(item.classrooms) ? item.classrooms[0] : item.classrooms
        })),
        upcomingAssignments: (upcomingAssignmentsResult.data || []).map((item: any) => ({
          ...item,
          classroom: Array.isArray(item.classrooms) ? item.classrooms[0] : item.classrooms
        })),
        recentGrades: (recentGradesResult.data || []).map((item: any) => ({
          ...item,
          assignment: item.assignments,
          classroom: Array.isArray(item.assignments?.classrooms) ? item.assignments.classrooms[0] : item.assignments?.classrooms
        })),
        recentInvoices: (recentInvoicesResult.data || []).map((item: any) => ({
          id: item.id,
          amount: item.final_amount,
          status: item.status,
          dueDate: item.due_date,
          description: 'Tuition Payment',
          academyName: 'Academy'
        }))
      }

      console.log('🔍 [INVOICE DEBUG] Invoice fetch result:', {
        error: recentInvoicesResult.error,
        count: recentInvoicesResult.data?.length || 0,
        rawData: recentInvoicesResult.data,
        mappedData: newData.recentInvoices
      })

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
  useEffect(() => {
    if (!user || !studentId) return
    fetchDashboardData()
  }, [fetchDashboardData, user, studentId])

  return {
    data,
    loading,
    error,
    refetch: fetchDashboardData
  }
}
