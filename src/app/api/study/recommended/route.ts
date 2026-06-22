import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/study/recommended — what the student should study next.
 *
 * Pulls from study_mastery + recent study_sessions to produce up to
 * 5 cards. Ranking:
 *   1. Weak areas: lowest-scored mastery rows with score < 80,
 *      attempts_count >= 2 (one attempt is too noisy to call "weak").
 *   2. Resume-from-recent: most recent active sessions in topics the
 *      student hasn't already aced.
 *
 * Returns [] when the student is new — the landing already has a
 * "study a bit and we'll suggest topics" placeholder for that case.
 */

export const dynamic = 'force-dynamic'

interface RecommendedCard {
  reason: 'weak' | 'recent'
  topic: { id: string; slug: string; name_en: string; name_ko: string; category: string }
  score: number | null
  attempts_count: number
  suggested_mode: 'chat' | 'practice' | 'lesson' | 'flashcards'
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Pull weak areas + recent sessions in parallel, then merge below.
  const [{ data: weak }, { data: recent }] = await Promise.all([
    supabaseAdmin
      .from('study_mastery')
      .select(`
        score, attempts_count,
        topic:study_topics ( id, slug, name_en, name_ko, category )
      `)
      .eq('student_id', user.id)
      .lt('score', 80)
      .gte('attempts_count', 2)
      .order('score', { ascending: true })
      .limit(3),
    supabaseAdmin
      .from('study_sessions')
      .select(`
        topic_id, mode, last_active_at,
        topic:study_topics ( id, slug, name_en, name_ko, category )
      `)
      .eq('student_id', user.id)
      .not('topic_id', 'is', null)
      .order('last_active_at', { ascending: false })
      .limit(15),
  ])

  const cards: RecommendedCard[] = []
  const seenTopicIds = new Set<string>()

  // Weak areas first — practice is the right mode for these (drills
  // the gap with immediate feedback).
  for (const row of weak ?? []) {
    const t = (row as unknown as { topic: RecommendedCard['topic'] | null }).topic
    if (!t || seenTopicIds.has(t.id)) continue
    seenTopicIds.add(t.id)
    cards.push({
      reason: 'weak',
      topic: t,
      score: row.score,
      attempts_count: row.attempts_count,
      suggested_mode: 'practice',
    })
  }

  // Recent sessions next, skipping topics already covered above and
  // any topic the student has 90+ on (don't recommend what they've
  // already mastered).
  const masteryByTopic = new Map<string, number>()
  for (const m of weak ?? []) {
    const t = (m as unknown as { topic: { id: string } | null }).topic
    if (t) masteryByTopic.set(t.id, m.score)
  }

  for (const row of recent ?? []) {
    if (cards.length >= 5) break
    const t = (row as unknown as { topic: RecommendedCard['topic'] | null }).topic
    if (!t || seenTopicIds.has(t.id)) continue
    const masteryScore = masteryByTopic.get(t.id) ?? null
    // Skip if already mastered.
    const { data: mRow } = await supabaseAdmin
      .from('study_mastery')
      .select('score')
      .eq('student_id', user.id)
      .eq('topic_id', t.id)
      .maybeSingle()
    if ((mRow?.score ?? 0) >= 90) continue

    seenTopicIds.add(t.id)
    cards.push({
      reason: 'recent',
      topic: t,
      score: mRow?.score ?? masteryScore,
      attempts_count: 0,
      // Recent topics suggest the mode the student last used, but we
      // don't have it indexed — defaulting to chat as the safest
      // resume CTA.
      suggested_mode: row.mode as RecommendedCard['suggested_mode'],
    })
  }

  return NextResponse.json({ cards })
}
