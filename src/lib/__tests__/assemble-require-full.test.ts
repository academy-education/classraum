/** @jest-environment node */
/**
 * "Block short tests" (2026-10-04), at the assembler: with `requireFull`
 * a draw the bank cannot fill to its blueprint count THROWS
 * SectionShortError — and throws BEFORE the exposure write, so a refused
 * start never marks unseen items as seen. Without the flag every
 * assembler behaves exactly as before (practice, camp and free path stops
 * still tolerate a short draw).
 *
 * Every family's fixture is exactly ONE item short of its blueprint — the
 * marginal case, not a blowout — next to the same bank with that item
 * back, so each test fails if the comparison is off by one either way.
 */
import { assembleFromBank, assembleToeflFromBank, assembleAdmissionSection, assembleActSection } from '@/lib/study/assemble'
import { SectionShortError } from '@/lib/study/section-availability'
import { dbAdmin } from '@/lib/supabase-admin'
import { tableRouter } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))

const fromMock = dbAdmin.from as unknown as jest.Mock

const mcItem = (id: string, extra: Record<string, unknown> = {}) => ({
  prompt: `Q ${id}`, type: 'multiple_choice', choices: ['A', 'B', 'C', 'D'], correct_answer: 'A',
  difficulty: 'medium', explanation: '', ...extra,
})

