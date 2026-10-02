/** @jest-environment node */
/**
 * TOEFL set draw: exact-fill packing and the module-2 band rule.
 * See src/lib/study/toefl-pack.ts and REGISTER §5, 2026-10-02.
 *
 * Measured on the live bank by scripts/study-bank/toefl-form-depth.ts:
 * Announcement repeated at the 4th lower-path sitting with 85 unseen items
 * left, because the greedy pass back-filled a quota of 6 with a seen 2-set
 * beside a fresh 4-set; and upper/hard Conversation repeated early because
 * seen in-band sets outranked unseen sets that straddle the band.
 */
import { assembleToeflFromBank } from '@/lib/study/assemble'
import { bandTier, chooseExactFill, setScore } from '@/lib/study/toefl-pack'
import { dbAdmin } from '@/lib/supabase-admin'
import { tableRouter } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))
const fromMock = dbAdmin.from as unknown as jest.Mock

const S = (size: number, seen = false, tier: 'in' | 'adjacent' | 'cross' = 'in') =>
  ({ size, score: setScore(size, seen, tier) })

describe('chooseExactFill', () => {
  it('takes two fresh 3-sets over a fresh 4-set plus a seen 2-set (the Announcement repeat)', () => {
    // Rank order as orderGroups emits it: unseen first, then seen.
    expect(chooseExactFill([S(4), S(3), S(3), S(2, true)], 6)).toEqual([1, 2])
  })

  it('reduces to the greedy rank-order fill when every set is equally fresh', () => {
    // Greedy: take 4, skip 3, take 2 → [0, 2]. Same set count, so rank decides.
    expect(chooseExactFill([S(4), S(3), S(2), S(3)], 6)).toEqual([0, 2])
    expect(chooseExactFill([S(4, true), S(3, true), S(2, true), S(3, true)], 6)).toEqual([0, 2])
  })

  it('among equally fresh fills, keeps the small filler sets (2+2+2 loses to 2+4)', () => {
    expect(chooseExactFill([S(2), S(2), S(2), S(4)], 6)).toEqual([0, 3])
  })

  it('finds an exact fill the greedy pass strands (4+4 against 9 when a 5 exists)', () => {
    expect(chooseExactFill([S(4), S(4), S(5)], 9)).toEqual([0, 2])
  })

  it('returns null when no subset fills the quota exactly', () => {
    expect(chooseExactFill([S(4), S(4)], 6)).toBeNull()
    expect(chooseExactFill([S(12)], 10)).toBeNull()
  })

  it('returns [] for a zero quota', () => {
    expect(chooseExactFill([S(2)], 0)).toEqual([])
  })
})

describe('band rule', () => {
  const hard = new Set(['medium', 'hard'])
  it('classifies sets as in / adjacent / cross by their share of in-band items', () => {
    expect(bandTier(['hard', 'easy'], hard)).toBe('in')
    expect(bandTier(['hard', 'easy', 'easy'], hard)).toBe('adjacent')
    expect(bandTier(['easy', 'easy'], hard)).toBe('cross')
    expect(bandTier(['easy', null], null)).toBe('in')
  })

  it('freshness beats in-band, but a seen in-route set beats an unseen cross-route set', () => {
    expect(setScore(3, false, 'adjacent')).toBeGreaterThan(setScore(3, true, 'in'))
    expect(setScore(2, true, 'in')).toBeGreaterThan(setScore(2, false, 'cross'))
    expect(setScore(4, false, 'in')).toBeGreaterThan(setScore(4, false, 'adjacent'))
  })
})

// ── Through the real assembler ─────────────────────────────────────────

type Row = { id: string; item_type: string; difficulty: string; item: Record<string, unknown> }
function set(prefix: string, task: string, diffs: string[]): Row[] {
  return diffs.map((d, i) => ({
    id: `${prefix}-${i}`,
    item_type: 'multiple_choice',
    difficulty: d,
    item: {
      prompt: `${prefix} Q${i}`, type: 'multiple_choice', choices: ['A', 'B', 'C', 'D'],
      correct_answer: 'A', difficulty: d, explanation: '', passage: `P ${prefix}`,
      passageGroupId: prefix, listeningTask: task,
    },
  }))
}
const many = (n: number, f: (i: number) => Row[]) => Array.from({ length: n }, (_, i) => f(i)).flat()
const singles = (task: string, n: number, d: string) => many(n, i => set(`${task}${i}`, task, [d]).map(r => ({ ...r, item: { ...r.item, passageGroupId: null } })))

async function drawM2(bank: Row[], seenIds: string[], path: 'lower' | 'upper', difficulties: Array<'easy' | 'medium' | 'hard'>, seed: string) {
  const enqueue = tableRouter(fromMock)
  enqueue('study_item_bank', { data: bank, count: bank.length })
  enqueue('study_item_exposures', { data: seenIds.map(id => ({ item_id: id, seen_at: '2026-01-01T00:00:00Z', session_id: null })) })
  const t = await assembleToeflFromBank({ section: 'listening', module: 2, path, difficulties, studentId: 's1' }, seed)
  return t.questions as unknown as Array<{ passageGroupId?: string | null; listeningTask?: string }>
}
const groupsOf = (qs: Array<{ passageGroupId?: string | null; listeningTask?: string }>, task: string) =>
  [...new Set(qs.filter(q => q.listeningTask === task).map(q => q.passageGroupId))]

