import { z } from 'zod'

/**
 * Rubric definitions, Zod grading schemas, and band descriptors for the
 * AI Speaking + Writing grader.
 *
 * Scoring model (ETS, current as of the January 21 2026 format):
 *   - TOEFL Speaking is TWO task types, each scored 0–5 holistically:
 *       • "Take an Interview"  — content rubric. The load-bearing
 *         dimension is RELEVANCE to the interviewer's question and how
 *         well the answer is elaborated. NO preparation time; ~45 s of
 *         speaking.
 *       • "Listen and Repeat" — a repetition-ACCURACY rubric, not a
 *         content rubric. Relevance/elaboration play no part.
 *     The retired 0–4 Delivery / Language Use / Topic Development
 *     rubric (and the old Independent + 3 Integrated task structure)
 *     no longer applies and is not used here.
 *   - TOEFL Writing is TWO task types, each scored 0–5 holistically:
 *       • "Write an Email" — adds a criterion the other tasks lack:
 *         appropriate SOCIAL CONVENTIONS (politeness, register, how
 *         requests / refusals / criticisms are formulated). Bands 5–3
 *         "display the following"; bands 2 and 1 are triggered by ONE
 *         OR MORE of their descriptors.
 *       • "Write for an Academic Discussion" — every band's lead
 *         sentence carries an explicit relevance judgement.
 *   - IELTS Writing Task 2 / Speaking Part 2 (band 0–9, four criteria)
 *     are unchanged.
 *
 * Official sources: ets.org/pdfs/toefl/speaking-rubrics.pdf and
 * ets.org/pdfs/toefl/writing-rubrics.pdf.
 *
 * Grading is staged, not holistic-in-one-call — see
 * `src/lib/study/gradePipeline.ts`. A single holistic call anchors on
 * fluency and rationalises partial relevance, which is why fluent but
 * off-prompt answers used to land at 3.5 instead of the 1–2 ETS gives
 * them.
 */

export type ResponseTestFamily = 'toefl' | 'ielts'
export type ResponseSkill = 'speaking' | 'writing'
/** Task-type discriminator for rubric variants under one (family,
 *  skill) pair. Writing: 'email' | 'academic_discussion'. Speaking:
 *  'take_interview' | 'listen_repeat'. Undefined falls back to the base
 *  rubric for that (family, skill). */
export type ResponseTaskType =
  | 'email'
  | 'academic_discussion'
  | 'take_interview'
  | 'listen_repeat'

export interface RubricCriterion {
  key: string
  label: string
  max: number
}

export interface RubricSpec {
  testFamily: ResponseTestFamily
  skill: ResponseSkill
  /** Display band scale, e.g. 9 for IELTS, 5 for the TOEFL holistic rubrics. */
  scaleMax: number
  criteria: RubricCriterion[]
  /** Time-on-task in minutes (writing) or seconds (speaking).
   *  `prepSeconds` is omitted for tasks with no preparation time. */
  timeLimit: { kind: 'minutes' | 'seconds'; value: number; prepSeconds?: number }
  /** Expected word/duration target shown to learners. */
  target: string
  /**
   * Whether the ETS rubric for this task makes relevance-to-the-prompt
   * a band determinant. True for every content task. FALSE for Listen
   * and Repeat, which scores repetition accuracy — a perfectly repeated
   * sentence is a 5 no matter what the sentence is "about".
   */
  usesRelevanceLadder: boolean
  /** Criterion whose score is the relevance judgement; capped to the
   *  relevance ceiling alongside the overall band. */
  relevanceCriterionKey?: string
  /** Verbatim-anchored band descriptors handed to the quality stage. */
  bandDescriptors: string
}

// ---------------------------------------------------------------------------
// Band descriptors — condensed from the official ETS rubric PDFs. The
// bracketed markers ("ONE OR MORE" vs "displays") encode the asymmetry
// ETS uses: at bands 5–3 a response must display all listed features;
// at bands 2 and 1 any single listed feature triggers the band.
// ---------------------------------------------------------------------------

