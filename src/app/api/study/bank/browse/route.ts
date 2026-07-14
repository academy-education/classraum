import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * GET /api/study/bank/browse — read-only library view of the verified
 * SAT bank so students can browse everything, not just what a session
 * draws. RLS denies students direct access to study_item_bank /
 * study_flashcard_bank, so this reads via the service role and returns
 * only display-safe fields.
 *
 * Query params:
 *   section : 'math' | 'reading_writing'   (required)
 *   type    : 'practice' | 'flashcards'    (default 'practice')
 *   page    : 0-based page index           (practice only, default 0)
 *   domain  : optional domain filter       (practice only)
 *
 * Practice is paginated (the pools are large); flashcards are small so
 * the whole section is returned for instant client-side search.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 15

const PAGE_SIZE = 20

interface BankItemJson {
  prompt?: string
  passage?: string
  choices?: string[]
  correct_answer?: string
  explanation?: string
}

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(`bank-browse:user:${user.id}`, { windowMs: 60 * 1000, max: 60 })
  if (blocked) return blocked

  const { searchParams } = new URL(req.url)
  const section = searchParams.get('section')
  if (section !== 'math' && section !== 'reading_writing') {
    return NextResponse.json({ error: 'section must be math or reading_writing' }, { status: 400 })
  }
  const type = searchParams.get('type') === 'flashcards' ? 'flashcards' : 'practice'

  if (type === 'flashcards') {
    const { data, error } = await supabaseAdmin
      .from('study_flashcard_bank')
      .select('front, back, hint, domain, difficulty')
      .eq('family', 'sat')
      .eq('section', section)
      .eq('archived', false)
      .order('domain', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const items = (data ?? []).map(r => ({
      front: r.front as string,
      back: r.back as string,
      hint: (r.hint as string | null) ?? null,
      domain: (r.domain as string | null) ?? null,
      difficulty: (r.difficulty as string | null) ?? null,
    }))
    return NextResponse.json({ type, section, items, total: items.length })
  }

  // Practice — paginated over the verified pool.
  const page = Math.max(0, Number(searchParams.get('page')) || 0)
  const domain = searchParams.get('domain')

  let base = supabaseAdmin
    .from('study_item_bank')
    .select('id, item, domain, difficulty', { count: 'exact' })
    .eq('family', 'sat')
    .eq('section', section)
    .eq('verified', true)
    .eq('archived', false)
  if (domain) base = base.eq('domain', domain)

  const { data, count, error } = await base
    .order('domain', { ascending: true })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = (data ?? []).map(r => {
    const it = (r.item ?? {}) as BankItemJson
    return {
      id: r.id as string,
      prompt: it.passage ? `${it.passage.trim()}\n\n${(it.prompt ?? '').trim()}` : (it.prompt ?? ''),
      choices: Array.isArray(it.choices) ? it.choices : [],
      correct_answer: it.correct_answer ?? '',
      explanation: it.explanation ?? '',
      domain: (r.domain as string | null) ?? null,
      difficulty: (r.difficulty as string | null) ?? null,
    }
  })

  // Distinct domains for the filter chips (cheap: the domain set is tiny).
  const { data: domainRows } = await supabaseAdmin
    .from('study_item_bank')
    .select('domain')
    .eq('family', 'sat')
    .eq('section', section)
    .eq('verified', true)
    .eq('archived', false)
  const domains = Array.from(new Set((domainRows ?? []).map(d => d.domain as string).filter(Boolean))).sort()

  return NextResponse.json({
    type, section, items,
    total: count ?? items.length,
    page, pageSize: PAGE_SIZE, domains,
  })
}
