/**
 * Recompute a TOEFL Speaking/Writing session's score AFTER grading, and
 * persist it.
 *
 * WHY THIS EXISTS. study_sessions.score is written once, by
 * /api/study/test/submit, at the moment the student presses submit. For
 * Reading and Listening that is fine: they are pure multiple choice, the
 * verdicts are known immediately, and the stored percent and the
 * on-screen raw count are the same number in different units (16/35 and
 * 45.71%).
 *
 * Speaking and Writing are not. Their score depends on rubric bands that
 * an AI grader produces ASYNCHRONOUSLY, seconds to minutes after submit
 * returns, and on the per-part weights in toefl-section-score. At submit
 * time those bands do not exist. So the value written there is not
 * merely computed by the wrong formula — it is computed before the
 * inputs exist, and nothing ever revised it: neither grade-batch nor
 * grade-audio touched study_sessions at all.
 *
 * The result was 19 rubric sessions where history and the summary screen
 * disagreed about the same test — 10 with a wrong number, 9 with none at
 * all. Writing showed 60 in history against 83 on screen; Speaking 43
 * against 54.
 *
 * Fixing the formula at submit would not have helped. This is a lifecycle
 * bug, not an arithmetic one: the score has to be written when the last
 * grade lands, not when the answers do.
 *
 * RACE-SAFE. The write is a compare-and-set retried on contention; the
 * protocol and why it converges are in session-score-recompute.ts.
 *
 * ONE SCORER. This calls scoreToeflSection (via decideRubricSessionScore), the same
 * function TestResultView calls, so the stored value and the displayed value
 * cannot drift by construction. Do not add a second implementation here.
 */
import { dbAdmin } from '@/lib/supabase-admin'
import { scoreListenRepeat } from '@/lib/study/listen-repeat-accuracy'
import {
  recomputeSessionScoreWith, type RecomputeResult, type SessionScoreStore,
} from '@/lib/study/session-score-recompute'

export type { RecomputeResult }

/** The production store: study_sessions / study_attempts / submissions. */
export const dbSessionScoreStore: SessionScoreStore = {
  async readScore(sessionId) {
    const { data } = await dbAdmin
      .from('study_sessions').select('score').eq('id', sessionId).maybeSingle()
    if (!data) return { found: false, score: null }
    return { found: true, score: data.score === null ? null : Number(data.score) }
  },
  async loadAttempts(sessionId) {
    const { data, error } = await dbAdmin
      .from('study_attempts')
      .select('question, student_answer, is_correct, position')
      .eq('session_id', sessionId)
      .order('position', { ascending: true, nullsFirst: false })
    if (error) return { rows: null, error: error.message }
    return { rows: (data ?? []).map(a => ({
      question: a.question,
      student_answer: (a.student_answer as string | null) ?? null,
      is_correct: a.is_correct as boolean | null,
    })) }
  },
  async loadBands(sessionId) {
    // Oldest first, so a regrade's newer submission is the one that sticks.
    const { data: subs } = await dbAdmin
      .from('study_response_submissions')
      .select('prompt_text, created_at, study_response_grades ( overall_band )')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    const bandByPrompt = new Map<string, number>()
    for (const row of subs ?? []) {
      const g = Array.isArray(row.study_response_grades)
        ? row.study_response_grades[0]
        : row.study_response_grades
      if (!g || g.overall_band === null || g.overall_band === undefined) continue
      bandByPrompt.set(String(row.prompt_text), Number(g.overall_band))
    }
    return bandByPrompt
  },
  async compareAndSetScore(sessionId, expected, next) {
    let q = dbAdmin.from('study_sessions').update({ score: next }).eq('id', sessionId)
    q = expected === null ? q.is('score', null) : q.eq('score', expected)
    const { data, error } = await q.select('id')
    if (error) {
      // Loud, not fatal: the grade itself already landed and the summary
      // screen recomputes from attempts. What breaks is history agreeing
      // with it — an audit gap, never a reason to fail a grading request.
      console.error('[persist-session-score] update failed', { sessionId, next, error: error.message })
      return { applied: false, error: error.message }
    }
    return { applied: (data?.length ?? 0) > 0 }
  },
}

/**
 * Reload everything, rescore, write if it moved.
 *
 * Deliberately reloads rather than accepting the caller's in-memory view:
 * grade-batch and grade-audio each know about their own items only, and a
 * Speaking section can be graded by both (audio-native for premium, text
 * for everyone else). A score computed from one caller's slice would be
 * a partial score wearing a final score's clothes.
 *
 * Every rule about WHETHER a score may be written (an answered response
 * still awaiting its band, nothing answered, nothing scorable) and the
 * arithmetic (the WEIGHTED proportion, never raw earned/max) live in
 * decideRubricSessionScore. A blank open response scores 0.
 */
export async function recomputeAndPersistSessionScore(
  sessionId: string,
): Promise<RecomputeResult> {
  return recomputeSessionScoreWith(dbSessionScoreStore, sessionId, scoreListenRepeat)
}
