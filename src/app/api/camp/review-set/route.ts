import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import { assembleFromItemIds } from '@/lib/study/assemble'
import {
  CAMP_PROGRAM_COLUMNS,
  type CampProgramRow,
  canManageClassroom,
  domainsForSection,
  drawCampItems,
  sectionsForFamily,
} from '@/lib/camp/api'

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
 *   Teacher (or academy manager) of a camp classroom. Same auth, window,
 *   vocabulary, draw, and quota rules as /api/camp/assignments.
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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  /* ?classroomId=… — list the classroom's decks (no items, so this is
     safe to render in a teacher list; the full payload with keys and
     explanations stays behind ?id=). Until this existed decks were
     created, presented once and then unreachable, which is why the
     DELETE below had nowhere to be called from. */
  const listClassroomId = req.nextUrl.searchParams.get('classroomId')
  if (listClassroomId) {
    const room = await loadClassroom(listClassroomId)
    if (!room) return NextResponse.json({ error: 'classroom not found' }, { status: 404 })
    if (!(await canManageClassroom(user.id, room))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { data, error } = await dbAdmin
      .from('camp_assignments')
      .select('id, title, section, domain, question_count, presented_at, created_at')
      .eq('classroom_id', listClassroomId)
      .eq('kind', 'review')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ reviewSets: data ?? [] })
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id or classroomId required' }, { status: 400 })

  const { data: set } = await dbAdmin
    .from('camp_assignments')
    .select(REVIEW_COLUMNS)
    .eq('id', id)
    .eq('kind', 'review')
    .is('deleted_at', null)
    .maybeSingle()
  if (!set) return NextResponse.json({ error: 'review set not found' }, { status: 404 })

  const classroom = await loadClassroom(set.classroom_id)
  if (!classroom) return NextResponse.json({ error: 'classroom not found' }, { status: 404 })
  // Teacher/manager only — this payload carries keys + explanations, so
  // classroom STUDENTS must be rejected here, not just unlinked in the UI.
  if (!(await canManageClassroom(user.id, classroom))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
    return NextResponse.json({ error: 'review set has no items' }, { status: 409 })
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
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'assemble failed' },
      { status: 500 },
    )
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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    classroomId?: string
    title?: string
    section?: string
    domain?: string
    count?: number
    classroomSessionId?: string
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  const classroomId = body.classroomId
  const count = body.count
  if (!classroomId) return NextResponse.json({ error: 'classroomId required' }, { status: 400 })
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
    return NextResponse.json({ error: `count must be an integer between 1 and ${MAX_COUNT}` }, { status: 400 })
  }
  const title = (typeof body.title === 'string' && body.title.trim()) ||
    `Class review — ${new Date().toISOString().slice(0, 10)}`

  const classroom = await loadClassroom(classroomId)
  if (!classroom) return NextResponse.json({ error: 'classroom not found' }, { status: 404 })
  if (!(await canManageClassroom(user.id, classroom))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!classroom.camp_program_id) {
    return NextResponse.json({ error: 'classroom is not part of a camp program' }, { status: 400 })
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

  const today = new Date().toISOString().slice(0, 10)
  if ((program.starts_on && today < program.starts_on) || (program.ends_on && today > program.ends_on)) {
    return NextResponse.json({ error: 'camp program is not active today' }, { status: 403 })
  }

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

  // Pre-flight quota check; the authoritative check is the CAS below.
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
    return NextResponse.json({ error: insertError?.message ?? 'insert failed' }, { status: 500 })
  }

  // Charge the quota with the same compare-and-swap the assignment
  // builder uses (see /api/camp/assignments POST for the rationale) —
  // review sets spend the same paid pool.
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
    // Best-effort compensation, error intentionally ignored — same shape as
  // the assignments route: a failed delete leaves an uncharged review set
  // visible only to the teacher; the 402 is returned regardless.
  await dbAdmin.from('camp_assignments').delete().eq('id', reviewSet.id)
    return NextResponse.json(
      { error: 'question quota exceeded', code: 'quota_exceeded', remaining: Math.max(0, quotaRemaining) },
      { status: 402 },
    )
  }

  return NextResponse.json({ reviewSet }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: set } = await dbAdmin
    .from('camp_assignments')
    .select('id, classroom_id, camp_program_id, question_count, presented_at, deleted_at')
    .eq('id', id)
    .eq('kind', 'review')
    .is('deleted_at', null)
    .maybeSingle()
  if (!set) return NextResponse.json({ error: 'review set not found' }, { status: 404 })

  const classroom = await loadClassroom(set.classroom_id)
  if (!classroom) return NextResponse.json({ error: 'classroom not found' }, { status: 404 })
  if (!(await canManageClassroom(user.id, classroom))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error: delError } = await dbAdmin
    .from('camp_assignments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', set.id)
  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

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