const TAKE_INTERVIEW_BANDS = `
5 — Fully successful. Fully addresses the question; ON TOPIC and WELL ELABORATED. Good conversational pace. Easily intelligible throughout. Accurate range of grammar and vocabulary.
4 — Generally successful. Addresses the question; ON TOPIC and ELABORATED, though it may lack sentence-level connectors. Good pace with some pausing. Occasionally requires minor listener effort. Adequate grammar and vocabulary.
3 — Partially successful. GENERALLY ON TOPIC but ELABORATION IS RELATIVELY LIMITED. Frequent or lengthy pauses, choppy rhythm, filler words. Intelligibility is sometimes affected. Limited range noticeably restricts precision.
2 — Mostly unsuccessful. An ATTEMPT to address the question that is not supported meaningfully or intelligibly. A typical response shows ALL of: MINIMALLY CONNECTED to the interviewer's question, with LITTLE OR NO RELEVANT ELABORATION, or consisting MAINLY OF LANGUAGE FROM THE QUESTION; limited intelligibility; a very limited range of grammar and vocabulary.
1 — Unsuccessful. MINIMALLY addresses the question with very limited control of language. A typical response shows ALL of: only VAGUELY CONNECTED to language in the interviewer's question; mostly unintelligible; mainly isolated words or phrases.
0 — No response, OR entirely unintelligible, OR not in English, OR content ENTIRELY UNCONNECTED to the prompt (including responses consisting only of phrases such as "I don't know").
`.trim()

const LISTEN_REPEAT_BANDS = `
This is a REPETITION-ACCURACY rubric, NOT a content rubric. Do not reward or penalise the ideas in the sentence — only how accurately and intelligibly it was repeated.
5 — Exact repetition of the stimulus sentence, fully intelligible.
4 — Captures the meaning of the original with only minor changes: one or two function words, one content word, tense/number markers, or two words transposed.
3 — Essentially a full repetition, but does NOT accurately capture the original meaning. The majority of content words are present.
2 — Missing a significant part of the sentence and/or highly inaccurate; may be fragmentary.
1 — Captures very little of the original, or is largely unintelligible.
0 — No response, OR entirely unintelligible, OR not in English, OR content ENTIRELY UNCONNECTED to the stimulus (including responses consisting only of phrases such as "I don't know").
`.trim()

const WRITING_EMAIL_BANDS = `
5 — DISPLAYS the following: fully successful, clearly relevant response to the task; effective use of APPROPRIATE SOCIAL CONVENTIONS (politeness, register, and the formulation of requests, refusals, or criticisms); well-organised and well-elaborated; a wide range of accurate grammar and vocabulary; almost no lexical or grammatical errors OTHER THAN THOSE EXPECTED FROM A COMPETENT WRITER WRITING UNDER TIMED CONDITIONS (common typos, misspellings, or substitutions like there/their do NOT keep a response out of this band).
4 — DISPLAYS the following: generally successful response addressing the task; generally appropriate social conventions; adequately organised and elaborated; adequate range of grammar and vocabulary with minor lapses that do not obscure meaning.
3 — DISPLAYS the following: partially successful response; social conventions inconsistently observed; limited organisation; elaboration is thin; noticeable lexical/grammatical limitations that occasionally obscure meaning.
2 — Exhibits ONE OR MORE of the following: addresses the task only minimally; inappropriate register or social conventions; LIMITED OR IRRELEVANT ELABORATION; disorganised; frequent errors that obscure meaning; relies heavily on language lifted from the prompt.
1 — Exhibits ONE OR MORE of the following: an ineffective attempt at the task; minimal original language, with any coherent language mostly borrowed from the prompt; pervasive errors that make meaning hard to recover.
0 — Blank; rejects the topic; not in English; ENTIRELY COPIED FROM THE PROMPT; entirely unconnected to the prompt; or arbitrary keystrokes.
`.trim()

const WRITING_DISCUSSION_BANDS = `
5 — A RELEVANT and VERY CLEARLY EXPRESSED contribution to the online discussion; consistently well-elaborated with explanation, exemplification, or detail; a wide range of accurate grammar and vocabulary; almost no lexical or grammatical errors OTHER THAN THOSE EXPECTED FROM A COMPETENT WRITER WRITING UNDER TIMED CONDITIONS (common typos, misspellings, or substitutions like there/their do NOT keep a response out of this band).
4 — A RELEVANT contribution to the online discussion, easily understood; elaboration is adequate though it may be uneven; some variety and accuracy of grammar and vocabulary; minor lapses do not obscure meaning.
3 — A MOSTLY RELEVANT and MOSTLY UNDERSTANDABLE contribution, with SOME elaboration — part of which may be MISSING, UNCLEAR, OR IRRELEVANT; limited range of grammar and vocabulary; lapses sometimes obscure meaning.
2 — Exhibits ONE OR MORE of the following: an ATTEMPT to contribute to the discussion; ideas POORLY ELABORATED OR ONLY PARTIALLY RELEVANT; limited or unclear connection to the discussion; frequent errors that impede meaning; noticeable reliance on prompt language.
1 — Exhibits ONE OR MORE of the following: an INEFFECTIVE ATTEMPT to contribute; MINIMAL ORIGINAL LANGUAGE, with any coherent language MOSTLY BORROWED FROM THE STIMULUS; words are strung together with little control.
0 — Blank; rejects the topic; not in English; ENTIRELY COPIED FROM THE PROMPT; entirely unconnected to the prompt; or arbitrary keystrokes.
`.trim()

