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
import { renderTestSpecCached, defaultsForTestSectionCached, loadSectionSpec } from '@/lib/test-spec-cache'
import {
  verifyAndCorrect,
  sanitizeQuestion,
  shuffleChoices,
  dedupeByPrompt,
  type Question,
  type RawQuestion,
} from '@/lib/test-verify'
import { sendPushNotification } from '@/lib/notifications'

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
// Vercel Pro plan max is 300s. Full-section tests (SAT R&W = 54 items,
// TOEIC Reading = 100 items) genuinely need 60-120s even with the
// parallelized pipeline below; legacy 90s caused mid-stream timeouts.
export const maxDuration = 300

/** Permissive schema: AI SDK does NOT use OpenAI's strict structured-
 *  output mode for generateObject (no JSON Schema enforcement at the
 *  API layer), so the model can omit fields it considers irrelevant
 *  for an item. Zod sees undefined for those fields and rejects them
 *  if marked required — even when nullable. Use .nullable().optional()
 *  so both `null` and missing-field both pass. The route post-processes
 *  these to concrete `null` in sanitizeQuestion for downstream code. */
const QuestionSchema = z.object({
  /** Per-question passage (SAT R&W 25-150 words; shared via
   *  passageGroupId for TOEFL/IELTS/ACT Reading). */
  passage: z.string().nullable().optional(),
  /** Shared-passage grouping id. Set on TOEFL/IELTS/ACT Reading
   *  questions sharing one passage. */
  passageGroupId: z.string().nullable().optional(),
  prompt: z.string(),
  /** Question type / variant. Defaults to 'multiple_choice' when the
   *  model omits it (which it often does for the standard case).
   *  'fill_in_blanks' — TOEFL Reading Complete-the-Words (Jan 2026):
   *  passage contains [1] [2] [3] placeholders, `blanks` holds the
   *  correct fragment per placeholder.
   *  'arrange_words' — TOEFL Writing Build-a-Sentence: `choices`
   *  holds word/phrase chips, `correct_answer` is the chips joined
   *  in correct order by " | ".
   *  'speaking_repeat' — TOEFL Speaking Listen-and-Repeat: prompt
   *  is the audio script; `correct_answer` is the exact sentence.
   *  'speaking_interview' — TOEFL Speaking Take-an-Interview: prompt
   *  is the interviewer question; open response, rubric-graded. */
  type: z.enum([
    'multiple_choice', 'numeric_entry', 'multi_select', 'three_choice', 'quant_comparison',
    'fill_in_blanks', 'arrange_words', 'speaking_repeat', 'speaking_interview',
  ]).nullable().optional(),
  /** Fill-in-blanks payload — one entry per [N] placeholder in passage. */
  blanks: z.array(z.object({
    id: z.number().int(),
    answer: z.string(),
    alternates: z.array(z.string()).nullish(),
  })).nullish(),
  /** Choice options. Length depends on type/section. */
  choices: z.array(z.string()).max(6).nullable().optional(),
  /** Correct answer for single-answer types. The model correctly
   *  emits `null` on numeric_entry items (which use
   *  acceptable_answers instead). Must accept both string and null
   *  or Zod rejects the whole batch and the test fails to build. */
  correct_answer: z.string().nullable().optional(),
  /** For multi_select (GRE SE = exactly 2 of 6). */
  correct_answers: z.array(z.string()).nullable().optional(),
  /** For numeric_entry: list of accepted answer strings. */
  acceptable_answers: z.array(z.string()).nullable().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  explanation: z.string(),
  /** Per-distractor rationales: why each WRONG choice is wrong.
   *  Maximally permissive — the model occasionally emits malformed
   *  entries (null reason, extra fields, wrong types) and we'd
   *  rather salvage what we can than reject the whole batch.
   *  sanitizeQuestion filters out incomplete pairs downstream. */
  distractor_rationales: z
    .array(
      z
        .object({
          choice: z.string().nullish(),
          reason: z.string().nullish(),
        })
        .passthrough(),
    )
    .nullish(),
  /** Optional visual asset attached to the question. Used heavily on
   *  SAT Math (geometry figures, scatter plots, bar charts, two-way
   *  tables, coordinate planes). Structured per-type so the UI can
   *  render natively; rawSvg is the escape hatch for irregular
   *  shapes. Maximally permissive schema — we'd rather salvage a
   *  partial graphic than reject the whole question. */
  graphic: z
    .object({
      type: z.string().nullish(),
      // Coordinate / point payloads (scatter, line, dot, function plot)
      xLabel: z.string().nullish(),
      yLabel: z.string().nullish(),
      points: z.array(z.unknown()).nullish(),
      series: z.array(z.unknown()).nullish(),
      bestFit: z.unknown().nullish(),
      // Bar / histogram payloads
      bars: z.array(z.unknown()).nullish(),
      values: z.array(z.unknown()).nullish(),
      // Table payloads
      rowLabels: z.array(z.string()).nullish(),
      colLabels: z.array(z.string()).nullish(),
      cells: z.array(z.array(z.unknown())).nullish(),
      // Geometry payloads
      shape: z.string().nullish(),
      spec: z.unknown().nullish(),
      labels: z.unknown().nullish(),
      // Escape hatch for irregular shapes the model can describe
      // better in raw SVG than as a structured payload.
      svg: z.string().nullish(),
      // Caption shown below the graphic in the UI.
      caption: z.string().nullish(),
    })
    .passthrough()
    .nullish(),
})

const TestSchema = z.object({
  title: z.string(),
  /** Minutes — drives the on-screen countdown. */
  timeLimitMinutes: z.number().int().min(10).max(180),
  /** Optional section label (for KSAT: 국어/수학/영어; SAT: Math; etc.). */
  section: z.string().nullable(),
  /** Test family (sat/ksat/toefl/etc.) — drives format-specific UI
   *  choices like the choice-button label style (KSAT ①②③④⑤
   *  vs others A B C D). Server-side only; the model doesn't emit it. */
  family: z.string().nullable().optional(),
  // Min was 5 — that rejected the whole chunk when the model
  // gave up partway through (heavy prompts: college-level + 100-180w
  // passages + 70% multi-paragraph + mandatory distractor rationales).
  // Now min(1): salvage whatever the model managed, and let the
  // assembly stage refill missing items via the chunked retry pool
  // or fall back to a smaller test rather than aborting completely.
  questions: z.array(QuestionSchema).min(1).max(200),
})

export type TestPayload = z.infer<typeof TestSchema>

const CACHED_TEST_MARKER = '[full-test-v1]'

/**
 * Defaults per test family. Used both to set timer + question count
 * targets in the prompt and as a hint to the AI so the generated
 * `timeLimitMinutes` doesn't drift from the real test's pacing.
 */
