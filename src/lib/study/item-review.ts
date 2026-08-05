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
