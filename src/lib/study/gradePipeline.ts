import { z } from 'zod'
import {
  GradeSchema,
  RelevanceSchema,
  ZeroGateSchema,
  getAnchor,
  getRubric,
  relevanceCeiling,
  zeroGateReasons,
  zeroGateTriggered,
  type Grade,
  type Relevance,
  type ResponseSkill,
  type ResponseTaskType,
  type ResponseTestFamily,
  type RubricSpec,
  type ZeroGate,
} from './responseRubrics'

/**
 * Staged ETS-parity grader for Speaking + Writing responses.
 *
 * A single holistic LLM call is systematically lenient: it anchors on
 * fluency, then rationalises partial relevance ("the student does
 * mention education...") into a middling band. ETS does the opposite —
 * relevance to the prompt is a gate, not one ingredient of an average.
 *
 * The pipeline therefore runs in stages:
 *
 *   Stage 1 — HARD ZERO GATE. Its own cheap call, prompt + response
 *             only, asked as independent yes/no classifications of the
 *             verbatim ETS 0-band conditions. Any one true → 0 and no
 *             further calls. Never shares a call with quality scoring.
 *
 *   Stage 3 — PADDING / PROMPT-ECHO ANALYSIS. Deterministic, no model:
 *             what fraction of the response's content words come from
 *             the prompt, and how much of it is repetition. Computed
 *             first and injected into stage 2 as evidence.
 *
 *   Stage 2 — RELEVANCE LADDER. Classifies the response into exactly
 *             one ETS relevance level, quoting on-topic, off-topic and
 *             borrowed spans BEFORE choosing the level. The level maps
 *             to a band CEILING.
 *
 *   Stage 4 — LANGUAGE / DELIVERY QUALITY, scored independently of
 *             relevance so the two signals cannot contaminate one
 *             another.
 *
 *   final = min(languageScore, relevanceCeiling)
 *
 * Stages 2 and 4 run in parallel. Everything is temperature 0 and
 * schema-validated with Zod.
 */

// ---------------------------------------------------------------------------
// Stage 3 — deterministic padding / prompt-echo detection
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'so', 'because', 'as', 'of', 'at',
  'by', 'for', 'with', 'about', 'into', 'to', 'from', 'in', 'on', 'off', 'over',
  'under', 'again', 'then', 'once', 'here', 'there', 'all', 'any', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'than', 'too', 'very', 'can', 'will', 'just', 'do',
  'does', 'did', 'doing', 'be', 'is', 'am', 'are', 'was', 'were', 'been',
  'being', 'have', 'has', 'had', 'having', 'i', 'me', 'my', 'we', 'our', 'you',
  'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them',
  'their', 'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom',
  'when', 'where', 'why', 'how', 'would', 'could', 'should', 'may', 'might',
  'must', 'shall', 'also', 'up', 'down', 'out', 'now', 'like', 'well', 'um',
  'uh', 'er', 'ah', 'yeah', 'okay', 'ok', 's', 't', 'don', 'doesn', 'isn',
])