describe('assembleToeflFromBank module 2 (listening)', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => jest.restoreAllMocks())

  it('lower path: fills Announcement (6) from fresh sets while a fresh exact fill exists, on every seed', async () => {
    // Fresh: five 4-sets and two 3-sets. Seen: three 2-sets. Only 3+3 is
    // an all-fresh 6; a 4-set needs a (seen) 2-set beside it.
    const ann = [
      ...many(5, i => set(`a4-${i}`, 'announcement', ['easy', 'easy', 'easy', 'easy'])),
      ...many(2, i => set(`a3-${i}`, 'announcement', ['easy', 'easy', 'easy'])),
      ...many(3, i => set(`a2-${i}`, 'announcement', ['easy', 'easy'])),
    ]
    const seen = ann.filter(r => r.id.startsWith('a2-')).map(r => r.id)
    const bank = [
      ...singles('choose_response', 20, 'easy'),
      ...many(4, i => set(`c3-${i}`, 'conversation', ['easy', 'easy', 'easy'])),
      ...ann,
    ]
    for (const seed of ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']) {
      const qs = await drawM2(bank, seen, 'lower', ['easy', 'medium'], seed)
      const g = groupsOf(qs, 'announcement')
      expect(qs.filter(q => q.listeningTask === 'announcement')).toHaveLength(6)
      expect(g.sort()).toEqual(['a3-0', 'a3-1'])
    }
  })

  const upperFill = [
    ...singles('choose_response', 6, 'hard'),
    ...many(3, i => set(`t4-${i}`, 'academic_talk', ['hard', 'hard', 'hard', 'hard'])),
  ]

  it('upper/hard: an unseen set straddling the band beats a seen in-band set', async () => {
    const inSeen = many(3, i => set(`in-${i}`, 'conversation', ['hard', 'hard']))
    const adj = many(2, i => set(`adj-${i}`, 'conversation', ['hard', 'easy', 'easy']))
    const cross = many(3, i => set(`x-${i}`, 'conversation', ['easy', 'easy']))
    const bank = [...upperFill, ...inSeen, ...adj, ...cross]
    for (const seed of ['s1', 's2', 's3']) {
      const qs = await drawM2(bank, inSeen.map(r => r.id), 'upper', ['medium', 'hard'], seed)
      expect(groupsOf(qs, 'conversation').sort()).toEqual(['adj-0', 'adj-1'])
    }
  })

  it('upper/hard: never crosses the route to avoid a repeat — seen in-band sets beat unseen all-easy sets', async () => {
    const inSeen = many(3, i => set(`in-${i}`, 'conversation', ['hard', 'hard']))
    const cross = many(3, i => set(`x-${i}`, 'conversation', ['easy', 'easy']))
    const bank = [...upperFill, ...inSeen, ...cross]
    const qs = await drawM2(bank, inSeen.map(r => r.id), 'upper', ['medium', 'hard'], 's1')
    expect(groupsOf(qs, 'conversation').sort()).toEqual(['in-0', 'in-1', 'in-2'])
  })

  it('upper/hard: cross-route sets remain the last resort when nothing else fills the quota', async () => {
    const inBand = set('in-0', 'conversation', ['hard', 'hard'])
    const cross = many(3, i => set(`x-${i}`, 'conversation', ['easy', 'easy']))
    const qs = await drawM2([...upperFill, ...inBand, ...cross], [], 'upper', ['medium', 'hard'], 's1')
    const g = groupsOf(qs, 'conversation')
    expect(qs.filter(q => q.listeningTask === 'conversation')).toHaveLength(6)
    expect(g).toContain('in-0')
  })
})

describe('assembleToeflFromBank bank read', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}))
  afterEach(() => jest.restoreAllMocks())

  it('pages past 1000 rows on a total order and asserts the count', async () => {
    const enqueue = tableRouter(fromMock)
    const bank = singles('choose_response', 1100, 'easy')
    const p1 = enqueue('study_item_bank', { data: bank.slice(0, 1000), count: 1100 })
    const p2 = enqueue('study_item_bank', { data: bank.slice(1000) })
    await assembleToeflFromBank({ section: 'listening' }, 'seed')
    expect(p1.range).toHaveBeenCalledWith(0, 999)
    expect(p2.range).toHaveBeenCalledWith(1000, 1999)
    expect(p1.order).toHaveBeenCalledWith('id', { ascending: true })
  })

  it('throws when the rows read disagree with the bank count', async () => {
    const enqueue = tableRouter(fromMock)
    enqueue('study_item_bank', { data: singles('choose_response', 10, 'easy'), count: 11 })
    await expect(assembleToeflFromBank({ section: 'listening' }, 'seed')).rejects.toThrow(/bank count says 11/)
  })
})
