/**
 * Tests for the numbers the QC dashboard prints.
 *
 * `bank-qc.test.ts` covers whether a batch may INSERT. This file covers the
 * arithmetic the page displays — forms per section, the ceiling a margin is
 * judged against, and readiness. Every case below corresponds to a way one of
 * those numbers has actually been wrong:
 *
 *   - formsBySection once derived the section by splitting its own composite
 *     key on a space, which truncated "Reading & Writing" to "Reading".
 *   - ceilingFor once judged maths against the verbal bar, so SAT Advanced
 *     Math read "At standard" at +16.6 while the hub detector had the key as
 *     the derivable centre of 64% of its items.
 *   - Readiness was read off `verified`, which is true on all 3,365 live rows
 *     including every cohort later measured at 3.5x the published bar.
 */
import {
  formsFor, formsBySection, ceilingFor, healthFor,
  readinessFor, readinessTotals, getLedger,
  type Coverage, type Baseline, type AuditedCohort,
} from '../bank-ledger'

const cov = (o: Partial<Coverage>): Coverage => ({
  test: 'toefl', section: 'Listening', task: 't', label: 'T',
  items: 100, usableItems: 100, perTest: 10, qualityTask: null, ...o,
})

/** The four published measurements ceilingFor keys off, at their real values. */
const BASELINES: Baseline[] = [
  { task: 'choose_response', margin: 25.5 },
  { task: 'sat_rw', margin: 36.2 },
  { task: 'listening_lecture', margin: 68.8 },
  { task: 'listening_conversation', margin: 13.0 },
].map(b => ({
  ...b, label: b.task, source: 'test', n: 30, mean: 0, control: 0,
  identicalSpreads: false, solvers: [],
}))

describe('formsFor', () => {
  it('floors — 5.9 forms is 5 whole tests, not 6', () => {
    expect(formsFor(cov({ usableItems: 59, perTest: 10 }))).toBe(5)
  })

  it('counts usable items, not total — unusable items cannot be served', () => {
    // Daily Life: 133 items but only 64 usable, because 69 sit in
    // single-question texts and the draw needs whole two-question sets.
    expect(formsFor(cov({ items: 133, usableItems: 64, perTest: 10 }))).toBe(6)
  })
})

describe('formsBySection', () => {
  it('keeps a section name containing spaces intact', () => {
    // THE REGRESSION: deriving the section by splitting the composite key on
    // a space silently renamed this row to "Reading".
    const [row] = formsBySection([
      cov({ test: 'sat', section: 'Reading & Writing', label: 'R&W' }),
    ])
    expect(row!.section).toBe('Reading & Writing')
    expect(row!.test).toBe('sat')
  })

  it('does not merge two distinct test/section pairs that a space delimiter would collide', () => {
    // ('A B','C') and ('A','B C') both key to "A B C" under a space
    // delimiter and would fold into one group. They are two sections.
    const rows = formsBySection([
      cov({ test: 'A B', section: 'C', label: 'first' }),
      cov({ test: 'A', section: 'B C', label: 'second' }),
    ])
    expect(rows).toHaveLength(2)
    expect(rows.map(r => `${r.test}|${r.section}`).sort())
      .toEqual(['A B|C', 'A|B C'])
  })

  it('groups tasks of one section together and reports the scarcest as the limit', () => {
    const [row] = formsBySection([
      cov({ test: 'toefl', section: 'Listening', label: 'Plentiful', usableItems: 500, perTest: 10 }),
      cov({ test: 'toefl', section: 'Listening', label: 'Scarce',    usableItems: 21,  perTest: 10 }),
    ])
    // A section runs only as many whole tests as its thinnest task allows.
    expect(row!.forms).toBe(2)
    expect(row!.limitedBy).toBe('Scarce')
  })

  it('keeps the same section name under different tests apart', () => {
    const rows = formsBySection([
      cov({ test: 'toefl', section: 'Reading', label: 'a' }),
      cov({ test: 'sat',   section: 'Reading', label: 'b' }),
    ])
    expect(rows).toHaveLength(2)
  })
})

