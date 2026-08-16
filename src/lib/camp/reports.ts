import { dbAdmin } from '@/lib/supabase-admin'

/**
 * Camp report payload builder — Camp P4.
 *
 * A camp report is a SNAPSHOT: POST /api/camp/reports/generate calls
 * buildCampReportPayload once per student and freezes the result into
 * camp_reports.payload. Nothing here is re-queried at view time, so a
 * report a parent opens in October still shows the numbers the teacher
 * generated in August.
 *
 * The aggregation mirrors /api/camp/dashboard (same session tagging via
 * config.campAssignmentId, same domain resolution, same graded-rows
 * filter) so a report's numbers can be checked against the live
 * dashboard on the day it was generated.
 */

export {
  CAMP_REPORT_PAYLOAD_VERSION,
  MIN_ANSWERS_FOR_STRENGTHS,
} from '@/lib/camp/report-types'
import { CAMP_REPORT_PAYLOAD_VERSION, MIN_ANSWERS_FOR_STRENGTHS } from '@/lib/camp/report-types'
import type {
  CampReportAssignment,
  CampReportPayload,
  CampReportSkill,
} from '@/lib/camp/report-types'
export type { CampReportAssignment, CampReportPayload, CampReportSkill }

/** PostgREST silently caps a select at 1000 rows (see CLAUDE.md), so
 *  every unbounded read pages to completion — same helper shape as the
 *  camp dashboard route. */
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

interface SessionRow {
  id: string
  student_id: string
  status: string
  correct_count: number | null
  total_count: number | null
  completed_at: string | null
  config: unknown
}

interface ClassroomCampData {
  program: { id: string; name: string; test_family: string }
  classroom: { id: string; name: string }
  studentIds: string[]
  usersById: Map<string, { name: string | null; email: string | null }>
  assignments: Array<{
    id: string
    title: string
    question_count: number
    due_at: string | null
    created_at: string
  }>
  /** First camp session per `${assignmentId}:${studentId}` (start route
   *  is idempotent; keep the first for determinism). */
  sessionByKey: Map<string, SessionRow>
  /** Graded attempt aggregation input: per student, per domain counts. */
  skillsByStudent: Map<string, Map<string, { section: string; domain: string; correct: number; total: number }>>
  /** Overall graded accuracy per student (only students with >=1 graded answer). */
  accuracyByStudent: Map<string, { correct: number; total: number }>
}

/**
 * One shared load per classroom — the generate route calls this once,
 * then buildCampReportPayload per student against the same snapshot, so
 * every report in a batch is computed from the same instant.
 */
