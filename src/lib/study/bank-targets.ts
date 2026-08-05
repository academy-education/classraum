/**
 * WHAT "DONE" MEANS FOR THE QUESTION BANK, as numbers.
 *
 * The product goal is items a little HARDER than the public mock tests,
 * so the real exam feels easier. The blind score measures exactly that:
 * how often a solver picks the key with the passage or audio withheld.
 * Lower = less guessable = harder. So the goal and the defect point the
 * same way, and one number tracks both.
 *
 * ── Why every target is a BAND and not a maximum ─────────────────────
 * Too HIGH and the item is guessable from its options — the defect.
 * Too LOW and the options have stopped being plausible-but-wrong and
 * become arbitrary: a student who understood the passage perfectly
 * still cannot choose. That is not harder, it is unfair, and it stops
 * predicting the real exam.
 *
 * Both ends are failures, so `min` is as real a bar as `max`.
 *
 * ── Where the numbers come from ──────────────────────────────────────
 * `published` is the same attack run against OFFICIAL items — ETS free
 * practice and the College Board question bank — recorded in
 * scripts/study-bank/ledger.json. Real items are themselves guessable:
 * SAT R&W scores 71.6%, TOEFL reply tasks 62.2%. Targeting chance (25%)
 * would mean building questions harder to guess than the actual exam,
 * which nobody asked for.
 *
 * Each band therefore sits BELOW its published figure — harder than the
 * public tests — with the floor keeping it from tipping into arbitrary.
 *
 * CAVEAT worth carrying: those baselines are n=23-48. A batch landing a
 * few points under its published figure is inside the noise, which is
 * why the bands are ~10 points wide rather than a single number.
 */

export interface Target {
  /** Blind-score band. Both ends are pass/fail. */
  min: number
  max: number
  /** The official-item figure this band was set against, for display. */
  published: number | null
  /** Why this task gets this band — shown on hover, so it is never a
   *  number the reader has to take on trust. */
  note: string
}

/**
 * Not applicable: the attack withholds a SOURCE, so it only means
 * something where a source does work.
 *
 * - Grammar/punctuation items carry the sentence in the STEM; the skill
 *   is the rule, and there is nothing to withhold.
 * - Free-response tasks have no options to shuffle.
 * - MATHS carries the whole problem in the stem. See below.
 *
 * ── Why maths was moved here on 2026-08-04 ───────────────────────────
 * All four maths domains scored 100% "blind" and were reported as the
 * bank's worst cohorts. That number measures nothing about the items.
 *
 * attack-cohort.mjs KEEPS the stem, deliberately — ANSWERABILITY-GATE.md
 * says the threat model is "can you answer without the SOURCE", not
 * "without the question", which is right for listening and reading where
 * the audio or passage is the withheld source. Maths has no separate
 * source: all 848 items have `passage = null` and the stem is the whole
 * problem ("In the system 3x - 5y = 12 and 9x + ky = 30 there is no
 * solution, what is k?"). Handing a solver the stem hands it everything,
 * so 100% means the solver did the algebra, not that the item leaks.
 *
 * This file previously claimed the opposite — "the maths attack removes
 * the stem entirely, so a solver has nothing legitimate to reason from"
 * — and that sentence was written here by me with nothing checking it.
 * It then set a 25-35% band that 848 items were judged against.
 *
 * CAVEAT, deliberately recorded rather than quietly excluded: 132 of the
 * 848 DO carry a graphic (Geometry 70, PSDA 46, Advanced Math 6, Algebra
 * 10). For those the figure IS a withheld source and a figure-blind
 * attack would be meaningful. That gate does not exist yet, so those
 * items are neither measured nor claimed — they are counted out of scope
 * here only because the CURRENT instrument cannot judge them.
 */
export const NOT_APPLICABLE = new Set([
  'Standard English Conventions',
  'Build a Sentence', 'Listen and Repeat', 'Complete the Words',
  'Email', 'Academic Discussion', 'Interview',
  'Algebra', 'Advanced Math', 'Geometry and Trigonometry',
  'Problem-Solving and Data Analysis',
])

/**
 * Maths items carrying a figure. Counts measured 2026-08-04.
 *
 * ── MEASURED 2026-08-05. They fail. ──────────────────────────────────
 * This used to say a figure-blind attack "does not exist yet". It does
 * now — scripts/study-bank/attack-figure-blind.mjs — and 24 of these
 * items scored 80.6% with the figure removed, against a 25.0% control.
 *
 * Read that the opposite way to every other score in this file: a HIGH
 * figure-blind score means the FIGURE IS DECORATIVE, because the item
 * was solvable without it. Geometry diagrams (`rawsvg`, 86 of the 132)
 * scored 100% — the stems restate every length and angle the diagram
 * carries. Data figures (bar, table) are the healthy ones at 17-58%.
 *
 * So these are no longer "unmeasured"; they are measured and failing,
 * for a reason that has a cheap fix: delete from the stem whatever the
 * figure already shows.
 *
 * UNDERCOUNT, recorded rather than silently corrected: this constant
 * totals 132 MATHS items, but 164 live items carry a figure. The other
 * 32 are `Information and Ideas` — a verbal cohort judged by the normal
 * attack — and were never in scope here. See FIGURE-BLIND-RESULT.md.
 */
