import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { loadStudyPromptContext, renderTestPrepBlock } from '@/lib/study-prompt-context'

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

/**
 * Subject-mode prompt — concept-focused practice with mixed formats.
 * Test_prep topics get a different (longer) prompt below since their
 * format constraints differ a lot from generic subject drilling.
 */
const SUBJECT_PROMPT_EN = (topic: string, grade: string | null, count: number) => `
Generate ${count} practice questions for a student studying "${topic}"${grade ? ` at grade level ${grade}` : ''}.

Rules:
- Mix difficulties (some easy, some medium, some hard).
- Mix formats: about 60% multiple_choice, 20% true_false, 20% short_answer. Skip short_answer for math topics where the answer is a single number — use multiple_choice instead so grading is deterministic.
- For multiple_choice: provide 4 plausible choices. Wrong answers should be common mistakes a student of this level would make, not nonsense.
- For short_answer: keep the canonical answer to one or two words / a single expression. Avoid open-ended questions where multiple wordings could be correct.
- Explanations should be 1-2 sentences. Plain text, no LaTeX, no markdown.
- Stay strictly on the topic. No off-topic, age-inappropriate, or trick questions.
`.trim()

const SUBJECT_PROMPT_KO = (topic: string, grade: string | null, count: number) => `
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

/**
 * Test-prep prompt — same shape as subject prompt but with the
 * test-specific format guidance block injected (passage length,
 * choice count, section conventions, etc.) so the AI generates
 * realistic test-shaped items instead of generic subject drills.
 */
const TEST_PROMPT_EN = (topic: string, count: number, formatBlock: string) => `
Generate ${count} practice questions for a student preparing for: ${topic}.

${formatBlock}

Rules:
- Match the test's actual question format above. Do not invent novel formats.
- Mix difficulties (some easy, some medium, some hard) but stay within the test's real difficulty distribution.
- Use exactly the choice count the test uses (5 for KSAT, 4 for SAT/TOEFL/IELTS/ACT-English/Reading/Science, 5 for ACT-Math). All "type" fields should be multiple_choice unless the test explicitly uses true_false or short_answer.
- For multiple_choice: wrong answers should reflect common mistakes a student of this level would make, not nonsense.
- Explanations: 1-2 sentences. Plain text, no LaTeX, no markdown. Mention the test-specific trap when relevant ("a common SAT trap is...", "many students miss this because...").
- Stay strictly on the test's curriculum. No off-topic, age-inappropriate, or trick questions.
`.trim()

const TEST_PROMPT_KO = (topic: string, count: number, formatBlock: string) => `
다음 시험을 준비하는 학생을 위한 연습 문제 ${count}개를 생성하세요: ${topic}.

${formatBlock}

규칙:
- 위에서 설명한 실제 시험 형식을 그대로 따르세요. 새로운 형식을 만들지 마세요.
- 난이도를 섞으세요(easy / medium / hard). 단, 해당 시험의 실제 난이도 분포 내에서.
- 시험의 실제 보기 개수를 사용하세요(수능은 5지, SAT/TOEFL/IELTS/ACT-영어·읽기·과학은 4지, ACT-수학은 5지). 시험이 명시적으로 참거짓이나 단답을 쓰지 않으면 모든 "type" 필드는 multiple_choice로 작성하세요.
- 객관식: 오답은 해당 수준 학생이 흔히 하는 실수여야 합니다.
- 해설: 1-2문장, 일반 텍스트, LaTeX/마크다운 금지. 시험 특유의 함정을 언급하면 좋습니다("수능의 흔한 함정은...", "이 문제에서 학생들이 자주 틀리는 이유는...").
- 시험 범위에서 벗어나거나, 연령에 부적절하거나, 트릭 문제는 금지.
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

  // Topic context. Test-prep topics get a richer prompt with the
  // test's actual question-format guidance; subject topics keep the
  // existing concept-focused prompt. Free-form sessions (no topic_id)
  // fall through to the subject prompt with just the typed query.
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
      // For test prep, "topic" in the prompt should read like the
      // human-friendly path ("SAT — Math") so the model has both
      // the test and the section nailed down.
      if (ctx.category === 'test_prep' && ctx.testSection) {
        topicName = lang === 'ko'
          ? `${capitalizeTestName(ctx.testFamily)} — ${ctx.testSection}`
          : `${capitalizeTestName(ctx.testFamily)} — ${ctx.testSection}`
      }
    }
  }
  if (!topicName) {
    return NextResponse.json({ error: 'session has no topic' }, { status: 400 })
  }

  const prompt = testPrepBlock
    ? (lang === 'ko'
        ? TEST_PROMPT_KO(topicName, count, testPrepBlock)
        : TEST_PROMPT_EN(topicName, count, testPrepBlock))
    : (lang === 'ko'
        ? SUBJECT_PROMPT_KO(topicName, gradeRange, count)
        : SUBJECT_PROMPT_EN(topicName, gradeRange, count))

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: ResponseSchema,
      prompt,
      temperature: 0.7,
    })
    return NextResponse.json({ questions: result.object.questions })
  } catch (err) {
    console.error('[practice/generate]', err)
    return NextResponse.json({ error: 'generation failed' }, { status: 502 })
  }
}

/** Pretty test name for the prompt's topic line. */
function capitalizeTestName(family: import('@/lib/study-prompt-context').TestFamily | null): string {
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
