import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { awardXp } from '@/lib/study/xp'
import { resolvePlan, planFeatures } from '@/lib/study/plans'

/**
 * POST /api/study/snap/solve — accepts a photo of a problem (homework,
 * textbook, worksheet), stores it in the student's private bucket,
 * then asks gpt-4o vision to:
 *   1. Read the question off the page (OCR-like extraction)
 *   2. Guess the subject (math, physics, English, ...) so we can topic-tag
 *   3. Solve it step-by-step in the session language
 *   4. Produce a final answer
 *
 * The structured output makes the result trivially renderable + lets us
 * persist per-step rather than as a wall of text.
 *
 * QANDA's flagship feature in the Korean market. v1 is upload + vision;
 * v2 will add "similar problems" generated from the OCR text.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 90

const StepSchema = z.object({
  label: z.string().describe('Short step title — 1 short clause.'),
  detail: z.string().describe('1-3 sentence explanation of this step, including any algebra or reasoning.'),
})

const SolveSchema = z.object({
  isQuestionDetected: z.boolean().describe('True if a clear question was visible in the image.'),
  ocrText: z.string().describe('Verbatim transcription of the question as written. Preserve math notation as plain text (use ^ for powers, / for fractions).'),
  subjectGuess: z.enum(['math', 'physics', 'chemistry', 'biology', 'english', 'korean', 'social_studies', 'history', 'other']),
  solutionSteps: z.array(StepSchema).min(1).max(8),
  finalAnswer: z.string().describe('The final answer, isolated. Plain text.'),
  confidence: z.enum(['low', 'medium', 'high']).describe('How confident the model is in its solution.'),
})

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const blocked = enforceRateLimit(
    `snap-solve:user:${user.id}`,
    { windowMs: 10 * 60 * 1000, max: 20 },
  )
  if (blocked) return blocked

  // Tier gate: unlimited snaps are a Premium perk; General (and
  // trial) users get a daily allowance. Counted against calendar-day
  // UTC — simple and predictable.
  const { data: subRow } = await supabaseAdmin
    .from('study_subscriptions')
    .select('status, plan')
    .eq('student_id', user.id)
    .maybeSingle()
  const tier = subRow?.status === 'active' ? resolvePlan(subRow.plan).tier : 'general'
  const features = planFeatures(tier)
  if (Number.isFinite(features.snapDailyLimit)) {
    const dayStart = new Date()
    dayStart.setUTCHours(0, 0, 0, 0)
    const { count: todayCount } = await supabaseAdmin
      .from('study_snap_captures')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .gte('created_at', dayStart.toISOString())
    if ((todayCount ?? 0) >= features.snapDailyLimit) {
      return NextResponse.json({
        error: 'daily limit reached',
        code: 'daily_limit',
        limit: features.snapDailyLimit,
        used: todayCount ?? 0,
      }, { status: 403 })
    }
  }

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'expected multipart/form-data' }, { status: 400 })

  const image = form.get('image')
  const language = (form.get('language') as string | null) ?? 'en'
  if (!(image instanceof Blob)) return NextResponse.json({ error: 'missing image' }, { status: 400 })
  if (image.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'image too large (max 10MB)' }, { status: 400 })

  // Upload to private bucket first so we have a reference even if AI fails.
  const ext = image.type.includes('png') ? 'png'
    : image.type.includes('webp') ? 'webp'
    : image.type.includes('heic') ? 'heic'
    : 'jpg'
  const imagePath = `${user.id}/${Date.now()}.${ext}`
  const uploadRes = await supabaseAdmin.storage
    .from('study-snap-images')
    .upload(imagePath, image, { contentType: image.type || 'image/jpeg', upsert: false })
  if (uploadRes.error) {
    console.error('[snap/solve] upload', uploadRes.error)
    return NextResponse.json({ error: 'upload failed' }, { status: 502 })
  }

  // Send the image as base64 so we don't need a public URL — the bucket
  // is private and signed URLs would add a round-trip.
  const buf = Buffer.from(await image.arrayBuffer())
  const dataUrl = `data:${image.type || 'image/jpeg'};base64,${buf.toString('base64')}`

  const prompt = language === 'ko'
    ? `이 이미지는 학생이 풀어야 하는 문제입니다. 한국어로 답변하세요.\n\n1. 문제를 정확하게 텍스트로 옮기세요 (ocrText).\n2. 과목을 추정하세요 (subjectGuess).\n3. 단계별로 풀이를 작성하세요 (solutionSteps, 최대 8단계).\n4. 최종 답을 적으세요 (finalAnswer).\n5. 풀이의 확신도를 평가하세요 (confidence).\n\n문제가 명확하게 보이지 않으면 isQuestionDetected를 false로 설정하고 다른 필드는 가능한 부분만 채우세요.`
    : `This image contains a problem the student needs to solve. Reply in English.\n\n1. Transcribe the question verbatim (ocrText).\n2. Guess the subject (subjectGuess).\n3. Walk through the solution step-by-step (solutionSteps, up to 8 steps).\n4. Give the final answer (finalAnswer).\n5. Rate your confidence (confidence).\n\nIf the question is not clearly readable, set isQuestionDetected to false and only fill the fields you can.`

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  let result
  try {
    result = await generateObject({
      model: openai('gpt-4o'),
      schema: SolveSchema,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image', image: dataUrl },
          ],
        },
      ],
      temperature: 0.2,
    })
  } catch (err) {
    console.error('[snap/solve] generation', err)
    return NextResponse.json({ error: 'solve failed', imagePath }, { status: 502 })
  }
  const out = result.object

  // Persist capture.
  const { data: capture, error: insertErr } = await supabaseAdmin
    .from('study_snap_captures')
    .insert({
      student_id: user.id,
      image_path: imagePath,
      ocr_text: out.ocrText,
      subject_guess: out.subjectGuess,
      solution_steps: out.solutionSteps,
      final_answer: out.finalAnswer,
      language,
      model: 'gpt-4o',
      tokens_in: result.usage?.inputTokens ?? 0,
      tokens_out: result.usage?.outputTokens ?? 0,
    })
    .select('id')
    .single()
  if (insertErr) {
    console.error('[snap/solve] insert', insertErr)
  }

  // League XP (Phase 6e).
  if (out.isQuestionDetected) void awardXp(user.id, 'snap_solve', capture?.id ?? null)

  return NextResponse.json({
    captureId: capture?.id ?? null,
    imagePath,
    result: out,
  })
}