export async function loadClassroomCampData(classroom: {
  id: string
  name: string
  camp_program_id: string
}): Promise<ClassroomCampData | { error: string }> {
  const { data: program } = await dbAdmin
    .from('camp_programs')
    .select('id, name, test_family')
    .eq('id', classroom.camp_program_id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!program) return { error: 'camp program not found' }

  const [{ data: members }, { data: assignmentRows, error: assignmentsError }] = await Promise.all([
    dbAdmin.from('classroom_students').select('student_id').eq('classroom_id', classroom.id),
    dbAdmin
      .from('camp_assignments')
      .select('id, title, question_count, due_at, created_at')
      .eq('classroom_id', classroom.id)
      .is('deleted_at', null)
      .or('kind.neq.review,kind.is.null')
      .order('created_at', { ascending: true }),
  ])
  if (assignmentsError) return { error: assignmentsError.message }

  const studentIds = [...new Set((members ?? []).map(m => m.student_id as string))]
  const assignments = (assignmentRows ?? []) as ClassroomCampData['assignments']
  const assignmentIds = new Set(assignments.map(a => a.id))

  const { data: studentUsers } = studentIds.length > 0
    ? await dbAdmin.from('users').select('id, name, email').in('id', studentIds)
    : { data: [] as Array<{ id: string; name: string | null; email: string | null }> }
  const usersById = new Map(
    (studentUsers ?? []).map(u => [u.id as string, { name: u.name as string | null, email: u.email as string | null }]),
  )

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
      'camp report sessions query failed',
    )
  }

  const sessionByKey = new Map<string, SessionRow>()
  const campSessionIds: string[] = []
  const sessionStudent = new Map<string, string>()
  for (const s of sessions) {
    const cfg = s.config as { campAssignmentId?: unknown } | null
    const aid = typeof cfg?.campAssignmentId === 'string' ? cfg.campAssignmentId : null
    if (!aid || !assignmentIds.has(aid)) continue
    const key = `${aid}:${s.student_id}`
    if (!sessionByKey.has(key)) {
      sessionByKey.set(key, s)
      campSessionIds.push(s.id)
      sessionStudent.set(s.id, s.student_id)
    }
  }

  // Graded per-question rows (is_correct null = open-response/ungraded,
  // excluded so they never count as wrong — same rule as the dashboard).
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
      'camp report attempts query failed',
    )
  }
  const graded = attempts.filter(a => a.is_correct !== null && a.item_id !== null)

  // Domain per item — SAT: bank column; TOEFL: ETS task tag in the item
  // JSON (same lookup as drawCampItems / the dashboard).
  const itemIds = [...new Set(graded.map(a => a.item_id as string))]
  const metaByItem = new Map<string, { section: string; domain: string }>()
  const CHUNK = 200
  for (let i = 0; i < itemIds.length; i += CHUNK) {
    const chunk = itemIds.slice(i, i + CHUNK)
    const { data, error } = await dbAdmin
      .from('study_item_bank')
      .select('id, section, domain, item')
      .in('id', chunk)
    if (error) return { error: `bank lookup failed: ${error.message}` }
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

  const skillsByStudent = new Map<string, Map<string, { section: string; domain: string; correct: number; total: number }>>()
  const accuracyByStudent = new Map<string, { correct: number; total: number }>()
  for (const a of graded) {
    const studentId = sessionStudent.get(a.session_id)
    const meta = metaByItem.get(a.item_id as string)
    if (!studentId || !meta) continue
    const overall = accuracyByStudent.get(studentId) ?? { correct: 0, total: 0 }
    overall.total += 1
    if (a.is_correct === true) overall.correct += 1
    accuracyByStudent.set(studentId, overall)

    const perDomain = skillsByStudent.get(studentId) ?? new Map()
    const key = `${meta.section}:${meta.domain}`
    const agg = perDomain.get(key) ?? { section: meta.section, domain: meta.domain, correct: 0, total: 0 }
    agg.total += 1
    if (a.is_correct === true) agg.correct += 1
    perDomain.set(key, agg)
    skillsByStudent.set(studentId, perDomain)
  }

  return {
    program: program as ClassroomCampData['program'],
    classroom: { id: classroom.id, name: classroom.name },
    studentIds,
    usersById,
    assignments,
    sessionByKey,
    skillsByStudent,
    accuracyByStudent,
  }
}

const pct = (correct: number, total: number) => Math.round((100 * correct) / total)

/** Completed full mock tests for this family, NOT tagged to a camp
 *  assignment (those are camp sessions, already in the trend). */
async function loadMockTests(studentId: string, testFamily: string): Promise<CampReportPayload['mockTests']> {
  const rows = await pageAll<SessionRow & { mode: string }>(
    (from, to) => dbAdmin
      .from('study_sessions')
      .select('id, student_id, status, correct_count, total_count, completed_at, config, mode')
      .eq('student_id', studentId)
      .eq('mode', 'full_test')
      .eq('status', 'completed')
      .eq('archived', false)
      .order('id', { ascending: true })
      .range(from, to),
    'camp report mock tests query failed',
  )
  return rows
    .filter(s => {
      const cfg = s.config as { family?: unknown; campAssignmentId?: unknown } | null
      return cfg?.family === testFamily && typeof cfg?.campAssignmentId !== 'string'
    })
    .map(s => ({
      sessionId: s.id,
      section: (() => {
        const cfg = s.config as { section?: unknown } | null
        return typeof cfg?.section === 'string' ? cfg.section : null
      })(),
      correctCount: s.correct_count,
      totalCount: s.total_count,
      completedAt: s.completed_at,
    }))
    .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''))
}

