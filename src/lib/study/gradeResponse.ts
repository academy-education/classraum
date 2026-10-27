import { createHash } from 'crypto'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import type { z } from 'zod'
import { dbAdmin } from '@/lib/supabase-admin'
import type { Database } from '@/lib/database.types'
import {
  gradeSchemaForCriteria,
  getRubric,
  type ResponseSkill,
  type ResponseTestFamily,
  type ResponseTaskType,
} from '@/lib/study/responseRubrics'
import { runStagedGrade, type QualityStageCall, type TextStageCall } from '@/lib/study/gradePipeline'
import { composeGraderPrompt } from '@/lib/study/openResponse'
import type { PracticeEssayTask } from '@/lib/study/essayChoice'
import { isPracticeEssayFamily, PRACTICE_SCALE_MAX, type PracticeEssayFamily } from '@/lib/study/practiceEssay'
import { runPracticeEssayGrade, type PracticeEssayCall } from '@/lib/study/practiceEssayGrader'

/**
 * Grade ONE open response and persist it.
 *
 * Extracted from api/study/response/grade so the per-item request and
 * the whole-test batch run identical code. Grading was about to become
 * the fourth thing in this codebase implemented twice — after the three
 * result renderers, the copied test-state icons, and the duplicated
 * "is this SAT?" rule, each of which produced a real bug. The route
 * keeps what is genuinely per-request (auth, rate limit, premium gate,
 * XP, notification); everything below is the grading itself.
 */
export interface GradeResponseParams {
  userId: string
  sessionId: string
  /** study_sessions.language — anything other than 'ko' grades as 'en'. */
  sessionLanguage: string | null
  /** 'ssat' / 'isee' are the PRACTICE essay families (practiceEssay.ts):
   *  graded for feedback by our own practice rubric, never scored. */
  testFamily: ResponseTestFamily | PracticeEssayFamily
  skill: ResponseSkill
  taskType?: ResponseTaskType
  promptText: string
  responseText: string
  audioPath?: string | null
  durationSeconds?: number | null
  wpm?: number | null
  pauseCount?: number | null
  clarity?: number | null
  /** Supplied by the audio route, which grades from the recording. */
  qualityStage?: QualityStageCall
  /** Practice essays only, and required for them: the CHOSEN prompt and
   *  the essay text with the choice marker removed (essayChoice.ts). The
   *  grader reads these; `promptText`/`responseText` stay the bare
   *  instruction and the stored answer, because those are the dedupe key
   *  and the key the result screen joins a grade back to its question on. */
  practiceTask?: PracticeEssayTask
  /** Tests inject this so no real model is called. */
  practiceCall?: PracticeEssayCall
}

export interface GradedResponse {
  submissionId: string
  grade: {
    overallBand: number
    criteria: unknown
    annotations: unknown
    modelRewrite: string | null
    summary: string | null
  }
  scaleMax: number
  /** True when an identical prompt+response was already graded here. */
  cached: boolean
  /** Deterministic md5(session:prompt) UUID — the XP dedupe key. */
  xpSourceId: string
  /** Why the band landed where it did. Null on the cached path, which
   *  returns a stored grade and never re-runs the pipeline. */
  diagnostics: {
    relevanceLevel: string | null
    relevanceCeiling: number | null
    ceilingApplied: boolean
    languageScore: number | null
    zeroReasons: string[]
  } | null
}

export class GradeGenerationError extends Error {}
export class GradePersistError extends Error {}

/** md5(session:prompt) folded into a UUID. Deterministic so re-grading
 *  one task collides on study_xp_events' unique index and cannot farm
 *  XP; feedback still refreshes, only the award is once. */
export function xpSourceIdFor(sessionId: string, promptText: string): string {
  const h = createHash('md5').update(`${sessionId}:${promptText}`).digest('hex')
  return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20, 32)].join('-')
}

/**
 * The OpenAI stage callbacks, as production runs them.
 *
 * Exported so `scripts/calibrate-grader.ts` measures the real pipeline
 * rather than a second copy that could drift from it. A calibration
 * harness grading through different model calls than the app would be
 * measuring the wrong thing while looking authoritative.
 */
