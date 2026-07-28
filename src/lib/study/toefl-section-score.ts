/**
 * How a TOEFL section score is built.
 *
 * THIS IS OURS, NOT ETS'S. ETS assigns points per task (Speaking 35:20
 * favouring Listen-and-Repeat; Writing 10:5:5) and converts the total
 * through per-form equating tables it does not publish — see
 * docs/toefl-scoring-rework.md. We deliberately differ: the weights
 * below put more of the score on the parts that require the student to
 * actually produce language, because this number is a PROGRESS TRACKER,
 * not a prediction of what they will score on test day.
 *
 * That distinction decides everything about how it should be presented.
 * A tracker has to be consistent; it does not have to agree with ETS. A
 * prediction has to agree with ETS, and ours cannot yet — the rubric
 * grader runs 1-2 bands harsh against ETS's published samples
 * (scripts/calibrate-grader.ts). Label it as an estimate accordingly.
 *
 * Reading and Listening do not come through here. They are one point per
 * question, which already matches ETS exactly.
 */

/** One scorable group within a section. */
export interface ScorePart {
  key: string
  /** Points earned across every item in this part. */
  earned: number
  /** Points available. Zero means the part was not delivered — it drops
   *  out and the remaining weights renormalise, so a short test is not
   *  silently penalised. */
  max: number
  /** Share of the section this part carries, before renormalisation. */
  weight: number
}

export interface SectionScore {
  /** 0-1 across the parts that were actually delivered. */
  proportion: number
  /** Raw points, for display: "38 of 55". Honest, and it is what the
   *  proportion is computed from. */
  earned: number
  max: number
  /** Per-part breakdown, for the result screen. */
  parts: Array<ScorePart & { proportion: number; effectiveWeight: number }>
}

/**
 * Our weights.
 *
 * Speaking — the interview carries more than the repeats, which is the
 * opposite of ETS's 35:20. Repeating a sentence tests working memory and
 * pronunciation; answering an interviewer tests the thing a student is
 * actually trying to improve.
 *
 * Writing — sentence-ordering is the lightest, the email is middling,
 * the academic discussion carries the most. It is the longest task, the
 * most open-ended, and the closest to real academic writing.
 */
export const SPEAKING_WEIGHTS = { listen_repeat: 0.40, take_interview: 0.60 } as const
export const WRITING_WEIGHTS = {
  build_a_sentence: 0.20,
  write_email: 0.35,
  academic_discussion: 0.45,
} as const

/**
 * Weighted proportion across the delivered parts.
 *
 * Parts with `max === 0` are dropped and the surviving weights are
 * renormalised. Without that, a Speaking test whose interview items all
 * failed to grade would score as if the student had got zero on them,
 * rather than as if the section were shorter.
 */
export function combineParts(parts: ScorePart[]): SectionScore {
  const live = parts.filter(p => p.max > 0)
  const totalWeight = live.reduce((a, p) => a + p.weight, 0)

  const decorated = parts.map(p => {
    const proportion = p.max > 0 ? p.earned / p.max : 0
    const effectiveWeight = p.max > 0 && totalWeight > 0 ? p.weight / totalWeight : 0
    return { ...p, proportion, effectiveWeight }
  })

  const proportion = totalWeight === 0
    ? 0
    : decorated.reduce((a, p) => a + p.proportion * p.effectiveWeight, 0)

  return {
    proportion: Math.max(0, Math.min(1, proportion)),
    earned: live.reduce((a, p) => a + p.earned, 0),
    max: live.reduce((a, p) => a + p.max, 0),
    parts: decorated,
  }
}

/**
 * Section proportion to a 1-6 band.
 *
 * Deliberately the SAME mapping Reading and Listening already use, so
 * all four sections stay on one scale and only the way the proportion is
 * computed differs. Changing the mapping is a separate decision from
 * changing the score model, and doing both at once would make neither
 * verifiable.
 */
export function bandFromProportion(proportion: number): number {
  if (!Number.isFinite(proportion)) return 1
  const scaled = Math.max(0, Math.min(30, Math.round(proportion * 30)))
  return Math.max(1, Math.min(6, Math.round((scaled / 5) * 2) / 2))
}