export async function buildCampReportPayload(
  data: ClassroomCampData,
  studentId: string,
  period: { start: string | null; end: string | null },
): Promise<CampReportPayload> {
  const assignments: CampReportAssignment[] = data.assignments.map(a => {
    const s = data.sessionByKey.get(`${a.id}:${studentId}`)
    const done = s?.status === 'completed'
    const scored = done && s !== undefined && s.correct_count !== null && s.total_count !== null && s.total_count > 0
    return {
      id: a.id,
      title: a.title,
      questionCount: a.question_count,
      dueAt: a.due_at,
      createdAt: a.created_at,
      state: !s ? 'not_started' : done ? 'done' : 'in_progress',
      correctCount: done ? (s?.correct_count ?? null) : null,
      totalCount: done ? (s?.total_count ?? null) : null,
      scorePct: scored ? pct(s!.correct_count!, s!.total_count!) : null,
      completedAt: done ? (s?.completed_at ?? null) : null,
      sessionId: s?.id ?? null,
    }
  })

  const skills: CampReportSkill[] = [...(data.skillsByStudent.get(studentId)?.values() ?? [])]
    .map(s => ({ ...s, accuracy: pct(s.correct, s.total) }))
    .sort((x, y) => x.section.localeCompare(y.section) || x.domain.localeCompare(y.domain))

  const eligible = skills.filter(s => s.total >= MIN_ANSWERS_FOR_STRENGTHS)
  const byAccuracyDesc = [...eligible].sort((x, y) => y.accuracy - x.accuracy || y.total - x.total)
  const strengths = byAccuracyDesc.slice(0, 3)
  // Weaknesses from the other end, excluding anything already named a
  // strength (with few domains one skill could otherwise be both).
  const weaknesses = [...eligible]
    .sort((x, y) => x.accuracy - y.accuracy || y.total - x.total)
    .filter(s => !strengths.includes(s))
    .slice(0, 3)

  const own = data.accuracyByStudent.get(studentId)
  const studentAccuracy = own && own.total > 0 ? pct(own.correct, own.total) : null
  const cohortAccuracies = [...data.accuracyByStudent.values()]
    .filter(v => v.total > 0)
    .map(v => (100 * v.correct) / v.total)
  let percentile: number | null = null
  if (studentAccuracy !== null && cohortAccuracies.length > 1) {
    const ownExact = (100 * own!.correct) / own!.total
    const below = cohortAccuracies.filter(a => a < ownExact).length
    percentile = Math.round((100 * below) / (cohortAccuracies.length - 1))
  }

  const doneCount = assignments.filter(a => a.state === 'done').length
  const completion = {
    done: doneCount,
    total: assignments.length,
    rate: assignments.length > 0 ? Math.round((100 * doneCount) / assignments.length) : 0,
  }

  const user = data.usersById.get(studentId)
  return {
    version: CAMP_REPORT_PAYLOAD_VERSION,
    generatedAt: new Date().toISOString(),
    program: { id: data.program.id, name: data.program.name, testFamily: data.program.test_family },
    classroom: data.classroom,
    student: { id: studentId, name: user?.name ?? null, email: user?.email ?? null },
    period,
    assignments,
    skills,
    strengths,
    weaknesses,
    cohort: { n: cohortAccuracies.length, studentAccuracy, percentile },
    completion,
    mockTests: await loadMockTests(studentId, data.program.test_family),
  }
}

/** Strip the fields only teachers may see before handing a payload to a
 *  parent or student (completion is a classroom-management signal, not
 *  a family-facing one — P4 spec). */
export function toFamilyPayload(payload: CampReportPayload): CampReportPayload {
  return { ...payload, completion: null }
}

/**
 * Is `parentId` linked to `studentId` through a family? Mirrors
 * get_user_family_students (the RLS function): a 'parent' row and a
 * 'student' row sharing a family_id.
 */
export async function isParentOfStudent(parentId: string, studentId: string): Promise<boolean> {
  const { data: parentRows } = await dbAdmin
    .from('family_members')
    .select('family_id')
    .eq('user_id', parentId)
    .eq('role', 'parent')
  const familyIds = (parentRows ?? []).map(r => r.family_id as string)
  if (familyIds.length === 0) return false
  const { count } = await dbAdmin
    .from('family_members')
    .select('id', { count: 'exact', head: true })
    .in('family_id', familyIds)
    .eq('user_id', studentId)
    .eq('role', 'student')
  return (count ?? 0) > 0
}

/* ── Delivery seam (deliberately NOT implemented) ─────────────────────
 *
 * Kakao/email sending of camp reports is deferred (P4 decision). When it
 * lands, it plugs in HERE: the generate route calls this after inserting
 * each report row, and the implementation fans out to Kakao Alimtalk
 * (solapi) / email using the family_members contact fields. Until then
 * it records nothing and sends nothing — parents pull reports through
 * the mobile surface instead.
 */
export async function queueCampReportDelivery(_report: {
  reportId: string
  studentId: string
}): Promise<void> {
  // no-op: delivery deferred. See seam note above.
}
