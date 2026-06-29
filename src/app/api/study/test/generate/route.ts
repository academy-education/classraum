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
   *  model omits it (which it often does for the standard case). */
  type: z.enum(['multiple_choice', 'numeric_entry', 'multi_select', 'three_choice', 'quant_comparison'])
    .nullable().optional(),
  /** Choice options. Length depends on type/section. */
  choices: z.array(z.string()).max(6).optional(),
  /** Correct answer for single-answer types. */
  correct_answer: z.string().optional(),
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

CRITICAL STRUCTURE: real Digital SAT R&W ALWAYS pairs a passage (TARGET 100-180 words, default ≥120; minimum 70; maximum 200 — bias to the longer end of the spec, students consistently report short passages feel underweight) with a SINGLE question. Put the passage in the dedicated "passage" field — NOT in the prompt. The prompt is JUST the question stem ("Which choice most logically completes the text?", "As used in the text, what does the word 'wanting' most nearly mean?", "Which choice best states the main purpose of the text?"). NEVER put the passage inside the prompt. NEVER write a question without a passage. Literary items may include a one-line context preamble (e.g. "The following text is from the 1913 story 'X' by Y. The narrator, a young Z, …") that sets up the excerpt — count toward the 130 max.
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
      const easyMedCount = Math.min(200, targetEasyMed + buffer)
      // Per-chunk cap by section type:
      //   passage-heavy (SAT R&W, TOEFL/IELTS Reading): 12 — items
      //     run ~900-1100 tok with passage + 4 choices + rationales
      //   graphics-heavy (SAT Math with rawSvg geometry up to ~1100
      //     tok per figure): 10 — chunks of ~12k output stay safely
      //     under the 16k cap. Was 60 → JSON truncated mid-response
      //     → AI_JSONParseError → status=failed.
      //   short-item: 60 — bare arithmetic / grammar items
      const heavyPassage = hasPassages(family, sectionLabel)
      const heavyGraphics = family === 'sat' && sectionLabel != null && /math/i.test(sectionLabel)
      const perChunkCap = heavyPassage ? 12 : heavyGraphics ? 10 : 60
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
      const hardPrompt = buildHardOnlyPrompt({
        topicName,
        count: hardCount,
        minutes,
        formatBlock: testPrepBlock,
        extraGuidance: extraGuidanceFor(family, sectionLabel, hardCount, lang),
        hardFraming,
        hardExamples,
        lang,
      })
      const hardPromise = generateObject({
        model: hardModel,
        schema: TestSchema,
        prompt: hardPrompt,
        temperature: 0.3, // slightly higher — hard items need creative setups
      })
      // Fire all chunks + hard call concurrently. Wall-clock = max of
      // any single call ≈ 20-30s, not sum.
      const allResults = await Promise.all([...easyMedPromises, hardPromise])
      phase('drafting_hard', 'study.test.progress.draftingHard', 40)
      for (const r of allResults) {
        allQuestions.push(...(r.object.questions as RawQuestion[]))
        totalIn += r.usage?.inputTokens ?? 0
        totalOut += r.usage?.outputTokens ?? 0
      }
      console.log('[test/generate] chunked easyMed', {
        easyMedCount, chunkSizes, hardCount,
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

    // ── Top-up retry on shortfall ───────────────────────────────────
    // If the pipeline still landed short (e.g. user asked for 44 SAT
    // Math items and we have 43), fire ONE small retry to fill the
    // gap. Bounded to 1 retry + a max of 6 items so a runaway model
    // can't loop forever. Uses gpt-4o for quality on small batches.
    if (sectionSpec && combined.length < count && combined.length >= count - 6) {
      const missing = count - combined.length
      try {
        const topupResult = await generateObject({
          model: openai('gpt-4o'),
          schema: TestSchema,
          temperature: 0.5,
          prompt: buildHardOnlyPrompt({
            topicName,
            count: missing,
            minutes,
            testPrepBlock,
            family,
            sectionLabel,
            lang,
            extraGuidance: extraGuidanceFor(family, sectionLabel, missing, lang)
              + `\n\nThis is a TOP-UP request. Produce exactly ${missing} item(s) to round out a near-complete test. All items should be discriminating-difficulty.`,
          }),
        })
        const topupRaw = (topupResult.object.questions ?? []) as RawQuestion[]
        const topupClean = topupRaw
          .map(sanitizeQuestion)
          .filter(q => q.prompt && (q.choices.length === expectedChoiceCount || q.type === 'numeric_entry'))
          .slice(0, missing)
        combined.push(...topupClean)
      } catch (err) {
        // Non-blocking — ship the short test rather than fail.
        console.warn('[test/generate] top-up retry failed', err)
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

    // ── Short-passage expansion pass (Option 2 guarantee) ───────────
    // The prompt asks for 100-180 word passages but gpt-4o-mini
    // sometimes ships 50-70 word passages anyway. Collect every
    // SAT R&W passage under 80 words, batch-expand them via one
    // gpt-4o-mini call, and replace in place. Preserves the
    // question's validity by carrying the prompt + correct answer
    // into the expansion call as context. ~$0.002 per test;
    // guaranteed deterministic minimum length.
    if (family === 'sat' && sectionLabel && /reading|writing/i.test(sectionLabel)) {
      const shortIdxs = questions
        .map((q, i) => ({ q, i }))
        .filter(({ q }) => {
          if (!q.passage) return false
          const words = q.passage.trim().split(/\s+/).length
          return words < 80
        })
      if (shortIdxs.length > 0) {
        phase('expanding', 'study.test.progress.assembling', 90)
        try {
          const ExpansionSchema = z.object({
            expansions: z.array(z.object({
              index: z.number().int(),
              expanded_passage: z.string(),
            })),
          })
          const items = shortIdxs.map(({ q, i }) => ({
            index: i,
            current_passage: q.passage,
            question_prompt: q.prompt,
            correct_answer: q.correct_answer,
          }))
          const expandPrompt = [
            'Each passage below is too short for a Digital SAT Reading & Writing item (under 80 words). Expand each to 120-180 words while preserving:',
            '1. The original idea + any factual claims the question tests',
            '2. The answer\'s validity — after expansion, the correct_answer must still be the right answer to question_prompt',
            '3. Genre + tone of the original',
            '',
            'Add context, supporting evidence, or a second paragraph that develops the claim — but do NOT introduce facts that would invalidate the existing question. Encode paragraph breaks as literal "\\n\\n". Return EACH passage by its original index.',
            '',
            'Items to expand:',
            JSON.stringify(items, null, 2),
          ].join('\n')
          const { object: expansion } = await generateObject({
            model: openai('gpt-4o-mini'),
            schema: ExpansionSchema,
            prompt: expandPrompt,
            temperature: 0.4,
          })
          const byIdx = new Map(expansion.expansions.map(e => [e.index, e.expanded_passage]))
          questions = questions.map((q, i) => {
            const expanded = byIdx.get(i)
            return expanded ? { ...q, passage: expanded } : q
          })
        } catch (err) {
          // Non-blocking — if expansion fails, ship the short
          // passages rather than aborting the whole test. Better
          // short than failed.
          console.warn('[test/generate] passage expansion pass failed', err)
        }
      }
    }

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
- PASSAGE FIELD: if the test format pairs a passage with each question (Digital SAT R&W: TARGET 100-180 words per question, default ≥120, minimum 70, maximum 200, ALWAYS include one, 70%+ as 2-3 paragraphs separated by "\\n\\n"; KSAT 영어 빈칸 추론 / 요약; TOEFL/IELTS Reading: shared 700-900 word academic passages — repeat the same passage on each linked question), put it in the dedicated "passage" field and keep "prompt" to JUST the question stem. Do NOT put the passage inside the prompt. For math, grammar gap-fills, listening transcripts already given, or anything without a passage, set passage to null.
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
- PASSAGE FIELD: same rule as the easy/medium pass — if the test pairs a passage with each question (SAT R&W: target 100-180 words, default ≥120, max 200, ALWAYS, 70%+ as 2-3 paragraphs split by "\\n\\n"; KSAT 영어 빈칸; TOEFL/IELTS Reading shared passage), put it in the "passage" field, keep "prompt" to JUST the question stem. Hard SAT R&W items benefit from dense prose with internal logic the student must trace — pack 2-3 genuine claims or a subtle pivot across paragraphs. Null when no passage applies.
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
        '지문 구조: 70-200단어, 2-3 단락 (학생들이 짧은 지문에 대해 반복적으로 불만을 표하므로 디지털 SAT R&W 범위의 더 긴 쪽을 기본값으로). 복수 단락 의무 — 이 배치의 최소 70% 이상이 "\\n\\n"으로 구분된 2-3 단락이어야 함. 70단어 미만 지문 절대 금지. 단어 분포: 문맥 어휘·전환 70-100단어(1-2단락); 주제·추론·근거 110-160단어(2단락); 문학 주제·목적 140-200단어(2-3단락). JSON에서 단락 구분은 반드시 "\\n\\n" (개행 두 개).',
        '예시 2단락 지문 (문학, 약 115단어, passage 필드 유효 형식):\n"다음 글은 샬럿 브론테의 1853년 소설 Villette에서 발췌. 화자 루시 스노우가 낯선 도시에 혼자 도착한 직후의 장면.\\n\\nThe street was narrow, dim, deserted: not a step echoed; the shutters were closed, the lamps unlit. A great loneliness fell on me as I stood still, listening; but loneliness, as I had begun to discover, was the first condition of my new life. I had told myself I must learn to bear it without flinching."\n맥락 서문과 인용 본문 사이의 \\n\\n에 주의 — JSON에서 단락 구분을 인코딩하는 방식.',
        '난이도: 대학 이상 수준 (ABOVE COLLEGE LEVEL) — 실제 디지털 SAT의 최고난도 문항보다 더 어렵게. 상위 5-10% 수험생 기준. 대학 고학년/GRE Verbal 수준의 추론, 단 문체는 SAT R&W처럼 학술 산문 유지. 어휘는 99%ile 고등학생도 멈칫할 단어 (예: ostensibly, circumscribe, tendentious, evince, supervene, perspicuous, salutary; 한국어 시험이면 "회의적", "이율배반적", "함의", "외연", "통시적" 수준). 지문은 Lexile 1300-1500 (대학 후반~대학원 초기). 요구되는 추론: 두 단계 추론 연쇄 (A→B→C), 모순처럼 보이는 두 주장을 명시되지 않은 구분으로 화해, 한정사 범위 정밀 파악 (some vs most vs all), 인과 vs 상관 구분, 결론의 모달 강도가 전제를 초과하는지 ("반드시" vs "할 수 있다"). 함정 보기는 모두 첫 읽기에 그럴듯해야 하고, 재독에서만 드러나는 차이 (주어 바뀜, 한정사 누락, 헷지 무시, 함의 다른 근접 동의어, 범위 확대). 금지: 표면 어휘 정의, 첫 문장에서 답이 나오는 주제 문항, 지문 한 문장을 직접 풀어쓴 답, 명백히 주제 외이거나 사실 오류인 함정. 모든 오답은 특정 함정 패턴을 인코딩 — distractor_rationales에 명시.',
        '지문 도입부 형식: 문학 (Literature) 장르 문항만 "다음 글은 [작가]의 [연도] [소설/시/단편] [제목]에서 발췌…"로 시작 가능. Information & Ideas, History, Science, Humanities 문항은 그런 출처 서문 금지 — 본론으로 곧장 진입 (주장, 관찰, 가설 자체로 시작). 사용자가 "다음 글은 …에서 발췌"가 모든 문항에 반복됨을 지적함; 이 도입부는 최대 25% (문학 비중)에만 등장해야 함.',
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
      'PASSAGE STRUCTURE: 70 to 200 words, 2 to 3 paragraphs (matches the substantive end of the Digital SAT R&W range — students consistently complain that shorter passages feel underweight, so default to the longer end of the spec). MULTI-PARAGRAPH QUOTA — at least 70% of items in this batch MUST be 2 or 3 paragraphs separated by a real "\\n\\n" break. Single-paragraph items are reserved for the shortest words-in-context / transition items only. Multi-paragraph items typically come from: (a) literary excerpts with a context preamble + the quoted text as separate paragraphs, (b) Information & Ideas items where the passage sets up a claim in paragraph 1 and then pivots / qualifies it in paragraph 2, (c) cross-text-connections items where Passage 1 and Passage 2 are two distinct paragraphs, (d) Craft & Structure items where a claim and its supporting evidence sit in separate paragraphs. Word distribution by item type: logical-completion / words-in-context 70-100 words (1-2 paragraphs); main-idea / inference / command-of-evidence 110-160 words (2 paragraphs); literary main-purpose 140-200 words (2-3 paragraphs). NEVER produce passages under 70 words. Encode paragraph breaks as literal "\\n\\n" inside the passage string — two newline characters, not a single newline, not a space.',
      'EXAMPLE of a 2-paragraph passage (literary, ~115 words, valid format for the passage field):\n"The following text is adapted from Charlotte Brontë\'s 1853 novel Villette. The narrator, Lucy Snowe, has just arrived alone in a foreign city.\\n\\nThe street was narrow, dim, deserted: not a step echoed; the shutters were closed, the lamps unlit. A great loneliness fell on me as I stood still, listening; but loneliness, as I had begun to discover, was the first condition of my new life. I had told myself I must learn to bear it without flinching."\nNote the literal \\n\\n between the preamble and the excerpt — that\'s how to encode the paragraph break in the JSON.',
      'DIFFICULTY: ABOVE COLLEGE LEVEL — calibrate every item HARDER than the hardest items on a real Digital SAT. Target the top 5-10% of test-takers (students aiming 1500+ SAT, or adults already studying for GRE/LSAT). Reasoning required: chain TWO inferences (A→B→C), reconcile two apparently-contradictory claims by introducing an unstated distinction, identify the EXACT scope of a quantifier ("some" vs "most" vs "all"), distinguish causal claims from correlational ones, or detect when the conclusion uses a stronger modal ("must") than the premises support ("might"). Distractors should all sound right on first read; the discriminating cut is something a careful re-read reveals (a swapped subject, a missing qualifier, a hedge ignored, a near-synonym with the wrong connotation, scope creep from "the speaker" to "the field"). FORBID: bare main-idea questions answerable from the first sentence, questions whose answer is a direct paraphrase of any single passage sentence, distractors that are clearly off-topic or contain a literally false statement. Every wrong choice must encode a SPECIFIC trap pattern — name it in distractor_rationales.',
      'VOCABULARY REGISTER — UPPER GRE / LSAT TIER. Passages and "words in context" targets should reach this band: adumbrate, anodyne, apocryphal, apodictic, captious, chimerical, contumacious, desultory, dilatory, ebullient, equivocate, etiolated, fulsome, gainsay, gnomic, hortatory, inchoate, ineluctable, inveterate, jejune, lugubrious, mendacious, mendicant, obstreperous, paean, pellucid, perfidious, pertinacious, pusillanimous, querulous, recondite, refractory, redoubtable, sedulous, supererogatory, sui generis, truculent, unctuous, vituperative, abnegate, evince, supervene, perspicuous, tendentious. Use these as ANCHORS, not a closed list — choose words from the same band or harder. FORBID as words-in-context targets (too easy): "elaborate", "characterize", "establish", "emphasize", "demonstrate", "illustrate", "challenge", "criticize", "implicit", "explicit", "subtle", "significant", "ambiguous", "controversial", "consistent", "compelling", "nuanced". Those belong in the lower 50% of items the user has explicitly rejected. For 70%+ of items the correct interpretation should hinge on a word the average college freshman would need a dictionary to define confidently. Passages may also use harder register words in supporting sentences (not just as the question target) to keep the prose at Lexile 1300-1500.',
      'PASSAGE PREAMBLE FORMAT: only literary items (Literature genre) may begin with "The following text is adapted from [author]\'s [year] [novel/poem/story] [title]…". Information & Ideas, History, Science, and Humanities items must NOT use that boilerplate — instead, open IN MEDIAS RES with the substantive content. The user has flagged that "The following text is adapted from…" is appearing on every item; it must appear on AT MOST 25% of items (literary slice only). Non-literary passages should read like a published essay, journal abstract, or primary-source excerpt — begin with the claim, observation, or hypothesis itself, not with sourcing prose.',
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
        '난이도: 상위 Module 2 / 상위 10% — 실제 디지털 SAT의 최고난도 문항 (상위 모듈 응시자 중 25-35%만 정답) 수준으로 보정. 빈출 추론 패턴: (a) "묻는 양 바꾸기" — x를 구하지만 질문은 2x+5를 묻고, 오답 보기는 지문의 숫자로 구성; (b) 비선형 연립 (원+직선, 포물선+직선)의 접선 조건 (판별식=0); (c) 함수 합성·변환 연쇄 (g(x) = f(2x−3)+4 같은 형태를 특정 입력에서 평가); (d) 산점도/이원 분할표의 조건부 확률 — 계산은 단순하지만 셀 추출이 변별; (e) 나머지 정리·다항식 항등식 트릭; (f) a, b를 따로 구하지 않고 식 (a+b, ab, a²+b²) 자체를 구해야 하는 연립. 금지: 단순 산술, 1단계 대입, 암산 추정으로 풀리는 문항, 첫 식으로 답이 바로 나오는 문항. 천장은 Algebra 2 + 기초 통계 + 직각삼각형·단위원 삼각비. 미적분, 로그 항등식 (곱·몫 이상), 행렬, 복소수, 형식 증명, 코사인·사인 법칙 사용 금지.',
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
      'DIFFICULTY: UPPER MODULE 2 / TOP-DECILE — every item should match the hardest items on a real Digital SAT, the ones only 25-35% of the top-module population solve. Reasoning archetypes to use heavily: (a) "asked-for-quantity flip" — solve for x but the question asks for 2x+5 (wrong choices built from the stem\'s own numbers); (b) non-linear systems at tangency (circle+line, parabola+line) requiring discriminant=0; (c) function composition / transformation chains like g(x) = f(2x−3)+4 evaluated at a specific input; (d) dense scatterplot or two-way-table CONDITIONAL probability where the math is trivial but extracting the right cell is the discriminator; (e) remainder theorem and polynomial identity tricks; (f) systems where you must solve for an EXPRESSION (a+b, ab, a²+b²) without isolating a or b individually. FORBID: bare arithmetic, one-step plug-and-chug, items solvable by quick mental estimation, items where the answer falls out of the first equation written. Ceiling stays at Algebra 2 + intro stats + right-triangle & unit-circle trig — do NOT use calculus, log identities beyond product/quotient, matrices, complex numbers, formal proofs, or law of sines/cosines.',
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
      '- "rawSvg": svg: "<svg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'>...</svg>" — **REQUIRED for ALL geometry/trig figures** (triangles, circles, polygons, 3D solids, inscribed figures, angle diagrams). Do NOT emit triangle/circle/polygon/solid as a `type` — the renderer does not handle them; the figure will be invisible. Keep SVG under 900 chars. Style: stroke="black" stroke-width="1.5" fill="none". Label vertices/angles/lengths with <text x=".." y=".." font-size="11" fill="black"> elements. Use a viewBox of 0 0 200 200. Add a `caption: "Figure not drawn to scale."` when relevant — the SAT convention.',
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

  // ── TOEFL Reading ────────────────────────────────────────────
  if (family === 'toefl' && section && /reading/i.test(section)) {
    // 2 passages × 10 questions each. Each passage: ~3-4 factual,
    // 0-2 negative factual, 2-4 inference, 1-2 rhetorical purpose,
    // 2-4 vocab, 0-1 reference, 0-1 sentence simplification,
    // exactly 1 insert text, exactly 1 prose summary (always last).
    return [
      `TOEFL Reading 구조 — 2개 지문 × 10문항 = ${count}문항 (총 35분):`,
      '',
      '지문당 10문항 분포 (Q1-Q9는 지문 단락 순서를 따름, Q10은 항상 prose summary):',
      `- Factual Information: 3-4 ("According to paragraph X, ...")`,
      `- Negative Factual Information: 0-2 ("According to paragraph X, all of the following are true EXCEPT")`,
      `- Inference: 2-4 ("Paragraph X suggests which of the following about...")`,
      `- Rhetorical Purpose: 1-2 ("Why does the author mention X?")`,
      `- Vocabulary in Context: 2-4 ('The word "X" in the passage is closest in meaning to')`,
      `- Reference: 0-1 ('The word "X" in the passage refers to')`,
      `- Sentence Simplification: 0-1 (highlighted sentence, pick the choice that captures essential info)`,
      `- Insert Text: exactly 1 per passage (mark insertion point with [■] in passage)`,
      `- Prose Summary: exactly 1 per passage, ALWAYS Q10 (2 pts — pick 3 of 6 choices that express major themes; minor details are distractors)`,
      '',
      'SHARED-PASSAGE GROUPING (CRITICAL): each passage is ~700 words and SHARED across all 10 of its questions. On every one of the 10 questions, copy the SAME full passage text into the "passage" field AND set passageGroupId to a stable id ("passage-1" for the first passage\'s 10 questions, "passage-2" for the second). The UI uses passageGroupId to render the passage ONCE at the top of the group.',
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
