/** @jest-environment node */
import { z } from 'zod'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NoObjectGeneratedError, TypeValidationError } from 'ai'
import {
  summarizeRefresh,
  orderByLeastRecentlyAttempted,
  describeExtractionError,
  isNonMcSection,
  cronSkipsFamily,
  normalizeDifficultyMix,
  normalizeItemDifficulty,
} from '../test-spec-refresh-summary'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: {} }))
import { SectionSpecSchema, coerceSpec } from '../test-spec-refresh'

const skip = { ok: true, notes: 'skipped — verified within 30 days' }
const pass = { ok: true, notes: 'format verified' }
const fail = { ok: false, notes: 'extraction failed: No object generated' }
const rep = <T>(x: T, k: number) => Array.from({ length: k }, () => x)

describe('summarizeRefresh', () => {
  it('reproduces 2026-10-01 refresh-test-specs and calls it failed', () => {
    // 37 ran = 21 fresh skips + 3 verified + 13 failed. The old summary
    // said "ok: 24, failed: 13" and the heartbeat said green.
    const s = summarizeRefresh([...rep(skip, 21), ...rep(pass, 3), ...rep(fail, 13)], 7)
    expect(s).toMatchObject({ ran: 37, ok: 24, failed: 13, skippedFresh: 21, attempted: 16, remaining: 7, budgetHit: true })
    expect(s.status).toBe('failed')
    expect(s.failures.length).toBeGreaterThan(0)
  })

  it('denominator is attempted, not ran: 2 failures in 4 attempts behind 30 skips is degraded, not ok-ish', () => {
    const s = summarizeRefresh([...rep(skip, 30), ...rep(pass, 2), ...rep(fail, 2)], 0)
    expect(s.attempted).toBe(4)
    expect(s.status).toBe('degraded')
  })

  it('all fresh skips is ok', () => {
    expect(summarizeRefresh(rep(skip, 10), 0).status).toBe('ok')
  })

  it('a failure whose notes happen to say "skipped" is still a failure', () => {
    const s = summarizeRefresh([{ ok: false, notes: 'skipped: no samples' }], 0)
    expect(s).toMatchObject({ skippedFresh: 0, attempted: 1, failed: 1, status: 'failed' })
  })
})

describe('orderByLeastRecentlyAttempted', () => {
  const t = (family: string) => ({ family, sectionKey: 'S', displayName: family })
  it('never-attempted first, then oldest attempt first, catalog order on ties', () => {
    const out = orderByLeastRecentlyAttempted(
      [t('a'), t('b'), t('c'), t('d'), t('e')],
      [
        { family: 'a', section_key: 'S', last_attempted_at: '2026-10-01T05:00:00Z' },
        { family: 'b', section_key: 'S', last_attempted_at: '2026-09-01T05:00:00Z' },
        { family: 'c', section_key: 'S', last_attempted_at: null },
        // d has no row at all
        { family: 'e', section_key: 'S', last_attempted_at: '2026-09-01T05:00:00Z' },
      ],
    )
    expect(out.map(x => x.family)).toEqual(['c', 'd', 'b', 'e', 'a'])
  })
})

describe('describeExtractionError', () => {
  it('names the failing field paths from the AI SDK cause chain', () => {
    const zerr = z.object({ choiceCount: z.number().min(2), difficultyMix: z.object({ easy: z.number() }).optional() })
      .safeParse({ choiceCount: 0, difficultyMix: null }).error!
    const err = new NoObjectGeneratedError({
      message: 'No object generated: response did not match schema.',
      cause: new TypeValidationError({ value: {}, cause: zerr }),
      text: '{}',
      response: { id: 'x', timestamp: new Date(), modelId: 'm' },
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      finishReason: 'stop',
    })
    const msg = describeExtractionError(err)
    expect(msg).toMatch(/^No object generated: response did not match schema\./)
    expect(msg).toMatch(/choiceCount: /)
    expect(msg).toMatch(/difficultyMix: /)
  })

  it('falls back to the message, plus a non-stop finish reason', () => {
    expect(describeExtractionError(new Error('boom'))).toBe('boom')
    expect(describeExtractionError(Object.assign(new Error('cut'), { finishReason: 'length' }))).toBe('cut [finishReason=length]')
  })
})

