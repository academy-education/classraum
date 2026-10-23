import { CampDailyAccumulator, MAX_CAMP_DAYS, campDayRange } from '../daily'

describe('campDayRange', () => {
  it('runs from starts_on to today while the camp is on', () => {
    expect(campDayRange('2026-10-20', '2026-10-31', '2026-10-23')).toEqual(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'])
  })
  it('stops at ends_on once the camp is over', () => {
    expect(campDayRange('2026-08-30', '2026-09-01', '2026-10-23')).toEqual(['2026-08-30', '2026-08-31', '2026-09-01'])
  })
  it('is empty before the camp starts', () => {
    expect(campDayRange('2026-11-01', '2026-11-30', '2026-10-23')).toEqual([])
  })
  it('falls back to the earliest data day without a start date, and is empty with neither', () => {
    expect(campDayRange(null, null, '2026-10-23', '2026-10-22')).toEqual(['2026-10-22', '2026-10-23'])
    expect(campDayRange(null, null, '2026-10-23', null)).toEqual([])
  })
  it('crosses month ends correctly and is capped', () => {
    expect(campDayRange('2026-02-27', null, '2026-03-01')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01'])
    expect(campDayRange('2000-01-01', null, '2026-10-23')).toHaveLength(MAX_CAMP_DAYS)
  })
})

describe('CampDailyAccumulator', () => {
  it('buckets by KOREAN date and leaves empty days as gaps (null), not 0', () => {
    const acc = new CampDailyAccumulator()
    // due 2026-10-21 23:59 KST = 14:59 UTC the same day
    acc.addDue('2026-10-21T14:59:59Z', true)
    acc.addDue('2026-10-21T14:59:59Z', false)
    // completed 2026-10-22 08:30 KST = 2026-10-21 23:30 UTC: belongs to the 22nd
    acc.addScore('2026-10-21T23:30:00Z', 80)
    acc.addScore('2026-10-22T05:00:00Z', 61)
    acc.addAttendance('2026-10-21', 'present')
    acc.addAttendance('2026-10-21', 'late')
    acc.addAttendance('2026-10-21', 'absent')
    acc.addAttendance('2026-10-21', 'excused')
    acc.addAttendance('2026-10-21', 'pending')   // not taken: not in the denominator
    const [d20, d21, d22] = acc.series(['2026-10-20', '2026-10-21', '2026-10-22'])
    expect(d20).toMatchObject({ completionPct: null, attendancePct: null, avgScorePct: null, scoreN: 0 })
    expect(d21).toMatchObject({ due: 2, completed: 1, completionPct: 50, attendanceMarked: 4, attended: 2, attendancePct: 50, avgScorePct: null })
    expect(d22).toMatchObject({ completionPct: null, attendancePct: null, avgScorePct: 71, scoreN: 2 })
  })

  it('a day whose attendance is all pending is a gap, not 0%', () => {
    const acc = new CampDailyAccumulator()
    acc.addAttendance('2026-10-21', 'pending')
    expect(acc.series(['2026-10-21'])[0]!.attendancePct).toBeNull()
  })

  it('reports the earliest day with any data', () => {
    const acc = new CampDailyAccumulator()
    acc.addAttendance('2026-10-19', 'present')
    acc.addScore('2026-10-20T03:00:00Z', 50)
    expect(acc.earliestDay()).toBe('2026-10-19')
  })
})
