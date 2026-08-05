import { dealSlots, dealItem, scoreRun, readRun, groupRuns, reviewerAgreement, pooledAcrossReviewers, SLOTS, type ReviewRow, type Slot, type Verdict } from '../item-review'

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

  /*
   * The Announcement sitting scored 15% against a 25% control — BELOW
   * chance, which is the ordinary shape of a clean cohort and not an
   * error. The sentence rendered "+-10pts over control" on the live
   * dashboard, because the "+" was hard-coded into the template.
   */
  it('renders a negative margin without a stray plus', () => {
    // Every answer wrong, so the margin is the control's own -25.
    const below = scoreRun(SLOTS.flatMap(s => Array(6).fill(0).map(() => (
      row(s, s === 'A' ? 'B' : 'A')
    ))))
    expect(below.answered).toBe(24)
    expect(below.margin).toBeLessThan(0)

    const read = readRun(below, 25.5)
    expect(read.reading).toBe('clean')
    expect(read.why).not.toMatch(/\+-/)
    expect(read.why).toMatch(new RegExp(`^${below.margin}pts over control`))
  })

  /*
   * Two reviewers on one sample is the design, not an edge case. The
   * route originally grouped by run id alone, which averaged them into
   * a score neither person produced and erased the disagreement — the
   * single most informative thing a second reviewer can give you.
   */
  it('never averages two reviewers into one score', () => {
    const mk = (reviewerId: string, keySlot: Slot, pick: Slot | null) =>
      ({ runId: 'cr-2026-08-05', reviewerId, ...row(keySlot, pick) })

    // A picks the key every time; B never does. Same run, same items.
    const rows = [
      ...SLOTS.map(s => mk('A', s, s)),
      ...SLOTS.map(s => mk('B', s, s === 'A' ? 'B' : 'A')),
    ]

    const grouped = groupRuns(rows)
    expect(grouped).toHaveLength(2)
    const a = grouped.find(g => g.reviewerId === 'A')!
    const b = grouped.find(g => g.reviewerId === 'B')!
    expect(a.score.pct).toBe(100)
    expect(b.score.pct).toBe(0)

    // Merged, this would read 50% — a number neither of them produced,
    // and the 100-point disagreement would be invisible.
    expect(scoreRun(rows).pct).toBe(50)
    expect(a.score.pct).not.toBe(scoreRun(rows).pct)
  })

  it('does not merge reviewers when a run id contains separators', () => {
    // The grouping key is built by concatenation; a run id with a space
    // or hyphen in it must not be able to collide with another pair.
    const rows = [
      { runId: 'choose a response', reviewerId: 'x y', ...row('A', 'A') },
      { runId: 'choose a response x', reviewerId: 'y', ...row('A', 'B') },
    ]
    const grouped = groupRuns(rows)
    expect(grouped).toHaveLength(2)
    expect(grouped.map(g => g.score.pct).sort()).toEqual([0, 100])
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

/*
 * Reviewer agreement. Every human number in this project comes from one
 * person, and with n=1 reviewer a 55% blind score cannot be told apart
 * from that reader's own habit. These pin the three outcomes a second
 * reviewer can produce.
 */
describe('reviewer agreement', () => {
  const r = (itemId: string, reviewerId: string, keySlot: Slot, pick: Slot | null,
             verdict: Verdict | null = null) => ({
    itemId, reviewerId, keySlot, blindPick: pick, answered: true, verdict, realism: null,
  })

  it('separates converging on the KEY from converging on a WRONG option', () => {
    // Both readers pick B every time. On items 1-4 B is the key; on 5-8
    // it is a distractor. Accuracy says the second half is a total
    // failure; agreement says the option set is pulling both readers to
    // the same place, which is a defect either way.
    const rows = [
      ...['1', '2', '3', '4'].map(id => r(id, 'x', 'B', 'B')),
      ...['1', '2', '3', '4'].map(id => r(id, 'y', 'B', 'B')),
      ...['5', '6', '7', '8'].map(id => r(id, 'x', 'A', 'B')),
      ...['5', '6', '7', '8'].map(id => r(id, 'y', 'A', 'B')),
    ]
    const [p] = reviewerAgreement(rows)
    expect(p.shared).toBe(8)
    expect(p.samePick).toBe(8)
    expect(p.bothCorrect).toBe(4)
    expect(p.sameWrongOption).toBe(4)   // <- the finding an accuracy score cannot report
  })

  it('does not credit agreement that both reviewers\' own habits predict', () => {
    // Both pick C on everything. Raw agreement is 100%; they have shared
    // no insight, and kappa says so. This is the case that makes raw
    // agreement unreadable on its own.
    const rows = [
      ...['1', '2', '3', '4'].map(id => r(id, 'x', 'A', 'C')),
      ...['1', '2', '3', '4'].map(id => r(id, 'y', 'A', 'C')),
    ]
    const [p] = reviewerAgreement(rows)
    expect(p.pickAgreement).toBe(100)
    expect(p.kappa).toBeNull()          // expected agreement is 1 — undefined, not 1.0
  })

  it('reports scatter, which is the result that would retire the finding', () => {
    const rows = [
      r('1', 'x', 'A', 'A'), r('2', 'x', 'B', 'B'), r('3', 'x', 'C', 'C'), r('4', 'x', 'D', 'D'),
      r('1', 'y', 'A', 'B'), r('2', 'y', 'B', 'C'), r('3', 'y', 'C', 'D'), r('4', 'y', 'D', 'A'),
    ]
    const [p] = reviewerAgreement(rows)
    expect(p.samePick).toBe(0)
    expect(p.kappa).toBeLessThan(0)     // worse than their own marginals predict
  })

  it('excludes "can\'t tell" — two people declining to guess is not agreement', () => {
    const rows = [
      r('1', 'x', 'A', null), r('2', 'x', 'B', 'B'),
      r('1', 'y', 'A', null), r('2', 'y', 'B', 'B'),
    ]
    const [p] = reviewerAgreement(rows)
    expect(p.shared).toBe(1)
    expect(p.samePick).toBe(1)
  })

  it('does not let a re-drawn item agree with itself, and keeps the LAST answer', () => {
    /*
     * A draw bug handing one reviewer the same item twice must not read
     * as a second opinion. The two duplicate rows here DIFFER, so this
     * pins which one survives — an earlier version used identical rows
     * and passed under either policy, i.e. it verified the Map's own
     * keying rather than anything this function decides.
     *
     * Last wins: if a reviewer somehow answered an item twice, the later
     * answer is the one they stood behind.
     */
    const rows = [
      r('1', 'x', 'A', 'A'), r('1', 'x', 'A', 'D'),   // x's final answer is D
      r('1', 'y', 'A', 'D'),
    ]
    const [p] = reviewerAgreement(rows)
    expect(p.shared).toBe(1)
    expect(p.samePick).toBe(1)          // D vs D — the LAST of x's two
    expect(p.bothCorrect).toBe(0)
    expect(p.sameWrongOption).toBe(1)
  })

  it('agrees on phase-2 verdicts separately from blind picks', () => {
    const rows = [
      r('1', 'x', 'A', 'A', 'unique'), r('2', 'x', 'B', 'C', 'broken'),
      r('1', 'y', 'A', 'D', 'unique'), r('2', 'y', 'B', 'A', 'alternative'),
    ]
    const [p] = reviewerAgreement(rows)
    expect(p.samePick).toBe(0)          // blind picks disagree entirely
    expect(p.verdictShared).toBe(2)
    expect(p.verdictAgree).toBe(1)      // and the verdicts half-agree
  })
})

describe('pooling across reviewers', () => {
  const r = (itemId: string, reviewerId: string, keySlot: Slot, pick: Slot | null) => ({
    itemId, reviewerId, keySlot, blindPick: pick, answered: true, verdict: null, realism: null,
  })

  /*
   * Pooling overlapping work shrinks the error bar on evidence that was
   * never independent. The overlap agreement NEEDS is exactly what
   * pooling must drop, which is why these are two functions.
   */
  it('counts a doubly-reviewed item once, keeps the FIRST, and says how many it dropped', () => {
    /*
     * The overlap rows DIFFER (x got item 1 right, y got it wrong), so
     * this pins the policy as well as the count. With identical rows the
     * test passed whichever one survived — and whichever survives moves
     * the score, so the policy is load-bearing.
     *
     * First wins: pooling is order-stable, so a later reviewer joining
     * cannot retroactively change an already-published number.
     */
    const rows = [
      r('1', 'x', 'A', 'A'), r('2', 'x', 'B', 'B'), r('3', 'x', 'C', 'D'),
      r('1', 'y', 'A', 'C'), r('4', 'y', 'D', 'D'),   // item 1 is the overlap
    ]
    const { score, reviewers, duplicated } = pooledAcrossReviewers(rows)
    expect(reviewers).toBe(2)
    expect(duplicated).toBe(1)
    expect(score.answered).toBe(4)      // NOT 5
    expect(score.correct).toBe(3)       // x's correct 'A' on item 1, not y's 'C'
  })

  it('reports n honestly when every item was reviewed twice', () => {
    // The failure this guards: two reviewers doing the same 20 items and
    // the surface printing "40 answered".
    const rows = ['1', '2', '3', '4'].flatMap(id => [r(id, 'x', 'A', 'A'), r(id, 'y', 'A', 'B')])
    const { score, duplicated } = pooledAcrossReviewers(rows)
    expect(score.answered).toBe(4)
    expect(duplicated).toBe(4)
  })
})
