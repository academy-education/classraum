"use client"

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface UseAssignmentsAwaitingGradesReturn {
  /**
   * Number of distinct assignments in the academy that have at least one
   * `pending` grade row. This is the actionable count — what a manager
   * would need to click into and grade. Distinct assignments rather than
   * total pending rows so the chip doesn't shout "247" when it's really
   * 8 assignments × 30 students each.
   */
  count: number
  loading: boolean
}

/**
 * Lightweight count for the dashboard's "X assignments awaiting grades"
 * chip. One query, joined through classroom_sessions → classrooms to scope
 * by academy. Cached in sessionStorage for 1 minute (same TTL as
 * useTodaysSessions) so navigating between pages doesn't refetch.
 */
export function useAssignmentsAwaitingGrades(academyId: string | null): UseAssignmentsAwaitingGradesReturn {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!academyId) return
    if (fetchedRef.current) return
    fetchedRef.current = true

    const cacheKey = `awaiting_grades_v1_${academyId}`
    const cached = sessionStorage.getItem(cacheKey)
    const cachedTs = sessionStorage.getItem(`${cacheKey}-timestamp`)
    if (cached && cachedTs && Date.now() - parseInt(cachedTs) < 60_000) {
      setCount(parseInt(cached, 10) || 0)
      return
    }

    let cancelled = false
    setLoading(true)

    ;(async () => {
      try {
        // Pull pending grade rows + the assignment_id they belong to,
        // joined through to the academy. Distinct-count client-side: cheaper
        // than a custom RPC and avoids needing a new SQL function for one
        // chip. If this becomes hot we can move it to an RPC later.
        const { data, error } = await supabase
          .from('assignment_grades')
          .select(`
            assignment_id,
            assignments!inner(
              id,
              deleted_at,
              classroom_sessions!inner(
                id,
                classrooms!inner(
                  id,
                  academy_id,
                  deleted_at
                )
              )
            )
          `)
          .eq('status', 'pending')
          .eq('assignments.classroom_sessions.classrooms.academy_id', academyId)
          .is('assignments.deleted_at', null)
          .is('assignments.classroom_sessions.classrooms.deleted_at', null)
          .limit(2000)

        if (cancelled) return
        if (error) {
          console.warn('[useAssignmentsAwaitingGrades] Query failed:', error)
          setCount(0)
          return
        }

        const distinct = new Set<string>()
        for (const row of data ?? []) {
          const id = (row as { assignment_id: string }).assignment_id
          if (id) distinct.add(id)
        }

        const next = distinct.size
        setCount(next)
        try {
          sessionStorage.setItem(cacheKey, String(next))
          sessionStorage.setItem(`${cacheKey}-timestamp`, String(Date.now()))
        } catch {
          // sessionStorage unavailable — non-fatal
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [academyId])

  return { count, loading }
}
