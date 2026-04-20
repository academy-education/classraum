/**
 * Tests for proration utilities used in mid-cycle subscription upgrades.
 */

import {
  getDaysRemaining,
  getTotalDaysInPeriod,
  calculateProratedAmount,
  calculateUpgradeProration,
  formatKRW,
  getTierChangeType,
} from '../proration'

describe('getDaysRemaining', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    // Set system time to 2026-04-15 (mid-month)
    jest.setSystemTime(new Date('2026-04-15T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns days remaining until end date', () => {
    expect(getDaysRemaining('2026-04-30')).toBe(15)
  })

  it('returns 0 when end date is in the past', () => {
    expect(getDaysRemaining('2026-04-10')).toBe(0)
  })

  it('returns 0 when end date is today', () => {
    expect(getDaysRemaining('2026-04-15')).toBe(0)
  })

  it('handles Date objects', () => {
    expect(getDaysRemaining(new Date('2026-04-30'))).toBe(15)
  })

  it('returns large numbers for far-future dates', () => {
    expect(getDaysRemaining('2027-04-15')).toBeGreaterThanOrEqual(364)
    expect(getDaysRemaining('2027-04-15')).toBeLessThanOrEqual(366)
  })
})

describe('getTotalDaysInPeriod', () => {
  it('returns 30 days for a typical month', () => {
    expect(getTotalDaysInPeriod('2026-04-01', '2026-05-01')).toBe(30)
  })

  it('returns 365 for a year', () => {
    expect(getTotalDaysInPeriod('2026-01-01', '2027-01-01')).toBe(365)
  })

  it('returns minimum 1 day to avoid division by zero', () => {
    expect(getTotalDaysInPeriod('2026-04-15', '2026-04-15')).toBe(1)
  })

  it('handles negative ranges by returning 1', () => {
    expect(getTotalDaysInPeriod('2026-04-30', '2026-04-15')).toBe(1)
  })

  it('handles Date objects', () => {
    expect(
      getTotalDaysInPeriod(new Date('2026-04-01'), new Date('2026-05-01'))
    ).toBe(30)
  })
})

describe('calculateProratedAmount', () => {
  it('charges nothing when newPrice equals currentPrice', () => {
    expect(calculateProratedAmount(249000, 249000, 15, 30)).toBe(0)
  })

  it('charges nothing when newPrice is lower (downgrade)', () => {
    expect(calculateProratedAmount(399000, 249000, 15, 30)).toBe(0)
  })

  it('charges nothing when no days remaining', () => {
    expect(calculateProratedAmount(249000, 399000, 0, 30)).toBe(0)
  })

  it('charges half the difference at midpoint', () => {
    // (399000 - 249000) * (15/30) = 75000
    expect(calculateProratedAmount(249000, 399000, 15, 30)).toBe(75000)
  })

  it('charges full difference at start of period', () => {
    expect(calculateProratedAmount(249000, 399000, 30, 30)).toBe(150000)
  })

  it('charges proportionally near end of period', () => {
    // (399000 - 249000) * (1/30) = 5000
    expect(calculateProratedAmount(249000, 399000, 1, 30)).toBe(5000)
  })

  it('rounds to nearest won', () => {
    // (100 * 1/3) = 33.33, rounds to 33
    expect(calculateProratedAmount(0, 100, 1, 3)).toBe(33)
  })
})

describe('calculateUpgradeProration', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-04-15T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns full upgrade details for an upgrade', () => {
    const result = calculateUpgradeProration(
      249000, 399000, '2026-04-01', '2026-05-01'
    )
    expect(result.isUpgrade).toBe(true)
    expect(result.priceDifference).toBe(150000)
    expect(result.daysRemaining).toBe(16)
    expect(result.totalDays).toBe(30)
    expect(result.proratedAmount).toBe(80000)
  })

  it('returns isUpgrade=false for downgrade with no charge', () => {
    const result = calculateUpgradeProration(
      399000, 249000, '2026-04-01', '2026-05-01'
    )
    expect(result.isUpgrade).toBe(false)
    expect(result.priceDifference).toBe(-150000)
    expect(result.proratedAmount).toBe(0)
  })

  it('returns no charge for same price', () => {
    const result = calculateUpgradeProration(
      249000, 249000, '2026-04-01', '2026-05-01'
    )
    expect(result.isUpgrade).toBe(false)
    expect(result.priceDifference).toBe(0)
    expect(result.proratedAmount).toBe(0)
  })
})

describe('formatKRW', () => {
  it('formats with Korean locale separators', () => {
    expect(formatKRW(75000)).toBe('₩75,000')
  })

  it('formats large numbers', () => {
    expect(formatKRW(1234567)).toBe('₩1,234,567')
  })

  it('formats zero', () => {
    expect(formatKRW(0)).toBe('₩0')
  })

  it('formats negative numbers', () => {
    expect(formatKRW(-1000)).toBe('₩-1,000')
  })
})

describe('getTierChangeType', () => {
  it('returns "upgrade" when moving to higher tier', () => {
    expect(getTierChangeType('individual', 'basic')).toBe('upgrade')
    expect(getTierChangeType('basic', 'pro')).toBe('upgrade')
    expect(getTierChangeType('individual', 'enterprise')).toBe('upgrade')
  })

  it('returns "downgrade" when moving to lower tier', () => {
    expect(getTierChangeType('basic', 'individual')).toBe('downgrade')
    expect(getTierChangeType('enterprise', 'pro')).toBe('downgrade')
  })

  it('returns "same" when staying on same tier', () => {
    expect(getTierChangeType('basic', 'basic')).toBe('same')
    expect(getTierChangeType('pro', 'pro')).toBe('same')
  })

  it('throws on invalid tier', () => {
    expect(() => getTierChangeType('invalid', 'basic')).toThrow('Invalid tier')
    expect(() => getTierChangeType('basic', 'invalid')).toThrow('Invalid tier')
  })
})
