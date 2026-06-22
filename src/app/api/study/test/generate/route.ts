import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import {
  loadStudyPromptContext,
  renderTestPrepBlock,
  type TestFamily,
} from '@/lib/study-prompt-context'

/**
 * POST /api/study/test/generate — build a full mock test for a
 * full_test-mode session.
 *
 * Differs from practice/generate in three ways:
 *   1. Larger question set (15-40 depending on test family).
 *   2. Cached on study_messages so the student can leave + resume
 *      mid-test (same pattern as lesson/flashcards).
 *   3. Includes per-test timer hint + section label so the UI can
 *      run a real countdown.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 90

const QuestionSchema = z.object({
  prompt: z.string(),
  type: z.literal('multiple_choice'),
  choices: z.array(z.string()).min(4).max(5),
  correct_answer: z.string().describe('Must match one of the choices exactly.'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  explanation: z.string(),
})

const TestSchema = z.object({
  title: z.string(),
  /** Minutes — drives the on-screen countdown. */
  timeLimitMinutes: z.number().int().min(10).max(180),
  /** Optional section label (for KSAT: 국어/수학/영어; SAT: Math; etc.). */
  section: z.string().nullable(),
  questions: z.array(QuestionSchema).min(10).max(40),
})

export type TestPayload = z.infer<typeof TestSchema>

const CACHED_TEST_MARKER = '[full-test-v1]'

/**
 * Defaults per test family. Used both to set timer + question count
 * targets in the prompt and as a hint to the AI so the generated
 * `timeLimitMinutes` doesn't drift from the real test's pacing.
 */
function defaultsForFamily(family: TestFamily | null): { count: number; minutes: number } {
  switch (family) {
    case 'sat':   return { count: 27, minutes: 35 }   // 1 SAT R&W module
    case 'ksat':  return { count: 30, minutes: 50 }   // ~1/3 of 영어 영역
    case 'toefl': return { count: 20, minutes: 36 }   // ~2 reading passages
    case 'toeic': return { count: 30, minutes: 35 }
    case 'ielts': return { count: 20, minutes: 30 }
    case 'act':   return { count: 25, minutes: 30 }
    case 'ap':    return { count: 20, minutes: 30 }
    case 'gre':   return { count: 20, minutes: 30 }
    default:      return { count: 20, minutes: 30 }   // generic subject
  }
}

const SUBJECT_PROMPT_EN = (topic: string, grade: string | null, count: number, minutes: number) => `
Build a ${minutes}-minute mock test with exactly ${count} multiple-choice questions for a student studying "${topic}"${grade ? ` at grade level ${grade}` : ''}.

Rules:
- All questions are multiple_choice with 4 plausible choices.
- Mix difficulty: about 30% easy, 50% medium, 20% hard.
- Wrong answers should be common student mistakes for this topic, not nonsense.
- Each question is independent — no question references another.
- Explanations are 1-2 sentences. Plain text only, no markdown, no LaTeX.
- Set timeLimitMinutes to ${minutes}.
- Section can be null for a generic subject test.
- Title should read like a real mock test ("Grade 9 Algebra mock test").
`.trim()

const SUBJECT_PROMPT_KO = (topic: string, grade: string | null, count: number, minutes: number) => `
"${topic}" 주제를 공부하는 학생을 위한 ${minutes}분짜리 모의고사를 정확히 ${count}개의 객관식 문제로 만드세요${grade ? ` (학년: ${grade})` : ''}.

규칙:
- 모든 문제는 보기 4개의 객관식.
- 난이도 비율: 쉬움 30%, 보통 50%, 어려움 20%.
- 오답은 해당 주제에서 학생이 자주 하는 실수를 반영해야 합니다.
- 각 문제는 독립적 — 다른 문제를 참조하지 마세요.
- 해설은 1-2문장. 일반 텍스트, LaTeX·마크다운 금지.
- timeLimitMinutes는 ${minutes}로 설정.
- section은 일반 과목 시험에서는 null.
- 제목은 실제 모의고사처럼 작성 ("9학년 대수 모의고사").
- 모든 텍스트는 한국어.
`.trim()

const TEST_PROMPT_EN = (topic: string, count: number, minutes: number, formatBlock: string) => `
Build a ${minutes}-minute timed mock test with exactly ${count} questions for: ${topic}.

${formatBlock}

Rules:
- Match the test's REAL format exactly. Choice count per the format block above (5 for KSAT, 4 for SAT/TOEFL/IELTS/ACT-English/Reading/Science, 5 for ACT-Math). Stick to multiple_choice.
- The mix of question patterns should reflect what the section actually tests (e.g. SAT R&W: ~30% inference, ~25% main idea, ~20% rhetorical synthesis, ~25% grammar/vocab in context).
- Mix difficulties matching the real test's distribution. Hard SAT questions should genuinely require multi-step reasoning, not just longer arithmetic.
- Wrong answers must reflect the EXACT trap patterns this test uses (e.g. SAT Math: forgetting a negative sign; TOEFL Reading: factually correct statement that doesn't match the passage).
- Each question is independent (no passage shared between questions unless the test's actual format does — TOEFL Reading 700-word passages with 10 questions each, IELTS 3 passages with 13-14 questions each).
- Title should be specific ("SAT Math Module 1 — Practice Test 1").
- timeLimitMinutes = ${minutes}; section = the section label.
- Explanations: 1-2 sentences, plain text. Mention the trap when relevant.
`.trim()

