import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import {
  CAMP_PROGRAM_COLUMNS,
  type CampProgramRow,
  canManageClassroom,
  domainsForSection,
  drawCampItems,
  sectionsForFamily,
} from '@/lib/camp/api'

/**
 * Camp assignment builder.
 *
 * POST { classroomId, title, section?, domain?, count, dueAt? }
 *   Teacher (or academy manager) draws `count` random live items from
 *   the study bank for the classroom's camp program and files them as
 *   one shared assignment. The program's paid question quota is charged
 *   PER ASSIGNMENT (decision in docs/CAMP-MODE-PLAN.md), enforced here
 *   because migration 082 made camp tables read-only for clients.
 *
 * GET ?classroomId=…
 *   The classroom's assignments, newest first.
 */

export const dynamic = 'force-dynamic'

const ASSIGNMENT_COLUMNS =
  'id, camp_program_id, classroom_id, teacher_id, title, section, domain, question_count, item_ids, due_at, classroom_session_id, created_at'

const MAX_COUNT = 40

async function loadClassroom(classroomId: string) {
  const { data } = await dbAdmin
    .from('classrooms')
    .select('id, name, teacher_id, academy_id, camp_program_id, deleted_at')
    .eq('id', classroomId)
    .maybeSingle()
  return data && data.deleted_at === null ? data : null
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const classroomId = req.nextUrl.searchParams.get('classroomId')
  if (!classroomId) return NextResponse.json({ error: 'classroomId required' }, { status: 400 })

  const classroom = await loadClassroom(classroomId)
  if (!classroom) return NextResponse.json({ error: 'classroom not found' }, { status: 404 })
  if (!(await canManageClassroom(user.id, classroom))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Review sets (kind='review', migration 083) live in the same table
  // but belong to /api/camp/review-set — keep this list assignments-only.
  const { data, error } = await dbAdmin
    .from('camp_assignments')
    .select(ASSIGNMENT_COLUMNS)
    .eq('classroom_id', classroomId)
    .is('deleted_at', null)
    .or('kind.neq.review,kind.is.null')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ assignments: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    classroomId?: string
    title?: string
    section?: string
    domain?: string
    count?: number
    dueAt?: string
    classroomSessionId?: string
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  const classroomId = body.classroomId
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const count = body.count
  if (!classroomId || !title) {
    return NextResponse.json({ error: 'classroomId and title required' }, { status: 400 })
  }
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
    return NextResponse.json({ error: `count must be an integer between 1 and ${MAX_COUNT}` }, { status: 400 })
  }
  let dueAt: string | null = null
  if (body.dueAt) {
    const parsed = new Date(body.dueAt)
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'invalid dueAt' }, { status: 400 })
    }
    dueAt = parsed.toISOString()
  }

  const classroom = await loadClassroom(classroomId)
  if (!classroom) return NextResponse.json({ error: 'classroom not found' }, { status: 404 })
  if (!(await canManageClassroom(user.id, classroom))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!classroom.camp_program_id) {
    return NextResponse.json({ error: 'classroom is not part of a camp program' }, { status: 400 })
  }

  /* Optional session link (migration 096). Validated against THIS
     classroom: a session id from another classroom would file the work
     under a lesson the students are not in, and nothing downstream
     re-checks it. Absent is fine and is the norm for a vacation camp
     with no timetable. */
  let classroomSessionId: string | null = null
  if (body.classroomSessionId) {
    const { data: session } = await dbAdmin
      .from('classroom_sessions')
      .select('id, classroom_id, deleted_at')
      .eq('id', body.classroomSessionId)
      .maybeSingle()
    if (!session || session.deleted_at !== null) {
      return NextResponse.json({ error: 'session not found' }, { status: 404 })
    }
    if (session.classroom_id !== classroom.id) {
      return NextResponse.json({ error: 'session belongs to a different classroom' }, { status: 400 })
    }
    classroomSessionId = session.id
  }

  const { data: program } = await dbAdmin
    .from('camp_programs')
    .select(CAMP_PROGRAM_COLUMNS)
    .eq('id', classroom.camp_program_id)
    .is('deleted_at', null)
    .maybeSingle<CampProgramRow>()
  if (!program) return NextResponse.json({ error: 'camp program not found' }, { status: 404 })

  // Program window — only enforced when the grant set dates.
  const today = new Date().toISOString().slice(0, 10)
  if ((program.starts_on && today < program.starts_on) || (program.ends_on && today > program.ends_on)) {
    return NextResponse.json({ error: 'camp program is not active today' }, { status: 403 })
  }

  // Section/domain must be vocabulary the bank actually stores for this
  // family (SAT: section + College Board domain; TOEFL: section + ETS task).
  const section = body.section || null
  const domain = body.domain || null
  if (section && !sectionsForFamily(program.test_family).includes(section)) {
    return NextResponse.json({ error: `invalid section for ${program.test_family}` }, { status: 400 })
  }
  if (domain) {
    if (!section) return NextResponse.json({ error: 'domain requires a section' }, { status: 400 })
    if (!domainsForSection(program.test_family, section).includes(domain)) {
      return NextResponse.json({ error: `invalid domain for ${program.test_family}/${section}` }, { status: 400 })
    }
  }

  // Pre-flight quota check — cheap rejection with the remaining count.
  // The authoritative check is the compare-and-swap below.
  const remaining = program.question_quota - program.questions_used
  if (count > remaining) {
    return NextResponse.json(
      { error: 'question quota exceeded', code: 'quota_exceeded', remaining: Math.max(0, remaining) },
      { status: 402 },
    )
  }

  const draw = await drawCampItems({ family: program.test_family, section, domain, count })
  if ('shortfall' in draw) {
    return NextResponse.json(
      { error: 'not enough bank items for this filter', code: 'not_enough_items', available: draw.available },
      { status: 409 },
    )
  }

  const { data: assignment, error: insertError } = await dbAdmin
    .from('camp_assignments')
    .insert({
      camp_program_id: program.id,
      classroom_id: classroom.id,
      teacher_id: user.id,
      title,
      section,
      domain,
      question_count: count,
      item_ids: draw.itemIds,
      due_at: dueAt,
      classroom_session_id: classroomSessionId,
    })
    .select(ASSIGNMENT_COLUMNS)
    .single()
  if (insertError || !assignment) {
    return NextResponse.json({ error: insertError?.message ?? 'insert failed' }, { status: 500 })
  }

  // Charge the quota with a compare-and-swap on the exact prior value.
  // supabase-js cannot express `set questions_used = questions_used + n`
  // in one statement, so this loop is the atomic equivalent: the update
  // only lands if questions_used still holds the value we just read, and
  // 0 rows updated means a concurrent charge won the race — re-read and
  // retry, or roll the assignment back if the quota is now gone.
  let charged = false
  let quotaRemaining = 0
  for (let attempt = 0; attempt < 5 && !charged; attempt++) {
    const { data: fresh } = await dbAdmin
      .from('camp_programs')
      .select('questions_used, question_quota')
      .eq('id', program.id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!fresh) break
    quotaRemaining = fresh.question_quota - fresh.questions_used
    if (count > quotaRemaining) break
    const { data: updated, error: updateError } = await dbAdmin
      .from('camp_programs')
      .update({ questions_used: fresh.questions_used + count })
      .eq('id', program.id)
      .eq('questions_used', fresh.questions_used)
      .select('id')
    if (updateError) break
    charged = (updated?.length ?? 0) > 0
  }

  if (!charged) {
    // Quota race lost (or program vanished mid-flight): the assignment
    // must not exist un-paid-for. Hard delete — it was never visible.
    // Best-effort compensation, error intentionally ignored: if this delete
  // fails, an assignment row survives with NO quota charged behind it —
  // visible in the teacher's list and harmless to students (shelf reads
  // live rows either way); an admin can remove it. The caller already
  // gets the 402 regardless.
  await dbAdmin.from('camp_assignments').delete().eq('id', assignment.id)
    return NextResponse.json(
      { error: 'question quota exceeded', code: 'quota_exceeded', remaining: Math.max(0, quotaRemaining) },
      { status: 402 },
    )
  }

  return NextResponse.json({ assignment }, { status: 201 })
}
