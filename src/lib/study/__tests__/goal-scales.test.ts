/**
 * Which selected tests get a goal row.
 *
 * This exists because the onboarding wizard and the preferences page
 * answered the question differently and nothing failed. Onboarding had
 * a private SAT-only `SCORE_PRESETS`; preferences had a `GOAL_SCALES`
 * table covering SAT and TOEFL. A student who chose TOEFL on first run
 * was never asked for a goal and only found the setting by going
 * looking — a silent divergence between two copies of one decision,
 * which is the same shape as the two hand-maintained bank registers.
 *
 * BREAK-TEST: drop the `.toLowerCase()` in goalTestsFor and "matches
 * regardless of case" fails — the preferences page stores 'SAT' while
 * onboarding stores 'sat', so a case-sensitive lookup silently hides the
 * goal row for whichever screen didn't write the row.
 */
import { GOAL_SCALES, goalTestsFor } from '../goal-scales'

describe('goalTestsFor', () => {
  it('returns nothing when no test is selected', () => {
    expect(goalTestsFor([], null)).toEqual([])
    expect(goalTestsFor(null, null)).toEqual([])
    expect(goalTestsFor(undefined, undefined)).toEqual([])
  })

  it('matches regardless of case', () => {
    // preferences writes 'SAT', onboarding writes 'sat'. Both are in the
    // live table and both must produce a goal row.
    expect(goalTestsFor(['SAT'], null)).toEqual(['sat'])
    expect(goalTestsFor(['sat'], null)).toEqual(['sat'])
    expect(goalTestsFor(['ToEfL'], null)).toEqual(['toefl'])
  })

  it('preserves selection order for multiple targets', () => {
    expect(goalTestsFor(['TOEFL', 'SAT'], null)).toEqual(['toefl', 'sat'])
    expect(goalTestsFor(['SAT', 'TOEFL'], null)).toEqual(['sat', 'toefl'])
  })

  it('does not render the same row twice when the focus is also in the list', () => {
    // target_test normally duplicates one entry of target_tests. Counting
    // it again would print two identical goal rows for one test.
    expect(goalTestsFor(['SAT', 'TOEFL'], 'SAT')).toEqual(['sat', 'toefl'])
    expect(goalTestsFor(['sat'], 'SAT')).toEqual(['sat'])
  })

  it('still covers a pre-multi-select row that only set the focus', () => {
    expect(goalTestsFor([], 'SAT')).toEqual(['sat'])
  })

  it('skips tests with no scale rather than inventing one', () => {
    // KSAT and the rest are deliberately absent — a goal only means
    // something on a scale the predicted-score engine can work with.
    expect(goalTestsFor(['KSAT', 'SAT', 'GRE'], null)).toEqual(['sat'])
  })

  it('ignores empty and whitespace entries', () => {
    expect(goalTestsFor(['', 'SAT'], '')).toEqual(['sat'])
  })
})

describe('GOAL_SCALES', () => {
  it('every scale is ascending and non-empty', () => {
    for (const [test, scale] of Object.entries(GOAL_SCALES)) {
      expect(scale.length).toBeGreaterThan(0)
      expect([...scale].sort((a, b) => a - b)).toEqual(scale)
      expect(new Set(scale).size).toBe(scale.length)
      // The grid picks 6 columns at >=6 entries and 5 otherwise, so a
      // scale of 7+ would wrap into a ragged second row.
      expect(scale.length).toBeLessThanOrEqual(6)
      expect(test).toBe(test.toLowerCase())
    }
  })

  it('tops out at each test\'s real maximum score', () => {
    // A preset above the ceiling would offer a goal nobody can reach.
    expect(Math.max(...GOAL_SCALES.sat)).toBe(1600)
    expect(Math.max(...GOAL_SCALES.toefl)).toBe(120)
  })
})
