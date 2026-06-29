import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { awardXp } from '@/lib/study/xp'

/**
 * POST /api/study/practice/grade — verdict + explanation on one
 * student answer, plus persist the attempt to study_attempts.
 *
 * Cost trick: multiple_choice and true_false are graded by exact
 * string match on the server, no AI call. We still return the
 * generation-time explanation so the student gets feedback. Only
 * short_answer questions go through the AI judge.
 *
 * Why no client-side grading: the answer + judgment lands in
 * study_attempts so we can build mastery scores in Phase 3, and the
 * server is the only place we trust to write that table.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const QuestionSchema = z.object({
  prompt: z.string(),
  type: z.enum(['multiple_choice', 'true_false', 'short_answer']),
  choices: z.array(z.string()).nullable(),
  correct_answer: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  explanation: z.string(),
})

const VerdictSchema = z.object({
  isCorrect: z.boolean()
    .describe('True if the student answer is essentially correct, even with minor wording differences.'),
  aiExplanation: z.string()
    .describe('1-2 sentence explanation. If correct, reinforce why. If wrong, point to the misconception in a kind way and give the right answer.'),
})

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Generous because answering is per-question. Cap at 120/min so a
  // stuck-loop bug can't melt through tokens.
  const blocked = enforceRateLimit(
    `practice-grade:user:${user.id}`,
    { windowMs: 60 * 1000, max: 120 }
  )
  if (blocked) return blocked

  let body: {
    sessionId?: string
    question?: z.infer<typeof QuestionSchema>
    studentAnswer?: string
    timeSpentSeconds?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }
  const { sessionId, question, studentAnswer, timeSpentSeconds } = body

  // Schema validate the question payload — protects us if the client
  // got out of sync with the generator.
  const parsedQ = QuestionSchema.safeParse(question)
  if (!sessionId || !parsedQ.success || typeof studentAnswer !== 'string') {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  }
  const q = parsedQ.data

  const { data: session } = await supabaseAdmin
    .from('study_sessions')
    .select('id, student_id, mode, language, topic_id')
    .eq('id', sessionId)
    .maybeSingle()
  if (!session || session.student_id !== user.id) {
    return NextResponse.json({ error: 'session not found' }, { status: 404 })
  }
  if (session.mode !== 'practice') {
    return NextResponse.json({ error: 'session is not in practice mode' }, { status: 400 })
  }

  let isCorrect: boolean
  let aiExplanation: string

  // Cheap path: MC and T/F are deterministic. Skip AI entirely.
  if (q.type === 'multiple_choice' || q.type === 'true_false') {
    isCorrect = studentAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
    aiExplanation = q.explanation
  } else {
    // Short-answer: ask the AI to judge wording-tolerant correctness.
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
    try {
      const judgePrompt = session.language === 'ko'
        ? `학생이 다음 문제에 답했습니다. 표현이 다르더라도 본질적으로 같은 의미면 정답으로 판정하세요.\n\n문제: ${q.prompt}\n정답: ${q.correct_answer}\n학생 답: ${studentAnswer}\n\n간결하게 판정하고, 1-2문장의 한국어 해설을 작성하세요. 틀렸다면 친절하게 오개념을 짚고 정답을 알려주세요.`
        : `A student answered the question below. Judge correctness leniently — minor wording differences should still count.\n\nQuestion: ${q.prompt}\nCorrect answer: ${q.correct_answer}\nStudent answer: ${studentAnswer}\n\nReturn a verdict + 1-2 sentence explanation. If wrong, kindly point to the misconception and give the right answer.`
      const judgeResult = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: VerdictSchema,
        prompt: judgePrompt,
        temperature: 0.2,
      })
      isCorrect = judgeResult.object.isCorrect
      aiExplanation = judgeResult.object.aiExplanation
    } catch (err) {
      console.error('[practice/grade]', err)
      // Fall back to literal string match so the student still gets
      // something rather than a hard error.
      isCorrect = studentAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
      aiExplanation = q.explanation
    }
  }

  // Persist the attempt. The question payload is stored verbatim so
  // we can replay analytics later without re-generating.
  await supabaseAdmin
    .from('study_attempts')
    .insert({
      session_id: sessionId,
      topic_id: session.topic_id,
      question: q,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      ai_explanation: aiExplanation,
      time_spent_seconds: typeof timeSpentSeconds === 'number' ? timeSpentSeconds : null,
    })

  // Fire-and-forget XP award for the weekly league (Phase 6e). Only
  // correct answers award XP — wrong attempts don't penalise but don't
  // earn either.
  if (isCorrect) void awardXp(user.id, 'attempt_correct', sessionId)

  return NextResponse.json({ isCorrect, aiExplanation })
}
