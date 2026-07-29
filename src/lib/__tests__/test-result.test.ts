/** @jest-environment node */
/**
 * Locks the result-screen arithmetic extracted in step 0 of the page merge.
 *
 * Each test below corresponds to a bug that ACTUALLY SHIPPED on 2026-07-28,
 * because three renderers derived these values independently. They are
 * written so that reverting the specific rule turns one of them red — a
 * suite that only fails when everything is gone proves nothing.
 */
import {
  displayCorrectAnswer,
  deliveredWeight,
  reviewRanges,
  familyFromTopicSlug,
  satSectionFromTopicSlug,
  canNumberRows,
  buildResultModel,
  tallyRows,
  scaleFraction,
} from '@/lib/study/test-result'

const card = (over = {}) => ({
  question: { type: 'multiple_choice', prompt: 'p', correct_answer: 'A', ...over },
  studentAnswer: 'A', correct: true, ungraded: false, position: 0,
})

describe('displayCorrectAnswer', () => {
  // TestSession's DB rebuild used `q.correct_answer ?? ''`, so a
  // Complete-the-Words item showed its blanks right after submitting and an
  // EMPTY green box on reopening. correct_answer is empty for CtW by design
  // — the key lives in blanks[].
  it('renders fill_in_blanks from blanks[], not the empty correct_answer', () => {
    const out = displayCorrectAnswer({
      type: 'fill_in_blanks',
      correct_answer: '',
      blanks: [{ id: 1, answer: 'ous' }, { id: 2, answer: 'ification' }],
    })
    expect(out).toBe('[1] ous, [2] ification')
    expect(out).not.toBe('')
  })

  it('joins multi_select and takes the first acceptable numeric answer', () => {
    expect(displayCorrectAnswer({ type: 'multi_select', correct_answers: ['A', 'C'] }))
      .toBe('A + C')
    expect(displayCorrectAnswer({ type: 'numeric_entry', acceptable_answers: ['12', '12.0'] }))
      .toBe('12')
  })

  it('gives open-response an em dash rather than a blank or a wrong key', () => {
    for (const type of ['speaking_interview', 'writing_email', 'writing_discussion']) {
      expect(displayCorrectAnswer({ type, correct_answer: 'should not be shown' })).toBe('—')
    }
  })

  it('falls back to correct_answer for plain multiple choice', () => {
    expect(displayCorrectAnswer({ type: 'multiple_choice', correct_answer: 'B' })).toBe('B')
  })
})

describe('deliveredWeight / reviewRanges', () => {
  // The CARD vs DELIVERED split. Mixing these produced the sheet's 50/47,
  // the Module 2 banner's phantom "19", and "29 MISSED" over "20 to review".
  it('counts a Complete-the-Words card as its blanks, everything else as 1', () => {
    expect(deliveredWeight({ type: 'fill_in_blanks', blanks: Array.from({ length: 10 }, (_, i) => ({ id: i })) }))
      .toBe(10)
    expect(deliveredWeight({ type: 'multiple_choice' })).toBe(1)
  })

  it('numbers a CtW card as a RANGE so labels match the taking view', () => {
    const { ranges, deliveredTotal } = reviewRanges([
      { type: 'multiple_choice' },
      { type: 'fill_in_blanks', blanks: Array.from({ length: 10 }, (_, i) => ({ id: i })) },
      { type: 'multiple_choice' },
    ])
    expect(ranges[0]).toEqual({ startAt: 1, endAt: 1 })
    expect(ranges[1]).toEqual({ startAt: 2, endAt: 11 })   // the range, not "2"
    expect(ranges[2]).toEqual({ startAt: 12, endAt: 12 })
    // 3 CARDS, 12 DELIVERED questions — the whole point.
    expect(ranges).toHaveLength(3)
    expect(deliveredTotal).toBe(12)
    expect(deliveredTotal).not.toBe(ranges.length)
  })

  it('degrades a blank-less CtW row to 1 rather than 0', () => {
    expect(deliveredWeight({ type: 'fill_in_blanks', blanks: [] })).toBe(1)
  })
})

