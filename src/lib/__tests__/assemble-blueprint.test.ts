/** @jest-environment node */
/**
 * Locks the College Board domain-blueprint apportionment in
 * src/lib/study/assemble.ts: bank-assembled SAT tests must mirror the
 * real exam's per-domain weighting, not an even split. Covers the pure
 * quota math (blueprintQuotas) and the end-to-end composition an
 * assembled test comes out to, including the thin-domain backfill.
 */
import { blueprintQuotas, BLUEPRINT, assembleFromBank, assembleToeflFromBank } from '@/lib/study/assemble'
import { dbAdmin } from '@/lib/supabase-admin'
import { tableRouter } from '@/tests/study-route-helpers'

// dbAdmin and dbAdmin are the same client in production — the
// second is only an untyped alias — so the mock exposes one shared
// object under both names.
jest.mock('@/lib/supabase-admin', () => {
  const client = { from: jest.fn() }
  return { dbAdmin: client }
})

const fromMock = dbAdmin.from as unknown as jest.Mock

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0)

describe('blueprintQuotas', () => {
  it('apportions a 22-question Math module to the CB weights, summing exactly to 22', () => {
    const q = blueprintQuotas(BLUEPRINT.math, 22)
    expect(sum(q)).toBe(22)
    // Algebra + Advanced Math (0.35 each) dominate; Geometry + PSDA
    // (0.15 each) are the light domains.
    expect(q['Algebra']).toBe(8)
    expect(q['Advanced Math']).toBe(8)
    expect(q['Problem-Solving and Data Analysis']).toBe(3)
    expect(q['Geometry and Trigonometry']).toBe(3)
  })

  it('apportions a 27-question R&W module to the CB weights, summing exactly to 27', () => {
    const q = blueprintQuotas(BLUEPRINT.reading_writing, 27)
    expect(sum(q)).toBe(27)
    // Craft & Structure is the heaviest (0.28); Expression of Ideas the
    // lightest (0.20).
    expect(q['Craft and Structure']).toBe(8)
    expect(q['Information and Ideas']).toBe(7)
    expect(q['Standard English Conventions']).toBe(7)
    expect(q['Expression of Ideas']).toBe(5)
    // The heaviest domain must never come out below the lightest.
    expect(q['Craft and Structure']).toBeGreaterThan(q['Expression of Ideas'])
  })

  it('always sums to exactly `count` across a range of sizes (largest-remainder invariant)', () => {
    for (const section of ['math', 'reading_writing'] as const) {
      for (let count = 0; count <= 60; count++) {
        const q = blueprintQuotas(BLUEPRINT[section], count)
        expect(sum(q)).toBe(count)
        for (const n of Object.values(q)) expect(n).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('hands a single seat to the heaviest domain', () => {
    const q = blueprintQuotas(BLUEPRINT.reading_writing, 1)
    expect(sum(q)).toBe(1)
    expect(q['Craft and Structure']).toBe(1)
  })
})

/** Build N bank rows for a domain — minimal shape assembleFromBank needs. */
function rowsFor(domain: string, n: number, difficulty = 'hard') {
  return Array.from({ length: n }, (_, i) => ({
    id: `${domain}-${i}`,
    domain,
    difficulty,
    item: { prompt: `${domain} Q${i}`, type: 'multiple_choice', choices: ['A', 'B', 'C', 'D'], correct_answer: 'A', difficulty, explanation: '' },
  }))
}

describe('assembleFromBank composition', () => {
  let enqueue: ReturnType<typeof tableRouter>
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    enqueue = tableRouter(fromMock)
  })
  afterEach(() => (console.error as jest.Mock).mockRestore())

  it('draws a Math test to the blueprint when every domain is deep enough', async () => {
    const pool = [
      ...rowsFor('Algebra', 30),
      ...rowsFor('Advanced Math', 30),
      ...rowsFor('Problem-Solving and Data Analysis', 30),
      ...rowsFor('Geometry and Trigonometry', 30),
    ]
    enqueue('study_item_bank', { data: pool })

    const test = await assembleFromBank({ section: 'math', count: 22 }, 'seed-1')
    expect(test.questions).toHaveLength(22)
    expect(test.composition).toEqual(blueprintQuotas(BLUEPRINT.math, 22))
  })

  it('backfills a thin domain from heavier domains but still hits the target count', async () => {
    // Only 1 Geometry item (blueprint wants 3). The 2-item shortfall
    // must be absorbed by the heavier domains, never leave the test short.
    const pool = [
      ...rowsFor('Algebra', 30),
      ...rowsFor('Advanced Math', 30),
      ...rowsFor('Problem-Solving and Data Analysis', 30),
      ...rowsFor('Geometry and Trigonometry', 1),
    ]
    enqueue('study_item_bank', { data: pool })

    const test = await assembleFromBank({ section: 'math', count: 22 }, 'seed-2')
    expect(test.questions).toHaveLength(22)
    expect(sum(test.composition)).toBe(22)
    expect(test.composition['Geometry and Trigonometry']).toBe(1)
  })

  it('throws when the bank has no verified items for the section', async () => {
    enqueue('study_item_bank', { data: [] })
    await expect(assembleFromBank({ section: 'math', count: 22 }, 'seed-3'))
      .rejects.toThrow(/no verified items/)
  })
})

/** Build N TOEFL bank rows of one item type. */
function toeflRows(itemType: string, n: number, difficulty = 'medium') {
  return Array.from({ length: n }, (_, i) => ({
    id: `${itemType}-${i}`,
    item_type: itemType,
    difficulty,
    item: {
      prompt: `${itemType} Q${i}`,
      type: itemType,
      choices: ['A', 'B', 'C', 'D'],
      correct_answer: 'A',
      difficulty,
      explanation: '',
      ...(itemType === 'fill_in_blanks'
        ? { blanks: Array.from({ length: 10 }, (_, b) => ({ id: b, answer: 'x' })) }
        : {}),
    },
  }))
}

describe('assembleToeflFromBank two-module adaptive draw', () => {
  let enqueue: ReturnType<typeof tableRouter>
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    enqueue = tableRouter(fromMock)
  })
  afterEach(() => (console.error as jest.Mock).mockRestore())

  const deepReading = () => [...toeflRows('fill_in_blanks', 6), ...toeflRows('multiple_choice', 80)]

  it('Reading Module 1 draws 1 Complete-the-Words + 15 MC = 16 cards / 25 scored', () => {
    enqueue('study_item_bank', { data: deepReading() })
    return assembleToeflFromBank({ section: 'reading', module: 1 }, 'seed-m1').then(test => {
      expect(test.questions).toHaveLength(16)
      expect(test.composition).toEqual({ fill_in_blanks: 1, multiple_choice: 15 })
      // Scored items: the CtW paragraph is scored per blank.
      const scored = test.questions.reduce(
        (n, q) => n + (q.type === 'fill_in_blanks' ? (q.blanks?.length ?? 1) : 1), 0)
      expect(scored).toBe(25)
      // Module 1 hands the client its own length as the break index.
      expect(test.moduleBreakIdx).toBe(16)
    })
  })

  it('Reading Module 2 is the same shape and carries no break index', async () => {
    enqueue('study_item_bank', { data: deepReading() })
    const test = await assembleToeflFromBank(
      { section: 'reading', module: 2, difficulties: ['medium', 'hard'] }, 'seed-m2')
    expect(test.questions).toHaveLength(16)
    expect(test.composition).toEqual({ fill_in_blanks: 1, multiple_choice: 15 })
    expect(test.moduleBreakIdx).toBeUndefined()
  })

  it('Listening splits 47 MC as 24 / 23', async () => {
    enqueue('study_item_bank', { data: toeflRows('multiple_choice', 80) })
    const m1 = await assembleToeflFromBank({ section: 'listening', module: 1 }, 'seed-l1')
    enqueue('study_item_bank', { data: toeflRows('multiple_choice', 80) })
    const m2 = await assembleToeflFromBank({ section: 'listening', module: 2 }, 'seed-l2')
    expect(m1.questions).toHaveLength(24)
    expect(m2.questions).toHaveLength(23)
    expect(m1.questions.length + m2.questions.length).toBe(47)
  })

  it('the two modules never overlap — Module 1 exposures push its items to the back', async () => {
    // Module 1 records exposures; Module 2's unseen-first ranking then
    // deals from what is left, so a student cannot see a repeat.
    const pool = toeflRows('multiple_choice', 60)
    enqueue('study_item_bank', { data: pool })
    enqueue('study_item_exposures', { data: [] })          // no prior exposures
    const m1 = await assembleToeflFromBank(
      { section: 'listening', module: 1, studentId: 'stu-1' }, 'seed-x')
    const m1Prompts = m1.questions.map(q => q.prompt)

    enqueue('study_item_bank', { data: pool })
    enqueue('study_item_exposures', {
      data: pool
        .filter(r => m1Prompts.includes(r.item.prompt))
        .map(r => ({ item_id: r.id, seen_at: '2026-01-01T00:00:00Z', session_id: 'other' })),
    })
    const m2 = await assembleToeflFromBank(
      { section: 'listening', module: 2, studentId: 'stu-1' }, 'seed-x')

    expect(m1Prompts).toHaveLength(24)
    for (const p of m2.questions.map(q => q.prompt)) expect(m1Prompts).not.toContain(p)
  })

  it('module 2 filters the bank query by the routed difficulty band', async () => {
    const bank = enqueue('study_item_bank', { data: toeflRows('multiple_choice', 80) })
    await assembleToeflFromBank(
      { section: 'listening', module: 2, difficulties: ['medium', 'hard'] }, 'seed-d')
    expect(bank.in).toHaveBeenCalledWith('difficulty', ['medium', 'hard'])
  })

  it('module 1 is NEVER difficulty-filtered — it is the fixed mixed form', async () => {
    const bank = enqueue('study_item_bank', { data: toeflRows('multiple_choice', 80) })
    await assembleToeflFromBank(
      { section: 'listening', module: 1, difficulties: ['hard'] }, 'seed-d1')
    expect(bank.in).not.toHaveBeenCalled()
  })

  it('omitting `module` reproduces the whole-section draw unchanged', async () => {
    // Writing / Speaking and every non-adaptive caller depend on this.
    enqueue('study_item_bank', { data: deepReading() })
    const whole = await assembleToeflFromBank({ section: 'reading' }, 'seed-w')
    expect(whole.questions).toHaveLength(32)     // 2 CtW + 30 MC
    expect(whole.composition).toEqual({ fill_in_blanks: 2, multiple_choice: 30 })
    // One CtW interleaved into each module, break after the first half.
    expect(whole.moduleBreakIdx).toBe(16)
    expect(whole.questions[0].type).toBe('fill_in_blanks')
    expect(whole.questions[16].type).toBe('fill_in_blanks')
    const bank = enqueue('study_item_bank', { data: toeflRows('speaking_repeat', 20) })
    const speaking = await assembleToeflFromBank({ section: 'speaking' }, 'seed-s')
    expect(speaking.composition.speaking_repeat).toBe(7)
    expect(bank.in).not.toHaveBeenCalled()
  })
})