const IELTS_WRITING_BANDS = `
Score each of the four criteria on the 0–9 IELTS band scale (0.5 increments). Task response is the relevance criterion: a fully developed position that answers all parts of the question is band 8–9; a response that addresses the task only tangentially, or that repeats the prompt without developing it, cannot exceed band 4–5 however fluent it is.
`.trim()

const IELTS_SPEAKING_BANDS = `
Score each of the four criteria on the 0–9 IELTS band scale (0.5 increments). Fluency & coherence covers relevance and topic development: an answer that drifts off the cue card or pads with repetition cannot exceed band 5 however accurate the grammar is.
`.trim()

export const RUBRICS: Record<`${ResponseTestFamily}_${ResponseSkill}`, RubricSpec> = {
  toefl_writing: {
    // Base = Write for an Academic Discussion (10 min, 100+ words).
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
    usesRelevanceLadder: true,
    relevanceCriterionKey: 'contribution',
    bandDescriptors: WRITING_DISCUSSION_BANDS,
  },
  toefl_speaking: {
    // Base = Take an Interview. NOTE: this task has NO preparation
    // time — the interviewer's question is followed immediately by
    // ~45 s of response time, so `prepSeconds` is intentionally absent.
    // (The session UI passes its own prepSec separately.)
    testFamily: 'toefl',
    skill: 'speaking',
    scaleMax: 5,
    criteria: [
      { key: 'topic_relevance', label: 'On-topic response & elaboration', max: 5 },
      { key: 'delivery', label: 'Delivery (pace, pausing, intelligibility)', max: 5 },
      { key: 'language_use', label: 'Grammar & vocabulary range/accuracy', max: 5 },
    ],
    timeLimit: { kind: 'seconds', value: 45 },
    target: '~45 seconds',
    usesRelevanceLadder: true,
    relevanceCriterionKey: 'topic_relevance',
    bandDescriptors: TAKE_INTERVIEW_BANDS,
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
    usesRelevanceLadder: true,
    relevanceCriterionKey: 'task_response',
    bandDescriptors: IELTS_WRITING_BANDS,
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
    usesRelevanceLadder: true,
    relevanceCriterionKey: 'fluency_coherence',
    bandDescriptors: IELTS_SPEAKING_BANDS,
  },
}

/** Task-type variants under a base (family, skill) pair. Use the
 *  three-segment key `${family}_${skill}_${taskType}`. */