describe('buildResultModel', () => {
  // THE bug this whole extraction exists to prevent. Session fd9b9cfd
  // recorded 6/35; counting its attempt rows gives 10/30. The builder is
  // handed the headline and must not "improve" on it.
  it('passes the headline score through untouched — never recomputes from rows', () => {
    const m = buildResultModel({
      family: 'toefl',
      correctCount: 6, totalScored: 35, scorePercent: 17,
      // 30 cards, ALL of them correct — a recomputing builder would say 30/30.
      cards: Array.from({ length: 30 }, () => card()),
    })
    expect(m.correctCount).toBe(6)
    expect(m.totalScored).toBe(35)
    expect(m.scorePercent).toBe(17)
    expect(m.rows).toHaveLength(30)
    expect(m.correctCount).not.toBe(30)
    expect(m.totalScored).not.toBe(m.rows.length)
  })

  it('flags a pilot only on scored===false — absent and null are scored', () => {
    const m = buildResultModel({
      family: 'toefl', correctCount: 1, totalScored: 2, scorePercent: 50,
      cards: [
        card({ scored: false }),
        card({ scored: null }),
        card(),
      ],
    })
    expect(m.rows.map(r => r.isPilot)).toEqual([true, false, false])
  })

  it('drops every row label when one position is missing, but keeps the delivered total', () => {
    const cards = [card(), { ...card(), position: null }, card()]
    const m = buildResultModel({
      family: 'sat', correctCount: 2, totalScored: 3, scorePercent: 67, cards,
    })
    expect(m.numbered).toBe(false)
    expect(m.rows.map(r => r.range)).toEqual([null, null, null])
    // The reconciliation line ("scored on 35 of 48") counts delivered
    // questions, which does not depend on their order — so it survives.
    expect(m.deliveredTotal).toBe(3)
  })

  it('labels rows with delivered RANGES when positions are intact', () => {
    const m = buildResultModel({
      family: 'toefl', correctCount: 1, totalScored: 11, scorePercent: 9,
      cards: [
        { ...card(), position: 0 },
        { ...card({ type: 'fill_in_blanks', blanks: [{ id: 1, answer: 'a' }, { id: 2, answer: 'b' }] }), position: 1 },
        { ...card(), position: 2 },
      ],
    })
    expect(m.numbered).toBe(true)
    expect(m.rows.map(r => r.range)).toEqual([
      { startAt: 1, endAt: 1 }, { startAt: 2, endAt: 3 }, { startAt: 4, endAt: 4 },
    ])
    expect(m.deliveredTotal).toBe(4)
  })

  it('resolves each row\'s displayed answer by type', () => {
    const m = buildResultModel({
      family: 'toefl', correctCount: 0, totalScored: 2, scorePercent: 0,
      cards: [
        card({ type: 'fill_in_blanks', correct_answer: '', blanks: [{ id: 1, answer: 'ous' }] }),
        { ...card({ type: 'writing_email' }), ungraded: true },
      ],
    })
    expect(m.rows[0]!.correctAnswerDisplay).toBe('[1] ous')
    expect(m.rows[1]!.correctAnswerDisplay).toBe('—')
    expect(m.rows[1]!.ungraded).toBe(true)
    // ungraded and isPilot are different things and must not alias.
    expect(m.rows[1]!.isPilot).toBe(false)
  })
})

