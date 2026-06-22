import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { loadStudyPromptContext, renderTestPrepBlock } from '@/lib/study-prompt-context'

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

/**
 * Subject lessons explain a concept; test-prep lessons explain a
 * test's strategy + format + traps. They share the output schema so
 * the UI renders both identically — the difference is purely in the
 * prompt body.
 */
const SUBJECT_PROMPT_EN = (topic: string, grade: string | null) => `
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

const TEST_PROMPT_EN = (topic: string, formatBlock: string) => `
Write a short structured lesson teaching a student how to handle the following test section: ${topic}.

${formatBlock}

This is a TEST-PREP lesson, not a content lesson. Focus on:
- The format the student will actually see (passage length, question count, choice count, time pressure).
- The 2-4 question patterns that show up most often.
- Strategies for handling each pattern — what to skim, what to read closely, what traps to avoid.
- ONE worked example for the most representative pattern; the example should look like a real question from this test.

Output the same object as a subject lesson:
- title: include the test name (e.g. "Tackling SAT Reading & Writing inference questions").
- introduction: one paragraph on why this section trips students up.
- sections: 2-5 sections (e.g. "What you'll see", "Strategy", "Common traps").
- keyTakeaways: 3-6 short do/don't rules.
- comprehension: exactly 3 multiple-choice questions, matching the test's actual format (choice count, passage style) — 1 easy, 1 medium, 1 hard.

Rules:
- The comprehension questions MUST look like real questions from this test, not generic subject drills.
- Plain text only — no markdown, no LaTeX.
- Aim for ~400-700 words across all sections combined.
`.trim()

const SUBJECT_PROMPT_KO = (topic: string, grade: string | null) => `
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

const TEST_PROMPT_KO = (topic: string, formatBlock: string) => `
다음 시험 영역을 다루는 학생을 위한 짧은 구조화 강의를 작성하세요: ${topic}.

${formatBlock}

이것은 시험 대비 강의입니다(개념 강의가 아님). 다음에 집중하세요:
- 학생이 실제로 보게 될 형식(지문 길이, 문항 수, 보기 수, 시간 압박).
- 가장 자주 등장하는 2-4가지 문제 패턴.
- 각 패턴에 대처하는 전략 — 무엇을 빨리 훑고, 무엇을 꼼꼼히 읽고, 어떤 함정을 피해야 하는지.
- 가장 대표적인 패턴에 대한 worked example 1개. 예시는 이 시험의 실제 문제처럼 보여야 합니다.

같은 객체 구조를 출력하세요:
- title: 시험 이름 포함(예: "SAT 읽기·쓰기 추론 문제 정복법").
- introduction: 이 영역에서 학생들이 자주 막히는 이유 한 문단.
- sections: 2-5개 섹션(예: "무엇을 보게 되는가", "전략", "흔한 함정").
- keyTakeaways: 3-6개의 짧은 do/don't 규칙.
- comprehension: 시험의 실제 형식(보기 수, 지문 스타일)에 맞춘 객관식 문제 정확히 3개 — 쉬움 1, 보통 1, 어려움 1.

규칙:
- comprehension 문제는 일반 과목 드릴이 아니라 이 시험의 실제 문제처럼 보여야 합니다.
- 일반 텍스트만 — 마크다운, LaTeX 금지.
- 전체 분량 400-700자.
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

  // Topic context. Test-prep lessons teach strategy + format; subject
  // lessons teach the concept. The category check below picks which.
  const lang = session.language as 'en' | 'ko'
  let topicName: string | null = session.topic_freeform ?? null
  let gradeRange: string | null = null
  let testPrepBlock = ''
  if (session.topic_id) {
    const ctx = await loadStudyPromptContext(session.topic_id, lang)
    if (ctx) {
      topicName = ctx.topicName
      gradeRange = ctx.gradeRange
      testPrepBlock = renderTestPrepBlock(ctx, lang)
      if (ctx.category === 'test_prep' && ctx.testSection) {
        // Make the prompt's topic phrase carry both test + section so
        // the title generation hits both ("SAT — Math").
        topicName = `${prettyTest(ctx.testFamily)} — ${ctx.testSection}`
      }
    }
  }
  if (!topicName) return NextResponse.json({ error: 'session has no topic' }, { status: 400 })

  const prompt = testPrepBlock
    ? (lang === 'ko'
        ? TEST_PROMPT_KO(topicName, testPrepBlock)
        : TEST_PROMPT_EN(topicName, testPrepBlock))
    : (lang === 'ko'
        ? SUBJECT_PROMPT_KO(topicName, gradeRange)
        : SUBJECT_PROMPT_EN(topicName, gradeRange))

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: LessonSchema,
      prompt,
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

function prettyTest(family: import('@/lib/study-prompt-context').TestFamily | null): string {
  switch (family) {
    case 'ksat':  return 'KSAT (수능)'
    case 'sat':   return 'SAT'
    case 'toefl': return 'TOEFL'
    case 'toeic': return 'TOEIC'
    case 'ielts': return 'IELTS'
    case 'act':   return 'ACT'
    case 'ap':    return 'AP'
    case 'gre':   return 'GRE'
    default:      return 'Test Prep'
  }
}
