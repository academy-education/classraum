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
import { scoreAdmission, type AdmissionScore } from './admission-tests'
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
  /** Which passage / lecture this item hangs off. Present on 485 of 824
   *  live TOEFL attempt rows and on ZERO of 1041 SAT rows, which is why
   *  the per-set card is not an SAT feature — it self-hides there
   *  because there is nothing to group on, not because we branch. */
  passageGroupId?: string | null
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
  /** Delivery order as stored, or null on a legacy row. Carried rather
   *  than re-derived from the array index: `moduleSplit` cuts the test at
   *  a card index, and cutting an array whose order is not known to be
   *  the delivery order is precisely the trap canNumberRows exists to
   *  refuse. Array index would ALWAYS produce a plausible split. */
  position: number | null
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
      position: typeof c.position === 'number' ? c.position : null,
    })),
  }
}

/**
 * Where every DELIVERED QUESTION went, as a genuine partition.
 *
 * Counted in QUESTIONS, not items, and that is the whole point. Two
 * earlier versions of this display were wrong:
 *
 *  1. chips read "30 GRADED / 13 PILOT" on a 30-item test — a pilot is
 *     also graded, so they overlapped while laid out as if they summed.
 *  2. the buckets then counted ITEMS while the score above counts
 *     QUESTIONS, so "Counted toward your score: 17" sat under "6 / 35"
 *     and reconciled with nothing on screen. The account owner read the
 *     header and asked whether 30 meant the number they got wrong — the
 *     honest answer being that the number related to nothing they could
 *     see.
 *
 * Weighted by delivered questions, `counted` IS the score denominator.
 * Verified against every real full test on the account: 35/35, 35/35,
 * 50/50, 44/44, 7/7.
 *
 * Skipped is NOT a fourth bucket. submit's weightedScore zeroes the
 * denominator only for pilots and open response, so an unanswered
 * question still counts — as wrong. Pulling it out of `counted` would
 * break the identity above the moment a student left a blank. It is
 * reported as a detail INSIDE counted instead.
 */
export interface ResultTally {
  /** Delivered questions in the score denominator. Equals totalScored. */
  counted: number
  /** Graded and shown, excluded from the score (ETS pilot). */
  pilot: number
  /** Rubric-graded open response — no key, not in the denominator. */
  rubric: number
  /** Subset of `counted` left blank. Counted as wrong, still counted. */
  skippedWithinCounted: number
}

export function tallyRows(rows: ResultRow[]): ResultTally {
  const tally: ResultTally = { counted: 0, pilot: 0, rubric: 0, skippedWithinCounted: 0 }
  for (const r of rows) {
    const w = deliveredWeight(r.question)
    if (r.ungraded) tally.rubric += w
    else if (r.isPilot) tally.pilot += w
    else {
      tally.counted += w
      if (r.studentAnswer == null) tally.skippedWithinCounted += w
    }
  }
  return tally
}

/**
 * SSAT / ISEE raw scoring for the result screen.
 *
 * These two do not score like anything else here, and percent correct —
 * what the screen showed before — is simply the wrong number for SSAT:
 * a wrong answer costs a quarter point and a BLANK costs nothing, so two
 * students with identical accuracy and different skip rates have
 * different scores.
 *
 * Nothing new is stored for this. tallyRows already separates
 * `skippedWithinCounted` from the rest, because study_attempts keeps
 * `student_answer` null for a blank, so correct / wrong / omitted is
 * recoverable from rows the submit path already writes.
 */
export function admissionScoreFromRows(
  family: 'ssat' | 'isee',
  rows: ResultRow[],
  correctCount: number,
): AdmissionScore {
  const tally = tallyRows(rows)
  const omitted = tally.skippedWithinCounted
  // Clamped because correctCount comes from study_sessions and the rows
  // from study_attempts. They should agree; if a session was ever written
  // inconsistently a negative `wrong` would silently inflate an SSAT raw
  // score, which is the one direction this must not fail in.
  const wrong = Math.max(0, tally.counted - correctCount - omitted)
  return scoreAdmission(family, { correct: correctCount, wrong, omitted })
}

/**
 * Where a score sits on its own scale, 0..1, for a meter.
 *
 * The floor matters and is easy to drop. TOEFL bands run 1..6, not 0..6:
 * dividing by the max alone puts the WORST possible band at 17% full,
 * which reads as partial credit for a score that has none. SAT sections
 * run 200..800 and have the same trap, four times larger.
 */
