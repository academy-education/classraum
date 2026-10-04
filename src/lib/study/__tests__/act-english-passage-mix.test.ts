/** @jest-environment node */
const mockRows: unknown[] = []
jest.mock('@/lib/supabase-admin', () => {
  const builder: Record<string, unknown> = {}
  builder.select = () => builder
  builder.eq = () => builder
  builder.order = () => builder
  builder.range = () => builder
  builder.then = (res: (v: unknown) => unknown) => res({ data: mockRows, error: null, count: mockRows.length })
  return { dbAdmin: { from: () => builder } }
})

import { pickEnglishPassages, assembleActSection } from '../assemble'
import { ENGLISH_QUOTAS } from '../act-test'

/*
 * REGISTER §5 A63. Every live ACT English passage was CSE 4 / KoL 2 / PoW 4,
 * so every drawn form was 40% Conventions against a 51% floor. act-english-v7
 * adds CSE 7 / PoW 2 / KoL 1 passages; a compliant form is then exactly three
 * old + two new. These tests pin that the DRAW finds that form — the old
 * draw took the first five passages in exposure order and never looked.
 *
 * The fixture ranks all fifteen old passages FIRST, which is the realistic
 * worst case (exposure order is a seeded shuffle and does not know domains):
 * a domain-blind draw takes five old passages and delivers 20/50 CSE.
 */
const CSE = 'Conventions of Standard English'
const POW = 'Production of Writing'
const KOL = 'Knowledge of Language'

function passage(id: string, cse: number, pow: number, kol: number) {
  const doms = [...Array(cse).fill(CSE), ...Array(pow).fill(POW), ...Array(kol).fill(KOL)]
  return doms.map((domain, i) => ({
    id: `${id}-${i}`, passageGroupId: id, task: 'multiple_choice', domain,
    item: { type: 'multiple_choice', question: 'q', options: ['a', 'b', 'c', 'd'], correctAnswer: 'a' } as never,
  }))
}
const OLD = Array.from({ length: 15 }, (_, i) => passage(`old${i}`, 4, 4, 2))
const NEW = Array.from({ length: 10 }, (_, i) => passage(`new${i}`, 7, 2, 1))

function shares(rows: { domain?: string | null }[]) {
  const c: Record<string, number> = {}
  for (const r of rows) c[r.domain ?? ''] = (c[r.domain ?? ''] ?? 0) + 1
  return c
}
function inBlueprint(rows: { domain?: string | null }[]) {
  const c = shares(rows)
  return Object.entries(ENGLISH_QUOTAS).every(([d, [lo, hi]]) => {
    const pct = 100 * (c[d] ?? 0) / rows.length
    return pct >= lo && pct <= hi
  })
}

describe('ACT English passage selection respects ENGLISH_QUOTAS', () => {
  it('draws a compliant form when the bank can make one, even with every old passage ranked first', () => {
    const ranked = [...OLD, ...NEW].flat()
    const { passages, onBlueprint } = pickEnglishPassages(ranked)
    const rows = passages.flat()
    expect(onBlueprint).toBe(true)
    expect(passages).toHaveLength(5)
    expect(rows).toHaveLength(50)
    expect(shares(rows)).toEqual({ [CSE]: 26, [POW]: 16, [KOL]: 8 })
    expect(inBlueprint(rows)).toBe(true)
  })

  it('serves five disjoint compliant forms from 15 old + 10 new — the 3 -> 5 forms the batch was sized for', () => {
    let pool = [...OLD, ...NEW].flat()
    const seen = new Set<string>()
    for (let form = 0; form < 5; form++) {
      const { passages, onBlueprint } = pickEnglishPassages(pool)
      expect(onBlueprint).toBe(true)
      expect(inBlueprint(passages.flat())).toBe(true)
      for (const g of passages) {
        const id = g[0].passageGroupId as string
        expect(seen.has(id)).toBe(false)
        seen.add(id)
      }
      pool = pool.filter(r => !seen.has(r.passageGroupId as string))
    }
    expect(seen.size).toBe(25)
  })

  it('keeps exposure order among compliant sets: the earliest-ranked feasible passages win', () => {
    const ranked = [...OLD, ...NEW].flat()
    const ids = pickEnglishPassages(ranked).passages.map(g => g[0].passageGroupId)
    expect(ids).toEqual(['old0', 'old1', 'old2', 'new0', 'new1'])
  })

  it('falls back to a full, flagged, exposure-order form when no compliant set exists (never SHORT)', () => {
    const ranked = OLD.flat()
    const { passages, onBlueprint } = pickEnglishPassages(ranked)
    expect(onBlueprint).toBe(false)
    expect(passages.flat()).toHaveLength(50)
    expect(passages.map(g => g[0].passageGroupId)).toEqual(['old0', 'old1', 'old2', 'old3', 'old4'])
  })

  // Production of Writing is the one ceiling a form can break while every
  // floor holds (26/17/7: floors sum to 48 of 50, and only PoW has room to
  // overshoot). These five, ranked first, are exactly that form.
  it('never buys the floors by breaking a ceiling', () => {
    const over = [passage('o1', 5, 4, 1), passage('o2', 5, 4, 1), passage('o3', 5, 3, 2), passage('o4', 6, 3, 1), passage('o5', 5, 3, 2)]
    const ranked = [...over, ...OLD, ...NEW].flat()
    const { passages, onBlueprint } = pickEnglishPassages(ranked)
    expect(onBlueprint).toBe(true)
    const c = shares(passages.flat())
    expect(c[POW]).toBeLessThanOrEqual(16)
    expect(inBlueprint(passages.flat())).toBe(true)
  })

  it('ignores partial passages', () => {
    const partial = passage('short', 9, 0, 0)
    const ranked = [...partial, ...OLD, ...NEW].flat()
    const ids = pickEnglishPassages(ranked).passages.map(g => g[0].passageGroupId)
    expect(ids).not.toContain('short')
  })
})

describe('assembleActSection wires the quota-aware pick into the live English draw', () => {
  beforeAll(() => {
    mockRows.length = 0
    for (const g of [...OLD, ...NEW]) for (const r of g) {
      mockRows.push({
        id: r.id, difficulty: 'medium', passage_group_id: r.passageGroupId, task: 'multiple_choice', domain: r.domain,
        item: { type: 'multiple_choice', prompt: `[${r.domain}] ${r.id}`, choices: ['a', 'b', 'c', 'd'], correct_answer: 'a', difficulty: 'medium' },
      })
    }
  })

  it.each(['s1', 's2', 's3', 's4', 's5', 's6'])('seed %s delivers 50 items inside every published range', async seed => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const t = await assembleActSection({ sectionKey: 'english' }, seed)
    warn.mockRestore()
    const doms = t.questions.map(q => String((q as { prompt?: string; question?: string }).prompt ?? (q as { question?: string }).question).match(/^\[([^\]]+)\]/)?.[1] ?? '')
    expect(doms).toHaveLength(50)
    expect(inBlueprint(doms.map(domain => ({ domain })))).toBe(true)
  })
})
