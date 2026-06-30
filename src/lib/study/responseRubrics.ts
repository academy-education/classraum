import { z } from 'zod'

/**
 * Rubric definitions, Zod grading schemas, and prompt builders for the
 * AI Speaking + Writing grader (Phase 6a).
 *
 * Covered:
 *   - TOEFL Writing for an Academic Discussion (0-5 holistic, scaled 0-30) —
 *     replaced the discontinued Independent Writing in July 2023.
 *     Integrated Writing remains; we'll add it as a separate task later.
 *   - TOEFL Speaking (0-4 holistic, scaled 0-30) — generic across the
 *     4 task types (Independent + 3 Integrated). Per-task prompts are
 *     constructed at session-creation time; the rubric criteria are
 *     identical across tasks per ETS.
 *   - IELTS Writing Task 2 (band 0-9, four criteria)
 *   - IELTS Speaking Part 2 (band 0-9, four criteria)
 *
 * Each rubric is anchored with one strong + one weak example so the
 * grader has band-level reference points. Anchor language for TOEFL
 * Writing follows the official ETS Writing for an Academic Discussion
 * rubric (ets.org/pdfs/toefl/...).
 */

export type ResponseTestFamily = 'toefl' | 'ielts'
export type ResponseSkill = 'speaking' | 'writing'
/** Optional task-type discriminator for rubric variants under one
 *  (family, skill) pair. TOEFL Writing has two distinct tasks in the
 *  Jan-2026 format: 'email' (7 min, 100+ words, register-sensitive)
 *  and 'academic_discussion' (10 min, 100+ words, position-staking).
 *  Undefined falls back to the base rubric for that (family, skill). */
export type ResponseTaskType = 'email' | 'academic_discussion'

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
    // TOEFL Writing for an Academic Discussion (Task 2, post-July 2023).
    // Format: professor poses a question, 2 student replies are shown,
    // learner contributes their own opinion + reasoning in 10 minutes.
    // ETS rubric scores on three dimensions:
    //   - "contribution": how relevant, well-elaborated, and credible
    //     the response is in the context of the discussion
    //   - "language_facility": variety, accuracy, and idiomaticity of
    //     sentence structure and vocabulary
    //   - "grammar_vocabulary": mechanical correctness (errors at the
    //     word + phrase level — agreement, articles, word forms)
    testFamily: 'toefl',
    skill: 'writing',
    scaleMax: 5,
    criteria: [
      { key: 'contribution', label: 'Relevance & elaboration of contribution', max: 5 },
      { key: 'language_facility', label: 'Language facility (variety & accuracy)', max: 5 },
      { key: 'grammar_vocabulary', label: 'Grammar & vocabulary precision', max: 5 },
    ],
    timeLimit: { kind: 'minutes', value: 10 },
    target: '100+ words (typical strong responses: 150-200 words)',
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

/** Task-type variants under a base (family, skill) pair. Use the
 *  three-segment key `${family}_${skill}_${taskType}`. */
export const RUBRIC_VARIANTS: Record<string, RubricSpec> = {
  // TOEFL Writing — Email task (Jan 2026). 7 minutes, ~100+ words.
  // ETS scores email tasks on three dimensions distinct from the
  // Academic Discussion rubric:
  //   - "task_fulfillment": did the response address all the points
  //     the scenario asked for, and respond to the right scenario?
  //   - "register": is the tone appropriate for the relationship
  //     (formal to professor, polite-friendly to classmate, transactional
  //     to a service desk)?
  //   - "language_facility": variety + accuracy of structure + lexis.
  toefl_writing_email: {
    testFamily: 'toefl',
    skill: 'writing',
    scaleMax: 5,
    criteria: [
      { key: 'task_fulfillment', label: 'Bullet-point coverage & scenario fit', max: 5 },
      { key: 'register', label: 'Tone & register appropriate to the recipient', max: 5 },
      { key: 'language_facility', label: 'Language facility (variety & accuracy)', max: 5 },
    ],
    timeLimit: { kind: 'minutes', value: 7 },
    target: '100+ words (typical strong: 120-180 words)',
  },
}

export function getRubric(
  family: ResponseTestFamily,
  skill: ResponseSkill,
  taskType?: ResponseTaskType,
): RubricSpec {
  if (taskType) {
    const variant = RUBRIC_VARIANTS[`${family}_${skill}_${taskType}`]
    if (variant) return variant
  }
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
  taskType?: ResponseTaskType
  promptText: string
  responseText: string
  durationSeconds?: number | null
  wordCount?: number | null
  language: 'en' | 'ko'
}

