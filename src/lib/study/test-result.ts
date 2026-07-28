/**
 * Shared arithmetic for the test RESULT screen.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Three places render the outcome of one completed test — the post-submit
 * view, the durable summary, and a rebuild inside TestSession — and each
 * derived its own numbers. On 2026-07-28 that produced four bugs of one
 * shape, a value computed from data the caller had but did not pass:
 *
 *   c586d29  SAT curve applied to a TOEFL test
 *   8846306  the same, fixed at source after the first fix missed a screen
 *   c4fd14a  SAT MATH scored on the Reading & Writing curve — a 90-100
 *            point error, because the section argument defaults
 *   f4bda17  Complete-the-Words shown as raw JSON on one screen only
 *
 * None threw. Each rendered a plausible wrong number. So the rules live
 * here once, and the renderers ask rather than derive.
 *
 * WHAT IS DELIBERATELY NOT HERE
 * -----------------------------
 * `weightedScore` stays in api/study/test/submit. The result screen must
 * NEVER recompute correct/total: those come from study_sessions
 * (correct_count / total_count), written once at submit. Recomputing from
 * study_attempts counts CARDS where the session row counts SCORED
 * QUESTIONS — 10/30 where submit recorded 6/35 on a real session. If a
 * caller ever needs weightedScore client-side, that is the bug.
 */

/** The three units on this screen, which are NOT interchangeable and have
 *  been silently mixed four times:
 *   - CARD      one row / one study_attempts row. A Complete-the-Words
 *               paragraph is ONE card.
 *   - DELIVERED weighted position count; a CtW card is `blanks.length`.
 *               This is the "Question 12-21 of 48" numbering.
 *   - SCORED    what the score is out of. Excludes unscored pilots and
 *               open-response items. Lives in study_sessions.total_count.
 *  Every label rendering one of these must name its unit. */
export type ResultUnit = 'card' | 'delivered' | 'scored'

/** Minimal shape of a stored question. Structural rather than the submit
 *  route's Zod type, so both the server (which has the Zod object) and the
 *  client (which reads study_attempts.question jsonb) can pass one. */
export interface ResultQuestion {
  type?: string | null
  correct_answer?: string | null
  correct_answers?: string[] | null
  acceptable_answers?: string[] | null
  blanks?: { id: number; answer: string; alternates?: string[] | null }[] | null
}

/**
 * What to SHOW as the correct answer.
 *
 * Not the same as `correct_answer`: fill_in_blanks keeps its key in
 * `blanks[]` and leaves `correct_answer` empty, multi_select spreads it
 * across `correct_answers`, numeric_entry across `acceptable_answers`, and
 * open-response has none at all.
 *
 * TestSession's DB rebuild used `q.correct_answer ?? ''` instead, so a CtW
 * item showed its blanks right after submitting and an EMPTY green box on
 * reopening — the same item, two answers, depending on how you arrived.
 */
export function displayCorrectAnswer(q: ResultQuestion): string {
  if (q.type === 'numeric_entry') return q.acceptable_answers?.[0] ?? ''
  if (q.type === 'multi_select') return (q.correct_answers ?? []).join(' + ')
  if (q.type === 'fill_in_blanks') {
    return (q.blanks ?? []).map(b => `[${b.id}] ${b.answer}`).join(', ')
  }
  // Open-response: rubric-graded elsewhere, no single correct answer.
  if (q.type === 'speaking_interview') return '—'
  if (q.type === 'writing_email' || q.type === 'writing_discussion') return '—'
  return q.correct_answer ?? ''
}

/** How many DELIVERED questions one card is worth. A Complete-the-Words
 *  paragraph is its blank count; everything else is 1. */
export function deliveredWeight(q: { type?: string | null; blanks?: { id: number }[] | null }): number {
  return q.type === 'fill_in_blanks' ? Math.max(1, q.blanks?.length ?? 1) : 1
}

export interface ReviewRange { startAt: number; endAt: number }

/**
 * Per-card DELIVERED position ranges, so review labels match the numbering
 * the student saw while taking the test ("Question 12-21 of 48"). Returns
 * one range per card plus the delivered total.
 */
export function reviewRanges(questions: { type?: string | null; blanks?: { id: number }[] | null }[]): {
  ranges: ReviewRange[]
  deliveredTotal: number
} {
  const ranges: ReviewRange[] = []
  let acc = 0
  for (const q of questions) {
    const w = deliveredWeight(q)
    ranges.push({ startAt: acc + 1, endAt: acc + w })
    acc += w
  }
  return { ranges, deliveredTotal: acc }
}

/** A question as the result screen needs to RENDER it, not merely score it. */
export interface ResultRowQuestion extends ResultQuestion {
  prompt: string
  passage?: string | null
  choices?: string[] | null
  explanation?: string | null
  graphic?: unknown
  distractor_rationales?: { choice: string; reason: string }[] | null
  /** ETS pilot marker. Written ONLY when false — a live check found the key
   *  absent, JSON-null, or false, never true — so `=== false` is the test. */
  scored?: boolean | null
}

