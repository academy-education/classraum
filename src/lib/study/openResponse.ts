import type { ResponseSkill } from '@/lib/study/responseRubrics'

/**
 * The open-response question types, and the rubric skill that grades each.
 *
 * These two used to live apart — the set in `test-verify`, the map inside
 * the batch-grader route — which meant adding a fourth open-response type
 * in one place and not the other would let the batch skip it in silence:
 * no error, no failure entry, and a result screen stuck on "scoring your
 * responses" for an answer nobody was grading. Deriving the set FROM the
 * map removes that failure rather than testing for it.
 *
 * This module deliberately has no runtime imports. `test-verify` pulls in
 * `ai`, and `responseRubrics` pulls in `zod`; a jest suite that reached
 * these constants through the former died at import, collected zero tests,
 * and still printed the rest of the run green. The type import above is
 * erased at compile time, so nothing follows it into a bundle either.
 */
export const RESPONSE_SKILL_BY_TYPE: Readonly<Record<string, ResponseSkill>> = {
  speaking_interview: 'speaking',
  writing_email: 'writing',
  writing_discussion: 'writing',
}

/** Answers scored against rubric criteria instead of an answer key. */
export const OPEN_RESPONSE_TYPES: ReadonlySet<string> =
  new Set(Object.keys(RESPONSE_SKILL_BY_TYPE))
