/** @jest-environment node */
/**
 * Pins the assembler defects found by scripts/study-bank/form-qc.ts on
 * 2026-10-04 (FORM-QC-2026-10-04.md). Each test was break-tested by
 * reverting its fix and watching it fail:
 *
 *  1. ACT passages served their questions in seeded hash order, not
 *     authored order.                                  -> inAuthoredOrder
 *  2. SSAT/ISEE reading shuffled ITEMS across the section, scattering every
 *     passage's questions.                             -> passagesInSeededOrder
 *  3. ACT Math ignored MATH_QUOTAS; ACT Reading/Science ignored their
 *     reporting-category ranges.                       -> pickByDomainQuota /
 *                                                         pickPassagesForSlots
 *
 * (The same audit's top finding — the unpaged SAT read — was fixed in
 * parallel by 963f7245 and is pinned by bank-read-paging.test.ts.)
 *
 * The mock serves rows in insertion order = AUTHORED order, which is what
 * readBankPaged's created_at prefix delivers in production.
 */
type MockRow = Record<string, unknown> & { id: string; family: string; section: string }
const mockBank: MockRow[] = []

jest.mock('@/lib/supabase-admin', () => {
  const PG_CAP = 1000
  const from = () => {
    const filters: Record<string, unknown> = {}
    let range: [number, number] | null = null
    const orderBy: string[] = []
    const b: Record<string, unknown> = {}
    b.select = () => b
    b.eq = (k: string, v: unknown) => { filters[k] = v; return b }
    // Honour the requested order, as PostgREST does — the authored-order
    // fixes depend on the created_at prefix, and ids below are deliberately
    // NOT in authored order, so dropping that prefix is visible.
    b.order = (col: string) => { orderBy.push(col); return b }
    b.range = (f: number, t: number) => { range = [f, t]; return b }
    b.then = (res: (v: unknown) => unknown) => {
      const rows = mockBank.filter(r => r.family === filters.family && r.section === filters.section)
        .sort((x, y) => { for (const c of orderBy) { const d = String(x[c] ?? '').localeCompare(String(y[c] ?? '')); if (d) return d } return 0 })
      // An unpaged read is capped exactly as PostgREST caps it.
      const page = range ? rows.slice(range[0], Math.min(range[1] + 1, range[0] + PG_CAP)) : rows.slice(0, PG_CAP)
      return res({ data: page, error: null, count: rows.length })
    }
    return b
  }
  return { dbAdmin: { from } }
})

import {
  assembleActSection, assembleAdmissionSection,
  pickByDomainQuota, pickPassagesForSlots, passagesInSeededOrder,
} from '../assemble'
import { MATH_QUOTAS, READING_QUOTAS, SCIENCE_QUOTAS } from '../act-test'

const item = (prompt: string, extra: Record<string, unknown> = {}) => ({
  type: 'multiple_choice', prompt, choices: ['a', 'b', 'c', 'd'], correct_answer: 'a', explanation: 'x', difficulty: 'medium', ...extra,
})
const bankId = (q: unknown) => (q as { bankItemId: string }).bankItemId
const counts = (n: number, q: Readonly<Record<string, readonly [number, number]>>) =>
  Object.fromEntries(Object.entries(q).map(([d, [lo, hi]]) => [d, [Math.ceil(lo * n / 100 - 1e-9), Math.floor(hi * n / 100 + 1e-9)]]))
const inRanges = (doms: Array<string | null | undefined>, q: Readonly<Record<string, readonly [number, number]>>) => {
  const want = counts(doms.length, q)
  return Object.entries(want).every(([d, [lo, hi]]) => { const c = doms.filter(x => x === d).length; return c >= lo && c <= hi })
}

beforeEach(() => { mockBank.length = 0; jest.spyOn(console, 'warn').mockImplementation(() => {}) })
afterEach(() => jest.restoreAllMocks())

