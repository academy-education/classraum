import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import {
  TOEFL_ADAPTIVE_SECTIONS,
  computeToeflRoute,
} from '@/lib/toefl-adaptive'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/test/route — decide module 2 difficulty for an
 * adaptive TOEFL Reading / Listening session.
 *
 * Called by TestSession after the student submits module 1. Reads
 * module 1 answers, grades them against the cached test payload,
 * writes module1_correct / module1_total / module2_route back to
 * study_sessions, and returns the route so the client can request a
 * module 2 generation with the correct difficulty band.
 *
 * Grading duplicates the multiple-choice matcher from /submit
 * intentionally — we don't want /submit's full-session side effects
 * (mastery reassessment, completion timestamp) firing at the halfway
 * point.
 */

export const dynamic = 'force-dynamic'

/** Must match the generator's cache-row prefix (generate/route.ts). */
const CACHED_TEST_MARKER = '[full-test-v1]'

const AnswerSchema = z.object({
  index: z.number().int().min(0),
  answer: z.string().nullable().optional(),
})

const BodySchema = z.object({
  sessionId: z.string().uuid(),
  sectionName: z.string(),
  answers: z.array(AnswerSchema).min(1),
})

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(
    `test-route:user:${user.id}`,
    { windowMs: 60 * 1000, max: 20 },
  )
  if (blocked) return blocked

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request', details: parsed.error.flatten() }, { status: 400 })
  }
  const { sessionId, sectionName, answers } = parsed.data

  const config = TOEFL_ADAPTIVE_SECTIONS[sectionName]
  if (!config) {
    return NextResponse.json({ error: 'not_adaptive', route: null }, { status: 200 })
  }

  const { data: session, error: sessErr } = await supabaseAdmin
    .from('study_sessions')
    .select('id, student_id, module2_route, module1_correct, module1_total')
    .eq('id', sessionId)
    .maybeSingle()
  if (sessErr || !session) {
    return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
  }
  if (session.student_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Idempotent: if we've already routed this session, return the same
  // decision instead of re-grading. A duplicate route decision would
  // race the generator request the client kicks off on the response.
  if (session.module2_route) {
    return NextResponse.json({
      route: session.module2_route,
      module1Correct: session.module1_correct ?? null,
      module1Total: session.module1_total ?? config.module1Total,
      alreadyRouted: true,
    })
  }

  // The authoritative payload lives in the marker-prefixed assistant
  // message (same row /submit grades against) — study_sessions has no
  // cached_test column.
  const { data: cacheRows } = await supabaseAdmin
    .from('study_messages')
    .select('content')
    .eq('session_id', sessionId)
    .eq('role', 'assistant')
    .ilike('content', `${CACHED_TEST_MARKER}%`)
    .limit(1)
  let cached: { questions?: Array<{ correct_answer?: string | null }>; moduleBreakIdx?: number | null } | null = null
  if (cacheRows?.[0]) {
    try { cached = JSON.parse(cacheRows[0].content.slice(CACHED_TEST_MARKER.length)) } catch { /* corrupt cache */ }
  }
  const questions = Array.isArray(cached?.questions) ? cached!.questions : []
  // Prefer the payload's own break point — the generator may shift it
  // off the nominal 10/14 split (e.g. Reading anchors it after the
  // first Complete-the-Words block).
  const breakIdx = (typeof cached?.moduleBreakIdx === 'number' && cached.moduleBreakIdx > 0)
    ? cached.moduleBreakIdx
    : config.module1Total
  const module1Questions = questions.slice(0, breakIdx)
  if (module1Questions.length < Math.min(breakIdx, 3)) {
    return NextResponse.json(
      { error: 'insufficient_questions', have: module1Questions.length, need: breakIdx },
      { status: 409 },
    )
  }

  let correct = 0
  for (const a of answers) {
    if (a.index >= module1Questions.length) continue
    const q = module1Questions[a.index]
    if (!q || typeof a.answer !== 'string') continue
    const key = String(q.correct_answer ?? '').trim().toLowerCase()
    if (!key) continue
    if (a.answer.trim().toLowerCase() === key) correct++
  }

  const route = computeToeflRoute(sectionName, correct, module1Questions.length)
  if (!route) {
    return NextResponse.json({ error: 'not_adaptive', route: null }, { status: 200 })
  }

  await supabaseAdmin
    .from('study_sessions')
    .update({
      module1_correct: correct,
      module1_total: module1Questions.length,
      module2_route: route,
    })
    .eq('id', sessionId)

  return NextResponse.json({
    route,
    module1Correct: correct,
    module1Total: module1Questions.length,
    alreadyRouted: false,
  })
}
