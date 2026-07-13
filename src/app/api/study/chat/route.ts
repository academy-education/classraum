import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/chat — streaming chat tutor.
 *
 * Auth: Bearer token. Service-role lookup verifies the session belongs
 * to the caller and is in chat mode. Same envelope as the rest of the
 * authenticated student APIs.
 *
 * Body: { sessionId, userMessage }
 *
 * Flow:
 *  1. Insert the user message row immediately so the transcript is
 *     intact even if the stream fails halfway.
 *  2. Build the system prompt (topic-scoped, bilingual, K-12 framing).
 *  3. Pull the last ~20 messages for context.
 *  4. streamText to OpenAI gpt-4o-mini, raw text deltas back to the
 *     client over an SSE stream.
 *  5. onFinish persists the assistant message + token counts in one
 *     write so we never store half a response.
 *
 * Rate limit: 30 messages / minute / student to keep a runaway client
 * from melting through the monthly subscription bucket in an evening.
 * Phase 4 hardens this further (daily token caps tied to subscription
 * state).
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface ChatBody {
  sessionId: string
  userMessage: string
}

const SYSTEM_PROMPT_EN = (topicName: string | null, gradeRange: string | null) => `
You are a friendly K-12 study tutor for a Korean academy student. Your job is to help them understand the topic they're studying, explain step-by-step, ask Socratic questions to check understanding, and give targeted feedback.

${topicName ? `Current topic: ${topicName}.` : 'The student picked a free-form topic; figure it out from context.'}
${gradeRange ? `Approximate grade level: ${gradeRange}.` : ''}

Rules:
- Stay strictly on the topic. If the student asks about something off-topic, off-curriculum, or age-inappropriate, gently redirect.
- Explain in short paragraphs. Use examples. Break problems into steps.
- For math: use plain text and standard symbols. Don't use LaTeX.
- Ask follow-up questions to keep the student engaged and check their understanding.
- If the student is stuck, give a hint before the full answer.
- Never claim to grade or assess them officially — those are separate features.
`.trim()

const SYSTEM_PROMPT_KO = (topicName: string | null, gradeRange: string | null) => `
당신은 한국 학원에 다니는 K-12 학생의 친근한 학습 튜터입니다. 학생이 공부 중인 주제를 이해하도록 돕고, 단계별로 설명하며, 소크라테스식 질문으로 이해도를 점검하고, 구체적인 피드백을 제공합니다.

${topicName ? `현재 주제: ${topicName}.` : '학생이 자유 주제를 선택했습니다. 문맥에서 파악하세요.'}
${gradeRange ? `대략적인 학년: ${gradeRange}.` : ''}

규칙:
- 주제에서 벗어나지 마세요. 학생이 주제 밖, 교육 범위 밖, 연령에 부적절한 내용을 물으면 부드럽게 다시 주제로 이끄세요.
- 짧은 단락으로 설명하세요. 예시를 들고, 문제를 단계별로 풀어주세요.
- 수학: 일반 텍스트와 표준 기호를 사용하세요. LaTeX은 사용하지 마세요.
- 학생의 참여를 유지하고 이해도를 확인하기 위해 후속 질문을 하세요.
- 학생이 막혔다면 정답 전에 힌트를 먼저 주세요.
- 공식 채점이나 평가 권한이 있다고 말하지 마세요 — 그건 별도 기능입니다.
`.trim()

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  // 30 msgs / minute / student. enforceRateLimit returns a NextResponse
  // when blocked — we re-shape it into a plain Response since this route
  // is otherwise streaming.
  const blocked = enforceRateLimit(
    `study-chat:user:${user.id}`,
    { windowMs: 60 * 1000, max: 30 }
  )
  if (blocked) return blocked

  let body: ChatBody
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'bad json' }), { status: 400 })
  }
  const { sessionId, userMessage } = body
  if (!sessionId || typeof userMessage !== 'string' || !userMessage.trim()) {
    return new Response(JSON.stringify({ error: 'missing sessionId or userMessage' }), { status: 400 })
  }

  // Verify the session belongs to this user and is in chat mode.
  const { data: session } = await supabaseAdmin
    .from('study_sessions')
    .select('id, student_id, mode, language, topic_id')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session || session.student_id !== user.id) {
    return new Response(JSON.stringify({ error: 'session not found' }), { status: 404 })
  }
  if (session.mode !== 'chat') {
    return new Response(JSON.stringify({ error: 'session is not in chat mode' }), { status: 400 })
  }

  // Look up topic + grade range for the system prompt.
  let topicName: string | null = null
  let gradeRange: string | null = null
  if (session.topic_id) {
    const { data: topic } = await supabaseAdmin
      .from('study_topics')
      .select('name_en, name_ko, grade_min, grade_max')
      .eq('id', session.topic_id)
      .maybeSingle()
    if (topic) {
      topicName = session.language === 'ko' ? topic.name_ko : topic.name_en
      if (topic.grade_min && topic.grade_max) {
        gradeRange = `${topic.grade_min}-${topic.grade_max}`
      } else if (topic.grade_min) {
        gradeRange = `${topic.grade_min}+`
      }
    }
  }

  // Persist the user message before we kick off the stream. If the
  // stream dies we still have a clean transcript.
  await supabaseAdmin
    .from('study_messages')
    .insert({
      session_id: sessionId,
      role: 'user',
      content: userMessage,
    })

  // Pull recent message history for context. 20 messages is enough for
  // the model to remember the thread without blowing the token budget.
  const { data: history } = await supabaseAdmin
    .from('study_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(20)

  const messages = (history ?? [])
    .reverse()
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const systemPrompt = session.language === 'ko'
    ? SYSTEM_PROMPT_KO(topicName, gradeRange)
    : SYSTEM_PROMPT_EN(topicName, gradeRange)

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const result = await streamText({
    model: openai('gpt-4o-mini'),
    system: systemPrompt,
    messages,
    temperature: 0.7,
    onFinish: async (event) => {
      // Persist the assistant message in one write so we never have a
      // half-written row. usage may be undefined on early aborts; default
      // to 0 in that case.
      await supabaseAdmin
        .from('study_messages')
        .insert({
          session_id: sessionId,
          role: 'assistant',
          content: event.text,
          tokens_in: event.usage?.inputTokens ?? 0,
          tokens_out: event.usage?.outputTokens ?? 0,
          model: 'gpt-4o-mini',
        })
    },
  })

  // Plain SSE text stream. The client reads deltas and appends to the
  // active assistant bubble. We don't use the AI SDK's data-stream
  // protocol because we just need raw tokens, not tool calls or
  // structured events.
  return result.toTextStreamResponse()
}
