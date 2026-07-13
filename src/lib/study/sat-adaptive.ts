/**
 * Digital SAT two-module adaptive routing for bank-assembled tests.
 *
 * The real Digital SAT delivers each section as two modules. Module 1
 * is a fixed, mixed-difficulty form everyone takes; based on Module 1
 * performance the student is routed to a Module 2 that is either
 * HARDER (unlocks the full score range) or EASIER (caps the ceiling).
 * The section score reflects both raw correctness AND which path was
 * earned — acing the easy module can't reach the same score as the
 * hard one.
 *
 * We mirror that shape against the difficulty-tagged item bank: draw a
 * mixed Module 1, grade it, then draw Module 2 from the routed
 * difficulty band. Two routes only (hard / easy), matching the real
 * exam's binary branch — not the 3-way TOEFL split.
 *
 * The score here is a transparent 200–800 heuristic band, NOT an
 * equated official SAT score (that needs College Board's secret
 * equating tables). It is directionally faithful: the easy path caps.
 */

export type SatModule2Route = 'easy' | 'hard'

export interface SatModuleConfig {
  /** Questions per module (each of the two modules is this size). */
  moduleSize: number
  /** Minutes allotted per module on the real exam. */
  minutesPerModule: number
}

/** Real Digital SAT: R&W 2×27 (32 min each), Math 2×22 (35 min each). */
export const SAT_MODULE_CONFIG: Record<'reading_writing' | 'math', SatModuleConfig> = {
  reading_writing: { moduleSize: 27, minutesPerModule: 32 },
  math:            { moduleSize: 22, minutesPerModule: 35 },
}

/**
 * Route to Module 2 from Module 1 performance. The College Board keeps
 * the exact cut secret; ~60% correct is the widely-reported approximate
 * boundary for the upper module, so that's the threshold here.
 */
export function computeSatRoute(module1Correct: number, module1Total: number): SatModule2Route {
  if (module1Total <= 0) return 'easy'
  return module1Correct / module1Total >= 0.60 ? 'hard' : 'easy'
}

/**
 * Bank difficulty bands to draw each module from.
 * - Module 1 is mixed (undefined = no filter, blueprint-weighted across
 *   whatever difficulties the bank holds for the section).
 * - Module 2 hard route → hard items; easy route → easy + medium.
 */
export function difficultiesForModule2(route: SatModule2Route): Array<'easy' | 'medium' | 'hard'> {
  return route === 'hard' ? ['hard'] : ['easy', 'medium']
}

export interface SatSectionScore {
  /** 200–800, rounded to the nearest 10 like a real section score. */
  score: number
  /** Which Module 2 the student earned. */
  route: SatModule2Route
  /** True when the easy path held the score below the hard-path range. */
  capped: boolean
}

/**
 * Path-weighted section score. Raw accuracy maps onto a 200–800 band,
 * but the achievable ceiling depends on the earned path: the hard
 * module spans the full 400–800 range, the easy module caps at 590
 * (≈ the real exam's lower-module ceiling). This makes the branch
 * consequential without pretending to be an official equated score.
 */
export function estimateSectionScore(
  totalCorrect: number,
  totalQuestions: number,
  route: SatModule2Route,
): SatSectionScore {
  const pct = totalQuestions > 0 ? Math.max(0, Math.min(1, totalCorrect / totalQuestions)) : 0
  // Hard path: 400 floor → 800 ceiling. Easy path: 200 floor → 590 ceiling.
  const [floor, ceiling] = route === 'hard' ? [400, 800] : [200, 590]
  const raw = floor + pct * (ceiling - floor)
  const score = Math.round(raw / 10) * 10
  return { score, route, capped: route === 'easy' }
}