export function scaleFraction(value: number, min: number, max: number): number {
  if (!(max > min)) return 0
  return Math.max(0, Math.min(1, (value - min) / (max - min)))
}

export type TestFamily = 'toefl' | 'sat' | 'ssat' | 'isee' | 'other'
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
  // BEFORE the sat check: 'ssat-reading' does not start with 'sat-', but
  // ordering these deliberately documents that the two families share a
  // suffix and a careless startsWith would collide.
  if (s === 'ssat' || s.startsWith('ssat-')) return 'ssat'
  if (s === 'isee' || s.startsWith('isee-')) return 'isee'
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

/** One rubric grade as the /api/study/response/grades route returns it. */
export interface RubricGrade {
  band: number
  scaleMax: number
  summary: string | null
  skill: string
  /** Storage path of the student's recording, for Speaking. Present so
   *  the DURABLE summary can offer playback: the live post-submit screen
   *  still holds the path in component state, but a reopened session has
   *  only what the grades endpoint returns. */
  audioPath?: string | null
}

export interface ScoreSplit {
  /** Key-matched items: the only part the headline percentage covers. */
  objective: { correct: number; total: number; percent: number }
  rubric: {
    earned: number; max: number; percent: number; graded: number
    /** Answered, grade not back yet. Genuinely still in flight. */
    pending: number
    /** Left blank. Will never be graded, so calling it "being scored"
     *  promises a mark that is not coming. Reported separately. */
    skipped: number
  }
  /** True when rubric items exist — i.e. the headline percentage is
   *  reporting on less than the student actually did. */
  hasRubric: boolean
}

/**
 * Split the result into the two things that are scored in different ways.
 *
 * This exists because the headline percentage is NOT the whole section.
 * `weightedScore` returns total: 0 for open responses, so a TOEFL Speaking
 * result that reads "43%" is describing the seven Listen-and-Repeat items
 * and silently omitting the four interview answers — the part the student
 * spent most of the section actually speaking. Reporting one number for
 * two scales would be worse, not better; the honest move is to show both
 * and say which one the headline refers to.
 *
 * Pilots belong to neither: they are delivered and shown but excluded from
 * the denominator by design, and `tallyRows` already accounts for them.
 */
export function scoreSplit(
  rows: ResultRow[],
  grades: Record<string, RubricGrade>,
): ScoreSplit {
  let correct = 0, total = 0
  let earned = 0, max = 0, graded = 0, pending = 0, skipped = 0

  for (const r of rows) {
    const w = deliveredWeight(r.question)
    if (r.ungraded) {
      const g = grades[r.question.prompt ?? '']
      if (g) {
        earned += g.band
        max += g.scaleMax
        graded += 1
      } else if (r.studentAnswer == null || r.studentAnswer.trim() === '') {
        // Never answered. There is nothing to grade and nothing coming,
        // so it must not be reported as in-flight. It is also NOT folded
        // into `max` as a zero: the scale belongs to the rubric and is
        // only known from a grade that will never arrive. Shown as its
        // own count instead of quietly shrinking the denominator.
        skipped += 1
      } else {
        // Answered, grade not back. Counting it as zero would report a
        // worse score than the student earned, so it is left outstanding.
        pending += 1
      }
    } else if (!r.isPilot) {
      total += w
      if (r.correct) correct += w
    }
  }

  return {
    objective: { correct, total, percent: total > 0 ? Math.round(100 * correct / total) : 0 },
    rubric: {
      earned, max, percent: max > 0 ? Math.round(100 * earned / max) : 0,
      graded, pending, skipped,
    },
    hasRubric: graded + pending + skipped > 0,
  }
}

/**
 * TOEFL scaled score, 0–30.
 *
 * ETS's chain is raw → scaled → band, and the band is DERIVED from the
 * scaled score rather than computed alongside it. Keeping that order is
 * the whole point: the screen used to show a band from a hand-written
 * percent→band step table AND a 0–30 figure from `percent × 30`, two
 * unrelated formulas. They disagreed. One real result displayed "band
 * 3.0" next to "13 / 30" — and 13 ÷ 5 is 2.6, so the two rows were
 * describing different scores on the same test.
 */
export function toeflScaledScore(percent: number): number {
  if (!Number.isFinite(percent)) return 0
  return Math.max(0, Math.min(30, Math.round((percent / 100) * 30)))
}

