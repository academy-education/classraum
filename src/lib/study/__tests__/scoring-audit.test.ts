/**
 * Scoring audit 2026-10-04: boundary + property tests across every
 * function that turns answers into a reported number, plus regressions
 * for the defects fixed on this branch. Each regression names the
 * mechanism it guards; each was break-tested by reverting that mechanism.
 */
import { estimateSectionScore, computeSatRoute, satSectionScoreForSession } from '../sat-adaptive'
import { project, satAttemptsFromSessions } from '../projection'
import { bandFromProportion, scoreToeflSection, WEIGHTS_FOR } from '../toefl-section-score'
import { objectiveProportion, hasReportableScore, scoreSplit } from '../test-result'
import {
  decideRubricSessionScore, persistedObjectiveScore, sessionWriteAfterItemGrade,
} from '../session-score-decision'
import { weightedScore } from '../test-grading'
import { scoreActSection } from '../act-test'
import { overallBandFromSections, roundToHalfBand } from '../toeflBands'

const repeatExact = (e: string, a: string) => ({ score: e.trim() === a.trim() ? 5 : 0 })

describe('SAT section estimate', () => {
  const totals = [1, 2, 22, 27, 44, 54]
  it.each(['math', 'reading_writing'] as const)('%s: monotone in correct, easy never above hard, fixed endpoints', sec => {
    for (const t of totals) {
      let prevE = 0, prevH = 0
      for (let c = 0; c <= t; c++) {
        const e = estimateSectionScore(c, t, 'easy', sec).score
        const h = estimateSectionScore(c, t, 'hard', sec).score
        expect(e).toBeGreaterThanOrEqual(prevE)
        expect(h).toBeGreaterThanOrEqual(prevH)
        expect(e).toBeLessThanOrEqual(h)
        expect(e % 10).toBe(0)
        prevE = e; prevH = h
      }
      expect(estimateSectionScore(0, t, 'hard', sec).score).toBe(200)
      expect(estimateSectionScore(t, t, 'hard', sec).score).toBe(800)
    }
    // all blank / empty test
    expect(estimateSectionScore(0, 0, 'easy', sec).score).toBe(200)
  })

  it('routes hard at exactly 60% of module 1, easy one below, with no float slop', () => {
    for (let t = 1; t <= 60; t++) {
      for (let c = 0; c <= t; c++) {
        expect(computeSatRoute(c, t)).toBe(c * 5 >= t * 3 ? 'hard' : 'easy')
      }
    }
    expect(computeSatRoute(17, 27)).toBe('hard')
    expect(computeSatRoute(16, 27)).toBe('easy')
    expect(computeSatRoute(0, 0)).toBe('easy')
  })

  it('per-session estimate needs an SAT slug and an earned route', () => {
    expect(satSectionScoreForSession({ slug: 'sat-math', correctCount: 42, totalCount: 44, module2Route: 'hard' }))
      .toBe(estimateSectionScore(42, 44, 'hard', 'math').score)
    expect(satSectionScoreForSession({ slug: 'sat-reading-writing', correctCount: 19, totalCount: 20, module2Route: null })).toBeNull()
    expect(satSectionScoreForSession({ slug: 'toefl-reading', correctCount: 10, totalCount: 20, module2Route: 'hard' })).toBeNull()
    expect(satSectionScoreForSession({ slug: 'sat-math', correctCount: 0, totalCount: 0, module2Route: 'easy' })).toBeNull()
  })
})

describe('SAT prediction input (regression: percent read as a 200-800 score)', () => {
  // Shape of the one live student with both sections: R&W 44/54 hard
  // (stored score 81.48) and Math 42/44 hard (stored score 95.45).
  const rows = [
    { topic_id: 'rw', completed_at: '2026-08-12T00:00:00Z', correct_count: 44, total_count: 54, module2_route: 'hard' },
    { topic_id: 'm', completed_at: '2026-08-09T00:00:00Z', correct_count: 42, total_count: 44, module2_route: 'hard' },
    // Non-adaptive session: no estimate exists, must not be guessed.
    { topic_id: 'rw', completed_at: '2026-08-24T00:00:00Z', correct_count: 19, total_count: 20, module2_route: null },
  ]
  const slugs = new Map([['rw', 'sat-reading-writing'], ['m', 'sat-math']])

  it('converts counts to section estimates and drops route-less sessions', () => {
    const by = satAttemptsFromSessions(rows, slugs)
    expect(by.get('rw')).toEqual([{ score: estimateSectionScore(44, 54, 'hard', 'reading_writing').score, date: '2026-08-12' }])
    expect(by.get('m')).toEqual([{ score: estimateSectionScore(42, 44, 'hard', 'math').score, date: '2026-08-09' }])
  })

  it('the projected total is on the 400-1600 scale, not pinned to the floor', () => {
    const by = satAttemptsFromSessions(rows, slugs)
    const p = project([
      { key: 'sat-reading-writing', label_en: '', label_ko: '', min: 200, max: 800, attempts: by.get('rw') ?? [] },
      { key: 'sat-math', label_en: '', label_ko: '', min: 200, max: 800, attempts: by.get('m') ?? [] },
    ], 1400, null, new Date('2026-10-04T00:00:00Z'))
    expect(p.current).toBeGreaterThan(1200)
    expect(p.current).toBeLessThanOrEqual(1600)
    expect(p.predicted).toBeGreaterThan(400)
  })
})

