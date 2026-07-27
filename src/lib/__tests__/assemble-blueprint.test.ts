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
function toeflRows(itemType: string, n: number, difficulty = 'medium', listeningTask?: string) {
  return Array.from({ length: n }, (_, i) => ({
    id: `${listeningTask ?? itemType}-${i}`,
    item_type: itemType,
    difficulty,
    item: {
      prompt: `${listeningTask ?? itemType} Q${i}`,
      type: itemType,
      ...(listeningTask ? { listeningTask } : {}),
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

/**
 * Build TOEFL bank rows in SHARED-PASSAGE SETS: `groups` passages, each
 * feeding `size` questions that carry the same passageGroupId and the same
 * passage text — the shape the generator banks Reading/Listening in.
 */
function groupedRows(
  itemType: string,
  o: {
    groups: number; size: number; prefix?: string; difficulty?: string
    listeningTask?: string; readingTask?: string
  },
) {
  const prefix = o.prefix ?? 'psg'
  const difficulty = o.difficulty ?? 'hard'
  return Array.from({ length: o.groups }, (_, g) =>
    Array.from({ length: o.size }, (_, i) => ({
      id: `${prefix}-${g}-${i}`,
      item_type: itemType,
      difficulty,
      item: {
        prompt: `${prefix}-${g} Q${i}`,
        type: itemType,
        choices: ['A', 'B', 'C', 'D'],
        correct_answer: 'A',
        difficulty,
        explanation: '',
        passage: `Passage ${prefix}-${g}`,
        passageGroupId: `${prefix}-${g}`,
        ...(o.listeningTask ? { listeningTask: o.listeningTask } : {}),
        ...(o.readingTask ? { readingTask: o.readingTask } : {}),
      },
    })),
  ).flat()
}

/**
 * A TOEFL Listening bank with the FOUR ETS Jan-2026 tasks, which is the only
 * shape the blueprint can now draw from — an untagged listening row matches
 * no mix entry and is never served.
 *
 * Set sizes mirror the real bank — conversations, announcements and talks
 * all come in both 4s and 2s — so the blueprint's quotas (11/6/6/4 then
 * 9/6/6/0 or 3/6/0/12) are reachable as sums of WHOLE sets. A fixture with
 * only one set size per task passes the count assertions by luck and hides
 * the packing behaviour the real bank exercises.
 */
function listeningBank(o: { deep?: boolean } = {}) {
  const k = o.deep ? 6 : 3
  return [
    ...toeflRows('multiple_choice', 40, 'hard', 'choose_response'),
    ...groupedRows('multiple_choice', { groups: k, size: 4, prefix: 'conv4', listeningTask: 'conversation' }),
    ...groupedRows('multiple_choice', { groups: k, size: 2, prefix: 'conv2', listeningTask: 'conversation' }),
    ...groupedRows('multiple_choice', { groups: k, size: 4, prefix: 'ann4', listeningTask: 'announcement' }),
    ...groupedRows('multiple_choice', { groups: k, size: 2, prefix: 'ann2', listeningTask: 'announcement' }),
    ...groupedRows('multiple_choice', { groups: k * 2, size: 4, prefix: 'talk4', listeningTask: 'academic_talk' }),
    ...groupedRows('multiple_choice', { groups: k, size: 2, prefix: 'talk2', listeningTask: 'academic_talk' }),
  ]
}

/**
 * A delivered passage set must be WHOLE and CONTIGUOUS: every question the
 * bank filed under that passage is present, and they sit next to each other
 * so the passage renders once with its questions. Ungrouped items are
 * exempt (they are sets of one).
 */
function expectWholeSets(
  delivered: Array<{ passageGroupId?: string | null; prompt: string }>,
  // `item` is the raw bank fixture shape — grouped rows carry
  // passageGroupId, ungrouped ones (toeflRows) omit the key entirely.
  bank: Array<{ item: object }>,
) {
  const bankSize = new Map<string, number>()
  for (const r of bank) {
    const g = (r.item as { passageGroupId?: string | null }).passageGroupId
    if (g) bankSize.set(g, (bankSize.get(g) ?? 0) + 1)
  }
  const seen = new Map<string, number[]>()
  delivered.forEach((q, i) => {
    if (!q.passageGroupId) return
    seen.set(q.passageGroupId, [...(seen.get(q.passageGroupId) ?? []), i])
  })
  for (const [gid, idxs] of seen) {
    // Complete: no fragment of a passage's question set.
    expect([gid, idxs.length]).toEqual([gid, bankSize.get(gid)])
    // Contiguous: the set is not interleaved with another passage's items.
    expect([gid, idxs[idxs.length - 1]! - idxs[0]!]).toEqual([gid, idxs.length - 1])
  }
}

describe('assembleToeflFromBank two-module adaptive draw', () => {
  let enqueue: ReturnType<typeof tableRouter>
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    enqueue = tableRouter(fromMock)
  })
  afterEach(() => {
    ;(console.error as jest.Mock).mockRestore()
    ;(console.warn as jest.Mock).mockRestore()
  })

  /** A Reading bank with the THREE ETS tasks. Complete the Words is
   *  item_type='fill_in_blanks' and carries no task tag; the two MC tasks
   *  select on item.readingTask. Academic sets are 4 and 5 so the quotas of
   *  9 and 10 are reachable (5+4, 5+5); daily-life texts are 1-2 questions,
   *  which is ETS's own shape for a campus notice. */
  const deepReading = () => [
    ...toeflRows('fill_in_blanks', 6),
    ...groupedRows('multiple_choice', { groups: 12, size: 2, prefix: 'daily', readingTask: 'daily_life' }),
    ...groupedRows('multiple_choice', { groups: 8, size: 5, prefix: 'acad5', readingTask: 'academic_passage' }),
    ...groupedRows('multiple_choice', { groups: 8, size: 4, prefix: 'acad4', readingTask: 'academic_passage' }),
  ]

  it('Reading Stage 1 draws 1 Complete-the-Words + 9 daily + 9 academic = 28 questions', () => {
    enqueue('study_item_bank', { data: deepReading() })
    return assembleToeflFromBank({ section: 'reading', module: 1 }, 'seed-m1').then(test => {
      expect(test.composition).toEqual({
        fill_in_blanks: 1,
        'multiple_choice:daily_life': 9,
        'multiple_choice:academic_passage': 9,
      })
      expect(test.questions).toHaveLength(19)   // cards
      // ETS Table 1 counts a Complete-the-Words paragraph as TEN questions.
      const scored = test.questions.reduce(
        (n, q) => n + (q.type === 'fill_in_blanks' ? (q.blanks?.length ?? 1) : 1), 0)
      expect(scored).toBe(28)
      expect(test.moduleBreakIdx).toBe(19)
    })
  })

  it('Reading Stage 2 INVERTS the task mix between the lower and upper paths', async () => {
    // This is the ETS design the old flat `multiple_choice` blueprint erased:
    // the lower module reads notices and emails, the upper module reads
    // academic prose. Not a difficulty tint — a different test.
    enqueue('study_item_bank', { data: deepReading() })
    const lower = await assembleToeflFromBank(
      { section: 'reading', module: 2, path: 'lower' }, 'seed-m2l')
    expect(lower.composition).toEqual({
      fill_in_blanks: 1, 'multiple_choice:daily_life': 10,
    })
    enqueue('study_item_bank', { data: deepReading() })
    const upper = await assembleToeflFromBank(
      { section: 'reading', module: 2, path: 'upper' }, 'seed-m2u')
    expect(upper.composition).toEqual({
      fill_in_blanks: 1, 'multiple_choice:academic_passage': 10,
    })
    expect(upper.moduleBreakIdx).toBeUndefined()
  })

  it('Listening is 27 + 21 = 48 questions on either path', async () => {
    enqueue('study_item_bank', { data: listeningBank({ deep: true }) })
    const m1 = await assembleToeflFromBank({ section: 'listening', module: 1 }, 'seed-l1')
    enqueue('study_item_bank', { data: listeningBank({ deep: true }) })
    const m2 = await assembleToeflFromBank({ section: 'listening', module: 2 }, 'seed-l2')
    expect(m1.questions).toHaveLength(27)
    expect(m2.questions).toHaveLength(21)
    expect(m1.questions.length + m2.questions.length).toBe(48)
  })

  it('the two modules never overlap — Module 1 exposures push its items to the back', async () => {
    // Module 1 records exposures; Module 2's unseen-first ranking then
    // deals from what is left, so a student cannot see a repeat.
    const pool = listeningBank({ deep: true })
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

    expect(m1Prompts).toHaveLength(27)
    for (const p of m2.questions.map(q => q.prompt)) expect(m1Prompts).not.toContain(p)
  })

  it('module 2 PREFERS the routed band but never filters the query', async () => {
    const bank = enqueue('study_item_bank', { data: listeningBank({ deep: true }) })
    const m2 = await assembleToeflFromBank(
      { section: 'listening', module: 2, difficulties: ['medium', 'hard'] }, 'seed-d')
    // Filtering in SQL is what made a thin band shrink the module.
    expect(bank.in).not.toHaveBeenCalled()
    expect(m2.questions).toHaveLength(21)
  })

  it('module 2 is still full size when the routed band is EMPTY in the bank', async () => {
    // The shipped bug: TOEFL is banked all-hard (Reading had 0 easy items,
    // Listening 0 easy and 0 medium), so a student routed to `easy` got the
    // intersection with an empty shelf — one real session served a 3-item
    // module 2. A weak student is exactly who must not get a broken test.
    //
    // NOTE this one does not fail against the pre-fix code: the real
    // narrowing happened in SQL and the bank mock ignores `.in()`. The
    // sibling test above ("never filters the query") is what pins that.
    // This guards the other way in — a JS-side filter that drops
    // out-of-band items instead of ranking them.
    enqueue('study_item_bank', { data: listeningBank({ deep: true }) })
    const m2 = await assembleToeflFromBank(
      { section: 'listening', module: 2, difficulties: ['easy'], path: 'upper' }, 'seed-e')
    expect(m2.questions).toHaveLength(21)
  })

  it('module 2 exhausts the routed band before falling back', async () => {
    // 5 in-band items and plenty out-of-band: all 5 must appear, so the
    // fallback tops up rather than replacing the adaptive intent.
    const inBand = toeflRows('multiple_choice', 5, 'medium', 'choose_response')
      .map((r, i) => ({ ...r, id: `ib-${i}`, item: { ...r.item, prompt: `ib Q${i}` } }))
    enqueue('study_item_bank', { data: [...listeningBank({ deep: true }), ...inBand] })
    const m2 = await assembleToeflFromBank(
      { section: 'listening', module: 2, difficulties: ['medium'], path: 'lower' }, 'seed-f')
    const prompts = m2.questions.map(q => q.prompt)
    expect(m2.questions).toHaveLength(21)
    // All 5 in-band items appear: the fallback TOPS UP the routed band, it
    // does not replace it. (Module 2's choose_response quota is 8, so 5
    // in-band + 4 out-of-band is the expected shape.)
    for (const r of inBand) expect(prompts).toContain(r.item.prompt)
  })

  it('module 1 is NEVER difficulty-filtered — it is the fixed mixed form', async () => {
    const bank = enqueue('study_item_bank', { data: listeningBank({ deep: true }) })
    await assembleToeflFromBank(
      { section: 'listening', module: 1, difficulties: ['hard'] }, 'seed-d1')
    expect(bank.in).not.toHaveBeenCalled()
  })

  it('Reading stage 1 delivers WHOLE passage sets, never a fragment', async () => {
    // Every set is 5 questions on one passage (ETS Academic shape). The
    // draw ranked ITEMS, so the blueprint's 15 MC slots were filled with 15
    // items from 15 different passages — a student read a full passage to
    // answer one question, and "Question 1 of 1 in this passage" for a
    // 5-question set.
    const bank = [
      ...groupedRows('multiple_choice', { groups: 10, size: 5, prefix: 'acad', readingTask: 'academic_passage' }),
      ...groupedRows('multiple_choice', { groups: 10, size: 4, prefix: 'acad4', readingTask: 'academic_passage' }),
      ...groupedRows('multiple_choice', { groups: 10, size: 3, prefix: 'daily', readingTask: 'daily_life' }),
    ]
    enqueue('study_item_bank', { data: [...toeflRows('fill_in_blanks', 6), ...bank] })
    const test = await assembleToeflFromBank({ section: 'reading', module: 1 }, 'seed-g1')
    expect(test.composition).toEqual({
      fill_in_blanks: 1,
      'multiple_choice:daily_life': 9,
      'multiple_choice:academic_passage': 9,
    })
    expectWholeSets(test.questions, bank)
  })

  it('Listening module 1 delivers WHOLE transcript sets', async () => {
    // Choose-a-Response items are ungrouped by design (one question per
    // audio); the other three tasks come in whole transcript sets.
    const bank = listeningBank({ deep: true })
    enqueue('study_item_bank', { data: bank })
    const test = await assembleToeflFromBank({ section: 'listening', module: 1 }, 'seed-g2')
    expect(test.questions).toHaveLength(27)
    expectWholeSets(test.questions, bank)
  })

  it('the module-2 band preference moves a passage set as ONE unit', async () => {
    // Sets straddle the routed band: 3 medium + 2 hard each. Partitioning
    // ITEM-wise put a set's 3 medium questions in the in-band partition and
    // its 2 hard ones in the fallback, so the count was filled with 3-of-5
    // fragments of five different passages.
    const inb = groupedRows('multiple_choice', { groups: 6, size: 5, prefix: 'inb', readingTask: 'academic_passage' })
      .map((r, i) => i % 5 < 3
        ? { ...r, difficulty: 'medium', item: { ...r.item, difficulty: 'medium' } }
        : r)
    const oob = groupedRows('multiple_choice', { groups: 10, size: 5, prefix: 'oob', readingTask: 'academic_passage' })
    enqueue('study_item_bank', { data: [...oob, ...inb] })
    const test = await assembleToeflFromBank(
      { section: 'reading', module: 2, difficulties: ['medium'], path: 'upper' }, 'seed-g3')
    expect(test.composition['multiple_choice:academic_passage']).toBe(10)
    const mc = test.questions.filter(q => q.type !== 'fill_in_blanks')
    expectWholeSets(mc, [...oob, ...inb])
    // Majority-medium sets outrank the all-hard ones, and win as whole sets.
    for (const q of mc) expect(q.passageGroupId).toMatch(/^inb-/)
  })

  it('the whole-section Reading module break never falls INSIDE a passage set', async () => {
    // Module 1 ending mid-set showed the student half a passage's
    // questions, a break banner, then the same passage again.
    const bank = [
      ...groupedRows('multiple_choice', { groups: 10, size: 5, prefix: 'acad', readingTask: 'academic_passage' }),
      ...groupedRows('multiple_choice', { groups: 10, size: 4, prefix: 'acad4', readingTask: 'academic_passage' }),
      ...groupedRows('multiple_choice', { groups: 10, size: 3, prefix: 'daily', readingTask: 'daily_life' }),
    ]
    enqueue('study_item_bank', { data: [...toeflRows('fill_in_blanks', 6), ...bank] })
    const test = await assembleToeflFromBank({ section: 'reading' }, 'seed-g4')
    expect(test.questions).toHaveLength(30)
    expectWholeSets(test.questions.filter(q => q.type !== 'fill_in_blanks'), bank)
    const brk = test.moduleBreakIdx!
    expect(brk).toBeGreaterThan(0)
    expect(brk).toBeLessThan(test.questions.length)
    // No group id appears on both sides of the break.
    const side = new Map<string, Set<number>>()
    test.questions.forEach((q, i) => {
      if (!q.passageGroupId) return
      const s = side.get(q.passageGroupId) ?? new Set<number>()
      s.add(i < brk ? 1 : 2)
      side.set(q.passageGroupId, s)
    })
    for (const [gid, s] of side) expect([gid, s.size]).toEqual([gid, 1])
  })

  it('module 2 does not re-open a passage set module 1 already served', async () => {
    // A set is SEEN as soon as any of its items is — otherwise its
    // untouched members rank unseen-first and the same passage comes back
    // after the break.
    const bank = listeningBank({ deep: true })
    enqueue('study_item_bank', { data: bank })
    enqueue('study_item_exposures', { data: [] })
    const m1 = await assembleToeflFromBank(
      { section: 'listening', module: 1, studentId: 'stu-g' }, 'seed-g5')
    const m1Ids = new Set(bank.filter(r => m1.questions.some(q => q.prompt === r.item.prompt)).map(r => r.id))
    // Pretend only the FIRST item of each served set made it into the
    // ledger — the ranking must still treat the whole set as spent.
    enqueue('study_item_bank', { data: bank })
    enqueue('study_item_exposures', {
      data: [...m1Ids].filter(id => id.endsWith('-0'))
        .map(id => ({ item_id: id, seen_at: '2026-01-01T00:00:00Z', session_id: 'other' })),
    })
    const m2 = await assembleToeflFromBank(
      { section: 'listening', module: 2, studentId: 'stu-g' }, 'seed-g5')
    // Grouped sets only. Choose-a-Response items carry no passageGroupId
    // (one question per audio), so they would all collide on `undefined`;
    // no-repeat for those is the exposure ledger's job and is pinned by
    // "the two modules never overlap" above.
    const m1Groups = new Set(m1.questions.map(q => q.passageGroupId).filter(Boolean))
    expect(m1Groups.size).toBeGreaterThan(0)
    for (const q of m2.questions) {
      if (!q.passageGroupId) continue
      expect(m1Groups.has(q.passageGroupId)).toBe(false)
    }
  })

  // ── Listening task mix (ETS Jan-2026) ────────────────────────────────
  //
  // The shipped bug: TOEFL_META.listening was `[{ type: 'multiple_choice',
  // n: 47 }]`. Every banked listening item is item_type='multiple_choice',
  // so the four ETS tasks were indistinguishable and the draw was 47
  // arbitrary items — a section could come out nearly all lectures.

  it('draws the four ETS tasks to their own quotas, not 47 undifferentiated MC', async () => {
    enqueue('study_item_bank', { data: listeningBank({ deep: true }) })
    const m1 = await assembleToeflFromBank({ section: 'listening', module: 1 }, 'seed-mix1')
    // Module 1 uses the blueprint's EXPLICIT m1 shares, not Math.ceil(n/2)
    // — see the `m1` note in TOEFL_META.listening.
    expect(m1.composition).toEqual({
      'multiple_choice:choose_response': 11,
      'multiple_choice:conversation': 6,
      'multiple_choice:announcement': 6,
      'multiple_choice:academic_talk': 4,
    })
    // Stage 2 INVERTS: the lower module serves no Academic Talk, the upper
    // module serves no Announcement. ETS Table 1. This is the part the old
    // flat blueprint could not express at all.
    enqueue('study_item_bank', { data: listeningBank({ deep: true }) })
    const lower = await assembleToeflFromBank(
      { section: 'listening', module: 2, path: 'lower' }, 'seed-mix2l')
    expect(lower.composition).toEqual({
      'multiple_choice:choose_response': 9,
      'multiple_choice:conversation': 6,
      'multiple_choice:announcement': 6,
    })
    enqueue('study_item_bank', { data: listeningBank({ deep: true }) })
    const upper = await assembleToeflFromBank(
      { section: 'listening', module: 2, path: 'upper' }, 'seed-mix2u')
    expect(upper.composition).toEqual({
      'multiple_choice:choose_response': 3,
      'multiple_choice:conversation': 6,
      'multiple_choice:academic_talk': 12,
    })
    const sum = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0)
    expect(sum(m1.composition) + sum(lower.composition)).toBe(48)
    expect(sum(m1.composition) + sum(upper.composition)).toBe(48)
  })

  it('never serves a listening item the classifier did not tag', async () => {
    // An untagged row matches no mix entry. Dropping it is deliberate:
    // guessing a task for it would silently fill the wrong quota, and the
    // shortfall is at least visible in `composition`.
    const bank = [
      ...listeningBank({ deep: true }),
      ...toeflRows('multiple_choice', 50).map((r, i) => ({ ...r, id: `untagged-${i}` })),
    ]
    enqueue('study_item_bank', { data: bank })
    const m1 = await assembleToeflFromBank({ section: 'listening', module: 1 }, 'seed-untag')
    for (const q of m1.questions) expect(q.prompt).not.toMatch(/^multiple_choice Q/)
    expect(m1.questions).toHaveLength(27)
  })

  it('skips single-question conversation/announcement/talk audios', async () => {
    // 31 of the 171 banked audios are a full transcript with exactly ONE
    // question — harvest casualties whose siblings were lost, not a short
    // task type. Serving one asks the student to process a whole recording
    // to answer a single question.
    const orphans = groupedRows('multiple_choice',
      { groups: 40, size: 1, prefix: 'orphan', listeningTask: 'conversation' })
    // Orphans FIRST, so a draw that ignored the rule would take them.
    enqueue('study_item_bank', { data: [...orphans, ...listeningBank({ deep: true })] })
    const m1 = await assembleToeflFromBank({ section: 'listening', module: 1 }, 'seed-orphan')
    for (const q of m1.questions) expect(q.passageGroupId ?? '').not.toMatch(/^orphan-/)
    expect(m1.composition['multiple_choice:conversation']).toBe(6)
  })

  it('comes up SHORT rather than serving a fragment of an audio', async () => {
    // Conversation quota is 5 per module; every conversation here is a
    // 4-question set, so one fits and no whole set fills the last slot.
    // Truncating would play a full conversation and ask 1 of its 4
    // questions. A 4-item task is the better failure.
    const bank = [
      ...toeflRows('multiple_choice', 40, 'hard', 'choose_response'),
      ...groupedRows('multiple_choice', { groups: 6, size: 4, prefix: 'c4', listeningTask: 'conversation' }),
      ...groupedRows('multiple_choice', { groups: 6, size: 4, prefix: 'ann', listeningTask: 'announcement' }),
      ...groupedRows('multiple_choice', { groups: 6, size: 3, prefix: 'talk', listeningTask: 'academic_talk' }),
    ]
    enqueue('study_item_bank', { data: bank })
    const m1 = await assembleToeflFromBank({ section: 'listening', module: 1 }, 'seed-strict')
    expect(m1.composition['multiple_choice:conversation']).toBe(4)
    expectWholeSets(m1.questions, bank)
  })

  it('omitting `module` reproduces the whole-section draw unchanged', async () => {
    // Writing / Speaking and every non-adaptive caller depend on this.
    enqueue('study_item_bank', { data: deepReading() })
    const whole = await assembleToeflFromBank({ section: 'reading' }, 'seed-w')
    // 2 CtW + 9 daily + 19 academic = 30 cards / 48 questions (hard path).
    expect(whole.questions).toHaveLength(30)
    expect(whole.composition).toEqual({
      fill_in_blanks: 2,
      'multiple_choice:daily_life': 9,
      'multiple_choice:academic_passage': 19,
    })
    // One CtW interleaved into each module. The break lands on a passage-set
    // boundary near the midpoint of the 28 MC cards, not at a fixed index —
    // splitOnGroupBoundary moves it to the nearest legal cut so a passage is
    // never re-opened after the break.
    const brk = whole.moduleBreakIdx!
    expect(whole.questions[0]!.type).toBe('fill_in_blanks')
    expect(whole.questions[brk]!.type).toBe('fill_in_blanks')
    expect(whole.questions.filter(q => q.type === 'fill_in_blanks')).toHaveLength(2)
    const bank = enqueue('study_item_bank', { data: toeflRows('speaking_repeat', 20) })
    const speaking = await assembleToeflFromBank({ section: 'speaking' }, 'seed-s')
    expect(speaking.composition.speaking_repeat).toBe(7)
    expect(bank.in).not.toHaveBeenCalled()
  })
})
