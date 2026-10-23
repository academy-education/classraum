import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import { canViewProgramResults } from '@/lib/camp/access'
import { summarizeWork, type CampStudentWorkSummary, type CampWorkItem } from '@/lib/camp/metrics'
import { loadProgramRooms } from '@/lib/camp/program-data'

/**
 * GET /api/camp/students?programId=…
 *
 * Program-wide student list for the camp Students tab — one row per
 * (classroom, student) pair across ALL of the program's classrooms:
 *   - completion: done camp sessions / assignments in that classroom
 *   - avgScorePct: the student's graded-answer accuracy in that
 *     classroom (same accuracyByStudent aggregation the drill-down's
 *     cohort.studentAccuracy uses, so the list and the detail modal
 *     always agree)
 *   - lastActive: latest completed camp session in that classroom
 *   - states: done / in-progress / not-started assignment counts, for
 *     the status chip
 *   - work: overdue / late / missing / not started / completed late /
 *     due today, from src/lib/camp/metrics.ts (the Overdue chip, the
 *     filter chips and the overdue sort all read this)
 *
 * A student enrolled in two classrooms of the program appears twice, one
 * row per classroom — the drill-down (GET /api/camp/student) is scoped
 * to a classroom, so each row carries the classroomId it opens with.
 *
 * Built on loadClassroomCampData (src/lib/camp/reports.ts) per
 * classroom (loaded in parallel by loadProgramRooms), the same loader the
 * overview/dashboard/report paths use, so every number here matches
 * those surfaces by construction.
 *
 * Read-only; academy managers and camp teachers of THIS program.
 */

export const dynamic = 'force-dynamic'

interface StudentRow {
  studentId: string
  name: string | null
  email: string | null
  classroomId: string
  classroomName: string
  completion: { done: number; total: number }
  avgScorePct: number | null
  lastActive: string | null
  states: { done: number; inProgress: number; notStarted: number }
  /** Overdue / late / not started / completed late, by the one definition in src/lib/camp/metrics.ts. */
  work: CampStudentWorkSummary
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const programId = req.nextUrl.searchParams.get('programId')
  if (!programId) return NextResponse.json({ error: 'programId required' }, { status: 400 })

  const { data: program } = await dbAdmin
    .from('camp_programs')
    .select('id, academy_id')
    .eq('id', programId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!program) return NextResponse.json({ error: 'camp program not found' }, { status: 404 })

  // Study results: academy managers and CAMP TEACHERS OF THIS PROGRAM
  // only (owner rule 2026-10-07, src/lib/camp/access.ts). This used to
  // admit every teacher of the academy — a regular academy teacher, or
  // the teacher of a different camp, could read every camp student's
  // scores here.
  if (!(await canViewProgramResults(user.id, program))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: classrooms, error: classroomsError } = await dbAdmin
    .from('classrooms')
    .select('id, name')
    .eq('camp_program_id', programId)
    // Same academy only, as /api/camp/program does: a classroom in ANOTHER academy pointed at this program can only
    // exist through the pre-122 write gap, and its roster is not this camp's.
    .eq('academy_id', program.academy_id)
    .is('deleted_at', null)
  if (classroomsError) {
    return NextResponse.json({ error: classroomsError.message }, { status: 500 })
  }

  const students: StudentRow[] = []
  const now = new Date()
  const loadedRooms = await loadProgramRooms(
    (classrooms ?? []).map(r => ({ id: r.id as string, name: r.name as string })),
    programId,
    program.academy_id as string,
  )
  if ('error' in loadedRooms) return NextResponse.json({ error: loadedRooms.error }, { status: 500 })
  for (const { id: roomId, name: roomName, data } of loadedRooms.rooms) {

    for (const studentId of data.studentIds) {
      const states = { done: 0, inProgress: 0, notStarted: 0 }
      let lastActive: string | null = null
      const items: CampWorkItem[] = []
      for (const a of data.assignments) {
        const s = data.sessionByKey.get(`${a.id}:${studentId}`)
        items.push({
          dueAt: a.due_at,
          started: !!s,
          completed: s?.status === 'completed',
          completedAt: s?.status === 'completed' ? s.completed_at : null,
        })
        if (!s) states.notStarted += 1
        else if (s.status === 'completed') {
          states.done += 1
          if (s.completed_at && (!lastActive || s.completed_at > lastActive)) {
            lastActive = s.completed_at
          }
        } else states.inProgress += 1
      }
      const acc = data.accuracyByStudent.get(studentId)
      const userInfo = data.usersById.get(studentId)
      students.push({
        studentId,
        name: userInfo?.name ?? null,
        email: userInfo?.email ?? null,
        classroomId: roomId,
        classroomName: roomName,
        completion: { done: states.done, total: data.assignments.length },
        avgScorePct: acc && acc.total > 0 ? Math.round((100 * acc.correct) / acc.total) : null,
        lastActive,
        states,
        work: summarizeWork(items, now),
      })
    }
  }

  students.sort((a, b) =>
    (a.name ?? a.email ?? '').localeCompare(b.name ?? b.email ?? '') ||
    a.classroomName.localeCompare(b.classroomName))

  return NextResponse.json({ programId, students })
}
