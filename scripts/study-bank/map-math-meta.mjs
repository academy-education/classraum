/**
 * verify_meta.map for a MAP maths row (MAP-PLAN-2026-10-23 D2). The MAP form
 * builder places items by grade, so a MAP row without grade_target is unusable
 * and must be refused at insert, not discovered at assembly.
 */
export const MAP_MATH_AREAS = [
  'Operations and Algebraic Thinking',
  'Real and Complex Number Systems',
  'Geometry',
  'Statistics and Probability',
]

export function mapMathMeta(raw) {
  if (!MAP_MATH_AREAS.includes(raw.domain)) throw new Error(`${raw.id}: domain '${raw.domain}' is not a MAP maths area`)
  if (!Number.isInteger(raw.grade_target) || raw.grade_target < 2 || raw.grade_target > 12) {
    throw new Error(`${raw.id}: grade_target missing or out of range (${raw.grade_target})`)
  }
  return {
    area: raw.domain,
    grade_target: raw.grade_target,
    tier: raw.tier ?? null,
    rit_band_target: raw.rit_band ?? null,
    ccss: raw.ccss ?? null,
  }
}
