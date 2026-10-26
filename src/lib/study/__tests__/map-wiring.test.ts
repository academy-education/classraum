/** @jest-environment node */
/**
 * MAP Growth wiring (2026-10-19). MAP is wired end to end but NOT shipped:
 * these tests pin both halves, so the family cannot leak out early and
 * cannot be half-wired when the gate flips.
 */
jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: {} }))

import {
  ADMISSION_BLUEPRINT, MAP_AREA_QUOTAS, admissionSectionForSlug, scoreAdmission,
} from '@/lib/study/admission-tests'
import { drawMapAreas } from '@/lib/study/assemble'
import { isShippedTestFamily, isShippedTestSlug } from '@/lib/study/shipped-tests'
import { creditCostForTest } from '@/lib/study/plans'
import { familyFromTopicSlug, mapAreaBreakdown, type ResultRow } from '@/lib/study/test-result'
import { isUntimedTest } from '@/lib/study/test-clock'
import { SECTION_TOPIC } from '@/lib/study/section-topics'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import depthSnapshot from '../../../../scripts/study-bank/depth-snapshot.json'

type Row = { id: string; domain: string | null; passageGroupId: string | null }

function rows(area: string, n: number, perPassage = 0, prefix = area): Row[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-${i}`,
    domain: area,
    passageGroupId: perPassage ? `${prefix}-p${Math.floor(i / perPassage)}` : null,
  }))
}

describe('MAP blueprint', () => {
  it('has the four subjects, untimed, four-choice, scored', () => {
    expect(ADMISSION_BLUEPRINT.map.map(b => b.key)).toEqual(['reading', 'language', 'math', 'science'])
    expect(Object.keys(MAP_AREA_QUOTAS).sort()).toEqual(['language', 'math', 'reading', 'science'])
    for (const b of ADMISSION_BLUEPRINT.map) {
      expect(b.minutes).toBe(0)
      expect(b.choiceCount).toBe(4)
      expect(b.scored).toBe(true)
      expect(b.bankSection).toBe(b.key)
    }
  })

  it('area quotas sum to each block and name distinct areas', () => {
    for (const b of ADMISSION_BLUEPRINT.map) {
      const q = MAP_AREA_QUOTAS[b.key as keyof typeof MAP_AREA_QUOTAS]
      expect(q.reduce((n, a) => n + a.count, 0)).toBe(b.questions)
      expect(new Set(q.map(a => a.area)).size).toBe(q.length)
    }
  })

  it('Science is 39 items, 13 in each of the three NGSS areas, all standalone (owner D1, 2026-10-27)', () => {
    expect(ADMISSION_BLUEPRINT.map.find(b => b.key === 'science')?.questions).toBe(39)
    expect(MAP_AREA_QUOTAS.science).toEqual([
      { area: 'Life Science',            count: 13, passages: false },
      { area: 'Physical Science',        count: 13, passages: false },
      { area: 'Earth and Space Science', count: 13, passages: false },
    ])
  })

  it('only Literary and Informational Text draw by passage; everything else is one per group', () => {
    // A vocabulary or mechanics set banked with a shared option pool leaks
    // if two of it land on one form (bijective-set rule).
    const byPassage = Object.values(MAP_AREA_QUOTAS).flat().filter(a => a.passages).map(a => a.area)
    expect(byPassage).toEqual(['Literary Text', 'Informational Text'])
  })

  it('maps the launch slugs to blocks', () => {
    expect(admissionSectionForSlug('map-reading')?.section.key).toBe('reading')
    expect(admissionSectionForSlug('map-language')?.section.key).toBe('language')
    expect(admissionSectionForSlug('map-math')?.section.key).toBe('math')
    expect(admissionSectionForSlug('map-science')?.section.key).toBe('science')
    expect(admissionSectionForSlug('test-map')).toBeNull()
  })
})

/** The `map: { ... }` row of SECTION_CREDIT_COST, read from SOURCE: the
 *  table is module-private, and through creditCostForTest a listed price
 *  and the fallback are indistinguishable whenever they coincide. */
function mapPriceLiteral(): string {
  const src = readFileSync(join(process.cwd(), 'src/lib/study/plans.ts'), 'utf8')
  const table = src.slice(src.indexOf('const SECTION_CREDIT_COST'))
  const row = table.slice(table.indexOf('map: {'))
  return row.slice(0, row.indexOf('}'))
}

describe('MAP is wired but not shipped', () => {
  it('the API gate still refuses it', () => {
    expect(isShippedTestFamily('map')).toBe(false)
    expect(isShippedTestSlug('test-map')).toBe(false)
  })

  it('Science stays unreachable: no topic row is wired for it', () => {
    // The study_topics row is the reachability switch (MAP-SCIENCE-PLAN §3
    // items 5-6). Its SECTION_TOPIC entry lands in the same change that
    // creates the row, after Science holds 5 clean forms - never before.
    expect(SECTION_TOPIC.map?.science).toBeUndefined()
  })

  it('Science is priced 2 by an explicit literal (owner D2), not by the fallback', () => {
    // The loop below would also pass if the fallback were ever raised to 2,
    // so the literal itself is pinned.
    expect(mapPriceLiteral()).toMatch(/\bscience: 2\b/)
    expect(creditCostForTest('map', 'science')).toBe(2)
  })

  it('every block is priced explicitly, never the 1-credit fallback', () => {
    for (const b of ADMISSION_BLUEPRINT.map) {
      expect(mapPriceLiteral()).toMatch(new RegExp(`\\b${b.key}: \\d`))
      expect(creditCostForTest('map', b.key)).toBe(2)
    }
    expect(creditCostForTest('map', 'nonsense')).toBe(1) // the fallback this guards against
  })

  it('result screens recognise the family', () => {
    expect(familyFromTopicSlug('map')).toBe('map')
    expect(familyFromTopicSlug('map-math')).toBe('map')
    expect(familyFromTopicSlug('map-science')).toBe('map')
  })

  it('every block has a depth-snapshot entry, so runout-monitor and the admin panel see it', () => {
    const snap = (depthSnapshot as unknown as { sections: Record<string, { value: number }> }).sections
    for (const b of ADMISSION_BLUEPRINT.map) expect(typeof snap[`map/${b.key}`]?.value).toBe('number')
    expect(snap['map/science']?.value).toBe(0)
  })
})

describe('MAP score', () => {
  it('is rights-only and never a RIT, percentile or band', () => {
    const s = scoreAdmission('map', { correct: 30, wrong: 6, omitted: 3 })
    expect(s.raw).toBe(30)
    expect(s.percentCorrect).toBe(76.9)
    expect(s.scaled).toBeNull()
    expect(s.stanine).toBeNull()
    expect(s.scaleNote).toMatch(/no RIT/)
  })
})

describe('drawMapAreas', () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  afterEach(() => warn.mockClear())

  it('draws every math area to its count', () => {
    const pool = MAP_AREA_QUOTAS.math.flatMap(a => rows(a.area, 15))
    const got = drawMapAreas(pool, 'math', 40)
    expect(got).toHaveLength(40)
    for (const a of MAP_AREA_QUOTAS.math) expect(got.filter(r => r.domain === a.area)).toHaveLength(10)
    expect(warn).not.toHaveBeenCalled()
  })

  it('backfills a thin area from the rest of the block, and says so', () => {
    const [thin, ...full] = MAP_AREA_QUOTAS.math
    const pool = [...rows(thin!.area, 4), ...full.flatMap(a => rows(a.area, 20))]
    const got = drawMapAreas(pool, 'math', 40)
    expect(got).toHaveLength(40)
    expect(new Set(got.map(r => r.id)).size).toBe(40)
    expect(got.filter(r => r.domain === thin!.area)).toHaveLength(4)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`SHORT ON ${thin!.area}`))
  })

  it('never draws an untagged row as an area, only as backfill', () => {
    const pool = [...rows('Not a MAP area', 30), ...MAP_AREA_QUOTAS.math.flatMap(a => rows(a.area, 10))]
    const got = drawMapAreas(pool, 'math', 40)
    expect(got.filter(r => r.domain === 'Not a MAP area')).toHaveLength(0)
    const short = drawMapAreas(pool.slice(0, 35), 'math', 40)
    expect(short.filter(r => r.domain === 'Not a MAP area').length).toBeGreaterThan(0)
  })

  it('draws Science 13 per area, one item per group', () => {
    const pool = MAP_AREA_QUOTAS.science.flatMap(a => rows(a.area, 20))
    const got = drawMapAreas(pool, 'science', 39)
    expect(got).toHaveLength(39)
    for (const a of MAP_AREA_QUOTAS.science) expect(got.filter(r => r.domain === a.area)).toHaveLength(13)
    expect(warn).not.toHaveBeenCalled()
  })

  it('takes reading passages whole, three per passage', () => {
    const pool = [
      // Six-item passages, so the three-per-passage limit actually binds.
      ...rows('Literary Text', 36, 6, 'lit'),
      ...rows('Informational Text', 18, 3, 'inf'),
      ...rows('Vocabulary', 13, 0, 'voc'),
    ]
    const got = drawMapAreas(pool, 'reading', 39)
    expect(got).toHaveLength(39)
    for (const area of ['Literary Text', 'Informational Text', 'Vocabulary']) {
      expect(got.filter(r => r.domain === area)).toHaveLength(13)
    }
    // 13 literary items at three per passage: five passages, none over three.
    const per = new Map<string, number>()
    for (const r of got) if (r.passageGroupId?.startsWith('lit')) per.set(r.passageGroupId, (per.get(r.passageGroupId) ?? 0) + 1)
    expect(per.size).toBe(5)
    expect(Math.max(...per.values())).toBeLessThanOrEqual(3)
  })
})

describe('untimed clock', () => {
  it('a linear test with no limit is untimed', () => {
    expect(isUntimedTest({ adaptive: false, writingBlocks: false, timeLimitMinutes: 0 })).toBe(true)
    expect(isUntimedTest({ adaptive: false, writingBlocks: false, timeLimitMinutes: null })).toBe(true)
  })
  it('a timed, adaptive or TOEFL Writing sitting is never untimed', () => {
    expect(isUntimedTest({ adaptive: false, writingBlocks: false, timeLimitMinutes: 60 })).toBe(false)
    expect(isUntimedTest({ adaptive: true, writingBlocks: false, timeLimitMinutes: 0 })).toBe(false)
    expect(isUntimedTest({ adaptive: false, writingBlocks: true, timeLimitMinutes: 0 })).toBe(false)
  })
})

describe('mapAreaBreakdown', () => {
  const row = (domain: string | null, correct: boolean, extra: Partial<ResultRow> = {}): ResultRow => ({
    question: { prompt: 'q', type: 'multiple_choice', domain } as ResultRow['question'],
    studentAnswer: 'A', correct, ungraded: false, isPilot: false,
    correctAnswerDisplay: 'A', range: null, position: null, ...extra,
  })

  it('counts right answers per area in MAP order, and the parts sum to the scored whole', () => {
    const rows = [
      row('Vocabulary', true), row('Literary Text', true), row('Literary Text', false),
      row('Informational Text', true), row('Mystery', false),
      row('Literary Text', true, { isPilot: true }), row('Vocabulary', false, { ungraded: true }),
    ]
    const got = mapAreaBreakdown(rows)
    expect(got).toEqual([
      { area: 'Literary Text', correct: 1, total: 2 },
      { area: 'Informational Text', correct: 1, total: 1 },
      { area: 'Vocabulary', correct: 1, total: 1 },
      { area: 'Other', correct: 0, total: 1 },
    ])
    expect(got.reduce((n, a) => n + a.total, 0)).toBe(5)
  })

  it('hides itself when only one area is present', () => {
    expect(mapAreaBreakdown([row('Geometry', true), row('Geometry', false)])).toEqual([])
  })
})
