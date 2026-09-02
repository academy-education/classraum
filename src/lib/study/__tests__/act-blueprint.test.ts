/** @jest-environment node */
/**
 * Pins the ACT blueprint to the ENHANCED ACT as ACT itself publishes it,
 * read off forms 25MC1 and 25MC5 on 2026-09-02.
 *
 * Every assertion here is a place where the legacy format would give a
 * different answer, so a regression to a stale source fails loudly:
 * Math at five choices, English at 75 questions, Science in the
 * Composite, Reading at ten per passage. The repo already held one such
 * regression — study-prompt-context.ts said "5-choice for Math" and
 * "60 questions in 60 minutes" until today, and that string is injected
 * into generation prompts.
 */
import {
  ACT_BLUEPRINT, actSection, actFormTotals, actLettersFor, scoreAct, scoreActSection,
  ENGLISH_PASSAGES, ENGLISH_ITEMS_PER_PASSAGE,
  READING_PASSAGES, READING_ITEMS_PER_PASSAGE, READING_GENRE_ORDER, READING_PAIRED_PASSAGES,
  SCIENCE_PASSAGES, SCIENCE_FORMAT_PASSAGES, SCIENCE_ITEMS_PER_PASSAGE,
  ACT_QUOTAS, SCIENCE_FORMAT_QUOTAS, MATH_QUOTAS, MATH_HIGHER_MATH_SHARE,
  ACT_COMPOSITE_SECTIONS,
} from '../act-test'

describe('section counts and clocks match the published enhanced ACT', () => {
  it.each([
    ['english', 50, 35],
    ['math',    45, 50],
    ['reading', 36, 40],
    ['science', 40, 40],
    ['writing',  1, 40],
  ] as const)('%s is %i questions in %i minutes', (key, q, m) => {
    const s = actSection(key)
    expect(s.questions).toBe(q)
    expect(s.minutes).toBe(m)
  })

  it('delivers in the real order: English, Math, Reading, Science, Writing', () => {
    expect(ACT_BLUEPRINT.map(b => b.key)).toEqual(['english', 'math', 'reading', 'science', 'writing'])
  })

  it('is FOUR choices in every multiple-choice section, Math included', () => {
    // The single biggest enhanced-vs-legacy difference. Legacy Math was 5.
    for (const b of ACT_BLUEPRINT) {
      if (b.key === 'writing') expect(b.choiceCount).toBe(0)
      else expect(b.choiceCount).toBe(4)
    }
  })

  it('core form is 131 questions in 125 minutes; with Science 171 in 165', () => {
    expect(actFormTotals({ science: false, writing: false })).toEqual({ questions: 131, minutes: 125 })
    expect(actFormTotals({ science: true,  writing: false })).toEqual({ questions: 171, minutes: 165 })
    expect(actFormTotals({ science: true,  writing: true  })).toEqual({ questions: 171, minutes: 205 })
  })
})

describe('Science is optional and outside the Composite; Writing is unscored', () => {
  it('marks exactly Science and Writing optional', () => {
    expect(ACT_BLUEPRINT.filter(b => b.optional).map(b => b.key)).toEqual(['science', 'writing'])
  })

  it('composes only English, Math and Reading', () => {
    expect(ACT_COMPOSITE_SECTIONS).toEqual(['english', 'math', 'reading'])
    expect(ACT_BLUEPRINT.filter(b => b.inComposite).map(b => b.key)).toEqual(['english', 'math', 'reading'])
    expect(actSection('science').inComposite).toBe(false)
  })

  it('scores Science but never folds it into the Composite', () => {
    expect(actSection('science').scored).toBe(true)
    expect(actSection('writing').scored).toBe(false)
  })
})

