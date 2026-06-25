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
  suggested_mode: 'chat' | 'practice' | 'lesson' | 'flashcards' | 'full_test'
  /** First weakness label from the AI assessment, if any — gives the
   *  recommended card a more specific reason than just the score. */
  weakness_hint?: string | null
}

interface WeaknessNote { label?: string }

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Pull target test from prefs so we can up-rank topics in the
  // student's target family before slicing the top 5.
  const { data: prefsRow } = await supabaseAdmin
    .from('study_user_prefs')
    .select('target_test')
    .eq('student_id', user.id)
    .maybeSingle()
  const targetTest = (prefsRow?.target_test as string | null) ?? null

  // Pull weak areas + recent sessions in parallel, then merge below.
  const [{ data: weak }, { data: recent }] = await Promise.all([
    supabaseAdmin
      .from('study_mastery')
      .select(`
        score, attempts_count, weaknesses,
        topic:study_topics ( id, slug, name_en, name_ko, category )
      `)
      .eq('student_id', user.id)
      .lt('score', 80)
      .gte('attempts_count', 2)
      .order('score', { ascending: true })
      .limit(8),  // pull extra so the target-test rerank below has runway
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

  // If a target test is set, partition + reorder weak rows so target-
  // family topics come first within the weak section. Slug pattern
  // for test_prep children is e.g. "sat-math", "ksat-korean" — we
  // match prefix "{family}-" to identify membership.
  const inTarget = (slug: string) => targetTest ? slug.startsWith(targetTest + '-') : false
  const weakSorted = targetTest
    ? [...(weak ?? [])].sort((a, b) => {
        const ta = (a as unknown as { topic: { slug: string } | null }).topic?.slug ?? ''
        const tb = (b as unknown as { topic: { slug: string } | null }).topic?.slug ?? ''
        const ai = inTarget(ta) ? 0 : 1
        const bi = inTarget(tb) ? 0 : 1
        return ai - bi  // target-family first, original order within each
      }).slice(0, 3)
    : (weak ?? []).slice(0, 3)

  // Weak areas first — practice is the right mode for these (drills
  // the gap with immediate feedback).
  for (const row of weakSorted) {
    const t = (row as unknown as { topic: RecommendedCard['topic'] | null }).topic
    if (!t || seenTopicIds.has(t.id)) continue
    seenTopicIds.add(t.id)
    const weaknesses = ((row as unknown as { weaknesses: WeaknessNote[] | null }).weaknesses ?? [])
    const firstLabel = weaknesses[0]?.label ?? null
    cards.push({
      reason: 'weak',
      topic: t,
      score: row.score,
      attempts_count: row.attempts_count,
      suggested_mode: 'practice',
      weakness_hint: firstLabel,
    })
  }

  // Recent sessions next, skipping topics already covered above and
  // any topic the student has 90+ on (don't recommend what they've
  // already mastered).
  const masteryByTopic = new Map<string, number>()
  for (const m of weak ?? []) {  // use full weak list so we know all mastery scores, not just the sliced top 3
    const t = (m as unknown as { topic: { id: string } | null }).topic
    if (t) masteryByTopic.set(t.id, m.score)
  }

  const recentSorted = targetTest
    ? [...(recent ?? [])].sort((a, b) => {
        const ta = (a as unknown as { topic: { slug: string } | null }).topic?.slug ?? ''
        const tb = (b as unknown as { topic: { slug: string } | null }).topic?.slug ?? ''
        const ai = inTarget(ta) ? 0 : 1
        const bi = inTarget(tb) ? 0 : 1
        return ai - bi
      })
    : (recent ?? [])

  for (const row of recentSorted) {
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
