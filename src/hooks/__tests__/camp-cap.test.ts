import { campCapOverflow, isProgramOpen, type CampWindow } from '@/lib/camp/cap'

/**
 * `student_cap` is what the school paid for, so this arithmetic is a
 * commercial control, not a nicety. Two ways to get it wrong, and both
 * are represented below:
 *
 *  - count per CLASSROOM instead of per PROGRAM, and three classes of
 *    ten slide inside a cap of fifteen;
 *  - add the two lists instead of unioning them, and a student who is
 *    already in another class of the same camp gets counted twice,
 *    refusing a save that is perfectly legal.
 */

describe('campCapOverflow', () => {
  it('allows a roster that fits', () => {
    expect(campCapOverflow(['a', 'b'], ['c'], 5)).toBeNull()
  })

  it('allows a roster that exactly fills the cap', () => {
    expect(campCapOverflow(['a', 'b'], ['c'], 3)).toBeNull()
  })

  it('blocks one student over, and says by how many', () => {
    expect(campCapOverflow(['a', 'b', 'c'], ['d'], 3)).toEqual({ total: 4, over: 1 })
  })

  it('counts a student in two classes of the same camp ONCE', () => {
    // 'b' is already enrolled elsewhere in this camp and is being added
    // here too. Three distinct people, cap of 3 — this must be allowed.
    // Naive addition would read 4 and wrongly refuse.
    expect(campCapOverflow(['a', 'b'], ['b', 'c'], 3)).toBeNull()
  })

  it('de-duplicates within the selection as well', () => {
    expect(campCapOverflow([], ['a', 'a', 'b'], 2)).toBeNull()
  })

  it('treats cap 0 as unmetered', () => {
    // Every camp_programs row defaults student_cap to 0; only a paid
    // program gets a real number. 0 must never block a save.
    expect(campCapOverflow(['a', 'b', 'c'], ['d', 'e'], 0)).toBeNull()
  })

  it('reports the overflow against a large roster', () => {
    const existing = Array.from({ length: 18 }, (_, i) => `s${i}`)
    const selected = Array.from({ length: 5 }, (_, i) => `n${i}`)
    expect(campCapOverflow(existing, selected, 20)).toEqual({ total: 23, over: 3 })
  })
})

describe('isProgramOpen', () => {
  const p = (starts: string | null, ends: string | null): CampWindow => ({ starts_on: starts, ends_on: ends })
  const on = (d: string) => new Date(`${d}T12:00:00Z`)

  it('is open inside the window', () => {
    expect(isProgramOpen(p('2026-08-01', '2026-09-01'), on('2026-08-20'))).toBe(true)
  })

  it('is open on both boundary days', () => {
    // The API gates with `today < starts_on` / `today > ends_on`, so the
    // first and last days are INSIDE the window. If this flips, a camp
    // silently loses its final day of teaching.
    expect(isProgramOpen(p('2026-08-01', '2026-09-01'), on('2026-08-01'))).toBe(true)
    expect(isProgramOpen(p('2026-08-01', '2026-09-01'), on('2026-09-01'))).toBe(true)
  })

  it('is closed before it starts and after it ends', () => {
    expect(isProgramOpen(p('2026-08-01', '2026-09-01'), on('2026-07-31'))).toBe(false)
    expect(isProgramOpen(p('2026-08-01', '2026-09-01'), on('2026-09-02'))).toBe(false)
  })

  it('treats missing dates as unbounded', () => {
    expect(isProgramOpen(p(null, null), on('2030-01-01'))).toBe(true)
    expect(isProgramOpen(p(null, '2026-09-01'), on('2026-01-01'))).toBe(true)
  })
})