describe('TOEFL band', () => {
  it('is monotone and floors at 1, tops at 6', () => {
    let prev = 0
    for (let i = 0; i <= 1000; i++) {
      const b = bandFromProportion(i / 1000)
      expect(b).toBeGreaterThanOrEqual(prev)
      prev = b
    }
    expect(bandFromProportion(0)).toBe(1)
    expect(bandFromProportion(1)).toBe(6)
    expect(bandFromProportion(NaN)).toBe(1)
  })

  it('key-matched band uses the exact proportion, not the rounded percent (regression)', () => {
    // 6/11 = 54.5%: exact -> scaled 16 -> band 3.0; via round(54.5)=55 ->
    // scaled 17 -> band 3.5. The topic-trend chart uses the exact value.
    expect(bandFromProportion(objectiveProportion({ correctCount: 6, totalScored: 11 }))).toBe(3)
    expect(bandFromProportion(Math.round(100 * 6 / 11) / 100)).toBe(3.5)
    expect(objectiveProportion({ correctCount: 0, totalScored: 0 })).toBe(0)
    expect(objectiveProportion({ correctCount: 9, totalScored: 4 })).toBe(1)
  })

  it('overall band = mean of sections to the nearest half band, half rounding up', () => {
    expect(overallBandFromSections([4, 4, 4.5, 4.5])).toBe(4.5)
    expect(overallBandFromSections([4, 4, 4, 4.5])).toBe(4)
    expect(overallBandFromSections([])).toBeNull()
    expect(roundToHalfBand(0)).toBe(1)
  })
})

describe('weightedScore (submit denominators)', () => {
  const ctw = (n: number) => ({ type: 'fill_in_blanks', blanks: Array.from({ length: n }, (_, i) => ({ id: i + 1, answer: `w${i + 1}` })) })
  it('Complete-the-Words is weighted per blank with partial credit, monotone in blanks right', () => {
    const q = ctw(10)
    let prev = -1
    for (let k = 0; k <= 10; k++) {
      const ans: Record<string, string> = {}
      for (let i = 1; i <= k; i++) ans[String(i)] = `w${i}`
      const w = weightedScore(q, JSON.stringify(ans))
      expect(w.total).toBe(10)
      expect(w.correct).toBe(k)
      expect(w.correct).toBeGreaterThan(prev)
      prev = w.correct
    }
    expect(weightedScore(q, null)).toEqual({ total: 10, correct: 0 })
  })
  it('pilots, rubric and unscored essays leave the denominator; a blank stays in it', () => {
    expect(weightedScore({ type: 'multiple_choice', correct_answer: 'A', scored: false }, 'A')).toEqual({ total: 0, correct: 0 })
    for (const type of ['writing_email', 'writing_discussion', 'speaking_interview', 'essay', 'essay_choice']) {
      expect(weightedScore({ type, correct_answer: '' }, 'a long answer here')).toEqual({ total: 0, correct: 0 })
    }
    expect(weightedScore({ type: 'multiple_choice', correct_answer: 'A' }, null)).toEqual({ total: 1, correct: 0 })
    expect(weightedScore({ type: 'multiple_choice', correct_answer: 'A' }, ' a ')).toEqual({ total: 1, correct: 1 })
  })
})

describe('stored objective score (regression: essay section stored 0)', () => {
  it('is null when nothing is key-scorable, 2dp otherwise', () => {
    expect(persistedObjectiveScore(0, 0)).toBeNull()
    expect(persistedObjectiveScore(16, 35)).toBe(45.71)
    expect(persistedObjectiveScore(0, 35)).toBe(0)
    expect(persistedObjectiveScore(35, 35)).toBe(100)
  })
  it('result screen reports "not scored" rather than 0% for such a section', () => {
    expect(hasReportableScore({ pointsMax: null, totalScored: 0 })).toBe(false)
    expect(hasReportableScore({ pointsMax: 0, totalScored: 0 })).toBe(false)
    expect(hasReportableScore({ pointsMax: null, totalScored: 1 })).toBe(true)
    expect(hasReportableScore({ pointsMax: 20, totalScored: 0 })).toBe(true)
  })
})

