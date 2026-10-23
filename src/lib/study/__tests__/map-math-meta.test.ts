/**
 * MAP maths rows must carry verify_meta.map (MAP-PLAN-2026-10-23 D2): the MAP form builder places items by
 * grade, so math-bank-helper.mjs refuses a BANK_FAMILY=map batch whose items lack a grade or a MAP area.
 */
import { mapMathMeta } from '../../../../scripts/study-bank/map-math-meta.mjs'

const item = {
  id: 'MV2-D8-01', domain: 'Statistics and Probability', grade_target: 8, tier: 'low',
  rit_band: 'RIT 210-219', ccss: '8.SP.A.4',
}

describe('mapMathMeta', () => {
  it('keeps area, grade, tier, RIT band and standard', () => {
    expect(mapMathMeta(item)).toEqual({
      area: 'Statistics and Probability', grade_target: 8, tier: 'low', rit_band_target: 'RIT 210-219', ccss: '8.SP.A.4',
    })
  })

  it('refuses an item without a grade', () => {
    expect(() => mapMathMeta({ ...item, grade_target: undefined })).toThrow(/grade_target/)
  })

  it('refuses a domain that is not a MAP maths area', () => {
    expect(() => mapMathMeta({ ...item, domain: 'Problem-Solving and Data Analysis' })).toThrow(/not a MAP maths area/)
  })
})