/** Push one passage group in AUTHORED order (bank order = created_at, id). */
let clock = 0
function pushPassage(family: string, section: string, gid: string, task: string, domains: string[]) {
  domains.forEach((domain, k) => mockBank.push({
    // id suffix runs BACKWARDS against authoring, so id order != authored order
    id: `${gid}-${String(99 - k).padStart(2, '0')}`, created_at: new Date(Date.UTC(2026, 0, 1) + ++clock * 1000).toISOString(),
    family, section, domain, task, difficulty: 'medium', passage_group_id: gid,
    item: item(`${gid} question ${k}`, { passage: `passage ${gid}`, passageGroupId: gid }),
  }))
}
const authoredIndex = () => new Map(mockBank.map((r, i) => [r.id, i]))
/** Every passage contiguous, and inside it the questions in bank order. */
function passageShape(ids: string[]) {
  const pos = authoredIndex()
  const gid = (id: string) => id.replace(/-\d+$/, '')
  const runs: string[][] = []
  for (const id of ids) {
    if (runs.length && gid(runs[runs.length - 1]![0]!) === gid(id)) runs[runs.length - 1]!.push(id)
    else runs.push([id])
  }
  const contiguous = new Set(runs.map(r => gid(r[0]!))).size === runs.length
  const authored = runs.every(r => r.every((id, i) => i === 0 || pos.get(id)! > pos.get(r[i - 1]!)!))
  return { contiguous, authored, runs: runs.length }
}

describe('ACT passages keep authored question order (1)', () => {
  const CSE = 'Conventions of Standard English', POW = 'Production of Writing', KOL = 'Knowledge of Language'
  it.each(['s1', 's2', 's3', 's4'])('English seed %s: five passages, each in authored order', async seed => {
    // CSE 6 / PoW 3 / KoL 1 passages: five of them land at 30/15/5 = inside ENGLISH_QUOTAS.
    for (let g = 0; g < 7; g++) pushPassage('act', 'english', `e${g}`, 'multiple_choice', [CSE, CSE, CSE, CSE, CSE, CSE, POW, POW, POW, KOL])
    const t = await assembleActSection({ sectionKey: 'english' }, seed)
    const shape = passageShape(t.questions.map(bankId))
    expect(t.questions).toHaveLength(50)
    expect(shape).toEqual({ contiguous: true, authored: true, runs: 5 })
  })

  it.each(['s1', 's2', 's3'])('Reading seed %s: four genre passages, each in authored order', async seed => {
    const KID = 'Key Ideas and Details', CS = 'Craft and Structure', IKI = 'Integration of Knowledge and Ideas'
    for (const genre of ['literary_narrative', 'social_science', 'humanities', 'natural_science']) {
      for (let g = 0; g < 2; g++) pushPassage('act', 'reading', `${genre}-${g}`, genre, [KID, KID, KID, KID, CS, CS, CS, IKI, IKI])
    }
    const t = await assembleActSection({ sectionKey: 'reading' }, seed)
    expect(t.questions).toHaveLength(36)
    expect(passageShape(t.questions.map(bankId))).toEqual({ contiguous: true, authored: true, runs: 4 })
  })
})

describe('SSAT/ISEE reading keeps passages together (2)', () => {
  it.each(['s1', 's2', 's3'])('seed %s: 7 contiguous passages in authored order', async seed => {
    for (let g = 0; g < 9; g++) pushPassage('ssat', 'reading', `r${g}`, 'reading', Array(6).fill('Reading Comprehension'))
    const t = await assembleAdmissionSection({ family: 'ssat', sectionKey: 'reading' }, seed)
    expect(t.questions).toHaveLength(40)
    expect(passageShape(t.questions.map(bankId))).toEqual({ contiguous: true, authored: true, runs: 7 })
  })

  it('passagesInSeededOrder shuffles passages, never the questions inside one', () => {
    const rows = ['a', 'b', 'c'].flatMap(g => [0, 1, 2].map(k => ({ id: `${g}${k}`, passageGroupId: g })))
    const authored = new Map(rows.map((r, i) => [r.id, i]))
    const out = passagesInSeededOrder([...rows].reverse(), authored, 'seed').map(r => r.id).join(' ')
    expect(out).toMatch(/^(?:(a0 a1 a2|b0 b1 b2|c0 c1 c2) ?){3}$/)
  })
})

