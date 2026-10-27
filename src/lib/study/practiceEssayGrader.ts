import { z } from 'zod'
import { withSchemaRetry } from './gradeRetry'
import type { PracticeEssayTask } from './essayChoice'
import {
  PRACTICE_CRITERIA, PRACTICE_SCALE_MAX, clampPracticeScore, practiceOverallBand,
  quoteAppearsIn, type PracticeComment, type PracticeEssayFamily,
} from './practiceEssay'

/**
 * The practice-essay grader: ONE structured model call, no zero gate.
 *
 * Deliberately not the staged ETS pipeline in gradePipeline.ts. That
 * pipeline's prompts quote the TOEFL guides verbatim and its zero gate and
 * relevance ceiling encode ETS's 0-band rules; SSAT and ISEE have no
 * rubric at all, so reusing it would grade an admission essay against a
 * language test's rules while calling them official. What IS reused is the
 * model-call infrastructure: the same provider and model the quality stage
 * uses (gpt-4o, temperature 0, generateObject — see openAiPracticeEssayCall
 * in gradeResponse.ts), the same bounded schema retry, and the same
 * persistence path.
 *
 * No zero gate, by design: CLAUDE.md records a writing zero gate zeroing
 * real on-topic answers. Blank answers never get here (the batch skips
 * them), and an off-topic essay is handled by the prompt criterion and the
 * one-band cap in practiceOverallBand, whose floor is 1.
 */

// ---------------------------------------------------------------------------
// OUR practice rubric. Not an official SSAT or ISEE rubric — neither exists.
// ---------------------------------------------------------------------------

export const PRACTICE_RUBRIC_TEXT = `
This is a PRACTICE rubric written by Classraum. The SSAT and ISEE do not score the writing sample; schools read it as written. Never call these scores official.

Score each criterion from 1 to 5 (half points allowed). Judge the writing as an admissions reader would read a 25-30 minute, handwritten-length response from a student in grades 5-11: do not expect polish that timed conditions do not allow, and do not penalise a short response for length alone if what is there is strong.

addresses_prompt — Responds to the chosen prompt.
  ESSAY prompt: takes a clear position on, or gives a clear answer to, the question actually asked, and keeps to it.
  STORY STARTER: the story begins with, or clearly builds from, the given sentence, and the rest of the story grows out of it.
  5 fully and directly answers the prompt throughout (story: opens with the given sentence and the whole story develops from it).
  4 answers the prompt clearly; a passage drifts briefly.
  3 answers the prompt in general terms, or only part of it (story: uses the sentence but the story could have started anywhere).
  2 touches the prompt but mostly writes about something else (story: the sentence appears but is not what the story is about).
  1 barely connects to the prompt.

organization — A reader can follow it.
  5 clear beginning, middle and end; paragraphs each do one job; transitions carry the reader.
  4 clear overall shape with an occasional abrupt jump.
  3 some structure, but paragraphs blur together or the ending stops rather than concludes.
  2 ideas in a list or a single block; order is hard to follow.
  1 no discernible organisation.

development — ESSAY: development & support. STORY: narrative development.
  ESSAY: reasons explained, with specific examples from experience, reading or observation; acknowledges the other side where it matters.
  STORY: a sequence of events with a problem or change, concrete detail, dialogue or description that shows rather than tells, and an ending that resolves something.
  5 specific, well-chosen detail throughout; every main point (or scene) is developed.
  4 mostly specific; one point or scene stays thin.
  3 ideas stated but explained generally; examples are vague or hypothetical (story: events are summarised more than shown).
  2 assertions with little explanation or detail.
  1 almost no development.

language_style — Word choice and sentences.
  5 precise, lively word choice; varied sentences; a consistent voice that suits the task.
  4 clear and appropriate, with some variety.
  3 understandable but plain and repetitive.
  2 limited vocabulary; awkward phrasing often gets in the way.
  1 language is hard to follow.

conventions — Grammar, spelling, punctuation.
  5 almost no errors beyond the slips anyone makes writing quickly by hand.
  4 a few errors that never obscure meaning.
  3 regular errors that a reader notices but can read past.
  2 frequent errors that sometimes obscure meaning.
  1 errors make much of it hard to read.
`.trim()

const CriterionSchema = z.object({
  key: z.enum(PRACTICE_CRITERIA as unknown as [string, ...string[]])
    .describe('One of the rubric criterion keys, each used exactly once.'),
  evidence: z.string().describe('Quote the exact span from the response that justifies the score, then one sentence of reasoning. Write this BEFORE the number.'),
  score: z.number().describe('1-5, half points allowed.'),
})