export function openAiStages(): { text: TextStageCall; quality: QualityStageCall } {
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return {
    // Stages 1-2 are cheap classification — a mini model at temperature 0
    // is both sufficient and more consistent for a yes/no gate and a
    // 6-way ladder. Stage 4 (language quality) keeps gpt-4o.
    text: async ({ schema, schemaName, prompt }) => {
      const r = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: schema as z.ZodType<unknown>,
        schemaName,
        prompt,
        temperature: 0,
      })
      return {
        object: r.object as never,
        usage: { tokensIn: r.usage?.inputTokens ?? 0, tokensOut: r.usage?.outputTokens ?? 0 },
      }
    },
    quality: async ({ prompt, criterionKeys }) => {
      const r = await generateObject({
        model: openai('gpt-4o'),
        // Pinned to the rubric's own keys — see gradeSchemaForCriteria.
        schema: gradeSchemaForCriteria(criterionKeys),
        schemaName: 'rubric_grade',
        prompt,
        temperature: 0,
      })
      return {
        object: r.object,
        usage: { tokensIn: r.usage?.inputTokens ?? 0, tokensOut: r.usage?.outputTokens ?? 0 },
      }
    },
  }
}

/**
 * The practice-essay model call: the same provider, model and settings as
 * the quality stage in openAiStages (gpt-4o, temperature 0, generateObject).
 */
export function openAiPracticeEssayCall(): PracticeEssayCall {
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return async ({ schema, schemaName, prompt }) => {
    const r = await generateObject({
      model: openai('gpt-4o'),
      schema,
      schemaName,
      prompt,
      temperature: 0,
    })
    return {
      object: r.object,
      usage: { tokensIn: r.usage?.inputTokens ?? 0, tokensOut: r.usage?.outputTokens ?? 0 },
    }
  }
}

/** What one grading run produced, in the shape the grade row stores. */
interface ProducedGrade {
  grade: {
    overallBand: number
    criteria: unknown
    annotations: unknown
    modelRewrite: string | null
    summary: string | null
  }
  usage: { tokensIn: number; tokensOut: number }
  graderModel: string
  diagnostics: GradedResponse['diagnostics']
}

