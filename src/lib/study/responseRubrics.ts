import { z } from 'zod'

/**
 * Rubric definitions, Zod grading schemas, and prompt builders for the
 * AI Speaking + Writing grader (Phase 6a).
 *
 * Covered:
 *   - TOEFL Independent Writing (0-5 holistic, mapped to 0-30 scaled)
 *   - TOEFL Independent Speaking (0-4 holistic, mapped to 0-30 scaled)
 *   - IELTS Writing Task 2 (band 0-9, four criteria)
 *   - IELTS Speaking Part 2 (band 0-9, four criteria)
 *
 * v1 is intentionally tight — multi-turn Speaking Part 3 and integrated
 * TOEFL tasks come later. Each rubric is anchored with one strong + one
 * weak example so the grader has band-level reference points.
 */

export type ResponseTestFamily = 'toefl' | 'ielts'
export type ResponseSkill = 'speaking' | 'writing'

export interface RubricCriterion {
  key: string
  label: string
  max: number
}

export interface RubricSpec {
  testFamily: ResponseTestFamily
  skill: ResponseSkill
  /** Display band scale, e.g. 9 for IELTS, 30 for TOEFL scaled, 5 for TOEFL holistic. */
  scaleMax: number
  criteria: RubricCriterion[]
  /** Time-on-task in minutes (writing) or seconds (speaking). */
  timeLimit: { kind: 'minutes' | 'seconds'; value: number; prepSeconds?: number }
  /** Expected word/duration target shown to learners. */
  target: string
}

export const RUBRICS: Record<`${ResponseTestFamily}_${ResponseSkill}`, RubricSpec> = {
  toefl_writing: {
    testFamily: 'toefl',
    skill: 'writing',
    scaleMax: 5,
    criteria: [
      { key: 'development', label: 'Development & support', max: 5 },
      { key: 'organization', label: 'Organisation & coherence', max: 5 },
      { key: 'language', label: 'Language use', max: 5 },
    ],
    timeLimit: { kind: 'minutes', value: 30 },
    target: '300+ words',
  },
  toefl_speaking: {
    testFamily: 'toefl',
    skill: 'speaking',
    scaleMax: 4,
    criteria: [
      { key: 'delivery', label: 'Delivery', max: 4 },
      { key: 'language', label: 'Language use', max: 4 },
      { key: 'topic_development', label: 'Topic development', max: 4 },
    ],
    timeLimit: { kind: 'seconds', value: 45, prepSeconds: 15 },
    target: '~45 seconds',
  },
  ielts_writing: {
    testFamily: 'ielts',
    skill: 'writing',
    scaleMax: 9,
    criteria: [
      { key: 'task_response', label: 'Task response', max: 9 },
      { key: 'coherence_cohesion', label: 'Coherence & cohesion', max: 9 },
      { key: 'lexical_resource', label: 'Lexical resource', max: 9 },
      { key: 'grammatical_range', label: 'Grammatical range & accuracy', max: 9 },
    ],
    timeLimit: { kind: 'minutes', value: 40 },
    target: '250+ words',
  },
  ielts_speaking: {
    testFamily: 'ielts',
    skill: 'speaking',
    scaleMax: 9,
    criteria: [
      { key: 'fluency_coherence', label: 'Fluency & coherence', max: 9 },
      { key: 'lexical_resource', label: 'Lexical resource', max: 9 },
      { key: 'grammatical_range', label: 'Grammatical range & accuracy', max: 9 },
      { key: 'pronunciation', label: 'Pronunciation', max: 9 },
    ],
    timeLimit: { kind: 'seconds', value: 120, prepSeconds: 60 },
    target: '1–2 minutes',
  },
}

export function getRubric(family: ResponseTestFamily, skill: ResponseSkill): RubricSpec {
  return RUBRICS[`${family}_${skill}`]
}

// ---------------------------------------------------------------------------
// Zod schema — same shape for all rubrics; per-criterion scores keyed by
// the criterion's `key`. The grader prompt names each key so the model
// must use them verbatim.
// ---------------------------------------------------------------------------

export const SentenceAnnotationSchema = z.object({
  quote: z.string().describe('The exact span from the response being annotated. Quote verbatim, ≤140 chars.'),
  category: z.enum(['grammar', 'vocabulary', 'coherence', 'task', 'pronunciation', 'delivery']),
  severity: z.enum(['nit', 'minor', 'major']),
  issue: z.string().describe('1 sentence on what is wrong.'),
  suggestion: z.string().describe('1 sentence concrete fix, including a rewrite where helpful.'),
})

export const RubricCriterionScoreSchema = z.object({
  key: z.string(),
  score: z.number(),
  evidence: z.string().describe('1-2 sentences justifying the score with specific reference to the response.'),
})

export const GradeSchema = z.object({
  overallBand: z.number().describe('Overall band on the rubric scale (e.g. 7.5 for IELTS, 25 for TOEFL).'),
  summary: z.string().describe('2-3 sentences: what the response did well and the single highest-leverage thing to improve.'),
  criteria: z.array(RubricCriterionScoreSchema).min(3).max(4),
  annotations: z.array(SentenceAnnotationSchema).max(8).describe('Up to 8 sentence-level annotations. Prioritise major issues. Empty array if the response is uniformly strong.'),
  modelRewrite: z.string().describe('A short rewrite of one weak paragraph or sentence at the next band up. Plain text, no markdown.'),
})

export type Grade = z.infer<typeof GradeSchema>

// ---------------------------------------------------------------------------
// Prompt builder — assembles rubric + anchored examples + the student's
// response + criterion keys for structured output.
// ---------------------------------------------------------------------------

