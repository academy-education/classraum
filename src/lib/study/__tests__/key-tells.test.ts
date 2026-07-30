/**
 * MUTATION TESTS for the per-set length tell.
 *
 * CLAUDE.md: "A passing check is evidence only if it would have failed."
 * Every threshold below is exercised from both sides — a bank built to be
 * exploitable must fail, a bank built at the chance rate must pass, and
 * the boundary is pinned so a later edit to ALPHA cannot drift silently.
 */
import {
  analyseSetTell,
  setTellFails,
  lengthMark,
  pSetExploitable,
  exploitableBar,
  binomUpperTail,
  poissonUpperTail,
  SET_TELL_ALPHA,
  type KeySet,
  type LengthMark,
} from '../key-tells'

/** Deterministic PRNG — a Monte Carlo in a test suite must not flake. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** One set whose marks follow the chance null: 25% longest, 25% shortest. */
function chanceSet(key: string, size: number, rand: () => number): KeySet {
  const marks: LengthMark[] = []
  for (let i = 0; i < size; i++) {
    const r = rand()
    marks.push(r < 0.25 ? 'longest' : r < 0.5 ? 'shortest' : 'middle')
  }
  return { key, cohort: 'sim', marks }
}

function set(key: string, marks: LengthMark[]): KeySet {
  return { key, cohort: 'test', marks }
}

describe('lengthMark', () => {
  it('names the uniquely longest and uniquely shortest option', () => {
    expect(lengthMark('dddd', ['a', 'bb', 'ccc', 'dddd'])).toBe('longest')
    expect(lengthMark('a', ['a', 'bb', 'ccc', 'dddd'])).toBe('shortest')
    expect(lengthMark('bb', ['a', 'bb', 'ccc', 'dddd'])).toBe('middle')
  })

  it('treats a TIE at the extreme as no tell, because it answers nothing', () => {
    // Two options share the maximum: "pick the longest" leaves a coin flip,
    // so the student has learned nothing. Mutation: if the tie check were
    // dropped this would read 'longest'.
    expect(lengthMark('dddd', ['a', 'bb', 'eeee', 'dddd'])).toBe('middle')
    expect(lengthMark('a', ['a', 'b', 'ccc', 'dddd'])).toBe('middle')
  })
})

describe('the chance arithmetic the threshold rests on', () => {
  it('matches the hand-computed probabilities quoted in the comment', () => {
    // P(4 of 4) = 0.25^4
    expect(binomUpperTail(4, 4, 0.25)).toBeCloseTo(0.00390625, 10)
    // P(>=3 of 4) = 4(0.25^3)(0.75) + 0.25^4
    expect(binomUpperTail(4, 3, 0.25)).toBeCloseTo(0.05078125, 10)
    // P(3 of 3)
    expect(binomUpperTail(3, 3, 0.25)).toBeCloseTo(0.015625, 10)
    // Tails are well-defined at the edges.
    expect(binomUpperTail(10, 0, 0.25)).toBe(1)
    expect(binomUpperTail(10, 11, 0.25)).toBe(0)
    // Survives the largest cohort in the bank without overflowing.
    expect(binomUpperTail(1599, 400, 0.25)).toBeGreaterThan(0)
    expect(binomUpperTail(1599, 400, 0.25)).toBeLessThan(1)
    expect(binomUpperTail(634, 1, 0.25)).toBeCloseTo(1, 10)
  })

  it('prices a set of each size', () => {
    expect(pSetExploitable(2)).toBe(0)          // excluded: 2/2 is 6.3% by chance
    expect(pSetExploitable(3)).toBeCloseTo(0.03125, 6)
    expect(pSetExploitable(4)).toBeCloseTo(0.1015625, 6)
    expect(pSetExploitable(5)).toBeCloseTo(0.031250, 5)
    expect(exploitableBar(3)).toBe(3)
    expect(exploitableBar(4)).toBe(3)
    expect(exploitableBar(12)).toBe(9)
  })

  it('poissonUpperTail agrees with a direct sum', () => {
    // P(X>=1 | 2) = 1 - e^-2
    expect(poissonUpperTail(1, 2)).toBeCloseTo(1 - Math.exp(-2), 12)
    expect(poissonUpperTail(0, 5)).toBe(1)
  })
})