describe('passage structure the question count cannot carry', () => {
  it('English: five passages of ten', () => {
    expect(ENGLISH_PASSAGES * ENGLISH_ITEMS_PER_PASSAGE).toBe(actSection('english').questions)
  })

  it('Reading: four passages of nine, fixed genre order, exactly one paired', () => {
    expect(READING_PASSAGES * READING_ITEMS_PER_PASSAGE).toBe(actSection('reading').questions)
    expect(READING_GENRE_ORDER).toEqual(['literary_narrative', 'social_science', 'humanities', 'natural_science'])
    expect(new Set(READING_GENRE_ORDER).size).toBe(READING_PASSAGES)
    expect(READING_PAIRED_PASSAGES).toBe(1)
  })

  it('Science: seven passages in a 2/3/2 format split that can hold 40 items', () => {
    const passages = Object.values(SCIENCE_FORMAT_PASSAGES).reduce((a, b) => a + b, 0)
    expect(passages).toBe(SCIENCE_PASSAGES)
    // 7 passages at 5-6 items each spans 35-42; 40 is inside.
    expect(SCIENCE_PASSAGES * SCIENCE_ITEMS_PER_PASSAGE.min).toBeLessThanOrEqual(40)
    expect(SCIENCE_PASSAGES * SCIENCE_ITEMS_PER_PASSAGE.max).toBeGreaterThanOrEqual(40)
  })

  it('records that the shipped Science form CONTRADICTS the published format shares', () => {
    /*
     * Form 25MC5: DR 10, RS 18, CV 12 of 40 = 25% / 45% / 30%.
     * Published: DR 26-32, RS 50-56, CV 18-21.
     * Two six-item CV passages cannot fit under a 21% ceiling (8.4 items).
     *
     * This test FAILS if someone reconciles them - by dropping to one CV
     * passage, or by widening the CV quota to 30 - because either edit
     * would be inventing a fact about the ACT to make our numbers tidy.
     * Both are kept as ACT states them, and the contradiction is the
     * documented state. If ACT publishes a reconciliation, change both
     * here and in act-test.ts together, citing it.
     */
    const observed = { data_representation: 10, research_summaries: 18, conflicting_viewpoints: 12 }
    const cvShare = (100 * observed.conflicting_viewpoints) / 40
    expect(SCIENCE_FORMAT_PASSAGES.conflicting_viewpoints).toBe(2)          // what ACT ships
    expect(SCIENCE_FORMAT_QUOTAS.conflicting_viewpoints).toEqual([18, 21])   // what ACT publishes
    expect(cvShare).toBeGreaterThan(SCIENCE_FORMAT_QUOTAS.conflicting_viewpoints[1]) // and they disagree
  })
})

describe('published content quotas are internally consistent', () => {
  it.each(Object.entries(ACT_QUOTAS))('%s: minimums do not exceed 100 and maximums cover it', (_key, quotas) => {
    const mins = Object.values(quotas).reduce((a, [lo]) => a + lo, 0)
    const maxs = Object.values(quotas).reduce((a, [, hi]) => a + hi, 0)
    expect(mins).toBeLessThanOrEqual(100)
    expect(maxs).toBeGreaterThanOrEqual(100)
    for (const [lo, hi] of Object.values(quotas)) expect(lo).toBeLessThanOrEqual(hi)
  })

  it('Math: the five higher-math categories sum to the published 80%', () => {
    const higher = ['Number and Quantity', 'Algebra', 'Functions', 'Geometry', 'Statistics and Probability']
    const mins = higher.reduce((a, k) => a + MATH_QUOTAS[k][0], 0)
    const maxs = higher.reduce((a, k) => a + MATH_QUOTAS[k][1], 0)
    const [share] = MATH_HIGHER_MATH_SHARE
    expect(mins).toBeLessThanOrEqual(share)
    expect(maxs).toBeGreaterThanOrEqual(share)
    expect(MATH_QUOTAS['Integrating Essential Skills']).toEqual([20, 20])
  })
})

describe('option lettering alternates A-D / F-J', () => {
  it('odd positions are A-D, even are F-J', () => {
    expect(actLettersFor(1)).toEqual(['A', 'B', 'C', 'D'])
    expect(actLettersFor(2)).toEqual(['F', 'G', 'H', 'J'])
    expect(actLettersFor(45)).toEqual(['A', 'B', 'C', 'D'])
    expect(actLettersFor(50)).toEqual(['F', 'G', 'H', 'J'])
  })

  it('never uses E or I', () => {
    for (let n = 1; n <= 50; n++) {
      const letters = actLettersFor(n)
      expect(letters).not.toContain('E')
      expect(letters).not.toContain('I')
      expect(letters).toHaveLength(4)
    }
  })
})

describe('scoring is rights-only with no scaled score and no Composite', () => {
  it('does not penalise a wrong answer', () => {
    // 20 right / 10 wrong / 6 blank on Reading: raw is 20, not 17.5.
    const s = scoreActSection('reading', { correct: 20, wrong: 10, omitted: 6 })
    expect(s.raw).toBe(20)
    expect(s.maxRaw).toBe(36)
    expect(s.percentCorrect).toBe(55.6)
  })

  it('is unaffected by how many were left blank at equal accuracy', () => {
    const a = scoreActSection('math', { correct: 30, wrong: 15, omitted: 0 })
    const b = scoreActSection('math', { correct: 30, wrong: 0,  omitted: 15 })
    expect(a.raw).toBe(b.raw)
  })

  it('reports null for scaled and Composite, with the reason', () => {
    const r = scoreAct({
      english: { correct: 40, wrong: 10, omitted: 0 },
      math:    { correct: 30, wrong: 15, omitted: 0 },
      reading: { correct: 27, wrong: 9,  omitted: 0 },
      science: { correct: 30, wrong: 10, omitted: 0 },
    })
    expect(r.composite).toBeNull()
    for (const s of r.sections) expect(s.scaled).toBeNull()
    expect(r.scaleNote).toMatch(/1-36/)
    expect(r.scaleNote).toMatch(/Science is excluded/)
  })

  it('never scores the essay as a section', () => {
    const r = scoreAct({ writing: { correct: 1, wrong: 0, omitted: 0 } })
    expect(r.sections).toHaveLength(0)
  })
})