export async function gradeAndPersistResponse(p: GradeResponseParams): Promise<GradedResponse> {
  const practice = isPracticeEssayFamily(p.testFamily)
  if (practice && !p.practiceTask) {
    // A practice essay graded without its resolved task would be scored
    // against the bare "choose one of the two prompts" instruction.
    throw new GradeGenerationError('practice essay graded without its chosen prompt')
  }
  const scaleMax = practice
    ? PRACTICE_SCALE_MAX
    : getRubric(p.testFamily as ResponseTestFamily, p.skill, p.taskType).scaleMax
  const xpSourceId = xpSourceIdFor(p.sessionId, p.promptText)

  // Identical prompt + response already graded in this session → return
  // the stored grade rather than paying for a gpt-4o call that would
  // land on the same band. This is also what makes the batch idempotent:
  // re-running it after a partial failure only grades what is missing.
  const { data: prior } = await dbAdmin
    .from('study_response_submissions')
    .select('id, response_text, study_response_grades(overall_band, rubric_scores, annotations, model_rewrite, summary)')
    .eq('session_id', p.sessionId)
    .eq('student_id', p.userId)
    .eq('prompt_text', p.promptText)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (prior && prior.response_text === p.responseText) {
    const g = Array.isArray(prior.study_response_grades)
      ? prior.study_response_grades[0]
      : prior.study_response_grades
    if (g) {
      return {
        submissionId: prior.id,
        grade: {
          overallBand: Number(g.overall_band),
          criteria: g.rubric_scores,
          annotations: g.annotations,
          modelRewrite: g.model_rewrite,
          summary: g.summary,
        },
        scaleMax,
        cached: true,
        xpSourceId,
        diagnostics: null,
      }
    }
  }

  const gradedText = practice ? p.practiceTask!.essayText : p.responseText
  const wordCount = gradedText.trim().split(/\s+/).filter(Boolean).length
  const language = (p.sessionLanguage === 'ko' ? 'ko' : 'en') as 'ko' | 'en'

  const produced = practice
    ? await producePracticeGrade(p, language)
    : await produceStagedGrade(p, language, wordCount)
  const grade = produced.grade
  const usage = produced.usage
  const clampedBand = Math.max(0, Math.min(scaleMax, grade.overallBand))

  // Persist. The cache check at the top is a read followed by this write,
  // so two callers a second apart (grade-batch + the review panel, or a
  // retried batch) both miss it and both get here — that is exactly what
  // put four submission rows and two disagreeing bands on one TOEFL Writing
  // test. Migration 115 makes (session, student, prompt, response) unique
  // for text grades and one grade per submission, so the loser's insert
  // fails with 23505 and it adopts the stored row instead: both callers
  // report the SAME band, and the result screen has one row to read.
  const gradeRow: GradeRowFields = {
    student_id: p.userId,
    overall_band: clampedBand,
    rubric_scores: grade.criteria as GradeRowFields['rubric_scores'],
    annotations: grade.annotations as GradeRowFields['annotations'],
    model_rewrite: grade.modelRewrite,
    summary: grade.summary,
    grader_model: produced.graderModel,
    tokens_in: usage.tokensIn,
    tokens_out: usage.tokensOut,
  }
  const { data: submission, error: submissionErr } = await dbAdmin
    .from('study_response_submissions')
    .insert({
      student_id: p.userId,
      session_id: p.sessionId,
      test_family: p.testFamily,
      skill: p.skill,
      prompt_text: p.promptText,
      response_text: p.responseText,
      audio_path: p.audioPath ?? null,
      // MediaRecorder reports a float; the column is INTEGER. An
      // unrounded value made PostgREST reject the whole insert with
      // 22P02 and threw away a grade we had already paid for.
      duration_seconds: p.durationSeconds == null
        ? null
        : Math.max(0, Math.round(p.durationSeconds)),
      word_count: wordCount,
      language,
    })
    .select('id')
    .single()

  let submissionId: string
  if (submissionErr && isUniqueViolation(submissionErr)) {
    const adopted = await adoptStoredSubmission(p, gradeRow)
    if (adopted.kind === 'stored') {
      return {
        submissionId: adopted.submissionId,
        grade: adopted.grade,
        scaleMax,
        cached: true,
        xpSourceId,
        diagnostics: null,
      }
    }
    submissionId = adopted.submissionId
  } else if (submissionErr || !submission) {
    console.error('[gradeResponse] insert submission', submissionErr)
    throw new GradePersistError(submissionErr?.message ?? 'insert submission failed')
  } else {
    submissionId = submission.id
    const { error: gradeErr } = await dbAdmin
      .from('study_response_grades')
      .insert({ submission_id: submissionId, ...gradeRow })
    if (gradeErr && isUniqueViolation(gradeErr)) {
      // A concurrent caller adopted our row and attached ITS grade first.
      // One grade per submission: report that one, not ours.
      const adopted = await adoptStoredSubmission(p, gradeRow)
      if (adopted.kind === 'stored') {
        return {
          submissionId: adopted.submissionId,
          grade: adopted.grade,
          scaleMax,
          cached: true,
          xpSourceId,
          diagnostics: null,
        }
      }
    } else if (gradeErr) {
      // The submission row exists; a missing grade row means the next run
      // finds the submission, adopts it and attaches a grade.
      console.error('[gradeResponse] insert grade', gradeErr)
      throw new GradePersistError(gradeErr.message)
    }
  }

  return {
    submissionId,
    grade: {
      overallBand: clampedBand,
      criteria: grade.criteria,
      annotations: grade.annotations,
      modelRewrite: grade.modelRewrite,
      summary: grade.summary,
    },
    scaleMax,
    cached: false,
    xpSourceId,
    diagnostics: produced.diagnostics,
  }
}

/** TOEFL / IELTS: the staged ETS pipeline, exactly as before. */
async function produceStagedGrade(
  p: GradeResponseParams,
  language: 'en' | 'ko',
  wordCount: number,
): Promise<ProducedGrade> {
  const { text: textStage, quality: defaultQuality } = openAiStages()
  // The task the grader is scoring against lives in the attempt's
  // `passage`, not in `promptText` — see composeGraderPrompt. Resolved
  // HERE rather than in the two routes so the per-item request and the
  // batch cannot disagree about what the task was, and so `prompt_text`
  // stays the bare instruction: it is the dedupe key AND the join key
  // the result screen uses to match a grade back to its question.
  const { data: attempt } = await dbAdmin
    .from('study_attempts')
    .select('question')
    .eq('session_id', p.sessionId)
    .eq('question->>prompt', p.promptText)
    .limit(1)
    .maybeSingle()
  const passage = (attempt?.question as { passage?: string | null } | null)?.passage ?? null
  const graderPrompt = composeGraderPrompt(passage, p.promptText)

  let staged
  try {
    staged = await runStagedGrade({
      family: p.testFamily as ResponseTestFamily,
      skill: p.skill,
      taskType: p.taskType,
      promptText: graderPrompt,
      responseText: p.responseText,
      durationSeconds: p.durationSeconds ?? null,
      wordCount,
      language,
      speechSignals: p.skill === 'speaking' ? {
        wpm: p.wpm ?? null,
        pauseCount: p.pauseCount ?? null,
        clarity: p.clarity ?? null,
      } : null,
    }, { text: textStage, quality: p.qualityStage ?? defaultQuality })
  } catch (err) {
    console.error('[gradeResponse] generation', err)
    throw new GradeGenerationError(err instanceof Error ? err.message : 'grading failed')
  }

  return {
    grade: staged.grade,
    usage: staged.usage,
    graderModel: 'gpt-4o+staged-ets',
    diagnostics: {
      relevanceLevel: staged.relevance?.level ?? null,
      relevanceCeiling: staged.relevanceCeiling,
      ceilingApplied: staged.ceilingApplied,
      languageScore: staged.languageScore,
      zeroReasons: staged.zeroReasons,
    },
  }
}

