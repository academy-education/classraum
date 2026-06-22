import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'

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

const QuestionSchema = z.object({
  prompt: z.string(),
  type: z.literal('multiple_choice'),
  choices: z.array(z.string()),
  correct_answer: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  explanation: z.string(),
})

const SubmitSchema = z.object({
  sessionId: z.string(),
  /** Question payloads as originally generated — passed back from
   *  the client so we don't have to re-deserialise the cache row. */
  questions: z.array(QuestionSchema).min(1).max(40),
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

  // Idempotency: if we've already graded this session, refuse the
  // second submission so a double-tap doesn't re-write attempts.
  const { count: existingAttempts } = await supabaseAdmin
    .from('study_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', body.sessionId)
  if ((existingAttempts ?? 0) > 0) {
    return NextResponse.json({ error: 'test already submitted' }, { status: 409 })
  }

  const verdicts: { index: number; correct: boolean; correctAnswer: string }[] = []
  // Distribute the elapsed time across attempts evenly — we don't
  // capture per-question timing in the client (it would be a real
  // anti-cheating signal but adds complexity we don't need yet).
  const perQuestionTime = Math.max(1, Math.round(body.elapsedSeconds / body.questions.length))

  const rows = body.questions.map((q, i) => {
    const studentAnswer = body.answers[i] ?? null
    const isCorrect = studentAnswer != null
      && studentAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
    verdicts.push({ index: i, correct: isCorrect, correctAnswer: q.correct_answer })
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
  // the UI knows it's no longer resumable.
  await supabaseAdmin
    .from('study_sessions')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', body.sessionId)

  const correctCount = verdicts.filter(v => v.correct).length
  return NextResponse.json({
    success: true,
    totalQuestions: body.questions.length,
    correctCount,
    scorePercent: Math.round(100 * correctCount / body.questions.length),
    verdicts,
  })
}
