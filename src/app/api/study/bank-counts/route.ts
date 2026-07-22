import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * GET /api/study/bank-counts?section=math|reading_writing
 *
 * Returns how many practice questions + flashcards are available for a
 * section, so the topic-page mode cards can show "N questions" / "N
 * cards". Practice + flashcards are bank-backed and SAT-only today, so
 * this counts the SAT banks; other families have no practice/flashcard
 * bank and the cards render "coming soon" instead.
 *
 * Counts mirror what the draw actually serves: practice = verified,
 * un-archived multiple-choice items (drawBankPractice); flashcards =
 * un-archived cards (drawFlashcardBank).
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response

  const section = req.nextUrl.searchParams.get('section')
  if (section !== 'math' && section !== 'reading_writing') {
    return NextResponse.json({ error: 'section must be math or reading_writing' }, { status: 400 })
  }

  const [practice, flashcards] = await Promise.all([
    supabaseAdmin
      .from('study_item_bank')
      .select('*', { count: 'exact', head: true })
      .eq('family', 'sat').eq('section', section)
      .eq('item_type', 'multiple_choice').eq('verified', true).eq('archived', false),
    supabaseAdmin
      .from('study_flashcard_bank')
      .select('*', { count: 'exact', head: true })
      .eq('family', 'sat').eq('section', section).eq('archived', false),
  ])

  return NextResponse.json({
    practice: practice.count ?? 0,
    flashcards: flashcards.count ?? 0,
  })
}
