/**
 * Human two-phase item review — the pure half.
 *
 * Phase 1 shows a reviewer four options with the stimulus withheld and
 * asks which is the key. Phase 2 reveals the stimulus and asks whether
 * the key is uniquely right and whether the item reads authentic.
 *
 * ── The one number this file exists to protect ────────────────────────
 * A blind score means nothing on its own. If the key sits in slot C on
 * 9 of 12 items, "always C" scores 75% having read nothing, and a
 * reviewer's 75% is worth exactly zero. Every score here is therefore
 * reported as a MARGIN over the best fixed-slot strategy ON THE SAME
 * ANSWERED ROWS — never as a raw percentage, and never against 25%.
 *
 * This has already gone wrong once: a free shuffle of 16 items produced
 * key letters A:9 B:1 C:4 D:2, a 56.3% control, at which the whole run
 * was uninterpretable. `dealSlots` assigns slots as evenly as the
 * sample allows for exactly that reason.
 */

export const SLOTS = ['A', 'B', 'C', 'D'] as const
export type Slot = (typeof SLOTS)[number]

export type Verdict = 'unique' | 'alternative' | 'broken'
export type Realism = 'authentic' | 'artificial'

export interface Dealt {
  /** For each presented slot, which ORIGINAL option index it holds. */
  shownOrder: number[]
  /** Which presented slot holds the key. */
  keySlot: Slot
}

/**
 * Even-as-possible slot assignment across a sample.
 *
 * With n items and 4 slots the best achievable control is
 * ceil(n/4)/n — 25% when n divides by 4, 33.3% at n=3. Leaving this to
 * a free shuffle is what produced the 56.3% control that invalidated an
 * earlier run, so the target slots are dealt first and the rest of the
 * shuffle works around them.
 */
export function dealSlots(n: number, rand: () => number): Slot[] {
  const out: Slot[] = []
  for (let i = 0; i < n; i++) out.push(SLOTS[i % 4])
  // Fisher-Yates over the balanced multiset — order varies, counts don't.
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Place one item's options into presented slots, with the key landing in
 * `keySlot`.
 *
 * `keyIndex` is the key's position in the item's stored `choices`.
 * Returns the mapping actually presented — the caller MUST persist it.
 * Re-deriving a shuffle from a seed later has already destroyed one
 * experiment in this repo (a re-render moved 9 of 16 keys after two
 * readers had answered against the old paper), so the mapping is data,
 * not something to recompute.
 */
export function dealItem(optionCount: number, keyIndex: number, keySlot: Slot, rand: () => number): Dealt {
  if (optionCount !== 4) throw new Error(`dealItem: expected 4 options, got ${optionCount}`)
  if (keyIndex < 0 || keyIndex > 3) throw new Error(`dealItem: keyIndex ${keyIndex} out of range`)

  const others = [0, 1, 2, 3].filter(i => i !== keyIndex)
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[others[i], others[j]] = [others[j], others[i]]
  }
  const keyAt = SLOTS.indexOf(keySlot)
  const shownOrder: number[] = []
  for (let s = 0; s < 4; s++) shownOrder.push(s === keyAt ? keyIndex : others.pop()!)

  if (new Set(shownOrder).size !== 4) throw new Error('dealItem: produced a duplicate option slot')
  if (shownOrder[keyAt] !== keyIndex) throw new Error('dealItem: key did not land in its slot')
  return { shownOrder, keySlot }
}

export interface ReviewRow {
  keySlot: Slot
  /** null + answered = "can't tell"; null + !answered = not yet reviewed. */
  blindPick: Slot | null
  answered: boolean
  verdict: Verdict | null
  realism: Realism | null
}

export interface RunScore {
  drawn: number
  answered: number
  /** Drawn but never answered. Kept visible so a skipped sample cannot
   *  quietly improve the result. */
  skipped: number
  correct: number
  cantTell: number
  /** null when nothing has been answered — NOT 0, which would read as
   *  a perfect result on an empty run. */
  pct: number | null
  /** Best fixed-slot strategy over the answered rows. */
  controlPct: number | null
  /** pct - controlPct. The measurement. */
  margin: number | null
  reviewed: number
  unique: number
  alternative: number
  broken: number
  artificial: number
}

