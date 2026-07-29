import {
  combineParts, bandFromProportion, scoreToeflSection,
  SPEAKING_WEIGHTS, WRITING_WEIGHTS, type ScorePart, type ScorableItem,
} from '@/lib/study/toefl-section-score'
import { scoreListenRepeat } from '@/lib/study/listen-repeat-accuracy'

const speaking = (repeatEarned: number, interviewEarned: number): ScorePart[] => [
  { key: 'listen_repeat', earned: repeatEarned, max: 35, weight: SPEAKING_WEIGHTS.listen_repeat },
  { key: 'take_interview', earned: interviewEarned, max: 20, weight: SPEAKING_WEIGHTS.take_interview },
]

describe('combineParts', () => {
  it('weights the interview above the repeats', () => {
    // Same proportion in each part must give that proportion overall...
    expect(combineParts(speaking(35, 20)).proportion).toBeCloseTo(1)
    expect(combineParts(speaking(0, 0)).proportion).toBeCloseTo(0)

    // ...but a perfect interview must beat a perfect set of repeats,
    // which is the whole point of the chosen weights.
    const strongInterview = combineParts(speaking(0, 20)).proportion
    const strongRepeats = combineParts(speaking(35, 0)).proportion
    expect(strongInterview).toBeCloseTo(0.60)
    expect(strongRepeats).toBeCloseTo(0.40)
    expect(strongInterview).toBeGreaterThan(strongRepeats)
  })

  it('reports raw points alongside the proportion', () => {
    const s = combineParts(speaking(28, 12))
    expect(s.earned).toBe(40)
    expect(s.max).toBe(55)
    // NOT 40/55 — the proportion is weighted, the points are not. Both
    // are shown, and they are allowed to disagree.
    expect(s.proportion).toBeCloseTo(0.40 * (28 / 35) + 0.60 * (12 / 20))
    expect(s.proportion).not.toBeCloseTo(40 / 55)
  })

  it('drops an undelivered part and renormalises the rest', () => {
    // A Speaking test where no interview item graded. The student must
    // be scored on the repeats alone, not given zero for the interview.
    const s = combineParts([
      { key: 'listen_repeat', earned: 28, max: 35, weight: 0.40 },
      { key: 'take_interview', earned: 0, max: 0, weight: 0.60 },
    ])
    expect(s.proportion).toBeCloseTo(28 / 35)
    expect(s.max).toBe(35)
    expect(s.parts.find(p => p.key === 'take_interview')!.effectiveWeight).toBe(0)
  })

  it('does not divide by zero when nothing was delivered', () => {
    const s = combineParts([{ key: 'a', earned: 0, max: 0, weight: 1 }])
    expect(s.proportion).toBe(0)
    expect(s.max).toBe(0)
  })

  it('orders writing tasks by weight as specified', () => {
    const w = WRITING_WEIGHTS
    expect(w.build_a_sentence).toBeLessThan(w.write_email)
    expect(w.write_email).toBeLessThan(w.academic_discussion)
    expect(w.build_a_sentence + w.write_email + w.academic_discussion).toBeCloseTo(1)
  })

  it('gives the essays three quarters of the writing score', () => {
    // Perfect essays, zero sentence-building.
    const s = combineParts([
      { key: 'build_a_sentence', earned: 0, max: 10, weight: WRITING_WEIGHTS.build_a_sentence },
      { key: 'write_email', earned: 5, max: 5, weight: WRITING_WEIGHTS.write_email },
      { key: 'academic_discussion', earned: 5, max: 5, weight: WRITING_WEIGHTS.academic_discussion },
    ])
    expect(s.proportion).toBeCloseTo(0.80)
  })

  it('never leaves the 0-1 range', () => {
    const over = combineParts([{ key: 'a', earned: 99, max: 10, weight: 1 }])
    expect(over.proportion).toBe(1)
  })
})

describe('bandFromProportion', () => {
  it('matches the mapping reading and listening already use', () => {
    // 40% is the real Listening result verified on screen: band 2.5.
    expect(bandFromProportion(0.4)).toBe(2.5)
    expect(bandFromProportion(1)).toBe(6)
  })

  it('floors at 1, because the published scale starts there', () => {
    expect(bandFromProportion(0)).toBe(1)
    expect(bandFromProportion(0.05)).toBe(1)
  })

  it('only emits half bands and never goes backwards', () => {
    let prev = 0
    for (let p = 0; p <= 1.0001; p += 0.01) {
      const b = bandFromProportion(p)
      expect(b * 2).toBe(Math.round(b * 2))
      expect(b).toBeGreaterThanOrEqual(prev)
      prev = b
    }
  })
})


describe('scoreToeflSection', () => {
  const repeat = (expected: string, said: string): ScorableItem =>
    ({ type: 'speaking_repeat', expectedText: expected, studentAnswer: said })
  const interview = (band: number | null): ScorableItem =>
    ({ type: 'speaking_interview', rubricBand: band })

  const SENT = 'She works at the library on Friday afternoons'

  it('gives a near-miss repeat partial credit instead of zero', () => {
    // A real transcript from a real session. Under the old model this
    // failed an exact match and scored 0 out of 1. One function word and
    // a plural marker is an ETS 4.
    const s = scoreToeflSection(
      [repeat(SENT, 'She works at the library Friday afternoon')],
      SPEAKING_WEIGHTS, scoreListenRepeat,
    )
    expect(s.earned).toBe(4)
    expect(s.max).toBe(5)
  })

  it('drops an ungraded open response from both sides of the fraction', () => {
    // Half-graded must read as a SHORTER test, not a worse one.
    const graded = scoreToeflSection(
      [repeat(SENT, SENT), interview(4), interview(null)],
      SPEAKING_WEIGHTS, scoreListenRepeat,
    )
    expect(graded.max).toBe(10)   // 5 repeat + 5 for the one graded item
    expect(graded.parts.find(p => p.key === 'take_interview')!.max).toBe(5)
  })

  it('does not score a repeat with no target sentence', () => {
    const s = scoreToeflSection(
      [repeat('', 'anything at all')], SPEAKING_WEIGHTS, scoreListenRepeat)
    expect(s.max).toBe(0)
  })

  it('weights a whole speaking section the way we specified', () => {
    // Perfect repeats, failed interviews.
    const s = scoreToeflSection([
      ...Array.from({ length: 7 }, () => repeat(SENT, SENT)),
      ...Array.from({ length: 4 }, () => interview(0)),
    ], SPEAKING_WEIGHTS, scoreListenRepeat)
    expect(s.earned).toBe(35)
    expect(s.max).toBe(55)
    // 40% weight on the perfect half, not 35/55 = 64%.
    expect(s.proportion).toBeCloseTo(0.40)
  })

  it('scores build-a-sentence one point each', () => {
    const s = scoreToeflSection([
      { type: 'arrange_words', correct: true },
      { type: 'arrange_words', correct: false },
      { type: 'writing_discussion', rubricBand: 5 },
    ], WRITING_WEIGHTS, scoreListenRepeat)
    const bas = s.parts.find(p => p.key === 'build_a_sentence')!
    expect(bas.earned).toBe(1)
    expect(bas.max).toBe(2)
  })

  it('ignores item types that belong to another section', () => {
    const s = scoreToeflSection(
      [{ type: 'multiple_choice', correct: true }, repeat(SENT, SENT)],
      SPEAKING_WEIGHTS, scoreListenRepeat,
    )
    expect(s.max).toBe(5)
  })
})
