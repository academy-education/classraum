import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import { canManageClassroom } from '@/lib/camp/api'
import {
  buildCampReportPayload,
  loadClassroomCampData,
  queueCampReportDelivery,
} from '@/lib/camp/reports'
import { kstDate } from '@/lib/camp/dates'

/**
 * Camp P4 — generate camp reports (snapshots) for a classroom.
 *
 * POST { classroomId, studentId?, periodStart?, periodEnd? }
 *   Classroom teacher or academy manager. Computes each student's
 *   payload from camp sessions + graded attempts (one shared classroom
 *   load, so a batch is internally consistent) and writes one
 *   camp_reports row per student. A report is a record, not a live
 *   query — a NEW period creates new rows and old ones stay readable.
 *   Regenerating the SAME period (same student, classroom, start and end)
 *   refreshes that row instead of adding an identical card for parents;
 *   until 2026-10-22 every click inserted another full set, and parents
 *   saw duplicate cards. A refreshed row is not queued for delivery again.
 *
 *   period_start/period_end are the reporting window LABEL; the end
 *   defaults to TODAY (Korean date), capped at the program's end, so a
 *   mid-camp report no longer claims the whole camp. The numbers are all
 *   camp activity to date, matching the teacher dashboard at generation.
 */

export const dynamic = 'force-dynamic'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { classroomId?: string; studentId?: string; periodStart?: string; periodEnd?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  const classroomId = body.classroomId
  if (!classroomId) return NextResponse.json({ error: 'classroomId required' }, { status: 400 })
  for (const [key, value] of [['periodStart', body.periodStart], ['periodEnd', body.periodEnd]] as const) {
    if (value !== undefined && !DATE_RE.test(value)) {
      return NextResponse.json({ error: `${key} must be YYYY-MM-DD` }, { status: 400 })
    }
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

  const targetIds = body.studentId ? [body.studentId] : data.studentIds
  if (body.studentId && !data.studentIds.includes(body.studentId)) {
    return NextResponse.json({ error: 'student is not enrolled in this classroom' }, { status: 400 })
  }
  if (targetIds.length === 0) {
    return NextResponse.json({ error: 'no students enrolled', code: 'no_students' }, { status: 400 })
  }

  const { data: programDates } = await dbAdmin
    .from('camp_programs')
    .select('starts_on, ends_on')
    .eq('id', classroom.camp_program_id)
    .maybeSingle()
  const today = kstDate()
  const programEnd = (programDates?.ends_on as string | null) ?? null
  const period = {
    start: body.periodStart ?? programDates?.starts_on ?? null,
    end: body.periodEnd ?? (programEnd && programEnd < today ? programEnd : today),
  }

  const reports: Array<{ id: string; student_id: string; refreshed?: boolean }> = []
  for (const studentId of targetIds) {
    const payload = await buildCampReportPayload(data, studentId, period)
    // Same period already reported for this student: refresh it, do not stack a duplicate.
    let sameQ = dbAdmin
      .from('camp_reports')
      .select('id')
      .eq('classroom_id', classroom.id)
      .eq('student_id', studentId)
      .eq('period_end', period.end)
    sameQ = period.start === null ? sameQ.is('period_start', null) : sameQ.eq('period_start', period.start)
    const { data: same } = await sameQ.order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (same) {
      const { error: upErr } = await dbAdmin
        .from('camp_reports')
        .update({ payload: JSON.parse(JSON.stringify(payload)), created_by: user.id })
        .eq('id', same.id)
      if (upErr) {
        return NextResponse.json({ error: upErr.message, generated: reports }, { status: 500 })
      }
      reports.push({ id: same.id as string, student_id: studentId, refreshed: true })
      continue
    }
    const { data: inserted, error } = await dbAdmin
      .from('camp_reports')
      .insert({
        camp_program_id: classroom.camp_program_id,
        classroom_id: classroom.id,
        student_id: studentId,
        period_start: period.start,
        period_end: period.end,
        payload: JSON.parse(JSON.stringify(payload)),
        created_by: user.id,
      })
      .select('id, student_id')
      .single()
    if (error || !inserted) {
      return NextResponse.json(
        { error: error?.message ?? 'insert failed', generated: reports },
        { status: 500 },
      )
    }
    reports.push(inserted)
    // Kakao/email delivery is deferred — this is the seam it will use.
    await queueCampReportDelivery({ reportId: inserted.id, studentId })
  }

  return NextResponse.json({ generated: reports }, { status: 201 })
}
