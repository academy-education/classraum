/**
 * Answer-key tells that are measurable from the item text alone.
 *
 * Lives in src/ rather than scripts/ for one reason: scripts/ is outside
 * jest's testMatch, and every threshold in here has to be mutation-tested
 * (construct a bank that must fail, confirm it does; construct one that
 * must pass, confirm it does). The guard script
 * scripts/verify-answer-key-spread.ts imports these; it holds the DB
 * query and the printing, and nothing else.
 */

/* ── binomial / Poisson tails ─────────────────────────────────────────
 *
 * Computed in log space. The naive product form of C(n, k) overflows well
 * before the bank's largest cohort (n=1599): C(634, 317) is ~1e189, and
 * multiplying it by p^k ~ 1e-190 loses every significant digit. lnChoose
 * + logsumexp is exact to floating point at any n this bank will reach.
 */

const LANCZOS = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012,
  9.9843695780195716e-6, 1.5056327351493116e-7,
]

/** Lanczos approximation, |relative error| < 1e-13 for x > 0. */
function lnGamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x)
  const z = x - 1
  let a = 0.99999999999980993
  for (let i = 0; i < LANCZOS.length; i++) a += LANCZOS[i]! / (z + i + 1)
  const t = z + LANCZOS.length - 0.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a)
}

function lnChoose(n: number, k: number): number {
  return lnGamma(n + 1) - lnGamma(k + 1) - lnGamma(n - k + 1)
}

/** P(X >= k) for X ~ Binomial(n, p). */
export function binomUpperTail(n: number, k: number, p: number): number {
  if (k <= 0) return 1
  if (k > n) return 0
  let sum = 0
  for (let i = k; i <= n; i++) {
    sum += Math.exp(lnChoose(n, i) + i * Math.log(p) + (n - i) * Math.log1p(-p))
  }
  return Math.min(1, sum)
}

/** P(X >= k) for X ~ Poisson(lambda). */
export function poissonUpperTail(k: number, lambda: number): number {
  if (k <= 0) return 1
  if (lambda <= 0) return 0
  let cdf = 0
  let term = Math.exp(-lambda)
  for (let i = 0; i < k; i++) {
    cdf += term
    term = (term * lambda) / (i + 1)
  }
  return Math.max(0, Math.min(1, 1 - cdf))
}

/* ── the per-item mark ───────────────────────────────────────────────── */

export type LengthMark = 'longest' | 'shortest' | 'middle'

/**
 * Which one-word heuristic answers this item, if any.
 *
 * Ties count as `middle`: if two options share the maximum length, "pick
 * the longest option" does not single out the key, so the tell is not
 * available to the student. Same convention as the cohort-level check.
 */
export function lengthMark(key: string, choices: string[]): LengthMark {
  const lens = choices.map(c => (c ?? '').length)
  const k = key.length
  if (k === Math.max(...lens) && lens.filter(l => l === k).length === 1) return 'longest'
  if (k === Math.min(...lens) && lens.filter(l => l === k).length === 1) return 'shortest'
  return 'middle'
}

/* ── the per-SET length tell ─────────────────────────────────────────── */

export interface KeySet {
  /** passageGroupId, or whatever names the unit the student is served. */
  key: string
  cohort: string
  /** One mark per item, in bank order. */
  marks: LengthMark[]
}

export interface SetTellReport {
  /** Sets of size >= MIN_SET_SIZE. */
  eligible: number
  /** Sets where one heuristic reaches the exploitable bar. */
  observed: number
  /** How many such sets chance alone produces, given these set sizes. */
  expected: number
  /** P(observed or worse | chance). */
  pValue: number
  /** Sets where a heuristic answers EVERY item. Reported, not gated. */
  swept: string[]
  exploitable: Array<{ key: string; cohort: string; size: number; mark: LengthMark; hits: number }>
}

/**
 * A 2-item set is not evidence of anything: chance alone makes both keys
 * the longest option one time in sixteen. Below three items the binomial
 * noise is the whole signal.
 */
export const MIN_SET_SIZE = 3

/**
 * How many items one heuristic must answer before the SET counts as
 * exploitable: at least 3, and at least 75% of the set.
 *
 * Both halves are load-bearing. "75%" alone would admit 2-of-2 (6.3% by
 * chance per direction, i.e. routine). "3 items" alone would admit 3 of a
 * 12-item set, which is a quarter — chance exactly.
 */
export function exploitableBar(size: number): number {
  return Math.max(3, Math.ceil(0.75 * size))
}

