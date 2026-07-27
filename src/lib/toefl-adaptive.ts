/**
 * TOEFL adaptive routing for Reading + Listening sections.
 *
 * Real ETS TOEFL delivers each section as two modules. Module 1's
 * difficulty is fixed (medium-anchored); module 2 branches to easier
 * or harder items based on module 1 performance. This gives ETS
 * finer score discrimination without lengthening the test.
 *
 * We mirror this shape for practice fidelity. Percentile thresholds
 * chosen to match the widely reported ETS branching bands:
 *   ≥ 70% correct on module 1  → hard module 2
 *   40–69%                    → medium module 2
 *   < 40%                     → easy module 2
 *
 * Applied only to Reading and Listening. ETS's Jan-2026 blueprint
 * (Note 5) states Writing and Speaking are LINEAR — every test taker
 * gets the same tasks — so those two sections never route.
 */

export type ToeflModule2Route = 'easy' | 'medium' | 'hard'

/** Which of ETS's two Stage 2 modules a student routes into.
 *
 *  ETS Table 1 makes this a CONTENT decision, not only a difficulty one:
 *  the lower module serves no Academic Talk (Listening) and no Academic
 *  Passage (Reading); the upper module serves no Announcement and no Daily
 *  Life. So the path has to be decided and passed separately from the
 *  difficulty band — a student can be on the upper path and still be served
 *  easier items when the bank is thin, which is the correct degradation.
 *
 *  Threshold: ETS does not publish one. Multiple prep sources converge on
 *  ~60% of Stage 1 correct routing to the upper module, and that is what
 *  this uses. It is UNCONFIRMED against ETS and should be revisited if they
 *  publish the real cut. */
export function computeToeflStage2Path(
  module1Correct: number,
  module1Total: number,
): 'lower' | 'upper' {
  if (module1Total <= 0) return 'lower'
  return module1Correct / module1Total >= 0.60 ? 'upper' : 'lower'
}

export interface ToeflAdaptiveConfig {
  /** Bank section key (study_item_bank.section / assembler section). */
  bankSection: 'reading' | 'listening'
  /** ON-SCREEN item count of module 1 — how many cards the student
   *  paginates through. NOT the scored count: Complete-the-Words is one
   *  card worth 10 scored blanks. */
  module1Items: number
  /** On-screen item count of module 2. */
  module2Items: number
  /** SCORED item count of module 1 (TEST_SPECS units). */
  module1Scored: number
  /** Scored item count of module 2. */
  module2Scored: number
  /** Minutes on each module's own clock. 2× this is the section total
   *  in TEST_SPECS (Reading 35, Listening 36). */
  minutesPerModule: number
  /** @deprecated Scored total of module 1; kept as the legacy field
   *  name used by pre-adaptive callers. Prefer module1Scored. */
  module1Total: number
  /** @deprecated see module1Total. */
  module2Total: number
}

/**
 * Module sizes reconciled to TEST_SPECS (the spec is the single source
 * of truth; the old 10/14 placeholders here were stale).
 *
 * Reading — 50 SCORED items, split 25/25. Scored ≠ on-screen: the
 * blueprint is 2 Complete-the-Words (fill_in_blanks, 10 blanks each =
 * 20 scored) + 30 MC = 50 scored across 32 cards. One CtW paragraph
 * rides in each module, so a module is 1 CtW + 15 MC = 16 cards / 25
 * scored items.
 *
 * Listening — 47 scored MC, split 24/23 (odd total; module 1 takes the
 * extra item, matching `Math.ceil(n/2)` in the assembler's split).
 */
export const TOEFL_ADAPTIVE_SECTIONS: Record<string, ToeflAdaptiveConfig> = {
  Reading: {
    bankSection: 'reading',
    module1Items: 16, module2Items: 16,
    module1Scored: 25, module2Scored: 25,
    minutesPerModule: 17.5,
    module1Total: 25, module2Total: 25,
  },
  Listening: {
    bankSection: 'listening',
    module1Items: 24, module2Items: 23,
    module1Scored: 24, module2Scored: 23,
    minutesPerModule: 18,
    module1Total: 24, module2Total: 23,
  },
}

/**
 * Resolve a section config case-insensitively. Callers hand us either
 * the client's display name ('Reading') or the bank key ('reading'),
 * so normalise rather than forcing every call site to match the map's
 * capitalisation.
 */
export function toeflAdaptiveConfig(sectionName: string | null | undefined): ToeflAdaptiveConfig | null {
  if (!sectionName) return null
  const needle = sectionName.trim().toLowerCase()
  for (const [key, cfg] of Object.entries(TOEFL_ADAPTIVE_SECTIONS)) {
    if (key.toLowerCase() === needle) return cfg
  }
  return null
}

/** True for the two sections ETS delivers adaptively. Speaking and
 *  Writing are linear (Jan-2026 blueprint, Note 5). */
export function isToeflAdaptiveSection(sectionName: string | null | undefined): boolean {
  return toeflAdaptiveConfig(sectionName) != null
}

/**
 * Decide module 2's difficulty band from module 1 performance.
 * Returns null for non-adaptive sections (Speaking, Writing) so
 * callers can no-op cleanly.
 */
export function computeToeflRoute(
  sectionName: string,
  module1Correct: number,
  module1Total: number,
): ToeflModule2Route | null {
  if (!isToeflAdaptiveSection(sectionName)) return null
  if (module1Total <= 0) return 'medium'
  const pct = module1Correct / module1Total
  if (pct >= 0.70) return 'hard'
  if (pct >= 0.40) return 'medium'
  return 'easy'
}

/**
 * Difficulty distribution for a routed module 2. The generator uses
 * these fractions to bias its focused-pass ratios so a "hard" route
 * doesn't just mean "medium + more hard" — it swaps the whole mix.
 */
export function difficultyMixForRoute(route: ToeflModule2Route): {
  easy: number; medium: number; hard: number
} {
  switch (route) {
    case 'easy':   return { easy: 0.60, medium: 0.35, hard: 0.05 }
    case 'medium': return { easy: 0.25, medium: 0.55, hard: 0.20 }
    case 'hard':   return { easy: 0.05, medium: 0.35, hard: 0.60 }
  }
}

/** Bands whose share of the routed mix is material enough to draw from.
 *  The bank draw is a set filter (`difficulty IN (...)`), not a weighted
 *  sampler, so a band carrying ≤5% of the mix would otherwise be able to
 *  supply the WHOLE module when the other bands are thin — exactly the
 *  failure that makes a "hard" route feel easy. Everything at or above
 *  MATERIAL_SHARE is eligible; everything below is excluded. */
const MATERIAL_SHARE = 0.20

/**
 * Bank difficulty bands to draw a routed module 2 from — the concrete
 * consumer of difficultyMixForRoute.
 *   easy   → ['easy', 'medium']
 *   medium → ['easy', 'medium', 'hard']
 *   hard   → ['medium', 'hard']
 */
export function difficultiesForToeflModule2(
  route: ToeflModule2Route,
): Array<'easy' | 'medium' | 'hard'> {
  const mix = difficultyMixForRoute(route)
  const bands = (['easy', 'medium', 'hard'] as const).filter(b => mix[b] >= MATERIAL_SHARE)
  // Defensive: never hand the assembler an empty filter (that would
  // silently draw from nothing and 409 the student out of Module 2).
  return bands.length > 0 ? [...bands] : ['easy', 'medium', 'hard']
}
