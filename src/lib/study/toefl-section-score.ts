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

/** Minimal shape needed to score one delivered item. Deliberately not
 *  ResultRow — this module stays independent of the result-screen model
 *  so it can be called from the server too. */
export interface ScorableItem {
  type: string
  /** The sentence a Listen-and-Repeat item asked for. */
  expectedText?: string | null
  studentAnswer?: string | null
  /** Verdict for key-matched types (Build a Sentence). */
  correct?: boolean
  /** 0-5 from the rubric grader, for open responses. Null when grading
   *  has not finished or failed — the item then drops out rather than
   *  scoring zero. */
  rubricBand?: number | null
}

const PART_OF: Record<string, string> = {
  speaking_repeat: 'listen_repeat',
  speaking_interview: 'take_interview',
  arrange_words: 'build_a_sentence',
  writing_email: 'write_email',
  writing_discussion: 'academic_discussion',
}

/** Points available per item, by part. Repeats and open responses are
 *  0-5; Build a Sentence is 1 point, correct or not. */
const MAX_OF: Record<string, number> = {
  listen_repeat: 5,
  take_interview: 5,
  build_a_sentence: 1,
  write_email: 5,
  academic_discussion: 5,
}

/**
 * Score a Speaking or Writing section from its delivered items.
 *
 * Listen-and-Repeat is scored here, deterministically, from the sentence
 * the item asked for — no model call. Open responses use the rubric band
 * the grader produced; an item still awaiting a grade contributes
 * nothing to EITHER side of the fraction, so a half-graded test reads as
 * a shorter test rather than a worse one.
 */
export function scoreToeflSection(
  items: ScorableItem[],
  weights: Record<string, number>,
  scoreRepeat: (expected: string, actual: string) => { score: number },
): SectionScore {
  const acc = new Map<string, { earned: number; max: number }>()
  const bump = (part: string, earned: number, max: number) => {
    const cur = acc.get(part) ?? { earned: 0, max: 0 }
    acc.set(part, { earned: cur.earned + earned, max: cur.max + max })
  }

  for (const it of items) {
    const part = PART_OF[it.type]
    if (!part) continue
    const max = MAX_OF[part] ?? 1

    if (part === 'listen_repeat') {
      const expected = (it.expectedText ?? '').trim()
      // Without the target sentence there is nothing to compare against,
      // so the item is not scorable — drop it rather than score it 0.
      if (!expected) continue
      bump(part, scoreRepeat(expected, it.studentAnswer ?? '').score, max)
    } else if (part === 'build_a_sentence') {
      bump(part, it.correct ? 1 : 0, max)
    } else {
      if (it.rubricBand == null) continue
      bump(part, Math.max(0, Math.min(max, it.rubricBand)), max)
    }
  }

  return combineParts(
    Object.keys(weights).map(key => ({
      key,
      earned: acc.get(key)?.earned ?? 0,
      max: acc.get(key)?.max ?? 0,
      weight: weights[key]!,
    })),
  )
}
