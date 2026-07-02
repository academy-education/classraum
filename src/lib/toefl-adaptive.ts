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
 * Applied only to Reading (20-item, 2×10 split) and Listening
 * (28-item, 2×14 split). Speaking and Writing are per-task rubrics
 * and don't adapt.
 */

export type ToeflModule2Route = 'easy' | 'medium' | 'hard'

export interface ToeflAdaptiveConfig {
  /** Total item count of module 1 for this section. */
  module1Total: number
  /** Total item count of module 2 for this section. */
  module2Total: number
}

export const TOEFL_ADAPTIVE_SECTIONS: Record<string, ToeflAdaptiveConfig> = {
  Reading:   { module1Total: 10, module2Total: 10 },
  Listening: { module1Total: 14, module2Total: 14 },
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
  if (!(sectionName in TOEFL_ADAPTIVE_SECTIONS)) return null
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