export function scoreRun(rows: ReviewRow[]): RunScore {
  const answered = rows.filter(r => r.answered)
  const n = answered.length
  const correct = answered.filter(r => r.blindPick !== null && r.blindPick === r.keySlot).length
  const slotCounts = SLOTS.map(s => answered.filter(r => r.keySlot === s).length)
  const bestSlot = Math.max(0, ...slotCounts)
  const reviewed = rows.filter(r => r.verdict !== null && r.realism !== null)

  const pct = n === 0 ? null : round1((100 * correct) / n)
  const controlPct = n === 0 ? null : round1((100 * bestSlot) / n)
  return {
    drawn: rows.length,
    answered: n,
    skipped: rows.length - n,
    correct,
    cantTell: answered.filter(r => r.blindPick === null).length,
    pct,
    controlPct,
    margin: pct === null || controlPct === null ? null : round1(pct - controlPct),
    reviewed: reviewed.length,
    unique: reviewed.filter(r => r.verdict === 'unique').length,
    alternative: reviewed.filter(r => r.verdict === 'alternative').length,
    broken: reviewed.filter(r => r.verdict === 'broken').length,
    artificial: reviewed.filter(r => r.realism === 'artificial').length,
  }
}

const round1 = (x: number) => Math.round(x * 10) / 10

/**
 * Whether a run is big enough to say anything, and what it says.
 *
 * Deliberately asymmetric, matching bank-targets.ts: a BAD result is a
 * verdict at small n (if a human picks the key blind on 11 of 12, the
 * items leak and no extra sampling will unsay that), while a GOOD result
 * needs volume before it counts.
 */
/**
 * Group rows into one score per (run, reviewer) — never per run alone.
 *
 * Two people reviewing the same sample is the whole point: agreement is
 * the signal and disagreement is the most informative outcome. Merging
 * them produces a number neither person produced — reviewer A at 90%
 * and reviewer B at 30% prints as a tidy 60% — and destroys precisely
 * the comparison the second reviewer was there to provide.
 */
export function groupRuns<T extends ReviewRow & { runId: string; reviewerId: string }>(
  rows: T[],
): Array<{ runId: string; reviewerId: string; score: RunScore }> {
  const by = new Map<string, T[]>()
  for (const r of rows) {
    // Tab-separated: a run id may contain spaces and hyphens, and a
    // collision here would silently merge two reviewers again.
    const k = `${r.runId}\t${r.reviewerId}`
    if (!by.has(k)) by.set(k, [])
    by.get(k)!.push(r)
  }
  return [...by.entries()].map(([k, rs]) => {
    const [runId, reviewerId] = k.split('\t')
    return { runId, reviewerId, score: scoreRun(rs) }
  })
}

/**
 * What a SECOND reviewer buys, and it is not more items.
 *
 * As of 2026-08-06 every human number in this project comes from one
 * person: Choose a Response at 55.0% blind against a 25.0% control,
 * +30.0, p<0.001. That is the single result the whole repair programme
 * is built on, and with n=1 reviewer it is unfalsifiable — there is no
 * way to tell a property of the ITEMS from a habit of that reader.
 *
 * Two reviewers on the SAME items answer it, and the informative
 * statistic is not "did they both get it right".
 *
 *   they converge on the KEY          the leak is real and shared
 *   they converge on the SAME WRONG   the option set has structure
 *     option                          pulling readers somewhere
 *                                     specific — still a defect, and
 *                                     invisible to an accuracy score
 *   they scatter                      whatever the first reviewer was
 *                                     using was personal, and the
 *                                     margin does not generalise
 *
 * The middle row is the reason this function reports `sameWrongOption`
 * separately. A cohort where two readers independently pick option C on
 * the same item is leaking, even when C is not the key and both of them
 * scored zero on it.
 */
export interface AgreementPair {
  a: string
  b: string
  /** Items BOTH reviewers answered with an actual pick. "Can't tell"
   *  (answered with a null pick) is excluded: it is a real and useful
   *  response, but two people declining to guess is not agreement about
   *  anything. */
  shared: number
  samePick: number
  bothCorrect: number
  /** Converged on one wrong option. The signal named above. */
  sameWrongOption: number
  /** samePick / shared. Null when they share no answered items. */
  pickAgreement: number | null
  /**
   * Chance-corrected agreement (Cohen's kappa) over the four slots.
   *
   * Raw agreement is not readable on its own here: if both reviewers
   * happen to favour slot C, they will agree often while sharing no
   * insight. Kappa subtracts the agreement their own marginal habits
   * predict. 0 = no better than their habits, 1 = perfect.
   *
   * Null when undefined — fewer than 2 shared items, or expected
   * agreement of exactly 1 (both reviewers picked one slot every time),
   * where the formula divides by zero.
   */
  kappa: number | null
  /** Items both reached phase 2 on, and how often the verdict matched. */
  verdictShared: number
  verdictAgree: number
}