/**
 * TOEFL section band, 1–6 in half-band steps, derived from the scaled
 * score. Floors at 1.0 because the published scale starts there — a
 * scaled 0 is a band 1, not a band 0.
 */
export function toeflBandFromScaled(scaled: number): number {
  if (!Number.isFinite(scaled)) return 1
  const raw = Math.max(0, Math.min(30, scaled)) / 5
  return Math.max(1, Math.min(6, Math.round(raw * 2) / 2))
}

/** Convenience: percent straight through the whole chain. */
export function toeflBandFromPercent(percent: number): number {
  return toeflBandFromScaled(toeflScaledScore(percent))
}

/* ------------------------------------------------------------------ *
 * MODULE 1 vs MODULE 2
 * ------------------------------------------------------------------ */

export interface ModuleAccuracy {
  /** SCORED QUESTIONS answered correctly in this module. */
  correct: number
  /** SCORED QUESTIONS in this module. */
  total: number
  percent: number
}

export interface ModuleSplit {
  module1: ModuleAccuracy
  module2: ModuleAccuracy
}

/**
 * Per-module accuracy for a two-module adaptive test, in SCORED
 * QUESTIONS so it reconciles with the headline instead of introducing a
 * fourth unit.
 *
 * WHY THIS REFUSES SO OFTEN.
 *
 * Everything about this number is a chance to repeat one of the four
 * bugs this file was written for, so it is computed and then CHECKED
 * against the two numbers that were written by the server:
 *
 *  1. `m1.total + m2.total` must equal `totalScored`, and
 *     `m1.correct + m2.correct` must equal `correctCount`.
 *
 *     This is not a formality. On live data it fails on 7 of 11 adaptive
 *     TOEFL sessions, and the reason is real: submit's weightedScore
 *     gives PARTIAL credit for a Complete-the-Words card (6 of 10 blanks
 *     = 6 points), while `study_attempts.is_correct` is one boolean for
 *     the whole card. Session 3f71f4c6 has 26 correct on the session row
 *     and 10 recoverable from the rows. A module split derived from the
 *     rows would have printed "7 / 20 and 3 / 15" under a hero reading
 *     "26 / 35" — three numbers, no two of which add up.
 *
 *  2. Module 1's correct CARD count must equal `study_sessions.
 *     module1_correct`, which the routing endpoint wrote at the module
 *     break. Cards, not questions: `gradeMultipleChoice` counted cards,
 *     and comparing it against a question count is the same conflation
 *     that put a phantom "19" in the Module 2 banner. On live data this
 *     catches session b13f1ebf, where the route was earned on 6 correct
 *     and the final grade records 0 — the two disagree, so the student
 *     is shown neither.
 *
 * Returns null on any failure. A module breakdown is a nice-to-have; a
 * module breakdown that contradicts the score above it is a bug.
 */
export function moduleSplit(input: {
  rows: ResultRow[]
  /** Index of the FIRST CARD of Module 2 (payload `moduleBreakIdx`, or
   *  equivalently `study_sessions.module1_total`). */
  breakIdx: number | null | undefined
  totalScored: number
  correctCount: number
  /** `study_sessions.module1_correct` — correct CARDS in Module 1 as
   *  graded at the break. Cross-check; omit only if genuinely absent. */
  module1CorrectCards?: number | null
}): ModuleSplit | null {
  const { rows, breakIdx, totalScored, correctCount } = input
  if (typeof breakIdx !== 'number' || !Number.isInteger(breakIdx)) return null
  if (breakIdx <= 0 || breakIdx >= rows.length) return null

  // The cut is on `position`, so it is only meaningful if every row
  // carries one AND they form the complete run 0..n-1. A gap means some
  // rows are missing and the "module" behind the cut is not the module.
  const positions = rows.map(r => r.position)
  // Type guard, not a second gate: the run check below already rejects
  // a null (null !== 0), and a mutation test confirmed that deleting
  // this line alone changes no behaviour. It stays to make the cast
  // sound, and is documented so nobody counts it as a check.
  if (positions.some(p => typeof p !== 'number')) return null
  const sorted = [...(positions as number[])].sort((a, b) => a - b)
  if (sorted.some((p, i) => p !== i)) return null

  let c1 = 0, t1 = 0, c2 = 0, t2 = 0, cards1 = 0
  for (const r of rows) {
    const inM1 = (r.position as number) < breakIdx
    if (inM1 && r.correct) cards1 += 1
    // Same population as the score: pilots and rubric items are not in
    // the denominator, so they are not in a module's denominator either.
    if (r.ungraded || r.isPilot) continue
    const w = deliveredWeight(r.question)
    if (inM1) { t1 += w; if (r.correct) c1 += w }
    else { t2 += w; if (r.correct) c2 += w }
  }

  if (t1 <= 0 || t2 <= 0) return null
  if (t1 + t2 !== totalScored) return null
  if (c1 + c2 !== correctCount) return null
  if (typeof input.module1CorrectCards === 'number'
      && input.module1CorrectCards !== cards1) return null

  return {
    module1: { correct: c1, total: t1, percent: Math.round(100 * c1 / t1) },
    module2: { correct: c2, total: t2, percent: Math.round(100 * c2 / t2) },
  }
}

