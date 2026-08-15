import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import { canManageClassroom } from '@/lib/camp/api'

/**
 * Camp P2 — teacher tracking dashboard for one camp classroom.
 *
 * GET ?classroomId=…  (classroom teacher or academy manager)
 *
 * Joins the classroom's camp assignments to student sessions
 * (study_sessions tagged config.campAssignmentId by /api/study/camp/start)
 * and the graded per-question rows (study_attempts, written once by
 * /api/study/test/submit). Returns:
 *   - roster: enrolled students with names
 *   - per assignment: per-student state (not_started / in_progress / done
 *     + score) and completion counts
 *   - skills: cohort accuracy per domain across ALL camp sessions in the
 *     classroom (SAT: bank `domain` column; TOEFL: ETS task tag carried in
 *     item.readingTask / item.listeningTask — same vocabulary the builder
 *     validates against)
 *   - skillsToReview: domains ranked by cohort wrong-answer rate, only
 *     where n >= MIN_ANSWERS_FOR_RANKING answers exist (n is returned)
 */

export const dynamic = 'force-dynamic'

/** Below this many graded answers a domain's wrong-rate is noise, not a
 *  teaching signal — it is reported in `skills` but never ranked. */
const MIN_ANSWERS_FOR_RANKING = 5

type StudentState = 'not_started' | 'in_progress' | 'done'

interface StudentStatus {
  studentId: string
  state: StudentState
  correctCount: number | null
  totalCount: number | null
  completedAt: string | null
}

interface SessionRow {
  id: string
  student_id: string
  status: string
  correct_count: number | null
  total_count: number | null
  completed_at: string | null
  config: unknown
}

/** PostgREST silently caps a select at 1000 rows (see CLAUDE.md — a
 *  verifier once audited a truncated bank), so every unbounded read here
 *  pages to completion. */
const PAGE = 1000

