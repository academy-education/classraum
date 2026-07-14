import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Flashcard bank draw — the flashcard analogue of drawBankPractice.
 *
 * Serves cards from the pre-generated study_flashcard_bank instead of
 * AI-generating them: zero token cost, and every card has a stable
 * identity (its `front`) so review progress is trackable.
 *
 * "Seen" tracking reuses study_flashcard_reviews (the SM-2 table): a
 * card the student has ever rated has a row there, keyed by
 * (student, topic, card_front). Draw order is unseen-first (varied by a
 * seeded per-card hash so decks differ across sessions), then already-
 * reviewed cards recycled oldest-reviewed-first once the unseen pool
 * runs dry. The pool per section is small, so we load it whole and rank
 * in memory.
 */

export interface FlashcardBankCard { front: string; back: string; hint: string | null }

/** Deterministic 32-bit FNV-1a hash — stable seeded ordering with no RNG. */
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export async function drawFlashcardBank(opts: {
  section: 'math' | 'reading_writing'
  count: number
  studentId: string
  topicId: string | null
  seed: string
}): Promise<FlashcardBankCard[]> {
  const { section, count, studentId, topicId, seed } = opts

  const { data: cards } = await supabaseAdmin
    .from('study_flashcard_bank')
    .select('front, back, hint')
    .eq('family', 'sat')
    .eq('section', section)
    .eq('archived', false)
  if (!cards || cards.length === 0) return []

  // Which fronts has this student already reviewed for this topic?
  const seenAt = new Map<string, string>() // front -> last_reviewed_at (may be '')
  if (topicId) {
    const { data: reviews } = await supabaseAdmin
      .from('study_flashcard_reviews')
      .select('card_front, last_reviewed_at')
      .eq('student_id', studentId)
      .eq('topic_id', topicId)
    for (const r of reviews ?? []) {
      seenAt.set(r.card_front as string, (r.last_reviewed_at as string) ?? '')
    }
  }

  const unseen = cards.filter(c => !seenAt.has(c.front as string))
  const seen = cards.filter(c => seenAt.has(c.front as string))

  // Unseen first, seeded-shuffled; then recycle oldest-reviewed first.
  unseen.sort((a, b) => hashStr(seed + a.front) - hashStr(seed + b.front))
  seen.sort((a, b) => {
    const av = seenAt.get(a.front as string) ?? ''
    const bv = seenAt.get(b.front as string) ?? ''
    return av < bv ? -1 : av > bv ? 1 : 0
  })

  return [...unseen, ...seen].slice(0, count).map(c => ({
    front: c.front as string,
    back: c.back as string,
    hint: (c.hint as string | null) ?? null,
  }))
}