export const PracticeEssayGradeSchema = z.object({
  criteria: z.array(CriterionSchema).length(PRACTICE_CRITERIA.length),
  strengths: z.array(z.object({
    quote: z.string().describe('A verbatim span from the student\'s text, at most 160 characters.'),
    comment: z.string().describe('One or two sentences: what works here and why, so the student can do it again.'),
  })).min(1).max(3),
  improvements: z.array(z.object({
    quote: z.string().describe('A verbatim span from the student\'s text, at most 160 characters.'),
    issue: z.string().describe('One sentence: what holds this back.'),
    suggestion: z.string().describe('One or two sentences: a concrete fix, with a rewrite of the quoted span where it helps.'),
  })).min(1).max(4),
  summary: z.string().describe('Two or three sentences: the biggest strength and the single most useful thing to work on next. Honest, specific, encouraging; no empty praise.'),
})
export type PracticeEssayGradeObject = z.infer<typeof PracticeEssayGradeSchema>

export interface PracticeEssayContext {
  family: PracticeEssayFamily
  task: PracticeEssayTask
  language: 'en' | 'ko'
}

export function buildPracticeEssayPrompt(ctx: PracticeEssayContext): string {
  const { task } = ctx
  const testName = ctx.family === 'ssat' ? 'SSAT Writing Sample' : 'ISEE Essay'
  const kindLine = task.kindUncertain
    ? 'The response may be an ESSAY or a STORY: decide which prompt it answers and apply the matching wording of addresses_prompt and development.'
    : task.kind === 'story'
      ? `This is a STORY STARTER response: apply the STORY wording of addresses_prompt and development.${task.starterSentence ? ` The given sentence is: "${task.starterSentence}"` : ''}`
      : 'This is an ESSAY response: apply the ESSAY wording of addresses_prompt and development.'
  const languageLine = ctx.language === 'ko'
    ? 'Output language: Korean (모든 평가·코멘트·요약은 한국어로 작성. 단, quote와 evidence 안의 인용은 학생이 쓴 영어 원문 그대로).'
    : 'Output language: English.'
  return `You are giving PRACTICE feedback on a student's ${testName} response, for the student to learn from.

${PRACTICE_RUBRIC_TEXT}

${kindLine}

Method, in this order:
1. For each of the five criteria, quote the span that justifies it, explain in one sentence, THEN give the score.
2. Name 1-3 strengths and 1-4 improvements. Every quote must be copied EXACTLY from the student's text — never paraphrase inside a quote, never quote the prompt. Put the most useful improvement first.
3. Write the summary.

Do not reward length for its own sake, and do not mark down a response for taking a position you disagree with. Write to the student directly ("you").

${languageLine}

----- THE PROMPT THE STUDENT CHOSE -----
${task.taskText}

----- STUDENT RESPONSE -----
${task.essayText}
`.trim()
}

/** The model call, injectable so tests never reach a real model. */
export type PracticeEssayCall = (args: {
  schema: typeof PracticeEssayGradeSchema
  schemaName: string
  prompt: string
}) => Promise<{ object: PracticeEssayGradeObject; usage?: { tokensIn: number; tokensOut: number } }>

export interface PracticeEssayGradeResult {
  overallBand: number
  scaleMax: number
  criteria: Array<{ key: string; evidence: string; score: number }>
  annotations: PracticeComment[]
  summary: string
  usage: { tokensIn: number; tokensOut: number }
}

/**
 * Grade one practice essay. Throws on any failure — a failed call has NO
 * band. The caller turns the throw into "feedback unavailable / retry",
 * never into a low score.
 */
export async function runPracticeEssayGrade(
  ctx: PracticeEssayContext,
  call: PracticeEssayCall,
): Promise<PracticeEssayGradeResult> {
  if (!ctx.task.essayText.trim()) throw new Error('practice essay: empty response reached the grader')
  const res = await withSchemaRetry('practice_essay', () => call({
    schema: PracticeEssayGradeSchema,
    schemaName: 'practice_essay_grade',
    prompt: buildPracticeEssayPrompt(ctx),
  }))
  const o = res.object
  const scores: Record<string, number> = {}
  for (const c of o.criteria) scores[c.key] = clampPracticeScore(c.score)
  // Throws on a missing criterion rather than inventing one.
  const overallBand = practiceOverallBand(scores)
  const criteria = PRACTICE_CRITERIA.map(k => {
    const c = o.criteria.find(x => x.key === k)!
    return { key: k, evidence: c.evidence, score: scores[k]! }
  })
  const text = ctx.task.essayText
  const annotations: PracticeComment[] = [
    ...o.strengths.map(s => ({
      kind: 'strength' as const, quote: s.quote.slice(0, 200), comment: s.comment,
      quoteVerified: quoteAppearsIn(s.quote, text),
    })),
    ...o.improvements.map(s => ({
      kind: 'improve' as const, quote: s.quote.slice(0, 200), issue: s.issue, suggestion: s.suggestion,
      quoteVerified: quoteAppearsIn(s.quote, text),
    })),
  ]
  return {
    overallBand,
    scaleMax: PRACTICE_SCALE_MAX,
    criteria,
    annotations,
    summary: o.summary,
    usage: res.usage ?? { tokensIn: 0, tokensOut: 0 },
  }
}
