import { dealSlots, dealItem, scoreRun, readRun, SLOTS, type ReviewRow, type Slot } from '../item-review'

/** Deterministic rand so a failure is reproducible. */
function rng(seed: number) {
  let s = seed
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const row = (keySlot: Slot, blindPick: Slot | null, answered = true): ReviewRow =>
  ({ keySlot, blindPick, answered, verdict: null, realism: null })

describe('human item review', () => {
  /*
   * The failure this whole file is built against. A free shuffle of 16
   * items once produced key letters A:9 B:1 C:4 D:2 — a 56.3% control,
   * at which "always A" beats a reader who learned nothing and the run
   * says nothing at all.
   */
  it('deals slots evenly enough that the control cannot swamp the signal', () => {
    for (const n of [8, 12, 16, 24, 40]) {
      const slots = dealSlots(n, rng(n * 7))
      expect(slots).toHaveLength(n)
      const counts = SLOTS.map(s => slots.filter(x => x === s).length)
      // Best achievable control for n items over 4 slots.
      expect(Math.max(...counts)).toBe(Math.ceil(n / 4))
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
    }
  })

  it('puts the key in the slot it was told to, and loses no option', () => {
    const rand = rng(99)
    for (let keyIndex = 0; keyIndex < 4; keyIndex++) {
      for (const slot of SLOTS) {
        const { shownOrder } = dealItem(4, keyIndex, slot, rand)
        expect(new Set(shownOrder).size).toBe(4)
        expect(shownOrder[SLOTS.indexOf(slot)]).toBe(keyIndex)
      }
    }
  })

  it('refuses a malformed item rather than presenting one', () => {
    expect(() => dealItem(3, 0, 'A', rng(1))).toThrow(/expected 4 options/)
    expect(() => dealItem(4, 7, 'A', rng(1))).toThrow(/out of range/)
  })

  /*
   * The number that must never be read on its own. Both runs below score
   * 75% blind. One is a leak; the other is a reviewer who learned
   * nothing and guessed the dominant slot every time.
   */
  it('reports a margin over the sample control, not a raw percentage', () => {
    const leaky = scoreRun([
      ...Array(3).fill(0).map(() => row('A', 'A')),
      ...Array(3).fill(0).map(() => row('B', 'B')),
      ...Array(3).fill(0).map(() => row('C', 'C')),
      ...Array(3).fill(0).map(() => row('D', 'A')),
    ])
    expect(leaky.pct).toBe(75)
    expect(leaky.controlPct).toBe(25)
    expect(leaky.margin).toBe(50)

    // Same 75%, but the key sat in C on 9 of 12 and the reviewer always
    // said C. Learned nothing; margin says so.
    const worthless = scoreRun([
      ...Array(9).fill(0).map(() => row('C', 'C')),
      ...Array(3).fill(0).map(() => row('A', 'C')),
    ])
    expect(worthless.pct).toBe(75)
    expect(worthless.controlPct).toBe(75)
    expect(worthless.margin).toBe(0)
  })

  it('keeps "can\'t tell" separate from "not reviewed"', () => {
    const s = scoreRun([
      row('A', 'A'),
      row('B', null),            // answered, couldn't tell
      row('C', null, false),     // drawn, never answered
      row('D', null, false),
    ])
    expect(s.drawn).toBe(4)
    expect(s.answered).toBe(2)
    expect(s.skipped).toBe(2)
    expect(s.cantTell).toBe(1)
    // A "can't tell" is a wrong answer for scoring, not an excluded row —
    // dropping it would let a reviewer improve the score by abstaining.
    expect(s.correct).toBe(1)
    expect(s.pct).toBe(50)
  })

  it('returns null rather than 0 on an unanswered run', () => {
    // 0 would render as a perfect result on an empty sample, which is the
    // one direction this must never fail in.
    const s = scoreRun([row('A', null, false), row('B', null, false)])
    expect(s.pct).toBeNull()
    expect(s.controlPct).toBeNull()
    expect(s.margin).toBeNull()
    expect(readRun(s, 25.5).reading).toBe('not-enough')
  })

  /*
   * Asymmetry, same rule as bank-targets.ts: a bad result is a verdict at
   * small n; a good one needs volume. A human picking the key blind on 11
   * of 12 is a verdict — more sampling cannot unsay it.
   */
  it('treats a bad sample as a verdict and a good one as provisional', () => {
    const bad = scoreRun([
      ...Array(3).fill(0).map(() => row('A', 'A')),
      ...Array(3).fill(0).map(() => row('B', 'B')),
      ...Array(3).fill(0).map(() => row('C', 'C')),
      ...Array(2).fill(0).map(() => row('D', 'D')),
      row('D', 'A'),
    ])
    expect(bad.answered).toBe(12)
    expect(readRun(bad, 25.5).reading).toBe('leaks')

    // Same clean margin, 12 answered → not yet a claim.
    const thin = scoreRun(SLOTS.flatMap(s => [row(s, s), row(s, 'A'), row(s, 'B')]))
    expect(thin.answered).toBe(12)
    expect(readRun(thin, 25.5).reading).toBe('inconclusive')

    // Same margin, 24 answered → a claim.
    const thick = scoreRun(SLOTS.flatMap(s => [
      row(s, s), row(s, 'A'), row(s, 'B'), row(s, s), row(s, 'C'), row(s, 'D'),
    ]))
    expect(thick.answered).toBe(24)
    expect(readRun(thick, 25.5).reading).toBe('clean')
  })

  it('counts phase 2 only when both judgements are present', () => {
    const rows: ReviewRow[] = [
      { keySlot: 'A', blindPick: 'A', answered: true, verdict: 'unique', realism: 'authentic' },
      { keySlot: 'B', blindPick: 'C', answered: true, verdict: 'broken', realism: 'artificial' },
      // Half-filled: must not count as reviewed, or "12 reviewed" would
      // include rows nobody finished judging.
      { keySlot: 'C', blindPick: 'C', answered: true, verdict: 'unique', realism: null },
    ]
    const s = scoreRun(rows)
    expect(s.reviewed).toBe(2)
    expect(s.unique).toBe(1)
    expect(s.broken).toBe(1)
    expect(s.artificial).toBe(1)
  })
})