function defaultsForFamily(family: TestFamily | null): { count: number; minutes: number; choiceCount: 4 | 5 } {
  switch (family) {
    case 'sat':   return { count: 27, minutes: 35, choiceCount: 4 } // 1 SAT R&W module
    case 'ksat':  return { count: 30, minutes: 50, choiceCount: 5 } // KSAT all 5-choice
    case 'toefl': return { count: 20, minutes: 36, choiceCount: 4 }
    case 'toeic': return { count: 30, minutes: 35, choiceCount: 4 }
    case 'ielts': return { count: 20, minutes: 30, choiceCount: 4 }
    case 'act':   return { count: 25, minutes: 30, choiceCount: 4 } // Enhanced ACT all 4-choice
    case 'ap':    return { count: 20, minutes: 30, choiceCount: 4 }
    case 'gre':   return { count: 20, minutes: 30, choiceCount: 5 } // GRE Verbal MC = 5-choice
    default:      return { count: 20, minutes: 30, choiceCount: 4 } // generic subject
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
Example of a real SAT R&W HARD item (do NOT copy verbatim — match the style + structure):
  passage: "The following text is adapted from Octavia Butler's 1979 novel Kindred. The narrator, a Black woman from 1976, has been pulled back in time. 'I had no idea where I was, no idea at all of what year it might be. There was nothing to indicate—'"
  prompt: "Which choice most logically completes the text?"
  Choices: ["a sudden shift in the texture of the dirt road under her feet", "any landmark that would tell her she had returned to her own century", "the presence of unfamiliar people just over the rise", "a clear plan for how she might find help"]
  Correct: "any landmark that would tell her she had returned to her own century"
  Why hard: the trap "presence of unfamiliar people" matches the surface theme of being lost, but only "landmark... own century" completes the LOGIC of "nothing to indicate WHAT YEAR".

CRITICAL STRUCTURE: real Digital SAT R&W (verified against released College Board Practice Test #5, 2024) pairs a SHORT passage (TARGET 40-90 words, with words-in-context items as short as 30 and the longest literary excerpts up to ~130) with a SINGLE question. Put the passage in the dedicated "passage" field — NOT in the prompt. The prompt is JUST the question stem ("Which choice most logically completes the text?", "As used in the text, what does the word 'wanting' most nearly mean?", "Which choice best states the main purpose of the text?"). NEVER put the passage inside the prompt. NEVER write a question without a passage. Literary items may include a one-line context preamble ("The following text is from the 1913 story 'The King\'s Coin' by Emily Pauline Johnson…") that sets up the excerpt. Non-literary items (Information & Ideas, History, Science, Humanities) MAY ALSO use the "adapted from" preamble when sourcing a real work — observed on Practice Test 5 items 6 (Webster novel) and others.
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
    .select('id, student_id, mode, language, topic_id, topic_freeform, config, generation_status')
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
      return ndjsonResponse([
        { type: 'phase', name: 'done', label: 'study.test.progress.cached', percent: 100 },
        { type: 'result', test: cached, cached: true },
      ])
    } catch { /* fall through */ }
  }

  // ── Concurrent-call guard ────────────────────────────────────────
  // If a generation is already in flight for this session, do NOT
  // start a second one — it'd waste tokens and race on the cache
  // insert. Stream a polling response that watches for the cache row
  // to appear (background generation is still running on the original
  // request). Falls through to a fresh generation if the pending row
  // is stale (no progress after the polling window).
  if (session.generation_status === 'pending') {
    return new Response(buildPollingStream(sessionId), {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })
  }

  // Mark this session's generation as in-flight so the landing page
  // can show the "generating tests" chip and the user can navigate
  // away knowing it'll continue server-side.
  await supabaseAdmin
    .from('study_sessions')
    .update({ generation_status: 'pending' })
    .eq('id', sessionId)

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
  // Per-session config overrides take final precedence — when the
  // student tweaked the customization sheet, their choices win.
  const baseDefaults = family
    ? await defaultsForTestSectionCached(family, sectionLabel)
    : defaultsForFamily(null)
  const config = (session.config ?? {}) as {
    questionCount?: number
    timeLimit?: number
    difficultyBias?: 'balanced' | 'challenge' | 'warmup'
  }
  const count = clampInt(config.questionCount ?? baseDefaults.count, 5, 150)
  const minutes = clampInt(config.timeLimit ?? baseDefaults.minutes, 5, 300)
  // Look up the structured spec so we can read difficultyMix and the
  // hard-item framing. Falls back to defaults when missing.
  const sectionSpec = family ? await loadSectionSpec(family, sectionLabel) : null
  const baseMix = sectionSpec?.difficultyMix ?? { easy: 0.30, medium: 0.50, hard: 0.20 }
  // Apply difficulty bias: 'challenge' rebalances toward hard items,
  // 'warmup' toward easy. Total stays at 1.0 (sums normalized).
  const mix = applyDifficultyBias(baseMix, config.difficultyBias, family)
  const targetHard = Math.round(count * mix.hard)
  const targetEasyMed = count - targetHard

  const apiKey = process.env.OPENAI_API_KEY ?? ''
  const openai = createOpenAI({ apiKey })
  // Hard-pool generation needs gpt-4o for the discriminating-item
  // quality; easy/medium pool runs fine on gpt-4o-mini at ~3× the
  // speed and a fraction of the cost. Math sections stay on gpt-4o
  // throughout (arithmetic precision matters even for easy items).
  const hardModel = family ? openai('gpt-4o') : openai('gpt-4o-mini')
  const easyMedModel = (family && isMathHeavy(family, sectionLabel))
    ? openai('gpt-4o')
    : openai('gpt-4o-mini')
  // Legacy single-pass fallback uses the hard model.
  const model = hardModel

  // Stream generation phases as NDJSON so the client can render a
  // real progress bar instead of an indeterminate spinner.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder()
      const emit = (event: object) => {
        try { controller.enqueue(enc.encode(JSON.stringify(event) + '\n')) } catch { /* closed */ }
      }
      const phase = (name: string, label: string, percent: number) =>
        emit({ type: 'phase', name, label, percent })

  try {
    // Two-pass generation: the model collapses "hard" into "medium"
    // when asked for a mixed batch. Splitting gives the hard pass a
    // dedicated prompt with the section-specific hard framing inline.
    // For subject (non-family) tests, skip the split — those don't have
    // hard framing and a single pass is fine.
    // Buffer ~25% of target — verifier drops fewer items now that we
    // skip verification on easy MCs (generator is reliable there).
    // 25% × 54 ≈ 14 items spare. Was 40%; the extra 15% was paying
    // for latency we didn't need.
    const buffer = Math.max(6, Math.ceil(count * 0.25))
    phase('format', 'study.test.progress.format', 5)
    // Hard items have a HIGH verifier-drop rate (model tends to write
    // hard items with subtle math errors). Generate ~2× target so
    // enough survive — was 1.4× and produced 4/9 hards.
    const hardBuffer = targetHard > 0 ? Math.max(4, targetHard) : 0

    const allQuestions: RawQuestion[] = []
    let totalIn = 0
    let totalOut = 0

    if (sectionSpec && targetHard > 0) {
      // CHUNKED easy/medium pool + single hard call, all in parallel.
      // gpt-4o and gpt-4o-mini cap output at 16k tokens. SAT R&W
      // wanting 65 items × ~300 tokens (passage + Q + 4 choices +
      // explanation) ≈ 19.5k → mid-stream truncation → invalid JSON
      // → Zod parse throws → status=failed. Split into chunks small
      // enough that each call lands well under the cap.
      phase('drafting_questions', 'study.test.progress.draftingQuestions', 15)
      // Full-hard mode (SAT challenge): skip the easy/med pool
      // entirely — that chunk was leaking 7-10 easy/medium items
      // into the final test even when targetEasyMed=0, because the
      // buffer was being fed to buildEasyMediumPrompt and the model
      // emits a mix. Hard pool alone has enough buffer to cover.
      const fullHardMode = targetEasyMed === 0
      const easyMedCount = fullHardMode ? 0 : Math.min(200, targetEasyMed + buffer)
      // Per-chunk cap by section type:
      //   passage-heavy (SAT R&W, TOEFL/IELTS Reading): 18 — SAT R&W
      //     passages recalibrated to 40-90 words (was 100-180),
      //     dropping per-item budget to ~550-700 tok. 18 × 700 =
      //     12.6k leaves ~3k headroom under the 16k cap, faster
      //     than the previous chunk=12 and more reliable too.
      //   graphics-heavy (SAT Math): 3 — top-difficulty prompt
      //     causes long worked solutions + 3 distractor rationales
      //     + optional inline SVG. 3 × ~4500 = 13.5k leaves ~2.5k.
      //   short-item: 60 — bare arithmetic / grammar items
      const heavyPassage = hasPassages(family, sectionLabel)
      const heavyGraphics = family === 'sat' && sectionLabel != null && /math/i.test(sectionLabel)
      const perChunkCap = heavyPassage ? 18 : heavyGraphics ? 3 : 60
      const chunkCount = Math.ceil(easyMedCount / perChunkCap)
      const chunkSizes: number[] = []
      let remaining = easyMedCount
      for (let i = 0; i < chunkCount; i++) {
        const size = Math.ceil(remaining / (chunkCount - i))
        chunkSizes.push(size)
        remaining -= size
      }
      const easyMedPromises = chunkSizes.map(size =>
        generateObject({
          model: easyMedModel,
          schema: TestSchema,
          prompt: buildEasyMediumPrompt({
            topicName,
            count: size,
            minutes,
            formatBlock: testPrepBlock,
            extraGuidance: extraGuidanceFor(family, sectionLabel, size, lang),
            lang,
          }),
          temperature: 0.2,
        })
      )
      const hardFraming = (lang === 'ko' ? sectionSpec.hardItemFraming_ko : sectionSpec.hardItemFraming_en)
        ?? GENERIC_HARD_FRAMING[lang]
      const hardExamples = (lang === 'ko' ? sectionSpec.hardItemExamples_ko : sectionSpec.hardItemExamples_en) ?? []
      const hardCount = targetHard + hardBuffer
      // ── Chunk the hard pool too ─────────────────────────────────────
      // Previously a single call for ALL hard items. For SAT Math
      // with targetHard=44 + hardBuffer=44 = 88 items × ~3500 tok
      // per item = 308k tokens output — vastly over the 16k cap,
      // so the model truncated and we lost most items. Splitting
      // into the same per-chunk-cap as easy/med lets each call
      // stay under the cap and run in parallel.
      const hardChunkCount = Math.max(1, Math.ceil(hardCount / perChunkCap))
      const hardChunkSizes: number[] = []
      let hardRemaining = hardCount
      for (let i = 0; i < hardChunkCount; i++) {
        const size = Math.ceil(hardRemaining / (hardChunkCount - i))
        hardChunkSizes.push(size)
        hardRemaining -= size
      }
      const hardPromises = hardChunkSizes.map(size =>
        generateObject({
          model: hardModel,
          schema: TestSchema,
          prompt: buildHardOnlyPrompt({
            topicName,
            count: size,
            minutes,
            formatBlock: testPrepBlock,
            extraGuidance: extraGuidanceFor(family, sectionLabel, size, lang),
            hardFraming,
            hardExamples,
            lang,
          }),
          temperature: 0.3,
        }),
      )
      // Fire all chunks (easy/med + hard) concurrently. Wall-clock =
      // max of any single call ≈ 20-30s, not sum.
      const allResults = await Promise.all([...easyMedPromises, ...hardPromises])
      phase('drafting_hard', 'study.test.progress.draftingHard', 40)
      for (const r of allResults) {
        allQuestions.push(...(r.object.questions as RawQuestion[]))
        totalIn += r.usage?.inputTokens ?? 0
        totalOut += r.usage?.outputTokens ?? 0
      }
      console.log('[test/generate] chunked pools', {
        easyMedCount, easyMedChunks: chunkSizes,
        hardCount, hardChunks: hardChunkSizes,
        perChunkCap, fullHardMode,
      })
    } else {
      phase('drafting_questions', 'study.test.progress.draftingQuestions', 15)
      // Single-pass fallback for subjects or test sections w/o spec.
      const singlePrompt = testPrepBlock
        ? (lang === 'ko'
            ? TEST_PROMPT_KO(topicName, count + buffer, minutes, testPrepBlock)
            : TEST_PROMPT_EN(topicName, count + buffer, minutes, testPrepBlock, family, sectionLabel))
        : (lang === 'ko'
            ? SUBJECT_PROMPT_KO(topicName, gradeRange, count + buffer, minutes)
            : SUBJECT_PROMPT_EN(topicName, gradeRange, count + buffer, minutes))
      const result = await generateObject({
        model,
        schema: TestSchema,
        prompt: singlePrompt,
        temperature: 0.2,
      })
      allQuestions.push(...(result.object.questions as RawQuestion[]))
      totalIn = result.usage?.inputTokens ?? 0
      totalOut = result.usage?.outputTokens ?? 0
    }

    // Pipeline: sanitize LaTeX/markdown → dedupe → verify (drop wrong +
    // re-rate difficulty) → bucket by verified difficulty → fill the
    // target hard count first, then easy/medium → shuffle choices
    phase('verifying', 'study.test.progress.verifying', 60)
    let questions = allQuestions.map(sanitizeQuestion)
    questions = dedupeByPrompt(questions)

    // ── Trivial-item filter (SAT Math) ──────────────────────────────
    // Models occasionally fill the count with degenerate "find
    // vertex/domain/range of f(x) = simple quadratic" items, all
    // labeled hard. Observed in a 38-item run: items 20-37 were 18
    // consecutive one-step quadratic facts. Drop them here so the
    // top-up retry can refill from the hard prompt instead of
    // shipping placeholders.
    if (family === 'sat' && sectionLabel && /math/i.test(sectionLabel)) {
      const beforeTrivial = questions.length
      // Pattern: "what is the vertex/domain/range/y-intercept/x-
      // intercept/axis of symmetry/min/max value of f(x) = …" with
      // no second concept layered on. These are 1-step lookups, not
      // SAT-hard items.
      const trivialPromptPattern =
        /what is the (?:vertex|domain|range|y[-‑ ]?intercept|x[-‑ ]?intercept|axis of symmetry|minimum value|maximum value|min(?:imum)?|max(?:imum)?) (?:of|for) (?:the (?:graph|function|parabola)|f\(x\)|the function f\(x\))/i
      // Also detect the meta-pattern: prompt starts with "A function
      // f(x) is defined as f(x) = …" — a model crutch for filler.
      const fillerStartPattern = /^a function f\(x\) is defined as f\(x\) ?= ?/i
      // Track f(x) definitions used; flag the 3rd+ reuse as a
      // duplicate even if the question stem differs.
      const fxUseCount = new Map<string, number>()
      const fxFromPrompt = (p: string): string | null => {
        const m = p.match(/f\(x\) ?= ?([^.,?]+)/i)
        return m ? m[1].trim().toLowerCase().replace(/\s+/g, '') : null
      }
      questions = questions.filter(q => {
        const p = q.prompt
        // Always allow non-math sections through.
        if (!p) return false
        // Length floor: hard SAT Math items are ~150-400 chars; an
        // 80-char prompt is structurally too thin for the
        // multi-step difficulty we asked for.
        if (q.difficulty === 'hard' && p.length < 100) return false
        if (trivialPromptPattern.test(p) && p.length < 220) return false
        if (fillerStartPattern.test(p) && p.length < 200) return false
        const fx = fxFromPrompt(p)
        if (fx) {
          const n = (fxUseCount.get(fx) ?? 0) + 1
          fxUseCount.set(fx, n)
          if (n > 2) return false
        }
        return true
      })
      if (questions.length < beforeTrivial) {
        console.log('[test/generate] trivial-item filter', {
          dropped: beforeTrivial - questions.length,
          remaining: questions.length,
        })
      }
    }
    // Choice-count enforcement (type-aware): standard MC questions
    // must match the section's spec choice count. Other variants have
    // their own fixed counts:
    //   - numeric_entry → choices ignored (can be empty)
    //   - three_choice → exactly 3 (TOEIC Part 2)
    //   - quant_comparison → exactly 4 (GRE QC fixed choices)
    //   - multi_select → 6 for GRE SE, 3-5 for RC "select all"
    const expectedChoiceCount = baseDefaults.choiceCount
    const beforeChoiceFilter = questions.length
    questions = questions.filter(q => {
      switch (q.type) {
        case 'numeric_entry': return true // no choices to validate
        case 'three_choice': return q.choices.length === 3
        case 'quant_comparison': return q.choices.length === 4
        case 'multi_select': return q.choices.length >= 3 && q.choices.length <= 6
        // TOEFL Jan-2026 task-type variants — validate the discriminating
        // field is well-formed instead of choice count.
        case 'fill_in_blanks':
          // Must have a passage with [N] placeholders AND a non-empty
          // blanks array. Reject items the model produced without the
          // payload — they'd render as a passage with no inputs.
          return !!q.passage && /\[\d+\]/.test(q.passage)
            && Array.isArray(q.blanks) && q.blanks.length > 0
        case 'arrange_words':
          // choices ARE the word/phrase chips (6-10), correct_answer is
          // the chips joined in correct order with " | ".
          return q.choices.length >= 4 && q.choices.length <= 12
            && !!q.correct_answer && q.correct_answer.includes(' | ')
        case 'speaking_repeat':
          // correct_answer is the verbatim sentence to type back.
          return !!q.correct_answer && q.correct_answer.trim().length >= 6
        case 'speaking_interview':
          // No correctness check — just needs a prompt.
          return !!q.prompt && q.prompt.length >= 10
        case 'multiple_choice':
        default:
          return q.choices.length === expectedChoiceCount
      }
    })
    if (questions.length < beforeChoiceFilter) {
      console.log('[test/generate] choice-count filter', {
        expected: expectedChoiceCount,
        dropped: beforeChoiceFilter - questions.length,
      })
    }
    // Verifier — re-solves each item independently to catch wrong
    // answer keys. Math sections still go through it (arithmetic
    // mistakes are common and costly). Verbal sections SKIP it: a
    // 10-20s wall-clock penalty for a small accuracy bump isn't worth
    // it when the user feedback is "too slow". gpt-4o's generation is
    // good enough on R&W answer keys to ship without re-solve.
    const mathHeavy = isMathHeavy(family, sectionLabel)
    const verifyResult = mathHeavy
      ? await verifyAndCorrect(questions, apiKey, { mathHeavy: true })
      : { kept: questions, dropped: 0, corrected: 0, relabeled: 0 }
    phase('assembling', 'study.test.progress.assembling', 92)

    // Bucket by VERIFIED difficulty (not the generator's claim).
    const verifiedHard = verifyResult.kept.filter(q => q.difficulty === 'hard')
    const verifiedEasyMed = verifyResult.kept.filter(q => q.difficulty !== 'hard')

    // Prefer hard items up to target, fill the rest from easy/medium,
    // then top up from whichever bucket has surplus. Tracks used items
    // so we never double-count. Falls short only if total verified <
    // target (in which case we use everything we have).
    const hardSlice = verifiedHard.slice(0, targetHard)
    const easyMedSlice = verifiedEasyMed.slice(0, count - hardSlice.length)
    const combined = [...easyMedSlice, ...hardSlice]
    if (combined.length < count) {
      const extra = [
        ...verifiedEasyMed.slice(easyMedSlice.length),
        ...verifiedHard.slice(hardSlice.length),
      ]
      combined.push(...extra.slice(0, count - combined.length))
    }

    // ── Top-up loop: GUARANTEE exact count ─────────────────────────
    // Loop up to 4 iterations, each time fanning out parallel chunks
    // and shrinking the chunk size if items aren't being produced
    // (large chunks → truncation → 0 items returned). Cap iterations
    // to bound cost; cap missing at 15 so a catastrophic main-pool
    // failure doesn't trigger 44 retry calls. If we still come up
    // short after the loop, we log loudly but ship what we have —
    // partial > nothing.
    if (sectionSpec && combined.length < count) {
      const maxIterations = 4
      // Recompute perChunkCap — the one inside the chunked-gen block
      // is out of scope here. Same logic as the main pool.
      const heavyPassageRetry = hasPassages(family, sectionLabel)
      const heavyGraphicsRetry = family === 'sat' && sectionLabel != null && /math/i.test(sectionLabel)
      const baseChunkCap = heavyPassageRetry ? 18 : heavyGraphicsRetry ? 3 : 60
      // Each iteration shrinks chunk size: chunks of N → N/2 → 1 → 1.
      // Smaller chunks dramatically increase the model's success
      // rate (fewer tokens per call = no truncation, harder to
      // ignore the count requirement).
      const iterationChunkSizes = [baseChunkCap, Math.max(2, Math.floor(baseChunkCap / 2)), 1, 1]
      for (let iter = 0; iter < maxIterations; iter++) {
        const need = count - combined.length
        if (need <= 0) break
        const cap = iterationChunkSizes[iter] ?? 1
        const missing = Math.min(need, 15)
        const chunkCount = Math.ceil(missing / cap)
        const sizes: number[] = []
        let rem = missing
        for (let i = 0; i < chunkCount; i++) {
          const size = Math.ceil(rem / (chunkCount - i))
          sizes.push(size)
          rem -= size
        }
        const results = await Promise.all(
          sizes.map(size =>
            generateObject({
              model: openai('gpt-4o'),
              schema: TestSchema,
              temperature: 0.5,
              prompt: buildHardOnlyPrompt({
                topicName,
                count: size,
                minutes,
                formatBlock: testPrepBlock,
                extraGuidance: extraGuidanceFor(family, sectionLabel, size, lang)
                  + `\n\nTOP-UP iteration ${iter + 1}. Produce EXACTLY ${size} item(s) at top-decile SAT difficulty. Keep the explanation concise (~50 words) so the response stays under the token budget.`,
                hardFraming: (lang === 'ko' ? sectionSpec.hardItemFraming_ko : sectionSpec.hardItemFraming_en)
                  ?? GENERIC_HARD_FRAMING[lang],
                hardExamples: (lang === 'ko' ? sectionSpec.hardItemExamples_ko : sectionSpec.hardItemExamples_en) ?? [],
                lang,
              }),
            }).catch(err => {
              console.warn(`[test/generate] top-up iter ${iter + 1} chunk failed`, err)
              return null
            }),
          ),
        )
        let addedThisIter = 0
        for (const r of results) {
          if (!r) continue
          const topupRaw = (r.object.questions ?? []) as RawQuestion[]
          const topupClean = topupRaw
            .map(sanitizeQuestion)
            .filter(q => q.prompt && (q.choices.length === expectedChoiceCount || q.type === 'numeric_entry'))
          const remNow = count - combined.length
          if (remNow <= 0) break
          const toAdd = topupClean.slice(0, remNow)
          combined.push(...toAdd)
          addedThisIter += toAdd.length
        }
        console.log(`[test/generate] top-up iter ${iter + 1}`, {
          missing, chunkCap: cap, added: addedThisIter,
          remainingAfter: count - combined.length,
        })
        if (addedThisIter === 0) break // no progress — stop burning budget
      }
      if (combined.length < count) {
        console.error('[test/generate] FAILED to hit exact count', {
          target: count, shipped: combined.length, shortfall: count - combined.length,
        })
      }
    }

    // Sort easy → medium → hard so the assembled test paces like a
    // real adaptive module (difficulty rises across the section).
    // EXCEPT: when the test has shared passages (TOEFL/IELTS/ACT
    // Reading), keep questions grouped by passageGroupId so the UI
    // can render one passage with N questions below it. Within each
    // group, sort by difficulty. Order groups by their first item's
    // difficulty rank so easier passages come first.
    const difficultyRank: Record<'easy' | 'medium' | 'hard', number> = { easy: 0, medium: 1, hard: 2 }
    const hasPassageGroups = combined.some(q => q.passageGroupId)
    if (hasPassageGroups) {
      const groups = new Map<string, Question[]>()
      const ungrouped: Question[] = []
      for (const q of combined) {
        if (q.passageGroupId) {
          const arr = groups.get(q.passageGroupId) ?? []
          arr.push(q)
          groups.set(q.passageGroupId, arr)
        } else {
          ungrouped.push(q)
        }
      }
      // Sort each group internally by difficulty.
      for (const arr of groups.values()) {
        arr.sort((a, b) => difficultyRank[a.difficulty] - difficultyRank[b.difficulty])
      }
      // Order groups by their easiest item's difficulty (ascending).
      const orderedGroups = Array.from(groups.values()).sort((a, b) =>
        difficultyRank[a[0].difficulty] - difficultyRank[b[0].difficulty]
      )
      ungrouped.sort((a, b) => difficultyRank[a.difficulty] - difficultyRank[b.difficulty])
      combined.length = 0
      // Ungrouped items first (warm-up), then grouped passages.
      combined.push(...ungrouped, ...orderedGroups.flat())
    } else {
      combined.sort((a, b) => difficultyRank[a.difficulty] - difficultyRank[b.difficulty])
    }

    questions = combined.map((q, i) => shuffleChoices(q, hashSession(sessionId) + i * 31))

    // Server-side passage paragraph autofix — the REAL guarantee.
    // Even with strong prompt instructions, gpt-4o sometimes emits SAT
    // R&W passages as a single block (no \n\n). User has complained
    // repeatedly. So: for every passage > 80 words / > 3 sentences
    // missing a paragraph break, inject one at a natural sentence
    // boundary near the midpoint. Runs unconditionally for SAT R&W
    // and other long-passage tests. No-op for short or already-broken
    // passages.
    if (family === 'sat' || family === 'ksat' || family === 'toefl' ||
        family === 'ielts' || family === 'act' || family === 'gre' ||
        family === 'toeic') {
      questions = questions.map(q => {
        if (!q.passage) return q
        const passage = q.passage
        // Already has a paragraph break — trust the model.
        if (passage.includes('\n\n')) return q
        const wordCount = passage.trim().split(/\s+/).length
        if (wordCount < 80) return q
        // Split on sentence boundaries. We need 3+ sentences to split
        // somewhere meaningful — a 2-sentence passage has only one
        // valid break point and it'd land at the end.
        const sentences = passage.match(/[^.!?]+[.!?]+["')\]]*\s*/g) ?? []
        if (sentences.length < 3) return q
        // Find the split point that lands closest to the midpoint by
        // word count — produces visually balanced paragraphs.
        const midWord = wordCount / 2
        let bestSplit = 1
        let bestDiff = Infinity
        let running = 0
        for (let i = 0; i < sentences.length - 1; i++) {
          running += sentences[i].trim().split(/\s+/).length
          const diff = Math.abs(running - midWord)
          if (diff < bestDiff) {
            bestDiff = diff
            bestSplit = i + 1
          }
        }
        const para1 = sentences.slice(0, bestSplit).join('').trim()
        const para2 = sentences.slice(bestSplit).join('').trim()
        return { ...q, passage: `${para1}\n\n${para2}` }
      })
    }

    // ── Short-passage expansion pass: DISABLED ──────────────────────
    // Previously fired when SAT R&W passages came in under 80 words
    // (the old prompt asked for 100-180). The recalibrated prompt
    // now ASKS for 40-90 word passages to match released Practice
    // Test #5, so this pass would actively make passages WORSE by
    // inflating them past real SAT length. Kept the dead code
    // location as a marker in case we ever want a length-shrinking
    // pass for the opposite problem.

    // Empty-test guard: if the pipeline dropped everything (model
    // emitted wrong choice-count for the whole batch, verifier killed
    // every item, etc.), don't ship a broken session. Emit an error so
    // the client retries instead of rendering an empty grid that would
    // divide-by-zero in scoring.
    if (questions.length === 0) {
      console.error('[test/generate] pipeline produced 0 questions', {
        sessionId, family, sectionLabel, target: count,
        generated: allQuestions.length,
        verified: verifyResult.kept.length,
        expectedChoiceCount,
      })
      await supabaseAdmin
        .from('study_sessions')
        .update({ generation_status: 'failed' })
        .eq('id', sessionId)
      emit({ type: 'error', message: 'no questions survived verification — please retry' })
      try { controller.close() } catch { /* already closed */ }
      return
    }

    console.log('[test/generate] pipeline', {
      sessionId,
      target: count,
      mix,
      generated: allQuestions.length,
      verified: verifyResult.kept.length,
      verifiedHardCount: verifiedHard.length,
      finalHardCount: questions.filter(q => q.difficulty === 'hard').length,
      dropped: verifyResult.dropped,
      corrected: verifyResult.corrected,
      relabeled: verifyResult.relabeled,
      final: questions.length,
    })

    const test: TestPayload = {
      title: buildTestTitle({ family, sectionLabel, topicName, count: questions.length, minutes, lang }),
      timeLimitMinutes: minutes,
      section: sectionLabel,
      family,
      questions,
    }

    await supabaseAdmin
      .from('study_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: CACHED_TEST_MARKER + JSON.stringify(test),
        tokens_in: totalIn,
        tokens_out: totalOut,
        model: family ? 'gpt-4o' : 'gpt-4o-mini',
      })

    // Mark generation complete + fire notification. Both fire whether
    // or not the client is still connected — the whole point of this
    // background-generation pattern is that the user can navigate
    // away and learn the test is ready via the inbox / push.
    await supabaseAdmin
      .from('study_sessions')
      .update({ generation_status: 'ready' })
      .eq('id', sessionId)
    void notifyTestReady(user.id, sessionId, test.title, lang)

    phase('done', 'study.test.progress.done', 100)
    emit({ type: 'result', test, cached: false })
  } catch (err) {
    console.error('[test/generate]', err)
    // Persist the actual error message into config.last_error so we
    // can post-mortem failures via a Supabase query without needing
    // to tail the dev server stdout. Truncate long messages so the
    // JSONB cell stays manageable.
    const errMsg = (err as Error)?.message ?? String(err)
    const errName = (err as Error)?.name ?? 'Error'
    // AI SDK errors carry the model's raw output + Zod issues on
    // `cause` / `responseBody` / `value`. Capture whatever's there
    // so we can see WHICH field failed validation.
    const errCause = (err as { cause?: unknown })?.cause
    const errBody = (err as { responseBody?: string })?.responseBody
    const errValue = (err as { value?: unknown })?.value
    const errIssues = (err as { issues?: unknown })?.issues
    const causeStr = errCause ? JSON.stringify(errCause).slice(0, 400) : null
    const bodyStr = errBody ? String(errBody).slice(0, 800) : null
    const valueStr = errValue ? JSON.stringify(errValue).slice(0, 800) : null
    const issuesStr = errIssues ? JSON.stringify(errIssues).slice(0, 800) : null
    const { data: existing } = await supabaseAdmin
      .from('study_sessions')
      .select('config')
      .eq('id', sessionId)
      .maybeSingle()
    const nextConfig = {
      ...(existing?.config ?? {}),
      last_error: `${errName}: ${errMsg}`.slice(0, 500),
      last_error_cause: causeStr,
      last_error_body: bodyStr,
      last_error_value: valueStr,
      last_error_issues: issuesStr,
      last_error_at: new Date().toISOString(),
    }
    await supabaseAdmin
      .from('study_sessions')
      .update({ generation_status: 'failed', config: nextConfig })
      .eq('id', sessionId)
    emit({ type: 'error', message: 'generation failed' })
  } finally {
    try { controller.close() } catch { /* already closed */ }
  }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}

/** Wrap a fixed list of events in an NDJSON Response — used for the
 *  cached/idempotent path so the client's stream parser sees the same
 *  shape it does for a live generation. */
function ndjsonResponse(events: object[]): Response {
  const body = events.map(e => JSON.stringify(e)).join('\n') + '\n'
  return new Response(body, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  })
}