function satRows(n: number) {
  const domains = ['Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Geometry and Trigonometry']
  return Array.from({ length: n }, (_, i) => ({
    id: `sat-${i}`, domain: domains[i % 4], difficulty: 'medium', item: mcItem(`sat-${i}`),
  }))
}
/** Ungrouped bank rows (SSAT/ISEE/ACT math draw one item per group). */
function flatRows(prefix: string, n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-${i}`, difficulty: 'medium', item: mcItem(`${prefix}-${i}`),
    passage_group_id: null, task: null, domain: null,
  }))
}
function choose(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `cr-${i}`, item_type: 'multiple_choice', difficulty: 'hard',
    item: mcItem(`cr-${i}`, { listeningTask: 'choose_response', difficulty: 'hard' }),
  }))
}
function sets(task: string, groups: number, size: number, prefix = task) {
  return Array.from({ length: groups }, (_, g) => Array.from({ length: size }, (_, i) => ({
    id: `${prefix}-${g}-${i}`, item_type: 'multiple_choice', difficulty: 'hard',
    item: mcItem(`${prefix}-${g}-${i}`, {
      listeningTask: task, difficulty: 'hard', passage: `P ${prefix}-${g}`, passageGroupId: `${prefix}-${g}`,
    }),
  }))).flat()
}

/** Every chain the code under test opened, so "no exposure write" is checkable. */
function upsertsOn(table: string): number {
  return fromMock.mock.calls
    .map((c, i) => ({ table: c[0] as string, chain: fromMock.mock.results[i]?.value as { upsert: jest.Mock } }))
    .filter(x => x.table === table)
    .reduce((n, x) => n + x.chain.upsert.mock.calls.length, 0)
}

let enqueue: ReturnType<typeof tableRouter>
beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  enqueue = tableRouter(fromMock)
})
afterEach(() => jest.restoreAllMocks())

describe('SAT (assembleFromBank)', () => {
  it('one item short + requireFull → SectionShortError, and NO exposure write', async () => {
    enqueue('study_item_bank', { data: satRows(21) })
    enqueue('study_item_exposures', { data: [] })
    const err = await assembleFromBank({ section: 'math', count: 22, studentId: 'stu', requireFull: true }, 's1')
      .catch(e => e)
    expect(err).toBeInstanceOf(SectionShortError)
    expect(err.detail).toEqual({ scope: 'sat/math', want: 22, got: 21 })
    expect(upsertsOn('study_item_exposures')).toBe(0)
  })

  it('a full bank → unchanged: 22 drawn, exposures written, itemIds returned', async () => {
    enqueue('study_item_bank', { data: satRows(22) })
    enqueue('study_item_exposures', { data: [] })
    const t = await assembleFromBank({ section: 'math', count: 22, studentId: 'stu', requireFull: true }, 's1')
    expect(t.questions).toHaveLength(22)
    expect(t.itemIds).toHaveLength(22)
    expect(upsertsOn('study_item_exposures')).toBe(1)
  })

  it('without requireFull a short bank still returns short (practice/path behaviour unchanged)', async () => {
    enqueue('study_item_bank', { data: satRows(21) })
    const t = await assembleFromBank({ section: 'math', count: 22 }, 's1')
    expect(t.questions).toHaveLength(21)
  })

  it('deferExposures draws without writing the ledger', async () => {
    enqueue('study_item_bank', { data: satRows(22) })
    enqueue('study_item_exposures', { data: [] })
    const t = await assembleFromBank({ section: 'math', count: 22, studentId: 'stu', requireFull: true, deferExposures: true }, 's1')
    expect(t.itemIds).toHaveLength(22)
    expect(upsertsOn('study_item_exposures')).toBe(0)
  })
})

describe('ISEE / ACT (linear blueprint blocks)', () => {
  it('ISEE quant is 37: 36 refuses, 37 draws', async () => {
    enqueue('study_item_bank', { data: flatRows('q', 36) })
    await expect(assembleAdmissionSection({ family: 'isee', sectionKey: 'quant', requireFull: true }, 's'))
      .rejects.toMatchObject({ detail: { scope: 'isee/quant', want: 37, got: 36 } })
    enqueue('study_item_bank', { data: flatRows('q', 37) })
    const t = await assembleAdmissionSection({ family: 'isee', sectionKey: 'quant', requireFull: true }, 's')
    expect(t.questions).toHaveLength(37)
  })

  it('ACT math is 45: 44 refuses, 45 draws', async () => {
    enqueue('study_item_bank', { data: flatRows('m', 44) })
    await expect(assembleActSection({ sectionKey: 'math', requireFull: true }, 's'))
      .rejects.toMatchObject({ detail: { scope: 'act/math', want: 45, got: 44 } })
    enqueue('study_item_bank', { data: flatRows('m', 45) })
    const t = await assembleActSection({ sectionKey: 'math', requireFull: true }, 's')
    expect(t.questions).toHaveLength(45)
  })
})

describe('TOEFL (assembleToeflFromBank)', () => {
  /** Listening module 1 wants CR 11 + conv 6 + ann 6 + talk 4 = 27. */
  const m1Bank = (crCount: number) => [
    ...choose(crCount),
    ...sets('conversation', 3, 2), ...sets('announcement', 3, 2), ...sets('academic_talk', 2, 2),
  ]

  it('module 1 one Choose-a-Response short → refused with module:1', async () => {
    enqueue('study_item_bank', { data: m1Bank(10) })
    await expect(assembleToeflFromBank({ section: 'listening', module: 1, requireFull: true }, 's'))
      .rejects.toMatchObject({ detail: { scope: 'toefl/listening', want: 27, got: 26, module: 1 } })
  })

  it('module 1 with the item back → 27, unchanged', async () => {
    enqueue('study_item_bank', { data: m1Bank(11) })
    const t = await assembleToeflFromBank({ section: 'listening', module: 1, requireFull: true }, 's')
    expect(t.questions).toHaveLength(27)
  })

  it('module 2: upper (12 Academic Talk) short by one set while lower fills — judged per path', async () => {
    // upper = CR 3 + conv 6 + talk 12; lower = CR 9 + conv 6 + ann 6.
    const bank = [
      ...choose(9), ...sets('conversation', 3, 2), ...sets('announcement', 3, 2),
      ...sets('academic_talk', 5, 2), // 10 of 12
    ]
    enqueue('study_item_bank', { data: bank })
    await expect(assembleToeflFromBank({ section: 'listening', module: 2, path: 'upper', requireFull: true }, 's'))
      .rejects.toMatchObject({ detail: { want: 21, got: 19, module: 2, path: 'upper' } })
    enqueue('study_item_bank', { data: bank })
    const lower = await assembleToeflFromBank({ section: 'listening', module: 2, path: 'lower', requireFull: true }, 's')
    expect(lower.questions).toHaveLength(21)
  })
})
