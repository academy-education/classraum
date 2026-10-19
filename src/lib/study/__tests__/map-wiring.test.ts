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
import { familyFromTopicSlug } from '@/lib/study/test-result'
import { isUntimedTest } from '@/lib/study/test-clock'

type Row = { id: string; domain: string | null; passageGroupId: string | null }

function rows(area: string, n: number, perPassage = 0, prefix = area): Row[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-${i}`,
    domain: area,
    passageGroupId: perPassage ? `${prefix}-p${Math.floor(i / perPassage)}` : null,
  }))
}

describe('MAP blueprint', () => {
  it('has the three subjects, untimed, four-choice, scored', () => {
    expect(ADMISSION_BLUEPRINT.map.map(b => b.key)).toEqual(['reading', 'language', 'math'])
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
    expect(admissionSectionForSlug('test-map')).toBeNull()
  })
})

describe('MAP is wired but not shipped', () => {
  it('the API gate still refuses it', () => {
    expect(isShippedTestFamily('map')).toBe(false)
    expect(isShippedTestSlug('test-map')).toBe(false)
  })

  it('every block is priced explicitly, never the 1-credit fallback', () => {
    for (const b of ADMISSION_BLUEPRINT.map) expect(creditCostForTest('map', b.key)).toBe(2)
    expect(creditCostForTest('map', 'nonsense')).toBe(1) // the fallback this guards against
  })

  it('result screens recognise the family', () => {
    expect(familyFromTopicSlug('map')).toBe('map')
    expect(familyFromTopicSlug('map-math')).toBe('map')
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
