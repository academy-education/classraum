import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Compute today's daily-challenge state for a student. Shared by the
 * dedicated /api/study/daily-challenge endpoint (topic page card) and
 * the batched /api/study/landing payload (so the landing paints the
 * challenge card in the same frame as everything else).
 *
 * Selection: the challenge comes from the tests the student PICKED as
 * targets — the test rotates by day when there are several, and the
 * section within a test rotates by day. No targets → null topic (the
 * card self-hides; the landing prompts to pick a test instead).
 */

export interface DailyChallengeState {
  date: string
  sessionId: string | null
  completed: boolean
  topic: { id: string; slug: string; name_en: string; name_ko: string } | null
  weak: boolean
}

export async function computeDailyChallenge(userId: string): Promise<DailyChallengeState> {
  const today = new Date().toISOString().slice(0, 10)

  // Is there already a daily-challenge session for today?
  const { data: existing } = await supabaseAdmin
    .from('study_sessions')
    .select('id, status, topic_id, topic:study_topics ( id, slug, name_en, name_ko )')
    .eq('student_id', userId)
    .contains('config', { dailyChallenge: today })
    .limit(1)

  if (existing && existing[0]) {
    const row = existing[0]
    const topicRaw = row.topic as unknown
    const topic = (Array.isArray(topicRaw) ? topicRaw[0] : topicRaw) as DailyChallengeState['topic']
    return { date: today, sessionId: row.id as string, completed: row.status === 'completed', topic, weak: false }
  }

  const { data: prefs } = await supabaseAdmin
    .from('study_user_prefs')
    .select('target_tests')
    .eq('student_id', userId)
    .maybeSingle()
  const targets = [...new Set(((prefs?.target_tests as string[] | null) ?? []).map(s => s.toLowerCase()))].sort()
  if (targets.length === 0) {
    return { date: today, sessionId: null, completed: false, topic: null, weak: false }
  }

  const dayNum = Math.floor(Date.parse(`${today}T00:00:00Z`) / 86400_000)
  const family = targets[dayNum % targets.length]!

  // Sections = children of the test root, in catalog order. sat-essay
  // is retired (mirrors the topic page's hidden list).
  const { data: root } = await supabaseAdmin
    .from('study_topics')
    .select('id')
    .eq('slug', `test-${family}`)
    .maybeSingle()
  const { data: sectionRows } = root
    ? await supabaseAdmin
        .from('study_topics')
        .select('id, slug, name_en, name_ko')
        .eq('parent_id', root.id)
        .order('sort_order', { ascending: true })
    : { data: null }
  const sections = (sectionRows ?? []).filter(s => s.slug !== 'sat-essay')
  const topic = (sections.length > 0 ? sections[dayNum % sections.length]! : null) as DailyChallengeState['topic']

  return { date: today, sessionId: null, completed: false, topic, weak: false }
}
