/** @jest-environment node */
/**
 * One difficulty per bank item, and it is the ROW column.
 *
 * `study_item_bank` stores difficulty twice — the row column and a copy in
 * `item` — and on 2026-10-04 the two disagreed on 1,450 live rows (TOEFL
 * 1,294; BANK-INTEGRITY-2026-10-04.md). Regrades wrote the column. Every draw
 * decision read the column, but readBankItem returned the copy, so the TOEFL
 * pilot picker ("the hardest items become unscored") chose pilots by the stale
 * label, and the practice chip / submitted snapshot showed it.
 *
 * Every fixture row here has the two copies DISAGREE, so a reader of the
 * wrong copy fails. The fake returns only the columns a query SELECTS (as
 * PostgREST does), so a read that forgets to select `difficulty` falls back
 * to the stale copy and fails too.
 */
import {
  assembleToeflFromBank, assembleFromBank, assembleFromItemIds, drawBankPractice, resolveBankDifficulty,
} from '@/lib/study/assemble'
import { dbAdmin } from '@/lib/supabase-admin'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))
const fromMock = dbAdmin.from as unknown as jest.Mock

type Band = 'easy' | 'medium' | 'hard'
type Row = Record<string, unknown> & { id: string }
const FLIP: Record<Band, Band> = { easy: 'hard', medium: 'easy', hard: 'easy' }