describe('rubric session score (persist-session-score decision)', () => {
  const writing = (bands: [number | null, number | null], arrangeRight: number) => [
    ...Array.from({ length: 10 }, (_, i) => ({ type: 'arrange_words', correct: i < arrangeRight, studentAnswer: 'x' })),
    { type: 'writing_email', studentAnswer: 'reply', rubricBand: bands[0] },
    { type: 'writing_discussion', studentAnswer: 'post', rubricBand: bands[1] },
  ]
  it('scores from ALL items with the section weights (regression: one task band overwrote it)', () => {
    const d = decideRubricSessionScore(writing([5, 4], 6), 'writing', repeatExact)
    // 6/10 x .20 + 5/5 x .35 + 4/5 x .45 = .830
    expect(d.score).toBe(83)
    // Session 7d59735a's shape: build-a-sentence + two band-3 tasks. The
    // stored 60 was one task's band (3/5); the section is not 60.
    const live = decideRubricSessionScore(writing([3, 3], 4), 'writing', repeatExact)
    expect(live.score).toBe(Math.round(10000 * (0.4 * 0.2 + 0.6 * 0.35 + 0.6 * 0.45)) / 100)
    expect(live.score).not.toBe(60)
  })
  it('holds while a rubric answer awaits its band', () => {
    expect(decideRubricSessionScore(writing([5, null], 6), 'writing', repeatExact))
      .toMatchObject({ score: null, reason: 'grading incomplete', ungraded: 1, graded: 1 })
  })
  it('never waits on an unscored essay type and never writes 0 for an unscorable section', () => {
    const items = [...writing([5, 4], 6), { type: 'essay', studentAnswer: 'an essay', rubricBand: null }]
    expect(decideRubricSessionScore(items, 'writing', repeatExact).score).toBe(83)
    const essayOnly = [{ type: 'essay', studentAnswer: 'an essay', rubricBand: null }]
    expect(decideRubricSessionScore(essayOnly, 'writing', repeatExact))
      .toMatchObject({ score: null, reason: 'nothing scorable' })
  })
  it('a session nobody answered stays null, not 0', () => {
    const blank = [{ type: 'arrange_words', correct: false, studentAnswer: null }]
    expect(decideRubricSessionScore(blank, 'writing', repeatExact)).toMatchObject({ score: null, reason: 'nothing answered' })
  })
  it('agrees with the result screen scorer on a fully graded section', () => {
    const items = writing([2, 5], 3)
    const screen = scoreToeflSection(items, WEIGHTS_FOR.writing, repeatExact)
    expect(decideRubricSessionScore(items, 'writing', repeatExact).score)
      .toBe(Math.round(10000 * screen.proportion) / 100)
  })
})

describe('per-item grade route session write (regression)', () => {
  it('a full test is only ever recomputed, never overwritten with one band', () => {
    expect(sessionWriteAfterItemGrade('full_test', 3, 5)).toEqual({ kind: 'recompute_full_test' })
  })
  it('a response session is that one answer', () => {
    const w = sessionWriteAfterItemGrade('response', 3, 5, new Date('2026-10-04T00:00:00Z'))
    expect(w).toEqual({ kind: 'response_session', update: { status: 'completed', completed_at: '2026-10-04T00:00:00.000Z', score: 60 } })
  })
})

describe('ACT section raw', () => {
  it('rights only, percent to one decimal, empty section is 0 not NaN', () => {
    expect(scoreActSection('english', { correct: 27, wrong: 14, omitted: 9 })).toMatchObject({ raw: 27, maxRaw: 50, percentCorrect: 54, scaled: null })
    expect(scoreActSection('math', { correct: 0, wrong: 0, omitted: 0 }).percentCorrect).toBe(0)
  })
})

describe('scoreSplit and unscored essays', () => {
  it('an answered essay is not reported as pending rubric work', () => {
    const row = (type: string, answer: string | null) => ({
      question: { type, prompt: type }, studentAnswer: answer, correct: false, ungraded: true,
      isPilot: false, correctAnswerDisplay: '—', range: null, position: 0,
    })
    const s = scoreSplit([row('essay', 'my essay')], {})
    expect(s.hasRubric).toBe(false)
    expect(s.rubric.pending).toBe(0)
    expect(scoreSplit([row('writing_email', 'reply')], {}).rubric.pending).toBe(1)
  })
})
