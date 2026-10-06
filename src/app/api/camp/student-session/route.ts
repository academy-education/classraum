import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import {
  canViewClassroomCampResults,
  isStudentInProgram,
  isStudentOfAcademy,
} from '@/lib/camp/access'
import { testTiming } from '@/lib/study/test-result'
import type { ResultRowQuestion } from '@/lib/study/test-result'

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
 * (config.campAssignmentId), the caller must be a camp teacher of that
 * assignment's PROGRAM or an academy manager (src/lib/camp/access.ts —
 * owner rule 2026-10-07, "same camp"), and the student must still be in
 * that camp and on the academy's roster. Students and parents get 403 — this payload carries answer
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
    .select('id, student_id, status, score, correct_count, total_count, created_at, completed_at, config')
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
  if (!(await canViewClassroomCampResults(user.id, classroom))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // canViewClassroomCampResults has already proven camp_program_id is a
  // live program of the classroom's academy.
  const program = { id: classroom.camp_program_id as string, academy_id: classroom.academy_id as string }
  const [inCamp, onRoster] = await Promise.all([
    isStudentInProgram(session.student_id as string, program),
    isStudentOfAcademy(session.student_id as string, program.academy_id),
  ])
  if (!inCamp || !onRoster) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (session.status !== 'completed') {
    return NextResponse.json({ error: 'session is not completed yet', code: 'not_completed' }, { status: 409 })
  }

  const { data: attemptRows, error: attemptsError } = await dbAdmin
    .from('study_attempts')
    .select('position, question, student_answer, is_correct, time_spent_seconds')
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

  const attempts = (attemptRows ?? []) as Array<{
    position: number | null
    question: unknown
    student_answer: string | null
    is_correct: boolean | null
    time_spent_seconds: number | null
  }>

  /* Time per question. study_attempts.time_spent_seconds LOOKS
     per-question and, for every session submitted before per-question
     capture (2026-10-02) or whose client times did not reconcile, is the
     whole sitting divided evenly. testTiming() is the one place that
     tells the two apart; a per-row time is shown only when the rows are
     genuinely measured, never an even split dressed as a measurement. */
  const timing = testTiming({
    rows: attempts.map(a => ({
      question: a.question as ResultRowQuestion,
      timeSpentSeconds: a.time_spent_seconds,
    })),
    deliveredTotal: attempts.length,
  })
  const perRowTime = timing?.basis === 'measured'

  return NextResponse.json({
    session: {
      id: session.id,
      studentId: session.student_id,
      studentName: (studentUser?.name as string | null) ?? null,
      correctCount: session.correct_count,
      totalCount: session.total_count,
      scorePercent: session.score !== null ? Math.round(session.score as number) : null,
      startedAt: session.created_at,
      completedAt: session.completed_at,
    },
    assignment: {
      id: assignment.id,
      title: assignment.title,
      questionCount: assignment.question_count,
    },
    timing: timing
      ? {
          totalSeconds: Math.round(timing.totalSeconds),
          perQuestionSeconds: Math.round(timing.perQuestionSeconds),
          basis: timing.basis,
        }
      : null,
    rows: attempts.map(a => ({
      position: a.position,
      question: a.question,
      studentAnswer: a.student_answer ?? null,
      isCorrect: a.is_correct,
      timeSpentSeconds: perRowTime ? a.time_spent_seconds : null,
    })),
  })
}
