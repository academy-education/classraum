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
  durationSeconds: z.number().int().nullable().optional(),
})

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

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
  if (session.mode !== 'response') {
    return NextResponse.json({ error: 'session is not in response mode' }, { status: 400 })
  }

  const taskType = (body.taskType ?? undefined) as ResponseTaskType | undefined
  const rubric = getRubric(body.testFamily as ResponseTestFamily, body.skill as ResponseSkill, taskType)

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

  void awardXp(user.id, 'response_graded', submission.id)
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
