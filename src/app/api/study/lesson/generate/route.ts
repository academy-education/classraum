import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/study/lesson/generate — generate a structured lesson +
 * comprehension questions for a topic.
 *
 * Resume-friendly: on first call the lesson is persisted to
 * study_messages as a single assistant row with the JSON payload
 * stringified in `content`. Subsequent visits return that cached
 * lesson instead of paying a regeneration cost. The route is
 * idempotent — calling twice on the same session yields the same
 * lesson.
 *
 * Comprehension answers go through the existing practice/grade
 * endpoint since the question shape is identical.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SectionSchema = z.object({
  heading: z.string(),
  body: z.string().describe('1-3 short paragraphs of explanation. Plain text, no markdown.'),
  example: z.string().nullable().describe('Optional worked example. Plain text. null if not applicable.'),
})

const ComprehensionSchema = z.object({
  prompt: z.string(),
  type: z.literal('multiple_choice'),
  choices: z.array(z.string()).length(4),
  correct_answer: z.string().describe('Must match one of the choices exactly.'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  explanation: z.string(),
})

const LessonSchema = z.object({
  title: z.string(),
  introduction: z.string().describe('1 short paragraph framing the lesson.'),
  sections: z.array(SectionSchema).min(2).max(5),
  keyTakeaways: z.array(z.string()).min(3).max(6),
  comprehension: z.array(ComprehensionSchema).length(3),
})

type Lesson = z.infer<typeof LessonSchema>

const PROMPT_EN = (topic: string, grade: string | null) => `
Write a short structured lesson for a student studying "${topic}"${grade ? ` at grade level ${grade}` : ''}.

Output an object with:
- title: the lesson title, in plain text.
- introduction: one short paragraph framing why this matters.
- sections: 2-5 sections, each with a heading, 1-3 paragraphs of body, and an optional worked example. Plain text only — no markdown, no LaTeX.
- keyTakeaways: 3-6 bullet-style sentences distilling the lesson.
- comprehension: exactly 3 multiple-choice questions checking the most important ideas. Each has 4 plausible choices with one correct.

Rules:
- Stay strictly on topic.
- Use concrete examples a student of this level would recognise.
- Avoid jargon unless you define it in-line.
- Aim for ~400-700 words across all sections combined.
`.trim()

const PROMPT_KO = (topic: string, grade: string | null) => `
"${topic}" 주제를 공부하는 학생을 위한 간단한 구조화 강의를 작성하세요${grade ? ` (학년: ${grade})` : ''}.

다음 구조의 객체를 출력하세요:
- title: 강의 제목 (일반 텍스트).
- introduction: 왜 중요한지 짧게 설명하는 한 문단.
- sections: 2-5개 섹션. 각 섹션은 heading, 1-3문단의 body, 그리고 선택적 example (없으면 null). 일반 텍스트만 — 마크다운, LaTeX 금지.
- keyTakeaways: 강의의 핵심을 정리한 3-6개의 짧은 문장.
- comprehension: 가장 중요한 개념을 점검하는 객관식 문제 정확히 3개. 각 문제는 4개의 그럴듯한 보기와 1개의 정답.

규칙:
- 주제에서 벗어나지 마세요.
- 해당 학년 학생이 알아볼 수 있는 구체적인 예시를 사용하세요.
- 전문 용어는 그 자리에서 풀어서 설명하세요.
- 전체 분량은 400-700자 정도가 적당합니다.
- 모든 텍스트는 한국어로 작성하세요.
`.trim()

const CACHED_LESSON_MARKER = '[lesson-v1]'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const blocked = enforceRateLimit(
    `lesson-generate:user:${user.id}`,
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
  if (session.mode !== 'lesson') {
    return NextResponse.json({ error: 'session is not in lesson mode' }, { status: 400 })
  }

  // Idempotency check — return the cached lesson if it exists. We
  // stash the marker prefix so a future schema migration can find +
  // bump these rows.
  const { data: existingRows } = await supabaseAdmin
    .from('study_messages')
    .select('content')
    .eq('session_id', sessionId)
    .eq('role', 'assistant')
    .ilike('content', `${CACHED_LESSON_MARKER}%`)
    .limit(1)
  if (existingRows && existingRows.length > 0) {
    const raw = existingRows[0].content.slice(CACHED_LESSON_MARKER.length)
    try {
      const cached = JSON.parse(raw) as Lesson
      return NextResponse.json({ lesson: cached, cached: true })
    } catch {
      // Cache row is corrupt — fall through to regenerate.
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
      schema: LessonSchema,
      prompt: session.language === 'ko'
        ? PROMPT_KO(topicName, gradeRange)
        : PROMPT_EN(topicName, gradeRange),
      temperature: 0.6,
    })
    const lesson = result.object

    // Cache the lesson for resume. Single row keyed by the marker
    // prefix so we can find it again without a separate column.
    await supabaseAdmin
      .from('study_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: CACHED_LESSON_MARKER + JSON.stringify(lesson),
        tokens_in: result.usage?.inputTokens ?? 0,
        tokens_out: result.usage?.outputTokens ?? 0,
        model: 'gpt-4o-mini',
      })

    return NextResponse.json({ lesson, cached: false })
  } catch (err) {
    console.error('[lesson/generate]', err)
    return NextResponse.json({ error: 'generation failed' }, { status: 502 })
  }
}