interface PromptInput {
  family: ResponseTestFamily
  skill: ResponseSkill
  promptText: string
  responseText: string
  durationSeconds?: number | null
  wordCount?: number | null
  language: 'en' | 'ko'
}

export function buildGraderPrompt(input: PromptInput): string {
  const rubric = getRubric(input.family, input.skill)
  const meta =
    input.skill === 'writing'
      ? `Words written: ${input.wordCount ?? 'unknown'}. Time limit: ${rubric.timeLimit.value} minutes. Target: ${rubric.target}.`
      : `Spoken duration: ${input.durationSeconds ?? 'unknown'}s. Time limit: ${rubric.timeLimit.value}s. Target: ${rubric.target}.`

  const criteriaList = rubric.criteria
    .map(c => `  - "${c.key}" (${c.label}, 0–${c.max})`)
    .join('\n')

  const anchor = ANCHORS[`${input.family}_${input.skill}`]

  const head = `You are an expert ${input.family.toUpperCase()} ${input.skill} examiner with 10+ years of calibrated scoring experience.

Grade the response below against the official ${input.family.toUpperCase()} ${input.skill} rubric. Be calibrated — do not inflate scores. A "good for a student" response is not the same as a high-band response.

Rubric (0–${rubric.scaleMax}, official scale):
${criteriaList}

For each criterion, give a score on its own scale and one or two sentences of evidence quoting the response.
Then give an overall band on the same scale (use 0.5 increments for IELTS, whole numbers for TOEFL).

Annotate up to 8 specific spans the learner should fix. Quote each verbatim, keep quotes ≤140 chars. Categorise by grammar/vocabulary/coherence/task${input.skill === 'speaking' ? '/pronunciation/delivery' : ''}. Prioritise major issues over nits.

Finish with:
- summary: 2–3 sentences — biggest strength + single highest-leverage fix.
- modelRewrite: rewrite ONE weak paragraph (or, for speaking, one weak sentence cluster) at the next band up. Plain text only — no markdown.

Output language: ${input.language === 'ko' ? 'Korean (모든 평가, 코멘트, 재작성은 한국어로 작성. 단, "quote" 필드는 학습자가 쓴 원문 그대로 영어로 인용)' : 'English'}.

Anchored reference responses:
${anchor}

----- TASK PROMPT -----
${input.promptText}

----- LEARNER RESPONSE -----
${input.responseText}

----- META -----
${meta}
`
  return head.trim()
}

// ---------------------------------------------------------------------------
// Anchored examples — one strong, one weak per rubric. Hand-written
// short fragments. Real-world anchor calibration should follow a 30-
// sample validation study before removing the BETA badge.
// ---------------------------------------------------------------------------

const ANCHORS: Record<`${ResponseTestFamily}_${ResponseSkill}`, string> = {
  toefl_writing: `
[Strong — score 5 / scaled 28]
"While remote learning offers undeniable flexibility, its long-term effects on student motivation remain mixed. Studies from Stanford in 2023 demonstrate that students who attended hybrid classes scored, on average, 12% lower on retention tests than their in-person peers — a finding that complicates the convenience argument..."
Hallmarks: precise vocabulary, varied sentence types, concrete evidence, clear thesis.

[Weak — score 2 / scaled 14]
"I think remote class is good because we can learn from home. Many student like it. But some student don't like because they don't have computer. So it have good and bad side. My opinion is good because of flexible."
Hallmarks: limited vocabulary, repeated structure, no evidence, agreement errors.
`.trim(),

  toefl_speaking: `
[Strong — score 4 / scaled 28]
"I'd choose studying abroad over staying local for two clear reasons. First, immersion accelerates language acquisition — when every transaction forces you to negotiate in the target language, you internalise idiom in ways a classroom can't replicate. Second, cultural friction builds adaptability..."
Hallmarks: fluent pace, complex grammar, developed reasons with examples.

[Weak — score 2 / scaled 18]
"Um... I think study abroad is good because... uh... you can see new culture. And also you can practice language. Like, you go to a country and you talk to people, so you can learn faster. That is my answer."
Hallmarks: many fillers, simple vocabulary, undeveloped support.
`.trim(),

  ielts_writing: `
[Strong — band 8]
"Although automation has displaced workers in many industries, the long-term picture is more nuanced than alarmist headlines suggest. Historical precedent, from agriculture to manufacturing, indicates that technological transitions create new categories of employment even as they obsolete others; the challenge, therefore, is one of retraining velocity rather than scarcity..."
Hallmarks: nuanced position, precise lexis, varied complex structures, controlled cohesion.

[Weak — band 5]
"Nowadays many people lose their job because of robot. This is very bad problem. Government should give money to these people. Also schools should teach computer so children can find new job. In conclusion, robot have bad and good side but overall is bad for workers."
Hallmarks: simple ideas, repetitive linking, narrow vocabulary, frequent errors.
`.trim(),

  ielts_speaking: `
[Strong — band 8]
"The most memorable trip I've taken was to a small mountain village in northern Vietnam — Sapa, I think it's called. What made it stand out wasn't the scenery, striking as it was, but the homestay with a Hmong family who had absolutely no English. We communicated almost entirely through gestures and shared meals, and it taught me that connection doesn't really require a common language..."
Hallmarks: extended turn, idiomatic phrasing, natural hesitation, accurate complex grammar.

[Weak — band 5]
"I want to talk about a trip I went last year. I went to Jeju with my family. It was very fun. The weather was good. We eat seafood and go to the beach. It was nice trip. I want to go again next year because... uh... yes I like it very much."
Hallmarks: short turns, limited range, frequent simple errors, repeated vocabulary.
`.trim(),
}
