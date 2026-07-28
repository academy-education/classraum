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
} from '@/lib/study/test-result'

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
