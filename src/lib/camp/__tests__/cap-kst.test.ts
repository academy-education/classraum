import { isProgramOpen, pickDefaultProgram } from '../cap'
import { campPeriodEnd } from '../dates'

/**
 * isProgramOpen gates which camps a classroom can be pointed at. It used the UTC date, so between 00:00 and 09:00
 * KST on a camp's first day the camp was still "not open yet" and on the day after it ended it was still open.
 */
describe('isProgramOpen uses the Korean date', () => {
  // 2026-10-22 23:30 UTC = 2026-10-23 08:30 KST
  const morning = new Date('2026-10-22T23:30:00Z')

  it('a camp starting today in Korea is open before 09:00 KST', () => {
    expect(isProgramOpen({ starts_on: '2026-10-23', ends_on: '2026-11-30' }, morning)).toBe(true)
  })

  it('a camp that ended yesterday in Korea is closed before 09:00 KST', () => {
    expect(isProgramOpen({ starts_on: '2026-09-01', ends_on: '2026-10-22' }, morning)).toBe(false)
  })
})

describe('campPeriodEnd', () => {
  it('is today while the camp runs', () => {
    expect(campPeriodEnd('2026-12-31', '2026-10-23')).toBe('2026-10-23')
  })
  it('is today when there is no end date', () => {
    expect(campPeriodEnd(null, '2026-10-23')).toBe('2026-10-23')
  })
  it('is capped at the program end once it is over', () => {
    expect(campPeriodEnd('2026-08-31', '2026-10-23')).toBe('2026-08-31')
  })
})

describe('pickDefaultProgram', () => {
  const today = '2026-10-23'
  const summer = { id: 'summer', starts_on: '2026-07-01', ends_on: '2026-08-31' }
  const fall = { id: 'fall', starts_on: '2026-10-01', ends_on: '2026-11-30' }
  const winter = { id: 'winter', starts_on: '2026-12-20', ends_on: '2027-02-10' }
  const spring = { id: 'spring', starts_on: '2027-03-01', ends_on: '2027-04-10' }

  it('opens on the program running today, not the oldest', () => {
    expect(pickDefaultProgram([summer, fall, winter], today)?.id).toBe('fall')
  })
  it('counts both boundary days as running', () => {
    expect(pickDefaultProgram([summer, { ...fall, starts_on: today }], today)?.id).toBe('fall')
    expect(pickDefaultProgram([summer, { ...fall, ends_on: today }], today)?.id).toBe('fall')
  })
  it('with nothing running, opens on the next one to start', () => {
    expect(pickDefaultProgram([summer, spring, winter], today)?.id).toBe('winter')
  })
  it('with everything over, opens on the most recently ended', () => {
    expect(pickDefaultProgram([summer, { id: 'spring26', starts_on: '2026-03-01', ends_on: '2026-04-10' }], today)?.id).toBe('summer')
  })
  it('an undated program counts as running', () => {
    expect(pickDefaultProgram([summer, { id: 'open', starts_on: null, ends_on: null }], today)?.id).toBe('open')
  })
  it('empty list -> null', () => {
    expect(pickDefaultProgram([], today)).toBeNull()
  })
})
