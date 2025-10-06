"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { queryCache, CACHE_TTL } from '@/lib/queryCache'
import { useStableCallback } from '@/hooks/useStableCallback'

export interface TodaySession {
  id: string
  date: string
  start_time: string
  end_time: string
  classroom_name: string
  classroom_color: string
  status: string
  location: string
}

interface UseTodaysSessionsReturn {
  sessions: TodaySession[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useTodaysSessions = (academyId: string | null): UseTodaysSessionsReturn => {
  const [sessions, setSessions] = useState<TodaySession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTodaysSessions = useStableCallback(async () => {
    if (!academyId || academyId === '' || academyId === 'undefined') {
      console.warn('fetchTodaysSessions: No academyId available yet')
      return
    }

    const cacheKey = `today_sessions_${academyId}_${new Date().toDateString()}`

    // Check sessionStorage first for persistence
    const sessionCachedData = sessionStorage.getItem(cacheKey)
    const sessionCacheTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (sessionCachedData && sessionCacheTimestamp) {
      const timeDiff = Date.now() - parseInt(sessionCacheTimestamp)
      const cacheValidFor = 60000 // 1 minute (SHORT TTL)

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(sessionCachedData)
        console.log('✅ [useTodaysSessions] Using sessionStorage cached data')
        setSessions(parsed)
        setLoading(false)
        return
      }
    }

    // Fallback to queryCache
    const cached = queryCache.get(cacheKey)

    if (cached && Array.isArray(cached)) {
      console.log('✅ [useTodaysSessions] Using queryCache data')
      setSessions(cached)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {

      // Use local timezone instead of UTC to get the correct date
      const now = new Date()
      const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
        .toISOString()
        .split('T')[0]

      const { data: todaySessions, error: sessionsError } = await supabase
        .from('classroom_sessions')
        .select(`
          id,
          date,
          start_time,
          end_time,
          status,
          location,
          classroom:classrooms!inner(
            id,
            name,
            color,
            academy_id
          )
        `)
        .eq('date', today)
        .eq('classroom.academy_id', academyId)
        .order('start_time', { ascending: true })
        .limit(10)

      if (sessionsError) {
        console.error('[useTodaysSessions] Supabase error:', sessionsError)
        setError('Failed to load today\'s sessions')
        return
      }

      const formattedSessions: TodaySession[] = (todaySessions || []).map(session => ({
        id: session.id,
        date: session.date,
        start_time: session.start_time,
        end_time: session.end_time,
        classroom_name: (session.classroom as { name?: string })?.name || 'Unknown Classroom',
        classroom_color: (session.classroom as { color?: string })?.color || '#6B7280',
        status: session.status || 'scheduled',
        location: session.location || 'offline'
      }))

      queryCache.set(cacheKey, formattedSessions, CACHE_TTL.SHORT)

      // Also cache in sessionStorage for persistence
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(formattedSessions))
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
        console.log('[Performance] Today\'s sessions cached in sessionStorage')
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache sessions in sessionStorage:', cacheError)
      }

      setSessions(formattedSessions)
      
    } catch (err) {
      // Log error for development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching today\'s sessions:', err)
      }
      setError('Failed to load today\'s sessions')
    } finally {
      setLoading(false)
    }
  })

  // Immediate check for navigation suppression with cached data
  useEffect(() => {
    if (!academyId || academyId === '' || academyId === 'undefined') {
      return
    }

    const cacheKey = `today_sessions_${academyId}_${new Date().toDateString()}`

    // Check sessionStorage first for persistence
    const sessionCachedData = sessionStorage.getItem(cacheKey)
    const sessionCacheTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (sessionCachedData && sessionCacheTimestamp && loading) {
      const timeDiff = Date.now() - parseInt(sessionCacheTimestamp)
      const cacheValidFor = 60000 // 1 minute

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(sessionCachedData)
        console.log('✅ [useTodaysSessions] Using sessionStorage cached data during loading')
        setSessions(parsed)
        setLoading(false)
        return
      }
    }

    // Fallback to queryCache
    const cached = queryCache.get(cacheKey)
    if (cached && Array.isArray(cached) && loading) {
      console.log('✅ [useTodaysSessions] Using queryCache data during loading')
      setSessions(cached)
      setLoading(false)
      return
    }

    fetchTodaysSessions()
  }, [academyId])

  return {
    sessions,
    loading,
    error,
    refetch: fetchTodaysSessions
  }
}