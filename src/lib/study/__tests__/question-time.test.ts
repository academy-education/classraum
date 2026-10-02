import {
  initQuestionTime, checkpointQuestionTime, restoreQuestionTime, questionSecondsArray,
  reconcileQuestionSeconds, type QuestionTimeState,
} from '../question-time'
import { buildResultModel, testTiming } from '../test-result'

/** Replays a TestSession timeline: [elapsedMs at the event, question now on screen]. */
function replay(events: [number, number | null][]): QuestionTimeState {
  let st = initQuestionTime(0)
  let idx: number | null = null
  for (const [elapsed, next] of events) {
    st = checkpointQuestionTime(st, idx, elapsed)
    idx = next
  }
  return st
}

describe('checkpointQuestionTime — credit by attribution', () => {
  it('credits each span to the question that was on screen, and revisits ADD up', () => {
    // Q0 for 10s, Q1 for 5s, back to Q0 for 7s, submit at 22s.
    const st = replay([[0, 0], [10_000, 1], [15_000, 0], [22_000, null]])
    expect(st.ms).toEqual({ 0: 17_000, 1: 5_000 })
  })

  it('credits nothing while the active clock is frozen (hidden tab / pause / audio)', () => {
    // The clock stops while hidden, so `elapsed` does not move: a 10-minute
    // tab-away between two checkpoints arrives as the same elapsed value.
    const st = replay([[0, 0], [4_000, 0], [4_000, 0], [9_000, null]])
    expect(st.ms).toEqual({ 0: 9_000 })
  })

  it('never subtracts when elapsed goes backwards (reload restored a staler save)', () => {
    let st = initQuestionTime(0)
    st = checkpointQuestionTime(st, 0, 10_000)
    st = checkpointQuestionTime(st, 0, 9_000)   // behind the mark
    expect(st.ms[0]).toBe(10_000)
    expect(st.markMs).toBe(9_000)
    st = checkpointQuestionTime(st, 0, 12_000)
    expect(st.ms[0]).toBe(13_000)
  })

  it('sums to the elapsed clock it was carved from', () => {
    const st = replay([[0, 0], [3_200, 2], [8_900, 1], [20_100, 2], [31_000, null]])
    const total = Object.values(st.ms).reduce((a, b) => a + b, 0)
    expect(total).toBe(31_000)
  })
})

describe('restoreQuestionTime', () => {
  it('round-trips through JSON and clamps the mark to the restored clock', () => {
    const saved = JSON.parse(JSON.stringify({ ms: { 0: 5_000, 3: 2_000 }, markMs: 7_500 }))
    const st = restoreQuestionTime(saved, 7_000)
    expect(st.ms).toEqual({ 0: 5_000, 3: 2_000 })
    expect(st.markMs).toBe(7_000)
  })

  it('drops malformed entries rather than inventing time', () => {
    const st = restoreQuestionTime({ ms: { 0: 'x', '-1': 5, a: 3, 2: -4, 4: 1_000 }, markMs: 'no' }, 3_000)
    expect(st.ms).toEqual({ 4: 1_000 })
    expect(st.markMs).toBe(3_000)
    expect(restoreQuestionTime(null, 50)).toEqual({ ms: {}, markMs: 50 })
  })
})

describe('reconcileQuestionSeconds (server)', () => {
  const answers = ['A', null, 'B']

  it('uses the measured seconds when they are complete and add up to elapsed', () => {
    expect(reconcileQuestionSeconds({ questionSeconds: [200, 40, 60], elapsedSeconds: 300, answers, count: 3 }))
      .toEqual({ basis: 'measured', seconds: [200, 40, 60] })
  })

  it('tolerates per-slot rounding', () => {
    // Three slots, each rounded by up to half a second.
    expect(reconcileQuestionSeconds({ questionSeconds: [101, 101, 100], elapsedSeconds: 300, answers, count: 3 }).basis)
      .toBe('measured')
  })

  it.each([
    ['missing', undefined],
    ['wrong length', [150, 150]],
    ['does not add up', [20, 4, 6]],
    ['non-integer', [100.5, 99.5, 100]],
    ['all zero', [0, 0, 0]],
  ])('falls back to the even split when %s', (_label, qs) => {
    expect(reconcileQuestionSeconds({ questionSeconds: qs as number[] | undefined, elapsedSeconds: 300, answers, count: 3 }))
      .toEqual({ basis: 'even_split', seconds: [100, null, 100] })
  })

  it('does not treat an all-zero array as a measurement even when the clock is near zero', () => {
    // Within rounding slack of elapsed, so only the sum > 0 guard refuses it.
    expect(reconcileQuestionSeconds({ questionSeconds: [0, 0, 0], elapsedSeconds: 2, answers, count: 3 }))
      .toEqual({ basis: 'even_split', seconds: [1, null, 1] })
  })
})

it('end to end: unequal per-question times make testTiming split by task', () => {
  // Client timeline -> seconds array -> what the server writes -> the
  // result screen. Daily Life 10s+20s, Academic 60s+50s; 140s total.
  const st = replay([[0, 0], [10_000, 1], [30_000, 2], [90_000, 3], [140_000, null]])
  const qs = questionSecondsArray(st, 4)
  expect(qs).toEqual([10, 20, 60, 50])
  const written = reconcileQuestionSeconds({ questionSeconds: qs, elapsedSeconds: 140, answers: ['A', 'B', 'C', 'D'], count: 4 })
  expect(written.basis).toBe('measured')

  const prompts = ['[Daily Life] a', '[Daily Life] b', '[Academic Passage] c', '[Academic Passage] d']
  const m = buildResultModel({
    family: 'toefl', correctCount: 2, totalScored: 4, scorePercent: 50,
    cards: prompts.map((prompt, i) => ({
      question: { prompt, type: 'multiple_choice' },
      studentAnswer: 'A', correct: i % 2 === 0, ungraded: false, position: i,
      timeSpentSeconds: written.seconds[i],
    })),
  })
  const timing = testTiming({ rows: m.rows, deliveredTotal: m.deliveredTotal })
  expect(timing?.basis).toBe('measured')
  expect(timing?.totalSeconds).toBe(140)
  expect(timing?.perTask).toEqual([
    { label: 'Academic Passage', cards: 2, avgSeconds: 55 },
    { label: 'Daily Life', cards: 2, avgSeconds: 15 },
  ])
})