const TEST_PROMPT_KO = (topic: string, count: number, minutes: number, formatBlock: string) => `
${topic} ${minutes}분 모의고사를 정확히 ${count}문제로 만드세요.

${formatBlock}

규칙:
- 시험의 실제 형식을 정확히 따르세요. 보기 개수는 위 블록대로(수능 5지, SAT/TOEFL/IELTS/ACT 영어·읽기·과학 4지, ACT 수학 5지). 모든 문제는 multiple_choice.
- 문제 패턴 비율은 영역의 실제 출제 비율을 반영하세요(예: SAT R&W는 추론 ~30%, 주제 ~25%, 수사적 종합 ~20%, 문맥 문법·어휘 ~25%).
- 난이도 분포는 실제 시험과 일치. 어려운 SAT 문제는 단순 긴 계산이 아니라 다단계 추론을 요구해야 합니다.
- 오답은 이 시험의 실제 함정 패턴을 정확히 반영해야 합니다(예: SAT 수학 — 음수 부호 빼먹기; TOEFL 독해 — 사실은 맞지만 지문과 다른 내용).
- 각 문제는 독립적(시험이 실제로 공유 지문을 쓰는 경우 예외 — TOEFL Reading 700단어 지문에 10문항, IELTS 3개 지문에 각 13-14문항).
- 제목은 구체적("SAT 수학 모듈 1 — 모의고사 1").
- timeLimitMinutes = ${minutes}; section = 영역 이름.
- 해설: 1-2문장, 일반 텍스트. 함정이 있으면 언급.
- 모든 텍스트는 한국어.
`.trim()

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Test generation costs more than practice — cap tighter.
  const blocked = enforceRateLimit(
    `test-generate:user:${user.id}`,
    { windowMs: 30 * 60 * 1000, max: 5 }
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
  if (session.mode !== 'full_test') {
    return NextResponse.json({ error: 'session is not in full_test mode' }, { status: 400 })
  }

  // Idempotency / resume — return cached payload if present so a
  // refresh mid-test doesn't blow the student's progress (timer is
  // handled by the client and stored in localStorage).
  const { data: existingRows } = await supabaseAdmin
    .from('study_messages')
    .select('content')
    .eq('session_id', sessionId)
    .eq('role', 'assistant')
    .ilike('content', `${CACHED_TEST_MARKER}%`)
    .limit(1)
  if (existingRows && existingRows.length > 0) {
    const raw = existingRows[0].content.slice(CACHED_TEST_MARKER.length)
    try {
      const cached = JSON.parse(raw) as TestPayload
      return NextResponse.json({ test: cached, cached: true })
    } catch { /* fall through */ }
  }

  // Build the prompt context.
  const lang = session.language as 'en' | 'ko'
  let topicName: string | null = session.topic_freeform ?? null
  let gradeRange: string | null = null
  let testPrepBlock = ''
  let family: TestFamily | null = null
  if (session.topic_id) {
    const ctx = await loadStudyPromptContext(session.topic_id, lang)
    if (ctx) {
      topicName = ctx.topicName
      gradeRange = ctx.gradeRange
      testPrepBlock = renderTestPrepBlock(ctx, lang)
      family = ctx.testFamily
      if (ctx.category === 'test_prep' && ctx.testSection) {
        topicName = `${prettyTest(family)} — ${ctx.testSection}`
      }
    }
  }
  if (!topicName) return NextResponse.json({ error: 'session has no topic' }, { status: 400 })

  const { count, minutes } = defaultsForFamily(family)
  const prompt = testPrepBlock
    ? (lang === 'ko'
        ? TEST_PROMPT_KO(topicName, count, minutes, testPrepBlock)
        : TEST_PROMPT_EN(topicName, count, minutes, testPrepBlock))
    : (lang === 'ko'
        ? SUBJECT_PROMPT_KO(topicName, gradeRange, count, minutes)
        : SUBJECT_PROMPT_EN(topicName, gradeRange, count, minutes))

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: TestSchema,
      prompt,
      temperature: 0.5,
    })
    const test = result.object

    await supabaseAdmin
      .from('study_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: CACHED_TEST_MARKER + JSON.stringify(test),
        tokens_in: result.usage?.inputTokens ?? 0,
        tokens_out: result.usage?.outputTokens ?? 0,
        model: 'gpt-4o-mini',
      })

    return NextResponse.json({ test, cached: false })
  } catch (err) {
    console.error('[test/generate]', err)
    return NextResponse.json({ error: 'generation failed' }, { status: 502 })
  }
}

function prettyTest(family: TestFamily | null): string {
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