describe('ACT reporting-category ranges enter the draw (3)', () => {
  const MD = Object.keys(MATH_QUOTAS)
  it.each(['s1', 's2', 's3', 's4', 's5', 's6'])('Math seed %s lands inside MATH_QUOTAS', async seed => {
    // A bank lopsided toward one domain: an unweighted draw lands ~half Algebra.
    let i = 0
    for (const d of MD) for (let k = 0; k < (d === 'Algebra' ? 200 : 20); k++) mockBank.push({ id: `m${i++}`, family: 'act', section: 'math', domain: d, difficulty: 'medium', passage_group_id: null, item: item(`m${i}`) })
    const t = await assembleActSection({ sectionKey: 'math' }, seed)
    const byId = new Map(mockBank.map(r => [r.id, r.domain as string]))
    expect(t.questions).toHaveLength(45)
    expect(inRanges(t.questions.map(q => byId.get(bankId(q))), MATH_QUOTAS)).toBe(true)
  })

  it('pickByDomainQuota prefers rank order within a domain and still fills when the bank is thin', () => {
    const ranked = [
      ...Array.from({ length: 10 }, (_, k) => ({ id: `x${k}`, domain: 'X', passageGroupId: null })),
      ...Array.from({ length: 10 }, (_, k) => ({ id: `y${k}`, domain: 'Y', passageGroupId: null })),
    ]
    const ok = pickByDomainQuota(ranked, 10, { X: [40, 60], Y: [40, 60] })
    expect(ok.onBlueprint).toBe(true)
    expect(ok.picked.filter(r => r.domain === 'X').map(r => r.id)).toEqual(['x0', 'x1', 'x2', 'x3', 'x4', 'x5'].slice(0, ok.picked.filter(r => r.domain === 'X').length))
    const thin = pickByDomainQuota(ranked.slice(0, 12), 10, { X: [40, 60], Y: [40, 60] })
    expect(thin.picked).toHaveLength(10)
    expect(thin.onBlueprint).toBe(false)
  })

  it('Reading: skips the first-ranked passage set when it breaks the ranges', () => {
    const KID = 'Key Ideas and Details', CS = 'Craft and Structure', IKI = 'Integration of Knowledge and Ideas'
    const mk = (gid: string, task: string, d: string[]) => d.map((domain, k) => ({ id: `${gid}${k}`, item: {} as never, passageGroupId: gid, task, domain }))
    const genres = ['literary_narrative', 'social_science', 'humanities', 'natural_science']
    // first-ranked passage of each genre is all KID (36 KID = off-blueprint); the second is balanced.
    const ranked = [
      ...genres.flatMap(g => mk(`${g}-bad`, g, Array(9).fill(KID))),
      // 2 x (4/3/2) + 2 x (5/2/2) = KID 18, CS 10, IKI 8 of 36: inside 16-18 / 10-11 / 7-9
      ...genres.flatMap((g, i) => mk(`${g}-ok`, g, i < 2 ? [KID, KID, KID, KID, CS, CS, CS, IKI, IKI] : [KID, KID, KID, KID, KID, CS, CS, IKI, IKI])),
    ]
    const slots = genres.map(task => ({ task, per: 9 }))
    const r = pickPassagesForSlots(ranked, slots, READING_QUOTAS)
    expect(r.onBlueprint).toBe(true)
    expect(inRanges(r.passages.flatMap(g => g!.map(x => x.domain)), READING_QUOTAS)).toBe(true)
    // impossible bank -> plain exposure-order fill, flagged
    const bad = pickPassagesForSlots(genres.flatMap(g => mk(`${g}-bad`, g, Array(9).fill(KID))), slots, READING_QUOTAS)
    expect(bad.onBlueprint).toBe(false)
    expect(bad.passages.every(Boolean)).toBe(true)
  })

  it('Science: a missing format leaves its slot empty rather than back-filling another format', () => {
    const mk = (gid: string, task: string, n: number) => Array.from({ length: n }, (_, k) => ({ id: `${gid}${k}`, item: {} as never, passageGroupId: gid, task, domain: 'Interpretation of Data' }))
    const ranked = [...mk('dr1', 'data_representation', 5), ...mk('rs1', 'research_summaries', 6)]
    const r = pickPassagesForSlots(ranked, [{ task: 'data_representation', per: 5 }, { task: 'conflicting_viewpoints', per: 6 }], SCIENCE_QUOTAS)
    expect(r.passages[0]).not.toBeNull()
    expect(r.passages[1]).toBeNull()
  })
})
