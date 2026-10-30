/** @jest-environment node */
/**
 * iTEP SLATE wiring (2026-10-31, ITEP-SLATE-BLUEPRINT §5). Wired HIDDEN:
 * these tests pin the draw, the unshuffled error-identification shape, the
 * prices, and every switch that keeps the family out of students' sight.
 *
 * Break-tested when written (each mechanism reverted alone, its test seen
 * to fail, then restored):
 *   - the hasLabelledSegments exemption in shuffleDrawnChoices
 *   - the `|| p.family === 'itep'` that makes a short iTEP draw throw
 *   - the no-backfill rule in drawItepParts
 */
jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))
jest.mock('@/lib/study/bank-read', () => ({ readBankPaged: jest.fn() }))

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ADMISSION_BLUEPRINT, ITEP_PART_QUOTAS, admissionSectionForSlug, scoreAdmission } from '@/lib/study/admission-tests'
import { assembleAdmissionSection, drawItepParts, shuffleDrawnChoices } from '@/lib/study/assemble'
import { readBankPaged } from '@/lib/study/bank-read'
import { hasLabelledSegments, parseLabelledSegments } from '@/lib/study/labelled-segments'
import { SectionShortError } from '@/lib/study/section-availability'
import { COMING_SOON_HIDDEN_SLUGS, isShippedTestFamily, isShippedTestSlug } from '@/lib/study/shipped-tests'
import { creditCostForTest } from '@/lib/study/plans'
import { familyFromTopicSlug } from '@/lib/study/test-result'
import { SECTION_TOPIC } from '@/lib/study/section-topics'
import type { Question } from '@/lib/test-verify'

const ROOT = process.cwd()
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8')
const P1 = 'Part 1: Sentence Completion'
const P2 = 'Part 2: Error Identification'

const errorId = (id: string): { id: string; item: Question } => ({
  id,
  item: {
    type: 'multiple_choice',
    prompt: 'Choose the underlined word or phrase that is NOT correct.',
    passage: 'Yesterday, Dad [A: set] up a tent [B: behind] our house, and we [C: eat] lunch [D: inside] it.',
    choices: ['set', 'behind', 'eat', 'inside'],
    correct_answer: 'eat', difficulty: 'easy', explanation: 'x',
  } as unknown as Question,
})
const completion = (id: string): { id: string; item: Question } => ({
  id,
  item: {
    type: 'multiple_choice', prompt: 'Choose the word.', passage: 'We have ____ time.',
    choices: ['many', 'little', 'a few', 'much'], correct_answer: 'much', difficulty: 'easy', explanation: 'x',
  } as unknown as Question,
})

describe('error identification is served in its labelled order', () => {
  // Reversion: delete the hasLabelledSegments line in shuffleDrawnChoices.
  // The first assertion then fails on ~23 of 24 items.
  it('never reorders an item whose choices are the sentence segments', () => {
    const rows = Array.from({ length: 24 }, (_, i) => errorId(`e${i}`))
    for (const seed of ['s1', 's2', 's3']) {
      for (const r of shuffleDrawnChoices(rows, seed)) {
        expect(r.item.choices).toEqual(['set', 'behind', 'eat', 'inside'])
      }
    }
  })

  it('still reorders ordinary four-choice items (the exemption is narrow)', () => {
    const rows = Array.from({ length: 24 }, (_, i) => completion(`c${i}`))
    const moved = shuffleDrawnChoices(rows, 's1').filter(r => r.item.choices.join('|') !== 'many|little|a few|much')
    expect(moved.length).toBeGreaterThan(15)
  })

  it('a malformed marker set keeps the shuffle (fails safe)', () => {
    const swapped = errorId('x')
    swapped.item = { ...swapped.item, choices: ['behind', 'set', 'eat', 'inside'] }
    expect(hasLabelledSegments(swapped.item)).toBe(false)
    expect(hasLabelledSegments({ passage: 'a [A: b] c [B: d]', choices: ['b', 'd', 'e', 'f'] })).toBe(false) // too few markers
    expect(hasLabelledSegments({ passage: 'a [B: b] c [A: d]', choices: ['b', 'd'] })).toBe(false)           // letters out of order
    expect(hasLabelledSegments({ passage: 'no markers', choices: ['a', 'b'] })).toBe(false)
    expect(hasLabelledSegments(errorId('y').item)).toBe(true)
  })

  it('parses segments for the renderer, keeping the text between them', () => {
    expect(parseLabelledSegments('we [C: eat] lunch')).toEqual([
      { kind: 'text', text: 'we ' }, { kind: 'segment', label: 'C', text: 'eat' }, { kind: 'text', text: ' lunch' },
    ])
  })

  it('every staged Part 2 row in the v1 batch matches the exemption, and no Part 1 row does', () => {
    const batch = JSON.parse(src('scripts/study-bank/itep-grammar-v1.batch.json')) as Array<{ domain: string; item: Question }>
    const p2 = batch.filter(r => r.domain === P2)
    expect(p2).toHaveLength(12)
    for (const r of p2) expect(hasLabelledSegments(r.item)).toBe(true)
    for (const r of batch.filter(r => r.domain === P1)) expect(hasLabelledSegments(r.item)).toBe(false)
  })
})

