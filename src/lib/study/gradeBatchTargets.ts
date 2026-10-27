import { PRACTICE_FEEDBACK_TYPES, RESPONSE_SKILL_BY_TYPE } from './openResponse'
import { isEssayAnswerBlank, practiceEssayTask, type PracticeEssayTask } from './essayChoice'
import type { PracticeEssayFamily } from './practiceEssay'
import type { ResponseSkill, ResponseTestFamily } from './responseRubrics'

/**
 * Which attempts in a finished test the whole-test grade batch grades, and
 * with what. Pure, so the routing is testable without a database or a model.
 *
 * Two kinds of target:
 *  - rubric: TOEFL/IELTS open responses (RESPONSE_SKILL_BY_TYPE), scored.
 *  - practice: ISEE Essay / SSAT Writing Sample (PRACTICE_FEEDBACK_TYPES),
 *    feedback only, carrying the CHOSEN prompt resolved from the answer.
 *
 * This file has no runtime imports beyond pure modules (the response-rubric
 * import is type-only), so jest loads it without `ai`/`zod`.
 */

export interface BatchAttempt {
  position: number | null
  question: unknown
  student_answer: string | null
}

export type BatchTarget =
  | { kind: 'rubric'; position: number | null; type: string; skill: ResponseSkill; family: ResponseTestFamily; prompt: string; answer: string }
  | { kind: 'practice'; position: number | null; type: string; skill: 'writing'; family: PracticeEssayFamily; prompt: string; answer: string; task: PracticeEssayTask }

/** Topic slug → the family a TOEFL/IELTS rubric applies to. */
export function rubricFamilyForSlug(slug: string): ResponseTestFamily | null {
  return slug.startsWith('toefl-') ? 'toefl' : slug.startsWith('ielts-') ? 'ielts' : null
}

/** Topic slug (then item type) → the practice-essay family. The type
 *  fallback exists so a practice item is never silently skipped for want of
 *  a slug: `essay` is the ISEE Essay and `essay_choice` the SSAT sample. */
export function practiceFamilyFor(slug: string, type: string): PracticeEssayFamily {
  if (slug.startsWith('isee-')) return 'isee'
  if (slug.startsWith('ssat-')) return 'ssat'
  return type === 'essay' ? 'isee' : 'ssat'
}

export function planBatchTargets(
  attempts: BatchAttempt[],
  opts: { topicSlug: string; audioGradedPositions: ReadonlySet<number> },
): BatchTarget[] {
  const rubricFamily = rubricFamilyForSlug(opts.topicSlug)
  return attempts.flatMap((a): BatchTarget[] => {
    const q = a.question as { type?: string; prompt?: string; passage?: string | null } | null
    const type = q?.type ?? ''
    if (!q?.prompt) return []
    const raw = a.student_answer ?? ''

    if (PRACTICE_FEEDBACK_TYPES.has(type)) {
      // A picked prompt with nothing written is not an answer (submit sends
      // null for it, but an older client could still store the marker).
      if (isEssayAnswerBlank(raw)) return []
      return [{
        kind: 'practice',
        position: a.position,
        type,
        skill: 'writing',
        family: practiceFamilyFor(opts.topicSlug, type),
        prompt: q.prompt,
        // The stored answer, marker included: it is the dedupe key.
        answer: raw,
        task: practiceEssayTask(q, raw),
      }]
    }

    // Guard on the skill map, not the union: the next line looks the skill
    // up, and an unscored type would hand the grader `undefined`.
    if (!Object.prototype.hasOwnProperty.call(RESPONSE_SKILL_BY_TYPE, type)) return []
    // Only TOEFL and IELTS have response rubrics.
    if (!rubricFamily) return []
    const skill = RESPONSE_SKILL_BY_TYPE[type]!
    // An unanswered open response has nothing to grade; grading an empty
    // string would spend a model call to be told it is a zero.
    const answer = raw.trim()
    if (!answer) return []
    // A recorded Speaking answer the CLIENT is sending to grade-audio is
    // graded there. One writer per item — see the route.
    if (a.position != null && opts.audioGradedPositions.has(a.position)) return []
    return [{ kind: 'rubric', position: a.position, type, skill, family: rubricFamily, prompt: q.prompt, answer }]
  })
}
