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
 * The academy's active camp program + quota usage, plus the classrooms
 * attached to it (what the Camp dashboard page renders). `program: null`
 * means the academy has no camp — the UI hides the whole section.
 *
 * Read-only; visible to the academy's managers and teachers (the same
 * audience as the RLS read policies from migration 082).
 */

export const dynamic = 'force-dynamic'

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

  const { data: programs, error } = await dbAdmin
    .from('camp_programs')
    .select(CAMP_PROGRAM_COLUMNS)
    .eq('academy_id', academyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const program = (programs?.[0] as CampProgramRow | undefined) ?? null
  if (!program) return NextResponse.json({ program: null, classrooms: [] })

  const { data: classrooms, error: classroomsError } = await dbAdmin
    .from('classrooms')
    .select('id, name, teacher_id')
    .eq('camp_program_id', program.id)
    .is('deleted_at', null)
    .order('name', { ascending: true })
  if (classroomsError) {
    return NextResponse.json({ error: classroomsError.message }, { status: 500 })
  }

  return NextResponse.json({ program, classrooms: classrooms ?? [] })
}