/** Streams polling progress while a concurrent generation completes
 *  on another request. Watches study_messages every 2s for up to 4
 *  minutes for the cache row to appear; also watches generation_status
 *  for 'failed'. Falls through to an error if the polling window
 *  expires (the original generation got stuck — client should retry,
 *  which will start a fresh run). */
function buildPollingStream(sessionId: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        try { controller.enqueue(enc.encode(JSON.stringify(event) + '\n')) } catch { /* closed */ }
      }
      emit({ type: 'phase', name: 'resuming', label: 'study.test.progress.resuming', percent: 30 })
      const maxAttempts = 120 // 120 × 2s = 4 min
      let attempts = 0
      try {
        while (attempts < maxAttempts) {
          attempts++
          // Stagger the percent so the bar visually inches forward
          // while we wait — caps at 90% so 'result' still feels like
          // the final step.
          const pct = Math.min(90, 30 + Math.round(attempts * 0.5))
          if (attempts % 5 === 0) emit({ type: 'phase', name: 'resuming', label: 'study.test.progress.resuming', percent: pct })

          const { data: rows } = await supabaseAdmin
            .from('study_messages')
            .select('content')
            .eq('session_id', sessionId)
            .eq('role', 'assistant')
            .ilike('content', `${CACHED_TEST_MARKER}%`)
            .limit(1)
          if (rows && rows.length > 0) {
            const raw = rows[0].content.slice(CACHED_TEST_MARKER.length)
            try {
              const cached = JSON.parse(raw) as TestPayload
              emit({ type: 'phase', name: 'done', label: 'study.test.progress.done', percent: 100 })
              emit({ type: 'result', test: cached, cached: true })
              return
            } catch {
              emit({ type: 'error', message: 'corrupt cached test — please retry' })
              return
            }
          }

          // Also bail if the other side marked the session failed.
          const { data: sess } = await supabaseAdmin
            .from('study_sessions')
            .select('generation_status')
            .eq('id', sessionId)
            .maybeSingle()
          if (sess?.generation_status === 'failed') {
            emit({ type: 'error', message: 'background generation failed — please retry' })
            return
          }

          await new Promise(r => setTimeout(r, 2000))
        }
        // Polling window exhausted — the other request likely died
        // mid-stream and never reached either the cache insert or the
        // failed-status update. Tell the client to retry; a fresh
        // POST will see status still 'pending' but no cache, and we
        // need a way to break the loop. Clear status to allow retry.
        await supabaseAdmin
          .from('study_sessions')
          .update({ generation_status: 'failed' })
          .eq('id', sessionId)
        emit({ type: 'error', message: 'generation timed out — please retry' })
      } finally {
        try { controller.close() } catch { /* already closed */ }
      }
    },
  })
}

/**
 * Easy + medium pool prompt. Built when the spec has a difficultyMix
 * so we know how many easy/medium items the section calls for. Forbids
 * hard items entirely — hard items come from a separate focused pass.
 */
function buildEasyMediumPrompt(args: {
  topicName: string
  count: number
  minutes: number
  formatBlock: string
  extraGuidance: string
  lang: 'en' | 'ko'
}): string {
  const { topicName, count, minutes, formatBlock, extraGuidance, lang } = args
  const extra = extraGuidance ? `\n\n${extraGuidance}\n` : ''
  if (lang === 'ko') {
    return `
${topicName} 모의고사용 ${count}개의 객관식 문항을 생성하세요.

${formatBlock}${extra}
규칙:
- 난이도: easy 또는 medium만. HARD 금지 — 어려운 문항은 별도 패스에서 생성합니다.
- 약 40% easy, 60% medium.
- 시험의 실제 형식을 정확히 따르세요. 보기 개수는 위 블록대로.
- 오답은 시험의 실제 함정 패턴 반영.
- 정답을 A/B/C/D에 골고루 배치 — A에 몰지 마세요.
- 수학 문항은 해설에 풀이를 보여 답을 검증할 수 있게.
- 일반 텍스트만. LaTeX(\\( \\)), 마크다운, HTML 금지. 유니코드 사용: x², √(2), π, ½, ±, ×, ÷.
- 각 문제는 독립적.
- 해설: 1-2문장. 함정 언급.
- 모든 텍스트 한국어.
- timeLimitMinutes = ${minutes}; section = 영역 이름.
`.trim()
  }
  return `
Generate ${count} multiple-choice questions for a ${topicName} mock test.

${formatBlock}${extra}
Rules:
- Difficulty: ONLY easy or medium. NO hard items — hard items are generated in a separate dedicated pass.
- About 40% easy, 60% medium.
- Match the test's real format. Choice count per the format block above.
- Wrong answers must reflect the test's actual trap patterns.
- Distribute correct answers across A/B/C/D — do NOT cluster on A.
- For math: SHOW WORK in the explanation. Compute the answer twice.
- Plain text only. NO LaTeX \\( \\), markdown, or HTML. Use Unicode: x², √(2), π, ½, ±, ×, ÷.
- Choice text contains ONLY the answer content. Do NOT prefix with "A)", "B.", "(1)" etc. — the UI adds the letter label.
- Each question independent.
- Explanations: 1-2 sentences. Mention the trap.
- PASSAGE FIELD: if the test format pairs a passage with each question (Digital SAT R&W: 40-90 words per question, single-block default — multi-paragraph ONLY for literary excerpts with a preamble; KSAT 영어 빈칸 추론 / 요약; **TOEFL Reading (Jan 2026 format): short 150-180 word academic passages shared by 5 linked questions, OR 40-90 word Daily Life texts (notice / email / flyer / post) shared by 2-3 linked questions — repeat the same passage verbatim on each linked question**; IELTS Reading: shared 700-900 word academic passages — repeat the same passage on each linked question), put it in the dedicated "passage" field and keep "prompt" to JUST the question stem (including any task-type tag like "[Academic — Biology]"). Do NOT put the passage inside the prompt. For math, grammar gap-fills, listening transcripts already given, or anything without a passage, set passage to null.
- timeLimitMinutes = ${minutes}; section = section label.
`.trim()
}

