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

/**
 * Types with no answer key AND no rubric — ADDED 2026-09-25.
 *
 * ISEE Essay and the SSAT Writing Sample are `scored: false` in
 * admission-tests.ts: the real tests send the writing to schools unscored,
 * and we do the same. They still must be excluded from the key-scored
 * denominator, because `correct_answer` on these rows is the empty string —
 * a student who writes a real essay would be key-matched against `''` and
 * marked WRONG. That is a worse outcome than the bug that exposed this
 * (no textarea at all), so the two halves had to land together.
 *
 * They are deliberately NOT in RESPONSE_SKILL_BY_TYPE. Putting them there
 * would route them to the rubric grader, and CLAUDE.md records that the
 * grader is not calibrated — a published 5 scores 3 — so banding an unscored
 * admission essay would invent a number the test itself does not produce.
 */
export const UNSCORED_RESPONSE_TYPES: ReadonlySet<string> =
  new Set(['essay', 'essay_choice'])

/**
 * Answers NOT scored against an answer key: rubric-graded ones and unscored
 * ones alike. This is the set that decides "keep out of the score
 * denominator", which is why it is the union rather than the rubric map's
 * keys. Anything that decides "send to the rubric grader" must test
 * RESPONSE_SKILL_BY_TYPE instead — membership here is not enough, and the
 * grader would look up an undefined skill.
 */
export const OPEN_RESPONSE_TYPES: ReadonlySet<string> =
  new Set([...Object.keys(RESPONSE_SKILL_BY_TYPE), ...UNSCORED_RESPONSE_TYPES])

/**
 * What the grader should actually read as "the task".
 *
 * A TOEFL Writing item splits itself across two fields: `prompt` holds
 * the bare instruction ("Read the email above and write your reply"),
 * and `passage` holds the thing being replied to — the situation, the
 * email, the professor's question, the classmates' posts, and the
 * bulleted points the response is REQUIRED to cover.
 *
 * Only `prompt` was ever sent. So the grader scored task fulfilment
 * against a task it could not see, and said so: a real email that hit
 * all three required bullets was marked down because "the elaboration
 * ... does not directly address the core prompt of replying to the
 * invitation" — there was no invitation in its context. The language
 * criteria, which need nothing but the response, scored 5 on the same
 * answer. That gap between 5 on language and 3 on fulfilment is the
 * shape this bug makes, and it is most of the "grader runs harsh"
 * finding in docs/toefl-scoring-rework.md.
 *
 * Order matters: the material comes first and the instruction last, so
 * the instruction is the most recent thing before the response.
 */
export function composeGraderPrompt(
  passage: string | null | undefined,
  prompt: string,
): string {
  const context = (passage ?? '').trim()
  const instruction = prompt.trim()
  if (!context) return instruction
  // A passage that already contains the instruction verbatim would
  // otherwise repeat it, which reads to the model as emphasis.
  if (context.includes(instruction)) return context
  return `${context}\n\n---\n\n${instruction}`
}
