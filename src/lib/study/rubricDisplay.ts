/**
 * Presentation helpers for a rubric-graded response.
 *
 * A rubric item has no answer key. Showing one — even an empty one — is
 * a lie the review screen told for a while: the Email and Academic
 * Discussion cards rendered a green "Correct answer —" box above the
 * student's essay in failure red, so a response the grader had just
 * given 5 out of 5 looked like a wrong answer with a missing solution.
 *
 * No runtime imports, so the arithmetic below is reachable from jest
 * without dragging `ai` or `zod` into the suite.
 */

/**
 * Criterion keys arrive as rubric identifiers — `social_conventions`,
 * `task_fulfillment`. Rendering them with `capitalize` produced
 * "Social_conventions: 5.0", underscore and all.
 */
export function criterionLabel(key: string): string {
  const words = key.replace(/[_-]+/g, ' ').trim()
  if (!words) return ''
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** 0-1, for a meter. Guards a zero or missing scaleMax rather than
 *  rendering a NaN-width bar, which collapses to invisible. */
export function scoreFraction(score: number, scaleMax: number): number {
  if (!Number.isFinite(score) || !Number.isFinite(scaleMax) || scaleMax <= 0) return 0
  return Math.max(0, Math.min(1, score / scaleMax))
}

export type ScoreTone = 'strong' | 'solid' | 'developing' | 'weak'

/**
 * Band-to-tone, as a share of the scale rather than a fixed cutoff, so
 * it reads the same on Speaking's 0-5 and anything else we add later.
 *
 * Deliberately NOT red at the bottom. This is a proficiency band on a
 * scale that starts at "attempted", not a wrong answer — colouring a 1
 * the same as a failed multiple choice is the mistake this module
 * exists to stop repeating.
 */
export function scoreTone(score: number, scaleMax: number): ScoreTone {
  const f = scoreFraction(score, scaleMax)
  if (f >= 0.9) return 'strong'
  if (f >= 0.7) return 'solid'
  if (f >= 0.45) return 'developing'
  return 'weak'
}

export const TONE_CLASS: Record<ScoreTone, { bar: string; text: string }> = {
  strong:     { bar: 'bg-emerald-500', text: 'text-emerald-700' },
  solid:      { bar: 'bg-primary',     text: 'text-primary' },
  developing: { bar: 'bg-amber-500',   text: 'text-amber-700' },
  weak:       { bar: 'bg-slate-400',   text: 'text-slate-600' },
}
