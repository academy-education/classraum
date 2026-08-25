"use client"

import { useCallback, useEffect, useState } from 'react'
import { db } from '@/lib/supabase'

/**
 * The academy's camp programs, for the "this is a camp classroom"
 * control on the classroom create/edit form.
 *
 * Reads `camp_programs` directly: migration 082 left the camp tables
 * client-READABLE for academy teachers and managers (only writes go
 * through the service role), so a select here is enough and does not
 * need an API route.
 *
 * An academy with no camp programs gets an empty list, and the caller
 * hides the control entirely — the toggle should not exist for a school
 * that has never bought a camp.
 */

export interface CampProgramOption {
  id: string
  name: string
  test_family: string
  starts_on: string | null
  ends_on: string | null
  student_cap: number
}

// The pure seat/window arithmetic lives in @/lib/camp/cap so it can be
// unit-tested without dragging in the supabase client (a jest import
// failure there collects zero tests and still looks green elsewhere).
export { isProgramOpen, campCapOverflow } from '@/lib/camp/cap'

export function useCampPrograms(academyId: string | undefined) {
  const [programs, setPrograms] = useState<CampProgramOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    if (!academyId) { setPrograms([]); return }

    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await db
          .from('camp_programs')
          .select('id, name, test_family, starts_on, ends_on, student_cap')
          .eq('academy_id', academyId)
          .is('deleted_at', null)
          .order('starts_on', { ascending: false })
        if (!alive) return
        // A read failure means "no camps" for UI purposes: the control
        // disappears rather than offering a list we could not load.
        setPrograms(error ? [] : (data ?? []))
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [academyId])

  /**
   * How many camp assignments already exist for a classroom.
   *
   * This is the guard on re-pointing a classroom at a different camp.
   * `camp_assignments` rows carry their OWN `camp_program_id` and the
   * quota was already charged to that program, so moving the classroom
   * would leave the work and the classroom in different camps with no
   * way to reconcile the spend. Once any assignment exists, the camp is
   * fixed for the life of the classroom.
   */
  const countCampAssignments = useCallback(async (classroomId: string): Promise<number> => {
    const { count, error } = await db
      .from('camp_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('classroom_id', classroomId)
      .is('deleted_at', null)
    // Fail CLOSED: if we cannot tell whether work exists, treat it as
    // existing and lock the control. A wrongly-locked toggle is an
    // annoyance; a wrongly-unlocked one orphans paid-for assignments.
    if (error) return 1
    return count ?? 0
  }, [])

  /**
   * The distinct students already enrolled in a program's classrooms,
   * optionally ignoring one classroom (the one being edited, whose
   * roster is about to be replaced).
   *
   * `student_cap` is what the school paid for, so it has to hold at the
   * PROGRAM level — counting one classroom at a time would let three
   * classrooms of ten sit inside a cap of fifteen.
   */
  const enrolledInProgram = useCallback(async (
    programId: string,
    excludeClassroomId?: string,
  ): Promise<Set<string>> => {
    const { data: rooms, error: roomErr } = await db
      .from('classrooms')
      .select('id')
      .eq('camp_program_id', programId)
      .is('deleted_at', null)
    if (roomErr || !rooms?.length) return new Set()

    const ids = rooms.map(r => r.id).filter(id => id !== excludeClassroomId)
    if (!ids.length) return new Set()

    const { data: rows, error } = await db
      .from('classroom_students')
      .select('student_id')
      .in('classroom_id', ids)
    if (error) return new Set()
    return new Set((rows ?? []).map(r => r.student_id as string))
  }, [])

  return { programs, loading, countCampAssignments, enrolledInProgram }
}
