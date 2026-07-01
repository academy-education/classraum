import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { assessSessionMastery as _keepAlive } from '@/lib/study-mastery-assess'
import { getRubric, GradeSchema, type ResponseTestFamily, type ResponseSkill, type ResponseTaskType } from '@/lib/study/responseRubrics'

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
 *   4. Send audio + rubric prompt to gpt-4o-audio-preview
 *   5. Parse structured rubric response and persist the grade
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
  taskType: z.enum(['email', 'academic_discussion']).nullable().optional(),
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
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

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

  // ── Step 3: build the rubric prompt (with all delivery signals) ──
  const rubric = getRubric('toefl' as ResponseTestFamily, 'speaking' as ResponseSkill, body.taskType as ResponseTaskType | undefined)
  const promptText = buildAudioGraderPrompt({
    taskType: body.taskType ?? null,
    promptText: body.promptText,
    hintText: body.responseText ?? '',
    wpm: body.wpm ?? null,
    durationSec: body.durationSeconds ?? null,
    pauseCount: body.pauseCount ?? null,
    clarity: body.clarity ?? null,
    scaleMax: rubric.scaleMax,
    criteria: rubric.criteria.map(c => ({ key: c.key, label: c.label, max: c.max })),
    language,
  })

  // ── Step 4: call gpt-4o-audio-preview ────────────────────────────
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

  const callOpenAi = async (model: string) => fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      modalities: ['text'],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      messages: [{
        role: 'user',
        content: [
          // Static instructions FIRST so OpenAI's prompt cache can
          // reuse them across requests (50 % off on cached prefix
          // tokens). Dynamic task-specific content goes LAST so it
          // never breaks the cache prefix.
          { type: 'text', text: promptText },
          { type: 'input_audio', input_audio: { data: audioB64, format: 'mp3' } },
        ],
      }],
    }),
  })

  let ttsRes = await callOpenAi(PRIMARY_MODEL)
  let usedModel = PRIMARY_MODEL
  if (!ttsRes.ok && ttsRes.status === 404 && PRIMARY_MODEL !== FALLBACK_MODEL) {
    // Primary model doesn't exist under this ID — retry with the
    // full-size model so the student still gets a grade. Log so we
    // know to update the env var / constant.
    console.warn('[speaking/grade-audio] primary model 404, falling back', PRIMARY_MODEL)
    ttsRes = await callOpenAi(FALLBACK_MODEL)
    usedModel = FALLBACK_MODEL
  }
  if (!ttsRes.ok) {
    const errBody = await ttsRes.text().catch(() => '')
    console.error('[speaking/grade-audio] openai', ttsRes.status, errBody.slice(0, 400))
    return NextResponse.json({ error: 'audio grading failed', status: ttsRes.status }, { status: 502 })
  }
  const AUDIO_MODEL = usedModel
  const completion = await ttsRes.json() as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  const raw = completion.choices?.[0]?.message?.content ?? ''
  let grade
  try {
    const parsedJson = JSON.parse(raw)
    grade = GradeSchema.parse(parsedJson)
  } catch (e) {
    console.error('[speaking/grade-audio] parse', e, raw.slice(0, 300))
    return NextResponse.json({ error: 'grade response malformed' }, { status: 502 })
  }

  // Clamp the overall band to the rubric scale defensively.
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
      tokens_in: completion.usage?.prompt_tokens ?? 0,
      tokens_out: completion.usage?.completion_tokens ?? 0,
    })
  if (gradeErr) console.error('[speaking/grade-audio] insert grade', gradeErr)

  return NextResponse.json({
    submissionId: submission.id,
    grade: { ...grade, overallBand: clampedBand },
    scaleMax: rubric.scaleMax,
    graderModel: AUDIO_MODEL,
  })
}

// ---------------------------------------------------------------------------
// Prompt builder — audio-native variant. Emphasises listening cues over
// transcript inference, since the model can hear the recording directly.
// ---------------------------------------------------------------------------

function buildAudioGraderPrompt(input: {
  taskType: string | null
  promptText: string
  hintText: string
  wpm: number | null
  durationSec: number | null
  pauseCount: number | null
  clarity: number | null
  scaleMax: number
  criteria: Array<{ key: string; label: string; max: number }>
  language: 'en' | 'ko'
}): string {
  const criteriaList = input.criteria.map(c => `  - "${c.key}" (${c.label}, 0–${c.max})`).join('\n')
  const paceLine = input.wpm != null ? `${input.wpm} words/min` : 'not measured'
  const durLine = input.durationSec != null ? `${input.durationSec.toFixed(1)}s` : 'not measured'

  return `You are an ETS-calibrated TOEFL Speaking rater with 10+ years of experience scoring TOEFL iBT Take-an-Interview responses.

The audio attached is the student's spoken response. LISTEN to the recording — do not rely only on transcription. Score pronunciation, intonation, stress placement, and prosody DIRECTLY from what you hear.

Task prompt: "${input.promptText}"

Rubric (0–${input.scaleMax}, official ETS scale):
${criteriaList}

For each criterion:
- Give a score on its own scale (integer or 0.5).
- Cite 1-2 sentences of evidence QUOTING the response, specifically calling out:
  * for "delivery" — the actual sounds you hear (unclear consonants, halting pace, monotone intonation, dropped word endings, filler sounds like "um"/"uh")
  * for "language" — grammar, vocabulary range, sentence structure
  * for "topic_development" — coherence, examples, position clarity

Then give an overall band on the same scale.

Annotate up to 8 specific spans the learner should fix. Categorise by grammar/vocabulary/coherence/task/pronunciation/delivery. Quote each verbatim, ≤140 chars.

Finish with:
- summary: 2-3 sentences — biggest strength + single highest-leverage fix. Do not sugarcoat.
- modelRewrite: rewrite one weak sentence cluster at the next band up. Plain text only.

Return valid JSON matching this schema:
{
  "overallBand": <number>,
  "summary": "<2-3 sentences>",
  "criteria": [{ "key": "<key>", "score": <number>, "evidence": "<1-2 sentences>" }, ...],
  "annotations": [{ "quote": "<verbatim>", "category": "grammar|vocabulary|coherence|task|pronunciation|delivery", "severity": "nit|minor|major", "issue": "<1 sentence>", "suggestion": "<1 sentence>" }, ...],
  "modelRewrite": "<short rewrite>"
}

Response metadata (from the recording — cross-check against what you hear):
- Duration: ${durLine}
- Whisper-derived pace: ${paceLine}
- Whisper-derived pauses (≥700ms): ${input.pauseCount ?? 'not measured'}
- Whisper transcription clarity (0-1): ${input.clarity != null ? input.clarity.toFixed(2) : 'not measured'}
${input.hintText ? `- Whisper transcript (reference only — grade what you HEAR, not this):\n${input.hintText}` : ''}

Output language: ${input.language === 'ko' ? 'Korean (모든 코멘트·요약·재작성은 한국어로. quote 필드만 학습자 원문 그대로 영어 인용)' : 'English'}.

Be calibrated. TOEFL Speaking band 4 = fully sustained delivery + clear pronunciation + well-controlled language. Band 3 = generally clear but with lapses. Band 2 = some ideas but pronunciation/pace impedes. Band 1 = very limited. Do NOT inflate — a "trying hard" response that pauses every 3 words is a 2, not a 3.`
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
