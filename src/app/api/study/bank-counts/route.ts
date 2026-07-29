import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * GET /api/study/bank-counts?family=sat|toefl&section=math|reading_writing|reading
 *
 * Returns how many practice questions + flashcards are available for a
 * section, so the topic-page mode cards can show "N questions" / "N
 * cards". Practice is bank-backed for SAT (math, reading_writing) and
 * TOEFL Reading; flashcards are SAT-only. Families/sections without a
 * bank return 0 and the cards render "coming soon" instead.
 *
 * Counts mirror what the draw actually serves: practice = verified,
 * un-archived multiple-choice items (drawBankPractice); flashcards =
 * un-archived cards (drawFlashcardBank).
 */
export const dynamic = 'force-dynamic'

// Family → sections that have a practice-question bank today.
const PRACTICE_SECTIONS: Record<string, string[]> = {
  sat: ['math', 'reading_writing'],
  // 'writing' has no practice-question bank; it is here because it has a
  // FLASHCARD deck, and this route reports both counts. The practice
  // count comes back 0 and the mode card renders accordingly.
  toefl: ['reading', 'writing'],
}

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response

  const family = req.nextUrl.searchParams.get('family') ?? 'sat'
  const section = req.nextUrl.searchParams.get('section') ?? ''
  if (!PRACTICE_SECTIONS[family]?.includes(section)) {
    return NextResponse.json({ error: 'unsupported family/section for practice bank' }, { status: 400 })
  }

  const [practice, flashcards] = await Promise.all([
    dbAdmin
      .from('study_item_bank')
      .select('*', { count: 'exact', head: true })
      .eq('family', family).eq('section', section)
      .eq('item_type', 'multiple_choice').eq('verified', true).eq('archived', false),
    // Flashcards: SAT math / reading_writing, plus the TOEFL Writing
    // usage deck. Listening and Speaking have none by design — see the
    // note in the flashcards route.
    dbAdmin
      .from('study_flashcard_bank')
      .select('*', { count: 'exact', head: true })
      .eq('family', family).eq('section', section)
      .eq('verified', true).eq('archived', false),
  ])

  return NextResponse.json({
    practice: practice.count ?? 0,
    flashcards: flashcards.count ?? 0,
  })
}
