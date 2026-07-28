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

export type TestFamily = 'toefl' | 'sat' | 'other'
export type SatSection = 'math' | 'reading_writing'

/** Topic slugs follow "<family>-<section>" (toefl-reading, sat-math, ...).
 *  Derived here once: this rule was written three separate times, and one
 *  copy omitting it is what applied the SAT curve to a TOEFL test. */
export function familyFromTopicSlug(slug: string | null | undefined): TestFamily {
  const s = slug ?? ''
  if (s.startsWith('toefl-')) return 'toefl'
  if (s.startsWith('sat-')) return 'sat'
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
