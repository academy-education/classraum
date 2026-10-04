import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { dbAdmin } from '@/lib/supabase-admin'
import { toJson } from '@/lib/json'
import { isOpenResponse, weightedScore, gradeAnswer } from '@/lib/study/test-grading'
import { displayCorrectAnswer, satSectionFromTopicSlug } from '@/lib/study/test-result'
import { enforceRateLimit } from '@/lib/rate-limit'
import { assessSessionMastery } from '@/lib/study-mastery-assess'
import { estimateSectionScore } from '@/lib/study/sat-adaptive'
import { requireStudyUser } from '@/lib/study/auth'
import { awardXp, XP_VALUES } from '@/lib/study/xp'
import { seedSrsFromWrongAnswer } from '@/lib/study/srs-seed'
import { trackEvent } from '@/lib/study/analytics'
import { raiseAlert } from '@/lib/ops/alert'
import { reconcileQuestionSeconds } from '@/lib/study/question-time'
import { recomputeAndPersistSessionScore } from '@/lib/study/persist-session-score'
import { persistedObjectiveScore } from '@/lib/study/session-score-decision'

/**
 * POST /api/study/test/submit — grade a completed full_test in one
 * pass and persist every attempt row.
 *
 * Grading is deterministic string-match on the multiple_choice
 * answers (the generator constrains questions to MC only). No AI
 * call here — keeps the score reveal fast and avoids the latency
 * cliff a 30-question AI grading pass would introduce.
 *
 * Returns a per-question verdict array + summary so the UI can
 * render the review screen without re-fetching.
 *
 * NOTE on TOEFL score reporting: this route deliberately does NOT emit
 * a TOEFL band. Since January 21 2026 ETS reports 1–6 in 0.5
 * increments per section, with the overall score being the mean of the
 * four section bands rounded to the nearest half band — and the only
 * published conversion is the legacy 0–30 → band concordance (see
 * src/lib/study/toeflBands.ts). No raw-count → band table exists, so
 * turning `weightedCorrect / weightedTotal` into a band here would be
 * an invention. Speaking/Writing items are rubric-graded 0–5 on
 * study_response_grades instead, and are excluded from the weighted
 * percentage entirely (see isOpenResponse / weightedScore in lib/study/test-grading).
 */

export const dynamic = 'force-dynamic'

// Permissive — the cached test payload comes from sanitizeQuestion
// which normalizes optional fields to `null`. Zod's `.optional()` only
// accepts undefined, so without .nullable() Zod rejects every submit
// with "expected array, received null" — client swallows the 400 and
// the user sees the Submit button do nothing.
const QuestionSchema = z.object({
  passage: z.string().nullable().optional(),
  passageGroupId: z.string().nullable().optional(),
  prompt: z.string(),
  type: z.enum([
    'multiple_choice', 'numeric_entry', 'multi_select', 'three_choice', 'quant_comparison',
    'fill_in_blanks', 'arrange_words', 'speaking_repeat', 'speaking_interview',
    'writing_email', 'writing_discussion',
    // SSAT Writing Sample / ISEE Essay. Missing from this list until
    // 2026-10-04, so every essay submit 400'd with "bad payload".
    'essay', 'essay_choice',
  ]).nullable().optional(),
  choices: z.array(z.string()).nullable().optional(),
  correct_answer: z.string().nullable().optional(),
  correct_answers: z.array(z.string()).nullable().optional(),
  acceptable_answers: z.array(z.string()).nullable().optional(),
  blanks: z.array(z.object({
    id: z.number().int(),
    answer: z.string(),
    alternates: z.array(z.string()).nullable().optional(),
  })).nullable().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  explanation: z.string(),
  /** false = unscored ETS pilot item. Absent/true = scored. */
  scored: z.boolean().nullable().optional(),
  /** study_item_bank.id when the question came from the bank. Persisted so
   *  per-item accuracy is computable; see migration 063. */
  bankItemId: z.string().uuid().nullable().optional(),
  distractor_rationales: z
    .array(z.object({ choice: z.string(), reason: z.string() }))
    .nullable()
    .optional(),
  // graphic is passthrough — we don't need to validate its shape for
  // grading (it's UI-only), but we need to accept it so submit
  // doesn't reject the questions array.
  graphic: z.unknown().nullable().optional(),
})

