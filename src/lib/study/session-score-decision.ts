/**
 * Pure decisions behind the stored session score, kept out of the files
 * that hold the DB client so they can be tested without one.
 *
 *  - decideRubricSessionScore: what persist-session-score may write for a
 *    TOEFL Speaking/Writing section, or why it must write nothing.
 *  - persistedObjectiveScore:  what submit writes for the key-matched part.
 *  - sessionWriteAfterItemGrade: what the per-item grade route may do to
 *    the session row.
 */
import { OPEN_RESPONSE_TYPES, RESPONSE_SKILL_BY_TYPE } from './openResponse'
import {
  scoreToeflSection, WEIGHTS_FOR, type ScorableItem,
} from './toefl-section-score'

export type RubricDecision =
  | { score: number; graded: number; ungraded: number }
  | { score: null; graded: number; ungraded: number; reason: 'grading incomplete' | 'nothing answered' | 'nothing scorable' }

/**
 * Score a TOEFL rubric section from ALL its delivered items, or refuse.
 *
 * Open-response membership comes from the shared OPEN_RESPONSE_TYPES (it
 * used to be a private copy that lacked the unscored essay types). An
 * open item that the rubric grader handles and has no band yet holds the
 * write; an UNSCORED type (essay) never gets a band, so it is not waited
 * on — it simply contributes nothing.
 *
 * Returns the percent rounded to 2dp exactly as study_sessions.score
 * stores it — `proportion`, never raw earned/max (see persist-session-score).
 */
export function decideRubricSessionScore(
  items: ScorableItem[],
  section: 'speaking' | 'writing',
  scoreRepeat: (expected: string, actual: string) => { score: number },
): RubricDecision {
  const open = items.filter(it => OPEN_RESPONSE_TYPES.has(it.type))
  // Only an ANSWERED rubric item can still be waiting: a blank one is
  // never graded and scores 0 (scoreItem), so waiting on it held the
  // write forever and left history on the submit-time percent while the
  // screen showed something else (6cbfee66: 40 vs 78).
  const awaiting = open.filter(it =>
    Object.prototype.hasOwnProperty.call(RESPONSE_SKILL_BY_TYPE, it.type)
    && it.rubricBand == null
    && (it.studentAnswer ?? '').trim() !== '')
  const graded = open.filter(it => it.rubricBand != null).length
  const ungraded = awaiting.length
  if (ungraded > 0) return { score: null, graded, ungraded, reason: 'grading incomplete' }

  // A session nobody answered has no score, and 0 is not the same thing.
  const answered = items.filter(it =>
    (it.studentAnswer != null && String(it.studentAnswer).trim() !== '') || it.rubricBand != null,
  ).length
  if (answered === 0) return { score: null, graded, ungraded: 0, reason: 'nothing answered' }

  const result = scoreToeflSection(items, WEIGHTS_FOR[section], scoreRepeat)
  // Nothing in the section carries points (e.g. only unscored essays):
  // combineParts returns proportion 0 for that, which is "no score", not 0.
  if (!(result.max > 0)) return { score: null, graded, ungraded: 0, reason: 'nothing scorable' }
  return { score: Math.round(10000 * result.proportion) / 100, graded, ungraded: 0 }
}

/**
 * study_sessions.score as submit writes it: the key-matched percent to
 * 2dp, or NULL when the section has no key-matched questions at all.
 *
 * NULL, not 0. An SSAT Writing Sample / ISEE Essay section is entirely
 * unscored open response, so weightedTotal is 0; writing 0 there recorded
 * "this student scored 0%" for a section the real test does not score,
 * and history, trends and mastery would read it as a failure.
 */
export function persistedObjectiveScore(weightedCorrect: number, weightedTotal: number): number | null {
  if (!(weightedTotal > 0)) return null
  return Math.round((10000 * weightedCorrect) / weightedTotal) / 100
}

export type ItemGradeSessionWrite =
  | { kind: 'response_session'; update: { status: 'completed'; completed_at: string; score: number } }
  | { kind: 'recompute_full_test' }

/**
 * What the per-item grade route (/api/study/response/grade) may do to the
 * session row after grading ONE answer.
 *
 * A `response`-mode session IS that one answer, so band/scaleMax is its
 * score. A `full_test` session is a whole section: writing one task's
 * band over it replaced the section score with that task's — session
 * 7d59735a stored 60.00 (= 3.0/5) for a Writing section whose result
 * screen reads 54 — and also restamped completed_at. For a full test the
 * only allowed write is the full recompute from every item.
 */
export function sessionWriteAfterItemGrade(
  mode: string,
  overallBand: number,
  scaleMax: number,
  now: Date = new Date(),
): ItemGradeSessionWrite {
  if (mode === 'full_test') return { kind: 'recompute_full_test' }
  return {
    kind: 'response_session',
    update: {
      status: 'completed',
      completed_at: now.toISOString(),
      score: scaleMax > 0 ? Math.round((overallBand / scaleMax) * 100) : 0,
    },
  }
}