export const RUBRIC_VARIANTS: Record<string, RubricSpec> = {
  // TOEFL Writing — Write an Email (7 minutes, ~100+ words). The
  // "social conventions" criterion is unique to this task in the ETS
  // rubric set: politeness, register, and how requests, refusals, and
  // criticisms are formulated.
  toefl_writing_email: {
    testFamily: 'toefl',
    skill: 'writing',
    scaleMax: 5,
    criteria: [
      { key: 'task_fulfillment', label: 'Task coverage & relevance of elaboration', max: 5 },
      { key: 'social_conventions', label: 'Social conventions (politeness, register, requests)', max: 5 },
      { key: 'language_facility', label: 'Language facility (variety & accuracy)', max: 5 },
    ],
    timeLimit: { kind: 'minutes', value: 7 },
    target: '100+ words (typical strong: 120-180 words)',
    usesRelevanceLadder: true,
    relevanceCriterionKey: 'task_fulfillment',
    bandDescriptors: WRITING_EMAIL_BANDS,
  },
  // TOEFL Writing — explicit alias so a caller can name the base task.
  toefl_writing_academic_discussion: {
    ...RUBRICS.toefl_writing,
  },
  // TOEFL Speaking — Take an Interview (explicit alias of the base).
  toefl_speaking_take_interview: {
    ...RUBRICS.toefl_speaking,
  },
  // TOEFL Speaking — Listen and Repeat. Repetition accuracy only; the
  // relevance ladder does NOT apply (see usesRelevanceLadder).
  toefl_speaking_listen_repeat: {
    testFamily: 'toefl',
    skill: 'speaking',
    scaleMax: 5,
    criteria: [
      { key: 'repetition_accuracy', label: 'Accuracy of repetition', max: 5 },
      { key: 'meaning_preservation', label: 'Preservation of the original meaning', max: 5 },
      { key: 'intelligibility', label: 'Intelligibility', max: 5 },
    ],
    timeLimit: { kind: 'seconds', value: 20 },
    target: 'repeat the sentence exactly',
    usesRelevanceLadder: false,
    bandDescriptors: LISTEN_REPEAT_BANDS,
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

/**
 * Infer the TOEFL Speaking task type from the generator's prompt tag.
 * The generator prefixes every speaking prompt with "[Listen and
 * Repeat]" or "[Interview]" (see test-specs.ts). The session UI does
 * NOT send a speaking taskType, so the server has to recover it here.
 * Anything unrecognised falls back to Take an Interview, which is the
 * conservative choice: it is the rubric that actually checks relevance.
 */
export function inferSpeakingTaskType(promptText: string): ResponseTaskType {
  const head = promptText.slice(0, 120).toLowerCase()
  if (/\[\s*(listen\s*(and|&)?\s*repeat|따라\s*말하기)/.test(head)) return 'listen_repeat'
  return 'take_interview'
}

/** Anchor text (one strong + one weak reference response) for a rubric. */
export function getAnchor(
  family: ResponseTestFamily,
  skill: ResponseSkill,
  taskType?: ResponseTaskType,
): string {
  const keyed = taskType ? ANCHORS[`${family}_${skill}_${taskType}`] : undefined
  return keyed ?? ANCHORS[`${family}_${skill}`] ?? ''
}

// ---------------------------------------------------------------------------
// Zod schemas.
//
// Field ORDER matters: structured-output models emit keys in schema
// order, so every schema below puts the quoted evidence BEFORE the
// number it justifies. Score-first output drifts high.
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
  evidence: z.string().describe('Quote the exact span from the response that justifies the score, then 1 sentence of reasoning. Write this BEFORE choosing the number.'),
  score: z.number(),
})

export const GradeSchema = z.object({
  summary: z.string().describe('2-3 sentences: what the response did well and the single highest-leverage thing to improve.'),
  criteria: z.array(RubricCriterionScoreSchema).min(3).max(4),
  annotations: z.array(SentenceAnnotationSchema).max(8).describe('Up to 8 sentence-level annotations. Prioritise major issues. Empty array if the response is uniformly strong.'),
  modelRewrite: z.string().describe('A short rewrite of one weak paragraph or sentence at the next band up. Plain text, no markdown.'),
  overallBand: z.number().describe('Overall band on the rubric scale, decided AFTER the per-criterion evidence above.'),
})

/**
 * GradeSchema pinned to one rubric's criterion keys.
 *
 * The generic GradeSchema constrains the criteria array's LENGTH only
 * (min 3, max 4) because it has to cover every rubric — TOEFL speaking
 * has 3 criteria, IELTS writing 4. Nothing tied an entry to a real
 * criterion, so a grade could come back with the right count and the
 * wrong headings, or — as happened on 2026-07-28 — the wrong count:
 * gpt-4o returned `delivery` and `language_use` and silently dropped
 * `topic_relevance`, generateObject threw
 * "Array must contain at least 3 element(s)", and the student got a 502
 * on a grade the model had already written and we had already paid for.
 *
 * Handing the model an enum of the exact keys plus a fixed length makes
 * it EASIER to comply, not harder: with structured outputs the allowed
 * values are part of the contract rather than something to infer from
 * the prompt.
 */
export function gradeSchemaForCriteria(keys: string[]) {
  if (keys.length === 0) return GradeSchema
  return GradeSchema.extend({
    criteria: z.array(
      RubricCriterionScoreSchema.extend({
        key: z.enum(keys as [string, ...string[]])
          .describe('Must be one of the rubric criterion keys, each used exactly once.'),
      }),
    ).length(keys.length),
  })
}

export type Grade = z.infer<typeof GradeSchema>

// --- Stage 1: hard zero gate -----------------------------------------------
// The ETS 0-band conditions, asked as independent yes/no classifications
// with only the prompt + response in context. Kept separate from quality
// scoring on purpose: a model that is also being asked "how good is
// this?" will not answer "is this a 0?" honestly.
//
// Writing gets its OWN schema, because the official guides list
// different conditions (see zeroGateFlagsFor). A condition the Writing
// guide does not list is not asked at all: handed an "entirely
// unintelligible" box, the model ticked it, and that sent band-1 answers
// built from borrowed prompt phrases to 0 in 10 of 12 grades (grader
// ladder, 2026-10-07).

/** Speaking gate (and, before 2026-10-07, the shared one). Speaking only
 *  reads noResponse, notInEnglish, entirelyUnintelligible and
 *  entirelyUnconnected from it; see SPEAKING_ZERO_FLAGS. */
export const ZeroGateSchema = z.object({
  quotedSpan: z.string().describe('Quote up to 140 characters of the response verbatim (empty string if there is no response).'),
  reasoning: z.string().describe('1-2 sentences comparing the response to the prompt. Write this BEFORE answering the flags.'),
  noResponse: z.boolean().describe('True if the response is blank or contains no attempt at an answer (e.g. only "I don\'t know").'),
  notInEnglish: z.boolean().describe('True if the response is not in English.'),
  entirelyUnintelligible: z.boolean().describe('True if the response cannot be understood at all.'),
  rejectsTopic: z.boolean().describe('True if the writer refuses or rejects the topic rather than responding to it.'),
  entirelyCopiedFromPrompt: z.boolean().describe('True if the response is entirely copied from the prompt with no original language.'),
  entirelyUnconnected: z.boolean().describe('True if the content is entirely unconnected to the prompt — it answers some other question.'),
  arbitraryKeystrokes: z.boolean().describe('True if the response is random characters or keyboard mashing.'),
  feedback: z.string().describe('1-2 sentences of feedback for the student, written in the requested output language, explaining why this scores 0 and what to do instead. Leave empty if no flag is true.'),
})

/**
 * Writing gate: exactly the six conditions in the official Writing
 * guides (both tasks, identical wording), and nothing else:
 *
 *   "The response is blank, rejects the topic, is not in English, is
 *    entirely copied from the prompt, is entirely unconnected to the
 *    prompt or consists of arbitrary keystrokes."
 *
 * "Entirely unintelligible" is NOT among them. The Writing guides put
 * unintelligibility at band 1 ("The message may be limited to the point
 * of being unintelligible"), borrowed language at band 1 ("Minimal
 * original language; any coherent language is mostly borrowed from the
 * stimulus") and irrelevant elaboration at band 2 ("Limited or irrelevant
 * elaboration"). Each description says where the line to those bands
 * falls, in the guide's own words.
 */
export const WritingZeroGateSchema = z.object({
  quotedSpan: z.string().describe('Quote up to 140 characters of the response verbatim (empty string if the response is blank).'),
  reasoning: z.string().describe('1-2 sentences: which part of the response, if any, responds to the task in the prompt? Write this BEFORE answering the flags.'),
  // Evidence BEFORE the flags it decides. reconcileWritingGate checks each
  // quote against the actual texts, so a flag the model's own evidence
  // contradicts cannot zero the response.
  connectedSpan: z.string().describe('Quote verbatim any span of the response that relates to the prompt: its situation, the people in it, its question or its topic (a greeting to the right person counts). Empty string ONLY if nothing in the response relates to the prompt.'),
  originalWords: z.string().describe('Quote verbatim words in the response that the writer added, i.e. NOT copied from the prompt. Empty string ONLY if every word is copied from the prompt.'),
  refusalQuote: z.string().describe('If the writer explicitly refuses to do the writing task, quote that refusal verbatim. Otherwise empty string.'),
  noResponse: z.boolean().describe('"The response is blank." True ONLY if there is no text at all (or only whitespace/punctuation). Any attempt in words, however short or weak, is false.'),
  rejectsTopic: z.boolean().describe('"Rejects the topic." True ONLY if the writer explicitly refuses to do the writing task (e.g. "I will not write about this", "this question is pointless so I won\'t answer"). Drifting away from the topic is false. Declining, refusing or criticising something INSIDE the scenario (e.g. turning down an invitation in an email) is responding to the task, so false.'),
  notInEnglish: z.boolean().describe('"Is not in English." True ONLY if the response is written in a language other than English. English with errors, however many, is false.'),
  entirelyCopiedFromPrompt: z.boolean().describe('"Is entirely copied from the prompt." True ONLY if EVERY sentence is copied from the prompt and the writer added no words of their own. A response MOSTLY borrowed from the prompt with some original words is band 1 ("minimal original language; any coherent language is mostly borrowed from the stimulus"), so false.'),
  entirelyUnconnected: z.boolean().describe('"Is entirely unconnected to the prompt." True ONLY if NOTHING in the response relates to the prompt: it is about a different subject from start to finish and could have been written without reading the prompt. If ANY part addresses the prompt\'s situation, people, question or topic (even a greeting to the right person, or one relevant sentence among irrelevant ones), it is false: mostly irrelevant content is band 2 ("limited or irrelevant elaboration"), not 0.'),
  arbitraryKeystrokes: z.boolean().describe('"Consists of arbitrary keystrokes." True ONLY if the response is random characters or keyboard mashing rather than words.'),
  feedback: z.string().describe('1-2 sentences of feedback for the student, written in the requested output language, explaining why this scores 0 and what to do instead. Leave empty if no flag is true.'),
})

export const ZERO_GATE_FLAGS = [
  'noResponse',
  'notInEnglish',
  'entirelyUnintelligible',
  'rejectsTopic',
  'entirelyCopiedFromPrompt',
  'entirelyUnconnected',
  'arbitraryKeystrokes',
] as const

export type ZeroGateFlag = (typeof ZERO_GATE_FLAGS)[number]

/** Either skill's gate result. A flag that skill's schema does not ask is
 *  absent, and an absent flag never fires. */
export type ZeroGate = {
  quotedSpan: string
  reasoning: string
  feedback: string
  /** Writing only: the evidence fields reconcileWritingGate checks. */
  connectedSpan?: string
  originalWords?: string
  refusalQuote?: string
} & Partial<Record<ZeroGateFlag, boolean>>

function normalizeForQuote(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

/** True when every ellipsis-separated piece of `quote` occurs in `text`. */
export function quoteOccursIn(quote: string | undefined, text: string): boolean {
  if (!quote) return false
  const hay = ` ${normalizeForQuote(text)} `
  const pieces = quote.split(/\.\.\.|…/).map(normalizeForQuote).filter(Boolean)
  return pieces.length > 0 && pieces.every(p => hay.includes(` ${p} `))
}

/**
 * Drop any Writing zero flag that the gate's OWN quoted evidence
 * contradicts. On the 2026-10-07 ladder gpt-4o-mini marked fluent emails
 * "entirely unconnected" that open "Dear Professor Lee, Thank you for your
 * email about the symposium" and end by declining the symposium role:
 * the description already said a greeting to the right person makes the
 * flag false, and the model ticked it anyway. A rule the model reads is
 * not a rule it follows, so the guide's word "entirely" is enforced here:
 *
 *  - entirelyUnconnected needs NO quoted span of the response that
 *    relates to the prompt;
 *  - entirelyCopiedFromPrompt needs NO quoted words of the writer's own
 *    (a quote counts only if it is in the response and holds at least one
 *    word that is not in the prompt);
 *  - rejectsTopic needs a quoted refusal that is actually in the response.
 *
 * A quote that is not in the response is not evidence and is ignored.
 * Every other flag (blank, not in English, arbitrary keystrokes) stands.
 */
export function reconcileWritingGate(gate: ZeroGate, promptText: string, responseText: string): ZeroGate {
  const out = { ...gate }
  if (out.entirelyUnconnected && quoteOccursIn(gate.connectedSpan, responseText)) {
    out.entirelyUnconnected = false
  }
  if (out.entirelyCopiedFromPrompt && quoteOccursIn(gate.originalWords, responseText)) {
    const promptWords = new Set(normalizeForQuote(promptText).split(' '))
    const ownWord = normalizeForQuote(gate.originalWords ?? '').split(' ').some(w => w && !promptWords.has(w))
    if (ownWord) out.entirelyCopiedFromPrompt = false
  }
  if (out.rejectsTopic && !quoteOccursIn(gate.refusalQuote, responseText)) {
    out.rejectsTopic = false
  }
  return out
}

export function zeroGateSchemaFor(skill: ResponseSkill): z.ZodType<ZeroGate> {
  return skill === 'writing' ? WritingZeroGateSchema : ZeroGateSchema
}

/**
 * The 0-band conditions, which are NOT the same for the two skills.
 *
 * Taken verbatim from the official ETS scoring guides (2025 PDFs; diffed
 * again with `pdftotext -layout` on 2026-10-07):
 *
 *   Writing 0  — "The response is blank, rejects the topic, is not in
 *                 English, is entirely copied from the prompt, is
 *                 entirely unconnected to the prompt or consists of
 *                 arbitrary keystrokes."
 *   Speaking 0 — "No response OR the response is entirely unintelligible
 *                 OR there is no English in the response OR the content
 *                 is entirely unconnected to the prompt (or consists only
 *                 of phrases such as 'I don't know')."
 *
 * Speaking's list contains neither "rejects the topic" nor "entirely
 * copied from the prompt". Copying is explicitly a TWO there — the score
 * 2 descriptor reads "consists mainly of language from the question" —
 * so zeroing a spoken response for it is two bands below the published
 * rubric. We had been applying the Writing conditions to both skills.
 *
 * The leak also ran the other way: Writing's list does not contain
 * "entirely unintelligible", which is Speaking's. The Writing guides put
 * unintelligibility at band 1. Until 2026-10-07 Writing used every flag,
 * that one included, and zeroed borrowed-language band-1 answers as
 * "entirely unintelligible".
 */
const WRITING_ZERO_FLAGS = [
  'noResponse',
  'rejectsTopic',
  'notInEnglish',
  'entirelyCopiedFromPrompt',
  'entirelyUnconnected',
  'arbitraryKeystrokes',
] as const
const SPEAKING_ZERO_FLAGS = [
  'noResponse',
  'notInEnglish',
  'entirelyUnintelligible',
  'entirelyUnconnected',
] as const

export function zeroGateFlagsFor(skill: ResponseSkill): readonly ZeroGateFlag[] {
  return skill === 'speaking' ? SPEAKING_ZERO_FLAGS : WRITING_ZERO_FLAGS
}

/** Any single ETS 0-band condition FOR THAT SKILL scores the response 0. */
export function zeroGateTriggered(gate: ZeroGate, skill: ResponseSkill): boolean {
  return zeroGateFlagsFor(skill).some(flag => gate[flag] === true)
}

/** Which conditions fired — persisted in the grade summary evidence. */
export function zeroGateReasons(gate: ZeroGate, skill: ResponseSkill): string[] {
  return zeroGateFlagsFor(skill).filter(flag => gate[flag] === true)
}

// --- Stage 2: relevance ladder ---------------------------------------------
// Exactly one level, applied as a CEILING on the final band — never
// averaged with the language score.

export const RELEVANCE_LEVELS = [
  'fully_on_topic_well_elaborated',
  'on_topic_elaborated',
  'generally_on_topic_limited_elaboration',
  'minimally_connected',
  'vaguely_connected',
  'entirely_unconnected',
] as const

export type RelevanceLevel = (typeof RELEVANCE_LEVELS)[number]

/** ETS band ceiling per relevance level, on the 0–5 holistic scale. */
export const RELEVANCE_CEILING_5: Record<RelevanceLevel, number> = {
  fully_on_topic_well_elaborated: 5,
  on_topic_elaborated: 4,
  generally_on_topic_limited_elaboration: 3,
  minimally_connected: 2,
  vaguely_connected: 1,
  entirely_unconnected: 0,
}

export const RelevanceSchema = z.object({
  promptDemands: z.array(z.string()).min(1).max(4).describe('The specific things the prompt asks the responder to do or say.'),
  onTopicEvidence: z.string().describe('Quote the span(s) of the response that genuinely address those demands. Empty string if there are none.'),
  offTopicEvidence: z.string().describe('Quote the span(s) that are irrelevant to the demands — content that does not answer the prompt. Empty string if there are none.'),
  borrowedLanguageEvidence: z.string().describe('Quote the span(s) that are lifted from the prompt rather than original language. Empty string if there are none.'),
  elaborationAssessment: z.string().describe('1-2 sentences: is the on-topic content actually elaborated (explanation, example, detail), or asserted and dropped?'),
  irrelevantShare: z.enum(['none', 'some', 'substantial', 'most']).describe('How much of the response is irrelevant to the prompt. Irrelevant elaboration counts AGAINST the response — never credit it as length.'),
  level: z.enum(RELEVANCE_LEVELS).describe('Exactly one relevance level, chosen AFTER the evidence above.'),
})

export type Relevance = z.infer<typeof RelevanceSchema>

/**
 * Convert a relevance level into a band ceiling on an arbitrary scale.
 * The ETS ladder is defined on the 0–5 holistic scale; for IELTS's 0–9
 * scale it is projected proportionally and rounded to the nearest half
 * band, which keeps the intent ("vaguely connected can never be a good
 * band") without pretending ETS published an IELTS ladder.
 */
export function relevanceCeiling(level: RelevanceLevel, scaleMax: number): number {
  const base = RELEVANCE_CEILING_5[level]
  if (scaleMax === 5) return base
  return Math.round(((base / 5) * scaleMax) * 2) / 2
}

// ---------------------------------------------------------------------------
// Anchored examples — one strong, one weak per rubric.
// ---------------------------------------------------------------------------

const ANCHORS: Record<string, string> = {
  toefl_writing_email: `
TOEFL Writing — Write an Email (7 minutes, ~100+ words). The prompt
gives a scenario (an email or notice received) plus the points to
address. Score on task coverage + social conventions + language.

[Strong — score 5]
Scenario: Professor invites student to a guest lecture next Friday at
3pm, which conflicts with part-time job. Points to address:
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
Hallmarks: all 3 points addressed; the refusal is softened and the
request is formulated politely (social conventions); specific reason;
formal-but-warm register appropriate to a professor. ~115 words.

[Weak — score 2]
Same scenario. Response: "Hi prof, thanks for the invite. I cant come
because I have work that day. Can you send me the recording? Bye."
Hallmarks: points touched but elaboration is minimal; register far too
casual for a professor ("Hi prof", "Bye"); bare imperative request; no
specific reason; apostrophe errors. 24 words — well under target.

[Weak — score 2, relevance failure]
Same scenario. Response: "Dear Professor Chen, Thank you for your
email. I want to tell you that I really enjoy this course. Last
semester I took a statistics class and it was very difficult but I
worked hard and got a good grade. I believe hard work is the most
important thing for a student. I hope you have a nice weekend.
Best, Jamie"
Hallmarks: fluent, polite, well-formed English — and almost entirely
IRRELEVANT. It never explains the conflict and never asks about a
recording. The off-prompt story about statistics is irrelevant
elaboration and must NOT be credited as development.
`.trim(),

  toefl_writing: `
TOEFL Writing for an Academic Discussion. Professor poses a question
to a class; two students reply; the learner contributes their own
opinion + reasoning in 10 minutes, ≥100 words.

[Strong — score 5]
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
Hallmarks: a RELEVANT and very clearly expressed contribution; engages
another poster by name with nuance; precise vocabulary; concrete
evidence; a defensible thesis.

[Weak — score 2]
Same context. Response: "I think transit is better. Many people use
the bus and subway every day in big city. Sarah say highway is good
but I don't agree. Highway make traffic problem and pollution. Transit
is more friendly to environment. Also it is cheaper for student.
That is why I think government should invest in transit more."
Hallmarks: only partially relevant and poorly elaborated — recycles the
prompt's own framing rather than extending it; no evidence; agreement
errors ("Sarah say", "Highway make"); slogan-level support.
`.trim(),

  toefl_speaking: `
TOEFL Speaking — Take an Interview. No preparation time; ~45 s answer.

[Strong — score 5]
Question: "Tell me about a time you helped a classmate."
"Last term a classmate in my chemistry lab kept getting the titration
endpoint wrong, so she was failing the weekly write-ups. I stayed
after the session and walked her through reading the meniscus and
timing the drops, and then we redid one titration together so she
could see the colour change herself. By the next week her numbers
matched the reference values, and honestly explaining it out loud
made my own understanding sharper too."
Hallmarks: fully addresses the question, on topic and WELL elaborated
(a specific incident, what was actually done, the outcome); good
conversational pace; easily intelligible.

[Weak — score 2 — fluent but minimally connected]
Same question. Response: "Well, I think helping is very important in
our society. Many people say that education is the key to success,
and I completely agree with this statement. In my opinion, students
should always try their best and never give up, because hard work is
the most important thing in life."
Hallmarks: delivered fluently with clean grammar — and it NEVER answers
the question. There is no classmate, no time, no help. It is minimally
connected to the interviewer's question with no relevant elaboration:
band 2, NOT band 3 or 4. Fluency must not raise it.

[Weak — score 1]
Same question. Response: "Classmate... uh... classmate is friend in
school. Help. Yes. I like my school very much."
Hallmarks: only vaguely connected to language in the question; isolated
words and phrases.
`.trim(),

  toefl_speaking_listen_repeat: `
TOEFL Speaking — Listen and Repeat. Score the ACCURACY of the
repetition only.

[Score 5] Stimulus: "The library closes early on Friday afternoons."
Repetition: "The library closes early on Friday afternoons." — exact,
fully intelligible.

[Score 4] Repetition: "The library closes early on Friday afternoon."
— meaning captured; a single number marker changed.

[Score 3] Repetition: "The library opens early on Friday afternoons."
— essentially a full repetition, but the meaning is not preserved.

[Score 2] Repetition: "The library... Friday." — a significant part of
the sentence is missing; fragmentary.
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