describe('SectionSpecSchema accepts what a free-response section legitimately returns', () => {
  const base = {
    name_en: 'Writing', questionsPerSection: 2, minutesPerSection: 29,
    patterns_en: 'essay', distractorPatterns_en: 'n/a',
  }
  it('null optionals, no choiceCount, fractional minutes', () => {
    const r = SectionSpecSchema.safeParse({
      ...base, name_ko: null, choiceCount: null, minutesPerSection: 12.5,
      difficultyMix: null, hardItemFraming_en: null, hardItemFraming_ko: null,
      patterns_ko: null, distractorPatterns_ko: null,
    })
    expect(r.success).toBe(true)
    const spec = coerceSpec(r.success ? r.data : (undefined as never))
    expect(spec.choiceCount).toBe(4)
    expect(spec.minutesPerSection).toBe(13)
    expect('difficultyMix' in spec).toBe(false)
    expect(spec.name_ko).toBe('')
  })
  it('choiceCount 0 coerces to 4, 5 stays 5', () => {
    const p = (cc: number) => coerceSpec(SectionSpecSchema.parse({ ...base, choiceCount: cc })).choiceCount
    expect(p(0)).toBe(4)
    expect(p(5)).toBe(5)
  })
  it('still rejects what it should: missing required fields, absurd counts', () => {
    expect(SectionSpecSchema.safeParse({ ...base, questionsPerSection: 0 }).success).toBe(false)
    expect(SectionSpecSchema.safeParse({ ...base, minutesPerSection: 1 }).success).toBe(false)
    const { patterns_en: _drop, ...noPatterns } = base
    void _drop
    expect(SectionSpecSchema.safeParse(noPatterns).success).toBe(false)
  })
})

