import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { awardXp } from '@/lib/study/xp'
import { assessSessionMastery as _keepAlive } from '@/lib/study-mastery-assess'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import {
  getRubric,
  GradeSchema,
  inferSpeakingTaskType,
  type ResponseTestFamily,
  type ResponseSkill,
  type ResponseTaskType,
} from '@/lib/study/responseRubrics'
import { runStagedGrade, type QualityStageCall, type TextStageCall } from '@/lib/study/gradePipeline'
import { resolvePlan } from '@/lib/study/plans'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/speaking/grade-audio — real audio-native rubric
 * grading for TOEFL Speaking Take-an-Interview responses.
 *
 * Pipeline:
 *   1. Auth + session ownership check (session.speaking_grade_mode
 *      must be 'audio' — otherwise the client should call the plain
 *      /response/grade route)
 *   2. Download the student's recording from storage
 *   3. Transcode webm/mp4 → mp3 via @ffmpeg/ffmpeg (gpt-4o-audio-preview
 *      only accepts wav + mp3 as of this build)
 *   4. Run the staged ETS grader (see src/lib/study/gradePipeline.ts):
 *      stage 1 zero gate + stage 2 relevance ladder run on the Whisper
 *      transcript with a cheap text model; the language/delivery stage
 *      is the audio-native call so pronunciation and pausing are heard
 *      rather than inferred. Final band = min(language, ceiling).
 *   5. Persist the grade
 *
 * Costs roughly $0.06-0.08 per response — 3-4x the text-only route.
 * Latency ~4-6s vs ~2s for text-only (mostly the transcode step).
 * Fall back to a JSON error if the model refuses or transcoding fails
 * so the caller can retry via the text route.
 */

// Prevent this route from being evaluated at build time — ffmpeg-wasm
// pulls in Node-only APIs that break Vercel's Edge / static analysis.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

// Keep imports used — the mastery assess is a fire-and-forget after
// this route persists a grade. Referenced to silence "unused import".
void _keepAlive

const BUCKET = 'study-response-audio'

