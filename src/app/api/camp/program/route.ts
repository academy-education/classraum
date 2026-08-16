import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import {
  CAMP_PROGRAM_COLUMNS,
  type CampProgramRow,
  isAcademyManager,
  isAcademyTeacher,
} from '@/lib/camp/api'

/**
 * GET /api/camp/program?academyId=…
 *
 * ALL of the academy's active camp programs + quota usage, each with the
 * classrooms attached to it (what the Camp dashboard page renders — one
 * tab per program when there is more than one). `programs: []` means the
 * academy has no camp — the UI hides the whole section.
 *
 * Order is created_at ascending, so the first program an academy bought
 * stays the first tab as later ones are added.
 *
 * `program` / `classrooms` (the newest program) are kept for
 * backward-compat with pre-multi-program consumers.
 *
 * Read-only; visible to the academy's managers and teachers (the same
 * audience as the RLS read policies from migration 082).
 */

export const dynamic = 'force-dynamic'

interface ClassroomRow {
  id: string
  name: string
  teacher_id: string | null
  camp_program_id: string
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const academyId = req.nextUrl.searchParams.get('academyId')
  if (!academyId) return NextResponse.json({ error: 'academyId required' }, { status: 400 })

  const [manager, teacher] = await Promise.all([
    isAcademyManager(user.id, academyId),
    isAcademyTeacher(user.id, academyId),
  ])
  if (!manager && !teacher) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: programRows, error } = await dbAdmin
    .from('camp_programs')
    .select(CAMP_PROGRAM_COLUMNS)
    .eq('academy_id', academyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const programs = (programRows ?? []) as CampProgramRow[]
  if (programs.length === 0) {
    return NextResponse.json({ programs: [], program: null, classrooms: [] })
  }

  const { data: classroomRows, error: classroomsError } = await dbAdmin
    .from('classrooms')
    .select('id, name, teacher_id, camp_program_id')
    .in('camp_program_id', programs.map(p => p.id))
    .is('deleted_at', null)
    .order('name', { ascending: true })
  if (classroomsError) {
    return NextResponse.json({ error: classroomsError.message }, { status: 500 })
  }

  // Enrolled-student count per classroom, so the dashboard's classroom
  // group headers can carry it without a per-room dashboard fetch. One
  // paged read; classroom rosters are small but the cap is silent.
  const classroomIds = (classroomRows ?? []).map(r => (r as ClassroomRow).id)
  const studentCount = new Map<string, number>()
  if (classroomIds.length > 0) {
    const PAGE = 1000
    for (let from = 0; ; from += PAGE) {
      const { data: memberRows, error: membersError } = await dbAdmin
        .from('classroom_students')
        .select('classroom_id')
        .in('classroom_id', classroomIds)
        .order('classroom_id', { ascending: true })
        .order('student_id', { ascending: true })
        .range(from, from + PAGE - 1)
      if (membersError) {
        return NextResponse.json({ error: membersError.message }, { status: 500 })
      }
      for (const m of memberRows ?? []) {
        const id = m.classroom_id as string
        studentCount.set(id, (studentCount.get(id) ?? 0) + 1)
      }
      if (!memberRows || memberRows.length < PAGE) break
    }
  }

  const byProgram = new Map<string, Array<{ id: string; name: string; teacher_id: string | null; student_count: number }>>()
  for (const row of (classroomRows ?? []) as ClassroomRow[]) {
    const list = byProgram.get(row.camp_program_id) ?? []
    list.push({
      id: row.id,
      name: row.name,
      teacher_id: row.teacher_id,
      student_count: studentCount.get(row.id) ?? 0,
    })
    byProgram.set(row.camp_program_id, list)
  }

  const grouped = programs.map(p => ({ program: p, classrooms: byProgram.get(p.id) ?? [] }))

  // Legacy single-program shape = the newest program (what .limit(1)
  // used to return when this route was single-program).
  const newest = grouped[grouped.length - 1]!
  return NextResponse.json({
    programs: grouped,
    program: newest.program,
    classrooms: newest.classrooms,
  })
}
