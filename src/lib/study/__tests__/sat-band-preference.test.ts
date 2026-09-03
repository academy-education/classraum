/** @jest-environment node */
/**
 * The SAT module-2 band is a PREFERENCE within a domain, not a SQL filter.
 *
 * Before 2026-09-03 `difficulties: ['hard']` filtered the query, so a
 * domain with 12 hard items and a 7-per-form quota handed a student
 * repeats on the second form and let the fill loop borrow other domains'
 * hard items. rankByBand orders: unseen requested band, unseen neighbour
 * band, then repeats.
 */
jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))
import { rankByBand } from '../assemble'

type R = { id: string; difficulty: 'easy' | 'medium' | 'hard' }
const mk = (n: number, difficulty: R['difficulty'], prefix: string): R[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, difficulty }))

describe('rankByBand', () => {
  const hard = mk(12, 'hard', 'h')
  const medium = mk(20, 'medium', 'm')
  const easy = mk(5, 'easy', 'e')
  const all = [...easy, ...medium, ...hard]

  it('a fresh student gets only the requested band while it lasts', () => {
    const first7 = rankByBand(all, ['hard'], new Map(), 'seed').slice(0, 7)
    expect(first7.every(r => r.difficulty === 'hard')).toBe(true)
  })

  it('once the band is short, the same domain\'s neighbouring band comes BEFORE any repeat', () => {
    // Student has seen 7 of the 12 hard items (one form).
    const seen = new Map(hard.slice(0, 7).map((r, i) => [r.id, `2026-09-01T00:0${i}:00Z`]))
    const next7 = rankByBand(all, ['hard'], seen, 'seed').slice(0, 7)
    expect(next7.filter(r => r.difficulty === 'hard')).toHaveLength(5)   // the 5 unseen hard
    expect(next7.filter(r => r.difficulty === 'medium')).toHaveLength(2) // then medium, not easy
    expect(next7.some(r => seen.has(r.id))).toBe(false)                   // and no repeat
  })

  it('an easy/medium route falls back to hard LAST', () => {
    const seenAll = new Map([...easy, ...medium].map(r => [r.id, '2026-09-01T00:00:00Z']))
    const next = rankByBand(all, ['easy', 'medium'], seenAll, 'seed')
    // 12 unseen hard items come before the 25 seen easy/medium ones.
    expect(next.slice(0, 12).every(r => r.difficulty === 'hard')).toBe(true)
    expect(next.slice(12).every(r => seenAll.has(r.id))).toBe(true)
  })

  it('with no band requested it is plain unseen-first', () => {
    const seen = new Map([['h0', '2026-09-01T00:00:00Z']])
    const out = rankByBand(all, null, seen, 'seed')
    expect(out[out.length - 1]!.id).toBe('h0')
  })
})
