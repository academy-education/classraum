import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/study/srs-review — cross-topic due-card queue for the
 * daily SRS review surface. Returns flashcards whose due_at has
 * passed, INTERLEAVED across topics rather than blocked by topic.
 *
 * Why interleave: peer-reviewed evidence (Butowska-Buczyńska 2024,
 * PMC11536137) shows variable retrieval cues with spacing produce a
 * superadditive effect — d=0.87 vs d=0.52 for blocked cues. Round-
 * robin topic interleaving achieves "varied surface features"
 * without requiring new generation.
 *
 * Cap at 30 to keep a session bounded (≈10 min of review).
 */

export const dynamic = 'force-dynamic'

interface DueCard {
  student_id: string
  topic_id: string | null
  card_front: string
  card_back: string
  due_at: string
  topic_name_en: string | null
  topic_name_ko: string | null
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const blocked = enforceRateLimit(`srs-review:user:${user.id}`, { windowMs: 60 * 1000, max: 60 })
  if (blocked) return blocked

  const nowIso = new Date().toISOString()

  // Pull due cards + the joined topic name in one shot.
  const { data: rows } = await supabaseAdmin
    .from('study_flashcard_reviews')
    .select(`
      student_id, topic_id, card_front, card_back, due_at,
      topic:study_topics ( name_en, name_ko )
    `)
    .eq('student_id', user.id)
    .lte('due_at', nowIso)
    .order('due_at', { ascending: true })
    .limit(120)

  if (!rows || rows.length === 0) {
    return NextResponse.json({ queue: [], topicCount: 0 })
  }

  // Normalize topic shape (Supabase typegen returns array for FK joins).
  const cards: DueCard[] = (rows as Array<{
    student_id: string
    topic_id: string | null
    card_front: string
    card_back: string
    due_at: string
    topic: { name_en: string; name_ko: string } | { name_en: string; name_ko: string }[] | null
  }>).map(r => {
    const topic = Array.isArray(r.topic) ? r.topic[0] : r.topic
    return {
      student_id: r.student_id,
      topic_id: r.topic_id,
      card_front: r.card_front,
      card_back: r.card_back,
      due_at: r.due_at,
      topic_name_en: topic?.name_en ?? null,
      topic_name_ko: topic?.name_ko ?? null,
    }
  })

  // Round-robin interleave by topic_id. Group → pop one per group per pass.
  const byTopic = new Map<string, DueCard[]>()
  for (const c of cards) {
    const key = c.topic_id ?? '__no_topic__'
    if (!byTopic.has(key)) byTopic.set(key, [])
    byTopic.get(key)!.push(c)
  }
  const buckets = [...byTopic.values()]
  const interleaved: DueCard[] = []
  let progressed = true
  while (progressed) {
    progressed = false
    for (const b of buckets) {
      const next = b.shift()
      if (next) {
        interleaved.push(next)
        progressed = true
      }
    }
  }

  return NextResponse.json({
    queue: interleaved.slice(0, 30),
    topicCount: buckets.length,
    totalDue: cards.length,
  })
}