describe('tallyRows', () => {
  const rows = (specs: { ungraded?: boolean; isPilot?: boolean; answered?: boolean; blanks?: number }[]) =>
    specs.map(s => ({
      question: s.blanks
        ? { prompt: 'p', type: 'fill_in_blanks', blanks: Array.from({ length: s.blanks }, (_, i) => ({ id: i, answer: 'a' })) }
        : { prompt: 'p', type: 'multiple_choice' },
      studentAnswer: s.answered === false ? null : 'A',
      correct: true,
      ungraded: !!s.ungraded,
      isPilot: !!s.isPilot,
      correctAnswerDisplay: 'A',
      range: null,
    }))

  // THE identity. `counted` is the score's denominator, so the card
  // reconciles with the headline instead of showing a third number.
  // Reproduces live session fd9b9cfd: 30 items, 2 of them 10-blank
  // Complete-the-Words, 13 pilots -> 48 delivered, 35 counted, and the
  // session row records 6/35.
  it('counts QUESTIONS, so `counted` equals the score denominator', () => {
    const t = tallyRows(rows([
      ...Array.from({ length: 13 }, () => ({ isPilot: true })),
      ...Array.from({ length: 15 }, () => ({})),
      { blanks: 10 }, { blanks: 10 },
    ]))
    expect(t.counted).toBe(35)          // == study_sessions.total_count
    expect(t.pilot).toBe(13)
    expect(t.counted + t.pilot + t.rubric).toBe(48)   // == deliveredTotal
    // The bug the account owner hit: item-counting gave 17 here, a number
    // that appeared nowhere else on the screen.
    expect(t.counted).not.toBe(17)
  })

  it('keeps a skipped question INSIDE counted — it still scores', () => {
    // submit's weightedScore zeroes the denominator only for pilots and
    // open response. Pulling blanks out of `counted` would break the
    // identity above the moment a student skipped anything.
    const t = tallyRows(rows([{}, { answered: false }, { answered: false }]))
    expect(t.counted).toBe(3)
    expect(t.skippedWithinCounted).toBe(2)
    expect(t.counted).not.toBe(1)
  })

  it('partitions: counted + pilot + rubric always equals delivered', () => {
    const cases = [
      rows([{}, {}, { isPilot: true }, { ungraded: true }, { answered: false }]),
      rows([]),
      rows([{ isPilot: true, ungraded: true }]),
      rows([{ isPilot: true, blanks: 10 }, { ungraded: true, blanks: 4 }]),
      rows(Array.from({ length: 30 }, (_, i) => ({ isPilot: i < 13 }))),
    ]
    for (const rs of cases) {
      const t = tallyRows(rs)
      const delivered = rs.reduce((n, r) => n + deliveredWeight(r.question), 0)
      expect(t.counted + t.pilot + t.rubric).toBe(delivered)
      expect(t.skippedWithinCounted).toBeLessThanOrEqual(t.counted)
    }
  })

  it('weights a multi-blank item by its blanks, not as one', () => {
    expect(tallyRows(rows([{ blanks: 10 }])).counted).toBe(10)
    expect(tallyRows(rows([{ isPilot: true, blanks: 10 }])).pilot).toBe(10)
  })

  it('classifies rubric before pilot so no question is counted twice', () => {
    const t = tallyRows(rows([{ isPilot: true, ungraded: true }]))
    expect(t).toEqual({ counted: 0, pilot: 0, rubric: 1, skippedWithinCounted: 0 })
  })
})

describe('scaleFraction', () => {
  // TOEFL bands run 1..6 and SAT sections 200..800. Dividing by the max
  // alone would render the WORST possible score as a partly-filled meter,
  // which reads as credit the student did not earn.
  it('puts the floor of a scale at empty, not at a fraction of the max', () => {
    expect(scaleFraction(1, 1, 6)).toBe(0)      // naive 1/6 = 0.167
    expect(scaleFraction(200, 200, 800)).toBe(0) // naive 200/800 = 0.25
    expect(scaleFraction(0, 0, 30)).toBe(0)
  })

  it('puts the ceiling at full and the midpoint at half', () => {
    expect(scaleFraction(6, 1, 6)).toBe(1)
    expect(scaleFraction(3.5, 1, 6)).toBeCloseTo(0.5)
    expect(scaleFraction(500, 200, 800)).toBeCloseTo(0.5)
    expect(scaleFraction(15, 0, 30)).toBeCloseTo(0.5)
  })

  it('clamps out-of-range values instead of overflowing the meter', () => {
    expect(scaleFraction(9, 1, 6)).toBe(1)
    expect(scaleFraction(-4, 1, 6)).toBe(0)
  })

  it('returns 0 for a degenerate scale rather than dividing by zero', () => {
    expect(scaleFraction(5, 3, 3)).toBe(0)
    expect(Number.isNaN(scaleFraction(5, 3, 3))).toBe(false)
  })
})

