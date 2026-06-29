import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/study/wrong-notebook — full wrong-answer notebook for the
 * caller. Unlike /api/study/mistakes (which is a small carousel feed),
 * this returns up to 200 unique wrong answers with student-authored
 * notes joined in, suitable for the dedicated 오답노트 page.
 *
 * Korean exam-prep convention: students compile a personal 오답노트
 * (wrong-answer notebook) and review it before tests. This endpoint
 * powers the in-app version + the printable export.
 *
 * Dedupe key is the trimmed question prompt — same item answered wrong
 * twice collapses to the most-recent attempt.
 */

export const dynamic = 'force-dynamic'

interface NotebookQuestion {
  prompt: string
  type?: string
  choices?: string[]
  correct_answer: string
  explanation?: string
  difficulty?: string
}

interface NotebookEntry {
  attempt_id: string
  question: NotebookQuestion
  student_answer: string
  ai_explanation: string | null
  attempted_at: string
  topic: { id: string; slug: string; name_en: string; name_ko: string } | null
  /** Fallback label when topic is null — e.g. for snap-followup or
   *  freeform sessions. Comes from the session's topic_freeform. */
  topic_freeform: string | null
  note: string
  note_updated_at: string | null
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const blocked = enforceRateLimit(`wrong-notebook:user:${user.id}`, { windowMs: 60 * 1000, max: 60 })
  if (blocked) return blocked

  const topicId = new URL(req.url).searchParams.get('topic_id')

  let query = supabaseAdmin
    .from('study_attempts')
    .select(`
      id, question, student_answer, ai_explanation, created_at, topic_id,
      session:study_sessions!inner ( student_id, topic_freeform ),
      topic:study_topics ( id, slug, name_en, name_ko )
    `)
    .eq('session.student_id', user.id)
    .eq('is_correct', false)
    .order('created_at', { ascending: false })
    .limit(200)
  if (topicId) query = query.eq('topic_id', topicId)

  const { data: raw } = await query
  if (!raw) return NextResponse.json({ entries: [], topics: [] })

  // Pull all notes in one round-trip and stitch on the client side.
  const attemptIds = (raw as Array<{ id: string }>).map(r => r.id)
  const { data: notes } = attemptIds.length > 0
    ? await supabaseAdmin
        .from('study_attempt_notes')
        .select('attempt_id, note, updated_at')
        .eq('student_id', user.id)
        .in('attempt_id', attemptIds)
    : { data: [] }
  const noteMap = new Map<string, { note: string; updated_at: string }>()
  for (const n of (notes ?? [])) {
    noteMap.set(n.attempt_id as string, { note: n.note as string, updated_at: n.updated_at as string })
  }

  const seen = new Set<string>()
  const entries: NotebookEntry[] = []
  const topicCounter = new Map<string, { slug: string; name_en: string; name_ko: string; count: number }>()
  for (const row of raw) {
    const q = (row.question as NotebookQuestion | null) ?? null
    if (!q?.prompt) continue
    const key = q.prompt.trim().toLowerCase().slice(0, 200)
    if (seen.has(key)) continue
    seen.add(key)
    const topicRaw = row.topic as unknown
    const topic = Array.isArray(topicRaw)
      ? (topicRaw[0] as NotebookEntry['topic']) ?? null
      : (topicRaw as NotebookEntry['topic']) ?? null
    if (topic) {
      const existing = topicCounter.get(topic.id)
      if (existing) existing.count++
      else topicCounter.set(topic.id, { slug: topic.slug, name_en: topic.name_en, name_ko: topic.name_ko, count: 1 })
    }
    const sessionRaw = row.session as unknown
    const session = Array.isArray(sessionRaw) ? sessionRaw[0] as { topic_freeform: string | null } : sessionRaw as { topic_freeform: string | null } | null
    const noteRow = noteMap.get(row.id as string)
    entries.push({
      attempt_id: row.id as string,
      question: q,
      student_answer: row.student_answer as string,
      ai_explanation: (row.ai_explanation as string | null) ?? null,
      attempted_at: row.created_at as string,
      topic,
      topic_freeform: session?.topic_freeform ?? null,
      note: noteRow?.note ?? '',
      note_updated_at: noteRow?.updated_at ?? null,
    })
  }

  const topics = [...topicCounter.entries()]
    .map(([id, t]) => ({ id, ...t }))
    .sort((a, b) => b.count - a.count)

  // Bookmarked snap captures — surfaced as a separate section on the
  // 오답노트 page so the student can keep a personal "study these"
  // list of photographed problems alongside their wrong-answer notes.
  const { data: snapRows } = await supabaseAdmin
    .from('study_snap_captures')
    .select('id, image_path, ocr_text, subject_guess, final_answer, bookmarked_at, created_at')
    .eq('student_id', user.id)
    .not('bookmarked_at', 'is', null)
    .order('bookmarked_at', { ascending: false })
    .limit(20)

  const snapPaths = (snapRows ?? []).map(s => s.image_path as string)
  const { data: signed } = snapPaths.length > 0
    ? await supabaseAdmin.storage.from('study-snap-images').createSignedUrls(snapPaths, 3600)
    : { data: [] }
  const snapUrlByPath = new Map<string, string>()
  for (const s of (signed ?? [])) {
    if (s.path && s.signedUrl) snapUrlByPath.set(s.path, s.signedUrl)
  }
  const bookmarkedSnaps = (snapRows ?? []).map(s => ({
    id: s.id as string,
    image_url: snapUrlByPath.get(s.image_path as string) ?? null,
    ocr_text: (s.ocr_text as string | null) ?? '',
    subject_guess: (s.subject_guess as string | null) ?? 'other',
    final_answer: (s.final_answer as string | null) ?? '',
    bookmarked_at: s.bookmarked_at as string,
  }))

  return NextResponse.json({ entries, topics, bookmarkedSnaps })
}