/**
 * Hard-only pool prompt. The whole prompt is about hardness — what it
 * looks like for THIS section, what to avoid, what the trap should be.
 * Single-pass prompts collapse hardness to medium because the model
 * is optimizing for average quality across the batch; isolating the
 * hard items lets them stay hard.
 */
function buildHardOnlyPrompt(args: {
  topicName: string
  count: number
  minutes: number
  formatBlock: string
  extraGuidance: string
  hardFraming: string
  hardExamples: string[]
  lang: 'en' | 'ko'
}): string {
  const { topicName, count, minutes, formatBlock, extraGuidance, hardFraming, hardExamples, lang } = args
  const extra = extraGuidance ? `\n\n${extraGuidance}\n` : ''
  const examplesBlock = hardExamples.length > 0
    ? (lang === 'ko'
        ? `\n\n다음은 이 영역의 검증된 어려운 문항 예시입니다. 그대로 복사하지 말고 이 깊이와 구조에 맞춰 새 문항을 만드세요:\n\n${hardExamples.join('\n\n')}\n`
        : `\n\nHere are VERIFIED hard items for this section. Do NOT copy them — but match this depth and structure when you create new items:\n\n${hardExamples.join('\n\n')}\n`)
    : ''
  if (lang === 'ko') {
    return `
${topicName} 시험에서 가장 어려운 변별 문항 ${count}개만 생성하세요. ALL difficulty = "hard".

${formatBlock}${extra}
이 영역에서 "어려운 문항"의 정의:
${hardFraming}${examplesBlock}

규칙:
- 모든 문항의 difficulty 필드는 "hard". easy/medium 절대 금지.
- 각 문항은 위 정의를 충족해야 합니다 — 다단계 추론, 미묘한 구분, 비자명한 설정.
- "2x+3=11 풀기" 또는 "직사각형 넓이 구하기" 같은 단순 문항 절대 금지.
- 오답은 실제 학생이 흔히 빠지는 정교한 함정을 반영. 다른 함정이 아니라 이 특정 어려운 문항 유형의 함정.
- 정답을 A/B/C/D에 골고루 배치.
- 수학 문항은 풀이를 보여 답 검증 가능하게. 답을 적기 전 머릿속에서 두 번 독립 계산.
- 일반 텍스트만. LaTeX, 마크다운, HTML 금지. 유니코드 사용: x², √(2), π, ½, ±, ×, ÷.
- 해설: 1-2문장. 어떤 단계가 어렵게 만드는지 언급.
- 모든 텍스트 한국어.
- timeLimitMinutes = ${minutes}; section = 영역 이름.
`.trim()
  }
  return `
Generate ${count} HARD discriminating items for the ${topicName} test. ALL difficulty = "hard".

${formatBlock}${extra}
What a HARD item looks like for THIS section:
${hardFraming}${examplesBlock}

Rules:
- Every item's difficulty field is "hard". NO easy or medium — they are generated in a separate pass.
- Each item must meet the framing above — multi-step reasoning, subtle distinctions, non-obvious setup.
- ABSOLUTELY NO trivial items like "solve 2x+3=11" or "what is the area of a rectangle".
- Wrong answers reflect the sophisticated traps real students fall into on items of THIS specific hard type — not generic traps.
- Distribute correct answers across A/B/C/D.
- For math: SHOW WORK in explanation. Compute the answer twice independently before committing.
- Plain text only. NO LaTeX, markdown, or HTML. Use Unicode: x², √(2), π, ½, ±, ×, ÷.
- Choice text contains ONLY the answer content. Do NOT prefix with "A)", "B.", "(1)" etc.
- Explanations: 1-2 sentences. Mention what makes this step hard.
- PASSAGE FIELD: same rule as the easy/medium pass — if the test pairs a passage with each question (SAT R&W: 40-90 words per question, ALWAYS include one, single-block default; KSAT 영어 빈칸; **TOEFL Reading Jan-2026: 150-180w shared academic OR 40-90w shared Daily Life text**; IELTS Reading shared 700-900w passage), put it in the "passage" field, keep "prompt" to JUST the question stem (including any "[Academic — X]" / "[Daily Life — X]" tag). Hard SAT R&W items achieve difficulty through subtle logical operators (hedges, scope quantifiers, causal-vs-correlational, modal strength) packed into ~70-90 words — NOT through length. Null when no passage applies.
- timeLimitMinutes = ${minutes}; section = section label.
`.trim()
}

/**
 * Section-specific extra guidance — genre rotation, modality mix, etc. —
 * that doesn't belong in the static format spec but does belong in
 * EVERY generation pass for that section. Returns "" when the section
 * has no extra guidance, in which case the prompt builder skips the
 * block entirely. Kept lang-aware so KSAT/TOEFL/etc. can grow their
 * own genre lists later.
 */
