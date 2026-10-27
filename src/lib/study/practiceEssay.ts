/**
 * PRACTICE feedback for the admission-test essays: ISEE Essay (`essay`) and
 * the SSAT Writing Sample (`essay_choice`). ADDED 2026-10-27 (owner).
 *
 * THIS IS OUR OWN PRACTICE RUBRIC. Neither SSAT nor ISEE publishes a writing
 * rubric, and neither scores the writing at all: the real tests send the
 * essay to schools as written. Nothing here may be described — in code, in
 * copy, or to a student — as an official SSAT/ISEE score. The criteria are
 * the things admissions readers and the tests' own prep material say they
 * look for (answering the prompt, organisation, development, voice and
 * language, mechanics), written down as a 1-5 scale so a student can see
 * what to work on.
 *
 * The band never enters a score. Both types stay in UNSCORED_RESPONSE_TYPES
 * (out of the key-scored denominator) and OUT of RESPONSE_SKILL_BY_TYPE
 * (out of every rubric/section total — test-result's scoreSplit, the TOEFL
 * section scorer, and the session-score recompute all key on that map).
 * They are graded for feedback only, by the same whole-test batch that
 * grades TOEFL writing — one writer per item.
 *
 * No runtime imports, so the client and jest can read the criteria and the
 * band arithmetic without `ai`/`zod`.
 */

export type PracticeEssayFamily = 'ssat' | 'isee'

export const PRACTICE_ESSAY_FAMILIES: ReadonlySet<string> = new Set(['ssat', 'isee'])

export function isPracticeEssayFamily(f: string | null | undefined): f is PracticeEssayFamily {
  return !!f && PRACTICE_ESSAY_FAMILIES.has(f)
}

/** Bottom and top of the practice scale. There is no 0: an answer only
 *  reaches the grader when the student wrote something (blank answers are
 *  skipped before any model call), and "attempted" is the floor of a
 *  writing scale, not a wrong answer. A failed grading call produces NO
 *  band at all — never a 1. */
export const PRACTICE_SCALE_MIN = 1
export const PRACTICE_SCALE_MAX = 5

export const PRACTICE_CRITERIA = [
  'addresses_prompt',
  'organization',
  'development',
  'language_style',
  'conventions',
] as const
export type PracticeCriterionKey = (typeof PRACTICE_CRITERIA)[number]

/** Student-facing criterion names. `development` has a story variant. */
export function practiceCriterionLabel(
  key: string,
  opts: { ko: boolean; story: boolean },
): string {
  const { ko, story } = opts
  switch (key) {
    case 'addresses_prompt':
      return story
        ? (ko ? '주어진 첫 문장에서 출발하기' : 'Builds from the given sentence')
        : (ko ? '선택한 주제에 답하기' : 'Answers the chosen prompt')
    case 'organization': return ko ? '구성' : 'Organization'
    case 'development':
      return story
        ? (ko ? '이야기 전개' : 'Narrative development')
        : (ko ? '논지 전개와 근거' : 'Development & support')
    case 'language_style': return ko ? '어휘와 문체' : 'Language & style'
    case 'conventions': return ko ? '문법·맞춤법·구두점' : 'Conventions'
    default: return key
  }
}

/** Round to the nearest half band and clamp into the practice scale. */
export function clampPracticeScore(n: number): number {
  if (!Number.isFinite(n)) throw new Error(`practice essay: non-finite criterion score ${String(n)}`)
  const half = Math.round(n * 2) / 2
  return Math.max(PRACTICE_SCALE_MIN, Math.min(PRACTICE_SCALE_MAX, half))
}

/**
 * The overall practice band, computed — not asked for.
 *
 * Asking the model for an overall band as well as five criterion scores is
 * how the TOEFL screen came to print "band 3.0" beside numbers that implied
 * something else; deriving it makes the headline and the rows agree by
 * construction. It is the mean of the five criteria to the nearest half,
 * with ONE cap: a response cannot sit more than one band above how well it
 * answered the prompt. A polished essay about something else is not a 4.
 * The cap never goes below the scale floor of 1, so it cannot zero an
 * essay — there is no zero gate here at all.
 */
export function practiceOverallBand(scores: Record<string, number>): number {
  const vals = PRACTICE_CRITERIA.map(k => {
    const v = scores[k]
    if (v == null) throw new Error(`practice essay: missing criterion ${k}`)
    return clampPracticeScore(v)
  })
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  const prompt = clampPracticeScore(scores.addresses_prompt!)
  return clampPracticeScore(Math.min(mean, prompt + 1))
}

/** One comment as stored in study_response_grades.annotations for a
 *  practice essay. `quoteVerified` is false when the quote was not found in
 *  the student's text; the UI then shows the comment without the quote, so
 *  a hallucinated quote is never presented as something the student wrote. */
export type PracticeComment =
  | { kind: 'strength'; quote: string; comment: string; quoteVerified: boolean }
  | { kind: 'improve'; quote: string; issue: string; suggestion: string; quoteVerified: boolean }

function normalizeForQuote(s: string): string {
  return s.toLowerCase()
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/[^\p{L}\p{N}'"]+/gu, ' ')
    .trim()
}

/** Is `quote` (loosely normalised) actually in `text`? */
export function quoteAppearsIn(quote: string, text: string): boolean {
  const q = normalizeForQuote(quote)
  if (q.length < 3) return false
  return normalizeForQuote(text).includes(q)
}

/** Narrow an unknown annotations column to practice comments, dropping
 *  anything that is not one (e.g. a TOEFL annotation). */
export function readPracticeComments(raw: unknown): PracticeComment[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((a): a is PracticeComment =>
    !!a && typeof a === 'object'
    && ((a as { kind?: unknown }).kind === 'strength' || (a as { kind?: unknown }).kind === 'improve'))
}
