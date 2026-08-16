import { lastNMonthsKST, monthlyNetRevenueKST } from '@/lib/admin/revenue'
import { formatWonCompact, formatWonFull } from '@/lib/format-won'

describe('lastNMonthsKST', () => {
  it('ends with the KST month containing now, even when UTC is still in the previous month', () => {
    // 2026-07-31 16:30 UTC = 2026-08-01 01:30 KST → the "current" month is August.
    const now = new Date('2026-07-31T16:30:00Z')
    const months = lastNMonthsKST(3, now)
    expect(months.map(m => [m.year, m.month])).toEqual([[2026, 5], [2026, 6], [2026, 7]])
    // August KST starts at 2026-07-31T15:00Z.
    expect(months[2].startIso).toBe('2026-07-31T15:00:00.000Z')
    expect(months[2].endIso).toBe('2026-08-31T15:00:00.000Z')
  })

  it('crosses year boundaries', () => {
    const months = lastNMonthsKST(2, new Date('2026-01-10T00:00:00Z'))
    expect(months.map(m => [m.year, m.month])).toEqual([[2025, 11], [2026, 0]])
  })
})

describe('monthlyNetRevenueKST', () => {
  const months = lastNMonthsKST(2, new Date('2026-08-15T00:00:00Z')) // July, August (KST)

  it('subtracts refunds from the month the refund was issued', () => {
    const payments = [
      { amountWon: 50_000, at: '2026-07-05T03:00:00Z' }, // July KST
      { amountWon: 30_000, at: '2026-08-02T03:00:00Z' }, // August KST
    ]
    const refunds = [
      { amountWon: 20_000, at: '2026-08-03T03:00:00Z' }, // refund of the July payment, issued in August
    ]
    expect(monthlyNetRevenueKST(months, payments, refunds)).toEqual([50_000, 10_000])
  })

  it('buckets by KST calendar day, not UTC', () => {
    // 2026-07-31 15:30 UTC = 2026-08-01 00:30 KST → August, not July.
    const payments = [{ amountWon: 10_000, at: '2026-07-31T15:30:00Z' }]
    expect(monthlyNetRevenueKST(months, payments, [])).toEqual([0, 10_000])
  })

  it('ignores rows outside the window and null timestamps/amounts', () => {
    const payments = [
      { amountWon: 10_000, at: '2020-01-01T00:00:00Z' },
      { amountWon: 10_000, at: null },
      { amountWon: null, at: '2026-08-02T03:00:00Z' },
    ]
    expect(monthlyNetRevenueKST(months, payments, [])).toEqual([0, 0])
  })

  it('can go negative when refunds exceed payments in a month', () => {
    const refunds = [{ amountWon: 5_000, at: '2026-08-02T03:00:00Z' }]
    expect(monthlyNetRevenueKST(months, [], refunds)).toEqual([0, -5_000])
  })
})

describe('formatWon', () => {
  it('uses 만/억 units in Korean', () => {
    expect(formatWonCompact(1_200_000, 'korean')).toBe('₩120만')
    expect(formatWonCompact(120_000_000, 'korean')).toBe('₩1.2억')
    expect(formatWonCompact(12_345_678, 'korean')).toBe('₩1,234.6만')
    expect(formatWonCompact(3_500, 'korean')).toBe('₩3,500')
    expect(formatWonCompact(0, 'korean')).toBe('₩0')
  })

  it('uses K/M units in English', () => {
    expect(formatWonCompact(1_200_000, 'english')).toBe('₩1.2M')
    expect(formatWonCompact(3_500, 'english')).toBe('₩3.5K')
    expect(formatWonCompact(950, 'english')).toBe('₩950')
  })

  it('handles negatives and full form', () => {
    expect(formatWonCompact(-1_200_000, 'korean')).toBe('-₩120만')
    expect(formatWonFull(1_234_567, 'korean')).toBe('₩1,234,567')
    expect(formatWonFull(-500, 'english')).toBe('-₩500')
  })
})
