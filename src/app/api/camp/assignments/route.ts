import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import type { Database } from '@/lib/database.types'
import {
  CAMP_PROGRAM_COLUMNS,
  type CampProgramRow,
  canManageClassroom,
  chargeCampQuota,
  domainsForSection,
  drawCampItems,
  sectionsForFamily,
} from '@/lib/camp/api'
import { kstDate } from '@/lib/camp/dates'
import { campError } from '@/lib/camp/http'
import { campQuotaCost } from '@/lib/camp/quota-math'

/**
 * Camp assignment builder.
 *
 * POST { classroomId | classroomIds[], title, section?, domain?, count, dueAt? }
 *   Teacher (or academy manager) draws `count` random live items from
 *   the study bank for the classroom's camp program and files them as
 *   one shared assignment — or, with `classroomIds`, one assignment per
 *   classroom from the SAME draw, all-or-nothing in one request. The
 *   program's paid question quota is charged PER ASSIGNMENT (decision in
 *   docs/CAMP-MODE-PLAN.md), so a multi-room build costs
 *   count x classrooms (campQuotaCost), enforced here because migration
 *   082 made camp tables read-only for clients. Allowed before the camp
 *   starts (teachers prepare ahead); refused after it ends.
 *
 * GET ?id=…
 *   One assignment plus its sitting count (server-side: RLS hides
 *   students' study_sessions from teachers, so a browser count is 0).
 *
 * GET ?classroomId=…
 *   The classroom's assignments, newest first.
 *
 * PATCH ?id=…  { title?, dueAt?, classroomSessionId? }
 *   Edit the fields that do NOT touch the drawn questions, so it costs
 *   nothing. Section, domain and count are deliberately NOT editable:
 *   changing any of them means a different draw, which means charging
 *   the quota again — that is a new assignment, not an edit.
 *
 * PATCH (no id)  { ids: string[], dueAt: string | null }
 *   Bulk move due dates. Same permission as the single edit, checked for
 *   EVERY assignment's classroom before anything is written; one id the
 *   caller cannot edit refuses the whole batch.
 *
 * DELETE ?id=…
 *   Soft-delete one assignment. Refunds the quota ONLY when no student
 *   has opened it — see the handler for why.
 */

export const dynamic = 'force-dynamic'

const ASSIGNMENT_COLUMNS =
  'id, camp_program_id, classroom_id, teacher_id, title, section, domain, question_count, item_ids, due_at, classroom_session_id, created_at'

