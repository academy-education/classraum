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

// Regression, 2026-09-04. The original tests in this file all ran with an
// EMPTY exposure map, where unseenFirst is effectively a no-op and the band
// sort applied to the fallback pool survived by accident. Live, a student's
// third hard form has exposures, unseenFirst reordered the pool, and
// Standard English Conventions fell from hard straight to EASY past 181
// available medium items. The exposures are the whole point of this test.
describe('band fallback with exposures present', () => {
  const mk = (id: string, difficulty: 'easy' | 'medium' | 'hard') => ({ id, difficulty })

  it('prefers medium over easy when the hard band is dry AND items are seen', () => {
    const items = [
      ...Array.from({ length: 2 }, (_, i) => mk(`h${i}`, 'hard')),
      ...Array.from({ length: 12 }, (_, i) => mk(`m${i}`, 'medium')),
      ...Array.from({ length: 12 }, (_, i) => mk(`e${i}`, 'easy')),
    ]
    // seen: both hard items, plus a scattering of medium and easy
    const exposures = new Map<string, string>([
      ['h0', 's'], ['h1', 's'], ['m0', 's'], ['m1', 's'], ['e0', 's'], ['e1', 's'],
    ])
    const out = rankByBand(items, ['hard'], exposures, 'seed')
    const unseen = out.filter(x => !exposures.has(x.id))
    const firstEasy = unseen.findIndex(x => x.difficulty === 'easy')
    const lastMedium = unseen.map(x => x.difficulty).lastIndexOf('medium')
    expect(firstEasy).toBeGreaterThan(lastMedium)
    // every unseen medium must precede every unseen easy
    expect(unseen.filter(x => x.difficulty === 'medium')).toHaveLength(10)
  })

  it('keeps the same preference among already-seen items', () => {
    const items = [mk('m0', 'medium'), mk('e0', 'easy'), mk('h0', 'hard')]
    const exposures = new Map<string, string>([['m0', 's'], ['e0', 's'], ['h0', 's']])
    const out = rankByBand(items, ['hard'], exposures, 'seed')
    const bands = out.map(x => x.difficulty)
    expect(bands.indexOf('medium')).toBeLessThan(bands.indexOf('easy'))
  })
})
