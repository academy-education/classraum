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

/**
 * Remaining time on the CURRENT module's clock. Adaptive SAT tests are
 * timed per module: Module 1 counts from test start; Module 2 counts
 * from the moment it began (module2StartMs, in whole-test elapsed
 * terms). Never returns negative.
 */
export function moduleRemainingMs(args: {
  perModuleMinutes: number
  currentElapsedMs: number
  module2StartMs: number | null
  inModule2: boolean
}): number {
  const perModuleMs = args.perModuleMinutes * 60_000
  const moduleElapsed = args.inModule2 && args.module2StartMs != null
    ? args.currentElapsedMs - args.module2StartMs
    : args.currentElapsedMs
  return Math.max(0, perModuleMs - moduleElapsed)
}

export interface SatSectionScore {
  /** 200–800, rounded to the nearest 10 like a real section score. */
  score: number
  /** Which Module 2 the student earned. */
  route: SatModule2Route
  /** True when the easy path held the score below the hard-path range. */
  capped: boolean
}

export type SatSection = 'reading_writing' | 'math'

/**
 * Official raw→scaled conversion tables from College Board's
 * "Scoring Your Paper SAT Practice Test #4" guide (2324-BB-852),
 * the published paper form of the digital SAT. Each raw score maps to
 * a [lower, upper] scaled pair: the guide's two guardrail columns,
 * which correspond to the least/most favorable adaptive path — so we
 * read the UPPER column for the earned-hard route and the LOWER column
 * for the easy route.
 *
 * The paper form is longer than the adaptive form (R&W 66 vs 54 raw,
 * Math 54 vs 44) because it can't adapt, so our raw score is converted
 * via PERCENTAGE correct: fraction × table max, interpolated between
 * the surrounding rows. Still labeled an estimate in the UI — true
 * adaptive equating is per-form and unpublished — but the curve shape
 * (flat floor, steep top) is now College Board's own.
 */
// prettier-ignore
const RW_CONVERSION: ReadonlyArray<readonly [number, number]> = [
  [200,200],[200,200],[200,200],[200,200],[200,200],[200,200],[200,200],
  [200,210],[200,220],[210,230],[230,250],[240,260],[250,270],[260,280],
  [280,300],[290,310],[320,340],[340,360],[350,370],[360,380],[370,390],
  [370,390],[380,400],[390,410],[400,420],[410,430],[420,440],[420,440],
  [430,450],[440,460],[450,470],[460,480],[460,480],[470,490],[480,500],
  [490,510],[490,510],[500,520],[510,530],[520,540],[530,550],[540,560],
  [540,560],[550,570],[560,580],[570,590],[580,600],[590,610],[590,610],
  [600,620],[610,630],[620,640],[630,650],[630,650],[640,660],[650,670],
  [660,680],[670,690],[680,700],[690,710],[700,720],[710,730],[720,740],
  [730,750],[750,770],[770,790],[790,800],
]
// prettier-ignore
const MATH_CONVERSION: ReadonlyArray<readonly [number, number]> = [
  [200,200],[200,200],[200,200],[200,200],[200,200],[200,200],[200,200],
  [200,220],[200,230],[220,250],[250,280],[280,310],[290,320],[300,330],
  [310,340],[320,350],[330,360],[330,360],[340,370],[350,380],[360,390],
  [370,400],[370,400],[380,410],[390,420],[400,430],[420,450],[430,460],
  [440,470],[460,490],[470,500],[480,510],[500,530],[510,540],[520,550],
  [530,560],[550,580],[560,590],[570,600],[580,610],[590,620],[600,630],
  [620,650],[630,660],[650,680],[670,700],[690,720],[710,740],[730,760],
  [740,770],[750,780],[760,790],[770,800],[780,800],[790,800],
]

/**
 * Section score from the official conversion curve. Fraction correct is
 * projected onto the paper form's raw scale and linearly interpolated
 * between the two surrounding table rows; the earned route picks the
 * guardrail column (hard → upper, easy → lower). Rounded to the nearest
 * 10 like a real section score.
 */
export function estimateSectionScore(
  totalCorrect: number,
  totalQuestions: number,
  route: SatModule2Route,
  section: SatSection = 'reading_writing',
): SatSectionScore {
  const table = section === 'math' ? MATH_CONVERSION : RW_CONVERSION
  const maxRaw = table.length - 1
  const pct = totalQuestions > 0 ? Math.max(0, Math.min(1, totalCorrect / totalQuestions)) : 0
  const rawOnTable = pct * maxRaw
  const lo = Math.floor(rawOnTable)
  const hi = Math.min(maxRaw, lo + 1)
  const frac = rawOnTable - lo
  const col = route === 'hard' ? 1 : 0
  const interpolated = table[lo][col] + (table[hi][col] - table[lo][col]) * frac
  const score = Math.max(200, Math.min(800, Math.round(interpolated / 10) * 10))
  return { score, route, capped: route === 'easy' }
}