describe('analyseSetTell — what counts as a set', () => {
  it('ignores 2-item sets even when both keys are the longest option', () => {
    // The exploit is real for that student, but 1 set in 16 does this by
    // chance; counting them would swamp the statistic with noise.
    const r = analyseSetTell([
      set('pair-1', ['longest', 'longest']),
      set('pair-2', ['longest', 'longest']),
      set('pair-3', ['shortest', 'shortest']),
    ])
    expect(r.eligible).toBe(0)
    expect(r.observed).toBe(0)
    expect(setTellFails(r)).toBe(false)
  })

  it('requires 75% AND at least 3 items', () => {
    // 3 of 12 is chance exactly — the "3 items" floor must not admit it.
    const twelve = analyseSetTell([
      set('big', ['longest', 'longest', 'longest', ...Array(9).fill('middle') as LengthMark[]]),
    ])
    expect(twelve.observed).toBe(0)

    // 2 of 4 is half the set — under the bar.
    expect(analyseSetTell([set('q', ['longest', 'longest', 'middle', 'shortest'])]).observed).toBe(0)
    // 3 of 4 clears it.
    expect(analyseSetTell([set('q', ['longest', 'longest', 'longest', 'shortest'])]).observed).toBe(1)
  })

  it('counts both directions, and does not add a mixed set', () => {
    const r = analyseSetTell([
      set('a', ['shortest', 'shortest', 'shortest']),
      set('b', ['longest', 'longest', 'shortest', 'shortest']),   // 2/2, neither reaches 3
    ])
    expect(r.observed).toBe(1)
    expect(r.exploitable[0]!.mark).toBe('shortest')
    expect(r.swept).toEqual(['a'])
  })
})

describe('analyseSetTell — the gate fires on a rigged bank', () => {
  it('FAILS a bank where a third of the sets are swept', () => {
    const sets: KeySet[] = []
    for (let i = 0; i < 40; i++) sets.push(set(`clean-${i}`, ['middle', 'middle', 'longest', 'shortest']))
    for (let i = 0; i < 20; i++) sets.push(set(`rigged-${i}`, ['longest', 'longest', 'longest', 'longest']))
    const r = analyseSetTell(sets)
    expect(r.observed).toBe(20)
    expect(r.expected).toBeCloseTo(60 * 0.1015625, 6)
    expect(r.pValue).toBeLessThan(1e-5)
    expect(setTellFails(r)).toBe(true)
  })

  it('REVERTING the rig makes it pass — the failure was caused by the rig', () => {
    // The other half of the mutation test. Same 60 sets, rigged ones
    // un-rigged; if this still failed, the assertion above would be
    // measuring something other than the tell.
    const sets: KeySet[] = []
    for (let i = 0; i < 60; i++) sets.push(set(`clean-${i}`, ['middle', 'middle', 'longest', 'shortest']))
    const r = analyseSetTell(sets)
    expect(r.observed).toBe(0)
    expect(setTellFails(r)).toBe(false)
  })

  it('catches a subtler rig: 3-of-4 rather than 4-of-4', () => {
    // A batch where the author "varied it" by leaving one item alone per
    // talk. Still three free marks in every set.
    const sets: KeySet[] = []
    for (let i = 0; i < 30; i++) sets.push(set(`clean-${i}`, ['middle', 'middle', 'longest', 'shortest']))
    for (let i = 0; i < 15; i++) sets.push(set(`soft-${i}`, ['longest', 'longest', 'longest', 'middle']))
    const r = analyseSetTell(sets)
    expect(r.observed).toBe(15)
    expect(r.swept).toEqual([])          // nothing is swept; a sweep-only check would miss this
    expect(setTellFails(r)).toBe(true)
  })
})

