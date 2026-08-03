/**
 * The readiness rule for /admin/bank-qc, pinned.
 *
 * This exists because the first version of it got the thing wrong that
 * this whole page was built to fix. It marked Standard English
 * Conventions "Ready" on 12 of 234 items measured — a 5% sample — which
 * is the same sample-to-population leap that let "SAT Math is fixed" be
 * said when only the 96 repaired items had been re-measured and the
 * rest scored 100% blind.
 *
 * The rule is deliberately ASYMMETRIC, and that is the property under
 * test:
 *
 *   a BAD sample is a verdict      — 12/12 solvable without the source
 *                                    means the cohort has a defect, and
 *                                    the other 200 items do not rescue it
 *   a GOOD sample is not           — 12 clean items out of 234 is a spot
 *                                    check, and must not read as Ready
 */
const MEANINGFUL_COVERAGE = 0.2

type Status = 'ready' | 'spot-checked' | 'guessable' | 'badly-guessable' | 'unmeasured' | 'not-applicable'

/** Mirrors statusFor in src/app/api/admin/bank-qc/live/route.ts. */
function statusFor(measured: number, blindPct: number | null, cohortSize: number): Status {
  if (measured === 0 || blindPct === null) return 'unmeasured'
  if (blindPct >= 85) return 'badly-guessable'
  if (blindPct >= 60) return 'guessable'
  const coverage = cohortSize === 0 ? 0 : measured / cohortSize
  return coverage >= MEANINGFUL_COVERAGE ? 'ready' : 'spot-checked'
}

describe('bank readiness status', () => {
  it('never reports Ready from a thin sample, however clean', () => {
    // The real case: SEC scored 52.8% on 12 of 234. Clean-ish, and
    // nowhere near enough of the cohort to make a claim about it.
    expect(statusFor(12, 52.8, 234)).toBe('spot-checked')
    expect(statusFor(1, 0, 500)).toBe('spot-checked')
    // At meaningful coverage the same score IS a verdict.
    expect(statusFor(60, 52.8, 234)).toBe('ready')
  })

  it('reports a BAD sample as bad at any coverage', () => {
    // Asymmetry. One bad dozen condemns the cohort; one good dozen
    // does not clear it.
    expect(statusFor(12, 100, 433)).toBe('badly-guessable')
    expect(statusFor(12, 97.4, 211)).toBe('badly-guessable')
    expect(statusFor(12, 83.3, 193)).toBe('guessable')
    expect(statusFor(3, 100, 1000)).toBe('badly-guessable')
  })

  it('treats unmeasured as its own state, not as passing', () => {
    expect(statusFor(0, null, 433)).toBe('unmeasured')
    // 93.7% of the bank is in this state, so it must never collapse
    // into ready or into a failure — both would be a claim we cannot
    // make.
    expect(statusFor(0, null, 1)).toBe('unmeasured')
  })

  it('does not divide by zero on an empty cohort', () => {
    expect(statusFor(0, null, 0)).toBe('unmeasured')
  })

  it('places the boundaries where the sweep data sits', () => {
    // Guards against a later tweak silently reclassifying the measured
    // cohorts. These are the real numbers from 2026-08-03.
    expect(statusFor(12, 85, 100)).toBe('badly-guessable')  // exactly at the line
    expect(statusFor(12, 84.9, 100)).toBe('guessable')
    expect(statusFor(12, 60, 100)).toBe('guessable')
    expect(statusFor(30, 59.9, 100)).toBe('ready')          // 30% coverage
  })
})