async function pageAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  label: string,
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1)
    if (error) throw new Error(`${label}: ${error.message}`)
    out.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }
  return out
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const classroomId = req.nextUrl.searchParams.get('classroomId')
  if (!classroomId) return NextResponse.json({ error: 'classroomId required' }, { status: 400 })

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

  const { data: program } = await dbAdmin
    .from('camp_programs')
    .select('id, name, test_family')
    .eq('id', classroom.camp_program_id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!program) return NextResponse.json({ error: 'camp program not found' }, { status: 404 })

  // ── Roster + assignments (both bounded by one classroom) ──
  const [{ data: members, error: membersError }, { data: assignmentRows, error: assignmentsError }] =
    await Promise.all([
      dbAdmin
        .from('classroom_students')
        .select('student_id')
        .eq('classroom_id', classroomId),
      dbAdmin
        .from('camp_assignments')
        .select('id, title, section, domain, question_count, due_at, created_at')
        .eq('classroom_id', classroomId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
    ])
  if (membersError || assignmentsError) {
    return NextResponse.json(
      { error: (membersError ?? assignmentsError)?.message ?? 'load failed' },
      { status: 500 },
    )
  }

  const studentIds = [...new Set((members ?? []).map(m => m.student_id as string))]
  const assignments = assignmentRows ?? []
  const assignmentIds = new Set(assignments.map(a => a.id as string))

  const { data: studentUsers } = studentIds.length > 0
    ? await dbAdmin.from('users').select('id, name, email').in('id', studentIds)
    : { data: [] as Array<{ id: string; name: string | null; email: string | null }> }
  const nameById = new Map((studentUsers ?? []).map(u => [u.id as string, u]))
  const roster = studentIds
    .map(id => ({
      studentId: id,
      name: (nameById.get(id)?.name as string | null) ?? null,
      email: (nameById.get(id)?.email as string | null) ?? null,
    }))
    .sort((a, b) => (a.name ?? a.email ?? a.studentId).localeCompare(b.name ?? b.email ?? b.studentId))

  // ── Camp sessions for this roster, matched to this classroom's
  //    assignments locally (config is jsonb; same pattern as
  //    loadStudentCampAssignments in src/lib/camp/student.ts) ──
  let sessions: SessionRow[] = []
  if (studentIds.length > 0) {
    sessions = await pageAll<SessionRow>(
      (from, to) => dbAdmin
        .from('study_sessions')
        .select('id, student_id, status, correct_count, total_count, completed_at, config')
        .in('student_id', studentIds)
        .eq('archived', false)
        .not('config->campAssignmentId', 'is', null)
        .order('id', { ascending: true })
        .range(from, to),
      'camp dashboard sessions query failed',
    )
  }

  // First session per (assignment, student) — the start route is
  // idempotent, so more than one is not expected; keep the first for
  // determinism if it ever happens.
  const sessionByKey = new Map<string, SessionRow>()
  const campSessionIds: string[] = []
  const sessionAssignment = new Map<string, string>() // session id → assignment id
  for (const s of sessions) {
    const cfg = s.config as { campAssignmentId?: unknown } | null
    const aid = typeof cfg?.campAssignmentId === 'string' ? cfg.campAssignmentId : null
    if (!aid || !assignmentIds.has(aid)) continue
    const key = `${aid}:${s.student_id}`
    if (!sessionByKey.has(key)) {
      sessionByKey.set(key, s)
      campSessionIds.push(s.id)
      sessionAssignment.set(s.id, aid)
    }
  }

  // ── Per-assignment student status + completion ──
  const assignmentsOut = assignments.map(a => {
    const students: StudentStatus[] = studentIds.map(sid => {
      const s = sessionByKey.get(`${a.id as string}:${sid}`)
      if (!s) {
        return { studentId: sid, state: 'not_started' as const, correctCount: null, totalCount: null, completedAt: null }
      }
      const done = s.status === 'completed'
      return {
        studentId: sid,
        state: done ? ('done' as const) : ('in_progress' as const),
        correctCount: done ? s.correct_count : null,
        totalCount: done ? s.total_count : null,
        completedAt: done ? s.completed_at : null,
      }
    })
    const done = students.filter(s => s.state === 'done').length
    const inProgress = students.filter(s => s.state === 'in_progress').length
    return {
      id: a.id as string,
      title: a.title as string,
      section: a.section as string | null,
      domain: a.domain as string | null,
      questionCount: a.question_count as number,
      dueAt: a.due_at as string | null,
      createdAt: a.created_at as string,
      students,
      completion: {
        done,
        inProgress,
        notStarted: students.length - done - inProgress,
        total: students.length,
        pct: students.length > 0 ? Math.round((100 * done) / students.length) : 0,
      },
    }
  })

  // ── Cohort accuracy by domain, from the graded per-question rows ──
  // study_attempts is written once per session by /api/study/test/submit
  // (is_correct true/false for objective items, null for open-response —
  // nulls are excluded so ungraded rows never count as wrong).
  interface AttemptRow { session_id: string; item_id: string | null; is_correct: boolean | null }
  let attempts: AttemptRow[] = []
  if (campSessionIds.length > 0) {
    attempts = await pageAll<AttemptRow>(
      (from, to) => dbAdmin
        .from('study_attempts')
        .select('session_id, item_id, is_correct')
        .in('session_id', campSessionIds)
        .order('id', { ascending: true })
        .range(from, to),
      'camp dashboard attempts query failed',
    )
  }
  const graded = attempts.filter(a => a.is_correct !== null && a.item_id !== null)

  // Resolve each attempted item to its domain. SAT: the bank `domain`
  // column. TOEFL: the ETS task tag inside the item JSON — the same
  // lookup drawCampItems uses, and the same keys the UI already labels
  // via camp.tasks.*.
  const itemIds = [...new Set(graded.map(a => a.item_id as string))]
  interface BankMeta { section: string; domain: string }
  const metaByItem = new Map<string, BankMeta>()
  const CHUNK = 200
  for (let i = 0; i < itemIds.length; i += CHUNK) {
    const chunk = itemIds.slice(i, i + CHUNK)
    const { data, error } = await dbAdmin
      .from('study_item_bank')
      .select('id, section, domain, item')
      .in('id', chunk)
    if (error) return NextResponse.json({ error: `bank lookup failed: ${error.message}` }, { status: 500 })
    for (const row of data ?? []) {
      let domain = row.domain as string
      if (program.test_family !== 'sat') {
        const item = row.item as Record<string, unknown> | null
        const raw = row.section === 'listening' ? item?.listeningTask : item?.readingTask
        if (typeof raw === 'string') domain = raw
      }
      metaByItem.set(row.id as string, { section: row.section as string, domain })
    }
  }

  const byDomain = new Map<string, { section: string; domain: string; correct: number; total: number }>()
  for (const a of graded) {
    const meta = metaByItem.get(a.item_id as string)
    if (!meta) continue // item deleted from the bank — nothing to attribute
    const key = `${meta.section}:${meta.domain}`
    const agg = byDomain.get(key) ?? { section: meta.section, domain: meta.domain, correct: 0, total: 0 }
    agg.total += 1
    if (a.is_correct === true) agg.correct += 1
    byDomain.set(key, agg)
  }

  const skills = [...byDomain.values()]
    .map(s => ({ ...s, accuracy: s.total > 0 ? Math.round((100 * s.correct) / s.total) : 0 }))
    .sort((x, y) => x.section.localeCompare(y.section) || x.domain.localeCompare(y.domain))

  const skillsToReview = skills
    .filter(s => s.total >= MIN_ANSWERS_FOR_RANKING)
    .map(s => ({
      section: s.section,
      domain: s.domain,
      wrongRate: Math.round((100 * (s.total - s.correct)) / s.total),
      n: s.total,
    }))
    .sort((x, y) => y.wrongRate - x.wrongRate || y.n - x.n)

  return NextResponse.json({
    classroom: { id: classroom.id, name: classroom.name },
    program: { id: program.id, name: program.name, testFamily: program.test_family },
    roster,
    assignments: assignmentsOut,
    skills,
    skillsToReview,
    minAnswersForRanking: MIN_ANSWERS_FOR_RANKING,
  })
}