/**
 * SSAT / ISEE practice essays: our practice rubric, one call. Any failure
 * throws GradeGenerationError — the batch reports the item as failed and the
 * result screen shows "feedback unavailable / retry". It never becomes a band.
 */
async function producePracticeGrade(
  p: GradeResponseParams,
  language: 'en' | 'ko',
): Promise<ProducedGrade> {
  let r
  try {
    r = await runPracticeEssayGrade(
      { family: p.testFamily as PracticeEssayFamily, task: p.practiceTask!, language },
      p.practiceCall ?? openAiPracticeEssayCall(),
    )
  } catch (err) {
    console.error('[gradeResponse] practice essay generation', err)
    throw new GradeGenerationError(err instanceof Error ? err.message : 'grading failed')
  }
  return {
    grade: {
      overallBand: r.overallBand,
      criteria: r.criteria,
      annotations: r.annotations,
      modelRewrite: null,
      summary: r.summary,
    },
    usage: r.usage,
    graderModel: 'gpt-4o+practice-essay-v1',
    diagnostics: null,
  }
}

function isUniqueViolation(e: unknown): boolean {
  return !!e && typeof e === 'object' && (e as { code?: string }).code === '23505'
}

type StoredGrade = GradedResponse['grade']
type GradeRowFields = Omit<Database['public']['Tables']['study_response_grades']['Insert'], 'submission_id'>
type AdoptResult =
  | { kind: 'stored'; submissionId: string; grade: StoredGrade }
  | { kind: 'attached'; submissionId: string }

/** A concurrent caller already inserted this (session, student, prompt,
 *  response) text submission. Return its grade if it has one; otherwise
 *  attach ours to it. A 23505 on that attach means the other caller's
 *  grade landed first — return that one, so both report the same band. */
async function adoptStoredSubmission(
  p: GradeResponseParams,
  gradeRow: GradeRowFields,
): Promise<AdoptResult> {
  const read = async () => {
    const { data, error } = await dbAdmin
      .from('study_response_submissions')
      .select('id, response_text, study_response_grades(overall_band, rubric_scores, annotations, model_rewrite, summary)')
      .eq('session_id', p.sessionId)
      .eq('student_id', p.userId)
      .eq('prompt_text', p.promptText)
      .eq('grader_route', 'text')
      .order('created_at', { ascending: false })
    if (error) throw new GradePersistError(error.message)
    const row = (data ?? []).find(r => r.response_text === p.responseText)
    if (!row) throw new GradePersistError('unique violation but no stored submission found')
    const g = Array.isArray(row.study_response_grades) ? row.study_response_grades[0] : row.study_response_grades
    return { id: row.id as string, g }
  }
  const toGrade = (g: { overall_band: unknown; rubric_scores: unknown; annotations: unknown; model_rewrite: string | null; summary: string | null }): StoredGrade => ({
    overallBand: Number(g.overall_band),
    criteria: g.rubric_scores,
    annotations: g.annotations,
    modelRewrite: g.model_rewrite,
    summary: g.summary,
  })

  const first = await read()
  if (first.g) return { kind: 'stored', submissionId: first.id, grade: toGrade(first.g) }

  const { error } = await dbAdmin
    .from('study_response_grades')
    .insert({ submission_id: first.id, ...gradeRow })
  if (!error) return { kind: 'attached', submissionId: first.id }
  if (!isUniqueViolation(error)) throw new GradePersistError(error.message)
  const again = await read()
  if (!again.g) throw new GradePersistError('grade unique violation but no stored grade found')
  return { kind: 'stored', submissionId: again.id, grade: toGrade(again.g) }
}
