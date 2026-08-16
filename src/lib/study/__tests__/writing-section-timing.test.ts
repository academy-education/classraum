/** @jest-environment node */
/**
 * TOEFL Writing per-section timing — the pure splitting / countdown /
 * expiry-marking logic TestSession drives its hard-advance flow with.
 *
 * Revert-check (repo standard, verified once by hand when this suite
 * landed): each mechanism fails its test when reverted —
 *  - drop the `sections.length < 2 → null` guard and the warmup/drill
 *    fallback tests fail;
 *  - change any WRITING_SECTION_MINUTES entry and both the per-kind
 *    budget test and the spec-reconciliation test fail;
 *  - make blankUnansweredInSection wipe answered slots (or skip ''
 *    normalisation) and the marking tests fail;
 *  - remove the elapsed clamp in writingSectionRemainingMs and the
 *    clamp test fails.
 */
import {
  WRITING_SECTION_MINUTES,
  splitWritingSections,
  writingSectionForIndex,
  writingSectionRemainingMs,
  blankUnansweredInSection,
  type WritingSection,
} from '@/lib/study/writing-section-timing'
import { TOEFL_META } from '@/lib/study/assemble'
import { TEST_SPECS } from '@/lib/test-specs'

// assemble.ts builds a Supabase admin client at module scope, which throws
// without service-role env. TOEFL_META is a pure constant — a bare stub is
// enough to let the module load. Same pattern as toefl-adaptive.test.ts.
jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))

/** The shipped Writing delivery order: 10 Build-a-Sentence, 1 Email,
 *  1 Academic Discussion (TOEFL_META.writing.mix). */
const fullWriting = () => [
  ...Array.from({ length: 10 }, () => ({ type: 'arrange_words' })),
  { type: 'writing_email' },
  { type: 'writing_discussion' },
]

describe('splitWritingSections', () => {
  it('splits the shipped Writing form into 6 / 7 / 10 minute blocks', () => {
    const sections = splitWritingSections(fullWriting())
    expect(sections).toEqual([
      { kind: 'build_sentence', startIdx: 0, endIdx: 10, minutes: 6 },
      { kind: 'email', startIdx: 10, endIdx: 11, minutes: 7 },
      { kind: 'discussion', startIdx: 11, endIdx: 12, minutes: 10 },
    ] satisfies WritingSection[])
  })

  it('uses Andy\'s per-task budgets: 6 (sentences), 7 (email), 10 (discussion)', () => {
    expect(WRITING_SECTION_MINUTES).toEqual({ build_sentence: 6, email: 7, discussion: 10 })
  })

  it('groups by consecutive runs in delivery order, not by type globally', () => {
    // Hypothetical interleaved delivery — each run is its own section.
    const sections = splitWritingSections([
      { type: 'arrange_words' }, { type: 'arrange_words' },
      { type: 'writing_email' },
      { type: 'arrange_words' },
    ])!
    expect(sections.map(s => [s.kind, s.startIdx, s.endIdx])).toEqual([
      ['build_sentence', 0, 2],
      ['email', 2, 3],
      ['build_sentence', 3, 4],
    ])
  })

  it('returns null for a single-task run (warmups / domain drills keep the whole-test timer)', () => {
    expect(splitWritingSections(Array.from({ length: 3 }, () => ({ type: 'arrange_words' })))).toBeNull()
    expect(splitWritingSections([{ type: 'writing_email' }])).toBeNull()
  })

  it('returns null when any question is not a Writing task type', () => {
    expect(splitWritingSections([
      { type: 'arrange_words' }, { type: 'multiple_choice' }, { type: 'writing_email' },
    ])).toBeNull()
    expect(splitWritingSections([])).toBeNull()
  })
})

describe('writingSectionForIndex', () => {
  const sections = splitWritingSections(fullWriting())!
  it('maps every question index to its containing section', () => {
    expect(writingSectionForIndex(sections, 0)).toBe(0)
    expect(writingSectionForIndex(sections, 9)).toBe(0)
    expect(writingSectionForIndex(sections, 10)).toBe(1)
    expect(writingSectionForIndex(sections, 11)).toBe(2)
  })
  it('clamps an out-of-range index to the last section', () => {
    expect(writingSectionForIndex(sections, 99)).toBe(2)
  })
})

describe('writingSectionRemainingMs', () => {
  const email: WritingSection = { kind: 'email', startIdx: 10, endIdx: 11, minutes: 7 }
  it('counts down from the section budget relative to the section start mark', () => {
    // Entered the email task at whole-test elapsed 5:00; 2:00 later,
    // 5:00 of the 7:00 budget remain.
    expect(writingSectionRemainingMs(email, 5 * 60_000, 7 * 60_000)).toBe(5 * 60_000)
    // At entry, the full budget.
    expect(writingSectionRemainingMs(email, 5 * 60_000, 5 * 60_000)).toBe(7 * 60_000)
  })
  it('clamps at zero once the budget is exceeded', () => {
    expect(writingSectionRemainingMs(email, 0, 7 * 60_000)).toBe(0)
    expect(writingSectionRemainingMs(email, 0, 20 * 60_000)).toBe(0)
  })
})

describe('blankUnansweredInSection (expiry marking)', () => {
  const section: WritingSection = { kind: 'build_sentence', startIdx: 0, endIdx: 4, minutes: 6 }
  it('pins null / empty / whitespace-only slots to null, keeps real answers', () => {
    const answers = ['a | b', null, '', '   ', 'kept']
    expect(blankUnansweredInSection(answers, section)).toEqual(['a | b', null, null, null, 'kept'])
  })
  it('never touches slots outside the section', () => {
    const answers = [null, '', 'x', '', ''] // section covers 0..3 only
    const out = blankUnansweredInSection(answers, { ...section, startIdx: 0, endIdx: 3 })
    expect(out[3]).toBe('')
    expect(out[4]).toBe('')
  })
  it('keeps a partial arrange_words attempt (it is an answer, not a blank)', () => {
    const out = blankUnansweredInSection(['one | two', null], section)
    expect(out[0]).toBe('one | two')
  })
  it('does not mutate the input array', () => {
    const answers = ['', null]
    const out = blankUnansweredInSection(answers, section)
    expect(answers[0]).toBe('')
    expect(out).not.toBe(answers)
  })
})

describe('spec reconciliation — the per-task budgets are the timing source of truth', () => {
  it('sums to TOEFL_META.writing.minutes (the whole-test fallback shown at assembly)', () => {
    const sections = splitWritingSections(fullWriting())!
    const sum = sections.reduce((n, s) => n + s.minutes, 0)
    expect(sum).toBe(23)
    expect(TOEFL_META.writing.minutes).toBe(sum)
  })
  it('matches TEST_SPECS\' TOEFL Writing minutesPerSection', () => {
    const writing = TEST_SPECS.toefl!.sections.find(s => s.name_en === 'Writing')
    expect(writing).toBeDefined()
    expect(writing!.minutesPerSection).toBe(23)
  })
})
