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
 * ONE SCORER. This calls scoreToeflSection, the same function
 * TestResultView calls, so the stored value and the displayed value
 * cannot drift by construction. Do not add a second implementation here.
 */
import { dbAdmin } from '@/lib/supabase-admin'
import {
  scoreToeflSection, detectToeflSection, WEIGHTS_FOR,
} from '@/lib/study/toefl-section-score'
import { scoreListenRepeat } from '@/lib/study/listen-repeat-accuracy'

export interface RecomputeResult {
  /** null when the session is not a rubric section, or nothing changed. */
  score: number | null
  section: 'speaking' | 'writing' | null
  graded: number
  ungraded: number
  updated: boolean
  reason?: string
}

/**
 * Reload everything, rescore, write if it moved.
 *
 * Deliberately reloads rather than accepting the caller's in-memory view:
 * grade-batch and grade-audio each know about their own items only, and a
 * Speaking section can be graded by both (audio-native for premium, text
 * for everyone else). A score computed from one caller's slice would be
 * a partial score wearing a final score's clothes.
 */
export async function recomputeAndPersistSessionScore(
  sessionId: string,
): Promise<RecomputeResult> {
  const empty: RecomputeResult = { score: null, section: null, graded: 0, ungraded: 0, updated: false }

  const { data: attempts, error: attErr } = await dbAdmin
    .from('study_attempts')
    .select('question, student_answer, is_correct, position')
    .eq('session_id', sessionId)
    .order('position', { ascending: true, nullsFirst: false })
  if (attErr || !attempts?.length) {
    return { ...empty, reason: attErr?.message ?? 'no attempts' }
  }

  const questions = attempts.map(a => (a.question ?? {}) as Record<string, unknown>)
  const section = detectToeflSection(questions.map(q => ({ type: String(q.type ?? '') })))
  // Reading and Listening never reach scoreToeflSection — they have no
  // rubric parts, and submit's value is already right for them.
  if (!section) return { ...empty, reason: 'not a rubric section' }

  // Rubric bands, keyed by prompt text exactly as the grades route keys
  // them. Prompt text is the join key of record between a submission and
  // the attempt it came from; there is no attempt_id on submissions.
  const { data: subs } = await dbAdmin
    .from('study_response_submissions')
    .select('prompt_text, study_response_grades ( overall_band )')
    .eq('session_id', sessionId)
  const bandByPrompt = new Map<string, number>()
  for (const row of subs ?? []) {
    const g = Array.isArray(row.study_response_grades)
      ? row.study_response_grades[0]
      : row.study_response_grades
    if (!g || g.overall_band === null || g.overall_band === undefined) continue
    bandByPrompt.set(String(row.prompt_text), Number(g.overall_band))
  }

  const items = attempts.map((a, i) => {
    const q = questions[i] as { type?: string; prompt?: string; correct_answer?: string }
    return {
      type: String(q?.type ?? ''),
      expectedText: q?.correct_answer ?? null,
      studentAnswer: (a.student_answer as string | null) ?? null,
      correct: !!a.is_correct,
      rubricBand: bandByPrompt.get(String(q?.prompt ?? '')) ?? null,
    }
  })

  // An open-response item with no band DROPS OUT of scoreToeflSection
  // rather than scoring zero. That is right mid-grading — a half-graded
  // section should not be reported as a bad one — but it means writing
  // the score now would publish a number computed from fewer items than
  // the test contains. So hold off until every open response has a band.
  const openTypes = new Set(['speaking_repeat', 'speaking_interview', 'writing_email', 'writing_discussion'])
  const open = items.filter(it => openTypes.has(it.type))
  const ungraded = open.filter(it => it.rubricBand === null).length
  const graded = open.length - ungraded
  if (ungraded > 0) {
    return { score: null, section, graded, ungraded, updated: false, reason: 'grading incomplete' }
  }

  // A session nobody answered has no score, and 0 is not the same thing.
  //
  // Three sessions from 2026-06-30/07-01 are marked completed with 12,
  // 12 and 5 attempt rows and ZERO answers — abandoned, then closed.
  // scoreToeflSection happily returns 0 for them, because every item is
  // wrong. Writing that 0 would record "this student scored 0%" for a
  // test they never took, and it would then be real input to their trend
  // line, their mastery scores and the strengths/weaknesses cards.
  // A null score renders as "no score" everywhere; a 0 renders as
  // failure. The stored null is right and must survive.
  const answered = items.filter(it =>
    (it.studentAnswer != null && String(it.studentAnswer).trim() !== '') || it.rubricBand !== null,
  ).length
  if (answered === 0) {
    return { score: null, section, graded, ungraded: 0, updated: false, reason: 'nothing answered' }
  }

  const result = scoreToeflSection(items, WEIGHTS_FOR[section], scoreListenRepeat)
  // `proportion`, NOT earned/max.
  //
  // SectionScore carries both, and they are different numbers on
  // purpose: earned/max are RAW POINTS for the "38 of 55" display, while
  // proportion is the WEIGHTED 0-1 the section is actually scored on.
  // The first version of this used earned/max and produced 75 for a
  // session whose real score is 83 —
  //
  //   build_a_sentence     6/10 x 0.20 = 0.120
  //   write_email        band 5/5 x 0.35 = 0.350
  //   academic_discussion band 4/5 x 0.45 = 0.360   -> 0.830
  //   vs raw (6+5+4)/(10+5+5)                       -> 0.750
  //
  // which would have replaced one wrong stored score with a different
  // wrong stored score, and made this helper a THIRD number rather than
  // the thing that unifies the other two. Caught by hand-computing the
  // weights against a real graded session, not by any test.
  const pct = Math.round(10000 * result.proportion) / 100

  const { data: current } = await dbAdmin
    .from('study_sessions').select('score').eq('id', sessionId).maybeSingle()
  if (current && Number(current.score) === pct) {
    return { score: pct, section, graded, ungraded: 0, updated: false, reason: 'unchanged' }
  }

  const { error: upErr } = await dbAdmin
    .from('study_sessions').update({ score: pct }).eq('id', sessionId)
  if (upErr) {
    // Loud, not fatal: the grade itself already landed and the summary
    // screen recomputes from attempts, so the student sees the right
    // number. What breaks is history agreeing with it — an audit gap,
    // never a reason to fail the grading request.
    console.error('[persist-session-score] update failed', { sessionId, pct, error: upErr.message })
    return { score: pct, section, graded, ungraded: 0, updated: false, reason: upErr.message }
  }

  return { score: pct, section, graded, ungraded: 0, updated: true }
}
