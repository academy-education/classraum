import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'
import { assembleFromItemIds } from '@/lib/study/assemble'
import { campTopicId } from '@/lib/study/section-topics'
import { grantTestEntitlement } from '@/lib/study/entitlements'
import { CAMP_PROGRAM_COLUMNS, type CampProgramRow } from '@/lib/camp/api'
import { trackEvent } from '@/lib/study/analytics'

/**
 * POST /api/study/camp/start — turn a teacher's camp assignment into a
 * solvable full-test session for the calling student.
 *
 * Body: { assignmentId }
 *
 * The session is the SAME shape every other bank-assembled full test
 * uses (mode 'full_test' + one '[full-test-v1]' study_messages cache
 * row), so TestSession rendering and submit grading serve it unchanged.
 * Camp sessions are tagged config.campAssignmentId — the same pattern
 * the daily challenge uses for dailyChallenge — which is both the
 * idempotency key here and how the landing shelf finds progress.
 *
 * NO credit reserve and NO coverage gate: the school already paid for
 * the questions (camp_programs.question_quota, charged when the teacher
 * built the assignment), and the item set is fixed so bank coverage is
 * irrelevant — the same exemptions pathNode sessions get.
 */

export const dynamic = 'force-dynamic'

const CACHED_TEST_MARKER = '[full-test-v1]'

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(`camp-start:user:${user.id}`, { windowMs: 60 * 1000, max: 10 })
  if (blocked) return blocked

  let body: { assignmentId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const assignmentId = typeof body.assignmentId === 'string' ? body.assignmentId : null
  if (!assignmentId) return NextResponse.json({ error: 'assignmentId required' }, { status: 400 })

  const { data: assignment } = await dbAdmin
    .from('camp_assignments')
    .select('id, camp_program_id, classroom_id, title, section, question_count, item_ids, kind, deleted_at')
    .eq('id', assignmentId)
    .maybeSingle()
  if (!assignment || assignment.deleted_at !== null) {
    return NextResponse.json({ error: 'assignment not found' }, { status: 404 })
  }
  // kind='review' rows are teacher presenter decks (migration 083) — a
  // student who learns the id must not be able to mint a session (and
  // thereby the answer key cache) from one.
  if (assignment.kind === 'review') {
    return NextResponse.json({ error: 'assignment not found' }, { status: 404 })
  }

  // The caller must be a student of the assignment's classroom.
  // study_*.student_id IS the auth uid IS classroom_students.student_id
  // (identity bridge, docs/CAMP-MODE-PLAN.md).
  const { count: membership } = await dbAdmin
    .from('classroom_students')
    .select('id', { count: 'exact', head: true })
    .eq('classroom_id', assignment.classroom_id)
    .eq('student_id', user.id)
  if ((membership ?? 0) === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: program } = await dbAdmin
    .from('camp_programs')
    .select(CAMP_PROGRAM_COLUMNS)
    .eq('id', assignment.camp_program_id)
    .is('deleted_at', null)
    .maybeSingle<CampProgramRow>()
  if (!program) return NextResponse.json({ error: 'camp program not found' }, { status: 404 })

  // Same window rule the teacher-side builder enforces: dates bind only
  // when the grant set them.
  const today = new Date().toISOString().slice(0, 10)
  if ((program.starts_on && today < program.starts_on) || (program.ends_on && today > program.ends_on)) {
    return NextResponse.json({ error: 'camp program is not active today' }, { status: 403 })
  }

  // Idempotent via the daily-challenge pattern: one session per
  // (student, assignment). NOTE this is a read-then-insert, so a true
  // double-fire can still race (CLAUDE.md's "idempotent that is a read
  // followed by a write is not") — acceptable here because the client
  // has a single tap-to-start surface and a duplicate costs nothing
  // (no credits, quota already charged per assignment); the shelf reads
  // whichever row .contains() finds first.
  const { data: existing } = await dbAdmin
    .from('study_sessions')
    .select('id')
    .eq('student_id', user.id)
    .contains('config', { campAssignmentId: assignment.id })
    .limit(1)
  if (existing && existing[0]) {
    return NextResponse.json({ sessionId: existing[0].id, reused: true })
  }

  // Camp students get mock tests for the camp's family (decision in
  // docs/CAMP-MODE-PLAN.md) — granted on first camp session start.
  // Non-fatal: the assignment itself must start even if the grant write
  // fails. resolveAccess treats source='camp' as ADD-ONLY, so this row
  // can never narrow a free user down to one test.
  try {
    const family = program.test_family === 'toefl' ? 'toefl' as const : 'sat' as const
    const expiresAt = program.ends_on
      ? new Date(`${program.ends_on}T23:59:59.999Z`)
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    await grantTestEntitlement({ studentId: user.id, test: family, expiresAt, source: 'camp' })
  } catch (e) {
    console.error('[camp/start] entitlement grant failed', e)
  }

  const itemIds = Array.isArray(assignment.item_ids)
    ? (assignment.item_ids as unknown[]).filter((x): x is string => typeof x === 'string')
    : []
  if (itemIds.length === 0) {
    return NextResponse.json({ error: 'assignment has no items' }, { status: 409 })
  }

  const { data: sess, error: sessErr } = await dbAdmin
    .from('study_sessions')
    .insert({
      student_id: user.id,
      topic_id: campTopicId(program.test_family, assignment.section),
      mode: 'full_test',
      status: 'active',
      language: 'en',
      generation_status: 'ready',
      config: {
        source: 'bank',
        family: program.test_family,
        ...(assignment.section ? { section: assignment.section } : {}),
        campAssignmentId: assignment.id,
        classroomId: assignment.classroom_id,
      },
    })
    .select('id')
    .single()
  if (sessErr || !sess) return NextResponse.json({ error: 'session create failed' }, { status: 500 })

  let test
  try {
    test = await assembleFromItemIds(
      { itemIds, title: assignment.title, family: program.test_family, studentId: user.id },
      sess.id,
    )
  } catch (e) {
    // Delete error intentionally ignored — an empty session row carries
    // no questions and is swept later (same as the assemble route).
    // If the cache write failed and this delete also fails, an empty
    // 'active' session remains; the next start finds it via the
    // idempotency lookup and rewrites the cache, so nothing is stranded.
    // Best-effort compensation — error intentionally ignored.
    await dbAdmin.from('study_sessions').delete().eq('id', sess.id)
    return NextResponse.json({ error: (e as Error).message, reason: 'bank_empty' }, { status: 409 })
  }

  const { error: cacheErr } = await dbAdmin
    .from('study_messages')
    .insert({
      session_id: sess.id, role: 'assistant',
      content: CACHED_TEST_MARKER + JSON.stringify(test), model: 'bank-assembled',
    })
  if (cacheErr) {
    // Best-effort compensation — error intentionally ignored: if this
    // delete also fails, the empty 'active' session is found by the next
    // start's idempotency lookup and its cache is rewritten there.
    await dbAdmin.from('study_sessions').delete().eq('id', sess.id)
    return NextResponse.json({ error: 'cache write failed' }, { status: 500 })
  }
  // Cosmetic — cached payload carries the authoritative title.
  // Fire-and-forget cosmetic write: the title only labels history lists;
  // losing it costs a default label, never correctness.
  await dbAdmin.from('study_sessions').update({ title: test.title }).eq('id', sess.id)

  void trackEvent(user.id, 'test_started', {
    kind: `camp_${program.test_family}`,
    section: assignment.section ?? 'mixed',
    creditCost: 0,
  })

  return NextResponse.json({ sessionId: sess.id, reused: false })
}