describe('iTEP blueprint and part quotas', () => {
  it('has Grammar, Listening, Reading in demo order, four-choice and scored', () => {
    expect(ADMISSION_BLUEPRINT.itep.map(b => [b.key, b.questions, b.minutes])).toEqual([
      ['grammar', 25, 10], ['listening', 14, 20], ['reading', 12, 20],
    ])
    for (const b of ADMISSION_BLUEPRINT.itep) {
      expect(b.choiceCount).toBe(4)
      expect(b.scored).toBe(true)
      expect(b.bankSection).toBe(b.key)
    }
  })

  it('Grammar is 13 sentence completion then 12 error identification', () => {
    expect(ITEP_PART_QUOTAS.grammar.map(p => [p.area, p.count])).toEqual([[P1, 13], [P2, 12]])
  })

  it('part counts sum to each block', () => {
    for (const b of ADMISSION_BLUEPRINT.itep) {
      const q = ITEP_PART_QUOTAS[b.key as keyof typeof ITEP_PART_QUOTAS]
      expect(q.reduce((n, p) => n + p.count, 0)).toBe(b.questions)
    }
  })

  it('only Listening/Reading passage parts draw more than one per group; all Grammar is capped at 1', () => {
    // The bijective-set guard exempts `itepPassageItems` call sites on the
    // strength of this assertion.
    const multi = Object.entries(ITEP_PART_QUOTAS).flatMap(([s, ps]) => ps.filter(p => p.itemsPerGroup > 1).map(p => `${s}/${p.area}`))
    expect(multi).toEqual([
      'listening/Part 2: Conversation', 'listening/Part 3: Lecture',
      'reading/Part 2: Intermediate Passage', 'reading/Part 3: Advanced Passage',
    ])
  })

  it('the staged batch uses the part labels exactly', () => {
    const batch = JSON.parse(src('scripts/study-bank/itep-grammar-v1.batch.json')) as Array<{ family: string; section: string; domain: string }>
    const areas = new Set(ITEP_PART_QUOTAS.grammar.map(p => p.area))
    for (const r of batch) {
      expect(r.family).toBe('itep')
      expect(r.section).toBe('grammar')
      expect(areas.has(r.domain)).toBe(true)
    }
  })

  it('maps the section slugs to blocks', () => {
    expect(admissionSectionForSlug('itep-grammar')?.section.key).toBe('grammar')
    expect(admissionSectionForSlug('itep-listening')?.section.key).toBe('listening')
    expect(admissionSectionForSlug('itep-reading')?.section.key).toBe('reading')
    expect(admissionSectionForSlug('test-itep')).toBeNull()
  })

  it('scores rights-only with no iTEP level', () => {
    const s = scoreAdmission('itep', { correct: 20, wrong: 4, omitted: 1 })
    expect(s.raw).toBe(20)
    expect(s.scaled).toBeNull()
    expect(s.scaleNote).toMatch(/no iTEP level/)
  })
})

type Row = { id: string; domain: string | null; passageGroupId: string | null }
const rows = (area: string, n: number, prefix: string): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, domain: area, passageGroupId: null }))

describe('drawItepParts', () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  afterEach(() => warn.mockClear())

  it('draws each part to its count, in part order', () => {
    const parts = drawItepParts([...rows(P2, 20, 'e'), ...rows(P1, 20, 'c')], 'grammar')
    expect(parts.map(p => p.length)).toEqual([13, 12])
    expect(parts[0]!.every(r => r.domain === P1)).toBe(true)
    expect(parts[1]!.every(r => r.domain === P2)).toBe(true)
    expect(warn).not.toHaveBeenCalled()
  })

  // Reversion: backfill a short part from the rest (as drawMapAreas does).
  // Part 1 would then carry error-ID items and this fails.
  it('never backfills a thin part from another part, and says so', () => {
    const parts = drawItepParts([...rows(P1, 11, 'c'), ...rows(P2, 20, 'e')], 'grammar')
    expect(parts.map(p => p.length)).toEqual([11, 12])
    expect(parts[0]!.every(r => r.domain === P1)).toBe(true)
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/SHORT ON Part 1: Sentence Completion - wanted 13, drew 11/))
  })

  it('draws a passage part as one whole group', () => {
    const lecture = Array.from({ length: 6 }, (_, i) => ({ id: `l${i}`, domain: 'Part 3: Lecture', passageGroupId: 'lec-1' }))
    const conv = Array.from({ length: 4 }, (_, i) => ({ id: `v${i}`, domain: 'Part 2: Conversation', passageGroupId: 'conv-1' }))
    const parts = drawItepParts([...rows('Part 1: Short Conversations', 4, 's'), ...conv, ...lecture], 'listening')
    expect(parts.map(p => p.length)).toEqual([4, 4, 6])
    expect(new Set(parts[2]!.map(r => r.passageGroupId))).toEqual(new Set(['lec-1']))
  })
})

