/**
 * Pure helpers for the TOEFL set draw (assembleToeflFromBank). Kept apart
 * from assemble.ts so they can be tested without a database.
 *
 * Measured 2026-10-02 (scripts/study-bank/toefl-form-depth.ts): a student
 * repeated Announcement items at sitting 4 on the lower path while 85
 * drawable Announcement items were still unseen. Two mechanisms, both
 * fixed here:
 *
 *  1. PACKING. The old greedy pass took sets in rank order and back-filled
 *     leftover slots with SEEN sets — against a quota of 6 it took a fresh
 *     4-set and a seen 2-set rather than two fresh 3-sets. `chooseExactFill`
 *     picks the combination of whole sets that fills the quota EXACTLY and
 *     maximises a per-set score (freshness first — see `setScore`).
 *
 *  2. BAND. In a routed module 2, a SEEN in-band set outranked an UNSEEN
 *     set that only partly sits in the band. `bandTier` adds an "adjacent"
 *     tier so freshness can beat it — without ever crossing the route.
 */

/**
 * Choose whole sets whose sizes sum to EXACTLY `n`, maximising the summed
 * score. Ties go to the earliest-ranked sets (lexicographic on the input
 * order), so when every set scores the same this returns the first exact
 * fill a rank-order walk can complete — i.e. whatever the old greedy pass
 * returned whenever that pass managed an exact fill. (setScore's last
 * level — fewer sets — is the one deliberate departure; see there.)
 *
 * Returns the chosen indices in input (rank) order, or null when no subset
 * sums to `n` (the caller then keeps its old best-effort behaviour).
 *
 * 0/1 knapsack over set sizes: O(sets x n). n is a module quota (<= ~30)
 * and a task holds at most a few hundred sets, so this is trivial.
 */
export function chooseExactFill(sets: ReadonlyArray<{ size: number; score: number }>, n: number): number[] | null {
  if (n <= 0) return []
  const m = sets.length
  const NEG = -Infinity
  // best[i][c] = max score filling exactly c using sets i..m-1.
  const best: Float64Array[] = Array.from({ length: m + 1 }, () => new Float64Array(n + 1).fill(NEG))
  best[m]![0] = 0
  for (let i = m - 1; i >= 0; i--) {
    const { size, score } = sets[i]!
    const next = best[i + 1]!, cur = best[i]!
    for (let c = 0; c <= n; c++) {
      let v = next[c]!
      if (size > 0 && size <= c && next[c - size]! !== NEG) {
        const take = next[c - size]! + score
        if (take > v) v = take
      }
      cur[c] = v
    }
  }
  if (best[0]![n] === NEG) return null
  // Walk forward, TAKING a set whenever taking it is still optimal: that is
  // what gives earlier-ranked sets the tie.
  const out: number[] = []
  let c = n
  for (let i = 0; i < m && c > 0; i++) {
    const { size, score } = sets[i]!
    if (size > 0 && size <= c && best[i + 1]![c - size]! !== NEG
      && best[i + 1]![c - size]! + score === best[i]![c]) {
      out.push(i)
      c -= size
    }
  }
  return c === 0 ? out : null
}

export type BandTier = 'in' | 'adjacent' | 'cross'

/**
 * Where a set sits relative to a routed module 2's difficulty band.
 *
 *   in        at least half its items are in the routed bands (the rule
 *             the assembler already used for "in-band")
 *   adjacent  some, but under half, of its items are in the routed bands —
 *             a set that straddles into the route from the next band over
 *   cross     NONE of its items are in the routed bands
 *
 * Why there is no item-level "adjacent band": difficultiesForToeflModule2
 * already returns the route's band plus its neighbour (hard → medium+hard,
 * easy → easy+medium, medium → all three). Every band outside that list is
 * on the far side of the route — easy for an upper/hard module 2, hard for
 * an easy one. So adjacency can only exist at the SET level.
 *
 * With no band (module 1, whole-section draws) every set is 'in'.
 */
export function bandTier(difficulties: ReadonlyArray<string | null>, wanted: ReadonlySet<string> | null): BandTier {
  if (!wanted || wanted.size === 0) return 'in'
  const hits = difficulties.filter(d => d !== null && wanted.has(d)).length
  if (hits * 2 >= difficulties.length) return 'in'
  return hits > 0 ? 'adjacent' : 'cross'
}

/**
 * Per-set score for `chooseExactFill`. Lexicographic, highest level first:
 *
 *   1. fewer CROSS-route items     a set entirely off the route is used only
 *                                  when nothing else fills the quota exactly
 *   2. more UNSEEN items           freshness beats in-band-vs-adjacent:
 *                                  an unseen adjacent set beats a seen
 *                                  in-band one, so a student is not repeated
 *                                  while the route still has fresh material
 *   3. more IN-BAND items          among equally fresh fills, stay in band
 *   4. FEWER sets                  among otherwise equal fills, use the
 *                                  larger sets and keep the small ones
 *
 * Why level 4 exists (measured, toefl-form-depth.ts, 2026-10-02): small
 * sets are the only FILLERS. Announcement's 4-sets fit a quota of 6 only
 * beside a 2-set, and the bank holds 7 two-sets. Without this level a
 * fresh 2+2+2 ties with a fresh 4+2 and rank order may burn three fillers
 * at once, stranding 4-sets for good; with it, Conversation went from 10
 * to 13 clean sittings on three of four routes and Announcement lower/medium
 * from 4 to 5. It is the one place where equal-freshness fills no longer
 * reduce to the old greedy rank order — deliberately: between two equally
 * fresh exact fills of the same set count, rank still decides.
 *
 * "Unseen" is whole-set, matching orderGroups: a set with ANY item in the
 * ledger counts as seen, because serving its untouched members re-plays
 * the same passage.
 *
 * Each level is bounded by the quota or the set count (< LEVEL), so the
 * levels never bleed.
 */
const LEVEL = 1024
export function setScore(size: number, seen: boolean, tier: BandTier): number {
  const cross = tier === 'cross' ? size : 0
  const unseen = seen ? 0 : size
  const inBand = tier === 'in' ? size : 0
  return -cross * LEVEL ** 3 + unseen * LEVEL ** 2 + inBand * LEVEL - 1
}
