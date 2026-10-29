/** @jest-environment node */
jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: {} }))
import { SectionSpecSchema, SampleItemSchema, coerceSpec, isPlausibleExtraction } from '../test-spec-refresh'
import { fullSectionQuestionCount, normalizeItemDifficulty, normalizeConfidence } from '../test-spec-refresh-summary'
import { TEST_SPECS, type SectionSpec } from '../test-specs'

const ieltsListening = (TEST_SPECS as Record<string, { sections: SectionSpec[] } | undefined>).ielts!
  .sections.find(s => s.name_en === 'Listening')!

const extraction = (over: Record<string, unknown>) => SectionSpecSchema.parse({
  name_en: 'Listening', name_ko: '듣기', minutesPerSection: 30, choiceCount: 4,
  patterns_en: 'p', patterns_ko: 'p', distractorPatterns_en: 'd', distractorPatterns_ko: 'd',
  ...over,
})

describe('IELTS Listening: per-part headline is summed, a bad extraction still fails', () => {
  it('the baseline really is 40 (4 parts of 10)', () => {
    expect(ieltsListening.questionsPerSection).toBe(40)
  })

  it('"10 per part, 4 parts" becomes 40 and passes the sanity check', () => {
    const spec = coerceSpec(extraction({ questionsPerSection: 10, partsCount: 4, questionsPerPart: 10 }))
    expect(spec.questionsPerSection).toBe(40)
    expect(isPlausibleExtraction(spec, 'ielts', 'Listening', ieltsListening).ok).toBe(true)
    // the part fields are working data, not stored on the spec
    expect(spec).not.toHaveProperty('partsCount')
    expect(spec).not.toHaveProperty('questionsPerPart')
  })

  it('a bare 10 with no part data is still rejected', () => {
    const spec = coerceSpec(extraction({ questionsPerSection: 10 }))
    expect(spec.questionsPerSection).toBe(10)
    expect(isPlausibleExtraction(spec, 'ielts', 'Listening', ieltsListening)).toMatchObject({ ok: false })
  })

  it('a headline that is not one part is never multiplied (a wrong 20 stays 20 and fails)', () => {
    expect(fullSectionQuestionCount(20, 4, 10)).toBe(20)
    const spec = coerceSpec(extraction({ questionsPerSection: 20, partsCount: 4, questionsPerPart: 10 }))
    expect(isPlausibleExtraction(spec, 'ielts', 'Listening', ieltsListening).ok).toBe(false)
  })

  it('one part, or a correct total, is left alone', () => {
    expect(fullSectionQuestionCount(40, 4, 10)).toBe(40)
    expect(fullSectionQuestionCount(10, 1, 10)).toBe(10)
    expect(fullSectionQuestionCount(54, null, null)).toBe(54)
  })
})

describe('sample item difficulty labels', () => {
  it('maps Korean and spelled-out labels', () => {
    expect(normalizeItemDifficulty('상')).toBe('hard')
    expect(normalizeItemDifficulty('고난도')).toBe('hard')
    expect(normalizeItemDifficulty('중')).toBe('medium')
    expect(normalizeItemDifficulty('하')).toBe('easy')
    expect(normalizeItemDifficulty('Very-Hard')).toBe('hard')
    expect(normalizeItemDifficulty('extreme')).toBe('extreme')
  })

  const item = (difficulty: unknown) => ({
    passage: null, prompt: 'q', choices: ['a', 'b', 'c', 'd'], correct_answer: 'a', why_hard: 'w', source_url: 'u', difficulty,
  })
  it('an unrecognised label nulls that one item instead of failing the batch', () => {
    expect(SampleItemSchema.parse(item('상')).difficulty).toBe('hard')
    expect(SampleItemSchema.parse(item('extreme')).difficulty).toBeNull()
  })
})

describe('verifier confidence', () => {
  it('normalises case only', () => {
    expect(normalizeConfidence(' High ')).toBe('high')
    expect(normalizeConfidence('sure')).toBe('sure')
  })
})
