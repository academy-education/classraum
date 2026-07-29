import {
  assessCoverage, itemsShortBy, FRESH_FRACTION,
} from '@/lib/study/bank-coverage'

describe('assessCoverage', () => {
  it('serves a student who has seen nothing', () => {
    expect(assessCoverage({ poolSize: 566, seen: 0, needed: 48 }))
      .toEqual({ ok: true, unseen: 566 })
  })

  it('refuses once the section is exhausted', () => {
    // The case this exists for: every item seen, so a "new" test would
    // be 48 questions they have already answered — and it costs a credit.
    const v = assessCoverage({ poolSize: 48, seen: 48, needed: 48 })
    expect(v.ok).toBe(false)
    expect(v).toMatchObject({ unseen: 0, reason: 'pool_exhausted' })
  })

  it('still serves when ONE item is a repeat', () => {
    // Requiring a fully fresh set would lock out a student who has seen
    // 1 of 566, which is worse than one repeat.
    expect(assessCoverage({ poolSize: 566, seen: 1, needed: 48 }).ok).toBe(true)
  })

  it('draws the line at two thirds fresh', () => {
    const needed = 48
    const required = Math.ceil(needed * FRESH_FRACTION)   // 32
    expect(assessCoverage({ poolSize: 100, seen: 100 - required, needed }).ok).toBe(true)
    expect(assessCoverage({ poolSize: 100, seen: 100 - required + 1, needed }).ok).toBe(false)
  })

  it('separates "never had a bank" from "you finished it"', () => {
    // Different messages: coming soon vs come back soon. Collapsing them
    // would tell a TOEFL Speaking student they had exhausted a bank that
    // was never built.
    expect(assessCoverage({ poolSize: 0, seen: 0, needed: 10 }))
      .toMatchObject({ reason: 'no_bank_coverage' })
    expect(assessCoverage({ poolSize: 10, seen: 10, needed: 10 }))
      .toMatchObject({ reason: 'pool_exhausted' })
  })

  it('never reports negative unseen when the ledger outruns the pool', () => {
    // Archiving an item the student already saw leaves seen > poolSize.
    // 133 Listen-and-Repeat rows were archived in one day, so this is
    // a real state, not a hypothetical.
    const v = assessCoverage({ poolSize: 40, seen: 97, needed: 10 })
    expect(v.unseen).toBe(0)
    expect(v.ok).toBe(false)
  })

  it('does not divide by a zero request', () => {
    expect(assessCoverage({ poolSize: 10, seen: 0, needed: 0 }).ok).toBe(true)
  })
})

describe('itemsShortBy', () => {
  it('quantifies the gap, so the wait message can be specific', () => {
    // "please wait" with no number is indistinguishable from "broken".
    expect(itemsShortBy({ poolSize: 48, seen: 48, needed: 48 })).toBe(32)
    expect(itemsShortBy({ poolSize: 48, seen: 40, needed: 48 })).toBe(24)
  })

  it('is zero when the draw is allowed', () => {
    expect(itemsShortBy({ poolSize: 566, seen: 0, needed: 48 })).toBe(0)
  })
})
