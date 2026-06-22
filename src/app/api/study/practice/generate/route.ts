import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/study/practice/generate — produce a batch of practice
 * questions for the topic this session is scoped to.
 *
 * Returns a plain JSON array. Questions are not persisted at
 * generation time — they land in study_attempts when the student
 * answers them via /grade. Keeps the schema clean of unused rows
 * if the student abandons mid-set.
 *
 * Output is forced into a Zod schema via the AI SDK's generateObject
 * so the client never has to defensively parse free-form JSON.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const QuestionSchema = z.object({
  prompt: z.string().describe('The question text shown to the student.'),
  type: z.enum(['multiple_choice', 'true_false', 'short_answer'])
    .describe('Question format.'),
  choices: z.array(z.string()).nullable()
    .describe('Choices for multiple_choice (3-4 items). null for true_false / short_answer.'),
  correct_answer: z.string()
    .describe('The correct answer. For MC: the exact choice string. For T/F: "True" or "False". For short_answer: the canonical answer.'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  explanation: z.string()
    .describe('Short explanation of why the answer is correct, shown after the student answers.'),
})

const ResponseSchema = z.object({
  questions: z.array(QuestionSchema).min(3).max(10),
})

const PROMPT_EN = (topic: string, grade: string | null, count: number) => `
Generate ${count} practice questions for a student studying "${topic}"${grade ? ` at grade level ${grade}` : ''}.

Rules:
- Mix difficulties (some easy, some medium, some hard).
- Mix formats: about 60% multiple_choice, 20% true_false, 20% short_answer. Skip short_answer for math topics where the answer is a single number — use multiple_choice instead so grading is deterministic.
- For multiple_choice: provide 4 plausible choices. Wrong answers should be common mistakes a student of this level would make, not nonsense.
- For short_answer: keep the canonical answer to one or two words / a single expression. Avoid open-ended questions where multiple wordings could be correct.
- Explanations should be 1-2 sentences. Plain text, no LaTeX, no markdown.
- Stay strictly on the topic. No off-topic, age-inappropriate, or trick questions.
`.trim()

const PROMPT_KO = (topic: string, grade: string | null, count: number) => `
"${topic}" 주제를 공부하는 학생을 위한 연습 문제 ${count}개를 생성하세요${grade ? ` (학년: ${grade})` : ''}.

규칙:
- 난이도를 섞어주세요 (easy / medium / hard).
- 형식 비율: 객관식 60%, 참거짓 20%, 단답 20%. 정답이 숫자 하나로 떨어지는 수학 주제는 단답을 객관식으로 대체하세요(채점 일관성).
- 객관식: 그럴듯한 보기 4개. 오답은 해당 학년 학생이 자주 하는 실수여야 합니다.
- 단답: 정답은 한두 단어 또는 단일 식. 여러 표현이 정답이 될 수 있는 모호한 문제는 피하세요.
- 해설은 1-2문장. 일반 텍스트로, LaTeX이나 마크다운 사용 금지.
- 주제에서 벗어나거나, 연령에 부적절하거나, 트릭 문제는 금지.
- 모든 질문, 보기, 정답, 해설을 한국어로 작성하세요.
`.trim()

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Generation is expensive — limit to 10 batches / 10 min / student.
  const blocked = enforceRateLimit(
    `practice-generate:user:${user.id}`,
    { windowMs: 10 * 60 * 1000, max: 10 }
  )
  if (blocked) return blocked

  let body: { sessionId?: string; count?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }
  const sessionId = body.sessionId
  const count = Math.max(3, Math.min(10, body.count ?? 5))
  if (!sessionId) {
    return NextResponse.json({ error: 'missing sessionId' }, { status: 400 })
  }

  const { data: session } = await supabaseAdmin
    .from('study_sessions')
    .select('id, student_id, mode, language, topic_id, topic_freeform')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session || session.student_id !== user.id) {
    return NextResponse.json({ error: 'session not found' }, { status: 404 })
  }
  if (session.mode !== 'practice') {
    return NextResponse.json({ error: 'session is not in practice mode' }, { status: 400 })
  }

  // Topic context for the prompt.
  let topicName: string | null = session.topic_freeform ?? null
  let gradeRange: string | null = null
  if (session.topic_id) {
    const { data: topic } = await supabaseAdmin
      .from('study_topics')
      .select('name_en, name_ko, grade_min, grade_max')
      .eq('id', session.topic_id)
      .maybeSingle()
    if (topic) {
      topicName = session.language === 'ko' ? topic.name_ko : topic.name_en
      if (topic.grade_min && topic.grade_max) gradeRange = `${topic.grade_min}-${topic.grade_max}`
      else if (topic.grade_min) gradeRange = `${topic.grade_min}+`
    }
  }
  if (!topicName) {
    return NextResponse.json({ error: 'session has no topic' }, { status: 400 })
  }

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: ResponseSchema,
      prompt: session.language === 'ko'
        ? PROMPT_KO(topicName, gradeRange, count)
        : PROMPT_EN(topicName, gradeRange, count),
      temperature: 0.7,
    })
    return NextResponse.json({ questions: result.object.questions })
  } catch (err) {
    console.error('[practice/generate]', err)
    return NextResponse.json({ error: 'generation failed' }, { status: 502 })
  }
}