export const MATHS_WITH_GRAPHIC = {
  'Geometry and Trigonometry': 70,
  'Problem-Solving and Data Analysis': 46,
  'Algebra': 10,
  'Advanced Math': 6,
} as const

const READING: Target = {
  min: 50, max: 60, published: 71.6,
  note: 'College Board SAT R&W scores 71.6% blind. 50-60% is harder than the public test without becoming arbitrary.',
}

export const TARGETS: Record<string, Target> = {
  // SAT verbal + TOEFL reading — judged against the College Board figure.
  'Craft and Structure': READING,
  'Information and Ideas': READING,
  'Expression of Ideas': READING,
  'Academic Passage': READING,

  // TOEFL reply-style.
  'Choose a Response': {
    min: 45, max: 55, published: 62.2,
    note: 'ETS TOEFL Essentials reply items score 62.2% blind. 45-55% is harder than official.',
  },

  // Short two-speaker exchanges. Official items are genuinely hard to
  // guess here (47.8%), so the band is tight and close to the control —
  // there is little room below before options stop being plausible.
  'Conversation': {
    min: 38, max: 45, published: 47.8,
    note: 'ETS short conversations score 47.8% blind — already hard. 38-45% is a small, deliberate step below.',
  },
  'Announcement': {
    min: 38, max: 45, published: 47.8,
    note: 'Treated as a short exchange, same as Conversation.',
  },
  'Daily Life': {
    min: 38, max: 45, published: 47.8,
    note: 'Treated as a short exchange, same as Conversation.',
  },

  // Long lecture sets. Official ETS lectures are 96.9% guessable from
  // options plus world knowledge — this is a real property of the task,
  // not a defect in ETS. Holding our lectures to a reading bar was a
  // mistake this table exists to prevent.
  'Academic Talk': {
    min: 80, max: 90, published: 96.9,
    note: 'Official ETS lectures score 96.9% blind — the format really is guessable. 80-90% is harder than official.',
  },

  // Maths is deliberately ABSENT — see NOT_APPLICABLE above. The attack
  // keeps the stem, and for maths the stem is the entire problem, so a
  // "blind" score there measures whether the solver can do algebra.
}


/** Below this share of a cohort measured, a good score is a spot check
 *  and not a verdict — see the asymmetry note in bank-readiness-status. */
export const MEANINGFUL_COVERAGE = 0.2

export type CohortState =
  | 'done'          // measured enough AND inside the band
  | 'too-easy'      // above the band — the defect
  | 'too-hard'      // below the band — arbitrary options
  | 'spot-checked'  // inside the band but not enough measured to claim it
  | 'unmeasured'
  | 'not-applicable'

export interface CohortProgress {
  state: CohortState
  target: Target | null
  /** Plain-language next action. Empty when nothing is outstanding. */
  remaining: string
}

/**
 * One cohort's state and what is left to do about it.
 *
 * The asymmetry is deliberate and load-bearing: a cohort scoring ABOVE
 * its band is failing at any coverage (12 of 12 solvable without the
 * source is a verdict), while a cohort scoring inside its band needs
 * real coverage before it counts as done.
 */
export function progressFor(
  domain: string,
  items: number,
  measured: number,
  blindPct: number | null,
): CohortProgress {
  if (NOT_APPLICABLE.has(domain)) {
    return { state: 'not-applicable', target: null, remaining: '' }
  }
  const target = TARGETS[domain] ?? null
  if (!target) {
    return { state: 'unmeasured', target: null, remaining: `No target set for "${domain}" — needs one before it can be judged.` }
  }
  if (measured === 0 || blindPct === null) {
    return {
      state: 'unmeasured', target,
      remaining: `Attack ${Math.ceil(items * MEANINGFUL_COVERAGE)} of ${items} items to reach a verdict.`,
    }
  }
  if (blindPct > target.max) {
    const gap = Math.round((blindPct - target.max) * 10) / 10
    return {
      state: 'too-easy', target,
      remaining: `${gap}pts too guessable. Rewrite distractors so the score falls to ${target.min}-${target.max}%.`,
    }
  }
  if (blindPct < target.min) {
    const gap = Math.round((target.min - blindPct) * 10) / 10
    return {
      state: 'too-hard', target,
      remaining: `${gap}pts below the band — options may be arbitrary rather than plausible. Review before shipping.`,
    }
  }
  const need = Math.ceil(items * MEANINGFUL_COVERAGE)
  if (measured < need) {
    return {
      state: 'spot-checked', target,
      remaining: `In band, but only ${measured} of ${items} measured. Attack ${need - measured} more to confirm.`,
    }
  }
  return { state: 'done', target, remaining: '' }
}

/** Items whose cohort is finished, over items that CAN be finished.
 *  Not-applicable cohorts are excluded from both — counting them as
 *  outstanding would mean the bar could never reach 100%. */
export function overallProgress(
  cohorts: Array<{ domain: string; items: number; measured: number; blindPct: number | null }>,
): { done: number; total: number; pct: number } {
  let done = 0, total = 0
  for (const c of cohorts) {
    const p = progressFor(c.domain, c.items, c.measured, c.blindPct)
    if (p.state === 'not-applicable') continue
    total += c.items
    if (p.state === 'done') done += c.items
  }
  return { done, total, pct: total === 0 ? 0 : Math.round((100 * done) / total) }
}