const BodySchema = z.object({
  sessionId: z.string().uuid(),
  taskType: z.enum(['email', 'academic_discussion', 'take_interview', 'listen_repeat']).nullable().optional(),
  promptText: z.string().min(10).max(2000),
  /** Optional Whisper transcript passed through from the client. Used
   *  as a fallback + shown alongside the grade so the student can see
   *  what the model "heard". If empty, the audio-native model will
   *  transcribe internally. */
  responseText: z.string().max(8000).nullable().optional(),
  audioPath: z.string().min(1),
  durationSeconds: z.number().nullable().optional(),
  wpm: z.number().nullable().optional(),
  pauseCount: z.number().int().nullable().optional(),
  clarity: z.number().min(0).max(1).nullable().optional(),
})

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  // Tight limit — audio-native calls are expensive.
  const blocked = enforceRateLimit(`speaking-grade-audio:user:${user.id}`, {
    windowMs: 10 * 60 * 1000, max: 8,
  })
  if (blocked) return blocked

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad body', issues: parsed.error.issues }, { status: 400 })
  }
  const body = parsed.data

  // Session ownership + mode gate.
  const { data: session } = await supabaseAdmin
    .from('study_sessions')
    .select('id, student_id, mode, language, speaking_grade_mode')
    .eq('id', body.sessionId)
    .maybeSingle()
  if (!session || session.student_id !== user.id) {
    return NextResponse.json({ error: 'session not found' }, { status: 404 })
  }
  if (session.speaking_grade_mode !== 'audio') {
    return NextResponse.json({
      error: 'session not configured for audio grading',
      hint: 'Restart the test with "Real audio" grading selected in the customization sheet.',
    }, { status: 400 })
  }

  // Audio-native grading is a Premium capability (it costs 3-4× the
  // text route per response). Trial rows get General entitlements.
  const { data: subRow } = await supabaseAdmin
    .from('study_subscriptions')
    .select('status, plan')
    .eq('student_id', user.id)
    .maybeSingle()
  const isPremium = subRow?.status === 'active' && resolvePlan(subRow.plan).tier === 'premium'
  if (!isPremium) {
    return NextResponse.json({
      error: 'premium required',
      code: 'premium_required',
      hint: 'Audio-based Speaking grading is a Premium feature — text-based grading is available on your plan.',
    }, { status: 403 })
  }

  const language = (session.language === 'ko' ? 'ko' : 'en') as 'ko' | 'en'

  // ── Step 0: cheap text pre-screen (saves an audio call on trash) ──
  // Detect empty / off-topic / too-short responses before spending on
  // the audio grade. Typically catches abandoned submissions or
  // students who tapped submit by mistake.
  if (!body.responseText || body.responseText.trim().length < 20) {
    return NextResponse.json({
      error: 'response too short',
      hint: 'Speak for at least a few sentences to get audio feedback.',
    }, { status: 400 })
  }

  // Speaking task type: the session UI sends null for speaking items,
  // so recover Take-an-Interview vs Listen-and-Repeat from the
  // generator's prompt tag.
  const taskType = (body.taskType ?? inferSpeakingTaskType(body.promptText)) as ResponseTaskType
  const rubric = getRubric('toefl' as ResponseTestFamily, 'speaking' as ResponseSkill, taskType)

  // ── Step 0.5: re-grade dedupe ─────────────────────────────────────
  // Same session + prompt + recording already AUDIO-graded → return
  // the stored grade instead of paying for another gpt-4o-audio call.
  // Filters on grader_model containing "audio" so a text-mode grade
  // for the same prompt (e.g. the 5xx fallback path) never masks a
  // real audio grade. Mirrors the dedupe in /api/study/response/grade.
  const { data: priorSubs } = await supabaseAdmin
    .from('study_response_submissions')
    .select('id, audio_path, study_response_grades(overall_band, rubric_scores, annotations, model_rewrite, summary, grader_model)')
    .eq('session_id', body.sessionId)
    .eq('student_id', user.id)
    .eq('skill', 'speaking')
    .eq('prompt_text', body.promptText)
    .order('created_at', { ascending: false })
    .limit(5)
  for (const sub of priorSubs ?? []) {
    if (sub.audio_path !== body.audioPath) continue
    const g = Array.isArray(sub.study_response_grades) ? sub.study_response_grades[0] : sub.study_response_grades
    if (!g || typeof g.grader_model !== 'string' || !g.grader_model.includes('audio')) continue
    return NextResponse.json({
      submissionId: sub.id,
      grade: {
        overallBand: Number(g.overall_band),
        criteria: g.rubric_scores,
        annotations: g.annotations,
        modelRewrite: g.model_rewrite,
        summary: g.summary,
      },
      scaleMax: rubric.scaleMax,
      graderModel: g.grader_model,
      cached: true,
    })
  }

  // ── Step 1: download the audio ────────────────────────────────────
  const { data: audioBlob, error: dlErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(body.audioPath)
  if (dlErr || !audioBlob) {
    console.error('[speaking/grade-audio] download', dlErr)
    return NextResponse.json({ error: 'audio not found' }, { status: 404 })
  }

  // ── Step 2: transcode → mp3 with silence trim + length cap ───────
  // Silence removal: -50 dB threshold, min 0.5 s gap. Kills the
  // opening/closing quiet + long mid-response pauses that add audio
  // tokens without pedagogical value. Expect ~15-25 % reduction.
  // Length cap: 60 s hard limit — ETS gives 45 s so 60 gives buffer
  // for slight overruns; anything past that is padding we shouldn't
  // pay to grade.
  const inputBuf = new Uint8Array(await audioBlob.arrayBuffer())
  const ext = (body.audioPath.split('.').pop() ?? 'webm').toLowerCase()
  let mp3Bytes: Uint8Array
  try {
    mp3Bytes = await transcodeToMp3(inputBuf, ext)
  } catch (e) {
    console.error('[speaking/grade-audio] transcode failed', e)
    return NextResponse.json({
      error: 'audio transcode failed',
      hint: 'Fall back to text-based grading — try the "Get AI feedback" button on the text-mode session.',
    }, { status: 502 })
  }

  // ── Step 3/4: staged grading ─────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'server misconfigured' }, { status: 500 })

  const audioB64 = Buffer.from(mp3Bytes).toString('base64')
  // Model ID is env-overridable so we can hot-swap without a deploy
  // when OpenAI changes their preview IDs. Falls back to the full-
  // size audio model if the mini one 404s (model ID moved or wasn't
  // released under this name), so a stale constant never dead-ends
  // a grading call.
  const PRIMARY_MODEL = process.env.OPENAI_AUDIO_GRADE_MODEL ?? 'gpt-4o-mini-audio-preview'
  const FALLBACK_MODEL = 'gpt-4o-audio-preview'

  let usedModel = PRIMARY_MODEL

  const callOpenAi = async (model: string, prompt: string) => fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      modalities: ['text'],
      response_format: { type: 'json_object' },
      // Deterministic — the ETS bands are a classification, not a
      // creative task, and sampling noise is pure score drift.
      temperature: 0,
      messages: [{
        role: 'user',
        content: [
          // Static instructions FIRST so OpenAI's prompt cache can
          // reuse them across requests (50 % off on cached prefix
          // tokens). Dynamic task-specific content goes LAST so it
          // never breaks the cache prefix.
          { type: 'text', text: `${prompt}\n\n${JSON_SHAPE_INSTRUCTION}` },
          { type: 'input_audio', input_audio: { data: audioB64, format: 'mp3' } },
        ],
      }],
    }),
  })

  // Stage 4 (language + delivery) — the audio-native call. The zero
  // gate and the relevance ladder run on the transcript with a cheap
  // text model; neither needs to hear the audio, and keeping them off
  // the audio model is what makes the extra stages affordable.
  const qualityStage: QualityStageCall = async ({ prompt }) => {
    let res = await callOpenAi(usedModel, prompt)
    if (!res.ok && res.status === 404 && usedModel !== FALLBACK_MODEL) {
      // Primary model doesn't exist under this ID — retry with the
      // full-size model so the student still gets a grade.
      console.warn('[speaking/grade-audio] primary model 404, falling back', usedModel)
      usedModel = FALLBACK_MODEL
      res = await callOpenAi(usedModel, prompt)
    }
    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      console.error('[speaking/grade-audio] openai', res.status, errBody.slice(0, 400))
      throw new AudioGradeError('audio grading failed', res.status)
    }
    const completion = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }
    const raw = completion.choices?.[0]?.message?.content ?? ''
    const usage = {
      tokensIn: completion.usage?.prompt_tokens ?? 0,
      tokensOut: completion.usage?.completion_tokens ?? 0,
    }
    // The model occasionally returns prose or a near-miss shape. Retry
    // the call once before giving up.
    try {
      return { object: GradeSchema.parse(JSON.parse(raw)), usage }
    } catch (e) {
      console.warn('[speaking/grade-audio] parse failed, retrying', e)
      const retry = await callOpenAi(usedModel, prompt)
      if (!retry.ok) throw new AudioGradeError('audio grading failed', retry.status)
      const retryJson = await retry.json() as {
        choices?: Array<{ message?: { content?: string } }>
        usage?: { prompt_tokens?: number; completion_tokens?: number }
      }
      return {
        object: GradeSchema.parse(JSON.parse(retryJson.choices?.[0]?.message?.content ?? '')),
        usage: {
          tokensIn: usage.tokensIn + (retryJson.usage?.prompt_tokens ?? 0),
          tokensOut: usage.tokensOut + (retryJson.usage?.completion_tokens ?? 0),
        },
      }
    }
  }

  const openai = createOpenAI({ apiKey })
  const textStage: TextStageCall = async ({ schema, schemaName, prompt }) => {
    const r = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: schema as z.ZodType<unknown>,
      schemaName,
      prompt,
      temperature: 0,
    })
    return {
      object: r.object as never,
      usage: { tokensIn: r.usage?.inputTokens ?? 0, tokensOut: r.usage?.outputTokens ?? 0 },
    }
  }

  let staged
  try {
    staged = await runStagedGrade({
      family: 'toefl',
      skill: 'speaking',
      taskType,
      promptText: body.promptText,
      responseText: body.responseText ?? '',
      durationSeconds: body.durationSeconds ?? null,
      language,
      audioNative: true,
      speechSignals: {
        wpm: body.wpm ?? null,
        pauseCount: body.pauseCount ?? null,
        clarity: body.clarity ?? null,
      },
    }, { text: textStage, quality: qualityStage })
  } catch (e) {
    if (e instanceof AudioGradeError) {
      return NextResponse.json({ error: e.message, status: e.status }, { status: 502 })
    }
    console.error('[speaking/grade-audio] staged grading failed', e)
    return NextResponse.json({ error: 'grade response malformed' }, { status: 502 })
  }
  const grade = staged.grade
  // Tag the stored model so the dedupe filter above still recognises
  // this as an AUDIO grade (it matches on the substring "audio").
  const AUDIO_MODEL = `${usedModel}+staged-ets`

  // The pipeline already clamped + applied the relevance ceiling; this
  // is a defensive backstop only.
  const clampedBand = Math.max(0, Math.min(rubric.scaleMax, grade.overallBand))

  // ── Step 5: persist ──────────────────────────────────────────────
  const wordCount = (body.responseText ?? '').trim().split(/\s+/).filter(Boolean).length
  const { data: submission, error: submissionErr } = await supabaseAdmin
    .from('study_response_submissions')
    .insert({
      student_id: user.id,
      session_id: body.sessionId,
      test_family: 'toefl',
      skill: 'speaking',
      prompt_text: body.promptText,
      response_text: body.responseText ?? '',
      audio_path: body.audioPath,
      duration_seconds: body.durationSeconds ?? null,
      word_count: wordCount,
      language,
    })
    .select('id')
    .single()
  if (submissionErr || !submission) {
    console.error('[speaking/grade-audio] insert submission', submissionErr)
    return NextResponse.json({ error: 'persist failed' }, { status: 500 })
  }
  const { error: gradeErr } = await supabaseAdmin
    .from('study_response_grades')
    .insert({
      submission_id: submission.id,
      student_id: user.id,
      overall_band: clampedBand,
      rubric_scores: grade.criteria,
      annotations: grade.annotations,
      model_rewrite: grade.modelRewrite,
      summary: grade.summary,
      grader_model: AUDIO_MODEL,
      tokens_in: staged.usage.tokensIn,
      tokens_out: staged.usage.tokensOut,
    })
  if (gradeErr) console.error('[speaking/grade-audio] insert grade', gradeErr)

  // XP parity with the text route: same deterministic md5(session +
  // prompt) source key, so a task graded via EITHER route pays out at
  // most once (partial unique index on study_xp_events enforces it).
  const promptHash = createHash('md5').update(`${body.sessionId}:${body.promptText}`).digest('hex')
  const xpSourceId = [
    promptHash.slice(0, 8), promptHash.slice(8, 12), promptHash.slice(12, 16),
    promptHash.slice(16, 20), promptHash.slice(20, 32),
  ].join('-')
  void awardXp(user.id, 'response_graded', xpSourceId)

  return NextResponse.json({
    submissionId: submission.id,
    grade: { ...grade, overallBand: clampedBand },
    scaleMax: rubric.scaleMax,
    graderModel: AUDIO_MODEL,
    // Diagnostics — why the band landed where it did.
    relevance: staged.relevance ? {
      level: staged.relevance.level,
      ceiling: staged.relevanceCeiling,
      applied: staged.ceilingApplied,
      languageScore: staged.languageScore,
    } : null,
    zeroReasons: staged.zeroReasons,
  })
}