/* ------------------------------------------------------------------ *
 * PER-PASSAGE-SET ACCURACY
 * ------------------------------------------------------------------ */

export interface PassageSetResult {
  /** 1-based position in the test, by first appearance. */
  ordinal: number
  correct: number
  /** SCORED QUESTIONS behind this set. */
  total: number
  percent: number
}

export interface PassageSetBreakdown {
  sets: PassageSetResult[]
  /** How many passage sets the test actually had, including the small
   *  ones dropped below. Printed, not swallowed. */
  setsInTest: number
  /** Scored questions inside the sets shown. */
  coveredScored: number
  /** Every scored question in the test, so the card can say what share
   *  of the test it is talking about. */
  totalScored: number
}

/**
 * Accuracy per passage / lecture set, in SCORED QUESTIONS.
 *
 * Two refusals, both measured against the live data rather than guessed:
 *
 *  - UNNUMBERED SESSIONS GET NOTHING. The only label available is the
 *    set's position in the test ("Passage 3") — the ids are content
 *    hashes (`pg-0281830051bf…`) with no human-readable form. A position
 *    label on rows whose order is unknown is a confident wrong answer,
 *    which is the trap `canNumberRows` documents. Four live sessions
 *    would otherwise have qualified on set size alone; all four are
 *    legacy rows with no `position`, so none of them get numbers.
 *
 *  - SETS BELOW `minPerSet` SCORED QUESTIONS ARE DROPPED. Bank-drawn
 *    tests carry 10-16 sets of one or two questions each; "0 / 1 on
 *    Passage 7" is noise wearing the costume of insight, and the same
 *    argument already retired the second bracketed prompt segment in
 *    section-breakdown.ts.
 *
 * What survives is a MINORITY of the test — on live sessions the shown
 * sets hold 20-47% of the scored questions. That is why `setsInTest` and
 * `totalScored` are returned: the card must say "4 of 14 passages, 14 of
 * 35 scored questions", never imply it accounts for the whole score.
 */
export function passageSetBreakdown(
  rows: ResultRow[],
  opts: { minPerSet?: number; minSets?: number } = {},
): PassageSetBreakdown | null {
  const { minPerSet = 3, minSets = 2 } = opts
  if (rows.some(r => typeof r.position !== 'number')) return null

  const ordered = [...rows].sort((a, b) => (a.position as number) - (b.position as number))
  const acc = new Map<string, { ordinal: number; correct: number; total: number }>()
  let totalScored = 0

  for (const r of ordered) {
    if (r.ungraded || r.isPilot) continue
    const w = deliveredWeight(r.question)
    totalScored += w
    const gid = (r.question.passageGroupId ?? '').trim()
    if (!gid) continue
    const cur = acc.get(gid) ?? { ordinal: acc.size + 1, correct: 0, total: 0 }
    cur.total += w
    if (r.correct) cur.correct += w
    acc.set(gid, cur)
  }

  const setsInTest = acc.size
  const sets = [...acc.values()]
    .filter(s => s.total >= minPerSet)
    .map(s => ({ ...s, percent: Math.round(100 * s.correct / s.total) }))
    // Weakest first — the point of the card is what to reread.
    .sort((a, b) => a.percent - b.percent || b.total - a.total)

  if (sets.length < minSets) return null
  return {
    sets,
    setsInTest,
    coveredScored: sets.reduce((n, s) => n + s.total, 0),
    totalScored,
  }
}
