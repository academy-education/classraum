import { dbAdmin } from '@/lib/supabase-admin'

/**
 * Student-facing camp queries — the "From your teacher" shelf on the
 * study landing. Read path only; session creation goes through
 * POST /api/study/camp/start.
 */

export interface StudentCampAssignment {
  id: string
  title: string
  questionCount: number
  dueAt: string | null
  classroomName: string | null
  teacherName: string | null
  testFamily: string
  state: 'not_started' | 'in_progress' | 'done'
  sessionId: string | null
  /** Graded totals when done (study_sessions.correct_count/total_count). */
  correctCount: number | null
  totalCount: number | null
}

/**
 * The student's live camp assignments, newest first, with per-assignment
 * session state (a session is a study_sessions row tagged
 * config.campAssignmentId — created by /api/study/camp/start).
 *
 * "Live" = assignment not deleted, program not deleted, and today is not
 * past the program's ends_on (a window end hides the shelf; dates bind
 * only when the grant set them, same rule as the write routes).
 */
export async function loadStudentCampAssignments(studentId: string): Promise<StudentCampAssignment[]> {
  const { data: memberships } = await dbAdmin
    .from('classroom_students')
    .select('classroom_id')
    .eq('student_id', studentId)
  const classroomIds = [...new Set((memberships ?? []).map(m => m.classroom_id as string))]
  if (classroomIds.length === 0) return []

  // kind='review' rows are teacher-only presenter decks (migration 083)
  // and must never reach the shelf. `.neq` alone would ALSO drop NULL
  // kind (SQL null comparison), which is the right direction here, but
  // the explicit or() keeps pre-083 NULLs visible as assignments.
  const { data: assignments } = await dbAdmin
    .from('camp_assignments')
    .select('id, camp_program_id, classroom_id, title, question_count, due_at, created_at')
    .in('classroom_id', classroomIds)
    .is('deleted_at', null)
    .or('kind.neq.review,kind.is.null')
    .order('created_at', { ascending: false })
  if (!assignments || assignments.length === 0) return []

  const programIds = [...new Set(assignments.map(a => a.camp_program_id as string))]
  const assignmentClassrooms = [...new Set(assignments.map(a => a.classroom_id as string))]

  const [{ data: programs }, { data: classrooms }, { data: sessions }] = await Promise.all([
    dbAdmin
      .from('camp_programs')
      .select('id, test_family, ends_on')
      .in('id', programIds)
      .is('deleted_at', null),
    // No FK from classrooms.teacher_id in the generated types, so no
    // embedded join — teacher names are fetched in a second hop below.
    dbAdmin
      .from('classrooms')
      .select('id, name, teacher_id')
      .in('id', assignmentClassrooms),
    // All of this student's camp sessions; matched to assignments below.
    // `->` (json, not ->> text) so the filter matches the jsonb key the
    // start route writes; local matching keeps it one query.
    dbAdmin
      .from('study_sessions')
      .select('id, status, correct_count, total_count, config')
      .eq('student_id', studentId)
      .eq('archived', false)
      .not('config->campAssignmentId', 'is', null),
  ])

  const programById = new Map((programs ?? []).map(p => [p.id as string, p]))
  const classroomById = new Map((classrooms ?? []).map(c => [c.id as string, c]))

  const teacherIds = [...new Set((classrooms ?? [])
    .map(c => c.teacher_id as string | null)
    .filter((x): x is string => x !== null))]
  const { data: teachers } = teacherIds.length > 0
    ? await dbAdmin.from('users').select('id, name').in('id', teacherIds)
    : { data: [] as Array<{ id: string; name: string }> }
  const teacherNameById = new Map((teachers ?? []).map(u => [u.id as string, u.name as string]))
  const sessionByAssignment = new Map<string, { id: string; status: string; correct_count: number | null; total_count: number | null }>()
  for (const s of sessions ?? []) {
    const cfg = s.config as { campAssignmentId?: unknown } | null
    const aid = typeof cfg?.campAssignmentId === 'string' ? cfg.campAssignmentId : null
    if (aid && !sessionByAssignment.has(aid)) {
      sessionByAssignment.set(aid, {
        id: s.id as string,
        status: s.status as string,
        correct_count: s.correct_count as number | null,
        total_count: s.total_count as number | null,
      })
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const out: StudentCampAssignment[] = []
  for (const a of assignments) {
    const program = programById.get(a.camp_program_id as string)
    if (!program) continue // program deleted → assignment is dead
    if (program.ends_on && today > (program.ends_on as string)) continue
    const classroom = classroomById.get(a.classroom_id as string)
    const teacherName = classroom?.teacher_id
      ? (teacherNameById.get(classroom.teacher_id as string) ?? null)
      : null
    const session = sessionByAssignment.get(a.id as string) ?? null
    out.push({
      id: a.id as string,
      title: a.title as string,
      questionCount: a.question_count as number,
      dueAt: a.due_at as string | null,
      classroomName: (classroom?.name as string | undefined) ?? null,
      teacherName,
      testFamily: program.test_family as string,
      state: session ? (session.status === 'completed' ? 'done' : 'in_progress') : 'not_started',
      sessionId: session?.id ?? null,
      correctCount: session?.correct_count ?? null,
      totalCount: session?.total_count ?? null,
    })
  }
  return out
}