describe('ceilingFor', () => {
  it('judges maths against chance, not the verbal bar', () => {
    // Judged against sat_rw (+40.2) an Advanced Math cohort at +16.6 read
    // "At standard" while 64% of its items had the key as the derivable
    // centre. Chance is the only honest floor when the stem is stripped.
    expect(ceilingFor('sat_math_advanced', BASELINES)).toBe(10)
    expect(ceilingFor('sat_math', BASELINES)).toBe(10)
    expect(ceilingFor('sat_math_advanced', BASELINES))
      .toBeLessThan(ceilingFor('sat_rw', BASELINES)!)
  })

  it('uses the lecture baseline for talks and the conversation baseline for exchanges', () => {
    // These are 5x apart (+68.8 vs +13.0). Averaging them into one
    // "listening" figure was meaningless for both and reversed two verdicts.
    expect(ceilingFor('academic_talk', BASELINES)).toBeCloseTo(72.8)
    expect(ceilingFor('conversation', BASELINES)).toBeCloseTo(17.0)
    expect(ceilingFor('announcement', BASELINES)).toBeCloseTo(17.0)
  })

  it('falls back to the reading bar for reading-style tasks', () => {
    expect(ceilingFor('academic_passage', BASELINES)).toBeCloseTo(40.2)
    expect(ceilingFor('daily_life', BASELINES)).toBeCloseTo(40.2)
  })

  it('returns null when the baseline it needs was never measured', () => {
    // Better an explicit "not measured" than a number invented from a
    // baseline for a different format.
    expect(ceilingFor('academic_talk', [])).toBeNull()
  })
})

describe('healthFor', () => {
  it('passes at or below the ceiling and escalates past 1.5x', () => {
    expect(healthFor(40, 40)).toBe('ok')       // on the bar is passing
    expect(healthFor(41, 40)).toBe('watch')
    expect(healthFor(60, 40)).toBe('watch')    // exactly 1.5x
    expect(healthFor(61, 40)).toBe('bad')
  })

  it('is unknown — never "ok" — when there is nothing to compare against', () => {
    // An unmeasured task must not read as passing.
    expect(healthFor(undefined, 40)).toBe('unknown')
    expect(healthFor(40, null)).toBe('unknown')
  })
})

describe('readiness', () => {
  const audited: AuditedCohort[] = [
    { task: 'academic_talk', n: 274, mean: 100, control: 31.7, margin: 68.3 }, // passes
    { task: 'conversation',  n: 193, mean: 100, control: 40.0, margin: 60.0 }, // fails
  ]
  const REQUIRED = ['shape', 'withsource', 'nosource', 'elimination', 'tells'] as const

  it('cannot be ready while only some required gates have ever run', () => {
    // academic_talk PASSES the one gate that has run. It is still not ready,
    // because four gates have never been run on it at all.
    expect(readinessFor('academic_talk', audited, BASELINES, ['nosource'], REQUIRED))
      .toBe('partial')
  })

  it('is ready only once every required gate has run and passed', () => {
    expect(readinessFor('academic_talk', audited, BASELINES, [...REQUIRED], REQUIRED))
      .toBe('ready')
  })

  it('is failed when the measured margin misses its ceiling', () => {
    expect(readinessFor('conversation', audited, BASELINES, [...REQUIRED], REQUIRED))
      .toBe('failed')
  })

  it('is unverified when the task has no measurement at all', () => {
    expect(readinessFor(null, audited, BASELINES, ['nosource'], REQUIRED)).toBe('unverified')
    expect(readinessFor('never_measured', audited, BASELINES, ['nosource'], REQUIRED))
      .toBe('unverified')
  })

  it('totals by ITEM count, so a big failing cohort outweighs a small passing one', () => {
    const totals = readinessTotals(
      [cov({ items: 274, qualityTask: 'academic_talk' }),
       cov({ items: 193, qualityTask: 'conversation' }),
       cov({ items: 50,  qualityTask: null })],
      audited, BASELINES, ['nosource'], REQUIRED,
    )
    expect(totals).toEqual({ ready: 0, partial: 274, failed: 193, unverified: 50 })
  })
})

describe('the real shipped ledger', () => {
  const l = getLedger()

  it('reports nothing as ready, because only one of five gates has been run', () => {
    // If this ever goes non-zero without gatesRunOnBank growing, the page is
    // claiming a level of checking that has not happened.
    const totals = readinessTotals(
      l.coverage, l.auditedCohorts, l.baselines, l.gatesRunOnBank,
      ['shape', 'withsource', 'nosource', 'elimination', 'tells'],
    )
    expect(l.gatesRunOnBank).toEqual(['nosource'])
    expect(totals.ready).toBe(0)
    expect(totals.partial + totals.failed + totals.unverified)
      .toBe(l.coverage.reduce((n, c) => n + c.items, 0))
  })

  it('round-trips every coverage row through the section grouping', () => {
    // Guards the composite key: if the delimiter ever collides with real
    // data, two sections silently become one and this count drops.
    const pairs = new Set(l.coverage.map(c => `${c.test}|${c.section}`))
    expect(formsBySection(l.coverage)).toHaveLength(pairs.size)
  })

  it('never claims more forms than the scarcest task supports', () => {
    for (const s of formsBySection(l.coverage)) {
      const inSection = l.coverage.filter(c => c.test === s.test && c.section === s.section)
      expect(s.forms).toBe(Math.min(...inSection.map(formsFor)))
    }
  })
})