describe('a short iTEP draw fails loudly', () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  afterAll(() => warn.mockRestore())
  const bankRow = (id: string, domain: string, q: { item: Question }) => ({
    id, difficulty: 'easy', item: q.item, passage_group_id: null, task: 'multiple_choice', domain,
  })

  // Reversion: drop `|| p.family === 'itep'` from the assertFullDraw call.
  // The 23-item draw then RETURNS (short) and this fails.
  it('throws SectionShortError on 23 of 25 even when the caller did not ask for a full draw', async () => {
    ;(readBankPaged as jest.Mock).mockResolvedValueOnce([
      ...Array.from({ length: 11 }, (_, i) => bankRow(`c${i}`, P1, completion(`c${i}`))),
      ...Array.from({ length: 12 }, (_, i) => bankRow(`e${i}`, P2, errorId(`e${i}`))),
    ])
    await expect(assembleAdmissionSection({ family: 'itep', sectionKey: 'grammar' }, 't'))
      .rejects.toBeInstanceOf(SectionShortError)
  })

  it('a full draw serves Part 1 then Part 2, with Part 2 unshuffled', async () => {
    ;(readBankPaged as jest.Mock).mockResolvedValueOnce([
      ...Array.from({ length: 13 }, (_, i) => bankRow(`c${i}`, P1, completion(`c${i}`))),
      ...Array.from({ length: 12 }, (_, i) => bankRow(`e${i}`, P2, errorId(`e${i}`))),
    ])
    const t = await assembleAdmissionSection({ family: 'itep', sectionKey: 'grammar' }, 't')
    expect(t.questions).toHaveLength(25)
    expect(t.questions.slice(0, 13).every(q => !hasLabelledSegments(q))).toBe(true)
    expect(t.questions.slice(13).every(q => q.choices.join('|') === 'set|behind|eat|inside')).toBe(true)
  })

  it('an empty section refuses', async () => {
    ;(readBankPaged as jest.Mock).mockResolvedValueOnce([])
    await expect(assembleAdmissionSection({ family: 'itep', sectionKey: 'listening' }, 't')).rejects.toThrow(/no verified items for itep\/listening/)
  })
})

describe('iTEP stays hidden', () => {
  const ALL = ['itep-grammar', 'itep-listening', 'itep-reading', 'itep-writing', 'itep-speaking']

  it('the API gate refuses it', () => {
    expect(isShippedTestFamily('itep')).toBe(false)
    expect(isShippedTestSlug('test-itep')).toBe(false)
  })

  it('every section slug is in HIDDEN_SUBTOPIC_SLUGS (one-line literal) and the builder copy', () => {
    const topic = src('src/app/mobile/study/topic/[slug]/page.tsx')
    const hidden = /HIDDEN_SUBTOPIC_SLUGS = new Set\(\[([^\]]*)\]/.exec(topic)![1]!
    const builder = /HIDDEN_BUILDER_SLUGS = new Set\(\[([^\]]*)\]/.exec(src('src/app/mobile/study/builder/page.tsx'))![1]!
    for (const s of ALL) {
      expect(hidden).toContain(`'${s}'`)
      expect(builder).toContain(`'${s}'`)
    }
  })

  it('the root is locked on deep link and off the coming-soon strip and search', () => {
    const locked = /LOCKED_TOPIC_SLUGS = new Set\(\[([\s\S]*?)\]\)/.exec(src('src/app/mobile/study/topic/[slug]/page.tsx'))![1]!
    expect(locked).toContain("'test-itep'")
    expect(COMING_SOON_HIDDEN_SLUGS.has('test-itep')).toBe(true)
  })

  it('every block has a topic row', () => {
    for (const b of ADMISSION_BLUEPRINT.itep) expect(SECTION_TOPIC.itep?.[b.key]).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('result screens recognise the family', () => {
    expect(familyFromTopicSlug('itep-grammar')).toBe('itep')
    expect(familyFromTopicSlug('itep')).toBe('itep')
  })
})

describe('iTEP pricing', () => {
  const literal = (() => {
    const s = src('src/lib/study/plans.ts')
    const table = s.slice(s.indexOf('const SECTION_CREDIT_COST'))
    const row = table.slice(table.indexOf('itep: {'))
    return row.slice(0, row.indexOf('}'))
  })()

  it('every section is listed explicitly at the MAP price (2), never the 1-credit fallback', () => {
    for (const k of ['grammar', 'listening', 'reading', 'writing', 'speaking']) {
      expect(literal).toMatch(new RegExp(`\\b${k}: 2\\b`))
      expect(creditCostForTest('itep', k)).toBe(2)
    }
    expect(creditCostForTest('map', 'reading')).toBe(2)
  })
})
