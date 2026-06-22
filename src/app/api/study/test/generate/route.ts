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
import { renderTestSpecCached, defaultsForTestSectionCached } from '@/lib/test-spec-cache'
import {
  verifyAndCorrect,
  sanitizeQuestion,
  shuffleChoices,
  dedupeByPrompt,
  type Question,
} from '@/lib/test-verify'

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
  questions: z.array(QuestionSchema).min(10).max(70),
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

/**
 * Few-shot anchor for SAT-Math-style HARD items. Models trained on
 * "Khan Academy easy" tend to underweight what a real SAT hard item
 * looks like — contextualized word problem + multi-step + non-obvious
 * setup. Showing one example shifts the difficulty distribution.
 */
const SAT_MATH_HARD_ANCHOR = `
Example of a real SAT Math HARD item (do NOT copy verbatim — match the style):
  Prompt: "A farmer plants apple and pear trees. Each apple tree yields 80 kg of fruit per year and each pear tree yields 60 kg. The farmer needs at least 5,000 kg of total fruit per year and has space for at most 80 trees combined. If pears sell for $3/kg and apples for $2/kg, what is the minimum number of apple trees the farmer can plant while still meeting both constraints AND maximizing revenue?"
  Choices: ["10", "20", "30", "40"]
  Correct: "10"
  Why hard: requires (a) translating two constraints into inequalities, (b) realizing revenue is maximized by ALL pears (60×80×3 = 14,400 > 80×80×2 = 12,800), (c) checking the constraint feasibility, (d) finding the minimum apple count consistent with both.

This is the level of contextualization + reasoning a real SAT hard item demands. NOT "solve 2x+3=11".
`.trim()

const SAT_RW_HARD_ANCHOR = `
Example of a real SAT R&W HARD item (do NOT copy verbatim — match the style):
  Prompt: "The following text is adapted from Octavia Butler's 1979 novel Kindred. The narrator, a Black woman from 1976, has been pulled back in time. 'I had no idea where I was, no idea at all of what year it might be. There was nothing to indicate—' Which choice most logically completes the text?"
  Choices: ["a sudden shift in the texture of the dirt road under her feet", "any landmark that would tell her she had returned to her own century", "the presence of unfamiliar people just over the rise", "a clear plan for how she might find help"]
  Correct: "any landmark that would tell her she had returned to her own century"
  Why hard: the trap "presence of unfamiliar people" matches the surface theme of being lost, but only "landmark... own century" completes the LOGIC of "nothing to indicate WHAT YEAR".

This is the level of close-reading demand. NOT "the passage says X, what does X mean?".
`.trim()

const TEST_PROMPT_EN = (topic: string, count: number, minutes: number, formatBlock: string, family: TestFamily | null, section: string | null) => {
  const anchor = (() => {
    if (family !== 'sat') return ''
    if (section?.toLowerCase().includes('math')) return `\n\n${SAT_MATH_HARD_ANCHOR}\n`
    if (section?.toLowerCase().includes('reading') || section?.toLowerCase().includes('writing')) return `\n\n${SAT_RW_HARD_ANCHOR}\n`
    return ''
  })()
  return `
Build a ${minutes}-minute timed mock test with exactly ${count} questions for: ${topic}.

${formatBlock}${anchor}

Rules:
- Match the test's REAL format exactly. Choice count per the format block above (5 for KSAT, 4 for SAT/TOEFL/IELTS/ACT-English/Reading/Science, 5 for ACT-Math). Stick to multiple_choice.
- The mix of question patterns should reflect what the section actually tests (e.g. SAT R&W: ~30% inference, ~25% main idea, ~20% rhetorical synthesis, ~25% grammar/vocab in context).
- Difficulty distribution MUST include roughly 20% HARD items. A "hard" item is NOT just a longer easy item — it requires multi-step reasoning, subtle distinctions, or non-obvious setup. If you cannot tell the difference between an easy and a hard item for this section, look at the anchor example above.
- Wrong answers must reflect the EXACT trap patterns this test uses (e.g. SAT Math: forgetting a negative sign; TOEFL Reading: factually correct statement that doesn't match the passage).
- Distribute the correct answer roughly evenly across positions A, B, C, D — do NOT cluster correct answers in position A. (This will be shuffled server-side too, but try.)
- For math items: SHOW THE WORK in the explanation so the answer can be verified. Compute the answer twice independently in your head before committing.
- Plain text only. Do NOT use LaTeX (\\( \\)), markdown, or HTML. Use Unicode for math: x², √(2), π, ½, ±, ×, ÷, °.
- Each question is independent (no passage shared between questions unless the test's actual format does — TOEFL Reading 700-word passages with 10 questions each, IELTS 3 passages with 13-14 questions each).
- Title should be specific ("Digital SAT Math — Full Section Practice 1").
- timeLimitMinutes = ${minutes}; section = the section label.
- Explanations: 1-2 sentences. Mention the trap when relevant.
`.trim()
}

