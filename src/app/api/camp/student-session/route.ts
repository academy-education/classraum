import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import { canManageClassroom } from '@/lib/camp/api'

/**
 * GET /api/camp/student-session?sessionId=…
 *
 * The question-by-question review of ONE student's completed camp
 * session, for the classroom teacher (or academy manager) — the
 * teacher-side counterpart of the student's own TestResultView. Returns
 * every delivered question (passage, choices, key, explanation) together
 * with the student's stored answer and grade.
 *
 * Both halves come from study_attempts, which submit wrote in one pass:
 * `question` is the exact cached question the student saw (choices in
 * their shuffled order) and `student_answer`/`is_correct` are the graded
 * response. Reading the pair from one row means the answer can never be
 * shown against a differently-shuffled question.
 *
 * Auth: the session must be tagged to a camp assignment
 * (config.campAssignmentId) and the caller must manage that assignment's
 * classroom. Students and parents get 403 — this payload carries answer
 * keys and explanations, the same reason /api/camp/review-set GET is
 * teacher-only. A session that is not a camp session is a 404, so this
 * route can never become a generic read of arbitrary study sessions.
 */

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const { data: session } = await dbAdmin
    .from('study_sessions')
    .select('id, student_id, status, score, correct_count, total_count, completed_at, config')
    .eq('id', sessionId)
    .maybeSingle()
  if (!session) return NextResponse.json({ error: 'session not found' }, { status: 404 })

  const cfg = session.config as { campAssignmentId?: unknown } | null
  const assignmentId = typeof cfg?.campAssignmentId === 'string' ? cfg.campAssignmentId : null
  // Not a camp session → indistinguishable from absent, so the route
  // cannot be used to probe or read ordinary study sessions.
  if (!assignmentId) return NextResponse.json({ error: 'session not found' }, { status: 404 })

  const { data: assignment } = await dbAdmin
    .from('camp_assignments')
    .select('id, classroom_id, title, question_count')
    .eq('id', assignmentId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!assignment) return NextResponse.json({ error: 'assignment not found' }, { status: 404 })

  const { data: classroom } = await dbAdmin
    .from('classrooms')
    .select('id, name, teacher_id, academy_id, camp_program_id, deleted_at')
    .eq('id', assignment.classroom_id)
    .maybeSingle()
  if (!classroom || classroom.deleted_at !== null) {
    return NextResponse.json({ error: 'classroom not found' }, { status: 404 })
  }
  if (!(await canManageClassroom(user.id, classroom))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (session.status !== 'completed') {
    return NextResponse.json({ error: 'session is not completed yet', code: 'not_completed' }, { status: 409 })
  }

  const { data: attemptRows, error: attemptsError } = await dbAdmin
    .from('study_attempts')
    .select('position, question, student_answer, is_correct')
    .eq('session_id', session.id)
    // position is the delivery order (submit writes 0..N-1); id breaks
    // ties for legacy rows — same ordering the student summary uses.
    .order('position', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true })
  if (attemptsError) {
    return NextResponse.json({ error: attemptsError.message }, { status: 500 })
  }

  const { data: studentUser } = await dbAdmin
    .from('users')
    .select('id, name')
    .eq('id', session.student_id)
    .maybeSingle()

  return NextResponse.json({
    session: {
      id: session.id,
      studentId: session.student_id,
      studentName: (studentUser?.name as string | null) ?? null,
      correctCount: session.correct_count,
      totalCount: session.total_count,
      scorePercent: session.score !== null ? Math.round(session.score as number) : null,
      completedAt: session.completed_at,
    },
    assignment: {
      id: assignment.id,
      title: assignment.title,
      questionCount: assignment.question_count,
    },
    rows: (attemptRows ?? []).map(a => ({
      position: a.position as number | null,
      question: a.question,
      studentAnswer: (a.student_answer as string | null) ?? null,
      isCorrect: a.is_correct as boolean | null,
    })),
  })
}
