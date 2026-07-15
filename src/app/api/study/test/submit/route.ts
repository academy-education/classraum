import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { assessSessionMastery } from '@/lib/study-mastery-assess'
import { estimateSectionScore } from '@/lib/study/sat-adaptive'
import { requireStudyUser } from '@/lib/study/auth'
import { awardXp, XP_VALUES } from '@/lib/study/xp'
import { seedSrsFromWrongAnswer } from '@/lib/study/srs-seed'

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

  const { data: session } = await supabaseAdmin
    .from('study_sessions')
    .select('id, student_id, mode, topic_id, module2_route')
    .eq('id', body.sessionId)
    .maybeSingle()
  if (!session || session.student_id !== user.id) {
    return NextResponse.json({ error: 'session not found' }, { status: 404 })
  }
  if (session.mode !== 'full_test') {
    return NextResponse.json({ error: 'session is not in full_test mode' }, { status: 400 })
  }

  // Adaptive SAT sessions carry the earned Module 2 route; the score
  // reveal adds a path-weighted 200–800 section-score band on top of
  // the raw percentage. `satScore(correct, total)` builds it, or null
  // for non-adaptive sessions.
  const module2Route = session.module2_route === 'hard' || session.module2_route === 'easy'
    ? session.module2_route
    : null
  const satScore = (correct: number, total: number) =>
    module2Route ? estimateSectionScore(correct, total, module2Route) : null

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
    const { data: cachedMsg, error: cacheErr } = await supabaseAdmin
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
  const { data: prior } = await supabaseAdmin
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
  // Distribute the elapsed time across attempts evenly — we don't
  // capture per-question timing in the client (it would be a real
  // anti-cheating signal but adds complexity we don't need yet).
  const perQuestionTime = Math.max(1, Math.round(body.elapsedSeconds / gradingQuestions.length))

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
    const isCorrect = gradeAnswer(q, studentAnswer)
    const w = weightedScore(q, studentAnswer)
    weightedTotal += w.total
    weightedCorrect += w.correct
    const displayCorrect = displayCorrectAnswer(q)
    if (!isCorrect && !isOpenResponse(q) && q.prompt) {
      wrongToSeed.push({
        front: q.prompt,
        back: q.explanation ? `${displayCorrect}\n\n${q.explanation}` : displayCorrect,
      })
    }
    verdicts.push({
      index: i,
      correct: isCorrect,
      correctAnswer: displayCorrect,
      ...(isOpenResponse(q) ? { ungraded: true } : {}),
    })
    return {
      session_id: body.sessionId,
      topic_id: session.topic_id,
      // Question index within the test — the partial unique index on
      // (session_id, position) turns a double-submit race into a
      // clean insert failure handled below.
      position: i,
      question: q,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      ai_explanation: q.explanation,
      time_spent_seconds: studentAnswer == null ? null : perQuestionTime,
    }
  })

  const { error: insertError } = await supabaseAdmin
    .from('study_attempts')
    .insert(rows)
  if (insertError) {
    // 23505 = unique violation on (session_id, position): a concurrent
    // submit won the race after our "prior attempts?" check ran. The
    // whole bulk insert rolled back (single statement), so the stored
    // rows are entirely the winner's — replay them as the idempotent
    // result instead of erroring.
    if (insertError.code === '23505') {
      const { data: raced } = await supabaseAdmin
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
  const persistedScore = weightedTotal > 0
    ? Math.round((10000 * weightedCorrect) / weightedTotal) / 100
    : 0
  await supabaseAdmin
    .from('study_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      score: persistedScore,
      correct_count: weightedCorrect,
      total_count: weightedTotal,
    })
    .eq('id', body.sessionId)

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

/** Open-response types have no objective answer key — they're scored
 *  by the gpt-4o rubric grader in the review pane, not here. Counting
 *  them as "correct" on a length check inflated the auto-score (a
 *  long-enough gibberish paste scored 100% on Writing), so they're
 *  excluded from the score denominator entirely. */
function isOpenResponse(q: z.infer<typeof QuestionSchema>): boolean {
  return q.type === 'speaking_interview'
    || q.type === 'writing_email'
    || q.type === 'writing_discussion'
}

/** Weighted (per-blank) contribution of one question to the score.
 *  fill_in_blanks: total = number of blanks, correct = number of
 *  blanks whose typed letters match (answer or any alternate).
 *  Open-response (interview / email / discussion): total = 0 — rubric-
 *  graded separately, see isOpenResponse. Every other type: total = 1,
 *  correct = gradeAnswer verdict. */
function weightedScore(
  q: z.infer<typeof QuestionSchema>,
  studentAnswer: string | null,
): { total: number; correct: number } {
  if (isOpenResponse(q)) return { total: 0, correct: 0 }
  if (q.type === 'fill_in_blanks') {
    const blanks = q.blanks ?? []
    if (blanks.length === 0) return { total: 1, correct: 0 }
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
    let picked: Record<string, string> = {}
    if (studentAnswer) {
      try {
        const parsed = JSON.parse(studentAnswer)
        if (parsed && typeof parsed === 'object') picked = parsed as Record<string, string>
      } catch { /* unparseable → all blanks wrong */ }
    }
    let correct = 0
    for (const b of blanks) {
      const val = norm(picked[String(b.id)] ?? '')
      if (!val) continue
      const accepted = [b.answer, ...(b.alternates ?? [])].map(norm)
      if (accepted.includes(val)) correct++
    }
    return { total: blanks.length, correct }
  }
  return { total: 1, correct: gradeAnswer(q, studentAnswer) ? 1 : 0 }
}

/** Type-aware grader. Each question variant has its own correctness
 *  rule: MC = exact choice match (case-insensitive trim), numeric_entry
 *  = student input matches any acceptable_answer (after normalization),
 *  multi_select = parsed JSON array equals correct_answers (order-
 *  insensitive set match). */
function gradeAnswer(q: z.infer<typeof QuestionSchema>, studentAnswer: string | null): boolean {
  if (studentAnswer == null || studentAnswer.trim() === '') return false
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

  if (q.type === 'numeric_entry') {
    const accepted = q.acceptable_answers ?? []
    if (accepted.length === 0) return false
    // Normalize both sides — strip whitespace, accept "12", "12.0",
    // "12/1" as equivalent if they appear in acceptable_answers.
    const studentNum = normalizeNumeric(studentAnswer)
    return accepted.some(a => normalizeNumeric(a) === studentNum)
  }

  if (q.type === 'multi_select') {
    const expected = q.correct_answers ?? []
    if (expected.length === 0) return false
    let picked: string[]
    try { picked = JSON.parse(studentAnswer) } catch { return false }
    if (!Array.isArray(picked)) return false
    // Strict SET equality — dedupes the picks first so ["A","A"]
    // can't masquerade as two distinct correct selections.
    const pickedSet = new Set(picked.map(p => norm(String(p))))
    const expectedSet = new Set(expected.map(norm))
    if (pickedSet.size !== expectedSet.size) return false
    for (const p of pickedSet) if (!expectedSet.has(p)) return false
    return true
  }

  // TOEFL Complete-the-Words: passage has [1] [2] [3] placeholders; student
  // submits JSON {"1":"s","2":"to",...}. All blanks must match (each blank
  // accepts answer or any alternate, case-insensitive trim).
  if (q.type === 'fill_in_blanks') {
    const blanks = q.blanks ?? []
    if (blanks.length === 0) return false
    let picked: Record<string, string>
    try { picked = JSON.parse(studentAnswer) } catch { return false }
    if (!picked || typeof picked !== 'object') return false
    for (const b of blanks) {
      const studentVal = norm(picked[String(b.id)] ?? '')
      if (!studentVal) return false
      const accepted = [b.answer, ...(b.alternates ?? [])].map(norm)
      if (!accepted.includes(studentVal)) return false
    }
    return true
  }

  // TOEFL Build-a-Sentence: choices are the word/phrase chips; student
  // submits the chips joined in chosen order with " | ". Compare to
  // correct_answer (same delimiter).
  if (q.type === 'arrange_words') {
    return norm(studentAnswer) === norm(q.correct_answer ?? '')
  }

  // TOEFL Listen-and-Repeat: the answer is a Whisper TRANSCRIPT of
  // the student's speech, which routinely differs from the target in
  // punctuation style (curly quotes, ellipses), casing, and small
  // lexical drift. Grade with Unicode-wide punctuation stripping +
  // a token-overlap threshold instead of brittle exact equality —
  // saying the sentence correctly should pass even if Whisper writes
  // "twenty" for "20" in one spot.
  if (q.type === 'speaking_repeat') {
    const stripPunct = (s: string) => s
      .toLowerCase()
      // ASCII + Unicode punctuation Whisper emits: curly quotes,
      // ellipsis, en/em dashes, guillemets.
      .replace(/[.,!?;:'"\-—–…‘’“”«»()]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    const a = stripPunct(studentAnswer)
    const b = stripPunct(q.correct_answer ?? '')
    if (!b) return false
    if (a === b) return true
    // Token-overlap similarity: fraction of target tokens present in
    // the transcript (multiset). ≥85% counts as a correct repetition.
    const tokensA = a.split(' ').filter(Boolean)
    const tokensB = b.split(' ').filter(Boolean)
    if (tokensB.length === 0) return false
    const pool = new Map<string, number>()
    for (const t of tokensA) pool.set(t, (pool.get(t) ?? 0) + 1)
    let matched = 0
    for (const t of tokensB) {
      const n = pool.get(t) ?? 0
      if (n > 0) { matched++; pool.set(t, n - 1) }
    }
    return matched / tokensB.length >= 0.85
  }

  // TOEFL Take-an-Interview: open response — no auto-grading. Counted as
  // attempted (returns true if non-empty) since rubric-grading is handled
  // separately via /api/study/response/grade.
  if (q.type === 'speaking_interview') {
    return studentAnswer.trim().length > 20
  }

  // TOEFL Writing Email / Academic Discussion: open response, rubric-graded
  // via /api/study/response/grade. In the auto-grader we mark as attempted
  // if the student wrote a substantive response (>=50 chars for email,
  // >=80 chars for discussion — well below the 100+ word target but enough
  // to distinguish "tried" from "skipped").
  if (q.type === 'writing_email') {
    return studentAnswer.trim().length >= 50
  }
  if (q.type === 'writing_discussion') {
    return studentAnswer.trim().length >= 80
  }

  // multiple_choice / three_choice / quant_comparison — exact match.
  return norm(studentAnswer) === norm(q.correct_answer ?? '')
}

/** Human-readable correct answer for the UI verdict display. */
function displayCorrectAnswer(q: z.infer<typeof QuestionSchema>): string {
  if (q.type === 'numeric_entry') return q.acceptable_answers?.[0] ?? ''
  if (q.type === 'multi_select') return (q.correct_answers ?? []).join(' + ')
  if (q.type === 'fill_in_blanks') {
    return (q.blanks ?? []).map(b => `[${b.id}] ${b.answer}`).join(', ')
  }
  if (q.type === 'speaking_interview') return '—'  // open-ended
  if (q.type === 'writing_email' || q.type === 'writing_discussion') return '—'  // rubric-graded
  return q.correct_answer ?? ''
}

/** Normalize numeric input so "12", "12.0", "12.00", " 12 " all match.
 *  Fractions like "5/8" stay as-is for string compare. */
function normalizeNumeric(s: string): string {
  const t = s.trim().replace(/\s+/g, '')
  if (/^-?\d+\.?\d*$/.test(t)) {
    const n = parseFloat(t)
    if (Number.isFinite(n)) return n.toString()
  }
  return t
}