describe('examples pass sends the passage to the answer-key verifier', () => {
  it('maps the extracted passage, not null', () => {
    // Pinned by source: the function needs a model to run. Until
    // 2026-10-02 this was `passage: null`, so reading items were verified
    // with no passage and dropped.
    const src = readFileSync(join(process.cwd(), 'src/lib/test-spec-refresh.ts'), 'utf8')
    expect(src).toMatch(/mcItems\.map\(it => \(\{\n\s+passage: it\.passage,/)
    expect(src).toMatch(/passage: z\.string\(\)\.nullish\(\)/)
  })
})


describe('2026-10-20: the failures that were answers, not errors', () => {
  const empty = (notes: string) => ({ ok: true, empty: true, notes })
  it('reproduces the 2026-10-20 examples run: 9 "nothing usable" results no longer fail the job', () => {
    // 15 attempted: 2 added examples, 9 found nothing usable, 4 real errors. Before: 14 failures -> failed.
    const s = summarizeRefresh([...rep(pass, 2), ...rep(empty('no items verified as hard'), 9), ...rep(fail, 4)], 28)
    expect(s.failed).toBe(4)
    expect(s.empty).toBe(9)
    expect(s.emptyNotes.length).toBe(8)
    expect(s.status).toBe('degraded')
  })
  it('an empty result is not a fresh skip: it costs a model call and stays in the attempted denominator', () => {
    const s = summarizeRefresh([empty('0 items extracted, 0 MC'), fail], 0)
    expect(s.attempted).toBe(2)
    expect(s.skippedFresh).toBe(0)
  })
  it('all empty is ok, not failed', () => {
    expect(summarizeRefresh(rep(empty('no samples returned'), 5), 0).status).toBe('ok')
  })
  it('a failure flagged empty by mistake is still a failure (ok decides)', () => {
    expect(summarizeRefresh([{ ok: false, empty: true, notes: 'x' }], 0).failed).toBe(1)
  })
})

describe('isNonMcSection', () => {
  it.each(['Writing', 'Speaking', 'Essay', 'ACT Writing', 'TOEIC Speaking'])('%s has no MC items', k => expect(isNonMcSection(k)).toBe(true))
  it.each(['Reading and Writing', 'Reading', 'Listening', 'Verbal Reasoning', 'Mathematics', 'English'])('%s is MC', k => expect(isNonMcSection(k)).toBe(false))
})

describe('cronSkipsFamily', () => {
  it('TOEFL is skipped by the format cron only (per-module docs fail the sanity check every day)', () => {
    expect(cronSkipsFamily('format', 'toefl')).toBe(true)
    expect(cronSkipsFamily('examples', 'toefl')).toBe(false)
  })
  it('SAT is skipped by both; IELTS by neither', () => {
    expect(cronSkipsFamily('format', 'sat') && cronSkipsFamily('examples', 'sat')).toBe(true)
    expect(cronSkipsFamily('format', 'ielts') || cronSkipsFamily('examples', 'ielts')).toBe(false)
  })
})

describe('normalizeDifficultyMix', () => {
  it('converts a percent mix (the 2026-10-20 IELTS Listening failure) to fractions', () => {
    expect(normalizeDifficultyMix({ easy: 30, medium: 50, hard: 20 })).toEqual({ easy: 0.3, medium: 0.5, hard: 0.2 })
  })
  it('rescales any other non-fraction scale by its sum, keeping the ratios (the 2026-10-21 repeat failure)', () => {
    // percent that does not sum to 100, and item counts
    expect(normalizeDifficultyMix({ easy: 30, medium: 50, hard: 40 })).toEqual({ easy: 0.25, medium: 50 / 120, hard: 40 / 120 })
    expect(normalizeDifficultyMix({ easy: 300, medium: 500, hard: 200 })).toEqual({ easy: 0.3, medium: 0.5, hard: 0.2 })
  })
  it('leaves fractions, nulls, negatives and a zero sum alone for the schema to judge', () => {
    expect(normalizeDifficultyMix({ easy: 0.3, medium: 0.5, hard: 0.2 })).toEqual({ easy: 0.3, medium: 0.5, hard: 0.2 })
    expect(normalizeDifficultyMix(null)).toBeNull()
    expect(normalizeDifficultyMix({ easy: -5, medium: 50, hard: 55 })).toEqual({ easy: -5, medium: 50, hard: 55 })
    expect(normalizeDifficultyMix({ easy: 0, medium: 0, hard: 0 })).toEqual({ easy: 0, medium: 0, hard: 0 })
  })
  it('SectionSpecSchema accepts percent and count mixes end to end, and still rejects a negative one', () => {
    const base = SectionSpecSchema.safeParse({}).error?.issues.map(i => i.path[0]) ?? []
    const field = SectionSpecSchema.shape.difficultyMix
    expect(field.safeParse({ easy: 30, medium: 50, hard: 20 }).success).toBe(true)
    expect(field.safeParse({ easy: 30, medium: 50, hard: 40 }).success).toBe(true)
    expect(field.safeParse({ easy: -5, medium: 50, hard: 55 }).success).toBe(false)
    expect(field.safeParse(null).success).toBe(true)
    expect(base).toContain('minutesPerSection')
  })
})

describe('normalizeItemDifficulty', () => {
  it('maps case, whitespace and plain synonyms (the 2026-10-21 examples failure)', () => {
    expect(normalizeItemDifficulty(' Hard ')).toBe('hard')
    expect(normalizeItemDifficulty('Intermediate')).toBe('medium')
    expect(normalizeItemDifficulty('difficult')).toBe('hard')
    expect(normalizeItemDifficulty('simple')).toBe('easy')
  })
  it('leaves an unknown word for the enum to reject', () => {
    expect(normalizeItemDifficulty('expert-level')).toBe('expert-level')
    expect(normalizeItemDifficulty(3)).toBe(3)
  })
})
