/** @jest-environment node */
/**
 * Every assembler must read the WHOLE bank section. assembleFromBank read
 * SAT in one unpaged query and PostgREST capped it at 1000 rows: SAT Math
 * served 1,000 of 1,364, R&W 1,000 of 1,117 (BANK-INTEGRITY-2026-10-04).
 *
 * The fake enforces the server's cap the way PostgREST does — no range
 * means the first 1000 rows in table order, and no page is ever larger
 * than 1000 — so an unpaged read FAILS here rather than passing on an
 * uncapped mock. The 364 rows past the cap are the only HARD rows, so a
 * hard-route draw that never sees them serves zero hard items.
 */
import { assembleFromBank } from '@/lib/study/assemble'
import { readBankPaged } from '@/lib/study/bank-read'
import { dbAdmin } from '@/lib/supabase-admin'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))
const fromMock = dbAdmin.from as unknown as jest.Mock

const CAP = 1000
type Row = { id: string; domain: string; difficulty: string; item: unknown }
const DOMAINS = ['Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Geometry and Trigonometry']

function bank(n: number, hardFrom: number): Row[] {
  return Array.from({ length: n }, (_, i) => {
    const difficulty = i >= hardFrom ? 'hard' : 'medium'
    return {
      id: `m-${String(i).padStart(5, '0')}`,
      domain: DOMAINS[i % DOMAINS.length],
      difficulty,
      item: { prompt: `Q${i}`, type: 'multiple_choice', choices: ['1', '2', '3', '4'], correct_answer: '1', difficulty, explanation: '' },
    }
  })
}

/** PostgREST-shaped fake: capped pages, honours order('id') and count. */
function cappedBank(rows: Row[], opts: { duplicatePage?: boolean; countOverride?: number } = {}) {
  const calls: Array<{ range: [number, number] | null; ordered: boolean }> = []
  fromMock.mockImplementation((table: string) => {
    if (table !== 'study_item_bank') throw new Error(`unexpected table ${table}`)
    let wantsCount = false
    let ordered = false
    let range: [number, number] | null = null
    const b: Record<string, unknown> = {}
    b.select = (_c: string, o?: { count?: string }) => { wantsCount = o?.count === 'exact'; return b }
    b.eq = () => b
    b.in = () => b
    b.order = (col: string) => { if (col === 'id') ordered = true; return b }
    b.range = (f: number, t: number) => { range = [f, t]; return b }
    b.then = (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => {
      calls.push({ range, ordered })
      const sorted = ordered ? [...rows].sort((a, c) => a.id.localeCompare(c.id)) : rows
      const [f0, t] = range ?? [0, CAP - 1]
      let f = f0
      if (opts.duplicatePage && f > 0) f -= 1
      const page = sorted.slice(f, Math.min(t + 1, f + CAP))
      return Promise.resolve({
        data: page, error: null,
        count: wantsCount ? (opts.countOverride ?? rows.length) : null,
      }).then(ok, bad)
    }
    return b
  })
  return calls
}

beforeEach(() => fromMock.mockReset())

describe('assembleFromBank reads past the 1000-row cap', () => {
  it('considers all 1,364 SAT Math rows: a hard draw reaches the 364 hard rows beyond the cap', async () => {
    const calls = cappedBank(bank(1364, 1000))
    const t = await assembleFromBank({ family: 'sat', section: 'math', count: 44, difficulties: ['hard'] }, 'seed-1')
    expect(t.questions).toHaveLength(44)
    const hard = t.questions.filter(q => (q as { difficulty?: string }).difficulty === 'hard').length
    expect(hard).toBe(44)
    expect(calls.length).toBe(2)
    expect(calls.every(c => c.ordered && c.range)).toBe(true)
  })

  it('throws rather than drawing from a subset when the read comes up short of the count', async () => {
    cappedBank(bank(1364, 1000), { countOverride: 1500 })
    await expect(assembleFromBank({ family: 'sat', section: 'math', count: 44 }, 's'))
      .rejects.toThrow(/read 1364 rows, bank count says 1500/)
  })
})

describe('readBankPaged', () => {
  const build = (withCount: boolean) => dbAdmin.from('study_item_bank')
    .select('id', withCount ? { count: 'exact' } : undefined)

  it('reads an exact multiple of the page size without dropping or repeating a page', async () => {
    const calls = cappedBank(bank(2000, 0))
    const rows = await readBankPaged<Row>(build, 't')
    expect(rows).toHaveLength(2000)
    expect(new Set(rows.map(r => r.id)).size).toBe(2000)
    expect(calls).toHaveLength(3) // 1000, 1000, then the empty page that proves the end
  })

  it('rejects overlapping pages (paging not on a total order)', async () => {
    cappedBank(bank(1364, 0), { duplicatePage: true, countOverride: 1365 }) // count matches, ids do not
    await expect(readBankPaged<Row>(build, 't')).rejects.toThrow(/duplicate rows across pages/)
  })
})