export function buildGraderPrompt(input: PromptInput): string {
  const rubric = getRubric(input.family, input.skill, input.taskType)
  const meta =
    input.skill === 'writing'
      ? `Words written: ${input.wordCount ?? 'unknown'}. Time limit: ${rubric.timeLimit.value} minutes. Target: ${rubric.target}.`
      : `Spoken duration: ${input.durationSeconds ?? 'unknown'}s. Time limit: ${rubric.timeLimit.value}s. Target: ${rubric.target}.`

  const criteriaList = rubric.criteria
    .map(c => `  - "${c.key}" (${c.label}, 0–${c.max})`)
    .join('\n')

  // Variant anchor wins over the base anchor when a taskType is set.
  const anchorKey = input.taskType ? `${input.family}_${input.skill}_${input.taskType}` : `${input.family}_${input.skill}`
  const anchor = ANCHORS[anchorKey] ?? ANCHORS[`${input.family}_${input.skill}`]

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

const ANCHORS: Record<string, string> = {
  toefl_writing_email: `
TOEFL Writing — Email task (Jan 2026). 7 minutes, ~100+ words. The
prompt gives a scenario (email or notice received) + 3 bullets to
address. Score on bullet coverage + register + language facility.

[Strong — score 5]
Scenario: Professor invites student to a guest lecture next Friday at
3pm, which conflicts with part-time job. Bullets to address:
(1) thank the professor, (2) explain the conflict, (3) ask if a
recording will be available.
Response: "Dear Professor Chen, Thank you so much for thinking of me
for Friday's guest lecture — I'm genuinely excited about the topic
and would love to be there. Unfortunately, my part-time shift at the
campus library runs from 2-6pm on Fridays, and I can't swap it on
such short notice. Would it be possible to access a recording of the
session afterward? I'd hate to miss the discussion entirely. Thanks
again for the invitation, and I'll definitely come if there's any
chance you offer something similar later this term. Best, Jamie"
Hallmarks: all 3 bullets addressed in order; formal-but-warm register
appropriate to a professor; specific reason for conflict; closes with
a forward-looking note. Word count ~115.

[Weak — score 2]
Same scenario. Response: "Hi prof, thanks for the invite. I cant come
because I have work that day. Can you send me the recording? Bye."
Hallmarks: bullets addressed but barely; register way too casual for
a professor ("Hi prof", "Bye", no salutation); no specific reason;
contractions + apostrophe errors. Word count 24 — also under target.
`.trim(),

  toefl_writing: `
TOEFL Writing for an Academic Discussion — anchor responses.
Context: Professor poses a question to a class. Two students reply
with short positions. Learner contributes their own opinion + reasoning
in 10 minutes, ≥100 words.

[Strong — score 5 / scaled 28-30]
Discussion context: "Professor: Should governments invest more in
public transit or in highway expansion? Sarah: Highway expansion —
people need flexibility. Marco: Transit — better for cities long-term."
Response: "I lean toward Marco's position on transit, but with a
qualification Sarah's argument actually surfaces. Highway expansion
encourages dispersed development that locks cities into car-dependence
for decades — a phenomenon urban economists call 'induced demand,'
where new road capacity fills up within a few years. That said,
Sarah's flexibility point is valid for rural and exurban communities
where transit density can't reach efficient scale. So my answer is
context-dependent: dense metros should prioritize transit (the case
in Seoul, where subway investment cut commute times by 18% over a
decade), while regional networks need both."
Hallmarks: directly engages another poster's argument by name + with
nuance ("with a qualification Sarah's argument actually surfaces");
precise vocabulary ("induced demand", "exurban", "dispersed
development"); concrete evidence (Seoul subway data); a defensible
context-dependent thesis rather than blanket agreement.

[Weak — score 2 / scaled 14-17]
Same context. Response: "I think transit is better. Many people use
the bus and subway every day in big city. Sarah say highway is good
but I don't agree. Highway make traffic problem and pollution. Transit
is more friendly to environment. Also it is cheaper for student.
That is why I think government should invest in transit more."
Hallmarks: repeats the prompt rather than extending it; doesn't engage
specifically with Marco even though it agrees with him; no evidence
beyond "many people use"; agreement errors ("Sarah say", "Highway
make"); narrow vocabulary; relies on slogans ("friendly to
environment", "make traffic problem").
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