/**
 * P(a random set of `size` items is exploitable in EITHER direction).
 *
 * Exact, not approximate. The bar is always more than half the set (3 of
 * 3, 3 of 4, 4 of 5, 9 of 12 …), so "longest reaches the bar" and
 * "shortest reaches the bar" are mutually exclusive and the two
 * probabilities simply add.
 *
 * Under the null each key is equally likely to be uniquely longest,
 * uniquely shortest, or neither-of-those, at 25% / 25% / 50%. Real items
 * tie sometimes, which pushes the true per-item rate BELOW 25% and makes
 * this expectation an over-estimate — i.e. the gate errs toward silence,
 * which is the direction a false alarm cannot be tolerated in.
 */
export function pSetExploitable(size: number): number {
  const bar = exploitableBar(size)
  if (bar > size) return 0
  return 2 * binomUpperTail(size, bar, 0.25)
}

/**
 * WHY THE GATE IS ON THE AGGREGATE AND NOT ON INDIVIDUAL SETS.
 *
 * TOEFL Listening serves whole passage sets (assemble.ts takes groups, not
 * items), so four consecutive questions can all come from one talk. If
 * "pick the longest option" answers all four, the section histogram can be
 * a flawless 25/25/25/25 and that student still got four free marks. The
 * per-cohort length check cannot see this, exactly as the per-cohort
 * POSITION histogram could not see the complete-ABCD-permutation tell.
 *
 * But n=4 is four coin flips. The arithmetic that matters:
 *
 *   P(key is uniquely longest all 4 times)  = 0.25^4       = 0.39%
 *   P(3 or more of 4)                       = 4(.25^3)(.75) + .25^4 = 5.1%
 *   P(3 of 3)                               = 0.25^3       = 1.6%
 *
 * Doubling for the shortest direction: a 4-item set is exploitable 10.2%
 * of the time BY CHANCE, and a 3-item set 3.1% of the time. Against the
 * bank's 210 eligible sets that is ~15 exploitable sets expected with no
 * defect present. So "no set may be exploitable" would fire on a clean
 * bank every single run — the failure mode this repo shipped twice this
 * week — and even "no set may be swept" (E ~= 2.2) would fire about four
 * runs in five.
 *
 * Individual sets therefore cannot be condemned. What CAN be tested is
 * whether there are more of them than chance produces, so the gate is a
 * Poisson upper tail on the count, with the expectation computed exactly
 * from the actual set sizes rather than assumed.
 *
 * ALPHA is 1%, not 5%. This runs on every bank change; at 5% a clean bank
 * trips it one run in twenty, and a guard that cries wolf monthly is a
 * guard nobody reads. The price is power: at the bank's current 210 sets
 * (E=15.4) it fires at 26 exploitable sets, a 1.7x excess. It would catch
 * a batch authored with a systematic per-talk length habit; it would not
 * catch a mild one. That is stated rather than papered over — see
 * `analyseSetTell`'s caller, which also prints the count so a human can
 * watch it drift between runs.
 */
export const SET_TELL_ALPHA = 0.01

/**
 * Cohorts too small to test are not tested. E < 5 is the usual bar for a
 * Poisson tail to have any power at all: at E=0.2 (talk-c1's seven sets)
 * even a 100%-exploitable cohort produces p=0.2, so a per-cohort gate
 * there would be decoration. The aggregate still covers those sets.
 */
export const PER_COHORT_MIN_EXPECTED = 5

export function analyseSetTell(sets: KeySet[]): SetTellReport {
  let expected = 0
  let observed = 0
  const swept: string[] = []
  const exploitable: SetTellReport['exploitable'] = []
  let eligible = 0

  for (const s of sets) {
    const size = s.marks.length
    if (size < MIN_SET_SIZE) continue
    eligible++
    expected += pSetExploitable(size)
    const longest = s.marks.filter(m => m === 'longest').length
    const shortest = s.marks.filter(m => m === 'shortest').length
    const bar = exploitableBar(size)
    const mark: LengthMark | null =
      longest >= bar ? 'longest' : shortest >= bar ? 'shortest' : null
    if (!mark) continue
    observed++
    const hits = mark === 'longest' ? longest : shortest
    exploitable.push({ key: s.key, cohort: s.cohort, size, mark, hits })
    if (hits === size) swept.push(s.key)
  }

  return {
    eligible,
    observed,
    expected,
    pValue: poissonUpperTail(observed, expected),
    swept,
    exploitable,
  }
}

/** True when the excess over chance is large enough to act on. */
export function setTellFails(r: SetTellReport): boolean {
  return r.observed > r.expected && r.pValue < SET_TELL_ALPHA
}
