import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { assembleFromBank } from '@/lib/study/assemble'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/test/assemble — build a full-test session from the
 * pre-verified item bank instead of generating one live.
 *
 * Unlike /generate this is INSTANT (a DB query, not a 12-minute model
 * run) and free — every banked item is already verified, so there's no
 * per-test AI cost. It consumes no credit AND requires no subscription:
 * premade tests (journey, bank practice, daily challenge) are the free
 * tier. Credits + subscription gate only the live AI generator.
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

  let body: { section?: string; count?: number; pathNode?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const section = body.section === 'math' || body.section === 'reading_writing' ? body.section : null
  if (!section) return NextResponse.json({ error: 'section must be math or reading_writing' }, { status: 400 })
  const count = Math.min(Math.max(Number(body.count) || 22, 5), 54)
  // Journey section-test nodes tag their sessions so the path page can
  // track per-node completion (config.pathNode → node id).
  const pathNode = typeof body.pathNode === 'string' && body.pathNode.length <= 64 ? body.pathNode : null

  // Assemble from the bank. Seed with the (not-yet-created) session id so
  // the shuffle is stable per session; fall back to a fresh session first.
  const { data: sess, error: sessErr } = await supabaseAdmin
    .from('study_sessions')
    .insert({
      student_id: user.id, topic_id: SECTION_TOPIC[section], mode: 'full_test',
      status: 'active', language: 'en', generation_status: 'ready',
      config: { source: 'bank', section, ...(pathNode ? { pathNode } : {}) },
    })
    .select('id')
    .single()
  if (sessErr || !sess) return NextResponse.json({ error: 'session create failed' }, { status: 500 })

  let test
  try {
    test = await assembleFromBank({ section, count, studentId: user.id }, sess.id)
  } catch (e) {
    // Not enough verified items for this section — roll back the session.
    await supabaseAdmin.from('study_sessions').delete().eq('id', sess.id)
    return NextResponse.json({ error: (e as Error).message, reason: 'bank_empty' }, { status: 409 })
  }

  const { error: cacheErr } = await supabaseAdmin
    .from('study_messages')
    .insert({
      session_id: sess.id, role: 'assistant',
      content: CACHED_TEST_MARKER + JSON.stringify(test), model: 'bank-assembled',
    })
  if (cacheErr) {
    await supabaseAdmin.from('study_sessions').delete().eq('id', sess.id)
    return NextResponse.json({ error: 'cache write failed' }, { status: 500 })
  }
  await supabaseAdmin.from('study_sessions').update({ title: test.title }).eq('id', sess.id)

  return NextResponse.json({
    sessionId: sess.id,
    title: test.title,
    questionCount: test.questions.length,
    composition: test.composition,
  })
}
