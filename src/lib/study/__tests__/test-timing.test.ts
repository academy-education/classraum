import { buildResultModel, testTiming, type ResultCardInput } from '../test-result'

/**
 * testTiming exists to REFUSE a per-task time table on the data we
 * actually have. Every full_test session in the live DB (198 of 198 timed,
 * 2026-10-02) stores ONE distinct time_spent_seconds value: submit writes
 * round(elapsed / cards) on every answered row and NULL on blanks. These
 * fixtures are that shape.
 */

const card = (prompt: string, t: number | null, extra: Partial<ResultCardInput['question']> = {}): ResultCardInput => ({
  question: { prompt, type: 'multiple_choice', ...extra },
  studentAnswer: t == null ? null : 'A',
  correct: false,
  ungraded: false,
  timeSpentSeconds: t,
})

function model(cards: ResultCardInput[]) {
  return buildResultModel({ family: 'toefl', correctCount: 0, totalScored: 1, scorePercent: 0, cards })
}

describe('testTiming — the even split (the only shape in the live DB)', () => {
  // Reading: 2 Daily Life + 2 Academic + one CtW paragraph of 10 blanks.
  // 5 cards, 14 delivered questions, one blank (NULL), every timed row 30s.
  const m = model([
    card('[Daily Life] Read the notice', 30),
    card('[Daily Life] Read the email', null),
    card('[Academic Passage] Read the passage', 30),
    card('[Academic Passage] Read again', 30),
    card('[Complete the Words] Fill the blanks', 30, {
      type: 'fill_in_blanks',
      blanks: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, answer: 'x' })),
    }),
  ])
  const timing = testTiming({ rows: m.rows, deliveredTotal: m.deliveredTotal })

  it('refuses a per-task table when every row holds the same value', () => {
    // Two-plus labelled tasks are present, so only the uniformity guard
    // can make this null.
    expect(timing?.basis).toBe('even_split')
    expect(timing?.perTask).toBeNull()
  })

  it('reconstructs the sitting over EVERY card, blanks included', () => {
    // submit divided by cards (5); the blank still took time.
    expect(timing?.totalSeconds).toBe(150)
  })

  it('averages per DELIVERED question, not per card', () => {
    expect(m.deliveredTotal).toBe(14)
    expect(timing?.perQuestionSeconds).toBeCloseTo(150 / 14, 6)
  })
})

describe('testTiming — the exact clock', () => {
  it('prefers the elapsed seconds the client sent over the rebuilt value', () => {
    const m = model([card('[A] q', 30), card('[B] q', 30)])
    const timing = testTiming({ rows: m.rows, deliveredTotal: m.deliveredTotal, elapsedSeconds: 61 })
    expect(timing).toEqual({ totalSeconds: 61, perQuestionSeconds: 30.5, basis: 'elapsed', perTask: null })
  })

  it('still answers when the rows carry no time yet but the clock exists', () => {
    const m = model([card('[A] q', null), card('[B] q', null)])
    expect(testTiming({ rows: m.rows, deliveredTotal: 2, elapsedSeconds: 40 })?.totalSeconds).toBe(40)
  })

  it('returns null with no time anywhere, rather than "0s per question"', () => {
    const m = model([card('[A] q', null), card('[B] q', null)])
    expect(testTiming({ rows: m.rows, deliveredTotal: 2 })).toBeNull()
    expect(testTiming({ rows: m.rows, deliveredTotal: 2, elapsedSeconds: 0 })).toBeNull()
  })
})

describe('testTiming — genuinely per-question timing', () => {
  it('splits by the same normalised label the section breakdown uses, slowest first', () => {
    const m = model([
      card('[Academic Talk - Geology] q1', 40),
      card('[Academic Talk — Biology] q2', 60),
      card('[Conversation] q3', 10),
      card('[Conversation] q4', 20),
    ])
    const timing = testTiming({ rows: m.rows, deliveredTotal: m.deliveredTotal })
    expect(timing?.basis).toBe('measured')
    expect(timing?.totalSeconds).toBe(130)
    expect(timing?.perTask).toEqual([
      { label: 'Academic Talk', cards: 2, avgSeconds: 50 },
      { label: 'Conversation', cards: 2, avgSeconds: 15 },
    ])
  })

  it('one task is not a split', () => {
    const m = model([card('[Conversation] a', 10), card('[Conversation] b', 20)])
    expect(testTiming({ rows: m.rows, deliveredTotal: 2 })?.perTask).toBeNull()
  })
})

it('buildResultModel carries the stored time onto the row', () => {
  const m = model([card('[A] q', 17), card('[B] q', null)])
  expect(m.rows.map(r => r.timeSpentSeconds)).toEqual([17, null])
})
