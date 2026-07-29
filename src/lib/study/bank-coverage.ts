/**
 * "Has this student already seen everything?"
 *
 * The draw has always DEGRADED when the pool ran out: unseen items
 * first, then the oldest-seen recycled. That is the right behaviour for
 * a student who has seen most of a section — one repeat inside a fresh
 * set is invisible and harmless. It is the wrong behaviour once they
 * have seen ALL of it, because then the "new" test is entirely questions
 * they have answered before, and its score measures memory rather than
 * skill. Worse, a full test costs a credit, so we would be charging for
 * a replay.
 *
 * So the recycler stays, and a floor is added underneath it: below the
 * floor, refuse and say more questions are being written.
 *
 * The pure part lives here so the threshold can be tested without a
 * database. The counting query lives in the route.
 */

export interface CoverageInput {
  /** Verified, un-archived items that fit the requested draw. */
  poolSize: number
  /** How many of those the student has already been served. */
  seen: number
  /** Items this draw needs. */
  needed: number
}

export type CoverageVerdict =
  /** Enough unseen material — serve it. */
  | { ok: true; unseen: number }
  /** Not enough fresh material. The UI tells the student more is being
   *  written rather than dealing them a set they have already done. */
  | { ok: false; unseen: number; reason: 'pool_exhausted' | 'no_bank_coverage' }

/**
 * Fraction of the requested set that must be unseen.
 *
 * Not 100%. Requiring a completely fresh set would block a student who
 * has seen 47 of 48 Reading items from ever taking Reading again, which
 * is worse than serving them one repeat. Two thirds is the point where a
 * set still teaches something new; below it the session is mostly
 * revision wearing a test's clothes.
 */
export const FRESH_FRACTION = 2 / 3

export function assessCoverage(input: CoverageInput): CoverageVerdict {
  const { poolSize, seen, needed } = input
  // A section with no bank at all is a different message from a section
  // the student has exhausted — "coming soon" versus "come back soon".
  if (poolSize <= 0) return { ok: false, unseen: 0, reason: 'no_bank_coverage' }

  const unseen = Math.max(0, poolSize - seen)
  // Guard a nonsense request rather than dividing by it.
  if (needed <= 0) return { ok: true, unseen }

  const required = Math.ceil(needed * FRESH_FRACTION)
  return unseen >= required
    ? { ok: true, unseen }
    : { ok: false, unseen, reason: 'pool_exhausted' }
}

/**
 * How many more items would have to exist for this draw to be allowed.
 * Shown to the student as a concrete number, because "please wait" with
 * no quantity is indistinguishable from "this is broken".
 */
export function itemsShortBy(input: CoverageInput): number {
  const { poolSize, seen, needed } = input
  const unseen = Math.max(0, poolSize - seen)
  return Math.max(0, Math.ceil(needed * FRESH_FRACTION) - unseen)
}
