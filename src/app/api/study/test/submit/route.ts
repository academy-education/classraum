import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { assessSessionMastery } from '@/lib/study-mastery-assess'

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
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

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

  const { data: session } = await supabaseAdmin
    .from('study_sessions')
    .select('id, student_id, mode, topic_id')
    .eq('id', body.sessionId)
    .maybeSingle()
  if (!session || session.student_id !== user.id) {
    return NextResponse.json({ error: 'session not found' }, { status: 404 })
  }
  if (session.mode !== 'full_test') {
    return NextResponse.json({ error: 'session is not in full_test mode' }, { status: 400 })
  }

  // Idempotency: if this session already has attempts, don't
  // re-insert (that would double-count in mastery + inflate the
  // history row). Instead reconstruct the SubmitResult from the
  // stored attempts and return it — the UI sees the exact same
  // shape as a fresh grade and drops into the review screen.
  const { data: prior } = await supabaseAdmin
    .from('study_attempts')
    .select('id, is_correct, student_answer, question')
    .eq('session_id', body.sessionId)
    .order('id', { ascending: true })
  if (prior && prior.length > 0) {
    const verdicts = prior.map((row, i) => ({
      index: i,
      correct: !!row.is_correct,
      correctAnswer: displayCorrectAnswer(row.question as z.infer<typeof QuestionSchema>),
    }))
    const correctCount = verdicts.filter(v => v.correct).length
    return NextResponse.json({
      success: true,
      idempotent: true,
      totalQuestions: prior.length,
      correctCount,
      scorePercent: Math.round(100 * correctCount / prior.length),
      verdicts,
    })
  }

  const verdicts: { index: number; correct: boolean; correctAnswer: string }[] = []
  // Distribute the elapsed time across attempts evenly — we don't
  // capture per-question timing in the client (it would be a real
  // anti-cheating signal but adds complexity we don't need yet).
  const perQuestionTime = Math.max(1, Math.round(body.elapsedSeconds / body.questions.length))

  const rows = body.questions.map((q, i) => {
    const studentAnswer = body.answers[i] ?? null
    const isCorrect = gradeAnswer(q, studentAnswer)
    const displayCorrect = displayCorrectAnswer(q)
    verdicts.push({ index: i, correct: isCorrect, correctAnswer: displayCorrect })
    return {
      session_id: body.sessionId,
      topic_id: session.topic_id,
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
    console.error('[test/submit] insert failed', insertError)
    return NextResponse.json({ error: 'persist failed' }, { status: 500 })
  }

  // Mark the session completed so it sorts correctly in history and
  // the UI knows it's no longer resumable. Persist the score alongside
  // — the tests overview and stats "recent tests" panel read from
  // these columns rather than recomputing from attempts on every load.
  const totalCount = body.questions.length
  const persistedCorrect = verdicts.filter(v => v.correct).length
  const persistedScore = totalCount > 0
    ? Math.round((10000 * persistedCorrect) / totalCount) / 100
    : 0
  await supabaseAdmin
    .from('study_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      score: persistedScore,
      correct_count: persistedCorrect,
      total_count: totalCount,
    })
    .eq('id', body.sessionId)

  // Fire-and-forget AI mastery assessment. The trigger already
  // updated the numeric score; this fills the qualitative
  // strengths/weaknesses jsonb fields for the recommended shelf.
  // Failure is silent — the test result still ships to the client.
  void assessSessionMastery(body.sessionId)

  const correctCount = verdicts.filter(v => v.correct).length
  return NextResponse.json({
    success: true,
    totalQuestions: body.questions.length,
    correctCount,
    scorePercent: Math.round(100 * correctCount / body.questions.length),
    verdicts,
  })
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
    if (!Array.isArray(picked) || picked.length !== expected.length) return false
    const expectedSet = new Set(expected.map(norm))
    return picked.every(p => expectedSet.has(norm(p))) && picked.length === expectedSet.size
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

  // TOEFL Listen-and-Repeat: student types back what they heard. Exact
  // match against correct_answer (case-insensitive trim — punctuation
  // tolerated by the norm function via whitespace collapse).
  if (q.type === 'speaking_repeat') {
    const stripPunct = (s: string) => s.toLowerCase().replace(/[.,!?;:'"\-—]/g, '').replace(/\s+/g, ' ').trim()
    return stripPunct(studentAnswer) === stripPunct(q.correct_answer ?? '')
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
