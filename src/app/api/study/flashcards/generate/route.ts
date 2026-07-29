import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'
import { loadStudyPromptContext } from '@/lib/study-prompt-context'
import { drawFlashcardBank } from '@/lib/study/flashcard-bank'
import { spendEnergy, cleanupAbandonedPracticeSessions } from '@/lib/study/practice-quota'

/**
 * POST /api/study/flashcards/generate — serve a flashcard deck from the
 * pre-generated study_flashcard_bank.
 *
 * BANK-ONLY (no AI, no token cost). Cards are drawn unseen-first with
 * oldest-reviewed recycled once the pool runs dry (drawFlashcardBank).
 * The served deck is cached per session (study_messages, [flashcards-v1]
 * marker) so a mid-deck refresh resumes the same set; a fresh "study
 * again" starts a NEW session and draws the next unseen cards.
 *
 * Progress is tracked via study_flashcard_reviews (SM-2 state keyed by
 * card front) — the client writes a row per card the student rates, the
 * same rows the /review spaced-repetition queue reads. Only SAT topics
 * are banked today; anything else returns an empty deck.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 15

const CACHED_DECK_MARKER = '[flashcards-v1]'
const DECK_SIZE = 12

interface Deck { cards: { front: string; back: string; hint: string | null }[] }

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(
    `flashcards-generate:user:${user.id}`,
    { windowMs: 10 * 60 * 1000, max: 30 }
  )
  if (blocked) return blocked

  let body: { sessionId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const sessionId = body.sessionId
  if (!sessionId) return NextResponse.json({ error: 'missing sessionId' }, { status: 400 })

  const { data: session } = await dbAdmin
    .from('study_sessions')
    .select('id, student_id, mode, language, topic_id')
    .eq('id', sessionId)
    .maybeSingle()
  if (!session || session.student_id !== user.id) {
    return NextResponse.json({ error: 'session not found' }, { status: 404 })
  }
  if (session.mode !== 'flashcards') {
    return NextResponse.json({ error: 'session is not in flashcards mode' }, { status: 400 })
  }

  // Resume: return the cached deck if this session already has one.
  const { data: existingRows } = await dbAdmin
    .from('study_messages')
    .select('content')
    .eq('session_id', sessionId)
    .eq('role', 'assistant')
    .ilike('content', `${CACHED_DECK_MARKER}%`)
    .limit(1)
  if (existingRows && existingRows.length > 0) {
    const raw = existingRows[0].content.slice(CACHED_DECK_MARKER.length)
    try {
      const cached = JSON.parse(raw) as Deck
      return NextResponse.json({ deck: cached, cached: true })
    } catch {
      // Corrupt cache → redraw below.
    }
  }

  // ── Energy ─────────────────────────────────────────────────────
  // Flashcards spend from the same energy pool as practice questions
  // (regen over time to a free/paid cap). Only a FRESH deck is checked —
  // resumes returned above from cache. Flashcard sessions carry no
  // pathNode/dailyChallenge, so all fresh decks spend energy.
  {
    const spend = await spendEnergy(user.id)
    if (!spend.ok) {
      // Error intentionally ignored: no energy was spent, so the worst case
      // is an empty session lingering until cleanupAbandonedPracticeSessions
      // sweeps it.
      await dbAdmin.from('study_sessions').delete().eq('id', sessionId).eq('student_id', user.id)
      return NextResponse.json(
        { error: 'out of energy', reason: 'no_energy', cap: spend.state.cap, nextRefillSeconds: spend.state.nextRefillSeconds },
        { status: 429 },
      )
    }
    void cleanupAbandonedPracticeSessions(user.id, sessionId)
  }

  /* Resolve the bank family+section from the topic slug.
   *
   * TOEFL Writing gets a deck; Listening and Speaking deliberately do
   * NOT. A flashcard is a recall tool — one cue, one retrievable answer
   * — and that maps onto vocabulary, not onto hearing connected speech
   * or producing it under time pressure. Shipping card decks there
   * would feel like studying and move nothing. Their equivalents are
   * dictation and the Listen-and-Repeat loop, which are separate modes.
   *
   * The Writing deck is usage-first, not definition-first: headword →
   * pattern + the error to avoid → model sentence. A TOEFL writer knows
   * what `contribute` means and still writes "contribute in". */
  let bankFamily: 'sat' | 'toefl' = 'sat'
  let bankSection: 'math' | 'reading_writing' | 'writing' | null = null
  if (session.topic_id) {
    const ctx = await loadStudyPromptContext(session.topic_id, session.language as 'en' | 'ko')
    if (ctx?.testFamily === 'sat') {
      bankFamily = 'sat'
      bankSection = ctx.topicSlug === 'sat-math' ? 'math' : 'reading_writing'
    } else if (ctx?.testFamily === 'toefl' && ctx.topicSlug === 'toefl-writing') {
      bankFamily = 'toefl'
      bankSection = 'writing'
    }
  }
  if (!bankSection) {
    return NextResponse.json({ deck: { cards: [] }, reason: 'no_bank_coverage' })
  }

  const cards = await drawFlashcardBank({
    family: bankFamily,
    section: bankSection,
    count: DECK_SIZE,
    studentId: user.id,
    topicId: session.topic_id,
    seed: `session:${session.id}`,
  })
  const deck: Deck = { cards }

  // Energy was already spent above and this row is what a resume reads. If
  // it silently fails the deck is a ghost — gone on refresh — and the
  // student pays a second energy for the redraw.
  const { error: cacheErr } = await dbAdmin
    .from('study_messages')
    .insert({
      session_id: sessionId,
      role: 'assistant',
      content: CACHED_DECK_MARKER + JSON.stringify(deck),
      model: 'flashcard-bank',
    })
  if (cacheErr) {
    console.error('[flashcards/generate] deck cache write failed', { sessionId, studentId: user.id, error: cacheErr })
  }

  return NextResponse.json({ deck, cached: false })
}
