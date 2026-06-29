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

  // No session yet — pick the topic for today's challenge.
  // Priority: weakest mastery (score < 80, attempts >= 2). Fall back to
  // the most-recent topic the student has touched. Fall back to null
  // (no topic available — UI will offer to start later when the student
  // has any history).
  const [{ data: weak }, { data: recent }] = await Promise.all([
    supabaseAdmin
      .from('study_mastery')
      .select(`score, attempts_count, topic:study_topics ( id, slug, name_en, name_ko )`)
      .eq('student_id', user.id)
      .lt('score', 80)
      .gte('attempts_count', 2)
      .order('score', { ascending: true })
      .limit(1),
    supabaseAdmin
      .from('study_sessions')
      .select(`topic_id, topic:study_topics ( id, slug, name_en, name_ko )`)
      .eq('student_id', user.id)
      .not('topic_id', 'is', null)
      .order('last_active_at', { ascending: false })
      .limit(1),
  ])

  let topic: { id: string; slug: string; name_en: string; name_ko: string } | null = null
  let isWeak = false
  if (weak && weak[0]) {
    const tRaw = weak[0].topic as unknown
    topic = (Array.isArray(tRaw) ? tRaw[0] : tRaw) as typeof topic ?? null
    isWeak = !!topic
  }
  if (!topic && recent && recent[0]) {
    const tRaw = recent[0].topic as unknown
    topic = (Array.isArray(tRaw) ? tRaw[0] : tRaw) as typeof topic ?? null
  }

  return NextResponse.json({
    date: today,
    sessionId: null,
    completed: false,
    topic,
    weak: isWeak,
  })
}