describe('analyseSetTell — the gate does NOT fire on a clean bank', () => {
  it('passes 500 simulated banks drawn at the chance rate', () => {
    // The failure this repo has shipped twice is a guard that fires on
    // everything. Measure it: build banks at exactly the null and count
    // how often the gate trips. It must be near ALPHA, not near 1.
    let fired = 0
    const RUNS = 500
    for (let seed = 1; seed <= RUNS; seed++) {
      const rand = rng(seed)
      const sets: KeySet[] = []
      // Same shape as the live bank: 37 threes, 126 fours, 46 fives, 1 twelve.
      for (let i = 0; i < 37; i++) sets.push(chanceSet(`s3-${i}`, 3, rand))
      for (let i = 0; i < 126; i++) sets.push(chanceSet(`s4-${i}`, 4, rand))
      for (let i = 0; i < 46; i++) sets.push(chanceSet(`s5-${i}`, 5, rand))
      sets.push(chanceSet('s12', 12, rand))
      if (setTellFails(analyseSetTell(sets))) fired++
    }
    // Measured over 5,000 draws off-line: 0.52%, i.e. a little UNDER the
    // nominal 1% because the Poisson tail is slightly conservative against
    // the true Poisson-binomial. 500 draws here keeps the suite fast, so
    // the bound is loose enough not to flake on that sample size.
    expect(fired / RUNS).toBeLessThan(0.04)
    // Non-zero off-line too — a gate that can NEVER fire would also satisfy
    // the line above. The rigged-bank tests are what rule that out.
    // ...but it must not be a no-op either: a gate that can never fire
    // would also pass the line above. That is what the rigged-bank tests
    // above rule out, and this one records the price of ALPHA.
    expect(SET_TELL_ALPHA).toBe(0.01)
  })

  it('a lone swept set is not enough to condemn a bank', () => {
    // 210 sets shaped like the live bank, exactly one of them swept.
    // E = 15.4, so one exploitable set is FAR below chance.
    const sets: KeySet[] = []
    for (let i = 0; i < 209; i++) sets.push(set(`c-${i}`, ['middle', 'middle', 'longest', 'shortest']))
    sets.push(set('swept', ['longest', 'longest', 'longest', 'longest']))
    const r = analyseSetTell(sets)
    expect(r.swept).toEqual(['swept'])
    expect(setTellFails(r)).toBe(false)
  })
})

describe('the boundary is where the comment says it is', () => {
  // Pins the claim "at 210 sets (E=15.4) it fires at 26". If ALPHA or the
  // exploitable bar moves, this test names the new number rather than
  // quietly accepting it.
  const bankShaped = (exploitableCount: number): KeySet[] => {
    const sets: KeySet[] = []
    for (let i = 0; i < 37; i++) sets.push(set(`s3-${i}`, ['middle', 'middle', 'longest']))
    for (let i = 0; i < 126; i++) sets.push(set(`s4-${i}`, ['middle', 'middle', 'longest', 'shortest']))
    for (let i = 0; i < 46; i++) sets.push(set(`s5-${i}`, ['middle', 'middle', 'middle', 'longest', 'shortest']))
    sets.push(set('s12', Array(12).fill('middle') as LengthMark[]))
    // Replace 4-item sets ONLY. Swapping a 3-set for a 4-set would change
    // E as well as the count, and the boundary this test pins would move
    // for a reason that has nothing to do with the threshold.
    for (let i = 0; i < exploitableCount; i++) {
      sets[37 + i] = set(`s4-${i}`, ['longest', 'longest', 'longest', 'middle'])
    }
    return sets
  }

  it('E is 15.4 for the live bank shape', () => {
    const r = analyseSetTell(bankShaped(0))
    expect(r.eligible).toBe(210)
    expect(r.expected).toBeCloseTo(15.39, 1)
  })

  it('25 exploitable sets pass, 26 fail', () => {
    expect(setTellFails(analyseSetTell(bankShaped(25)))).toBe(false)
    expect(setTellFails(analyseSetTell(bankShaped(26)))).toBe(true)
  })

  it('the live bank as measured on 2026-07-30 passes', () => {
    // 17 exploitable of 210 — p = 37%. Recorded so that a future run that
    // starts failing can be compared against a real, checked baseline
    // rather than against a guess.
    const r = analyseSetTell(bankShaped(17))
    expect(r.observed).toBe(17)
    expect(r.pValue).toBeGreaterThan(0.3)
    expect(setTellFails(r)).toBe(false)
  })
})
