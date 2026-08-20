/** @jest-environment node */
/**
 * The billing-date function. Every assertion here is a date a real parent
 * would be charged on, so each one names the exact expected string rather
 * than re-deriving it with the same arithmetic under test.
 */
import { calculateNextDueDate, todayISO, type RecurrenceTemplate } from '@/lib/payments/recurrence'

const base: RecurrenceTemplate = {
  start_date: '2025-01-01',
  end_date: null,
  recurrence_type: 'monthly',
  day_of_month: 15,
  day_of_week: null,
  semester_months: null,
  next_due_date: '2025-01-15',
}
const t = (o: Partial<RecurrenceTemplate>): RecurrenceTemplate => ({ ...base, ...o })

describe('monthly', () => {
  it('moves to the target day later this month', () => {
    expect(calculateNextDueDate(t({ day_of_month: 15 }), '2026-08-01')).toBe('2026-08-15')
  })

  it('moves to next month when the target day already passed', () => {
    expect(calculateNextDueDate(t({ day_of_month: 15 }), '2026-08-20')).toBe('2026-09-15')
  })

  it('is strictly future: the target day being TODAY rolls to next month', () => {
    // A template due today has just been invoiced for today; returning
    // today again would make it match "due today" on the next run too.
    expect(calculateNextDueDate(t({ day_of_month: 15 }), '2026-08-15')).toBe('2026-09-15')
  })

  it('rolls across a year boundary', () => {
    expect(calculateNextDueDate(t({ day_of_month: 5 }), '2026-12-20')).toBe('2027-01-05')
  })

  it('clamps a 31st to the last day of a short month', () => {
    // Feb 2027 has 28 days. Naive setMonth arithmetic gives 2027-03-03.
    expect(calculateNextDueDate(t({ day_of_month: 31 }), '2027-02-01')).toBe('2027-02-28')
  })

  it('clamps a 31st into a 30-day month', () => {
    expect(calculateNextDueDate(t({ day_of_month: 31 }), '2026-04-15')).toBe('2026-04-30')
  })

  it('clamps when rolling INTO a short month, not just within it', () => {
    expect(calculateNextDueDate(t({ day_of_month: 30 }), '2028-01-31')).toBe('2028-02-29')
  })

  it('does not clamp permanently — the next period restores the full day', () => {
    expect(calculateNextDueDate(t({ day_of_month: 31 }), '2027-02-28')).toBe('2027-03-31')
  })

  it('falls back to the stored date when day_of_month is missing', () => {
    expect(
      calculateNextDueDate(t({ day_of_month: null, next_due_date: '2025-03-09' }), '2026-08-20'),
    ).toBe('2025-03-09')
  })
})

describe('weekly', () => {
  it('advances to the next occurrence of the weekday', () => {
    // 2026-08-20 is a Thursday(4); day_of_week 5 = Friday.
    expect(
      calculateNextDueDate(
        t({ recurrence_type: 'weekly', day_of_month: null, day_of_week: 5 }),
        '2026-08-20',
      ),
    ).toBe('2026-08-21')
  })

  it('skips a full week when the weekday is today', () => {
    expect(
      calculateNextDueDate(
        t({ recurrence_type: 'weekly', day_of_month: null, day_of_week: 4 }),
        '2026-08-20',
      ),
    ).toBe('2026-08-27')
  })

  it('handles day_of_week 0 (Sunday) without treating it as falsy', () => {
    expect(
      calculateNextDueDate(
        t({ recurrence_type: 'weekly', day_of_month: null, day_of_week: 0 }),
        '2026-08-20',
      ),
    ).toBe('2026-08-23')
  })

  it('rolls across a month boundary', () => {
    // 2026-08-31 is a Monday(1); target Tuesday(2) is the next day.
    expect(
      calculateNextDueDate(
        t({ recurrence_type: 'weekly', day_of_month: null, day_of_week: 2 }),
        '2026-08-31',
      ),
    ).toBe('2026-09-01')
  })
})

