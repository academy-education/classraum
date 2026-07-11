import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/study/practice/complete — mark a practice session finished.
 *
 * Practice sessions were historically never flipped to 'completed'
 * (only full tests were, on submit), which meant the daily-challenge
 * "done" state and the journey's per-node completion had nothing to
 * key off. PracticeSession calls this when the student answers the
 * last question of the set.
 *
 * The reported score is cross-checked against the session's actual
 * study_attempts rows (server-side truth), so a forged body can't
 * mark a node completed with a fake score.
 */

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { sessionId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  if (!body.sessionId) return NextResponse.json({ error: 'missing sessionId' }, { status: 400 })

  const { data: session } = await supabaseAdmin
    .from('study_sessions')
    .select('id, student_id, mode, status')
    .eq('id', body.sessionId)
    .maybeSingle()
  if (!session || session.student_id !== user.id) {
    return NextResponse.json({ error: 'session not found' }, { status: 404 })
  }
  if (session.mode !== 'practice') {
    return NextResponse.json({ error: 'session is not in practice mode' }, { status: 400 })
  }

  // Score from the attempts ledger — the grade route wrote one row per
  // answered question, so this is authoritative.
  const { data: attempts } = await supabaseAdmin
    .from('study_attempts')
    .select('is_correct')
    .eq('session_id', session.id)
  const total = attempts?.length ?? 0
  if (total === 0) {
    return NextResponse.json({ error: 'no attempts recorded' }, { status: 400 })
  }
  const correct = (attempts ?? []).filter(a => a.is_correct).length
  const score = Math.round((correct / total) * 100)

  // Idempotent: re-finishing (e.g. "practice more" second round) keeps
  // the session completed and lets the score reflect the full ledger.
  await supabaseAdmin
    .from('study_sessions')
    .update({ status: 'completed', completed_at: new Date().toISOString(), score })
    .eq('id', session.id)

  return NextResponse.json({ score, correct, total })
}