const SubmitSchema = z.object({
  sessionId: z.string(),
  /** Question payloads as originally generated — passed back from
   *  the client so we don't have to re-deserialise the cache row.
   *  Cap matches the generator schema (200) so full-section tests
   *  (SAT R&W 54, TOEIC 100, ACT English 50) submit successfully. */
  questions: z.array(QuestionSchema).min(1).max(200),
  /** Indexed by question position; null = unanswered. */
  answers: z.array(z.string().nullable()),
  /** Total seconds the student actually spent. */
  elapsedSeconds: z.number().int().min(0),
  /** Active seconds each question was on screen, carved from the same
   *  clock as elapsedSeconds (see lib/study/question-time). Optional:
   *  older clients omit it, and an inconsistent array is ignored in
   *  favour of the even split by reconcileQuestionSeconds. */
  questionSeconds: z.array(z.number().int().min(0).nullable()).max(200).optional(),
  /** Why the test ended, when it wasn't the student pressing Submit.
   *  'app_exited' = the native app was backgrounded mid-test and the
   *  exit guard auto-submitted whatever had been answered. Persisted
   *  so the reason survives the screen that reported it. */
  endReason: z.literal('app_exited').nullable().optional(),
})

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(
    `test-submit:user:${user.id}`,
    { windowMs: 60 * 1000, max: 6 }
  )
  if (blocked) return blocked

  let body: z.infer<typeof SubmitSchema>
  try {
    body = SubmitSchema.parse(await req.json())
  } catch (e) {
    return NextResponse.json({ error: 'bad payload', details: (e as Error).message }, { status: 400 })
  }
  if (body.answers.length !== body.questions.length) {
    return NextResponse.json({ error: 'answers/questions length mismatch' }, { status: 400 })
  }

  const { data: session } = await dbAdmin
    .from('study_sessions')
    .select('id, student_id, mode, topic_id, module2_route, topic:study_topics(slug)')
    .eq('id', body.sessionId)
    .maybeSingle()
  if (!session || session.student_id !== user.id) {
    return NextResponse.json({ error: 'session not found' }, { status: 404 })
  }
  if (session.mode !== 'full_test') {
    return NextResponse.json({ error: 'session is not in full_test mode' }, { status: 400 })
  }

  // Adaptive SAT sessions carry the earned Module 2 route; the score
  // reveal adds a 200–800 section score from College Board's published
  // conversion curve on top of the raw percentage. The topic slug picks
  // the section-specific table (Math vs Reading & Writing).
  // `satScore(correct, total)` builds it, or null for non-adaptive
  // sessions.
  const module2Route = session.module2_route === 'hard' || session.module2_route === 'easy'
    ? session.module2_route
    : null
  const topicRel = session.topic as { slug: string } | { slug: string }[] | null
  const topicSlug = (Array.isArray(topicRel) ? topicRel[0]?.slug : topicRel?.slug) ?? ''
  const satSection = satSectionFromTopicSlug(topicSlug)
  // Gated on the topic being SAT. `module2_route` alone was the test until
  // 2026-07-28, and TOEFL became adaptive too — so a TOEFL Reading result
  // carried a College Board 200-800 section score, rendered as
  // "EST. SAT SCORE (200-800) 200" beside the correct 1-6 band. Two score
  // scales for two different exams on one screen, one of them invented.
  // Fixed here rather than in the two UIs that render it, so a third
  // surface cannot reintroduce it. The header note above already says a
  // TOEFL band must not be fabricated; this is the same rule.
  const isSatTopic = topicSlug.startsWith('sat-')
  const satScore = (correct: number, total: number) =>
    isSatTopic && module2Route ? estimateSectionScore(correct, total, module2Route, satSection) : null

  // ── Anti-forgery: grade against the SERVER's cached test payload ──
  // The client passes its questions array for convenience, but its
  // correct_answer/blanks fields must never be trusted — a doctored
  // POST could otherwise buy a perfect score (persisted to session
  // score + mastery + XP). The generator caches the exact payload the
  // client displays (shuffling happens before caching), so grading by
  // index against the cache is faithful. Client-supplied questions
  // remain the fallback for legacy sessions with no cache row.
  // When a cache row exists, it is AUTHORITATIVE: a count mismatch is a
  // 400, never a silent fallback to the client's array — that fallback
  // was a forgery bypass (submit N−1 doctored questions and the server
  // graded against the client's own answer key). Client questions are
  // only used for legacy sessions that predate payload caching.
  let gradingQuestions = body.questions
  try {
    const { data: cachedMsg, error: cacheErr } = await dbAdmin
      .from('study_messages')
      .select('content')
      .eq('session_id', body.sessionId)
      .like('content', '[full-test-v1]%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    // A returned DB error must NOT read as "no cache row" — that would
    // silently grade against the client's own answer key.
    if (cacheErr) {
      console.error('[test/submit] cached payload lookup failed', cacheErr)
      return NextResponse.json({ error: 'served test payload unreadable' }, { status: 500 })
    }
    if (cachedMsg?.content) {
      const cached = JSON.parse(cachedMsg.content.slice('[full-test-v1]'.length)) as {
        questions?: unknown[]
      }
      if (Array.isArray(cached.questions)) {
        if (cached.questions.length !== body.questions.length) {
          return NextResponse.json(
            { error: 'submitted question count does not match the served test' },
            { status: 400 },
          )
        }
        const parsed = z.array(QuestionSchema).safeParse(cached.questions)
        if (parsed.success) {
          gradingQuestions = parsed.data
        } else {
          // Cache exists but is unreadable — refuse rather than trust
          // the client for a session we KNOW was server-served.
          console.error('[test/submit] cached payload failed schema parse', parsed.error)
          return NextResponse.json({ error: 'served test payload unreadable' }, { status: 500 })
        }
      }
    }
  } catch (e) {
    console.error('[test/submit] cached payload lookup failed', e)
    return NextResponse.json({ error: 'served test payload unreadable' }, { status: 500 })
  }

  // Idempotency: if this session already has attempts, don't
  // re-insert (that would double-count in mastery + inflate the
  // history row). Instead reconstruct the SubmitResult from the
  // stored attempts and return it — the UI sees the exact same
  // shape as a fresh grade and drops into the review screen.
  // Order by position (written since the double-submit guard landed);
  // ids are gen_random_uuid() so ordering by id scrambled the verdict
  // order on replay. nullsFirst:false keeps legacy NULL-position rows
  // in a stable (if arbitrary) tail order via the id tiebreak.
  const { data: prior } = await dbAdmin
    .from('study_attempts')
    .select('id, is_correct, student_answer, question, position')
    .eq('session_id', body.sessionId)
    .order('position', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true })
  if (prior && prior.length > 0) {
    // Recompute WEIGHTED totals from the stored rows so the idempotent
    // replay matches a fresh grade (each Complete-the-Words blank
    // counts as one scored question, mirroring the in-test "of 50"
    // display).
    let wTotal = 0
    let wCorrect = 0
    const verdicts = prior.map((row, i) => {
      const q = row.question as z.infer<typeof QuestionSchema>
      const w = weightedScore(q, row.student_answer as string | null)
      wTotal += w.total
      wCorrect += w.correct
      return {
        index: i,
        correct: !!row.is_correct,
        correctAnswer: displayCorrectAnswer(q),
        ...(isOpenResponse(q) ? { ungraded: true } : {}),
      }
    })
    return NextResponse.json({
      success: true,
      idempotent: true,
      totalQuestions: wTotal,
      correctCount: wCorrect,
      scorePercent: wTotal > 0 ? Math.round(100 * wCorrect / wTotal) : 0,
      sat: satScore(wCorrect, wTotal),
      verdicts,
    })
  }

  const verdicts: { index: number; correct: boolean; correctAnswer: string; ungraded?: boolean }[] = []
  // Per-question time. The client now sends the active seconds each
  // question was on screen; when that array is missing (older client,
  // a resume that lost it) or does not reconcile with elapsedSeconds,
  // this falls back to the even split the route always wrote. This
  // route is the ONLY writer of time_spent_seconds for full tests.
  const timeSpent = reconcileQuestionSeconds({
    questionSeconds: body.questionSeconds ?? null,
    elapsedSeconds: body.elapsedSeconds,
    answers: body.answers,
    count: gradingQuestions.length,
  })

  // Weighted totals: each Complete-the-Words BLANK counts as one
  // scored question (matching the client's "Question X of 50"
  // display), with per-blank partial credit. All other types are
  // weight 1. Verdict rows stay one-per-item for the review screen.
  let weightedTotal = 0
  let weightedCorrect = 0
  // Missed, gradable questions to drop into the SRS review queue after a
  // successful insert (skip open-response items — no single correct key).
  const wrongToSeed: { front: string; back: string }[] = []

  const rows = gradingQuestions.map((q, i) => {
    const studentAnswer = body.answers[i] ?? null
    // Open-response items (writing / speaking interview) have no objective
    // answer key — they're rubric-graded elsewhere. Store is_correct=null
    // (not true) so downstream aggregators that count is_correct — the
    // lifetime accuracy stat, achievements — don't treat "wrote enough
    // characters" as a correct answer and inflate the number. They're
    // already excluded from the weighted test score via weightedScore.
    const openResp = isOpenResponse(q)
    const isCorrect = openResp ? false : gradeAnswer(q, studentAnswer)
    const w = weightedScore(q, studentAnswer)
    weightedTotal += w.total
    weightedCorrect += w.correct
    const displayCorrect = displayCorrectAnswer(q)
    if (!isCorrect && !openResp && q.prompt) {
      wrongToSeed.push({
        front: q.prompt,
        back: q.explanation ? `${displayCorrect}\n\n${q.explanation}` : displayCorrect,
      })
    }
    verdicts.push({
      index: i,
      correct: isCorrect,
      correctAnswer: displayCorrect,
      ...(openResp ? { ungraded: true } : {}),
    })
    return {
      session_id: body.sessionId,
      topic_id: session.topic_id,
      // Question index within the test — the partial unique index on
      // (session_id, position) turns a double-submit race into a
      // clean insert failure handled below.
      position: i,
      // `study_attempts.question` is jsonb. The Zod-parsed question carries
      // `graphic: unknown`, which the `Json` column type cannot accept —
      // normalise rather than assert, so an unserialisable graphic payload
      // is caught here instead of landing in the row as `{}`.
      question: toJson(q),
      // Trace back to the bank row. NOT derivable from `question`: choice
      // order is randomised per session at draw time, so a content hash
      // over the served item scatters one bank item across many keys.
      item_id: q.bankItemId ?? null,
      student_answer: studentAnswer,
      // null = not objectively gradable (open response); true/false otherwise.
      is_correct: openResp ? null : isCorrect,
      ai_explanation: q.explanation,
      time_spent_seconds: timeSpent.seconds[i] ?? null,
    }
  })

  const { error: insertError } = await dbAdmin
    .from('study_attempts')
    .insert(rows)
  if (insertError) {
    // 23505 = unique violation on (session_id, position): a concurrent
    // submit won the race after our "prior attempts?" check ran. The
    // whole bulk insert rolled back (single statement), so the stored
    // rows are entirely the winner's — replay them as the idempotent
    // result instead of erroring.
    if (insertError.code === '23505') {
      const { data: raced } = await dbAdmin
        .from('study_attempts')
        .select('is_correct, student_answer, question')
        .eq('session_id', body.sessionId)
        .order('position', { ascending: true, nullsFirst: false })
        .order('id', { ascending: true })
      if (raced && raced.length > 0) {
        let rTotal = 0
        let rCorrect = 0
        const racedVerdicts = raced.map((row, i) => {
          const q = row.question as z.infer<typeof QuestionSchema>
          const w = weightedScore(q, row.student_answer as string | null)
          rTotal += w.total
          rCorrect += w.correct
          return {
            index: i,
            correct: !!row.is_correct,
            correctAnswer: displayCorrectAnswer(q),
            ...(isOpenResponse(q) ? { ungraded: true } : {}),
          }
        })
        return NextResponse.json({
          success: true,
          idempotent: true,
          totalQuestions: rTotal,
          correctCount: rCorrect,
          scorePercent: rTotal > 0 ? Math.round(100 * rCorrect / rTotal) : 0,
          sat: satScore(rCorrect, rTotal),
          verdicts: racedVerdicts,
        })
      }
    }
    console.error('[test/submit] insert failed', insertError)
    return NextResponse.json({ error: 'persist failed' }, { status: 500 })
  }

  // Mark the session completed so it sorts correctly in history and
  // the UI knows it's no longer resumable. Persist the WEIGHTED score
  // — the tests overview and stats "recent tests" panel read from
  // these columns rather than recomputing from attempts on every load.
  // NULL when nothing is key-scorable (an SSAT Writing Sample / ISEE
  // Essay section): "not scored", never 0%. See persistedObjectiveScore.
  const persistedScore = persistedObjectiveScore(weightedCorrect, weightedTotal)
  //
  // Verified before the score goes back to the student: these columns ARE
  // the test result everywhere except this response. An unchecked failure
  // showed the student a score that then appeared nowhere in history or
  // stats — the attempts rows exist, but nothing reads them.
  const { error: completeError } = await dbAdmin
    .from('study_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      score: persistedScore,
      correct_count: weightedCorrect,
      total_count: weightedTotal,
    })
    .eq('id', body.sessionId)
  if (completeError) {
    await raiseAlert({
      severity: 'warning',
      title: 'Test result not persisted',
      message:
        `Test session ${body.sessionId} was graded and its attempts saved, but the session ` +
        'completion/score write failed. The result would not have appeared in history or stats.',
      dedupeKey: `test-submit-complete-failed:${body.sessionId}`,
      error: completeError,
      context: { sessionId: body.sessionId, studentId: user.id, score: persistedScore },
    })
    return NextResponse.json({ error: 'could not save result' }, { status: 500 })
  }

  // TOEFL Speaking/Writing: the percent just written covers only the
  // key-matched items. Grades fired by the client can land before the
  // attempt rows exist, in which case their recompute found nothing
  // ('no attempts') and no later grade will retry it. Recomputing here
  // makes both orders converge on the one scorer. A no-op until every
  // rubric response is graded, and for every non-rubric section.
  if (topicSlug.startsWith('toefl-') && gradingQuestions.some(q => isOpenResponse(q))) {
    try {
      await recomputeAndPersistSessionScore(body.sessionId)
    } catch (e) {
      console.warn('[test/submit] rubric score recompute failed', (e as Error).message)
    }
  }

  // Why the test ended, when it wasn't a deliberate Submit. Written as
  // its OWN statement, after the result is safely persisted, and
  // failure is swallowed: the reason is metadata, and no metadata is
  // worth 500-ing a graded test back to the student. (It also means an
  // environment whose `ended_reason` column hasn't been migrated yet
  // still submits normally — see migration 066.)
  if (body.endReason) {
    const { error: reasonError } = await dbAdmin
      .from('study_sessions')
      .update({ ended_reason: body.endReason })
      .eq('id', body.sessionId)
    if (reasonError) {
      console.warn('[test/submit] ended_reason not persisted', reasonError.message)
    }
  }

  // Fire-and-forget AI mastery assessment. The trigger already
  // updated the numeric score; this fills the qualitative
  // strengths/weaknesses jsonb fields for the recommended shelf.
  // Failure is silent — the test result still ships to the client.
  void assessSessionMastery(body.sessionId)

  // Auto-seed the spaced-repetition queue from every missed question so
  // the student re-encounters them on their next review. Best-effort;
  // capped so a badly-failed 50Q test doesn't flood one review session.
  for (const item of wrongToSeed.slice(0, 20)) {
    void seedSrsFromWrongAnswer({
      studentId: user.id,
      topicId: session.topic_id,
      front: item.front,
      back: item.back,
    })
  }

  // Session-complete XP + celebration. This is the fresh-grade path
  // (idempotent replays returned earlier), so it fires exactly once per
  // completed test. The client emits the big toast off `xpAwarded`.
  void awardXp(user.id, 'session_complete', body.sessionId)

  // Funnel: a completed test — the key activation event.
  void trackEvent(user.id, 'test_completed', {
    scorePercent: persistedScore,
    total: weightedTotal,
  })

  return NextResponse.json({
    success: true,
    totalQuestions: weightedTotal,
    correctCount: weightedCorrect,
    scorePercent: weightedTotal > 0 ? Math.round(100 * weightedCorrect / weightedTotal) : 0,
    sat: satScore(weightedCorrect, weightedTotal),
    xpAwarded: XP_VALUES.session_complete,
    verdicts,
  })
}