/** PostgREST-shaped fake: projects to the selected columns, honours range/count/in. */
function bank(rows: Row[]) {
  const selects: string[] = []
  fromMock.mockImplementation((table: string) => {
    if (table !== 'study_item_bank') throw new Error(`unexpected table ${table}`)
    let cols: string[] = []
    let wantsCount = false
    let range: [number, number] | null = null
    let ids: string[] | null = null
    const b: Record<string, unknown> = {}
    b.select = (c: string, o?: { count?: string }) => {
      cols = c.split(',').map(x => x.trim()); selects.push(c); wantsCount = o?.count === 'exact'; return b
    }
    b.eq = () => b
    b.order = () => b
    b.in = (col: string, v: string[]) => { if (col === 'id') ids = v; return b }
    b.range = (f: number, t: number) => { range = [f, t]; return b }
    b.then = (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => {
      let all = [...rows].sort((a, c) => a.id.localeCompare(c.id))
      if (ids) all = all.filter(r => ids!.includes(r.id))
      const [f, t] = range ?? [0, 999]
      const page = all.slice(f, Math.min(t + 1, f + 1000))
        .map(r => Object.fromEntries(cols.map(k => [k, r[k] ?? null])))
      return Promise.resolve({ data: page, error: null, count: wantsCount ? all.length : null }).then(ok, bad)
    }
    return b
  })
  return selects
}

const mc = (id: string, row: Band, extra: Record<string, unknown> = {}, itemExtra: Record<string, unknown> = {}): Row => ({
  id, difficulty: row, item_type: 'multiple_choice', section: 'math', domain: 'Algebra', created_at: '2026-01-01',
  item: {
    prompt: `${id}?`, type: 'multiple_choice', choices: ['A', 'B', 'C', 'D'], correct_answer: 'A',
    difficulty: FLIP[row], explanation: '', ...itemExtra,
  },
  ...extra,
})

beforeEach(() => {
  fromMock.mockReset()
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => jest.restoreAllMocks())

describe('resolveBankDifficulty', () => {
  it('the row column wins; the jsonb copy only fills an invalid column', () => {
    expect(resolveBankDifficulty('easy', 'hard')).toBe('easy')
    expect(resolveBankDifficulty(null, 'hard')).toBe('hard')
    expect(resolveBankDifficulty('bogus', 'medium')).toBe('medium')
    expect(resolveBankDifficulty(null, undefined)).toBeNull()
  })
})

describe('TOEFL: pilots are the hardest by the ROW column', () => {
  it('module 1 Listening pilots every row-hard item before any row-easy one, and serves the row band', async () => {
    // 20 row-hard (copy says easy) + 20 row-easy (copy says hard) Choose a Response items.
    // Interleaved ids, so whichever slice the seeded draw takes holds both bands.
    const cr = Array.from({ length: 40 }, (_, i) => {
      const band: Band = i % 2 ? 'hard' : 'easy'
      return mc(`cr-${String(i).padStart(2, '0')}`, band, {}, { listeningTask: 'choose_response' })
    })
    const sets = (prefix: string, task: string, groups: number, size: number) =>
      Array.from({ length: groups }, (_, g) => Array.from({ length: size }, (_, i) =>
        mc(`${prefix}-${g}-${i}`, 'medium', {}, { listeningTask: task, passage: `P ${prefix}-${g}`, passageGroupId: `${prefix}-${g}` }))).flat()
    const rows = [...cr, ...sets('conv', 'conversation', 6, 4), ...sets('ann', 'announcement', 6, 4), ...sets('talk', 'academic_talk', 12, 4)]
    const selects = bank(rows)

    const t = await assembleToeflFromBank({ section: 'listening', module: 1 }, 'seed-diff')
    expect(selects.some(s => /\bdifficulty\b/.test(s))).toBe(true)

    const rowBand = new Map(rows.map(r => [`${r.id}?`, r.difficulty as Band]))
    // Served difficulty is the row's, for every question.
    for (const q of t.questions) expect(q.difficulty).toBe(rowBand.get(q.prompt))

    const crServed = t.questions.filter(q => q.prompt.startsWith('cr-'))
    const pilots = crServed.filter(q => q.scored === false)
    const scored = crServed.filter(q => q.scored !== false)
    // The fixture must actually exercise the ordering: both bands served, some pilots, some scored.
    expect(pilots.length).toBeGreaterThan(0)
    expect(scored.length).toBeGreaterThan(0)
    const isHard = (q: { prompt: string }) => rowBand.get(q.prompt) === 'hard'
    expect(crServed.some(isHard)).toBe(true)
    expect(crServed.some(q => !isHard(q))).toBe(true)
    // Hardest first: no row-easy pilot while a row-hard item is scored.
    const easyPilot = pilots.some(q => !isHard(q))
    const hardScored = scored.some(isHard)
    expect(easyPilot && hardScored).toBe(false)
  })
})

describe('practice and SAT draws serve the row band', () => {
  it('drawBankPractice selects the column and returns it as the chip difficulty', async () => {
    const rows = Array.from({ length: 6 }, (_, i) => mc(`p-${i}`, i % 2 ? 'hard' : 'easy'))
    const selects = bank(rows)
    const qs = await drawBankPractice({ section: 'math', count: 6, seed: 's' })
    expect(selects[0]).toMatch(/\bdifficulty\b/)
    const band = new Map(rows.map(r => [`${r.id}?`, r.difficulty]))
    expect(qs).toHaveLength(6)
    for (const q of qs) expect(q.difficulty).toBe(band.get(q.prompt))
  })

  it('assembleFromBank hard route: every served question carries the row band it was drawn on', async () => {
    const rows = Array.from({ length: 40 }, (_, i) => mc(`s-${String(i).padStart(2, '0')}`, i < 20 ? 'hard' : 'medium', {
      domain: ['Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Geometry and Trigonometry'][i % 4],
    }))
    bank(rows)
    const t = await assembleFromBank({ family: 'sat', section: 'math', count: 12, difficulties: ['hard'] }, 'seed')
    expect(t.questions).toHaveLength(12)
    for (const q of t.questions) expect(q.difficulty).toBe('hard')
  })

  it('a null row column falls back to the jsonb copy for the draw AND the question alike', async () => {
    // 8 rows with a null column whose copy says easy, 8 medium rows (copy says easy too, via FLIP).
    // An easy-band draw must take the 8 null-column rows: they ARE easy once resolved. The old
    // `row.difficulty ?? 'medium'` ranked them medium while the Question said easy.
    const rows = [
      ...Array.from({ length: 8 }, (_, i) => mc(`n-${i}`, 'medium', { difficulty: null }, { difficulty: 'easy' })),
      ...Array.from({ length: 8 }, (_, i) => mc(`m-${i}`, 'medium', {}, { difficulty: 'hard' })),
    ]
    bank(rows)
    const t = await assembleFromBank({ family: 'sat', section: 'math', count: 4, difficulties: ['easy'] }, 'seed')
    expect(t.questions).toHaveLength(4)
    for (const q of t.questions) { expect(q.prompt).toMatch(/^n-/); expect(q.difficulty).toBe('easy') }
  })

  it('assembleFromItemIds (assignments/camp) selects the column', async () => {
    const rows = [mc('c-1', 'easy'), mc('c-2', 'hard')]
    const selects = bank(rows)
    const t = await assembleFromItemIds({ itemIds: ['c-1', 'c-2'], title: 'T', family: 'sat' })
    expect(selects[0]).toMatch(/\bdifficulty\b/)
    expect(t.questions.map(q => q.difficulty)).toEqual(['easy', 'hard'])
  })
})
