import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/study/daily-challenge — today's 5-question micro-quiz.
 *
 * Returns: { date, topic, sessionId, completed, weak }
 * - date: yyyy-mm-dd (UTC, simple for v1)
 * - topic: which topic the challenge will target (weakest with attempts >= 2,
 *   else most-recent topic, else null)
 * - sessionId: if a daily-challenge session exists for today, return its id
 * - completed: true if that session is status='completed'
 *
 * Daily challenge sessions are tagged via session.config.dailyChallenge = 'YYYY-MM-DD'
 * so we can find them by exact-match without a new schema.
 */

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const blocked = enforceRateLimit(`daily-challenge:user:${user.id}`, { windowMs: 60 * 1000, max: 60 })
  if (blocked) return blocked

  const today = new Date().toISOString().slice(0, 10)

  // Is there already a daily-challenge session for today?
  const { data: existing } = await supabaseAdmin
    .from('study_sessions')
    .select('id, status, topic_id, topic:study_topics ( id, slug, name_en, name_ko )')
    .eq('student_id', user.id)
    .contains('config', { dailyChallenge: today })
    .limit(1)

  if (existing && existing[0]) {
    const row = existing[0]
    const topicRaw = row.topic as unknown
    const topic = Array.isArray(topicRaw) ? topicRaw[0] : topicRaw
    return NextResponse.json({
      date: today,
      sessionId: row.id,
      completed: row.status === 'completed',
      topic,
      weak: false,
    })
  }

  // No session yet — today's challenge is a PREMADE set drawn from the
  // SAT item bank, identical for every student (practice/generate seeds
  // the draw with the date). The section alternates by date so Math and
  // Reading & Writing days interleave. Free: no subscription or credit
  // is involved anywhere in this flow.
  const slug = dailyChallengeSlug(today)
  const { data: topicRow } = await supabaseAdmin
    .from('study_topics')
    .select('id, slug, name_en, name_ko')
    .eq('slug', slug)
    .maybeSingle()

  return NextResponse.json({
    date: today,
    sessionId: null,
    completed: false,
    topic: topicRow ?? null,
    weak: false,
  })
}

/** Global section-of-the-day: even days → R&W, odd days → Math. */
function dailyChallengeSlug(date: string): string {
  const dayNum = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400_000)
  return dayNum % 2 === 0 ? 'sat-reading-writing' : 'sat-math'
}
