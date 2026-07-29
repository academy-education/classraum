import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { dbAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { awardXp, XP_VALUES } from '@/lib/study/xp'
import { notifyStudent } from '@/lib/study/notify'
import {
  inferSpeakingTaskType,
  type ResponseSkill,
  type ResponseTestFamily,
  type ResponseTaskType,
} from '@/lib/study/responseRubrics'
import {
  gradeAndPersistResponse,
  GradeGenerationError,
  GradePersistError,
} from '@/lib/study/gradeResponse'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/response/grade — runs an essay or transcribed
 * speaking response through the staged ETS grader, persists submission
 * + grade rows, and returns the structured rubric breakdown.
 *
 * Grading is NOT a single holistic call — see
 * `src/lib/study/gradePipeline.ts`. Stage 1 is a hard zero gate,
 * stage 3 measures prompt echo / padding deterministically, stage 2
 * classifies relevance into an ETS level, stage 4 scores language
 * quality independently, and the final band is
 * min(languageScore, relevanceCeiling).
 *
 * The client always sends the prompt text + response text — the audio
 * file is stored separately by the transcribe route and referenced
 * here by path.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 90

const BodySchema = z.object({
  sessionId: z.string().uuid(),
  testFamily: z.enum(['toefl', 'ielts']),
  skill: z.enum(['speaking', 'writing']),
  /** Optional task-type discriminator. TOEFL Writing has two distinct
   *  tasks (email vs academic_discussion) that score on different
   *  criteria. When omitted, the base (family, skill) rubric applies. */
  taskType: z.enum(['email', 'academic_discussion', 'take_interview', 'listen_repeat']).nullable().optional(),
  promptText: z.string().min(10).max(2000),
  responseText: z.string().min(20).max(8000),
  audioPath: z.string().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
  /** Speaking only — real delivery signals extracted from the audio
   *  by Whisper. Included in the grader prompt so the delivery
   *  criterion reflects pace + hesitation + articulation. */
  wpm: z.number().nullable().optional(),
  pauseCount: z.number().int().nullable().optional(),
  clarity: z.number().min(0).max(1).nullable().optional(),
})

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(
    `response-grade:user:${user.id}`,
    { windowMs: 10 * 60 * 1000, max: 10 },
  )
  if (blocked) return blocked

  const rawBody = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(rawBody)
  if (!parsed.success) return NextResponse.json({ error: 'bad body', issues: parsed.error.issues }, { status: 400 })
  const body = parsed.data

  // Session ownership + mode check.
  const { data: session } = await dbAdmin
    .from('study_sessions')
    .select('id, student_id, mode, language')
    .eq('id', body.sessionId)
    .maybeSingle()
  if (!session || session.student_id !== user.id) {
    return NextResponse.json({ error: 'session not found' }, { status: 404 })
  }
  // Allow both 'response' mode (dedicated speaking/writing practice) and
  // 'full_test' mode (TOEFL Writing Email + Academic Discussion items
  // request rubric feedback from the post-test review pane).
  if (session.mode !== 'response' && session.mode !== 'full_test') {
    return NextResponse.json({ error: 'session mode does not support rubric grading' }, { status: 400 })
  }

  // TOEFL Speaking has two rubrics (Take an Interview vs Listen and
  // Repeat) and the session UI does not send a speaking taskType — so
  // recover it from the generator's prompt tag. Unrecognised prompts
  // fall back to Take an Interview, the rubric that checks relevance.
  const taskType = (body.taskType
    ?? (body.testFamily === 'toefl' && body.skill === 'speaking'
      ? inferSpeakingTaskType(body.promptText)
      : undefined)
    ?? undefined) as ResponseTaskType | undefined

  // Grading + persistence live in lib/study/gradeResponse so this route
  // and the whole-test batch cannot drift apart. What stays here is what
  // is genuinely per-request: the rate limit above, the premium gate, XP
  // and the notification below.
  let graded
  try {
    graded = await gradeAndPersistResponse({
      userId: user.id,
      sessionId: body.sessionId,
      sessionLanguage: session.language,
      testFamily: body.testFamily as ResponseTestFamily,
      skill: body.skill as ResponseSkill,
      taskType,
      promptText: body.promptText,
      responseText: body.responseText,
      audioPath: body.audioPath ?? null,
      durationSeconds: body.durationSeconds ?? null,
      wpm: body.wpm ?? null,
      pauseCount: body.pauseCount ?? null,
      clarity: body.clarity ?? null,
    })
  } catch (err) {
    if (err instanceof GradeGenerationError) {
      return NextResponse.json({ error: 'grading failed' }, { status: 502 })
    }
    if (err instanceof GradePersistError) {
      return NextResponse.json({ error: 'persist failed' }, { status: 500 })
    }
    throw err
  }
  if (graded.cached) {
    return NextResponse.json({
      submissionId: graded.submissionId,
      grade: graded.grade,
      scaleMax: graded.scaleMax,
      cached: true,
    })
  }
  const xpSourceId = graded.xpSourceId

  // Deterministic source key (NOT submission.id): re-grades of the
  // same task hit the partial unique index on study_xp_events and
  // the award rolls back — first grade per task is the only one
  // that pays out.
  void awardXp(user.id, 'response_graded', xpSourceId)

  // Mark the session completed with a 0-100 score (band / scaleMax) so it
  // stops showing "in progress" in history and gets a score chip — the
  // response mode never flipped its session status before.
  // Deliberately off the response path (the grade is already persisted and
  // returned), but a failure leaves the session stuck "in progress" in
  // history with no score chip, so it can't be silent.
  void dbAdmin
    .from('study_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      score: Math.round((graded.grade.overallBand / graded.scaleMax) * 100),
    })
    .eq('id', session.id)
    .eq('student_id', user.id)
    .then(({ error }) => {
      if (error) console.error('[response/grade] session completion write failed', { sessionId: session.id, error })
    })
  // Inbox row — useful for the student to revisit their graded
  // response later from the bell icon without scrolling history.
  const skillLabel = body.skill === 'speaking' ? '말하기' : '작문'
  const familyLabel = body.testFamily.toUpperCase()
  void notifyStudent({
    studentId: user.id,
    kind: 'study_response_graded',
    title: `${familyLabel} ${skillLabel} 평가 완료 — ${Number.isInteger(graded.grade.overallBand) ? graded.grade.overallBand : graded.grade.overallBand.toFixed(1)}점`,
    message: (graded.grade.summary ?? '').slice(0, 120),
    link: '/mobile/study',
  })

  const diag = graded.diagnostics
  return NextResponse.json({
    submissionId: graded.submissionId,
    grade: graded.grade,
    scaleMax: graded.scaleMax,
    // Diagnostics — why the band landed where it did. Purely additive;
    // the review panel ignores fields it doesn't know.
    relevance: diag?.relevanceLevel ? {
      level: diag.relevanceLevel,
      ceiling: diag.relevanceCeiling,
      applied: diag.ceilingApplied,
      languageScore: diag.languageScore,
    } : null,
    zeroReasons: diag?.zeroReasons ?? [],
    xpAwarded: XP_VALUES.response_graded,
  })
}
