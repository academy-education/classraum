"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { queryCache, CACHE_TTL } from '@/lib/queryCache'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTodaysSessions = useCallback(async () => {
    if (!academyId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const cacheKey = `today_sessions_${academyId}_${new Date().toDateString()}`
      const cached = queryCache.get(cacheKey)
      
      if (cached && Array.isArray(cached)) {
        setSessions(cached)
        setLoading(false)
        return
      }

      const today = new Date().toISOString().split('T')[0]
      
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
        // Log error for development only
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching today\'s sessions:', sessionsError)
        }
        setError('Failed to load today\'s sessions')
        return
      }

      const formattedSessions: TodaySession[] = (todaySessions || []).map(session => ({
        id: session.id,
        date: session.date,
        start_time: session.start_time,
        end_time: session.end_time,
        classroom_name: (session.classroom as any)?.name || 'Unknown Classroom',
        classroom_color: (session.classroom as any)?.color || '#6B7280',
        status: session.status || 'scheduled',
        location: session.location || 'offline'
      }))

      queryCache.set(cacheKey, formattedSessions, CACHE_TTL.SHORT)
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
  }, [academyId])

  useEffect(() => {
    fetchTodaysSessions()
  }, [fetchTodaysSessions])

  return {
    sessions,
    loading,
    error,
    refetch: fetchTodaysSessions
  }
}