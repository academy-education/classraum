"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '@/lib/supabase'
import { EMPTY_COUNTS, type SetupCounts } from '@/lib/onboarding/setup-tour'

/**
 * Live "how far is this academy set up" counters.
 *
 * Five `head: true` COUNT queries — no rows come back, only the
 * Content-Range header — so this is cheap enough to re-run whenever the
 * tour needs to know if a step just got done.
 *
 * NOTE on scoping: `classroom_sessions` and `assignments` carry NO
 * academy_id of their own (see database.types.ts — sessions hang off
 * classroom_id, assignments off classroom_session_id). They must be
 * reached through an inner join, which is the same shape
 * useAssignmentsAwaitingGrades.ts uses. GettingStartedChecklist counts
 * `classroom_sessions` with no academy filter at all, so on a shared
 * database its "schedule your first session" row can tick itself from
 * another academy's data; this hook does not repeat that.
 */
export function useSetupCounts(academyId: string | undefined) {
  const [counts, setCounts] = useState<SetupCounts | null>(null)
  const inFlight = useRef(false)

  const refresh = useCallback(async () => {
    if (!academyId || inFlight.current) return
    inFlight.current = true
    try {
      const [classrooms, teachers, students, sessions, assignments] = await Promise.all([
        db.from('classrooms')
          .select('id', { count: 'exact', head: true })
          .eq('academy_id', academyId).is('deleted_at', null),
        db.from('teachers')
          .select('user_id', { count: 'exact', head: true })
          .eq('academy_id', academyId),
        db.from('students')
          .select('user_id', { count: 'exact', head: true })
          .eq('academy_id', academyId),
        db.from('classroom_sessions')
          .select('id, classrooms!inner(academy_id, deleted_at)', { count: 'exact', head: true })
          .eq('classrooms.academy_id', academyId)
          .is('deleted_at', null)
          .is('classrooms.deleted_at', null),
        db.from('assignments')
          .select(
            'id, classroom_sessions!inner(id, classrooms!inner(academy_id, deleted_at))',
            { count: 'exact', head: true },
          )
          .eq('classroom_sessions.classrooms.academy_id', academyId)
          .is('deleted_at', null)
          .is('classroom_sessions.classrooms.deleted_at', null),
      ])
      setCounts({
        classrooms: classrooms.count ?? 0,
        teachers: teachers.count ?? 0,
        students: students.count ?? 0,
        sessions: sessions.count ?? 0,
        assignments: assignments.count ?? 0,
      })
    } catch (e) {
      // A failed count must not blank the tour — keep the last good
      // reading and try again on the next trigger. Visible, though:
      // silently reading zeros would re-offer a finished step forever.
      console.error('[setup-tour] count refresh failed', e)
      setCounts(prev => prev ?? EMPTY_COUNTS)
    } finally {
      inFlight.current = false
    }
  }, [academyId])

  useEffect(() => { void refresh() }, [refresh])

  return { counts, refresh }
}