describe('canNumberRows', () => {
  // 519 of 932 live full-test attempt rows have position NULL (23 of 37
  // sessions). created_at is one shared value per session and ctid rank
  // disagreed with position on 214/413 rows, so those sessions have no
  // recoverable order — they must go unnumbered rather than renumbered.
  it('numbers a session only when EVERY row carries a position', () => {
    expect(canNumberRows([{ position: 0 }, { position: 1 }, { position: 2 }])).toBe(true)
    expect(canNumberRows([{ position: 0 }, { position: null }])).toBe(false)
    expect(canNumberRows([{ position: 0 }, {}])).toBe(false)
  })

  it('treats position 0 as a real position, not a falsy one', () => {
    // `r.position ?? false`-style truthiness would drop the first row of
    // every session, since submit writes position: i starting at 0.
    expect(canNumberRows([{ position: 0 }])).toBe(true)
  })

  it('refuses to number an empty session', () => {
    expect(canNumberRows([])).toBe(false)
  })
})

describe('familyFromTopicSlug', () => {
  // A TOEFL result carried a College Board 200-800 score because the family
  // was never checked. Both directions matter.
  it('separates toefl from sat, and refuses to guess otherwise', () => {
    expect(familyFromTopicSlug('toefl-reading')).toBe('toefl')
    expect(familyFromTopicSlug('toefl-listening')).toBe('toefl')
    expect(familyFromTopicSlug('sat-math')).toBe('sat')
    expect(familyFromTopicSlug('sat-reading-writing')).toBe('sat')
    expect(familyFromTopicSlug('ielts-reading')).toBe('other')
    expect(familyFromTopicSlug(null)).toBe('other')
    // The specific regression: a TOEFL topic must never read as SAT.
    expect(familyFromTopicSlug('toefl-reading')).not.toBe('sat')
  })

  // The post-submit screen has the payload's bare `family` label, the
  // durable screen has the topic slug. Both go through this one rule, so
  // it has to read both — otherwise each screen interprets its own field
  // and they drift, which is the whole failure mode.
  it('reads a bare family label as well as a full slug', () => {
    expect(familyFromTopicSlug('toefl')).toBe('toefl')
    expect(familyFromTopicSlug('sat')).toBe('sat')
    expect(familyFromTopicSlug('TOEFL')).toBe('toefl')
    expect(familyFromTopicSlug(' sat ')).toBe('sat')
  })

  it('does not let a prefix collision claim a family', () => {
    expect(familyFromTopicSlug('satire-reading')).toBe('other')
    expect(familyFromTopicSlug('toeflish')).toBe('other')
  })
})

describe('satSectionFromTopicSlug', () => {
  // estimateSectionScore's 4th argument defaults to 'reading_writing'. A
  // caller that omitted it scored every SAT MATH session on the RW curve —
  // roughly a 90-100 point error shown as the student's estimate.
  it('routes sat-math to the math curve, not the default', () => {
    expect(satSectionFromTopicSlug('sat-math')).toBe('math')
    expect(satSectionFromTopicSlug('sat-math')).not.toBe('reading_writing')
  })

  it('routes reading & writing, and anything unknown, to reading_writing', () => {
    expect(satSectionFromTopicSlug('sat-reading-writing')).toBe('reading_writing')
    expect(satSectionFromTopicSlug(null)).toBe('reading_writing')
  })
})
