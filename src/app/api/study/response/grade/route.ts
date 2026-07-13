import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { awardXp } from '@/lib/study/xp'
import { notifyStudent } from '@/lib/study/notify'
import {
  GradeSchema,
  buildGraderPrompt,
  getRubric,
  type ResponseSkill,
  type ResponseTestFamily,
  type ResponseTaskType,
} from '@/lib/study/responseRubrics'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/response/grade — runs an essay or transcribed
 * speaking response through the rubric grader, persists submission +
 * grade rows, and returns the structured rubric breakdown.
 *
 * v1 grades against TOEFL or IELTS rubrics. The client always sends
 * the prompt text + response text — the audio file is stored
 * separately by the transcribe route and referenced here by path.
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
  taskType: z.enum(['email', 'academic_discussion']).nullable().optional(),
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
  const { data: session } = await supabaseAdmin
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

  const taskType = (body.taskType ?? undefined) as ResponseTaskType | undefined
  const rubric = getRubric(body.testFamily as ResponseTestFamily, body.skill as ResponseSkill, taskType)

  // ── Re-grade dedupe ────────────────────────────────────────────
  // Deterministic XP key: md5(session + prompt) folded into a UUID.
  // Grading the same task in the same session always produces the
  // same key, so award_study_xp can only ever land ONE
  // 'response_graded' event per task (unique index on
  // study_xp_events enforces it — re-grades collide and roll back
  // the award, closing the "re-grade the same answer for +20 XP
  // each time" farming loop). Revised responses still get fresh
  // FEEDBACK below; they just don't re-earn XP.
  const promptHash = createHash('md5').update(`${body.sessionId}:${body.promptText}`).digest('hex')
  const xpSourceId = [
    promptHash.slice(0, 8), promptHash.slice(8, 12), promptHash.slice(12, 16),
    promptHash.slice(16, 20), promptHash.slice(20, 32),
  ].join('-')

  // Identical prompt + response already graded in this session →
  // return the stored grade instead of paying for a fresh gpt-4o
  // call that would land on the same band anyway.
  const { data: prior } = await supabaseAdmin
    .from('study_response_submissions')
    .select('id, response_text, study_response_grades(overall_band, rubric_scores, annotations, model_rewrite, summary)')
    .eq('session_id', body.sessionId)
    .eq('student_id', user.id)
    .eq('prompt_text', body.promptText)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (prior && prior.response_text === body.responseText) {
    const priorGrade = Array.isArray(prior.study_response_grades)
      ? prior.study_response_grades[0]
      : prior.study_response_grades
    if (priorGrade) {
      return NextResponse.json({
        submissionId: prior.id,
        grade: {
          overallBand: Number(priorGrade.overall_band),
          criteria: priorGrade.rubric_scores,
          annotations: priorGrade.annotations,
          modelRewrite: priorGrade.model_rewrite,
          summary: priorGrade.summary,
        },
        scaleMax: rubric.scaleMax,
        cached: true,
      })
    }
  }

  const wordCount = body.responseText.trim().split(/\s+/).filter(Boolean).length
  const language = (session.language === 'ko' ? 'ko' : 'en') as 'ko' | 'en'

  const prompt = buildGraderPrompt({
    family: body.testFamily,
    skill: body.skill,
    taskType,
    promptText: body.promptText,
    responseText: body.responseText,
    durationSeconds: body.durationSeconds ?? null,
    wordCount,
    language,
    speechSignals: body.skill === 'speaking' ? {
      wpm: body.wpm ?? null,
      pauseCount: body.pauseCount ?? null,
      clarity: body.clarity ?? null,
    } : null,
  })

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  let grade
  let usage
  try {
    const result = await generateObject({
      model: openai('gpt-4o'),
      schema: GradeSchema,
      prompt,
      temperature: 0.2,
    })
    grade = result.object
    usage = result.usage
  } catch (err) {
    console.error('[response/grade] generation', err)
    return NextResponse.json({ error: 'grading failed' }, { status: 502 })
  }

  // Clamp the overall band to the rubric scale defensively.
  const clampedBand = Math.max(0, Math.min(rubric.scaleMax, grade.overallBand))

  // Persist submission.
  const { data: submission, error: submissionErr } = await supabaseAdmin
    .from('study_response_submissions')
    .insert({
      student_id: user.id,
      session_id: body.sessionId,
      test_family: body.testFamily,
      skill: body.skill,
      prompt_text: body.promptText,
      response_text: body.responseText,
      audio_path: body.audioPath ?? null,
      duration_seconds: body.durationSeconds ?? null,
      word_count: wordCount,
      language,
    })
    .select('id')
    .single()
  if (submissionErr || !submission) {
    console.error('[response/grade] insert submission', submissionErr)
    return NextResponse.json({ error: 'persist failed' }, { status: 500 })
  }

  // Persist grade.
  const { error: gradeErr } = await supabaseAdmin
    .from('study_response_grades')
    .insert({
      submission_id: submission.id,
      student_id: user.id,
      overall_band: clampedBand,
      rubric_scores: grade.criteria,
      annotations: grade.annotations,
      model_rewrite: grade.modelRewrite,
      summary: grade.summary,
      grader_model: 'gpt-4o',
      tokens_in: usage?.inputTokens ?? 0,
      tokens_out: usage?.outputTokens ?? 0,
    })
  if (gradeErr) {
    console.error('[response/grade] insert grade', gradeErr)
  }

  // Deterministic source key (NOT submission.id): re-grades of the
  // same task hit the partial unique index on study_xp_events and
  // the award rolls back — first grade per task is the only one
  // that pays out.
  void awardXp(user.id, 'response_graded', xpSourceId)
  // Inbox row — useful for the student to revisit their graded
  // response later from the bell icon without scrolling history.
  const skillLabel = body.skill === 'speaking' ? '말하기' : '작문'
  const familyLabel = body.testFamily.toUpperCase()
  void notifyStudent({
    studentId: user.id,
    kind: 'study_response_graded',
    title: `${familyLabel} ${skillLabel} 평가 완료 — ${Number.isInteger(clampedBand) ? clampedBand : clampedBand.toFixed(1)}점`,
    message: grade.summary.slice(0, 120),
    link: '/mobile/study',
  })

  return NextResponse.json({
    submissionId: submission.id,
    grade: { ...grade, overallBand: clampedBand },
    scaleMax: rubric.scaleMax,
  })
}