function extraGuidanceFor(
  family: TestFamily | null,
  section: string | null,
  count: number,
  lang: 'en' | 'ko',
): string {
  // Shared anti-failure-mode rules — apply to every section that has
  // passages or close-reading items. Model defaults: (a) inline the
  // answer verbatim in the passage so the question is trivial, (b)
  // make the correct answer noticeably longer than distractors.
  const universalRules = lang === 'ko'
    ? [
        'ANTI-FAILURE 규칙:',
        '- 지문에 답을 그대로 진술하지 마세요. 학생은 추론/근거 매칭/문맥 어휘 판단을 통해 답에 도달해야 합니다 — 정답이 지문에 한 문장으로 그대로 쓰여 있으면 안 됩니다.',
        '- 보기 길이를 균형 있게 맞추세요. 정답이 항상 가장 길거나 가장 짧으면 안 됩니다. 4개 보기는 비슷한 어절 수(±30%)를 가져야 합니다.',
        '- distractor_rationales 필드 필수: 객관식 문항(multiple_choice / three_choice)에서 정답이 아닌 모든 보기에 대해 왜 틀렸는지 한 줄 설명을 포함하세요. 형식: [{choice: "보기 문자열 그대로", reason: "이 보기가 함정인 이유 (예: 지문의 키워드를 차용했지만 범위가 다름, 범위 확대, 실생활에서는 맞지만 지문에 근거 없음 등)"}]. 함정 패턴을 구체적으로 명시 — "틀렸다"는 설명 금지. 정답에 대한 설명은 distractor_rationales에 포함하지 마세요 (그것은 explanation 필드에).',
      ].join('\n')
    : [
        'ANTI-FAILURE RULES:',
        '- Do NOT inline the answer verbatim in the passage. The student should reach the answer via inference, evidence matching, or in-context vocabulary judgment — never by copy-paste from a single sentence in the passage.',
        '- BALANCE choice lengths. The correct answer must NOT be the longest (or always the shortest) choice. The four choices should be within ±30% word count of each other.',
        '- distractor_rationales is REQUIRED: for multiple_choice / three_choice items, include a one-line "why this is wrong" entry for EVERY non-correct choice. Format: [{choice: "exact choice string", reason: "what trap this distractor encodes (e.g. \'borrows a keyword from line 3 but expands scope to ALL X\', \'true in the real world but not stated in the passage\', \'reverses the direction of the relationship\', \'ignores the hedge \"some\" in paragraph 2\')"}]. Name the specific trap — never generic "this is incorrect". Do NOT include the correct choice here (its explanation belongs in the `explanation` field). For numeric_entry / multi_select / quant_comparison set distractor_rationales to null.',
      ].join('\n')

  if (family === 'sat' && section && /reading|writing/i.test(section)) {
    // Real Digital SAT R&W has 4 question categories AND, for ~54% of
    // items (Info & Ideas + Craft & Structure), 4 passage genres.
    // Without explicit quotas the model over-indexes on Info & Ideas
    // and contemporary humanities; under-produces Conventions + pre-
    // 1900 literature. Scale to the requested count.
    const ii = Math.round(count * 0.26)
    const cs = Math.round(count * 0.28)
    const ei = Math.round(count * 0.20)
    const sec_ = Math.max(0, count - ii - cs - ei)
    // Genre quotas apply ONLY to Info & Ideas + Craft & Structure
    // items (these are the prose-passage items). EI = student-notes
    // format. Conventions = short edit passages.
    const passageQuota = ii + cs
    const lit = Math.round(passageQuota * 0.25)
    const hist = Math.round(passageQuota * 0.25)
    const hum = Math.round(passageQuota * 0.25)
    const sci = Math.max(0, passageQuota - lit - hist - hum)
    if (lang === 'ko') {
      return [
        `SAT R&W 구조 — 다음 분포를 정확히 지키세요 (총 ${count}문항):`,
        '',
        '문항 카테고리:',
        `- Information & Ideas (${ii}문항): 주제 파악, 세부 정보, 추론, 근거 매칭. 출제 형식: "글의 주제를 가장 잘 설명한 것은?", "연구자의 주장을 가장 잘 뒷받침하는 발견은?", "글을 근거로 X에 대해 추론할 수 있는 것은?"`,
        `- Craft & Structure (${cs}문항): 문맥 어휘, 글의 구조, 글 간 연결, 작가의 목적. 출제 형식: "글에서 X의 의미와 가장 가까운 것은?", "...의 기능을 가장 잘 설명한 것은?"`,
        `- Expression of Ideas (${ei}문항): 학생 노트로부터 수사적 종합(지문에 4-5개 불릿 노트 + 목표 진술; 어느 문장이 목표를 가장 잘 달성하는지), 전환어(어느 전환 표현이 가장 적절한지).`,
        `- Standard English Conventions (${sec_}문항): 문장 경계, 주어-동사 일치, 대명사-선행사 일치, 구두점(쉼표/콜론/대시/아포스트로피), 수식어 위치. 짧은 지문(1-3문장)에 밑줄 부분; "어느 선택지가 표준 영어 규범에 가장 부합하는가?"`,
        '',
        `지문 장르 (Information & Ideas + Craft & Structure 문항에만 적용 — 총 ${passageQuota}문항):`,
        `- 문학 (Literature): ${lit}문항 — 1850-1925년 소설·시 발췌, 또는 동시대 단편소설. 작가명·작품 연도 명시.`,
        `- 역사/사회 (History & Social Studies): ${hist}문항 — 미국 건국 문서, 사회과학 1차 사료, 정치·경제 에세이.`,
        `- 인문 (Humanities): ${hum}문항 — 철학, 예술 비평, 언어학, 미학.`,
        `- 과학 (Science): ${sci}문항 — 생명/물리/지구과학 학술 발췌 (전문 용어 포함).`,
        '',
        '지문 구조 — College Board 공개 Practice Test #5 (2024) 기준으로 보정. 짧은 지문이 표준: 대부분 40-90단어, 단일 단락. 항목 유형별: 문맥 어휘 30-60단어; 논리 완성 50-90; 주제·기능·구조 60-100; 글 간 연결(cross-text)은 두 개의 ~50-70단어 지문 ("\\n\\n"으로 구분 — 이 형식만이 multi-paragraph, 전체의 ~5-10%만); 문학 주제·목적 80-130단어 (서두 포함). 130단어 초과 절대 금지. 실제 SAT는 길이가 아니라 논리 연산자 (헷지, 한정사, 인과 vs 상관, 모달 강도)로 변별. 단일 단락이 기본, 다단락은 cross-text 또는 문학 서두+발췌 케이스에만.',
        '예시 2단락 지문 (문학, 약 115단어, passage 필드 유효 형식):\n"다음 글은 샬럿 브론테의 1853년 소설 Villette에서 발췌. 화자 루시 스노우가 낯선 도시에 혼자 도착한 직후의 장면.\\n\\nThe street was narrow, dim, deserted: not a step echoed; the shutters were closed, the lamps unlit. A great loneliness fell on me as I stood still, listening; but loneliness, as I had begun to discover, was the first condition of my new life. I had told myself I must learn to bear it without flinching."\n맥락 서문과 인용 본문 사이의 \\n\\n에 주의 — JSON에서 단락 구분을 인코딩하는 방식.',
        '난이도 — 실제 공개 디지털 SAT (Practice Test #5, 2024)의 최고난도 수준으로 보정. 그보다 더 어렵게 만들면 모델이 품질을 유지 못 하고 가짜 어려운 필러 문항을 생산함. 실제 SAT 최고난도 변별: (a) 헷지 무시 ("일부" vs "모두", "할 수 있다" vs "반드시"), (b) 범위 확대 ("화자" vs "분야 전체"), (c) 상관 vs 인과 혼동, (d) 문장 기능 오독 (예시 vs 반례), (e) 함의가 다른 근접 동의어. 함정 보기는 첫 읽기에 그럴듯해야 하고 재독에서만 드러나야 함. 금지: 첫 문장에서 답이 나오는 주제 문항, 지문 한 문장을 직접 풀어쓴 답, 명백히 주제 외이거나 사실 오류인 함정. 모든 오답은 특정 함정 패턴 — distractor_rationales에 명시.',
        '어휘 등급 — 실제 SAT Practice Test #5 기준. 상위 고등학교 / 대학 1학년 수준. GRE-tier 난해어 사용 금지 (adumbrate, contumacious 등). 실제 시험에서 사용되는 어휘 예시: postulate, ameliorate, antecedent, impending, innocuous, perpetual, hypothesized, sanction, rationalize. 한국어 시험이면 "회의적", "함의", "전제", "보완하다", "역설하다", "공준" 수준. 이 대역에서 선택; 더 어려운 단어로 인위적으로 끌어올리지 말 것.',
        '지문 도입부 형식: 문학 ("다음 글은 [작가]의 [연도] [작품]에서 발췌…") 및 비문학 모두 출처 서문 사용 가능 — Practice Test #5 항목 3, 5, 8, 24 등 비문학도 "K.D. Leka 연구진이…", "1949년 Frank Zamboni가 개발한…" 같은 출처/배경 도입을 자유롭게 사용. 형식을 다양화: 때로는 출처로 시작, 때로는 주장 자체로 시작. 모든 문항이 같은 도입부 패턴이면 안 됨.',
        '한 지문에 한 문항. 카테고리와 장르를 섹션 전체에 분산 (연속해서 같은 카테고리·장르 금지).',
        '',
        universalRules,
      ].join('\n')
    }
    return [
      `SAT R&W STRUCTURE — match this distribution exactly (${count} items total):`,
      '',
      'QUESTION CATEGORIES:',
      `- Information & Ideas (${ii} items): main idea, supporting details, inference, command of evidence. Stem types: "Which statement best describes the main idea...", "Which finding... best supports the researcher's claim?", "Based on the text, what can be inferred about...?"`,
      `- Craft & Structure (${cs} items): words in context, text structure, cross-text connections, author's purpose. Stem types: "As used in the text, what does the word X most nearly mean?", "Which choice best describes the function of...?"`,
      `- Expression of Ideas (${ei} items): rhetorical synthesis from a student's notes (provide 4-5 bulleted notes in the passage + a goal statement, ask which sentence best fulfills the goal), transitions (which transition word/phrase best fits).`,
      `- Standard English Conventions (${sec_} items): sentence boundaries, subject-verb agreement, pronoun-antecedent agreement, punctuation (commas, colons, dashes, apostrophes), modifier placement. Short passage (1-3 sentences) with an underlined portion; the question is "Which choice... [conforms to the conventions of Standard English]?"`,
      '',
      `PASSAGE GENRES (apply to Information & Ideas + Craft & Structure items only — ${passageQuota} items total):`,
      `- Literature (${lit}): excerpts from 1850–1925 novels/poetry, OR contemporary short fiction. Name the author + year.`,
      `- History / Social Studies (${hist}): U.S. founding documents, social-science primary sources, political/economic essays.`,
      `- Humanities (${hum}): philosophy, arts criticism, linguistics, aesthetics.`,
      `- Science (${sci}): life/physical/earth-science academic excerpts with technical vocabulary.`,
      '',
      'PASSAGE STRUCTURE — calibrated to released College Board Practice Test #5 (2024): SHORT passages, 40-90 words for most items, single-block (no paragraph breaks). Specific ranges by item type: words-in-context 30-60 words; logical completion 50-90; main-idea / function / structure 60-100; cross-text connections two passages of ~50-70 words each (these get the only multi-paragraph format, separated by "\\n\\n" — at most ~5-10% of items); literary main-purpose 80-130 words when including the "adapted from" preamble. NEVER inflate passages past ~130 words; real SAT items keep prose tight and force difficulty through logical operators (hedges, scope quantifiers, causal vs correlational, modal strength) rather than length. Single paragraph is the DEFAULT, not the exception. The only multi-paragraph format is cross-text-connections (Passage 1 / Passage 2) or literary items where a context preamble precedes a quoted excerpt.',
      'EXAMPLE of a 2-paragraph passage (literary, ~115 words, valid format for the passage field):\n"The following text is adapted from Charlotte Brontë\'s 1853 novel Villette. The narrator, Lucy Snowe, has just arrived alone in a foreign city.\\n\\nThe street was narrow, dim, deserted: not a step echoed; the shutters were closed, the lamps unlit. A great loneliness fell on me as I stood still, listening; but loneliness, as I had begun to discover, was the first condition of my new life. I had told myself I must learn to bear it without flinching."\nNote the literal \\n\\n between the preamble and the excerpt — that\'s how to encode the paragraph break in the JSON.',
      'DIFFICULTY — calibrated to the hardest items on a real released Digital SAT (Practice Test #5, 2024). NOT harder than that. Pushing past real SAT difficulty toward GRE/AMC tier produces filler items the model can\'t sustain at quality. The discriminating cuts on real hard SAT items: (a) hedge-word ignored ("some" vs "all", "may" vs "must"), (b) scope creep ("the speaker" vs "the field"), (c) causal claim mistaken for correlation, (d) function-of-sentence misread (an example vs a counterexample), (e) near-synonym with wrong connotation in context. Distractors should sound plausible on a first read and require a careful re-read to eliminate. FORBID: bare main-idea questions answerable from the first sentence, questions whose answer is a direct paraphrase of any single passage sentence, distractors that are clearly off-topic or contain a literally false statement. Every wrong choice must encode a SPECIFIC trap pattern — name it in distractor_rationales.',
      'VOCABULARY REGISTER — calibrated to released Digital SAT Practice Test #5. Real test "words in context" targets use upper-high-school / early-college register, NOT GRE-tier obscure words. Reference set FROM the actual test: trace, fragile, recognizable, sophisticated, antecedent, impending, innocuous, perpetual, hypothesized, discounted, redefined, exploited, sanction, ameliorate, rationalize, postulate, irreducibly, contextual. Acceptable harder anchors (also SAT-tier): assuage, capricious, conciliatory, deride, disparate, ephemeral, equivocal, fortuitous, garrulous, idiosyncratic, magnanimous, meticulous, obfuscate, ostensible, pedantic, perfunctory, prescient, prudent, qualify (verb sense), repudiate, sanguine, ubiquitous. Use these as the calibration band — choose words at this level. AVOID as anchor (too hard for SAT, GRE-only): adumbrate, contumacious, etiolated, gnomic, hortatory, jejune, mendicant, pellucid, pusillanimous, supererogatory, sui generis, vituperative. Also AVOID as words-in-context targets (too easy / overused by generators): "elaborate", "characterize", "demonstrate", "illustrate", "subtle", "significant", "ambiguous", "consistent", "compelling", "nuanced". Aim for the middle: real SAT vocabulary.',
      'PASSAGE PREAMBLE FORMAT: literary items use "The following text is from [author]\'s [year] [work] [title]…" with a one-line context sentence ("The narrator, a young Z, has just arrived in…"). Non-literary items MAY ALSO use a brief sourcing line when grounded in a real work or study ("K.D. Leka and colleagues found that…", "In her 1983 book…"), as observed on Practice Test #5 items 3, 5, 8, 24, etc. The preamble should feel natural and informational, not formulaic — vary the opening: sometimes start with the source ("In 1949, Frank Zamboni developed…"), sometimes with the claim itself ("Many ancient sculptures of people\'s heads are missing their noses…"). Do NOT make every non-literary item start with "The following text is adapted from"; the actual test mixes openings.',
      'One question per passage. Spread categories AND genres across the section — do NOT cluster.',
      '',
      universalRules,
    ].join('\n')
  }

  if (family === 'sat' && section && /math/i.test(section)) {
    // Digital SAT Math has 4 topic strands with public weights.
    // Format split: ~75% multiple-choice, ~25% Student-Produced
    // Response (SPR / numeric entry — type:'numeric_entry').
    const alg = Math.round(count * 0.35)
    const adv = Math.round(count * 0.35)
    const psd = Math.round(count * 0.15)
    const geo = Math.max(0, count - alg - adv - psd)
    const spr = Math.round(count * 0.25)
    const mc = count - spr
    if (lang === 'ko') {
      return [
        `SAT 수학 주제 분포 — 정확히 다음과 같이 출제 (총 ${count}문항):`,
        `- 대수 (Algebra) ${alg}문항: 1차 방정식·부등식·연립·절댓값.`,
        `- 고급 수학 (Advanced Math) ${adv}문항: 이차·지수·다항식·유리식.`,
        `- 문제 해결·자료 분석 (Problem Solving & Data Analysis) ${psd}문항: 비율·백분율·확률·산점도·이원 분할표.`,
        `- 기하·삼각법 (Geometry & Trigonometry) ${geo}문항: 직선·각·삼각형·원·넓이·부피·직각삼각형 삼각비.`,
        '',
        '문항 형식 분포:',
        `- 객관식(type="multiple_choice"): ${mc}문항. 4지선다.`,
        `- 학생 단답형 SPR(type="numeric_entry"): ${spr}문항. choices는 빈 배열, acceptable_answers에 정답을 나열(정수/소수/분수). 예: "3.44" → acceptable_answers: ["3.44", "3.4400", "172/50"]. SPR은 4개 주제(대수/고급/PSD/기하)에 골고루 분산.`,
        '',
        '난이도: 상위 1-3% (Module 2 최상위보다 더 어렵게) — College Board가 공개한 최고난도 문항보다 더 어렵게 보정. 만점 800 목표 / AMC 10·SAT Subject Math II 준비생 기준. "상위 모듈 응시자 중위권"이 아니라 "30명 중 1명만 풀이를 찾는" 수준. 모든 문항이 3-5분의 신중한 작업과 최소 2단계 이상의 비자명한 조작을 요구. 빈출 추론 패턴: (a) "묻는 양 바꾸기" — x가 아니라 2x+5 / x²+1/x² / (a−b)/(a+b)를 구함; (b) 비선형 연립 접선 조건 (판별식=0)에서 미지수가 직선 매개변수; (c) g(x) = af(bx+c)+d 형태에서 f의 한두 점만 주고 나머지를 조건으로 추론; (d) 산점도/이원 분할표의 비자명한 조건부 확률 (예: 주변확률만 주고 P(A|B∪C) 요구); (e) 비에타 + 대칭함수 — 근에 대한 관계로 파생식 계산; (f) a, b를 따로 구하지 않고 식 (a+b, ab, a²+b², a/b+b/a) 자체를 대수 조작으로; (g) 복잡한 도형 안의 닮은 삼각형 (내접삼각형 원, 교차현, 접선-할선); (h) 비자명한 모델 선택 (복리 vs 단리, 등비 vs 등차). 금지: 단순 산술, 1단계 대입, 암산 추정, 보기 대입으로 풀리는 문항, 첫 식으로 답이 바로 나오는 문항, 난이도가 단위·부호 추적뿐인 문항. 천장은 Algebra 2 + 기초 통계 + 직각삼각형·단위원 삼각비. 미적분, 로그 항등식 (곱·몫·밑변환 이상), 행렬, 복소수, 형식 증명, 코사인·사인 법칙 사용 금지.',
        '최고난도 예시 앵커 (생성 문항은 이 수준 이상으로):',
        '1) f(x) = (x²+ax+b)(x²+cx+d)의 그래프가 (−1,0), (2,0), (5,0)을 지나고 x절편이 정확히 하나 더 있다. a+c=7일 때 bd의 값은? (비에타 + 인수 매칭 + a+c로 4번째 근 추론)',
        '2) xy평면에서 y=kx+3이 원 x²+y²−6x+8y+9=0에 접한다. k의 모든 가능한 값의 곱은? (완전제곱 후 접선 조건; k에 대한 이차식; 비에타로 곱)',
        '3) 정수 계수 다항식 p(x)를 (x−2)로 나누면 나머지 5, (x−3)으로 나누면 나머지 7. (x−2)(x−3)으로 나눈 나머지는? (나머지 정리 + 선형 나머지 r(x)=ax+b 가정)',
        '4) 이항변수 X, Y의 결합분포 표. P(X=1|Y=1)=0.6, P(Y=1|X=0)=0.4, P(X=1)=0.5일 때 P(X=1 AND Y=0)? (조건부 확률 식 두 개로 연립)',
        '',
        '그래픽: 실제 SAT 수학 문항 약 40%에 시각 자료. 비율 가중치: 기하/삼각 ≈ 90% (도형 거의 필수), PSD ≈ 70% (산점도/막대/이원 분할표/도트·박스·히스토그램), 고급 수학 ≈ 30% (포물선/지수곡선/함수표), 대수 ≈ 20% (좌표평면 직선/값 표). 필요 없으면 graphic 필드 생략(또는 null).',
        '',
        'GRAPHIC 형식 — `graphic.type`을 다음 중 하나로, 해당 페이로드 함께:',
        '- "scatter": xLabel, yLabel, points: [[x,y]…] (10-30점), 선택 bestFit: {m, b}',
        '- "bar": xLabel, yLabel, bars: [{label, value}…] (4-8개)',
        '- "twoWayTable": rowLabels, colLabels, cells: number[][]',
        '- "dotPlot" / "boxPlot" / "histogram": xLabel + values 또는 bars',
        '- "lineGraph": xLabel, yLabel, series: [{label, points}]',
        '- "coordinatePlane": functions / points / lines',
        '- "triangle" | "circle" | "polygon" | "solid": shape, spec, labels',
        '- "rawSvg": svg 문자열 (600자 이내, viewBox 0 0 200 200, stroke="#374151" fill="none")',
        '선택 caption: 축 설명·도형 노트. 시각이 필요한 데이터는 prose에 적지 말고 graphic에 — 반대로 graphic을 설정했으면 문항이 실제로 그것을 읽어야 풀리도록.',
        '',
        '대부분 실세계 맥락의 서술형 문항. 모든 문항에서 데스모스 계산기 가능 가정.',
      ].join('\n')
    }
    return [
      `SAT MATH TOPIC DISTRIBUTION — produce exactly (${count} items total):`,
      `- Algebra (${alg}): linear equations/inequalities/systems/absolute value.`,
      `- Advanced Math (${adv}): quadratics, exponentials, polynomials, rational expressions.`,
      `- Problem Solving & Data Analysis (${psd}): ratios, percentages, probability, scatterplots, two-way tables.`,
      `- Geometry & Trigonometry (${geo}): lines/angles, triangles, circles, area/volume, right-triangle trig.`,
      '',
      'FORMAT SPLIT — Digital SAT Math is ~75% MC and ~25% Student-Produced Response (SPR / type-in):',
      `- type="multiple_choice": ${mc} items. 4 choices each. Standard format.`,
      `- type="numeric_entry": ${spr} items. Leave "choices" empty. Set acceptable_answers to all forms that count as correct (integer, decimal, equivalent fraction). EXAMPLE: for the answer 3.44, set acceptable_answers: ["3.44", "3.4400", "172/50"]. For 12, set ["12"]. SPR items are SPREAD across all 4 topic strands — not clustered in one strand.`,
      '',
      'DIFFICULTY: TOP 1-3% (ABOVE upper Module 2) — calibrate every item HARDER than the hardest items released by College Board. Target students aiming for a perfect 800 / who are also prepping for AMC 10, USAMO qualifying, or SAT Subject Math II. The reference is NOT "the median upper-Module-2 student" but "the 1-in-30 student who blinks at the item before finding the trick." Every item should require 3-5 minutes of careful work and at least TWO non-obvious moves (not one). Reasoning archetypes to use heavily: (a) "asked-for-quantity flip" — solve for x but the question asks for 2x+5 / x²+1/x² / (a−b)/(a+b); (b) non-linear systems at tangency (circle+line, parabola+line) requiring discriminant=0, AND the unknown is the line\'s parameter not the contact point; (c) function composition + transformation chains: g(x) = af(bx+c)+d evaluated when you only know f at one or two anchor points — must deduce the rest from given conditions; (d) dense scatterplot or two-way-table CONDITIONAL probability where the conditional partition is non-obvious (e.g. P(A|B∪C) given a marginal); (e) Vieta\'s + symmetric functions: given a polynomial\'s roots satisfy a relation, find a derived expression; (f) systems where you must solve for an EXPRESSION (a+b, ab, a²+b², a/b+b/a) without isolating a or b — by algebraic manipulation; (g) similar triangles inside a more complex figure (circle with inscribed triangle, intersecting chords, tangent-secant); (h) exponential / quadratic word problems where the right model is non-obvious (compound vs. simple, geometric vs. arithmetic). FORBID: bare arithmetic, one-step plug-and-chug, items solvable by quick mental estimation, items solvable by trying each multiple-choice answer, items where the answer falls out of the first equation written, items where the only difficulty is keeping track of units or signs. Ceiling stays at Algebra 2 + intro stats + right-triangle & unit-circle trig — do NOT use calculus, log identities beyond product/quotient/change-of-base, matrices, complex numbers, formal proofs, or law of sines/cosines. Stay within SAT topical scope but push the DIFFICULTY past the ceiling of released SAT items.',
      'HARDEST-ITEM EXAMPLE ANCHORS (use these as the calibration floor — generated items should be AT LEAST this hard, not easier):',
      '1) "The function f is defined by f(x) = (x²+ax+b)(x²+cx+d). The graph of y=f(x) in the xy-plane passes through (−1, 0), (2, 0), (5, 0), and exactly one more x-intercept. If a+c = 7, what is the value of b·d?" (Trap: Vieta + factor matching + recognizing the 4th root from a+c. Wrong answers built from the visible numbers −1, 2, 5.)',
      '2) "In the xy-plane, the line y=kx+3 is tangent to the circle x²+y²−6x+8y+9=0. What is the product of all possible values of k?" (Two-step: complete the square to (x−3)²+(y+4)²=16 then use tangency / distance-from-center = radius. Yields a quadratic in k; ask for the PRODUCT, not the values themselves — Vieta.)',
      '3) "p(x) is a polynomial with integer coefficients. When p(x) is divided by (x−2), the remainder is 5. When p(x) is divided by (x−3), the remainder is 7. What is the remainder when p(x) is divided by (x−2)(x−3)?" (Remainder theorem + linear-remainder ansatz r(x)=ax+b; set up 2-eq system. Answer is a linear polynomial, not a constant.)',
      '4) "The table shows the joint distribution of two binary variables X and Y. If P(X=1 | Y=1)=0.6 and P(Y=1 | X=0)=0.4 and P(X=1)=0.5, find P(X=1 AND Y=0)." (Pure conditional manipulation; the trick is recognizing which cells to set as variables and which two equations close the system.)',
      '',
      'GRAPHICS — REAL SAT MATH HAS VISUALS ON ~40% OF ITEMS. Include a "graphic" field on roughly that fraction, weighted by topic: Geometry/Trig ≈ 90% (figures are nearly always required), Problem Solving & Data Analysis ≈ 70% (scatterplots, bar charts, two-way tables, dot/box/histogram plots), Advanced Math ≈ 30% (parabolas, exponential curves, function tables on coordinate plane), Algebra ≈ 20% (lines on coordinate plane, tables of values). Omit `graphic` (or set null) on items that don\'t need one.',
      '',
      'GRAPHIC SHAPE — set `graphic.type` to ONE of these, plus the matching payload fields:',
      '- "scatter": xLabel, yLabel, points: [[x,y], ...] (10-30 points), optional bestFit: {m, b}',
      '- "bar": xLabel, yLabel, bars: [{label, value}, ...] (4-8 bars)',
      '- "twoWayTable": rowLabels: string[], colLabels: string[], cells: number[][] (rows × cols)',
      '- "dotPlot": xLabel, values: number[] (raw values; renderer stacks dots)',
      '- "histogram": xLabel, yLabel, bars: [{label: "0-10", value: count}, ...]',
      '- "lineGraph": xLabel, yLabel, series: [{label, points: [[x,y], ...]}]',
      '- "coordinatePlane": points: [{x, y, label?}], lines: [{m, b}] — for parabolas / curves use "rawSvg" instead.',
      '',
      'STRUCTURED GEOMETRY (PREFER THESE — the renderer computes exact coordinates from your parameters, so vertices are GUARANTEED on the circle, inscribed-circle radii are GUARANTEED correct, etc.):',
      '- "inscribedTriangle": for any triangle inscribed in a circle. spec: { r: 70, vertexAngles: [0, 120, 240] }. Angles in degrees clockwise from top (0° = top, 90° = right, 180° = bottom, 270° = left). For a right triangle inscribed with hypotenuse as diameter use angles [270, 90, X] where X is the third vertex anywhere except 90° or 270°. labels: { vertices?: ["A","B","C"], sides?: ["x","x","20"] } — side labels are in order opposite to vertex 0, 1, 2.',
      '- "rightTriangle": legs of a right triangle with optional inscribed circle. spec: { legA: 6, legB: 8, incircle?: true }. labels: { a?: "6", b?: "8", c?: "10", vertices?: ["A","B","C"] } — A top-left, B right-angle, C bottom-right.',
      '- "circleWithChord": circle with one or more chords, points, or a tangent. spec: { r: 70, chords?: [{ angle1: 0, angle2: 180, label?: "AB" }], showCenter?: true, points?: [{ angle: 0, label?: "A" }, { angle: 180, label?: "B" }] }. Use angle 0 = top, 90 = right, etc. To draw a diameter use angles separated by 180°.',
      '- "rawSvg" (FALLBACK ONLY): svg: "<svg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'>...</svg>" — use ONLY when none of the structured types above can express the figure (e.g., 3D solids, complex compound figures, custom shaded regions). Keep under 900 chars. Style: stroke="black" stroke-width="1.5" fill="none". Label with <text font-size="11" fill="black">. Always viewBox="0 0 200 200" with shapes inside x:[20,180] y:[20,180]. Models routinely mis-compute coordinates here — use a structured type whenever possible.',
      'GEOMETRY ACCURACY RULES (a real SAT figure is drawn TO scale unless captioned "not drawn to scale"):',
      '- DRAWING AREA: keep all shapes inside x:[20, 180], y:[20, 180]. Leave a 20-unit margin on all sides. Vertices and circle edges must not touch x=0, y=0, x=200, or y=200.',
      '- INSCRIBED VERTICES: when a triangle/polygon is "inscribed in a circle", every vertex MUST lie exactly on the circle. For circle (cx, cy, r), a vertex at angle θ is (cx + r·cos(θ), cy + r·sin(θ)). Use simple angles: 0°, 90°, 180°, 270° for axis-aligned; 30°/60°/120°/150° for equilateral and 30-60-90. Sample equilateral inscribed in circle r=70 at (100, 100): vertices at (100, 30), (39, 135), (161, 135) — each EXACTLY 70 from center.',
      '- INSCRIBED CIRCLE in a right triangle with legs a, b and hypotenuse c: radius r = (a + b − c) / 2; center is r units from each leg. Example: legs 6 and 8, c=10 → r=2; if the right angle is at origin and legs run along +x and +y, the incircle center is (r, r).',
      '- CIRCLE INSCRIBED IN POLYGON: center at the polygon\'s centroid; for a square of side s the inscribed circle has r = s/2.',
      '- INSCRIBED SQUARE in a circle r: vertices at angles 45°, 135°, 225°, 315° — for r=70 at center (100,100): (149,149), (51,149), (51,51), (149,51).',
      '- LABEL PLACEMENT: position <text> outside the shape\'s perimeter — offset 8-12 units from the vertex/edge. Never place a label on top of the shape\'s stroke. For vertex labels (A, B, C), offset away from the centroid; for length labels, place at the midpoint of the segment then push perpendicular by 8 units.',
      '- DO NOT use fill="black" on solid regions you want labels readable on; default to fill="none". For shaded regions use fill="#e5e7eb" (light gray).',
      '- ARC / ANGLE MARKERS: use <path d="M…A…"> for arcs. Small 90° square at right angles is a 8x8 unit square notched into the corner.',
      'VERIFY BEFORE EMITTING: mentally re-check that (a) every "inscribed" point is on its circle (compute distance to center), (b) the figure fits in [20,180]², (c) no label overlaps a stroke. If you can\'t verify, omit the graphic and set graphic to null instead — a missing figure is better than a wrong one.',
      'Optional caption: string for an axis label or figure note. The graphic must contain the data the QUESTION requires — do NOT describe the visual in prose and leave graphic null. Conversely, if you set a graphic, the question stem should genuinely require reading it.',
      '',
      `COUNT REQUIREMENT — produce EXACTLY ${count} items, not ${count - 1}, not ${count + 1}. If you find yourself running out of token budget, prefer shorter explanations over fewer items.`,
      '',
      'Most items are CONTEXTUALIZED word problems with real-world setups (not bare-symbol arithmetic). Assume a Desmos calculator is available on every item.',
    ].join('\n')
  }

  // ── KSAT 국어 ─────────────────────────────────────────────────
  if (family === 'ksat' && section && /국어|korean/i.test(section)) {
    // Real KSAT 국어: 공통 34문항(독서 17 + 문학 17) + 선택 11문항.
    // Reading 17 has 3-4 nonfiction passages (인문/사회/과학/기술/예술).
    // 문학 17 has 4 passages (현대시/현대소설/고전시가/고전소설/갈래복합).
    const dokseo = Math.round(count * 0.38)   // 독서 ~38% (17 of 45)
    const munhak = Math.round(count * 0.38)   // 문학 ~38% (17 of 45)
    const sel = Math.max(0, count - dokseo - munhak) // 선택 ~24% (11 of 45)
    return [
      `KSAT 국어 구조 — 다음 분포를 정확히 지키세요 (총 ${count}문항, 모두 5지선다):`,
      '',
      '영역 분포:',
      `- 독서(비문학) ${dokseo}문항: 인문/사회/과학/기술/예술 지문. 1지문당 4-6문항. 지문 길이 1000-2000자. 발문: "윗글에 대한 이해로 가장 적절한 것은?", "윗글을 바탕으로 <보기>를 이해한 내용으로 적절하지 않은 것은?", "ⓐ~ⓔ의 사전적 의미로 적절하지 않은 것은?"`,
      `- 문학 ${munhak}문항: 현대시 / 현대소설 / 고전시가 / 고전소설 / 갈래복합 4개 지문. 발문: "윗글에 대한 설명으로 가장 적절한 것은?", "<보기>를 참고하여 윗글을 감상한 내용으로 적절하지 않은 것은?"`,
      `- 선택(화법과 작문 OR 언어와 매체) ${sel}문항: 화작 — 대화/발표/토론 + 작문(초고/자료 활용). 언매 — 음운/형태소/문장/매체.`,
      '',
      'KSAT 출제 규약:',
      '- 모든 문항 5지선다(① ② ③ ④ ⑤).',
      '- <보기> 박스 빈출 — 외재적 비평 관점·추가 자료·합답형(ㄱㄴㄷ) 선지에 사용.',
      '- 부정형 발문("적절하지 않은 것은?")이 30-40% 비중으로 자연스럽게 출제.',
      '- 함정 패턴: (1) 부분 일치(절반만 맞음), (2) 과도한 일반화·확대 해석, (3) 인과관계 역전(A→B를 B→A로), (4) 지문에 없는 외부 상식 첨가, (5) 비교/최상급/유일성(only, always, never) 과장, (6) 키워드 베끼기(지문 단어 그대로 쓰지만 명제는 다름).',
      '- 정답 번호 ①~⑤ 균등 분배(각 번호 평균 8-10문항, 총 45문항 기준).',
      '- 보기 길이 균형: 5개 선지가 비슷한 어절 수.',
      '',
      universalRules,
    ].join('\n')
  }

  // ── KSAT 영어 ─────────────────────────────────────────────────
  if (family === 'ksat' && section && /english|영어/i.test(section)) {
    // Listening 17 (1-17) + Reading 28 (18-45). Reading sub-types:
    // 목적/요지/주제/제목 ~7, 도표/내용일치 ~4, 어법/어휘 ~2,
    // 빈칸 추론 4 (KILLER), 간접쓰기 6, 장문 5.
    const listening = Math.round(count * 0.38) // 17 of 45
    const summary = Math.round(count * 0.16)   // ~7 of 45 — 목적/요지/주제/제목
    const dataMatch = Math.round(count * 0.09) // ~4 of 45 — 도표/내용일치/실용문
    const grammar = Math.round(count * 0.05)   // ~2 of 45 — 어법/어휘
    const blank = Math.round(count * 0.09)     // ~4 of 45 — 빈칸 추론(KILLER)
    const indirectWrite = Math.round(count * 0.13) // ~6 of 45 — 무관/순서/삽입/요약
    const longRead = Math.max(0, count - listening - summary - dataMatch - grammar - blank - indirectWrite)
    return [
      `KSAT 영어 구조 — 절대평가 영역, 다음 분포 (총 ${count}문항, 모두 5지선다):`,
      '',
      `- 듣기 ${listening}문항 (1-17번): 짧은 대화·담화 + 마지막 1지문 2문항. 발문: "남자가 하는 말의 목적으로 가장 적절한 것은?", "여자의 마지막 말에 대한 남자의 응답으로 가장 적절한 것은?"`,
      `- 글의 목적/요지/주제/제목 ${summary}문항`,
      `- 도표/내용일치/실용문 ${dataMatch}문항`,
      `- 어법/어휘 ${grammar}문항: "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?"`,
      `- 빈칸 추론 ${blank}문항 (31-34번, 최고난도 KILLER): 약 150-180단어 학술 지문 + 핵심 명제 자리 빈칸. 5개 선지 모두 그럴듯한 추상 명사구. 정답은 지문 전체 논지의 패러프레이즈, 오답은 지문 부분 키워드를 그대로 포함.`,
      `- 간접쓰기 ${indirectWrite}문항 (35-40번): 무관 문장, 순서 배열, 문장 삽입, 요약문 완성. 지시사·연결사 추적 능력 평가.`,
      `- 장문 독해 ${longRead}문항 (41-45): 1지문 2문항(41-42) + 서사형 1지문 3문항(43-45). 대명사 추적.`,
      '',
      '발문 한국어, 지문/보기 영어. 5지선다. 함정: 지문 키워드 그대로 쓰되 명제 비틀기.',
      '',
      universalRules,
    ].join('\n')
  }

  // ── KSAT 수학 ─────────────────────────────────────────────────
  if (family === 'ksat' && section && /수학|math/i.test(section)) {
    // 공통 22문항 (1-22, 수학I + 수학II) + 선택 8문항 (23-30, 확통/미적/기하).
    // 객관식 21문항 (1-21) + 단답형 9문항 (22-30, 자연수 1-999).
    const common = Math.round(count * 0.73)   // ~22 of 30
    const select = Math.max(0, count - common) // ~8 of 30
    return [
      `KSAT 수학 구조 — 객관식 + 단답형 혼합 (총 ${count}문항):`,
      '',
      `- 공통(수학I + 수학II) ${common}문항 (1-22번)`,
      `  · 수학I: 지수·로그, 삼각함수, 수열`,
      `  · 수학II: 함수의 극한·연속, 미분, 적분`,
      `- 선택 ${select}문항 (23-30번): 확률과 통계 / 미적분 / 기하 中 1과목`,
      '',
      '문항 형식 분포:',
      `- 객관식 5지선다 (type="multiple_choice", 1-21번): ${Math.round(count * 0.7)}문항. 2점/3점/4점 차등 (4점이 14-21번에 집중).`,
      `- 단답형 (type="numeric_entry", 22-30번): ${Math.round(count * 0.3)}문항. choices는 빈 배열, acceptable_answers에 정답 자연수 나열. 답은 1-999 자연수만 (음수·소수·분수 불가). 예: 정답이 36이면 acceptable_answers: ["36"]. 22번(공통 마지막)과 29·30번(선택 마지막)이 KILLER 변별 문항.`,
      '',
      'KILLER 문항(22, 29, 30) 특징: 다항함수·삼각함수의 미정계수를 여러 조건(연속·미분가능·극값·교점)으로 동시에 결정. 그래프 개형 그리기 + 절댓값·구간 분할로 4-8개 케이스 분석. 정답률 5-15%.',
      '',
      '함정: (1) 부호 실수, (2) 정의역/치역 혼동, (3) 부등식 등호 누락, (4) 일반화 케이스를 특수값(0, 1)으로 대입, (5) 킬러: 비슷한 기출 문제의 정답으로 유도. 발문 한국어. 5지선다 객관식의 정답 번호 ①~⑤ 균등 분배.',
    ].join('\n')
  }

  // ── TOEFL Reading (January 2026 format) ──────────────────────
  if (family === 'toefl' && section && /reading/i.test(section)) {
    // Jan 2026 redesign: mixes Daily Life short texts (40% of items)
    // + short Academic passages (60%). Legacy 700-word passages with
    // insert-sentence and prose-summary are REMOVED. The third task
    // type — "Complete the Words" fill-in-letters — is generated by
    // a separate pipeline (different schema, no MC choices).
    const dailyLifeQ = Math.round(count * 0.4)   // ~8 of 20
    const academicQ = count - dailyLifeQ          // ~12 of 20
    const dailyLifeTexts = Math.max(3, Math.round(dailyLifeQ / 2.5))   // ~3 texts, 2-3 Q each
    const academicPassages = Math.max(2, Math.round(academicQ / 5))    // ~2-3 passages, 5 Q each
    return [
      `TOEFL Reading (January 2026 format) — ${count} questions.`,
      `Mix: ~${dailyLifeQ} Daily Life questions across ${dailyLifeTexts} short texts, ${academicQ} Academic questions across ${academicPassages} short academic passages.`,
      '',
      'TASK A — "Read in Daily Life" (40% of items):',
      `- ${dailyLifeTexts} short, non-academic visual texts (campus notice / club flyer / email / social media post / job ad / course-registration page).`,
      '- Each text is 40-90 words, plain everyday register. Render the text plainly in the passage field (no markdown, no emojis). Begin the prompt with a task tag like "[Daily Life — Campus notice]" then the question stem.',
      '- 2-3 MC questions per text: literal detail, purpose ("Why was this posted?"), writer-situation inference, what a recipient should do next.',
      '',
      'TASK B — "Read an Academic Passage" (60% of items):',
      `- ${academicPassages} SHORT academic passages, EACH 150-180 words. NOT 700 words. Count the words and stay in range — passages under 130 words or over 200 words will be rejected.`,
      '- Topics: intro-level biology, art history, psychology, geology, business, linguistics — accessible to a first-year undergraduate.',
      '- 5 questions per passage: (1) main idea, (2) vocabulary in context, (3) factual detail, (4) negative factual (EXCEPT / NOT), (5) rhetorical purpose OR inference. Tag prompts like "[Academic — Biology]".',
      '',
      'TASK C — "Complete the Words" (optional, 2 items, type="fill_in_blanks"):',
      '- A short paragraph (60-100 words) with 5-8 letter-blanks marked as [1] [2] [3] in the passage field.',
      '- For each blank, provide the missing letter(s) in the "blanks" array: [{ "id": 1, "answer": "s" }, { "id": 2, "answer": "tion" }, …]. Blanks are typically 1-4 letters (a word ending, prefix, or short fragment).',
      '- "prompt" should just say "[Complete the Words] Read the paragraph and type the missing letters into each blank." (no further question stem).',
      '- "choices" must be an empty array, "correct_answer" must be null. Set passageGroupId to null (each Complete-the-Words item stands alone).',
      '',
      'DO NOT generate:',
      '- "Insert Text" items (legacy iBT, REMOVED in 2026 redesign — no [■] markers anywhere)',
      '- "Prose Summary" items (legacy iBT, REMOVED)',
      '- 600-900 word passages (legacy iBT length — wrong for 2026)',
      '',
      `SHARED-PASSAGE GROUPING (CRITICAL): each Daily Life text is SHARED across its 2-3 linked questions; each Academic passage is SHARED across its 5 linked questions. On every linked question, copy the SAME full text into the "passage" field AND set passageGroupId to a stable id ("daily-1", "daily-2", … for Daily Life texts; "academic-1", "academic-2", … for Academic passages). The UI uses passageGroupId to render the passage ONCE at the top of the group.`,
      '',
      universalRules,
    ].join('\n')
  }

  // ── TOEFL Listening (January 2026 format) ────────────────────
  if (family === 'toefl' && section && /listening/i.test(section)) {
    // Jan 2026: 3 task types — Listen-and-Choose-a-Response (~50%),
    // Conversation (~25%), Lecture/Announcement (~25%). All audio
    // IRL; we ship a text fallback that inlines the transcript in
    // the passage field so the student reads what they would hear.
    const chooseN = Math.max(6, Math.round(count * 0.5))
    const convoN = Math.max(2, Math.round(count * 0.25))
    const lectureN = Math.max(2, count - chooseN - convoN)
    return [
      `TOEFL Listening (January 2026 format) — ${count} questions.`,
      `Mix: ${chooseN} Listen-and-Choose-a-Response items + ${convoN} Conversation questions across ~2 conversations + ${lectureN} Lecture/Announcement questions across ~2 talks.`,
      'Without audio playback in our app, render every transcript inline. Begin the passage field with "Transcript: " followed by the spoken text. Begin the prompt with a task tag.',
      '',
      `TASK A — "Listen and Choose a Response" (${chooseN} items, type="multiple_choice"):`,
      '- A single utterance (a question, statement, or short request) by ONE speaker. 8-25 words. Topics: everyday campus / work / travel / social.',
      '- "passage" = "Transcript: \\"<the utterance>\\"". passageGroupId = null (each item stands alone).',
      '- "prompt" = "[Choose a Response] Which is the most natural reply?"',
      '- 4 choices = plausible spoken replies. Correct = best register/function match. Distractors: (1) keyword echo but wrong function, (2) wrong register (too formal/casual for the cue), (3) ignores a key qualifier.',
      '',
      `TASK B — "Listen to a Conversation" (${convoN} items, type="multiple_choice"):`,
      '- A short 8-12 turn dialogue (~150-220 words total) between 2 speakers. Settings: student↔advisor, student↔librarian, roommates, professor↔student office hours.',
      '- "passage" = "Transcript:\\nA: ...\\nB: ...\\nA: ..." (full dialogue). SHARED across the 2-3 linked questions per conversation — set passageGroupId to "convo-1", "convo-2".',
      '- "prompt" = "[Conversation — <setting>] " + question stem (gist, detail, function "Why does the man say X?", attitude).',
      '',
      `TASK C — "Listen to announcements and academic talks" (${lectureN} items, type="multiple_choice"):`,
      '- A short announcement (~120-180 words: campus PA / transit / museum / library) OR a short academic mini-lecture (~180-260 words) on intro-level biology / history / psychology / business / geology / linguistics.',
      '- "passage" = "Transcript: " + full text. SHARED across 2-3 linked questions — passageGroupId "lecture-1", "lecture-2".',
      '- "prompt" = "[Lecture — <topic>]" or "[Announcement — <venue>]" + question stem (main idea, key detail, speaker purpose, inference).',
      '',
      universalRules,
    ].join('\n')
  }

  // ── TOEFL Writing (January 2026 format) ──────────────────────
  if (family === 'toefl' && section && /writing/i.test(section)) {
    // Jan 2026: 3 task types — Build-a-Sentence (10), Email (1),
    // Academic Discussion (1). Email + Discussion are graded by
    // the response/grade pipeline (rubric); Build-a-Sentence is
    // auto-graded by exact-order match here.
    const buildN = Math.max(8, Math.round(count * 0.6))
    const emailN = Math.max(1, Math.round(count * 0.2))
    const discussionN = Math.max(1, count - buildN - emailN)
    return [
      `TOEFL Writing (January 2026 format) — ${count} questions.`,
      `Mix: ${buildN} Build-a-Sentence items + ${emailN} Email task + ${discussionN} Academic Discussion task.`,
      '',
      `TASK A — "Build a Sentence" (${buildN} items, type="arrange_words"):`,
      '- A jumbled set of 6-10 word/phrase chips that, when arranged in the correct order, form a single grammatical English sentence.',
      '- "choices" array = the chips in RANDOM order (NOT the correct order — the model must shuffle).',
      '- "correct_answer" = the chips joined in correct order with " | " as the separator (e.g., "The | tour guides | who | showed us around | the old city | were fantastic.").',
      '- "prompt" = "[Build a Sentence] Tap the words in order to make a grammatical sentence." (no further stem).',
      '- Set passage to null, blanks to null.',
      '- Target everyday or campus register sentences. Include 1-2 chips that are short connectors (who/that/and) or short phrases — not just single words — to match the PT1 PDF style.',
      '',
      `TASK B — "Write an Email" (${emailN} item, type="multiple_choice", 4 sample-response choices):`,
      '- "passage" = the email scenario in plain text: who sent the email, what they said, and 3 bullet points the student must address. ~50-90 words.',
      '- "prompt" = "[Email] Read the email and choose the strongest reply." (the MC variant is a fallback — real practice routes through the response-grader).',
      '- 4 choices = sample replies of varying quality: (1) the strongest (addresses all 3 bullets, right register), (2) addresses 2/3, (3) right register but wrong scenario, (4) right scenario but wrong register.',
      '- correct_answer = the strongest reply.',
      '',
      `TASK C — "Write for an Academic Discussion" (${discussionN} item, type="multiple_choice", 4 sample-response choices):`,
      '- "passage" = professor question + 2 short student replies (~40-70 words each). ~150-200 words total.',
      '- "prompt" = "[Academic Discussion] Choose the strongest contribution to the discussion."',
      '- 4 choices = sample contributions of varying quality: (1) strongest (clear position, engages a classmate by name, specific example), (2) just summarizes both classmates, (3) takes a position but no example, (4) off-topic.',
      '- correct_answer = the strongest contribution.',
      '',
      universalRules,
    ].join('\n')
  }

  // ── TOEFL Speaking (January 2026 format) ─────────────────────
  if (family === 'toefl' && section && /speaking/i.test(section)) {
    // Jan 2026: 2 task types — Listen-and-Repeat (~6) +
    // Take-an-Interview (~5). Both audio-required IRL; we ship
    // text-based fallbacks (repeat = type the script verbatim;
    // interview = open response auto-graded only for substance).
    const repeatN = Math.max(4, Math.round(count * 0.55))
    const interviewN = Math.max(3, count - repeatN)
    return [
      `TOEFL Speaking (January 2026 format) — ${count} questions.`,
      `Mix: ${repeatN} Listen-and-Repeat items + ${interviewN} Take-an-Interview items.`,
      '',
      `TASK A — "Listen and Repeat" (${repeatN} items, type="speaking_repeat"):`,
      '- A short 12-25 word utterance in casual or campus register. The student listens (or in our text-only fallback, reads) then types it back exactly.',
      '- "passage" = "Audio script: \\"<the exact sentence>\\""',
      '- "prompt" = "[Listen and Repeat] Type the sentence exactly as you hear it."',
      '- "correct_answer" = the exact sentence (matching the audio script verbatim, no quotes).',
      '- "choices" must be an empty array.',
      '',
      `TASK B — "Take an Interview" (${interviewN} items, type="speaking_interview"):`,
      '- An open interviewer question (familiar topic). The student responds in 2-5 sentences.',
      '- "prompt" = "[Interview] " + the interviewer question (e.g., "[Interview] Tell me about a time you helped a classmate.")',
      '- "passage" must be null, "choices" must be an empty array, "correct_answer" must be null.',
      '- The grader only checks for substantive (>20 char) response — rubric scoring routes through /api/study/response/grade.',
      '',
      universalRules,
    ].join('\n')
  }

  // ── IELTS Reading ────────────────────────────────────────────
  if (family === 'ielts' && section && /reading/i.test(section)) {
    // 3 passages × 13-14 questions. 11 question types.
    return [
      `IELTS Academic Reading 구조 — 3개 지문 × 13-14문항 = ${count}문항 (총 60분):`,
      '',
      `각 지문 ~700-900단어, 한 지문에 13-14문항 공유.`,
      '',
      'SHARED-PASSAGE GROUPING (CRITICAL): on every question, copy the SAME full passage text into the "passage" field AND set passageGroupId to a stable id ("passage-1" for the first passage\'s 13-14 questions, "passage-2", "passage-3"). The UI uses passageGroupId to render the passage ONCE at the top of the group.',
      '',
      '지문 난이도 + 권장 문항 유형 분포:',
      `- Passage 1 (가장 쉬움, 사실 묘사형): True/False/Not Given 4-7 + Sentence Completion 2-4 + Short Answer 2-3`,
      `- Passage 2 (중간 난이도, 과정·논증): Matching Information/Features 4-6 + Summary Completion 3-5 + Multiple Choice 2-3`,
      `- Passage 3 (최난도, 논증·의견): Matching Headings 5-7 + Yes/No/Not Given 4-6 + Multiple Choice 2-3`,
      '',
      '핵심 함정: Not Given vs False 구분 — Not Given = 지문이 해당 주장을 다루지 않음(겹치는 어휘 있어도). False = 지문이 명시적으로 모순. Y/N/NG는 작가의 의견 vs 인용된 의견 구분 필수.',
      '',
      universalRules,
    ].join('\n')
  }

  // ── ACT English (Enhanced) ────────────────────────────────────
  if (family === 'act' && section && /english/i.test(section)) {
    const conv = Math.round(count * 0.535)  // 52-55%
    const prod = Math.round(count * 0.305)  // 29-32%
    const knol = Math.max(0, count - conv - prod) // 15-17%
    return [
      `Enhanced ACT English — 다음 분포 (총 ${count}문항, 5개 지문에 분산):`,
      '',
      `- Conventions of Standard English ${conv}문항 (52-55%): 구두점(comma splice, semicolon, colon), 주어-동사 일치(긴 전치사구 사이), 대명사-선행사, 수식어 위치. 밑줄형 — 보기는 대안 표현 + "NO CHANGE"(첫 보기).`,
      `- Production of Writing ${prod}문항 (29-32%): 전환 표현 선택, 문장 추가/삭제, 문장 위치 이동, 전체 글 목적 부합 판단. 명시적 발문 사용.`,
      `- Knowledge of Language ${knol}문항 (15-17%): 어휘 선택(중복 표현 제거), 톤·격식(공식 지문에 비격식 표현), 모호한 대명사 참조.`,
      '',
      'ACT 핵심 규약: (1) "NO CHANGE"는 첫 보기(A 또는 F). (2) 동일 의미라면 가장 간결한 선택지가 정답 — 장황한 옵션은 거의 오답. (3) 일부 문항은 "NOT acceptable"형으로 출제(3개 정답 중 1개 오답 찾기).',
      '',
      universalRules,
    ].join('\n')
  }

  // ── ACT Math (Enhanced) ───────────────────────────────────────
  if (family === 'act' && section && /math/i.test(section)) {
    const phm = Math.round(count * 0.575) // Preparing for Higher Math
    const ies = Math.max(0, count - phm)  // Integrating Essential Skills
    return [
      `Enhanced ACT Math — 4지선다 (legacy의 5지에서 변경, 총 ${count}문항):`,
      '',
      `- Preparing for Higher Math ${phm}문항 (57-60%): Number & Quantity (~10-12%) + Algebra (~17-20%) + Functions (~17-20%) + Geometry (~17-20%) + Statistics & Probability (~12-15%)`,
      `- Integrating Essential Skills ${ies}문항 (40-43%): 비율·백분율·다단계 산술·도형·평균 — 8학년+ 응용 추론`,
      '',
      '계산기 사용 가능. 공식 시트 없음 — 도형 공식 모두 외워야. KILLER 문항은 후반부에 집중(다개념 결합: 삼각함수+닮음 삼각형, 로그+지수). 함정: (1) 부호 실수, (2) 같은 주제의 잘못된 공식, (3) 중간 단계 값을 정답으로, (4) 1 차이.',
    ].join('\n')
  }

  // ── ACT Reading (Enhanced) ────────────────────────────────────
  if (family === 'act' && section && /reading/i.test(section)) {
    return [
      `Enhanced ACT Reading — 4개 지문 × 약 9문항 = ${count}문항 (총 40분):`,
      '',
      '지문 고정 장르 순환:',
      `- 지문 1: Literary Narrative / Prose Fiction`,
      `- 지문 2: Social Science`,
      `- 지문 3: Humanities`,
      `- 지문 4: Natural Science`,
      `- 4개 중 1개는 짝지문(Passage A + Passage B) — cross-text 비교 문항 포함`,
      '',
      'SHARED-PASSAGE GROUPING (CRITICAL): each passage is ~750-900 words and SHARED across all 9 of its questions. On every question, copy the SAME passage text into the "passage" field AND set passageGroupId to a stable id ("passage-1" through "passage-4"). For the PAIRED passage, format the passage field as "Passage A:\\n<text A>\\n\\nPassage B:\\n<text B>" and use the same passageGroupId across all linked questions.',
      '',
      '문항 카테고리:',
      `- Key Ideas & Details (52-60%): "the main idea is", "according to the passage", "can reasonably be inferred"`,
      `- Craft & Structure (25-30%): 'the word "X" most nearly means', "the narrator's tone", "the function of paragraph X"`,
      `- Integration of Knowledge & Ideas (13-18%): 짝지문 비교, "the author would most likely agree with"`,
      '',
      '함정: (1) 현실에서는 맞지만 지문 근거 없음, (2) 앞 단락은 지지하나 뒷 단락이 반박, (3) 등장인물 의견을 작가 의견으로, (4) 짝지문에서 작가 입장 뒤집기, (5) 추론에 절대어("항상", "절대") 사용.',
      '',
      universalRules,
    ].join('\n')
  }

  // ── GRE Verbal ────────────────────────────────────────────────
  if (family === 'gre' && section && /verbal/i.test(section)) {
    // GRE Verbal: ~10 RC + ~6 TC + ~4 SE per section, but we render
    // 27 total (across both real sections). Spread proportionally.
    const rc = Math.round(count * 0.56)  // ~15 of 27
    const tc = Math.round(count * 0.22)  // ~6 of 27
    const se = Math.max(0, count - rc - tc) // ~6 of 27
    return [
      `GRE Verbal — 다음 분포 (총 ${count}문항, 실제 시험은 2영역으로 분할):`,
      '',
      `- Reading Comprehension ${rc}문항 (type="multiple_choice", 5 choices): 1-5단락 지문, 1-6 문항씩.`,
      `- Text Completion ${tc}문항: 1-blank items use type="multiple_choice" with 5 choices. Multi-blank items (2-3 blanks) are not yet supported by our schema — emit them as 1-blank simplifications for now (use the most pivotal blank).`,
      `- Sentence Equivalence ${se}문항 (type="multi_select", 6 choices, correct_answers contains exactly 2 entries): 한 문장에 빈칸 하나 + 6개 보기. 의미가 동등한 문장을 만드는 정확히 2개를 correct_answers에 나열.`,
      '',
      '핵심: 학술 고급 어휘(perfunctory, sanguine, mendacious, limpidity, recondite). TC/SE 함정 — 두 동의어가 문장에 맞지 않거나, 정답 한 쌍 + 함정 동의어 한 쌍 혼합. 문장을 읽지 않고 동의어만 짝지으면 함정.',
      '',
      universalRules,
    ].join('\n')
  }

  // ── GRE Quant ─────────────────────────────────────────────────
  if (family === 'gre' && section && /quant/i.test(section)) {
    const qc = Math.round(count * 0.28)  // ~7-8 of 27
    const mc = Math.round(count * 0.52)  // ~14 of 27
    const ne = Math.round(count * 0.08)  // ~2 of 27
    const di = Math.max(0, count - qc - mc - ne) // ~3 of 27 (data interp)
    return [
      `GRE Quant — 다음 분포 (총 ${count}문항, 실제 시험은 2영역으로 분할). 온스크린 계산기 제공:`,
      '',
      `- Quantitative Comparison ${qc}문항 (type="quant_comparison", choices는 정확히 다음 4개를 순서대로): ["Quantity A is greater.", "Quantity B is greater.", "The two quantities are equal.", "The relationship cannot be determined from the information given."]. correct_answer는 위 4개 중 하나. 변수 범위 미지정 시 D 정답 가능성 의심.`,
      `- Multiple Choice ${mc}문항 (type="multiple_choice", 5 choices): 단일 정답.`,
      `- Numeric Entry ${ne}문항 (type="numeric_entry", choices 빈 배열, acceptable_answers에 정답 형태 나열): 숫자 직접 입력(정수/소수/분수).`,
      `- Data Interpretation ${di}문항 (type="multiple_choice"): 차트/표 기반 2-3문항 세트. passageGroupId를 공유해서 같은 차트 묶기.`,
      '',
      '핵심 함정: QC 변수가 음수/0/분수일 수 있는데 양수 정수로 가정. "indicate all" 다중 선택에서 엣지 케이스(0, 1, 음수) 누락. 도형이 "not drawn to scale"임을 무시.',
    ].join('\n')
  }

  // ── AP (generic) ─────────────────────────────────────────────
  if (family === 'ap') {
    return [
      `AP MCQ — 4지선다 (2011년 이후 모든 AP MCQ는 4지). 다음을 따르세요:`,
      '',
      '- 해당 과목의 CED(Course and Exam Description)에 명시된 기술/단원을 해설에 언급.',
      '- 함정은 대학 입문 수준의 흔한 오개념을 반영(예: AP Bio — "more is better" 표면적 답; APUSH — 실제 사건을 10년 이내로 벗어난 날짜; AP Calc — 연쇄법칙·곱 법칙 잊음).',
      '- 사료·표·그래프 기반 세트 문항이 인문/사회/과학 과목 빈출 — 자료에 근거한 분석/추론.',
      '',
      universalRules,
    ].join('\n')
  }

  // ── TOEIC (Part-aware) ───────────────────────────────────────
  if (family === 'toeic') {
    // TOEIC has Part-specific formats; mostly the spec block handles
    // them. Add universal anti-failure rules for Reading parts.
    return universalRules
  }

  // For other test sections that have passages (KSAT 한국사, 탐구 etc.),
  // apply the universal anti-failure rules at least.
  if (section && /reading|국어|영어|verbal|한국사|history|탐구/i.test(section)) {
    return universalRules
  }
  return ''
}