// ---------------------------------------------------------------------------
// The audio route talks to OpenAI over raw fetch (the AI SDK has no
// input_audio content part), so the JSON shape has to be spelled out
// in the prompt instead of derived from the Zod schema. Key ORDER
// matters: evidence before every number, overall band last.
// ---------------------------------------------------------------------------

const JSON_SHAPE_INSTRUCTION = `Return valid JSON with the keys in exactly this order:
{
  "summary": "<2-3 sentences>",
  "criteria": [{ "key": "<criterion key>", "evidence": "<quote the exact span, then 1 sentence of reasoning>", "score": <number> }, ...],
  "annotations": [{ "quote": "<verbatim, ≤140 chars>", "category": "grammar|vocabulary|coherence|task|pronunciation|delivery", "severity": "nit|minor|major", "issue": "<1 sentence>", "suggestion": "<1 sentence>" }, ...],
  "modelRewrite": "<short rewrite>",
  "overallBand": <number>
}
Write each "evidence" string BEFORE deciding its "score", and decide "overallBand" last.`

/** Signals an upstream OpenAI failure so the staged pipeline's error
 *  surfaces as a 502 the client can fall back from (WritingPanels
 *  retries with the text route on 5xx). */
class AudioGradeError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function transcodeToMp3(input: Uint8Array, sourceExt: string): Promise<Uint8Array> {
  // Import lazily so the WASM module isn't loaded at build-time.
  const { FFmpeg } = await import('@ffmpeg/ffmpeg')
  const ffmpeg = new FFmpeg()
  // Point to a stable CDN — ffmpeg-wasm ships the WASM binaries via
  // its own CDN by default which is fine for our use case.
  const CORE = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  await ffmpeg.load({
    coreURL: `${CORE}/ffmpeg-core.js`,
    wasmURL: `${CORE}/ffmpeg-core.wasm`,
  })
  const inputName = `in.${sourceExt}`
  await ffmpeg.writeFile(inputName, input)
  // Cost-reduction pipeline:
  //   -t 60             hard-cap the input at 60 s so a runaway
  //                     recording doesn't rack up audio tokens
  //   silenceremove     strip lead-in, tail, and mid-response gaps
  //                     longer than 0.5 s at < -50 dB. Speech quality
  //                     is unchanged; audio-token count typically
  //                     drops 15-25 %.
  //   16 kHz mono 96k   good speech quality, small file, matches what
  //                     OpenAI's audio models prefer.
  const silenceFilter =
    'silenceremove=' +
    'start_periods=1:start_duration=0.5:start_threshold=-50dB:' +
    'stop_periods=-1:stop_duration=0.5:stop_threshold=-50dB'
  await ffmpeg.exec([
    '-i', inputName,
    '-t', '60',
    '-af', silenceFilter,
    '-c:a', 'libmp3lame',
    '-b:a', '96k',
    '-ar', '16000',
    '-ac', '1',
    'out.mp3',
  ])
  const out = await ffmpeg.readFile('out.mp3')
  return out as Uint8Array
}
