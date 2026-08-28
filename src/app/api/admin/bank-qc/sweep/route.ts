import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/app/api/admin/_lib/admin-auth'
import {
  sweepSha, sweepTotals, noteRequired, VERDICTS,
  type SweepVerdict,
} from '@/lib/study/item-sweep'

/**
 * The open item sweep for /admin/bank-qc — every item in a family, with
 * its key and rationale showing, and one verdict per item per reviewer.
 *
 * ── Why this route shows the key, when the review route hides it ─────
 * They measure different things. /bank-qc/review withholds the stimulus
 * because a blind pick the reviewer could have peeked at is
 * unfalsifiable afterwards. Here the reviewer is asked "is this key
 * uniquely defensible, does it fit the grade, would you put it on a
 * form" — questions that are unanswerable WITHOUT the key. There is
 * nothing to withhold, so nothing is.
 *
 * The two must not be run by the same person on the same items in the
 * wrong order; that is a scheduling concern, and the review route's
 * blind rows are immutable precisely so it cannot be undone silently.
 */
export const dynamic = 'force-dynamic'

const FAMILIES = ['ssat', 'isee'] as const

interface BankRow {
  id: string
  family: string
  section: string
  domain: string | null
  subskill: string | null
  difficulty: string | null
  cohort: string | null
  passage_group_id: string | null
  item: {
    passage?: string | null
    prompt?: string | null
    choices?: string[] | null
    correct_answer?: string | null
    explanation?: string | null
    distractor_rationales?: unknown[] | null
  }
}

/*
 * Paginated read. PostgREST silently caps a response at 1000 rows, and
 * this bank is already past that. A truncated read here would drop
 * items off the end of the sweep while reporting a complete-looking
 * denominator — i.e. it would say "everything reviewed" about a cohort
 * whose tail was never on screen. That exact failure has happened on
 * this project before (a verifier reported "0 problems" over a bank
 * truncated at 1000 rows), which is why this is a loop and not a
 * .select() with a limit.
 */
async function allRows(families: readonly string[]): Promise<BankRow[]> {
  const rows: BankRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await dbAdmin
      .from('study_item_bank')
      .select('id,family,section,domain,subskill,difficulty,cohort,passage_group_id,item')
      .in('family', families as string[])
      .eq('archived', false)
      .eq('verified', true)
      .order('family').order('section').order('id')
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...((data ?? []) as unknown as BankRow[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

/** GET — the whole sweep: every item, plus this reviewer's verdicts. */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const famParam = request.nextUrl.searchParams.get('family')
  const families: readonly string[] =
    famParam && (FAMILIES as readonly string[]).includes(famParam) ? [famParam] : FAMILIES

  try {
    const rows = await allRows(families)

    const items = rows.map(r => ({
      id: r.id,
      family: r.family,
      section: r.section,
      skill: r.subskill || r.domain || '',
      difficulty: r.difficulty || '',
      cohort: r.cohort || '',
      passageGroupId: r.passage_group_id,
      passage: r.item.passage ?? null,
      prompt: r.item.prompt ?? '',
      choices: r.item.choices ?? [],
      correctAnswer: r.item.correct_answer ?? '',
      explanation: r.item.explanation ?? '',
      distractorRationales: (r.item.distractor_rationales ?? []).map(d =>
        typeof d === 'string' ? d : JSON.stringify(d)),
      sha: sweepSha(r.item),
    }))

    /*
     * Every reviewer's verdicts, not just the caller's. Two people
     * disagreeing about one item is the most informative thing this
     * table can produce, and it is invisible if the route only ever
     * returns your own row.
     */
    const { data: vRows, error: vErr } = await dbAdmin
      .from('study_item_sweep_verdicts')
      .select('item_id,reviewer_id,verdict,note,item_sha,updated_at')
      .in('item_id', items.map(i => i.id))
    if (vErr) throw new Error(vErr.message)

    const shaById = new Map(items.map(i => [i.id, i.sha]))
    const verdicts = (vRows ?? []).map(v => ({
      itemId: v.item_id as string,
      reviewerId: v.reviewer_id as string,
      mine: v.reviewer_id === admin.userId,
      verdict: v.verdict as SweepVerdict,
      note: (v.note as string | null) ?? '',
      itemSha: v.item_sha as string,
      stale: shaById.get(v.item_id as string) !== v.item_sha,
      updatedAt: v.updated_at as string,
    }))

    return NextResponse.json({
      reviewerId: admin.userId,
      items,
      verdicts,
      totals: sweepTotals(items, verdicts.filter(v => v.mine), shaById),
      generatedAt: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load sweep' },
      { status: 500 },
    )
  }
}

/** POST { itemId, verdict, note } — record or replace the caller's call. */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { itemId?: string; verdict?: string; note?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }

  const { itemId, note } = body
  const verdict = body.verdict as SweepVerdict | undefined
  if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })

  // Clearing a verdict is a real action — a reviewer who marked the wrong
  // row needs a way back that is not "mark it keep and hope".
  if (verdict === undefined || verdict === null || (verdict as string) === '') {
    const { error } = await dbAdmin.from('study_item_sweep_verdicts')
      .delete().eq('item_id', itemId).eq('reviewer_id', admin.userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, cleared: true })
  }

  if (!VERDICTS.includes(verdict)) {
    return NextResponse.json({ error: `verdict must be one of ${VERDICTS.join(', ')}` }, { status: 400 })
  }
  if (noteRequired(verdict) && !String(note ?? '').trim()) {
    return NextResponse.json(
      { error: `a ${verdict} needs a note saying what is wrong — that note is what gets acted on` },
      { status: 400 },
    )
  }

  /*
   * The sha is read from the bank HERE rather than accepted from the
   * client. A client-supplied sha would let a stale tab stamp a verdict
   * with the hash of text nobody is looking at any more, which defeats
   * the entire point of storing one.
   */
  const { data: row, error: rErr } = await dbAdmin
    .from('study_item_bank').select('item').eq('id', itemId).single()
  if (rErr || !row) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

  const { error } = await dbAdmin.from('study_item_sweep_verdicts').upsert({
    item_id: itemId,
    reviewer_id: admin.userId,
    verdict,
    note: String(note ?? '').trim() || null,
    item_sha: sweepSha(row.item as Record<string, never>),
  }, { onConflict: 'item_id,reviewer_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