const GENERIC_HARD_FRAMING: Record<'en' | 'ko', string> = {
  en: 'A HARD item requires 3+ reasoning steps, OR requires translating prose into a formal statement before solving, OR turns on a subtle distinction the student must spot in the prompt. Distractors should encode plausible-but-wrong setups (chose the wrong technique, mis-translated a constraint, applied a special-case rule too broadly). A student who has only memorized procedures should stumble; a student who understands WHY each technique applies should succeed.',
  ko: '어려운 문항은 3단계 이상 추론 필요, OR 산문을 풀기 전에 형식 진술로 번역 필요, OR 학생이 문제에서 발견해야 할 미묘한 차이에 답이 갈림. 함정은 그럴듯하지만 틀린 설정 반영(잘못된 기법 선택, 제약을 잘못 번역, 특수 규칙을 너무 넓게 적용). 절차만 외운 학생은 막히고, 각 기법이 왜 적용되는지 이해한 학생은 성공.',
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

/** SAT R&W, KSAT 국어/영어, TOEFL/IELTS/ACT Reading, GRE Verbal —
 *  sections where the verifier must do real close reading. gpt-4o-mini
 *  "corrects" inference items by picking the surface-vocabulary match
 *  (exactly the distractor the test is designed around). */
function isVerbalHeavy(family: TestFamily | null, section: string | null): boolean {
  if (!family || !section) return false
  if (family === 'gre' && /verbal/i.test(section)) return true
  const s = section.toLowerCase()
  return /reading|writing|국어|영어|verbal/.test(s)
}

/** True for sections whose items carry a passage (per-question or
 *  shared). Used to pick a smaller per-chunk size so each generateObject
 *  call lands under the 16k output token cap — passage-bearing items
 *  are ~3× larger than bare math/grammar items. */
function hasPassages(family: TestFamily | null, section: string | null): boolean {
  if (!family) return false
  // SAT R&W: per-question 25-150 word passages. SAT Math: occasional
  // word-problem context but no formal passage.
  if (family === 'sat' && section && /reading|writing/i.test(section)) return true
  // TOEFL/IELTS/ACT Reading: shared ~700-900 word passage repeated on
  // each question — heaviest case.
  if ((family === 'toefl' || family === 'ielts' || family === 'act') && section && /reading/i.test(section)) return true
  // KSAT 국어 (passages), KSAT 영어 reading items (passages).
  if (family === 'ksat' && section && /국어|영어|korean|english/i.test(section)) return true
  // TOEIC Part 7 reading items carry passages.
  if (family === 'toeic' && section && /reading/i.test(section)) return true
  // GRE Verbal RC + TC carry passages/sentences with significant length.
  if (family === 'gre' && section && /verbal/i.test(section)) return true
  return false
}

/** Build the user-facing test title. SAT goes to "Digital SAT" since
 *  every section in the spec is the post-2024 digital format. KSAT
 *  uses Korean section labels. Other tests fall back to a generic
 *  "<Test> — <Section> — Full section practice (Nq / Mmin)". */
function buildTestTitle(args: {
  family: TestFamily | null
  sectionLabel: string | null
  topicName: string
  count: number
  minutes: number
  lang: 'en' | 'ko'
}): string {
  const { family, sectionLabel, topicName, count, minutes, lang } = args
  const test = prettyTest(family)
  const sec = sectionLabel ?? topicName
  if (lang === 'ko') {
    return `${test} — ${sec} — 전체 영역 모의고사 (${count}문항 / ${minutes}분)`
  }
  return `${test} — ${sec} — Full section practice (${count} questions / ${minutes} min)`
}

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)))
}

