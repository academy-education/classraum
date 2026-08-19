import { moduleSplit, passageSetBreakdown, type ResultRow } from '@/lib/study/test-result'

/**
 * Every assertion here pins a number that a real session produced. The
 * fixtures are shaped from live rows (see the ids in the comments) so a
 * regression shows up as "session X now renders Y", not as an abstract
 * failure.
 */
const q = (over: Partial<ResultRow['question']> = {}): ResultRow['question'] =>
  ({ type: 'multiple_choice', prompt: 'p', choices: [], blanks: null, ...over }) as ResultRow['question']

const row = (position: number, over: Partial<ResultRow> = {}): ResultRow => ({
  question: q(),
  studentAnswer: 'a',
  correct: false,
  ungraded: false,
  isPilot: false,
  correctAnswerDisplay: '',
  range: null,
  position,
  ...over,
})

/** n cards from `from`, the first `correct` of them right. */
const block = (from: number, n: number, correct: number, over: Partial<ResultRow> = {}) =>
  Array.from({ length: n }, (_, i) => row(from + i, { correct: i < correct, ...over }))

describe('moduleSplit', () => {
  it('splits a real SAT Math session (ca3cce97) into 21/22 and 21/22', () => {
    const rows = [...block(0, 22, 21), ...block(22, 22, 21)]
    expect(moduleSplit({
      rows, breakIdx: 22, totalScored: 44, correctCount: 42, module1CorrectCards: 21,
    })).toEqual({
      module1: { correct: 21, total: 22, percent: 95 },
      module2: { correct: 21, total: 22, percent: 95 },
    })
  })

  it('splits a real SAT R&W session (feb752ec) into 16/27 and 15/27', () => {
    const rows = [...block(0, 27, 16), ...block(27, 27, 15)]
    expect(moduleSplit({
      rows, breakIdx: 27, totalScored: 54, correctCount: 31, module1CorrectCards: 16,
    })).toMatchObject({
      module1: { correct: 16, total: 27, percent: 59 },
      module2: { correct: 15, total: 27, percent: 56 },
    })
  })

  it('excludes pilots from both denominators (toefl-listening e50e61c4: 48 cards, 13 pilots, 35 scored)', () => {
    // 27 cards in Module 1, 7 of them pilots -> 20 scored; 21 in Module 2,
    // 6 pilots -> 15 scored. The live session records 14 correct of 35.
    const rows = [
      ...block(0, 20, 7),
      ...block(20, 7, 3, { isPilot: true }),
      ...block(27, 15, 7),
      ...block(42, 6, 6, { isPilot: true }),
    ]
    const s = moduleSplit({
      rows, breakIdx: 27, totalScored: 35, correctCount: 14, module1CorrectCards: 10,
    })
    // 7 real + 3 pilot cards correct in Module 1 = the 10 cards the
    // routing endpoint counted, while only 7 of 20 enter the score.
    expect(s).toEqual({
      module1: { correct: 7, total: 20, percent: 35 },
      module2: { correct: 7, total: 15, percent: 47 },
    })
  })

  it('REFUSES when the parts do not add up to the headline (partial-credit CtW, session 3f71f4c6)', () => {
    // The rows recover 10 correct; the session row records 26, because
    // weightedScore gave partial credit per blank.
    //
    // `module1CorrectCards` is passed CONSISTENT with the rows on
    // purpose, so the card-level cross-check cannot be what refuses
    // this. Only the question-count identity can — which is the point:
    // in the live session both checks fire, and a test that lets either
    // one carry the case would stay green if the other were deleted.
    const rows = [...block(0, 20, 7), ...block(20, 15, 3)]
    expect(moduleSplit({
      rows, breakIdx: 20, totalScored: 35, correctCount: 26, module1CorrectCards: 7,
    })).toBeNull()
  })

  it('REFUSES when the modules hold fewer scored questions than the score denominator', () => {
    // Rows recover 40 scored questions; the session row says 44. Some
    // rows are missing (a partial write, a filtered read) and neither
    // module is the module the student sat.
    const rows = [...block(0, 20, 10), ...block(20, 20, 10)]
    expect(moduleSplit({
      rows, breakIdx: 20, totalScored: 44, correctCount: 20, module1CorrectCards: 10,
    })).toBeNull()
  })

  it('REFUSES when module1_correct disagrees with the final grade (session b13f1ebf)', () => {
    // Routed on 6 correct cards; the final grade has 0 in Module 1.
    const rows = [...block(0, 27, 0), ...block(27, 27, 1)]
    expect(moduleSplit({
      rows, breakIdx: 27, totalScored: 54, correctCount: 1, module1CorrectCards: 6,
    })).toBeNull()
    // Same rows, no contradicting cross-check value -> it renders.
    expect(moduleSplit({
      rows, breakIdx: 27, totalScored: 54, correctCount: 1, module1CorrectCards: null,
    })).toMatchObject({ module1: { correct: 0, total: 27 } })
  })

  it('REFUSES an unnumbered (legacy) session rather than cutting the array by index', () => {
    // 519 of 932 live full-test attempt rows have no position. Array
    // index would always produce a plausible-looking split.
    const rows = [...block(0, 10, 5), ...block(10, 10, 5)].map(r => ({ ...r, position: null }))
    expect(moduleSplit({
      rows, breakIdx: 10, totalScored: 20, correctCount: 10, module1CorrectCards: 5,
    })).toBeNull()
  })

  it('REFUSES when positions have a gap, so the module behind the cut is incomplete', () => {
    const rows = [...block(0, 10, 5), ...block(11, 10, 5)]
    expect(moduleSplit({
      rows, breakIdx: 10, totalScored: 20, correctCount: 10,
    })).toBeNull()
  })

  it('REFUSES a non-adaptive test (no break index) and an out-of-range one', () => {
    const rows = block(0, 20, 10)
    expect(moduleSplit({ rows, breakIdx: null, totalScored: 20, correctCount: 10 })).toBeNull()
    expect(moduleSplit({ rows, breakIdx: 0, totalScored: 20, correctCount: 10 })).toBeNull()
    expect(moduleSplit({ rows, breakIdx: 20, totalScored: 20, correctCount: 10 })).toBeNull()
  })

  it('counts a Complete-the-Words card as its blanks, not as one question', () => {
    const ctw = q({ type: 'fill_in_blanks', blanks: Array.from({ length: 10 }, (_, i) => ({ id: i, answer: 'x' })) })
    const rows = [
      row(0, { question: ctw, correct: true }),
      ...block(1, 5, 2),
      ...block(6, 5, 3),
    ]
    // Module 1 = card 0 (10 questions) + 5 cards = 15 scored questions.
    expect(moduleSplit({
      rows, breakIdx: 6, totalScored: 20, correctCount: 15, module1CorrectCards: 3,
    })).toEqual({
      module1: { correct: 12, total: 15, percent: 80 },
      module2: { correct: 3, total: 5, percent: 60 },
    })
  })
})

