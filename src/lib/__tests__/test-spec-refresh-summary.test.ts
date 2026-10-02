/** @jest-environment node */
import { z } from 'zod'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NoObjectGeneratedError, TypeValidationError } from 'ai'
import {
  summarizeRefresh,
  orderByLeastRecentlyAttempted,
  describeExtractionError,
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