export function reviewerAgreement<T extends ReviewRow & { itemId: string; reviewerId: string }>(
  rows: T[],
): AgreementPair[] {
  const byReviewer = new Map<string, Map<string, T>>()
  for (const r of rows) {
    if (!byReviewer.has(r.reviewerId)) byReviewer.set(r.reviewerId, new Map())
    // Last write wins on a duplicate (item, reviewer). A reviewer seeing
    // the same item twice is a draw bug, not a second opinion, and
    // counting it twice would inflate agreement with itself.
    byReviewer.get(r.reviewerId)!.set(r.itemId, r)
  }

  const who = [...byReviewer.keys()].sort()
  const out: AgreementPair[] = []
  for (let i = 0; i < who.length; i++) {
    for (let j = i + 1; j < who.length; j++) {
      const A = byReviewer.get(who[i])!, B = byReviewer.get(who[j])!
      const ids = [...A.keys()].filter(id => B.has(id))

      const picked = ids.filter(id => A.get(id)!.answered && B.get(id)!.answered &&
        A.get(id)!.blindPick !== null && B.get(id)!.blindPick !== null)

      let samePick = 0, bothCorrect = 0, sameWrong = 0
      const marginA: Record<string, number> = {}, marginB: Record<string, number> = {}
      for (const id of picked) {
        const a = A.get(id)!, b = B.get(id)!
        marginA[a.blindPick!] = (marginA[a.blindPick!] ?? 0) + 1
        marginB[b.blindPick!] = (marginB[b.blindPick!] ?? 0) + 1
        if (a.blindPick === b.blindPick) {
          samePick++
          if (a.blindPick === a.keySlot) bothCorrect++
          else sameWrong++
        }
      }

      const n = picked.length
      const po = n ? samePick / n : null
      let kappa: number | null = null
      if (n >= 2 && po !== null) {
        const pe = SLOTS.reduce((s, sl) => s + ((marginA[sl] ?? 0) / n) * ((marginB[sl] ?? 0) / n), 0)
        kappa = pe >= 1 ? null : round3((po - pe) / (1 - pe))
      }

      const vShared = ids.filter(id => A.get(id)!.verdict !== null && B.get(id)!.verdict !== null)
      out.push({
        a: who[i], b: who[j],
        shared: n,
        samePick,
        bothCorrect,
        sameWrongOption: sameWrong,
        pickAgreement: po === null ? null : round1(100 * po),
        kappa,
        verdictShared: vShared.length,
        verdictAgree: vShared.filter(id => A.get(id)!.verdict === B.get(id)!.verdict).length,
      })
    }
  }
  return out
}

const round3 = (x: number) => Math.round(x * 1000) / 1000

/**
 * Combine several reviewers into one score — ONLY over items no two of
 * them share.
 *
 * Pooling overlapping work double-counts an item and shrinks the
 * apparent error bar on evidence that was never independent. So the
 * overlap that `reviewerAgreement` needs is exactly what this must
 * exclude, and the two functions are deliberately separate rather than
 * one "combine everything" helper.
 *
 * `duplicated` is returned rather than silently dropped: a caller
 * showing "n = 40" when 12 of those were reviewed twice is reporting a
 * sample size it does not have.
 */
export function pooledAcrossReviewers<T extends ReviewRow & { itemId: string; reviewerId: string }>(
  rows: T[],
): { score: RunScore; reviewers: number; duplicated: number } {
  const seen = new Map<string, T>()
  let duplicated = 0
  for (const r of rows) {
    if (seen.has(r.itemId)) { duplicated++; continue }
    seen.set(r.itemId, r)
  }
  return {
    score: scoreRun([...seen.values()]),
    reviewers: new Set(rows.map(r => r.reviewerId)).size,
    duplicated,
  }
}

export type RunReading = 'leaks' | 'clean' | 'inconclusive' | 'not-enough'

export function readRun(s: RunScore, publishedMargin: number): { reading: RunReading; why: string } {
  /* A margin can be NEGATIVE — the reviewer scoring below their own
   * control is the ordinary shape of a clean cohort, and Announcement
   * came in at -10. Hard-coding a "+" printed "+-10pts". */
  const signed = (n: number) => `${n >= 0 ? '+' : ''}${n}pts`

  if (s.answered < 8) {
    return { reading: 'not-enough', why: `${s.answered} answered. Under 8 the control swamps the signal.` }
  }
  if (s.margin === null) return { reading: 'not-enough', why: 'Nothing answered yet.' }

  if (s.margin >= publishedMargin) {
    return {
      reading: 'leaks',
      why: `${signed(s.margin)} over this sample's own control, at or above the ${publishedMargin}pt margin real published items achieve. A person is picking the key without the stimulus.`,
    }
  }
  if (s.answered < 20) {
    return {
      reading: 'inconclusive',
      why: `${signed(s.margin)}, below the ${publishedMargin}pt published margin — but only ${s.answered} answered. Promising, not yet a verdict.`,
    }
  }
  return {
    reading: 'clean',
    why: `${signed(s.margin)} over control across ${s.answered} items, under the ${publishedMargin}pt published margin.`,
  }
}
