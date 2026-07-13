import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/flashcards/generate — produce a flashcard deck for
 * the session's topic.
 *
 * Resume cached the same way as lessons — single study_messages row
 * prefixed [flashcards-v1] + JSON so revisits don't repay the
 * generation cost. Individual card reviews persist as study_attempts
 * rows with question.type = 'flashcard' (out-of-band from the
 * generate route — the client posts attempts directly via the
 * normal study_attempts insert path with RLS).
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const CardSchema = z.object({
  front: z.string().describe('The cue — term, question, or concept. Short.'),
  back: z.string().describe('The answer / definition. 1-2 short sentences.'),
  hint: z.string().nullable().describe('Optional gentle hint. null if not needed.'),
})

const DeckSchema = z.object({
  cards: z.array(CardSchema).min(8).max(16),
})

type Deck = z.infer<typeof DeckSchema>

const PROMPT_EN = (topic: string, grade: string | null) => `
Build a flashcard deck for a student studying "${topic}"${grade ? ` at grade level ${grade}` : ''}.

Output 8-16 cards. Each card has:
- front: the cue (term, formula, key question, or concept name). Keep short.
- back: the answer or definition. 1-2 short sentences, plain text.
- hint: an optional gentle hint (set to null if the front is already obvious).

Rules:
- Focus on the most testable, most memorisable facts for this topic.
- Mix term→definition and question→answer cards.
- No trick questions, no jargon without definition.
- Plain text only — no markdown, no LaTeX, no special formatting.
`.trim()

const PROMPT_KO = (topic: string, grade: string | null) => `
"${topic}" 주제를 공부하는 학생을 위한 플래시카드 덱을 만드세요${grade ? ` (학년: ${grade})` : ''}.

8-16장의 카드를 출력하세요. 각 카드는:
- front: 단서 (용어, 공식, 핵심 질문, 또는 개념 이름). 짧게.
- back: 답이나 정의. 1-2 문장의 일반 텍스트.
- hint: 선택적 힌트 (front가 이미 명확하면 null).

규칙:
- 시험에 자주 나오고 외워둘 가치가 큰 사실에 집중하세요.
- 용어→정의 카드와 질문→답 카드를 섞으세요.
- 트릭 문제, 정의 없는 전문 용어 금지.
- 일반 텍스트만 — 마크다운, LaTeX, 특수 서식 금지.
- 모든 텍스트는 한국어로 작성하세요.
`.trim()

const CACHED_DECK_MARKER = '[flashcards-v1]'

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(
    `flashcards-generate:user:${user.id}`,
    { windowMs: 10 * 60 * 1000, max: 10 }
  )
  if (blocked) return blocked

  let body: { sessionId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const sessionId = body.sessionId
  if (!sessionId) return NextResponse.json({ error: 'missing sessionId' }, { status: 400 })

  const { data: session } = await supabaseAdmin
    .from('study_sessions')
    .select('id, student_id, mode, language, topic_id, topic_freeform')
    .eq('id', sessionId)
    .maybeSingle()
  if (!session || session.student_id !== user.id) {
    return NextResponse.json({ error: 'session not found' }, { status: 404 })
  }
  if (session.mode !== 'flashcards') {
    return NextResponse.json({ error: 'session is not in flashcards mode' }, { status: 400 })
  }

  // Idempotency cache check — same shape as lesson route.
  const { data: existingRows } = await supabaseAdmin
    .from('study_messages')
    .select('content')
    .eq('session_id', sessionId)
    .eq('role', 'assistant')
    .ilike('content', `${CACHED_DECK_MARKER}%`)
    .limit(1)
  if (existingRows && existingRows.length > 0) {
    const raw = existingRows[0].content.slice(CACHED_DECK_MARKER.length)
    try {
      const cached = JSON.parse(raw) as Deck
      return NextResponse.json({ deck: cached, cached: true })
    } catch {
      // Corrupt cache → regenerate.
    }
  }

  // Topic context.
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
  if (!topicName) return NextResponse.json({ error: 'session has no topic' }, { status: 400 })

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: DeckSchema,
      prompt: session.language === 'ko'
        ? PROMPT_KO(topicName, gradeRange)
        : PROMPT_EN(topicName, gradeRange),
      temperature: 0.5,
    })
    const deck = result.object

    await supabaseAdmin
      .from('study_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: CACHED_DECK_MARKER + JSON.stringify(deck),
        tokens_in: result.usage?.inputTokens ?? 0,
        tokens_out: result.usage?.outputTokens ?? 0,
        model: 'gpt-4o-mini',
      })

    return NextResponse.json({ deck, cached: false })
  } catch (err) {
    console.error('[flashcards/generate]', err)
    return NextResponse.json({ error: 'generation failed' }, { status: 502 })
  }
}