describe('semesterly', () => {
  const sem = (o: Partial<RecurrenceTemplate> = {}) =>
    t({
      recurrence_type: 'semesterly',
      day_of_month: null,
      semester_months: 6,
      start_date: '2025-07-11',
      next_due_date: '2026-02-06',
      ...o,
    })

  it('is IMPLEMENTED — it does not return the stored date unchanged', () => {
    // The whole bug: the old function fell through to next_due_date, so a
    // semesterly template could never advance and stayed permanently due.
    const out = calculateNextDueDate(sem(), '2026-08-20')
    expect(out).not.toBe('2026-02-06')
    expect(out > '2026-08-20').toBe(true)
  })

  it('lands on the start_date grid', () => {
    // start 2025-07-11, every 6 months: 2026-01-11, 2026-07-11, 2027-01-11.
    expect(calculateNextDueDate(sem(), '2026-08-20')).toBe('2027-01-11')
  })

  it('picks the nearest future grid point, not the next year', () => {
    expect(calculateNextDueDate(sem(), '2025-12-01')).toBe('2026-01-11')
  })

  it('is strictly future when today IS a grid point', () => {
    expect(calculateNextDueDate(sem(), '2026-01-11')).toBe('2026-07-11')
  })

  it('is idempotent — feeding its own output back lands on the same grid', () => {
    const first = calculateNextDueDate(sem(), '2026-08-20')
    const second = calculateNextDueDate(sem({ next_due_date: first }), first)
    expect(first).toBe('2027-01-11')
    expect(second).toBe('2027-07-11')
  })

  it('honours a semester_months other than 6', () => {
    expect(calculateNextDueDate(sem({ semester_months: 4 }), '2026-08-20')).toBe('2026-11-11')
    expect(calculateNextDueDate(sem({ semester_months: 12 }), '2026-08-20')).toBe('2027-07-11')
  })

  it('clamps a 31st anchor into a short month', () => {
    // start 2025-08-31 + 6 months = 2026-02-28, not 2026-03-03.
    expect(
      calculateNextDueDate(sem({ start_date: '2025-08-31' }), '2026-01-01'),
    ).toBe('2026-02-28')
  })

  it('falls back to the stored date when semester_months is missing', () => {
    expect(calculateNextDueDate(sem({ semester_months: null }), '2026-08-20')).toBe('2026-02-06')
  })
})

describe('boundaries', () => {
  it('returns start_date when the template has not started', () => {
    expect(
      calculateNextDueDate(t({ start_date: '2027-03-01' }), '2026-08-20'),
    ).toBe('2027-03-01')
  })

  it('start_date wins over the recurrence branch', () => {
    // day_of_month 15 would otherwise say 2026-09-15.
    expect(calculateNextDueDate(t({ start_date: '2030-01-02' }), '2026-08-20')).not.toBe('2026-09-15')
  })

  it('returns end_date once the template has ended', () => {
    expect(
      calculateNextDueDate(t({ end_date: '2026-06-30' }), '2026-08-20'),
    ).toBe('2026-06-30')
  })

  it('an end_date exactly today counts as ended', () => {
    expect(calculateNextDueDate(t({ end_date: '2026-08-20' }), '2026-08-20')).toBe('2026-08-20')
  })

  it('an end_date still in the future does not short-circuit', () => {
    expect(calculateNextDueDate(t({ end_date: '2027-01-01' }), '2026-08-20')).toBe('2026-09-15')
  })

  it('returns the stored date for an unknown recurrence type', () => {
    expect(
      calculateNextDueDate(
        t({ recurrence_type: 'fortnightly', next_due_date: '2025-04-04' }),
        '2026-08-20',
      ),
    ).toBe('2025-04-04')
  })
})

describe('timezone independence', () => {
  it('does not shift by a day regardless of the host TZ', () => {
    // The old implementation mixed a local `new Date()` with
    // `toISOString()`, so in KST every result before 09:00 rendered as
    // the previous day. Pure Y/M/D arithmetic cannot do that.
    const out = calculateNextDueDate(t({ day_of_month: 1 }), '2026-08-20')
    expect(out).toBe('2026-09-01')
  })

  it('todayISO reads the UTC calendar day', () => {
    // 2026-08-20T23:30Z is still the 20th in UTC even though it is the
    // 21st in KST.
    expect(todayISO(new Date('2026-08-20T23:30:00Z'))).toBe('2026-08-20')
    expect(todayISO(new Date('2026-08-20T15:00:00Z'))).toBe('2026-08-20')
  })
})

describe('every real recurrence_type in the DB is handled', () => {
  // The CHECK constraint permits exactly these three. A type that falls
  // through to the stored date can never advance under a live cron.
  it.each([
    ['monthly', t({ day_of_month: 15 })],
    ['weekly', t({ recurrence_type: 'weekly', day_of_month: null, day_of_week: 5 })],
    [
      'semesterly',
      t({
        recurrence_type: 'semesterly',
        day_of_month: null,
        semester_months: 6,
        start_date: '2025-07-11',
      }),
    ],
  ] as const)('%s advances strictly past today', (_type, tpl) => {
    const out = calculateNextDueDate(tpl, '2026-08-20')
    expect(out > '2026-08-20').toBe(true)
    expect(out).not.toBe(tpl.next_due_date)
  })
})
