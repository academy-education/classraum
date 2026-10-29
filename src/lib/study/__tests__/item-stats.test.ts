import { computeItemStats, type AttemptRow, type ItemMeta } from '@/lib/study/item-stats'

/*
 * Fixture: 40 real students, each in their own session, answering a GOOD item, a BAD item and
 * eight filler items that set their ability. Students 0-19 are strong (fillers right), 20-39 weak.
 *  - GOOD: strong students pick the key, weak students split across distractors.
 *  - BAD:  strong students pick distractor "X" (a second defensible option they all read the same
 *          way); weak students pick the key. Distractor beats key in the top group.
 */
const CHOICES = ['K', 'X', 'Y', 'Z']
function meta(id: string, section = 'test/reading', hasPassage = false): ItemMeta {
  return { id, section, key: 'K', choices: CHOICES, hasPassage }
}
const t0 = Date.parse('2026-10-29T00:00:00Z')
const at = (i: number) => new Date(t0 + i * 1000).toISOString()

function fixture(students = 40): { attempts: AttemptRow[]; items: Map<string, ItemMeta> } {
  const items = new Map<string, ItemMeta>()
  for (const id of ['good', 'bad', ...Array.from({ length: 8 }, (_, i) => `f${i}`)]) items.set(id, meta(id))
  const attempts: AttemptRow[] = []
  let clock = 0
  for (let s = 0; s < students; s++) {
    const strong = s < students / 2
    const base = { studentId: `stu${s}`, sessionId: `ses${s}`, timeSec: 30 }
    for (let f = 0; f < 8; f++) {
      const right = strong ? true : f < 2
      attempts.push({ ...base, itemId: `f${f}`, answer: right ? 'K' : 'Y', isCorrect: right, createdAt: at(clock++) })
    }
    attempts.push({ ...base, itemId: 'good', answer: strong ? 'K' : ['X', 'Y', 'Z', 'K'][s % 4], isCorrect: strong || s % 4 === 3, createdAt: at(clock++) })
    attempts.push({ ...base, itemId: 'bad', answer: strong ? 'X' : 'K', isCorrect: !strong, createdAt: at(clock++) })
  }
  return { attempts, items }
}
const codes = (r: ReturnType<typeof computeItemStats>, id: string) => r.items.find(i => i.itemId === id)!.flags.map(f => f.code)

describe('computeItemStats', () => {
  it('flags an item whose top group prefers a distractor, and not a good item', () => {
    const { attempts, items } = fixture()
    const r = computeItemStats(attempts, items, { excludedStudentIds: new Set() })
    expect(codes(r, 'bad')).toEqual(expect.arrayContaining(['top_below_bottom', 'distractor_beats_key_top', 'negative_discrimination']))
    expect(codes(r, 'good')).not.toEqual(expect.arrayContaining(['top_below_bottom']))
    expect(codes(r, 'good')).not.toContain('distractor_beats_key_top')
    expect(codes(r, 'good')).not.toContain('negative_discrimination')
    expect(r.items[0].itemId).toBe('bad') // highest severity first
  })

  it('drops internal/test accounts before computing anything, and counts them', () => {
    const { attempts, items } = fixture()
    // Mark every strong student internal: with them gone, "bad" has only weak students, all correct.
    const internal = new Set(Array.from({ length: 20 }, (_, s) => `stu${s}`))
    const r = computeItemStats(attempts, items, { excludedStudentIds: internal, minN: 10 })
    expect(r.studentsExcluded).toBe(20)
    expect(r.attemptsExcludedAccounts).toBe(200)
    expect(r.studentsCounted).toBe(20)
    const bad = r.items.find(i => i.itemId === 'bad')!
    expect(bad.n).toBe(20)
    expect(bad.pValue).toBe(1)
  })

  it('flags nothing below min-n, but still reports n', () => {
    const { attempts, items } = fixture(20)
    const r = computeItemStats(attempts, items, { excludedStudentIds: new Set() }) // default minN 30
    expect(r.minN).toBe(30)
    expect(r.itemsAtMinN).toBe(0)
    expect(r.items.every(i => i.flags.length === 0)).toBe(true)
    expect(r.items.find(i => i.itemId === 'bad')!.n).toBe(20)
  })

  it('counts only the first attempt per student and item', () => {
    const { attempts, items } = fixture()
    // Every strong student retries "bad" later and gets it right — must be ignored.
    const retries = Array.from({ length: 20 }, (_, s): AttemptRow => ({
      itemId: 'bad', studentId: `stu${s}`, sessionId: `retry${s}`, answer: 'K', isCorrect: true, timeSec: 30, createdAt: at(999999 + s),
    }))
    const r = computeItemStats([...attempts, ...retries], items, { excludedStudentIds: new Set() })
    expect(r.repeatAttemptsDropped).toBe(20)
    expect(r.items.find(i => i.itemId === 'bad')!.pValue).toBe(0.5)
    expect(codes(r, 'bad')).toContain('distractor_beats_key_top')
  })

  it('throws on empty or malformed input instead of returning a number', () => {
    expect(() => computeItemStats([], new Map(), { excludedStudentIds: new Set() })).toThrow(/no attempts/)
    const bad = [{ itemId: 'x', studentId: 's', sessionId: '', answer: 'K', isCorrect: true, timeSec: 1, createdAt: at(0) }]
    expect(() => computeItemStats(bad, new Map([['x', meta('x')]]), { excludedStudentIds: new Set() })).toThrow(/malformed/)
    expect(() => computeItemStats(fixture().attempts, fixture().items, {} as never)).toThrow(/excludedStudentIds/)
  })

  it('flags implausibly fast correct answers on passage items only', () => {
    const { attempts, items } = fixture()
    items.set('bad', meta('bad', 'test/reading', true))
    items.set('good', meta('good', 'test/reading', true))
    const fast = attempts.map(a => (a.itemId === 'good' && a.isCorrect ? { ...a, timeSec: 2 } : a))
    const r = computeItemStats(fast, items, { excludedStudentIds: new Set() })
    expect(codes(r, 'good')).toContain('fast_correct')
    expect(codes(r, 'f0')).not.toContain('fast_correct')
  })
})