/** Apply the session's difficulty bias on top of the spec's natural
 *  difficulty mix. 'challenge' shifts ~half of medium into hard;
 *  'warmup' shifts ~half of medium into easy. 'balanced' (default)
 *  is a no-op. Result is renormalized to sum to 1.0. */
function applyDifficultyBias(
  base: { easy: number; medium: number; hard: number },
  bias?: 'balanced' | 'challenge' | 'warmup',
  family?: TestFamily | null,
): { easy: number; medium: number; hard: number } {
  // SAT challenge bias is locked-on for the SAT family (the UI hides
  // the picker). User wants every item at top-of-spec difficulty —
  // no warm-up items diluting the test. Force pure-hard mix; the
  // SAT R&W prompt already calibrates "hard" to top-decile Digital
  // SAT items + adds "above-college" language below.
  if (family === 'sat' && bias === 'challenge') {
    return { easy: 0, medium: 0, hard: 1 }
  }
  if (!bias || bias === 'balanced') return base
  const shift = base.medium * 0.5
  const out = bias === 'challenge'
    ? { easy: base.easy, medium: base.medium - shift, hard: base.hard + shift }
    : { easy: base.easy + shift, medium: base.medium - shift, hard: base.hard }
  const total = out.easy + out.medium + out.hard
  return { easy: out.easy / total, medium: out.medium / total, hard: out.hard / total }
}