export interface PaddingSignals {
  /** Content words in the response (stopwords + fillers removed). */
  contentWordCount: number
  /** Fraction of response content words that also occur in the prompt.
   *  ETS names prompt recycling explicitly at band 2. */
  promptEchoRatio: number
  /** Fraction of response content words that are repeats of an earlier
   *  content word — the padding-by-restatement signal. */
  repetitionRatio: number
  /** Longest run of consecutive words copied verbatim from the prompt. */
  longestBorrowedRun: number
  /** Convenience flag for the stage 2 prompt. */
  looksRecycled: boolean
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function contentWords(tokens: string[]): string[] {
  return tokens.filter(t => t.length > 1 && !STOPWORDS.has(t))
}

/** Longest run of consecutive response words that appears verbatim in
 *  the prompt. Catches copy-paste that echo ratio alone can miss. */
function longestCommonRun(promptTokens: string[], responseTokens: string[]): number {
  if (promptTokens.length === 0 || responseTokens.length === 0) return 0
  const promptJoined = ` ${promptTokens.join(' ')} `
  let best = 0
  for (let i = 0; i < responseTokens.length; i++) {
    // Extend from i while the window still occurs in the prompt.
    let run = 0
    for (let j = i; j < responseTokens.length; j++) {
      const window = responseTokens.slice(i, j + 1).join(' ')
      if (!promptJoined.includes(` ${window} `)) break
      run = j - i + 1
      if (run > 40) break
    }
    if (run > best) best = run
    if (best > 40) break
  }
  return best
}

/**
 * Stage 3. Pure, deterministic, no model call. Feeds stage 2 rather
 * than scoring on its own — the numbers are evidence a rater would
 * otherwise have to eyeball.
 */
export function analyzePadding(promptText: string, responseText: string): PaddingSignals {
  const promptTokens = tokenize(promptText)
  const responseTokens = tokenize(responseText)
  const promptContent = new Set(contentWords(promptTokens))
  const responseContent = contentWords(responseTokens)
  const total = responseContent.length
  if (total === 0) {
    return {
      contentWordCount: 0,
      promptEchoRatio: 0,
      repetitionRatio: 0,
      longestBorrowedRun: 0,
      looksRecycled: false,
    }
  }
  const echoed = responseContent.filter(w => promptContent.has(w)).length
  const distinct = new Set(responseContent).size
  const promptEchoRatio = echoed / total
  const repetitionRatio = 1 - distinct / total
  const longestBorrowedRun = longestCommonRun(promptTokens, responseTokens)
  return {
    contentWordCount: total,
    promptEchoRatio: Math.round(promptEchoRatio * 100) / 100,
    repetitionRatio: Math.round(repetitionRatio * 100) / 100,
    longestBorrowedRun,
    // "Mainly language from the question" territory: either most of the
    // vocabulary is the prompt's, or a long verbatim run was lifted.
    looksRecycled: promptEchoRatio >= 0.6 || longestBorrowedRun >= 8,
  }
}

// ---------------------------------------------------------------------------
// Ceiling enforcement
// ---------------------------------------------------------------------------

/**
 * The core leniency fix: the relevance level is a CEILING, never an
 * average term. A fluent response that only vaguely tracks the prompt
 * is an ETS 1–2, not a 3.5.
 */
export function applyCeiling(languageScore: number, ceiling: number): number {
  return Math.min(languageScore, ceiling)
}

/**
 * Rewrite a Grade so the overall band and the relevance-bearing
 * criterion both respect the ceiling. Non-relevance criteria keep their
 * independently computed scores — the student still sees that their
 * grammar was strong even though the answer was off topic.
 */
export function enforceRelevanceCeiling(
  grade: Grade,
  rubric: RubricSpec,
  ceiling: number,
  /** Why the relevance stage landed where it did. Becomes the student-
   *  facing evidence on the relevance criterion, which the quality rater
   *  never sees and therefore cannot explain. */
  relevanceEvidence?: string,
): { grade: Grade; ceilingApplied: boolean; languageScore: number } {
  const languageScore = clamp(grade.overallBand, rubric.scaleMax)
  const capped = applyCeiling(languageScore, ceiling)
  const others = grade.criteria
    .filter(c => c.key !== rubric.relevanceCriterionKey)
    .map(c => ({ ...c, score: clamp(c.score, rubric.scaleMax) }))
  // The relevance criterion is OWNED by the relevance stage. It is set
  // here rather than min()'d out of whatever the quality rater returned,
  // because that rater is told not to judge relevance at all.
  const criteria = rubric.relevanceCriterionKey
    ? [
        ...others,
        {
          key: rubric.relevanceCriterionKey,
          score: clamp(ceiling, rubric.scaleMax),
          evidence: relevanceEvidence ?? '',
        },
      ]
    : others
  return {
    grade: { ...grade, criteria, overallBand: capped },
    ceilingApplied: capped < languageScore,
    languageScore,
  }
}

function clamp(n: number, max: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(max, n))
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function outputLanguageLine(language: 'en' | 'ko'): string {
  return language === 'ko'
    ? 'Output language: Korean (모든 평가·코멘트·요약·재작성은 한국어로 작성. 단, 인용("quote"/"evidence" 안의 원문 인용) 부분은 학습자가 말하거나 쓴 원문 그대로 영어로 인용).'
    : 'Output language: English.'
}

export interface StageContext {
  family: ResponseTestFamily
  skill: ResponseSkill
  taskType?: ResponseTaskType
  promptText: string
  responseText: string
  language: 'en' | 'ko'
  wordCount?: number | null
  durationSeconds?: number | null
  speechSignals?: {
    wpm?: number | null
    pauseCount?: number | null
    clarity?: number | null
  } | null
  /** True when the quality stage listens to the recording directly. */
  audioNative?: boolean
}

export function buildZeroGatePrompt(ctx: StageContext): string {
  return `You are applying the official ETS 0-band rules. This is a CLASSIFICATION task, not a scoring task. Do NOT judge how good the response is — only whether one of the automatic-zero conditions applies.

A response scores 0 if ANY of the following is true:
- there is no response, or it consists only of phrases such as "I don't know";
- it is not in English;
- it is entirely unintelligible;
- the writer/speaker rejects or refuses the topic instead of responding to it;
- it is entirely copied from the prompt, with no original language;
- its content is ENTIRELY UNCONNECTED to the prompt (it answers some other question);
- it is arbitrary keystrokes or random characters.

Be strict about "entirely". A response that is weak, short, vague, or only partly relevant is NOT a 0 — that is handled elsewhere. Only mark a flag true when the condition fully applies.

First quote the response and reason about it. Only then set the flags.

${outputLanguageLine(ctx.language)}

----- PROMPT GIVEN TO THE STUDENT -----
${ctx.promptText}

----- STUDENT RESPONSE -----
${ctx.responseText}
`.trim()
}

export function buildRelevancePrompt(ctx: StageContext, padding: PaddingSignals): string {
  return `You are an ETS rater judging ONE thing only: how well this response addresses the prompt, and how well the on-topic content is elaborated. Do NOT score grammar, pronunciation, pace, or vocabulary — those are graded separately and must not influence your answer. A fluent, well-formed response that does not answer the question is a LOW relevance level, not a middling one.

Choose exactly one level:
- "fully_on_topic_well_elaborated": fully addresses the prompt; on topic and well elaborated with explanation, examples, or detail.
- "on_topic_elaborated": addresses the prompt; on topic and elaborated, though connections between ideas may be loose.
- "generally_on_topic_limited_elaboration": generally on topic, but elaboration is relatively limited — points are asserted and dropped.
- "minimally_connected": minimally connected to the prompt, with little or no RELEVANT elaboration, OR consisting mainly of language taken from the prompt.
- "vaguely_connected": only vaguely connected to the language of the prompt; isolated words or phrases that echo it.
- "entirely_unconnected": the content does not relate to the prompt at all.

Rules you must follow:
1. IRRELEVANT ELABORATION COUNTS AGAINST THE RESPONSE. Length spent on content that does not answer the prompt is not development — it is padding, and it lowers the level. Never treat "but they wrote a lot" as evidence of elaboration.
2. Language recycled from the prompt is not the responder's own content. If the response is mainly built from the prompt's own words, the level cannot be higher than "minimally_connected".
3. Restating the same idea in different words is not elaboration.
4. Quote the evidence spans BEFORE choosing a level. If you cannot quote a span that genuinely addresses the prompt, the level cannot be higher than "minimally_connected".

Deterministic text signals already computed for you (use as corroborating evidence, not as the sole basis):
- content words in the response: ${padding.contentWordCount}
- share of the response's content words that also appear in the prompt: ${padding.promptEchoRatio}
- share of content words that are repeats of an earlier word (padding by restatement): ${padding.repetitionRatio}
- longest run of consecutive words copied verbatim from the prompt: ${padding.longestBorrowedRun} words
- heuristic verdict: ${padding.looksRecycled ? 'the response appears to be built mainly from the prompt\'s own language' : 'no strong prompt-recycling signal'}

${outputLanguageLine(ctx.language)} Quote spans in the student's original English.

----- PROMPT GIVEN TO THE STUDENT -----
${ctx.promptText}

----- STUDENT RESPONSE -----
${ctx.responseText}
`.trim()
}

export function buildQualityPrompt(ctx: StageContext): string {
  const rubric = getRubric(ctx.family, ctx.skill, ctx.taskType)
  const criteriaList = rubric.criteria.map(c => `  - "${c.key}" (${c.label}, 0–${c.max})`).join('\n')
  const anchor = getAnchor(ctx.family, ctx.skill, ctx.taskType)

  const meta = ctx.skill === 'writing'
    ? `Words written: ${ctx.wordCount ?? 'unknown'}. Time limit: ${rubric.timeLimit.value} minutes. Target: ${rubric.target}.`
    : `Spoken duration: ${ctx.durationSeconds ?? 'unknown'}s. Time limit: ${rubric.timeLimit.value}s${rubric.timeLimit.prepSeconds ? ` after ${rubric.timeLimit.prepSeconds}s preparation` : ' with NO preparation time'}. Target: ${rubric.target}.`

  let delivery = ''
  if (ctx.skill === 'speaking' && ctx.speechSignals) {
    const s = ctx.speechSignals
    const pace = s.wpm == null ? ''
      : s.wpm < 100 ? 'Slow / halting.'
      : s.wpm > 190 ? 'Rushed — may sacrifice clarity.'
      : 'Natural pace.'
    const clarity = s.clarity == null ? ''
      : s.clarity < 0.5 ? 'Weak transcription confidence — pronunciation is likely unclear.'
      : s.clarity < 0.75 ? 'Fair clarity.'
      : 'Clear articulation.'
    delivery = `

DELIVERY SIGNALS (measured from the student's actual recording):
- Speaking rate: ${s.wpm ?? 'unknown'} words per minute. ${pace}
- Pauses ≥700 ms: ${s.pauseCount ?? 'unknown'}. High counts indicate hesitation.
- Recognition clarity: ${s.clarity != null ? s.clarity.toFixed(2) : 'unknown'} on a 0-1 scale. ${clarity}
Use these for the delivery criterion only. Frequent or lengthy pauses and choppy rhythm cap delivery at 3 under the ETS descriptors even when the language is otherwise strong.`
  }

  const audioLine = ctx.audioNative
    ? '\nThe student\'s recording is attached. LISTEN to it — judge pronunciation, stress, intonation and pausing from what you actually hear, not from the transcript.\n'
    : ''

  return `You are an ETS-calibrated ${ctx.family.toUpperCase()} ${ctx.skill} rater.
${audioLine}
Score the LANGUAGE AND ${ctx.skill === 'speaking' ? 'DELIVERY' : 'WRITING'} QUALITY of the response against the official rubric below.

IMPORTANT: relevance to the prompt is being judged separately by another rater and will be applied as a ceiling on top of your score. Do not double-count it, and do not inflate your score because the response is long — grade the quality of the language you actually see${ctx.audioNative ? ' and hear' : ''}.

Rubric (0–${rubric.scaleMax}, official scale):
${criteriaList}

Official band descriptors:
${rubric.bandDescriptors}

Note the ETS asymmetry: at the top bands a response must display ALL of the listed features; at the bottom bands (2 and 1) ONE OR MORE of the listed features is enough to place the response there.

Method — follow it in this order:
1. For each criterion, quote the exact span that justifies the band, then explain in one sentence. Write the evidence BEFORE the number.
2. Only then assign each criterion's score.
3. Only then assign the overall band.

Annotate up to 8 specific spans the learner should fix. Quote each verbatim, ≤140 chars. Categorise by grammar/vocabulary/coherence/task${ctx.skill === 'speaking' ? '/pronunciation/delivery' : ''}. Prioritise major issues over nits.

Finish with:
- summary: 2–3 sentences — biggest strength + the single highest-leverage fix. Do not sugarcoat.
- modelRewrite: rewrite ONE weak ${ctx.skill === 'speaking' ? 'sentence cluster' : 'paragraph'} at the next band up. Plain text only, no markdown.

${outputLanguageLine(ctx.language)}

Anchored reference responses:
${anchor}

----- TASK PROMPT -----
${ctx.promptText}

----- LEARNER RESPONSE -----
${ctx.responseText}

----- META -----
${meta}${delivery}
`.trim()
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export interface StageUsage { tokensIn: number; tokensOut: number }

/** Structured-output call for the cheap text stages (1 and 2). */
export type TextStageCall = <T>(args: {
  schema: z.ZodType<T>
  schemaName: string
  prompt: string
}) => Promise<{ object: T; usage?: StageUsage }>

/** Quality-stage call. Text routes send the prompt as-is; the audio
 *  route attaches the recording alongside it. */
export type QualityStageCall = (args: {
  prompt: string
  /** The rubric's criterion keys, in order.
   *
   *  The caller builds its schema from these so the model is told the
   *  EXACT set it must return. GradeSchema alone only constrains the
   *  COUNT (min 3, max 4) — nothing tied an entry to a real criterion. A
   *  TOEFL Speaking grade came back with `delivery` and `language_use`
   *  but no `topic_relevance`, and generateObject threw
   *  AI_NoObjectGeneratedError "Array must contain at least 3 element(s)".
   *  The student saw a 502 on a grade the model had already produced. */
  criterionKeys: string[]
}) => Promise<{ object: Grade; usage?: StageUsage }>

export interface StagedGradeResult {
  grade: Grade
  /** Non-null when the zero gate fired. */
  zeroGate: ZeroGate | null
  zeroReasons: string[]
  relevance: Relevance | null
  relevanceCeiling: number | null
  /** Overall band the quality stage produced BEFORE the ceiling. */
  languageScore: number | null
  ceilingApplied: boolean
  padding: PaddingSignals
  usage: StageUsage
}

export async function runStagedGrade(
  ctx: StageContext,
  calls: { text: TextStageCall; quality: QualityStageCall },
): Promise<StagedGradeResult> {
  const rubric = getRubric(ctx.family, ctx.skill, ctx.taskType)
  const padding = analyzePadding(ctx.promptText, ctx.responseText)
  const usage: StageUsage = { tokensIn: 0, tokensOut: 0 }
  const addUsage = (u?: StageUsage) => {
    if (!u) return
    usage.tokensIn += u.tokensIn
    usage.tokensOut += u.tokensOut
  }

  // ── Stage 1: hard zero gate ──────────────────────────────────────
  const gateRes = await calls.text({
    schema: ZeroGateSchema,
    schemaName: 'zero_gate',
    prompt: buildZeroGatePrompt(ctx),
  })
  addUsage(gateRes.usage)
  const gate = gateRes.object
  if (zeroGateTriggered(gate, ctx.skill)) {
    const reasons = zeroGateReasons(gate, ctx.skill)
    return {
      grade: zeroGrade(gate, rubric),
      zeroGate: gate,
      zeroReasons: reasons,
      relevance: null,
      relevanceCeiling: 0,
      languageScore: null,
      ceilingApplied: true,
      padding,
      usage,
    }
  }

  // ── Stages 2 + 4 in parallel (independent by construction) ───────
  // Listen and Repeat is a repetition-accuracy rubric — the relevance
  // ladder does not apply and the quality score stands alone.
  // Only the criteria this stage is actually asked to judge. The quality
  // prompt tells the rater that relevance "is being judged separately by
  // another rater" — so requiring a relevance entry in its schema forces
  // it to invent one. It complied with score 0 and evidence "N/A", the
  // ceiling min()'d that to 0, and a student whose answer was squarely on
  // topic saw "topic_relevance 0" beside a summary praising their
  // on-topic argument. Requiring the key was a fix for a 502 caused by
  // the model omitting it; the real fix is not to ask for it at all.
  const qualityKeys = rubric.usesRelevanceLadder
    ? rubric.criteria.filter(c => c.key !== rubric.relevanceCriterionKey).map(c => c.key)
    : rubric.criteria.map(c => c.key)
  const qualityPromise = calls.quality({
    prompt: buildQualityPrompt(ctx),
    criterionKeys: qualityKeys,
  })
  const relevancePromise = rubric.usesRelevanceLadder
    ? calls.text({
        schema: RelevanceSchema,
        schemaName: 'relevance_ladder',
        prompt: buildRelevancePrompt(ctx, padding),
      })
    : null

  const qualityRes = await qualityPromise
  addUsage(qualityRes.usage)
  if (!relevancePromise) {
    const languageScore = clamp(qualityRes.object.overallBand, rubric.scaleMax)
    return {
      grade: { ...qualityRes.object, overallBand: languageScore },
      zeroGate: null,
      zeroReasons: [],
      relevance: null,
      relevanceCeiling: null,
      languageScore,
      ceilingApplied: false,
      padding,
      usage,
    }
  }

  const relRes = await relevancePromise
  addUsage(relRes.usage)
  const relevance = relRes.object
  const ceiling = relevanceCeiling(relevance.level, rubric.scaleMax)

  // ── The ceiling, not an average ──────────────────────────────────
  const { grade, ceilingApplied, languageScore } = enforceRelevanceCeiling(
    qualityRes.object,
    rubric,
    ceiling,
    relevance.elaborationAssessment,
  )

  return {
    grade,
    zeroGate: null,
    zeroReasons: [],
    relevance,
    relevanceCeiling: ceiling,
    languageScore,
    ceilingApplied,
    padding,
    usage,
  }
}

/** Grade object for a stage-1 zero. The student-facing text comes from
 *  the model in the requested output language — no hardcoded UI copy. */
function zeroGrade(gate: ZeroGate, rubric: RubricSpec): Grade {
  const evidence = gate.feedback || gate.reasoning
  return {
    summary: evidence,
    criteria: rubric.criteria.map(c => ({ key: c.key, evidence, score: 0 })),
    annotations: gate.quotedSpan
      ? [{
          quote: gate.quotedSpan.slice(0, 140),
          category: 'task' as const,
          severity: 'major' as const,
          issue: gate.reasoning,
          suggestion: gate.feedback || gate.reasoning,
        }]
      : [],
    modelRewrite: '',
    overallBand: 0,
  }
}

// Re-exported for callers that only need the schema surface.
export { GradeSchema }
