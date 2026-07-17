import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { assembleFromBank } from '@/lib/study/assemble'
import { SAT_MODULE_CONFIG } from '@/lib/study/sat-adaptive'
import { requireStudyUser } from '@/lib/study/auth'
import { trackEvent } from '@/lib/study/analytics'
import { creditCostForTest } from '@/lib/study/plans'
import { reserveTestCredits, refundTestCredits } from '@/lib/study/credits'

/**
 * POST /api/study/test/assemble — build a full-test session from the
 * pre-verified item bank instead of generating one live.
 *
 * Unlike /generate this is INSTANT (a DB query, not a 12-minute model
 * run). Since the 2026-07 credit relaunch, bank-assembled SAT mock
 * tests consume credits like every other full test (SAT R&W / Math =
 * 2 each; see creditCostForTest). Journey path-node sessions stay free
 * — they're the StudyPath progression loop, not standalone mocks.
 *
 * Writes the assembled payload as the same `[full-test-v1]` cache row
 * the generator emits, so the existing TestSession UI + submit grading
 * serve it unchanged.
 */

export const dynamic = 'force-dynamic'

const CACHED_TEST_MARKER = '[full-test-v1]'

// SAT section → seed topic row (so the session attaches to the right topic).
const SECTION_TOPIC: Record<string, string> = {
  math: '6cf0bc6a-a430-4fe5-b03c-db031df8a691',            // sat-math
  reading_writing: 'fc784bfb-e3bd-48ea-a794-7da1fe219ba4',  // sat-reading-writing
}

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  // Each call creates a session AND burns up to 54 exposure-ledger
  // rows before the test is even opened — keep retry loops in check.
  const blocked = enforceRateLimit(
    `test-assemble:user:${user.id}`,
    { windowMs: 60 * 1000, max: 6 },
  )
  if (blocked) return blocked

  let body: { section?: string; count?: number; pathNode?: string; adaptive?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const section = body.section === 'math' || body.section === 'reading_writing' ? body.section : null
  if (!section) return NextResponse.json({ error: 'section must be math or reading_writing' }, { status: 400 })
  // Adaptive tests draw ONLY Module 1 here (fixed module size, mixed
  // difficulty); Module 2 is drawn by /api/study/test/route after the
  // student finishes and is graded on Module 1. Non-adaptive tests
  // draw the whole thing at once as before.
  const adaptive = body.adaptive === true
  const count = adaptive
    ? SAT_MODULE_CONFIG[section].moduleSize
    : Math.min(Math.max(Number(body.count) || 22, 5), 54)
  // Journey section-test nodes tag their sessions so the path page can
  // track per-node completion (config.pathNode → node id).
  const pathNode = typeof body.pathNode === 'string' && body.pathNode.length <= 64 ? body.pathNode : null

  // No single-stop repeats on the path: once a node has a completed
  // unarchived session, it's terminal. The only way back in is the
  // whole-path repeat (POST /api/study/path/repeat), which archives
  // the old run's sessions and thereby clears this check.
  if (pathNode) {
    const { data: done } = await supabaseAdmin
      .from('study_sessions')
      .select('id')
      .eq('student_id', user.id)
      .eq('archived', false)
      .eq('status', 'completed')
      .eq('config->>pathNode', pathNode)
      .limit(1)
    if (done && done.length > 0) {
      return NextResponse.json(
        { error: 'path stop already completed', reason: 'node_completed' },
        { status: 409 },
      )
    }
  }

  // Assemble from the bank. Seed with the (not-yet-created) session id so
  // the shuffle is stable per session; fall back to a fresh session first.
  const { data: sess, error: sessErr } = await supabaseAdmin
    .from('study_sessions')
    .insert({
      student_id: user.id, topic_id: SECTION_TOPIC[section], mode: 'full_test',
      status: 'active', language: 'en', generation_status: 'ready',
      config: { source: 'bank', section, ...(adaptive ? { adaptive: true } : {}), ...(pathNode ? { pathNode } : {}) },
    })
    .select('id')
    .single()
  if (sessErr || !sess) return NextResponse.json({ error: 'session create failed' }, { status: 500 })

  // ── Credit reserve ─────────────────────────────────────────────
  // Full SAT mocks cost credits (R&W / Math = 2 each). Journey
  // path-node sessions are exempt — the StudyPath loop stays free.
  const creditCost = pathNode ? 0 : creditCostForTest('sat', section)
  if (creditCost > 0) {
    const credit = await reserveTestCredits(user.id, sess.id, creditCost)
    if (!credit.ok) {
      await supabaseAdmin.from('study_sessions').delete().eq('id', sess.id)
      void trackEvent(user.id, 'out_of_credits', { reason: credit.reason ?? 'no_credits', kind: 'bank_sat' })
      return NextResponse.json(
        { error: 'no test credits remaining', reason: credit.reason === 'no_subscription' ? 'no_subscription' : 'no_credits' },
        { status: 402 },
      )
    }
  }

  let test
  try {
    // Module 1 is mixed difficulty → no difficulty filter, blueprint-weighted.
    test = await assembleFromBank({ section, count, studentId: user.id }, sess.id)
  } catch (e) {
    // Not enough verified items for this section — roll back the session.
    if (creditCost > 0) await refundTestCredits(user.id, sess.id, creditCost)
    await supabaseAdmin.from('study_sessions').delete().eq('id', sess.id)
    return NextResponse.json({ error: (e as Error).message, reason: 'bank_empty' }, { status: 409 })
  }

  // For adaptive sessions the cached payload carries the module-break
  // index (= Module 1 length) and a combined timer across both modules;
  // /route appends Module 2 to this same row after routing.
  const payload = adaptive
    ? {
        ...test,
        adaptive: true,
        sectionKey: section,
        moduleBreakIdx: test.questions.length,
        totalModules: 2,
        // Per-module timing: each module gets its own countdown. The
        // combined value is kept for any legacy/whole-test reader.
        perModuleMinutes: SAT_MODULE_CONFIG[section].minutesPerModule,
        timeLimitMinutes: 2 * SAT_MODULE_CONFIG[section].minutesPerModule,
      }
    : test

  const { error: cacheErr } = await supabaseAdmin
    .from('study_messages')
    .insert({
      session_id: sess.id, role: 'assistant',
      content: CACHED_TEST_MARKER + JSON.stringify(payload), model: 'bank-assembled',
    })
  if (cacheErr) {
    if (creditCost > 0) await refundTestCredits(user.id, sess.id, creditCost)
    await supabaseAdmin.from('study_sessions').delete().eq('id', sess.id)
    return NextResponse.json({ error: 'cache write failed' }, { status: 500 })
  }
  await supabaseAdmin.from('study_sessions').update({ title: test.title }).eq('id', sess.id)

  // Funnel: a bank-assembled SAT test started — the usual first test
  // for a new user, so key for activation.
  void trackEvent(user.id, 'test_started', { kind: 'bank_sat', section, creditCost })

  return NextResponse.json({
    sessionId: sess.id,
    title: test.title,
    questionCount: test.questions.length,
    composition: test.composition,
    adaptive,
  })
}
