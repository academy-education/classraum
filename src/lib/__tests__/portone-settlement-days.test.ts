/** @jest-environment node */
/**
 * The settlement filter selects by explicit yyyy-MM-dd days, not by a
 * range, so "sync the last week" has to enumerate them. Month and year
 * rollover is the classic way that kind of loop goes wrong, and the
 * failure is silent: a query for the wrong days returns 200 with zero
 * rows, which is indistinguishable from "nothing settled".
 */
import { enumerateDays } from '../portone-settlement-days'

const d = (s: string) => new Date(`${s}T00:00:00.000Z`)

describe('enumerateDays', () => {
  it('includes both endpoints', () => {
    expect(enumerateDays(d('2026-07-20'), d('2026-07-23')))
      .toEqual(['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23'])
  })

  it('returns the single day when from === to', () => {
    expect(enumerateDays(d('2026-07-20'), d('2026-07-20'))).toEqual(['2026-07-20'])
  })

  it('rolls over a month boundary', () => {
    expect(enumerateDays(d('2026-07-30'), d('2026-08-02')))
      .toEqual(['2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02'])
  })

  it('rolls over a year boundary', () => {
    expect(enumerateDays(d('2026-12-31'), d('2027-01-01')))
      .toEqual(['2026-12-31', '2027-01-01'])
  })

  it('caps the span so a bad `since` cannot build an unbounded query', () => {
    const days = enumerateDays(d('2020-01-01'), d('2026-07-27'))
    expect(days).toHaveLength(60)
    expect(days[0]).toBe('2020-01-01')
  })

  it('does not loop forever when to precedes from', () => {
    expect(enumerateDays(d('2026-07-20'), d('2026-07-10'))).toEqual(['2026-07-20'])
  })
})
