import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import { canManageClassroom } from '@/lib/camp/api'
import { buildCampReportPayload, loadClassroomCampData } from '@/lib/camp/reports'

/**
 * GET /api/camp/student?classroomId=…&studentId=…
 *
 * Live per-student drill-down for the teacher dashboard (classroom
 * teacher or academy manager). Returns the SAME payload shape a camp
 * report snapshots — built by the one shared implementation
 * (loadClassroomCampData + buildCampReportPayload in
 * src/lib/camp/reports.ts) — but computed fresh on every call, so the
 * drill-down always agrees with a report generated at the same moment.
 *
 * Adds `lastActivity`: the latest camp completion (assignments or mock
 * tests) for the student, null when nothing is finished yet.
 */

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const classroomId = req.nextUrl.searchParams.get('classroomId')
  const studentId = req.nextUrl.searchParams.get('studentId')
  if (!classroomId || !studentId) {
    return NextResponse.json({ error: 'classroomId and studentId required' }, { status: 400 })
  }

  const { data: classroom } = await dbAdmin
    .from('classrooms')
    .select('id, name, teacher_id, academy_id, camp_program_id, deleted_at')
    .eq('id', classroomId)
    .maybeSingle()
  if (!classroom || classroom.deleted_at !== null) {
    return NextResponse.json({ error: 'classroom not found' }, { status: 404 })
  }
  if (!(await canManageClassroom(user.id, classroom))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!classroom.camp_program_id) {
    return NextResponse.json({ error: 'classroom is not part of a camp program' }, { status: 400 })
  }

  const data = await loadClassroomCampData({
    id: classroom.id,
    name: classroom.name,
    camp_program_id: classroom.camp_program_id,
  })
  if ('error' in data) return NextResponse.json({ error: data.error }, { status: 500 })

  if (!data.studentIds.includes(studentId)) {
    return NextResponse.json({ error: 'student is not enrolled in this classroom' }, { status: 404 })
  }

  // Same period label the generate route defaults to (program dates) so
  // the live view and a freshly generated report read identically.
  const { data: programDates } = await dbAdmin
    .from('camp_programs')
    .select('starts_on, ends_on')
    .eq('id', classroom.camp_program_id)
    .maybeSingle()
  const period = {
    start: programDates?.starts_on ?? null,
    end: programDates?.ends_on ?? new Date().toISOString().slice(0, 10),
  }

  const payload = await buildCampReportPayload(data, studentId, period)

  const completions = [
    ...payload.assignments.map(a => a.completedAt),
    ...payload.mockTests.map(m => m.completedAt),
  ].filter((d): d is string => typeof d === 'string')
  const lastActivity = completions.length > 0 ? completions.sort().at(-1)! : null

  return NextResponse.json({ payload, lastActivity })
}