const MAX_COUNT = 40
/** Classrooms one multi-room build may target. */
const MAX_CLASSROOMS = 30
/** Assignments one bulk due-date move may touch. */
const MAX_BULK = 100

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
  if (!user) return campError('unauthorized', 401, 'Unauthorized')

  /* ?id=… — one assignment plus how many students have opened it.
     The sitting count MUST come from here. RLS hides students'
     study_sessions from their teacher, so the same count run in the
     browser returns 0 every time — which would tell a teacher their
     quota is coming back moments before the DELETE handler, reading the
     same fact with the service role, refuses to refund it. Measured:
     service role 6, teacher 0, for one real assignment. */
  const singleId = req.nextUrl.searchParams.get('id')
  if (singleId) {
    const { data: one } = await dbAdmin
      .from('camp_assignments')
      .select('id, camp_program_id, classroom_id, teacher_id, title, section, domain, question_count, item_ids, due_at, classroom_session_id, created_at, deleted_at')
      .eq('id', singleId)
      .maybeSingle()
    if (!one || one.deleted_at !== null) {
      return campError('assignment_not_found', 404, 'assignment not found')
    }
    const room = await loadClassroom(one.classroom_id)
    if (!room) return campError('classroom_not_found', 404, 'classroom not found')
    if (!(await canManageClassroom(user.id, room))) {
      return campError('forbidden', 403, 'Forbidden')
    }
    const { count } = await dbAdmin
      .from('study_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('config->>campAssignmentId', one.id)
    return NextResponse.json({ assignment: one, sittings: count ?? 0 })
  }

  const classroomId = req.nextUrl.searchParams.get('classroomId')
  if (!classroomId) return campError('bad_request', 400, 'id or classroomId required')

  const classroom = await loadClassroom(classroomId)
  if (!classroom) return campError('classroom_not_found', 404, 'classroom not found')
  if (!(await canManageClassroom(user.id, classroom))) {
    return campError('forbidden', 403, 'Forbidden')
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
  if (error) return campError('server_error', 500, error.message)

  return NextResponse.json({ assignments: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return campError('unauthorized', 401, 'Unauthorized')

  let body: {
    classroomId?: string
    classroomIds?: unknown
    title?: string
    section?: string
    domain?: string
    count?: number
    dueAt?: string
    classroomSessionId?: string
  }
  try { body = await req.json() } catch { return campError('bad_request', 400, 'bad json') }

  /* One classroom (`classroomId`, the original contract) or several
     (`classroomIds`). Several means one assignment per classroom, built
     in this ONE request and all-or-nothing: either every room gets its
     set and the quota is charged for all of them, or nothing exists. */
  const classroomIds = Array.isArray(body.classroomIds)
    ? [...new Set(body.classroomIds.filter((x): x is string => typeof x === 'string' && x !== ''))]
    : body.classroomId ? [body.classroomId] : []
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const count = body.count
  if (classroomIds.length === 0 || !title) {
    return campError('bad_request', 400, 'classroomId(s) and title required')
  }
  if (classroomIds.length > MAX_CLASSROOMS) {
    return campError('too_many_classrooms', 400, `at most ${MAX_CLASSROOMS} classrooms`, { max: MAX_CLASSROOMS })
  }
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
    return campError('invalid_count', 400, `count must be an integer between 1 and ${MAX_COUNT}`, { max: MAX_COUNT })
  }
  let dueAt: string | null = null
  if (body.dueAt) {
    const parsed = new Date(body.dueAt)
    if (Number.isNaN(parsed.getTime())) return campError('invalid_due_date', 400, 'invalid dueAt')
    dueAt = parsed.toISOString()
  }
  // A session belongs to one classroom, so several rooms cannot share one.
  if (body.classroomSessionId && classroomIds.length > 1) {
    return campError('session_single_classroom', 400, 'a session can only be linked when building for one classroom')
  }

  // Every classroom is checked before anything is written: one room the
  // caller cannot manage refuses the whole request.
  const rooms: NonNullable<Awaited<ReturnType<typeof loadClassroom>>>[] = []
  for (const id of classroomIds) {
    const room = await loadClassroom(id)
    if (!room) return campError('classroom_not_found', 404, 'classroom not found', { classroomId: id })
    if (!(await canManageClassroom(user.id, room))) {
      return campError('forbidden', 403, 'Forbidden', { classroomId: id })
    }
    if (!room.camp_program_id) {
      return campError('not_camp_classroom', 400, 'classroom is not part of a camp program', { classroomId: id })
    }
    rooms.push(room)
  }
  if (new Set(rooms.map(r => r.camp_program_id)).size > 1) {
    return campError('mixed_programs', 400, 'all classrooms must belong to the same camp program')
  }
  const classroom = rooms[0]!

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
      return campError('session_not_found', 404, 'session not found')
    }
    if (session.classroom_id !== classroom.id) {
      return campError('session_other_classroom', 400, 'session belongs to a different classroom')
    }
    classroomSessionId = session.id
  }

  const { data: program } = await dbAdmin
    .from('camp_programs')
    .select(CAMP_PROGRAM_COLUMNS)
    .eq('id', classroom.camp_program_id as string)
    .is('deleted_at', null)
    .maybeSingle<CampProgramRow>()
  if (!program) return campError('program_not_found', 404, 'camp program not found')

  /* Program window: only the END binds building (2026-10-23). Teachers
     prepare the first day's sets in the week before the camp, so a build
     before starts_on is allowed; students still cannot START one before
     starts_on (/api/study/camp/start enforces that). No new work once
     the camp is over. Dates bind only when the grant set them. */
  const today = kstDate()
  if (program.ends_on && today > program.ends_on) {
    return campError('camp_ended', 403, 'camp program has ended', { endsOn: program.ends_on })
  }

  // Section/domain must be vocabulary the bank actually stores for this
  // family (SAT: section + College Board domain; TOEFL: section + ETS task).
  const section = body.section || null
  const domain = body.domain || null
  if (section && !sectionsForFamily(program.test_family).includes(section)) {
    return campError('invalid_filter', 400, `invalid section for ${program.test_family}`)
  }
  if (domain) {
    if (!section) return campError('invalid_filter', 400, 'domain requires a section')
    if (!domainsForSection(program.test_family, section).includes(domain)) {
      return campError('invalid_filter', 400, `invalid domain for ${program.test_family}/${section}`)
    }
  }

  // Pre-flight quota check over the WHOLE set — cheap rejection with the
  // remaining count. The authoritative check is the compare-and-swap.
  const required = campQuotaCost(count, rooms.length)
  const remaining = program.question_quota - program.questions_used
  if (required > remaining) {
    return campError('quota_exceeded', 402, 'question quota exceeded', { remaining: Math.max(0, remaining), required })
  }

  /* ONE draw shared by every classroom: "the same assignment" for several
     rooms gives them the same questions, so their results compare item
     for item, and a shortfall refuses every room at once. */
  const draw = await drawCampItems({ family: program.test_family, section, domain, count })
  if ('shortfall' in draw) {
    return campError('not_enough_items', 409, 'not enough bank items for this filter', { available: draw.available })
  }

  // One INSERT statement for every row, so the rows land together or not at all.
  const { data: inserted, error: insertError } = await dbAdmin
    .from('camp_assignments')
    .insert(rooms.map(room => ({
      camp_program_id: program.id,
      classroom_id: room.id,
      teacher_id: user.id,
      title,
      section,
      domain,
      question_count: count,
      item_ids: draw.itemIds,
      due_at: dueAt,
      classroom_session_id: classroomSessionId,
    })))
    .select(ASSIGNMENT_COLUMNS)
  const created = (inserted ?? []) as Array<{ id: string; classroom_id: string }>
  if (insertError || created.length !== rooms.length) {
    // One statement cannot half-land, but if the count is ever wrong,
    // nothing may survive un-paid-for.
    if (created.length > 0) await dbAdmin.from('camp_assignments').delete().in('id', created.map(a => a.id))
    return campError('server_error', 500, insertError?.message ?? 'insert failed')
  }

  const charge = await chargeCampQuota(program.id, required)
  if (!charge.charged) {
    // Quota race lost (or program vanished mid-flight): no assignment may
    // exist un-paid-for. Hard delete every row — none was ever visible.
    // Best-effort compensation, error intentionally ignored: if this delete
    // fails, rows survive with NO quota charged behind them — visible in the
    // teacher's list and harmless to students; an admin can remove them.
    // The caller gets the 402 regardless.
    await dbAdmin.from('camp_assignments').delete().in('id', created.map(a => a.id))
    return campError('quota_exceeded', 402, 'question quota exceeded', { remaining: charge.remaining, required })
  }

  // Request order, so `assignment` (the single-room contract) is the first room asked for.
  const ordered = rooms.map(room => created.find(a => a.classroom_id === room.id)!)
  return NextResponse.json({ assignment: ordered[0], assignments: ordered, charged: required }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return campError('unauthorized', 401, 'Unauthorized')

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return campError('bad_request', 400, 'id required')

  const { data: assignment } = await dbAdmin
    .from('camp_assignments')
    .select('id, classroom_id, camp_program_id, question_count, deleted_at')
    .eq('id', id)
    .maybeSingle()
  if (!assignment || assignment.deleted_at !== null) {
    return campError('assignment_not_found', 404, 'assignment not found')
  }

  const classroom = await loadClassroom(assignment.classroom_id)
  if (!classroom) return campError('classroom_not_found', 404, 'classroom not found')
  if (!(await canManageClassroom(user.id, classroom))) {
    return campError('forbidden', 403, 'Forbidden')
  }

  /* Has anyone opened it? A camp session records the assignment id in
     study_sessions.config, which is how the student shelf finds its
     work — so this is the same fact the shelf reads, not a second
     opinion about it. */
  const { count: sittings } = await dbAdmin
    .from('study_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('config->>campAssignmentId', assignment.id)

  const touched = (sittings ?? 0) > 0

  /* Soft delete. The rows students already sat reference this
     assignment, and a hard delete would strand their sessions and the
     answers inside them — the same reason migration 096 used ON DELETE
     SET NULL for the session link. */
  const { error: delError } = await dbAdmin
    .from('camp_assignments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', assignment.id)
  if (delError) return campError('server_error', 500, delError.message)

  /* Refund the quota only if nobody opened it.
     A set a student has already sat consumed what the school paid for:
     the questions were served, the answers were graded, and the work
     appears in their report. Refunding it would let a teacher recover
     quota by deleting completed work — the school would be paying for
     less than it used. An untouched set served nobody, so the charge
     has no counterpart and is returned.
     Guarded with greatest(0, …) via a read-then-write on a value only
     this route and the builder move; a negative questions_used would
     silently hand out free quota. */
  let refunded = 0
  if (!touched) {
    const { data: program } = await dbAdmin
      .from('camp_programs')
      .select('id, questions_used')
      .eq('id', assignment.camp_program_id)
      .maybeSingle()
    if (program) {
      const next = Math.max(0, (program.questions_used ?? 0) - assignment.question_count)
      const { error: refundError } = await dbAdmin
        .from('camp_programs')
        .update({ questions_used: next })
        .eq('id', program.id)
      if (!refundError) refunded = (program.questions_used ?? 0) - next
    }
  }

  return NextResponse.json({ deleted: true, refunded, hadSittings: touched })
}

export async function PATCH(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return campError('unauthorized', 401, 'Unauthorized')

  const id = req.nextUrl.searchParams.get('id')

  let body: { title?: string; dueAt?: string | null; classroomSessionId?: string | null; ids?: unknown }
  try { body = await req.json() } catch { return campError('bad_request', 400, 'bad json') }

  if (!id) {
    if (Array.isArray(body.ids)) return bulkMoveDueDates(user.id, body.ids, body.dueAt)
    return campError('bad_request', 400, 'id required')
  }

  const { data: assignment } = await dbAdmin
    .from('camp_assignments')
    .select('id, classroom_id, deleted_at')
    .eq('id', id)
    .maybeSingle()
  if (!assignment || assignment.deleted_at !== null) {
    return campError('assignment_not_found', 404, 'assignment not found')
  }

  const classroom = await loadClassroom(assignment.classroom_id)
  if (!classroom) return campError('classroom_not_found', 404, 'classroom not found')
  if (!(await canManageClassroom(user.id, classroom))) {
    return campError('forbidden', 403, 'Forbidden')
  }

  const patch: Database['public']['Tables']['camp_assignments']['Update'] = {}

  if (body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return campError('invalid_title', 400, 'title cannot be empty')
    patch.title = title
  }

  // null clears the due date; undefined leaves it alone. The two are
  // different requests and must not collapse into each other.
  if (body.dueAt !== undefined) {
    if (body.dueAt === null) patch.due_at = null
    else {
      const parsed = new Date(body.dueAt)
      if (Number.isNaN(parsed.getTime())) {
        return campError('invalid_due_date', 400, 'invalid dueAt')
      }
      patch.due_at = parsed.toISOString()
    }
  }

  if (body.classroomSessionId !== undefined) {
    if (body.classroomSessionId === null) patch.classroom_session_id = null
    else {
      // Same rule as create: the session must belong to THIS classroom,
      // or the work is filed under a lesson these students are not in.
      const { data: session } = await dbAdmin
        .from('classroom_sessions')
        .select('id, classroom_id, deleted_at')
        .eq('id', body.classroomSessionId)
        .maybeSingle()
      if (!session || session.deleted_at !== null) {
        return campError('session_not_found', 404, 'session not found')
      }
      if (session.classroom_id !== classroom.id) {
        return campError('session_other_classroom', 400, 'session belongs to a different classroom')
      }
      patch.classroom_session_id = session.id
    }
  }

  if (Object.keys(patch).length === 0) {
    return campError('nothing_to_update', 400, 'nothing to update')
  }

  const { data: updated, error } = await dbAdmin
    .from('camp_assignments')
    .update(patch)
    .eq('id', assignment.id)
    .select(ASSIGNMENT_COLUMNS)
    .single()
  if (error) return campError('server_error', 500, error.message)

  return NextResponse.json({ assignment: updated })
}

/**
 * Bulk due-date move (PATCH with `ids`). All-or-nothing: every id must be
 * a live assignment (not a review deck — those have no due date) in a
 * classroom the caller may edit, by the same canManageClassroom rule as
 * the single edit, before ONE update moves them all.
 */
async function bulkMoveDueDates(userId: string, rawIds: unknown[], rawDueAt: unknown) {
  const ids = [...new Set(rawIds.filter((x): x is string => typeof x === 'string' && x !== ''))]
  if (ids.length === 0) return campError('bad_request', 400, 'ids required')
  if (ids.length > MAX_BULK) {
    return campError('too_many_assignments', 400, `at most ${MAX_BULK} assignments`, { max: MAX_BULK })
  }
  let dueAt: string | null
  if (rawDueAt === null) dueAt = null
  else if (typeof rawDueAt === 'string') {
    const parsed = new Date(rawDueAt)
    if (Number.isNaN(parsed.getTime())) return campError('invalid_due_date', 400, 'invalid dueAt')
    dueAt = parsed.toISOString()
  } else return campError('invalid_due_date', 400, 'dueAt required (a date, or null to clear)')

  const { data: found } = await dbAdmin
    .from('camp_assignments')
    .select('id, classroom_id, kind, deleted_at')
    .in('id', ids)
  const live = (found ?? []).filter(a => a.deleted_at === null && a.kind !== 'review')
  if (live.length !== ids.length) return campError('assignment_not_found', 404, 'assignment not found')

  for (const classroomId of new Set(live.map(a => a.classroom_id as string))) {
    const room = await loadClassroom(classroomId)
    if (!room) return campError('classroom_not_found', 404, 'classroom not found')
    if (!(await canManageClassroom(userId, room))) return campError('forbidden', 403, 'Forbidden')
  }

  const { data: updated, error } = await dbAdmin
    .from('camp_assignments')
    .update({ due_at: dueAt })
    .in('id', ids)
    .is('deleted_at', null)
    .select(ASSIGNMENT_COLUMNS)
  if (error) return campError('server_error', 500, error.message)
  return NextResponse.json({ updated: updated?.length ?? 0, assignments: updated ?? [] })
}
