import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * GET /api/study/search?q=... — universal search across the
 * student's study surface.
 *
 * Returns four small result groups (max 5 each, 20 total):
 *   - topics:   curated topic catalog matched by name (en/ko)
 *   - sessions: this student's sessions matched by title or topic_freeform
 *   - snaps:    this student's snap captures matched by ocr_text
 *   - mistakes: this student's wrong attempts matched by question prompt
 *
 * Empty `q` returns empty groups. Two-char minimum so we don't fire
 * heavy queries for single keystrokes.
 */

export const dynamic = 'force-dynamic'

interface SearchResults {
  topics: Array<{ id: string; slug: string; name: string; category: string }>
  sessions: Array<{ id: string; title: string; mode: string; topic_slug: string | null; last_active_at: string }>
  snaps: Array<{ id: string; ocr_text: string; subject_guess: string; created_at: string }>
  mistakes: Array<{ attempt_id: string; prompt: string; topic_slug: string | null; created_at: string }>
}

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(`search:user:${user.id}`, { windowMs: 60 * 1000, max: 60 })
  if (blocked) return blocked

  const q = (new URL(req.url).searchParams.get('q') ?? '').trim()
  const empty: SearchResults = { topics: [], sessions: [], snaps: [], mistakes: [] }
  if (q.length < 2) return NextResponse.json(empty)

  // ilike for substring matching. Escape % and _ to prevent wildcard
  // injection in the query string. Postgres ilike is case-insensitive.
  const pattern = `%${q.replace(/[%_\\]/g, m => '\\' + m)}%`

  const [topics, sessions, snaps, mistakes] = await Promise.all([
    supabaseAdmin
      .from('study_topics')
      .select('id, slug, name_en, name_ko, category')
      .or(`name_en.ilike.${pattern},name_ko.ilike.${pattern}`)
      .limit(5),
    supabaseAdmin
      .from('study_sessions')
      .select(`
        id, title, mode, topic_freeform, last_active_at,
        topic:study_topics ( slug )
      `)
      .eq('student_id', user.id)
      .or(`title.ilike.${pattern},topic_freeform.ilike.${pattern}`)
      .order('last_active_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('study_snap_captures')
      .select('id, ocr_text, subject_guess, created_at')
      .eq('student_id', user.id)
      .ilike('ocr_text', pattern)
      .order('created_at', { ascending: false })
      .limit(5),
    // Mistakes — search inside the jsonb `question` column's prompt
    // via Postgres jsonb operator. Cast to text for ilike.
    supabaseAdmin
      .from('study_attempts')
      .select(`
        id, question, created_at,
        session:study_sessions!inner ( student_id ),
        topic:study_topics ( slug )
      `)
      .eq('session.student_id', user.id)
      .eq('is_correct', false)
      .filter('question->>prompt', 'ilike', pattern)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const results: SearchResults = {
    topics: (topics.data ?? []).map(t => ({
      id: t.id as string,
      slug: t.slug as string,
      name: (t.name_ko as string) ?? (t.name_en as string),
      category: t.category as string,
    })),
    sessions: (sessions.data ?? []).map(s => {
      const tRaw = s.topic as unknown
      const topic = Array.isArray(tRaw) ? tRaw[0] : tRaw
      return {
        id: s.id as string,
        title: (s.title as string | null) ?? (s.topic_freeform as string | null) ?? '',
        mode: s.mode as string,
        topic_slug: (topic as { slug: string } | null)?.slug ?? null,
        last_active_at: s.last_active_at as string,
      }
    }),
    snaps: (snaps.data ?? []).map(s => ({
      id: s.id as string,
      ocr_text: (s.ocr_text as string | null) ?? '',
      subject_guess: (s.subject_guess as string | null) ?? 'other',
      created_at: s.created_at as string,
    })),
    mistakes: (mistakes.data ?? []).map(m => {
      const q = (m.question as { prompt?: string } | null) ?? {}
      const tRaw = m.topic as unknown
      const topic = Array.isArray(tRaw) ? tRaw[0] : tRaw
      return {
        attempt_id: m.id as string,
        prompt: q.prompt ?? '',
        topic_slug: (topic as { slug: string } | null)?.slug ?? null,
        created_at: m.created_at as string,
      }
    }),
  }

  return NextResponse.json(results)
}