/** One CARD. Not one question: a Complete-the-Words paragraph is one row
 *  here and ten DELIVERED questions in `range`. */
export interface ResultRow {
  question: ResultRowQuestion
  studentAnswer: string | null
  correct: boolean
  /** Open response — rubric-graded elsewhere, no ✓/✗ and no denominator. */
  ungraded: boolean
  /** Pilot: graded and shown, excluded from the denominator. Distinct from
   *  `ungraded`, and needs different words in front of the student. */
  isPilot: boolean
  correctAnswerDisplay: string
  /** DELIVERED position range, or null when this session can't be numbered. */
  range: ReviewRange | null
}

export interface ResultCardInput {
  question: ResultRowQuestion
  studentAnswer: string | null
  correct: boolean
  ungraded: boolean
  position?: number | null
}

export interface TestResultModel {
  family: TestFamily
  /** SCORED unit. Straight from the caller — see the weightedScore note. */
  correctCount: number
  totalScored: number
  scorePercent: number
  /** DELIVERED unit. Differs from totalScored exactly when pilots exist. */
  deliveredTotal: number
  /** False => legacy session, rows render without position labels. */
  numbered: boolean
  rows: ResultRow[]
}

/**
 * The single normalization both result screens go through.
 *
 * Takes the headline numbers rather than deriving them, on purpose: the
 * post-submit screen has them from the submit response and the durable
 * screen has them from study_sessions, and recomputing on either side is
 * how "10/30" ended up under a recorded 6/35. This function's job is the
 * per-row shape and the numbering — not the score.
 */
export function buildResultModel(input: {
  family: TestFamily
  correctCount: number
  totalScored: number
  scorePercent: number
  cards: ResultCardInput[]
}): TestResultModel {
  const numbered = canNumberRows(input.cards)
  const { ranges, deliveredTotal } = reviewRanges(input.cards.map(c => c.question))
  return {
    family: input.family,
    correctCount: input.correctCount,
    totalScored: input.totalScored,
    scorePercent: input.scorePercent,
    deliveredTotal,
    numbered,
    rows: input.cards.map((c, i) => ({
      question: c.question,
      studentAnswer: c.studentAnswer,
      correct: c.correct,
      ungraded: c.ungraded,
      isPilot: c.question.scored === false,
      correctAnswerDisplay: displayCorrectAnswer(c.question),
      range: numbered ? (ranges[i] ?? null) : null,
    })),
  }
}

export type TestFamily = 'toefl' | 'sat' | 'other'
export type SatSection = 'math' | 'reading_writing'

/**
 * Which exam this is. Written three separate times before this, and the
 * copy that omitted it applied the SAT curve to a TOEFL test.
 *
 * Accepts either a topic slug ("toefl-reading", "sat-math") or a bare
 * family label ("toefl"), because the two result screens have different
 * things to hand: the durable screen has the topic slug, the post-submit
 * screen has the payload's free-form `family: string | null`. Taking both
 * is what lets them reach the same answer through the same rule instead
 * of each interpreting its own field.
 */
export function familyFromTopicSlug(slugOrFamily: string | null | undefined): TestFamily {
  const s = (slugOrFamily ?? '').trim().toLowerCase()
  if (s === 'toefl' || s.startsWith('toefl-')) return 'toefl'
  if (s === 'sat' || s.startsWith('sat-')) return 'sat'
  return 'other'
}

/**
 * Can this session's rows be numbered?
 *
 * The review list labels each row with its DELIVERED range ("Question
 * 12-21 of 48"), which is only meaningful if the rows are in the order the
 * student saw them. `position` carries that order — but it was added later,
 * and on 2026-07-28 a live check found it NULL on 519 of 932 full-test
 * attempt rows: 23 of 37 sessions, a clear majority.
 *
 * Nothing else recovers the order for those rows:
 *   - `created_at` is a single shared timestamp on EVERY full-test session
 *     (1 distinct value per session, all 37), so ordering by it is a no-op
 *     that returns whatever Postgres feels like. /summary orders by it
 *     today; that is harmless only because its mistake list is unordered.
 *   - physical row order looked promising and is not: against the sessions
 *     that DO have `position`, ctid rank disagreed on 214 of 413 rows
 *     across 7 of 12 sessions.
 *
 * So legacy sessions get no numbers rather than confident wrong ones — a
 * label pointing at the wrong question is worse than no label. Renumbering
 * by array index is exactly the trap: it always produces a plausible
 * sequence, and on these sessions it would be arbitrary.
 */
export function canNumberRows(rows: { position?: number | null }[]): boolean {
  return rows.length > 0 && rows.every(r => typeof r.position === 'number')
}

/** Which College Board conversion table applies. NOT optional in practice:
 *  estimateSectionScore defaults to 'reading_writing', and a caller that
 *  omitted it scored every SAT Math session on the wrong curve — roughly a
 *  90-100 point error presented as the student's estimate. */
export function satSectionFromTopicSlug(slug: string | null | undefined): SatSection {
  return (slug ?? '').includes('math') ? 'math' : 'reading_writing'
}
