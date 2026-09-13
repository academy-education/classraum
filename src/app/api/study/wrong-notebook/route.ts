import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'

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
  /* `question` is the study_attempts jsonb passed through verbatim, so these
   * two have ALWAYS been on the wire — they were simply not declared here, and
   * an undeclared field is an invisible one. Measured over the notebook's whole
   * population on 2026-09-13: of 2,246 wrong attempts, 1,755 (78.1%) carry a
   * non-empty `passage` and 2,045 (91.1%) carry `choices`. The review screen
   * rendered neither, which is what a student reported — she could not see the
   * passage again, could not see what the other options had been, and the AI
   * could not tell her why they were wrong because it was never given the text.
   *
   * For LISTENING items `passage` IS the transcript: it carries a
   * `Transcript:` prefix and A:/B: speaker labels (494 of the 2,246), and it is
   * the same string TestSession feeds ListeningAudioPlayer as `transcript`. */
  passage?: string | null
  passageGroupId?: string | null
}

interface SavedExplanation {
  steps: string | null
  simpler: string | null
  followup: string | null
  followup_question: string | null
}

const EMPTY_SAVED: SavedExplanation = { steps: null, simpler: null, followup: null, followup_question: null }

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
  reviewed_at: string | null
  difficulty: string | null
  /** Previously generated on-demand explanations, persisted so the
   *  notebook re-shows them without re-billing a model call. */
  /* SAVED EXPLANATIONS ARE PER LANGUAGE, one block each.
   * The old shape was flat (`saved_steps` + `saved_steps_lang`) over a table
   * keyed (student_id, attempt_id), so a student who generated the English
   * step-by-step and then the Korean one lost the English on reload — and the
   * toggle re-billed a model call for text already paid for. The key now
   * carries the language, so both survive and both are returned. */
  saved: Record<'en' | 'ko', SavedExplanation>
}

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(`wrong-notebook:user:${user.id}`, { windowMs: 60 * 1000, max: 60 })
  if (blocked) return blocked

  const topicId = new URL(req.url).searchParams.get('topic_id')

  let query = dbAdmin
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
    ? await dbAdmin
        .from('study_attempt_notes')
        .select('attempt_id, note, updated_at, reviewed_at')
        .eq('student_id', user.id)
        .in('attempt_id', attemptIds)
    : { data: [] }
  const noteMap = new Map<string, { note: string; updated_at: string; reviewed_at: string | null }>()
  for (const n of (notes ?? [])) {
    noteMap.set(n.attempt_id as string, {
      note: n.note as string,
      updated_at: n.updated_at as string,
      reviewed_at: (n.reviewed_at as string | null) ?? null,
    })
  }

  // Saved on-demand explanations (step-by-step / simpler), joined in the
  // same one-round-trip style as notes.
  const { data: explanations } = attemptIds.length > 0
    ? await dbAdmin
        .from('study_attempt_explanations')
        .select('attempt_id, language, steps, simpler, followup, followup_question')
        .eq('student_id', user.id)
        .in('attempt_id', attemptIds)
    : { data: [] }
  /* Up to TWO rows per attempt now — one per language — so the map is keyed by
   * both. A Map keyed by attempt alone would have silently kept whichever row
   * happened to come back last, which is the same data loss in a new place. */
  const explainMap = new Map<string, SavedExplanation>()
  for (const e of (explanations ?? [])) {
    const lang = e.language === 'ko' ? 'ko' : 'en'
    explainMap.set(`${e.attempt_id as string}:${lang}`, {
      steps: (e.steps as string | null) ?? null,
      simpler: (e.simpler as string | null) ?? null,
      followup: (e.followup as string | null) ?? null,
      followup_question: (e.followup_question as string | null) ?? null,
    })
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
      reviewed_at: noteRow?.reviewed_at ?? null,
      difficulty: (q.difficulty as string | undefined) ?? null,
      saved: {
        en: explainMap.get(`${row.id as string}:en`) ?? EMPTY_SAVED,
        ko: explainMap.get(`${row.id as string}:ko`) ?? EMPTY_SAVED,
      },
    })
  }

  const topics = [...topicCounter.entries()]
    .map(([id, t]) => ({ id, ...t }))
    .sort((a, b) => b.count - a.count)

  // Bookmarked snap captures — surfaced as a separate section on the
  // 오답노트 page so the student can keep a personal "study these"
  // list of photographed problems alongside their wrong-answer notes.
  const { data: snapRows } = await dbAdmin
    .from('study_snap_captures')
    .select('id, image_path, ocr_text, subject_guess, final_answer, bookmarked_at, created_at')
    .eq('student_id', user.id)
    .not('bookmarked_at', 'is', null)
    .order('bookmarked_at', { ascending: false })
    .limit(20)

  const snapPaths = (snapRows ?? []).map(s => s.image_path as string)
  const { data: signed } = snapPaths.length > 0
    ? await dbAdmin.storage.from('study-snap-images').createSignedUrls(snapPaths, 3600)
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