describe('passageSetBreakdown', () => {
  const withSet = (position: number, gid: string, correct: boolean, over: Partial<ResultRow> = {}) =>
    row(position, { correct, question: q({ passageGroupId: gid }), ...over })

  it('reports a real numbered session (toefl-listening 0e5f548e shape): 4 sets of 14 of 35 scored', () => {
    const rows = [
      ...[0, 1, 2, 3].map((p, i) => withSet(p, 'M2-2', i < 3)),
      ...[4, 5, 6, 7].map((p, i) => withSet(p, 'M4-6', i < 1)),
      ...[8, 9, 10].map((p, i) => withSet(p, 'L6-6#m2', i < 2)),
      ...[11, 12, 13].map((p, i) => withSet(p, 'M4-7#m2', i < 3)),
      // Two-question sets: real, and dropped as too small to report.
      ...[14, 15].map(p => withSet(p, 'pg-30f0', true)),
      ...[16, 17].map(p => withSet(p, 'pg-c8f6', false)),
      // Ungrouped scored questions, and pilots which count nowhere.
      ...block(18, 17, 8),
      ...block(35, 5, 5, { isPilot: true }),
    ]
    const b = passageSetBreakdown(rows)!
    expect(b.sets.map(s => [s.ordinal, s.correct, s.total, s.percent])).toEqual([
      [2, 1, 4, 25], [3, 2, 3, 67], [1, 3, 4, 75], [4, 3, 3, 100],
    ])
    expect(b.setsInTest).toBe(6)
    expect(b.coveredScored).toBe(14)
    expect(b.totalScored).toBe(35)
  })

  it('returns null for SAT, where no row carries a passage group at all', () => {
    expect(passageSetBreakdown(block(0, 54, 31))).toBeNull()
  })

  it('returns null when fewer than two sets clear the minimum size', () => {
    const rows = [
      ...[0, 1, 2].map(i => withSet(i, 'a', true)),
      ...[3, 4].map(i => withSet(i, 'b', true)),
      ...[5, 6].map(i => withSet(i, 'c', false)),
    ]
    expect(passageSetBreakdown(rows)).toBeNull()
    expect(passageSetBreakdown(rows, { minPerSet: 2 })!.sets).toHaveLength(3)
  })

  it('REFUSES an unnumbered session rather than numbering passages by array order', () => {
    const rows = [
      ...[0, 1, 2].map(i => withSet(i, 'a', true)),
      ...[3, 4, 5].map(i => withSet(i, 'b', false)),
    ].map(r => ({ ...r, position: null }))
    expect(passageSetBreakdown(rows)).toBeNull()
  })

  it('numbers sets by first appearance in DELIVERY order, not by array order', () => {
    const rows = [
      ...[3, 4, 5].map(i => withSet(i, 'second', true)),
      ...[0, 1, 2].map(i => withSet(i, 'first', false)),
    ]
    const b = passageSetBreakdown(rows)!
    expect(b.sets.find(s => s.percent === 0)!.ordinal).toBe(1)
    expect(b.sets.find(s => s.percent === 100)!.ordinal).toBe(2)
  })
})
