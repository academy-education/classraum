import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import { assembleFromItemIds } from '@/lib/study/assemble'
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

/**
 * Camp P3 — in-class review sets.
 *
 * A review set is a teacher-only PRESENT deck: N questions of a chosen
 * type drawn from the bank, walked through live in class (question →
 * reveal with key + explanation). It is stored as a camp_assignments
 * row with kind='review' (migration 083) so it charges the SAME program
 * quota through the SAME compare-and-swap as a student assignment, but
 * every student-facing reader (shelf, camp/start, dashboard) filters it
 * out by kind.
 *
 * POST { classroomId, title?, section?, domain?, count }
 *   Teacher (or academy manager) of a camp classroom. Same auth, window
 *   (allowed before the camp starts, refused after it ends), vocabulary,
 *   draw, and quota rules as /api/camp/assignments. An omitted title is
 *   stored as '' and rendered translated by the UI.
 *
 * GET ?classroomId=…  the classroom's decks (metadata only)
 * GET ?id=…
 *   The full solvable items (passage, prompt, choices, correct answer,
 *   explanation, graphic) for one review set — TEACHER ONLY. Students in
 *   the classroom get 403; keys and explanations never reach them.
 */

export const dynamic = 'force-dynamic'

const REVIEW_COLUMNS =
  'id, camp_program_id, classroom_id, teacher_id, title, section, domain, question_count, item_ids, kind, classroom_session_id, presented_at, created_at'

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
  if (!user) return campError('unauthorized', 401, 'Unauthorized')

  /* ?classroomId=… — list the classroom's decks (no items, so this is
     safe to render in a teacher list; the full payload with keys and
     explanations stays behind ?id=). Until this existed decks were
     created, presented once and then unreachable, which is why the
     DELETE below had nowhere to be called from. */
  const listClassroomId = req.nextUrl.searchParams.get('classroomId')
  if (listClassroomId) {
    const room = await loadClassroom(listClassroomId)
    if (!room) return campError('classroom_not_found', 404, 'classroom not found')
    if (!(await canManageClassroom(user.id, room))) {
      return campError('forbidden', 403, 'Forbidden')
    }
    const { data, error } = await dbAdmin
      .from('camp_assignments')
      .select('id, title, section, domain, question_count, presented_at, created_at')
      .eq('classroom_id', listClassroomId)
      .eq('kind', 'review')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) return campError('server_error', 500, error.message)
    return NextResponse.json({ reviewSets: data ?? [] })
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return campError('bad_request', 400, 'id or classroomId required')

  const { data: set } = await dbAdmin
    .from('camp_assignments')
    .select(REVIEW_COLUMNS)
    .eq('id', id)
    .eq('kind', 'review')
    .is('deleted_at', null)
    .maybeSingle()
  if (!set) return campError('review_set_not_found', 404, 'review set not found')

  const classroom = await loadClassroom(set.classroom_id)
  if (!classroom) return campError('classroom_not_found', 404, 'classroom not found')
  // Teacher/manager only — this payload carries keys + explanations, so
  // classroom STUDENTS must be rejected here, not just unlinked in the UI.
  if (!(await canManageClassroom(user.id, classroom))) {
    return campError('forbidden', 403, 'Forbidden')
  }

  /* First presenter fetch marks the deck as used. This is the fact the
     delete refund rule turns on — a deck nobody ever opened refunds its
     quota, a presented one does not, and without this stamp there is no
     way to tell them apart. Fire-and-forget: failing to stamp must not
     stop a lesson, and the worst case is a refund we would rather not
     have given. */
  if (!set.presented_at) {
    void dbAdmin
      .from('camp_assignments')
      .update({ presented_at: new Date().toISOString() })
      .eq('id', set.id)
      .is('presented_at', null)
      .then(() => undefined)
  }

  const { data: program } = await dbAdmin
    .from('camp_programs')
    .select('id, test_family')
    .eq('id', set.camp_program_id)
    .maybeSingle()

  const itemIds = Array.isArray(set.item_ids)
    ? (set.item_ids as unknown[]).filter((x): x is string => typeof x === 'string')
    : []
  if (itemIds.length === 0) {
    return campError('review_set_empty', 409, 'review set has no items')
  }

  // Same assembler the student session uses (order preserved, malformed
  // rows skipped, choices shuffled deterministically by seed) — no
  // studentId, so nothing is recorded as an exposure for anyone.
  let questions
  try {
    const assembled = await assembleFromItemIds(
      { itemIds, title: set.title, family: program?.test_family ?? 'sat' },
      set.id,
    )
    questions = assembled.questions
  } catch (e) {
    return campError('server_error', 500, e instanceof Error ? e.message : 'assemble failed')
  }

  return NextResponse.json({
    reviewSet: {
      id: set.id,
      title: set.title,
      section: set.section,
      domain: set.domain,
      questionCount: set.question_count,
      createdAt: set.created_at,
      testFamily: program?.test_family ?? 'sat',
    },
    questions,
  })
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return campError('unauthorized', 401, 'Unauthorized')

  let body: {
    classroomId?: string
    title?: string
    section?: string
    domain?: string
    count?: number
    classroomSessionId?: string
  }
  try { body = await req.json() } catch { return campError('bad_request', 400, 'bad json') }

  const classroomId = body.classroomId
  const count = body.count
  if (!classroomId) return campError('bad_request', 400, 'classroomId required')
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
    return campError('invalid_count', 400, `count must be an integer between 1 and ${MAX_COUNT}`, { max: MAX_COUNT })
  }
  /* No title given: store '' and let the UI render the translated
     "Class review · <date>" from created_at (reviewDeckTitle). This used
     to be built here in English with the UTC date, so a Korean teacher's
     deck list and presenter header read "Class review — 2026-10-22". */
  const title = typeof body.title === 'string' ? body.title.trim() : ''

  const classroom = await loadClassroom(classroomId)
  if (!classroom) return campError('classroom_not_found', 404, 'classroom not found')
  if (!(await canManageClassroom(user.id, classroom))) {
    return campError('forbidden', 403, 'Forbidden')
  }
  if (!classroom.camp_program_id) {
    return campError('not_camp_classroom', 400, 'classroom is not part of a camp program')
  }

  /* Optional session link, same contract as the assignment builder: a
     review set is a lesson activity, so recording which lesson it ran
     in is the point. Validated against THIS classroom — a session from
     another one would file the review under a class these students are
     not in. */
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
    .eq('id', classroom.camp_program_id)
    .is('deleted_at', null)
    .maybeSingle<CampProgramRow>()
  if (!program) return campError('program_not_found', 404, 'camp program not found')

  // Korean date, and only the END binds: a teacher may build a deck before
  // the camp starts (same rule as the assignment builder), not after it ends.
  const today = kstDate()
  if (program.ends_on && today > program.ends_on) {
    return campError('camp_ended', 403, 'camp program has ended', { endsOn: program.ends_on })
  }

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

  // Pre-flight quota check; the authoritative check is the CAS below.
  const remaining = program.question_quota - program.questions_used
  if (count > remaining) {
    return campError('quota_exceeded', 402, 'question quota exceeded', { remaining: Math.max(0, remaining), required: count })
  }

  const draw = await drawCampItems({ family: program.test_family, section, domain, count })
  if ('shortfall' in draw) {
    return campError('not_enough_items', 409, 'not enough bank items for this filter', { available: draw.available })
  }

  const { data: reviewSet, error: insertError } = await dbAdmin
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
      kind: 'review',
      classroom_session_id: classroomSessionId,
    })
    .select(REVIEW_COLUMNS)
    .single()
  if (insertError || !reviewSet) {
    return campError('server_error', 500, insertError?.message ?? 'insert failed')
  }

  // Charge the quota with the same compare-and-swap the assignment
  // builder uses (chargeCampQuota) — review sets spend the same paid pool.
  const charge = await chargeCampQuota(program.id, count)
  if (!charge.charged) {
    // Best-effort compensation, error intentionally ignored — same shape as
    // the assignments route: a failed delete leaves an uncharged review set
    // visible only to the teacher; the 402 is returned regardless.
    await dbAdmin.from('camp_assignments').delete().eq('id', reviewSet.id)
    return campError('quota_exceeded', 402, 'question quota exceeded', { remaining: charge.remaining, required: count })
  }

  return NextResponse.json({ reviewSet }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return campError('unauthorized', 401, 'Unauthorized')

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return campError('bad_request', 400, 'id required')

  const { data: set } = await dbAdmin
    .from('camp_assignments')
    .select('id, classroom_id, camp_program_id, question_count, presented_at, deleted_at')
    .eq('id', id)
    .eq('kind', 'review')
    .is('deleted_at', null)
    .maybeSingle()
  if (!set) return campError('review_set_not_found', 404, 'review set not found')

  const classroom = await loadClassroom(set.classroom_id)
  if (!classroom) return campError('classroom_not_found', 404, 'classroom not found')
  if (!(await canManageClassroom(user.id, classroom))) {
    return campError('forbidden', 403, 'Forbidden')
  }

  const { error: delError } = await dbAdmin
    .from('camp_assignments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', set.id)
  if (delError) return campError('server_error', 500, delError.message)

  /* Refund only a deck that was never presented. Presented decks keep
     the charge for the same reason a sat assignment does: the questions
     were drawn and shown. Refunding them would let a teacher build,
     present and delete on a loop to recover quota indefinitely. */
  let refunded = 0
  if (!set.presented_at) {
    const { data: program } = await dbAdmin
      .from('camp_programs')
      .select('id, questions_used')
      .eq('id', set.camp_program_id)
      .maybeSingle()
    if (program) {
      const next = Math.max(0, (program.questions_used ?? 0) - set.question_count)
      const { error: refundError } = await dbAdmin
        .from('camp_programs')
        .update({ questions_used: next })
        .eq('id', program.id)
      if (!refundError) refunded = (program.questions_used ?? 0) - next
    }
  }

  return NextResponse.json({ deleted: true, refunded, wasPresented: !!set.presented_at })
}
