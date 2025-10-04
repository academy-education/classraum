"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

export interface Grade {
  id: string
  score: number
  max_score: number
  feedback: string | null
  created_at: string
  assignment: {
    id: string
    title: string
    description: string | null
    due_date: string | null
  }
  classroom: {
    id: string
    name: string
    color: string
  }
}

interface UseMobileGradesReturn {
  grades: Grade[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useMobileGrades = (user: User | null | any, studentId: string | null): UseMobileGradesReturn => {
  // Initialize with sessionStorage data synchronously to prevent flash
  const [grades, setGrades] = useState<Grade[]>(() => {
    if (typeof window === 'undefined' || !studentId) return []

    try {
      const sessionCacheKey = `mobile-grades-${studentId}`
      const sessionCachedData = sessionStorage.getItem(sessionCacheKey)
      const sessionCacheTimestamp = sessionStorage.getItem(`${sessionCacheKey}-timestamp`)

      if (sessionCachedData && sessionCacheTimestamp) {
        const timeDiff = Date.now() - parseInt(sessionCacheTimestamp)
        const cacheValidFor = 5 * 60 * 1000 // 5 minutes

        if (timeDiff < cacheValidFor) {
          const parsed = JSON.parse(sessionCachedData)
          console.log('✅ [useMobileGrades] Using sessionStorage cached data on init')
          return parsed
        }
      }
    } catch (error) {
      console.warn('[useMobileGrades] Failed to read sessionStorage:', error)
    }

    return []
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGrades = useCallback(async () => {
    if (!user || !studentId) return

    // Check sessionStorage first for persistence across page reloads
    const sessionCacheKey = `mobile-grades-${studentId}`
    const sessionCachedData = sessionStorage.getItem(sessionCacheKey)
    const sessionCacheTimestamp = sessionStorage.getItem(`${sessionCacheKey}-timestamp`)

    if (sessionCachedData && sessionCacheTimestamp) {
      const timeDiff = Date.now() - parseInt(sessionCacheTimestamp)
      const cacheValidFor = 5 * 60 * 1000 // 5 minutes

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(sessionCachedData)
        console.log('✅ [useMobileGrades] Using sessionStorage cached data')
        setGrades(parsed)
        setLoading(false)
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('assignment_grades')
        .select(`
          id,
          score,
          max_score,
          feedback,
          created_at,
          assignment:assignments!inner(
            id,
            title,
            description,
            due_date,
            classroom:classrooms!inner(
              id,
              name,
              color
            )
          )
        `)
        .eq('student_id', studentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      // Transform the data to match the Grade type
      const gradesData: Grade[] = (data || []).map((item: any) => ({
        id: item.id,
        score: item.score,
        max_score: item.max_score,
        feedback: item.feedback,
        created_at: item.created_at,
        assignment: Array.isArray(item.assignment) ? {
          ...item.assignment[0],
          classroom: Array.isArray(item.assignment[0]?.classroom) ? item.assignment[0].classroom[0] : item.assignment[0]?.classroom
        } : item.assignment,
        classroom: Array.isArray(item.assignment) && item.assignment[0]?.classroom
          ? (Array.isArray(item.assignment[0].classroom) ? item.assignment[0].classroom[0] : item.assignment[0].classroom)
          : undefined
      }))

      // Cache in sessionStorage for persistence across page reloads
      try {
        const sessionCacheKey = `mobile-grades-${studentId}`
        sessionStorage.setItem(sessionCacheKey, JSON.stringify(gradesData))
        sessionStorage.setItem(`${sessionCacheKey}-timestamp`, Date.now().toString())
        console.log('[Performance] Mobile grades data cached in sessionStorage')
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache mobile grades data in sessionStorage:', cacheError)
      }

      setGrades(gradesData)
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching mobile grades:', err)
      }
      setError('Failed to load grades')
    } finally {
      setLoading(false)
    }
  }, [user, studentId])

  // Immediate check for navigation suppression with cached data
  useEffect(() => {
    if (!user || !studentId) return

    // Check sessionStorage first for persistence across page reloads
    const sessionCacheKey = `mobile-grades-${studentId}`
    const sessionCachedData = sessionStorage.getItem(sessionCacheKey)
    const sessionCacheTimestamp = sessionStorage.getItem(`${sessionCacheKey}-timestamp`)

    if (sessionCachedData && sessionCacheTimestamp && loading) {
      const timeDiff = Date.now() - parseInt(sessionCacheTimestamp)
      const cacheValidFor = 5 * 60 * 1000 // 5 minutes

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(sessionCachedData)
        console.log('✅ [useMobileGrades] Using sessionStorage cached data during loading')
        setGrades(parsed)
        setLoading(false)
        return
      }
    }

    fetchGrades()
  }, [fetchGrades, user, studentId, loading])

  return {
    grades,
    loading,
    error,
    refetch: fetchGrades
  }
}
