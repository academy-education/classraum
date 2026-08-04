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
 */
export const NOT_APPLICABLE = new Set([
  'Standard English Conventions',
  'Build a Sentence', 'Listen and Repeat', 'Complete the Words',
  'Email', 'Academic Discussion', 'Interview',
])

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

  // Maths: the attack strips the stem, so a solver sees four bare
  // values and has nothing legitimate to work from. Judged against
  // chance, not against a verbal margin.
  'Algebra': mathTarget(),
  'Advanced Math': mathTarget(),
  'Geometry and Trigonometry': mathTarget(),
  'Problem-Solving and Data Analysis': mathTarget(),
}

function mathTarget(): Target {
  return {
    min: 25, max: 35, published: null,
    note: 'The maths attack removes the stem entirely, so a solver has nothing legitimate to reason from. Judged against chance (25%), not a published margin.',
  }
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