const TEST_PROMPT_KO = (topic: string, count: number, minutes: number, formatBlock: string) => `
${topic} ${minutes}분 모의고사를 정확히 ${count}문제로 만드세요.

${formatBlock}

규칙:
- 시험의 실제 형식을 정확히 따르세요. 보기 개수는 위 블록대로(수능 5지, SAT/TOEFL/IELTS/ACT 영어·읽기·과학 4지, ACT 수학 5지). 모든 문제는 multiple_choice.
- 문제 패턴 비율은 영역의 실제 출제 비율을 반영하세요(예: SAT R&W는 추론 ~30%, 주제 ~25%, 수사적 종합 ~20%, 문맥 문법·어휘 ~25%).
- 난이도 분포에 어려운 문항 약 20%를 반드시 포함. 어려운 문항은 단순히 긴 계산이 아니라 다단계 추론, 미묘한 구분, 비자명한 설정을 요구해야 합니다.
- 오답은 이 시험의 실제 함정 패턴을 정확히 반영해야 합니다(예: SAT 수학 — 음수 부호 빼먹기; TOEFL 독해 — 사실은 맞지만 지문과 다른 내용).
- 정답을 A/B/C/D 위치에 골고루 배치하세요 — A에 몰지 마세요. (서버에서 셔플도 합니다.)
- 수학 문항은 해설에 풀이를 보여서 답을 검증할 수 있게 하세요. 답을 적기 전에 머릿속에서 두 번 독립적으로 계산.
- 일반 텍스트만. LaTeX(\\( \\)), 마크다운, HTML 금지. 수학은 유니코드 사용: x², √(2), π, ½, ±, ×, ÷, °.
- 각 문제는 독립적(시험이 실제로 공유 지문을 쓰는 경우 예외 — TOEFL Reading 700단어 지문에 10문항, IELTS 3개 지문에 각 13-14문항).
- 제목은 구체적("디지털 SAT 수학 — 전체 영역 모의고사 1").
- timeLimitMinutes = ${minutes}; section = 영역 이름.
- 해설: 1-2문장. 함정이 있으면 언급.
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

  // Build the prompt context. For test-prep we prefer the detailed
  // hand-curated spec from lib/test-specs.ts over the generic per-
  // test guidance block — the spec library nails section-specific
  // counts/timing/distractor patterns the model otherwise gets wrong.
  const lang = session.language as 'en' | 'ko'
  let topicName: string | null = session.topic_freeform ?? null
  let gradeRange: string | null = null
  let testPrepBlock = ''
  let family: TestFamily | null = null
  let sectionLabel: string | null = null
  if (session.topic_id) {
    const ctx = await loadStudyPromptContext(session.topic_id, lang)
    if (ctx) {
      topicName = ctx.topicName
      gradeRange = ctx.gradeRange
      family = ctx.testFamily
      sectionLabel = ctx.testSection
      // Prefer the detailed spec; fall back to the generic block when
      // we don't have one for this family (e.g. a test we haven't
      // curated yet).
      testPrepBlock = (await renderTestSpecCached(family, sectionLabel, lang))
        || renderTestPrepBlock(ctx, lang)
      if (ctx.category === 'test_prep' && ctx.testSection) {
        topicName = `${prettyTest(family)} — ${ctx.testSection}`
      }
    }
  }
  if (!topicName) return NextResponse.json({ error: 'session has no topic' }, { status: 400 })

  // Test-prep generation prefers the spec library's per-section
  // count/timing (matches the real exam) over the per-family default.
  const { count, minutes } = family
    ? await defaultsForTestSectionCached(family, sectionLabel)
    : defaultsForFamily(null)
  // Generate with a buffer so the verify pass can drop bad questions
  // and we still hit the target count. 25% extra is enough headroom
  // for typical drop rates (~5-15%).
  const buffer = Math.max(3, Math.ceil(count * 0.25))
  const generationCount = Math.min(70, count + buffer)
  const prompt = testPrepBlock
    ? (lang === 'ko'
        ? TEST_PROMPT_KO(topicName, generationCount, minutes, testPrepBlock)
        : TEST_PROMPT_EN(topicName, generationCount, minutes, testPrepBlock, family, sectionLabel))
    : (lang === 'ko'
        ? SUBJECT_PROMPT_KO(topicName, gradeRange, generationCount, minutes)
        : SUBJECT_PROMPT_EN(topicName, gradeRange, generationCount, minutes))

  // Model selection: test prep gets the full gpt-4o (better recall
  // of recent test format changes, follows the spec block more
  // reliably). Generic subject tests stay on gpt-4o-mini to keep
  // cost down.
  const apiKey = process.env.OPENAI_API_KEY ?? ''
  const openai = createOpenAI({ apiKey })
  const model = family ? openai('gpt-4o') : openai('gpt-4o-mini')
  try {
    const result = await generateObject({
      model,
      schema: TestSchema,
      prompt,
      temperature: 0.2,
    })
    let questions = result.object.questions as Question[]

    // Pipeline: sanitize LaTeX/markdown → dedupe → verify (drop wrong)
    //         → shuffle choices → slice to exact target count
    questions = questions.map(sanitizeQuestion)
    questions = dedupeByPrompt(questions)
    const mathHeavy = isMathHeavy(family, sectionLabel)
    const verifyResult = await verifyAndCorrect(questions, apiKey, { mathHeavy })
    questions = verifyResult.kept
    questions = questions.map((q, i) => shuffleChoices(q, hashSession(sessionId) + i))
    if (questions.length > count) questions = questions.slice(0, count)
    console.log('[test/generate] pipeline', {
      sessionId,
      target: count,
      generated: result.object.questions.length,
      afterDedupe: result.object.questions.length - (result.object.questions.length - questions.length - verifyResult.dropped),
      dropped: verifyResult.dropped,
      corrected: verifyResult.corrected,
      final: questions.length,
    })

    const test: TestPayload = {
      title: result.object.title,
      timeLimitMinutes: result.object.timeLimitMinutes,
      section: result.object.section,
      questions,
    }

    await supabaseAdmin
      .from('study_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: CACHED_TEST_MARKER + JSON.stringify(test),
        tokens_in: result.usage?.inputTokens ?? 0,
        tokens_out: result.usage?.outputTokens ?? 0,
        model: family ? 'gpt-4o' : 'gpt-4o-mini',
      })

    return NextResponse.json({ test, cached: false })
  } catch (err) {
    console.error('[test/generate]', err)
    return NextResponse.json({ error: 'generation failed' }, { status: 502 })
  }
}

/** Stable per-session hash for deterministic shuffles — same session
 *  always yields the same shuffle so refreshes don't reorder choices. */
function hashSession(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h) + id.charCodeAt(i)
    h |= 0
  }
  return h >>> 0
}

/** SAT Math, ACT Math, GRE Quant, KSAT Math, AP math/science — anything
 *  where arithmetic correctness matters enough to pay for gpt-4o on
 *  the verify pass. */
function isMathHeavy(family: TestFamily | null, section: string | null): boolean {
  if (!family) return false
  if (family === 'gre') return section?.toLowerCase().includes('quant') ?? false
  if (family === 'ap') return true // many APs have math; safer to default on
  if (!section) return false
  const s = section.toLowerCase()
  return s.includes('math') || s.includes('수학') || s.includes('quant')
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
