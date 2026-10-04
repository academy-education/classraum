/**
 * The race-safe core of persist-session-score, behind a store interface
 * so concurrent graders can be simulated in a test without a database.
 *
 * WHY A COMPARE-AND-SET. Several writers touch study_sessions.score for
 * one TOEFL rubric section: submit (the key-matched percent), grade-batch,
 * grade-audio and the per-item grade route — each grading its own slice,
 * often within the same second. A plain read-compute-write lets a writer
 * that loaded its inputs EARLIER land its write LATER, publishing a score
 * from stale grades (a regrade, or submit's percent landing after the
 * final score). Sessions 7bcdc97c and d2befc83 ended with no final score
 * at all after four grades landed in eleven seconds.
 *
 * The protocol, per caller, after its own grade is committed:
 *   1. read the current score S0
 *   2. THEN load attempts and bands, and decide
 *   3. write only if the score is still S0; otherwise go back to 1
 * A successful write therefore used inputs loaded after the last write
 * it could have overtaken, and any grade committed after those inputs
 * belongs to a caller whose own step 3 will fail and retry with it. The
 * last grade to commit always publishes, whoever it is.
 */
import { detectToeflSection, type ScorableItem } from './toefl-section-score'
import { decideRubricSessionScore } from './session-score-decision'

export interface RecomputeResult {
  /** null when the session is not a rubric section, or nothing changed. */
  score: number | null
  section: 'speaking' | 'writing' | null
  graded: number
  ungraded: number
  updated: boolean
  reason?: string
}

export interface StoredAttempt {
  question: unknown
  student_answer: string | null
  is_correct: boolean | null
}

export interface SessionScoreStore {
  readScore(sessionId: string): Promise<{ found: boolean; score: number | null }>
  /** Delivery-ordered attempt rows, or an error message. */
  loadAttempts(sessionId: string): Promise<{ rows: StoredAttempt[] | null; error?: string }>
  /** Latest rubric band per prompt text (a regrade replaces the older one). */
  loadBands(sessionId: string): Promise<Map<string, number>>
  /** Set score=next only if it is still `expected`. True when applied. */
  compareAndSetScore(sessionId: string, expected: number | null, next: number): Promise<{ applied: boolean; error?: string }>
}

export const MAX_CAS_ATTEMPTS = 5

export async function recomputeSessionScoreWith(
  store: SessionScoreStore,
  sessionId: string,
  scoreRepeat: (expected: string, actual: string) => { score: number },
): Promise<RecomputeResult> {
  const empty: RecomputeResult = { score: null, section: null, graded: 0, ungraded: 0, updated: false }

  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
    // (1) BEFORE the inputs. Reading it after them is the stale-write bug.
    const current = await store.readScore(sessionId)
    if (!current.found) return { ...empty, reason: 'session not found' }

    // (2)
    const { rows, error } = await store.loadAttempts(sessionId)
    if (error || !rows?.length) return { ...empty, reason: error ?? 'no attempts' }

    const questions = rows.map(a => (a.question ?? {}) as Record<string, unknown>)
    const section = detectToeflSection(questions.map(q => ({ type: String(q.type ?? '') })))
    // Reading and Listening have no rubric parts; submit's value is right.
    if (!section) return { ...empty, reason: 'not a rubric section' }

    // Prompt text is the join key of record between a submission and the
    // attempt it came from; there is no attempt_id on submissions.
    const bands = await store.loadBands(sessionId)
    const items: ScorableItem[] = rows.map((a, i) => {
      const q = questions[i] as { type?: string; prompt?: string; correct_answer?: string }
      return {
        type: String(q?.type ?? ''),
        expectedText: q?.correct_answer ?? null,
        studentAnswer: a.student_answer ?? null,
        correct: !!a.is_correct,
        rubricBand: bands.get(String(q?.prompt ?? '')) ?? null,
      }
    })

    const decision = decideRubricSessionScore(items, section, scoreRepeat)
    const { graded, ungraded } = decision
    if (decision.score === null) {
      return { score: null, section, graded, ungraded, updated: false, reason: decision.reason }
    }
    const pct = decision.score
    if (current.score !== null && Number(current.score) === pct) {
      return { score: pct, section, graded, ungraded, updated: false, reason: 'unchanged' }
    }

    // (3)
    const cas = await store.compareAndSetScore(sessionId, current.score, pct)
    if (cas.error) {
      return { score: pct, section, graded, ungraded, updated: false, reason: cas.error }
    }
    if (cas.applied) return { score: pct, section, graded, ungraded, updated: true }
    // Someone wrote between (1) and (3): their inputs may be newer or
    // older than ours, so reload everything and decide again.
  }
  return { ...empty, reason: 'contention: gave up after retries' }
}
