import { relativeTimeParts } from '../relative-time'

/**
 * The defect this file exists for: the academy detail card rendered
 * "Last active 5427h ago". The FIRST assertion below is that exact
 * interval — 226 days — and it must not come back in hours.
 */

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const NOW = Date.parse('2026-08-24T12:00:00.000Z')
const ago = (ms: number) => relativeTimeParts(NOW - ms, NOW)

describe('relativeTimeParts', () => {
  it('rolls the reported defect (5427 hours) up to months, not hours', () => {
    const { key, params } = ago(5427 * HOUR)
    expect(key).toBe('monthsAgo')
    expect(params).toEqual({ months: 7 })
  })

  it('reports sub-minute intervals as just now', () => {
    expect(ago(0).key).toBe('justNow')
    expect(ago(59 * SECOND)).toEqual({ key: 'justNow', params: {} })
  })

  // Each boundary is asserted from BOTH sides. A ladder written with the
  // wrong comparison operator passes a one-sided check.
  it('switches to minutes at exactly one minute', () => {
    expect(ago(MINUTE - 1).key).toBe('justNow')
    expect(ago(MINUTE)).toEqual({ key: 'minutesAgo', params: { minutes: 1 } })
    expect(ago(59 * MINUTE)).toEqual({ key: 'minutesAgo', params: { minutes: 59 } })
  })

  it('switches to hours at exactly one hour', () => {
    expect(ago(HOUR - 1).key).toBe('minutesAgo')
    expect(ago(HOUR)).toEqual({ key: 'hoursAgo', params: { hours: 1 } })
    expect(ago(23 * HOUR)).toEqual({ key: 'hoursAgo', params: { hours: 23 } })
  })

  it('switches to days at exactly 24 hours — the rollup that was missing', () => {
    expect(ago(DAY - 1)).toEqual({ key: 'hoursAgo', params: { hours: 23 } })
    expect(ago(DAY)).toEqual({ key: 'daysAgo', params: { days: 1 } })
    expect(ago(29 * DAY)).toEqual({ key: 'daysAgo', params: { days: 29 } })
  })

  it('switches to months at 30 days and years at 365', () => {
    expect(ago(30 * DAY - 1)).toEqual({ key: 'daysAgo', params: { days: 29 } })
    expect(ago(30 * DAY)).toEqual({ key: 'monthsAgo', params: { months: 1 } })
    expect(ago(364 * DAY)).toEqual({ key: 'monthsAgo', params: { months: 12 } })
    expect(ago(365 * DAY)).toEqual({ key: 'yearsAgo', params: { years: 1 } })
    expect(ago(3 * 365 * DAY)).toEqual({ key: 'yearsAgo', params: { years: 3 } })
  })

  it('never emits a negative unit for a future or skewed timestamp', () => {
    expect(relativeTimeParts(NOW + 10 * DAY, NOW)).toEqual({ key: 'justNow', params: {} })
  })

  it('never emits NaN for an unparseable timestamp', () => {
    expect(relativeTimeParts('not-a-date', NOW)).toEqual({ key: 'justNow', params: {} })
    for (const v of Object.values(relativeTimeParts('', NOW).params)) {
      expect(Number.isNaN(v)).toBe(false)
    }
  })

  it('accepts Date, ISO string and epoch millis alike', () => {
    const target = NOW - 3 * HOUR
    const expected = { key: 'hoursAgo', params: { hours: 3 } }
    expect(relativeTimeParts(new Date(target), NOW)).toEqual(expected)
    expect(relativeTimeParts(new Date(target).toISOString(), NOW)).toEqual(expected)
    expect(relativeTimeParts(target, NOW)).toEqual(expected)
    expect(relativeTimeParts(target, new Date(NOW))).toEqual(expected)
  })
})
