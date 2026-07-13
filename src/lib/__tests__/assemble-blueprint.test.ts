/** @jest-environment node */
/**
 * Locks the College Board domain-blueprint apportionment in
 * src/lib/study/assemble.ts: bank-assembled SAT tests must mirror the
 * real exam's per-domain weighting, not an even split. Covers the pure
 * quota math (blueprintQuotas) and the end-to-end composition an
 * assembled test comes out to, including the thin-domain backfill.
 */
import { blueprintQuotas, BLUEPRINT, assembleFromBank } from '@/lib/study/assemble'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { tableRouter } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: jest.fn() },
}))

const fromMock = supabaseAdmin.from as unknown as jest.Mock

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
