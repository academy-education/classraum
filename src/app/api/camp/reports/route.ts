import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import { canManageClassroom } from '@/lib/camp/api'
import { isParentOfStudent, toFamilyPayload, type CampReportPayload } from '@/lib/camp/reports'

/**
 * Camp P4 — read camp reports.
 *
 * GET ?classroomId=…   teacher/manager list for a classroom (meta only)
 *   +&studentId=…      … narrowed to one student (still teacher-authorised)
 * GET ?studentId=…     parent/student list — caller must BE the student
 *                      or be a family-linked parent
 * GET ?id=…            one report with payload — teacher/manager of the
 *                      classroom sees everything; the student and their
 *                      parents get the family payload (teacher-only
 *                      fields stripped)
 *
 * RLS on camp_reports mirrors these rules for direct client reads
 * (migration 086); this route exists so the mobile surface gets names
 * and stripped payloads without each client re-implementing joins.
 */

export const dynamic = 'force-dynamic'

const META_COLUMNS = 'id, camp_program_id, classroom_id, student_id, period_start, period_end, created_at'

interface ReportMetaRow {
  id: string
  camp_program_id: string
  classroom_id: string
  student_id: string
  period_start: string | null
  period_end: string | null
  created_at: string
}

function meta(r: ReportMetaRow, extra: Record<string, unknown> = {}) {
  return {
    id: r.id,
    studentId: r.student_id,
    classroomId: r.classroom_id,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    createdAt: r.created_at,
    ...extra,
  }
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = req.nextUrl.searchParams
  const id = params.get('id')
  const classroomId = params.get('classroomId')
  const studentId = params.get('studentId')

  // ── single report with payload ──
  if (id) {
    const { data: report } = await dbAdmin
      .from('camp_reports')
      .select(`${META_COLUMNS}, payload`)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!report) return NextResponse.json({ error: 'report not found' }, { status: 404 })

    const { data: classroom } = await dbAdmin
      .from('classrooms')
      .select('id, teacher_id, academy_id')
      .eq('id', report.classroom_id)
      .maybeSingle()
    const isTeacher = classroom ? await canManageClassroom(user.id, classroom) : false
    const isSelf = user.id === report.student_id
    const isParent = !isTeacher && !isSelf && (await isParentOfStudent(user.id, report.student_id))
    if (!isTeacher && !isSelf && !isParent) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const payload = report.payload as unknown as CampReportPayload
    return NextResponse.json({
      report: meta(report as ReportMetaRow, {
        payload: isTeacher ? payload : toFamilyPayload(payload),
      }),
    })
  }

  // ── teacher list for a classroom ──
  if (classroomId) {
    const { data: classroom } = await dbAdmin
      .from('classrooms')
      .select('id, teacher_id, academy_id, deleted_at')
      .eq('id', classroomId)
      .maybeSingle()
    if (!classroom || classroom.deleted_at !== null) {
      return NextResponse.json({ error: 'classroom not found' }, { status: 404 })
    }
    if (!(await canManageClassroom(user.id, classroom))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    /* `studentId` alongside `classroomId` narrows the teacher's list to
       one student — the per-student drill-down needs exactly that, and
       fetching the whole classroom to filter it client-side would grow
       with the roster. Authorisation is unchanged: the caller has
       already been proven to manage this classroom, and the filter can
       only ever narrow what they were entitled to see. */
    let listQuery = dbAdmin
      .from('camp_reports')
      .select(META_COLUMNS)
      .eq('classroom_id', classroomId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (studentId) listQuery = listQuery.eq('student_id', studentId)

    const { data: rows, error } = await listQuery
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const reports = (rows ?? []) as ReportMetaRow[]
    const ids = [...new Set(reports.map(r => r.student_id))]
    const { data: users } = ids.length > 0
      ? await dbAdmin.from('users').select('id, name, email').in('id', ids)
      : { data: [] as Array<{ id: string; name: string | null; email: string | null }> }
    const nameById = new Map((users ?? []).map(u => [u.id as string, u]))

    return NextResponse.json({
      reports: reports.map(r => meta(r, {
        studentName: nameById.get(r.student_id)?.name ?? null,
        studentEmail: nameById.get(r.student_id)?.email ?? null,
      })),
    })
  }

  // ── parent/student list ──
  if (studentId) {
    const isSelf = user.id === studentId
    if (!isSelf && !(await isParentOfStudent(user.id, studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: rows, error } = await dbAdmin
      .from('camp_reports')
      .select(`${META_COLUMNS}, payload`)
      .eq('student_id', studentId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      reports: ((rows ?? []) as Array<ReportMetaRow & { payload: unknown }>).map(r => {
        const p = r.payload as CampReportPayload
        return meta(r, {
          programName: p?.program?.name ?? null,
          testFamily: p?.program?.testFamily ?? null,
          classroomName: p?.classroom?.name ?? null,
          studentName: p?.student?.name ?? null,
        })
      }),
    })
  }

  return NextResponse.json({ error: 'id, classroomId or studentId required' }, { status: 400 })
}
