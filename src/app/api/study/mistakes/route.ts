import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/study/mistakes — recent unique wrong-answer questions.
 *
 * Powers the mistake bank shelf on the study landing. Returns the
 * most recent N wrong attempts deduplicated by question prompt
 * (a student who answered the same question wrong twice should see
 * it once, with the most-recent context), each enriched with topic
 * info so the UI can render the topic name + slug for the redo CTA.
 *
 * RLS on study_attempts already scopes to the caller (via
 * session → student_id). Service-role keeps the JOIN to study_topics
 * efficient.
 */

export const dynamic = 'force-dynamic'

interface MistakeQuestion {
  prompt: string
  choices?: string[]
  correct_answer: string
  explanation?: string
}

interface MistakeCard {
  attempt_id: string
  question: MistakeQuestion
  student_answer: string
  ai_explanation: string | null
  attempted_at: string
  topic: { id: string; slug: string; name_en: string; name_ko: string } | null
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Pull the last 60 wrong attempts (we'll dedupe down). 60 is plenty
  // — most students won't have that many distinct mistakes.
  const { data: raw } = await supabaseAdmin
    .from('study_attempts')
    .select(`
      id, question, student_answer, ai_explanation, created_at, topic_id,
      session:study_sessions!inner ( student_id ),
      topic:study_topics ( id, slug, name_en, name_ko )
    `)
    .eq('session.student_id', user.id)
    .eq('is_correct', false)
    .order('created_at', { ascending: false })
    .limit(60)

  if (!raw) return NextResponse.json({ mistakes: [] })

  // Dedupe by the question prompt — same question answered wrong
  // multiple times collapses to the most-recent attempt.
  const seen = new Set<string>()
  const mistakes: MistakeCard[] = []
  for (const row of raw) {
    const q = (row.question as MistakeQuestion | null) ?? null
    if (!q?.prompt) continue
    const key = q.prompt.trim().toLowerCase().slice(0, 200)
    if (seen.has(key)) continue
    seen.add(key)
    // Supabase typegen returns the joined topic as an array even for
    // a single FK; take the first (only) element.
    const topicRaw = row.topic as unknown
    const topic = Array.isArray(topicRaw)
      ? (topicRaw[0] as MistakeCard['topic']) ?? null
      : (topicRaw as MistakeCard['topic']) ?? null
    mistakes.push({
      attempt_id: row.id as string,
      question: q,
      student_answer: row.student_answer as string,
      ai_explanation: (row.ai_explanation as string | null) ?? null,
      attempted_at: row.created_at as string,
      topic,
    })
    if (mistakes.length >= 12) break
  }

  return NextResponse.json({ mistakes })
}