function prettyTest(family: TestFamily | null): string {
  switch (family) {
    case 'ksat':  return 'KSAT (수능)'
    case 'sat':   return 'Digital SAT'
    case 'toefl': return 'TOEFL iBT'
    case 'toeic': return 'TOEIC'
    case 'ielts': return 'IELTS Academic'
    case 'act':   return 'ACT'
    case 'ap':    return 'AP'
    case 'gre':   return 'GRE'
    default:      return 'Test Prep'
  }
}

/** Fire-and-forget: insert in-app notification + send push when a
 *  background test generation completes. The inbox row uses the
 *  existing `notifications` table; push uses the existing Supabase
 *  Edge Function via the lib helper. Both swallow errors — the test
 *  is already cached, so notification failure shouldn't block the
 *  primary flow. */
async function notifyTestReady(userId: string, sessionId: string, testTitle: string, lang: 'en' | 'ko'): Promise<void> {
  const title = lang === 'ko' ? '시험 준비 완료' : 'Your test is ready'
  const message = lang === 'ko'
    ? `${testTitle} — 탭하여 시작하세요.`
    : `${testTitle} — tap to start.`
  try {
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title_key: 'notifications.studyTestReady.title',
      message_key: 'notifications.studyTestReady.message',
      title_params: {},
      message_params: { testTitle },
      title,
      message,
      type: 'system',
      navigation_data: {
        page: 'study-session',
        filters: { sessionId },
      },
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[test/generate] inbox insert failed', err)
  }
  // Push notification — separate fetch to the Supabase Edge Function.
  try {
    await sendPushNotification([userId], title, message, {
      type: 'system',
      page: 'study-session',
      sessionId,
    })
  } catch (err) {
    console.error('[test/generate] push send failed', err)
  }
}
