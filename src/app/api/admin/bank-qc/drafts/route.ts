import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/app/api/admin/_lib/admin-auth'
import type { TablesUpdate } from '@/lib/database.types'
import {
  DRAFT_COHORT_LIKE, planSave, planSkip, summarise, isDraftRow, draftMeta, draftStatus,
  type DraftRow, type Plan, type SaveRequest,
} from '@/lib/study/ssat-draft'

/**
 * SSAT reading drafts for /admin/bank-qc?tab=drafts.
 * Contract: scripts/study-bank/SSAT-DRAFT-EDIT-CONTRACT.md.
 *
 *   GET                 list draft passages (summaries)
 *   GET ?group=<id>     one passage, every item, with its QC
 *   POST {action:'save', group, passage?, note?, items:[...]}
 *   POST {action:'skip', group}
 *
 * Every read and write is scoped to family=ssat, section=reading,
 * cohort LIKE 'ssat-reading-draft-%', verified=false, archived=false — in
 * the query AND re-checked on the rows (isDraftRow), so a filter typo
 * cannot widen it. Writes carry the same filters plus the content_sha the
 * editor loaded, so a row that stopped being a draft, or changed under the
 * editor, is not written. No write here ever sets verified or archived;
 * the plans in lib/study/ssat-draft.ts cannot express either.
 */
export const dynamic = 'force-dynamic'

const COLS = 'id, family, section, cohort, verified, archived, passage_group_id, content_sha, item, verify_meta, created_at'

function draftQuery() {
  return dbAdmin.from('study_item_bank').select(COLS)
    .eq('family', 'ssat').eq('section', 'reading')
    .like('cohort', DRAFT_COHORT_LIKE)
    .eq('verified', false).eq('archived', false)
}

async function loadGroup(group: string): Promise<{ rows: DraftRow[] } | { error: string }> {
  // Read the WHOLE group without the draft filters, so a group that mixes a
  // non-draft row in is refused rather than silently edited in part.
  const { data, error } = await dbAdmin.from('study_item_bank').select(COLS)
    .eq('passage_group_id', group)
    .order('created_at', { ascending: true }).order('id', { ascending: true })
  if (error) return { error: error.message }
  return { rows: (data ?? []) as unknown as DraftRow[] }
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const group = request.nextUrl.searchParams.get('group')
  if (group) {
    const loaded = await loadGroup(group)
    if ('error' in loaded) return NextResponse.json({ error: loaded.error }, { status: 500 })
    const { rows } = loaded
    if (!rows.length) return NextResponse.json({ error: 'No rows in that passage group' }, { status: 404 })
    if (rows.some(r => !isDraftRow(r))) return NextResponse.json({ error: 'Not a draft passage' }, { status: 403 })
    return NextResponse.json({
      group,
      cohort: rows[0].cohort,
      passage: rows.find(r => r.item?.passage)?.item?.passage ?? '',
      items: rows.map(r => {
        const m = draftMeta(r)
        return {
          id: r.id,
          sha: r.content_sha ?? null,
          status: draftStatus(r),
          prompt: r.item?.prompt ?? '',
          choices: Array.isArray(r.item?.choices) ? r.item!.choices : [],
          correctAnswer: r.item?.correct_answer ?? '',
          explanation: r.item?.explanation ?? '',
          subskill: (r.item as { subskill?: string } | null)?.subskill ?? null,
          qc: m.qc ?? null,
          hasOriginal: !!m.original_item,
          editedAt: m.edited_at ?? null,
          editNote: m.edit_note ?? null,
        }
      }),
    })
  }

  // Paged AND ordered: PostgREST caps at 1000 and range() without order() is not paging.
  const rows: DraftRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await draftQuery().order('id', { ascending: true }).range(from, from + 999)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    rows.push(...((data ?? []) as unknown as DraftRow[]))
    if (!data || data.length < 1000) break
  }
  const passages = summarise(rows)
  const counts = { awaiting_edit: 0, edited: 0, skipped: 0 }
  for (const p of passages) counts[p.status]++
  return NextResponse.json({ passages, counts, rows: rows.length })
}

async function apply(plan: Extract<Plan, { ok: true }>): Promise<{ written: string[]; failed: { id: string; error: string }[] }> {
  const written: string[] = []
  const failed: { id: string; error: string }[] = []
  for (const u of plan.updates) {
    // The patch type has no verified/archived field by construction; the cast
    // only bridges our item interface to the generated Json type.
    const patch = { ...u.patch, updated_at: new Date().toISOString() } as unknown as TablesUpdate<'study_item_bank'>
    let q = dbAdmin.from('study_item_bank')
      .update(patch)
      .eq('id', u.id)
      .eq('family', 'ssat').eq('section', 'reading')
      .like('cohort', DRAFT_COHORT_LIKE)
      .eq('verified', false).eq('archived', false)
    if (u.expectedSha) q = q.eq('content_sha', u.expectedSha)
    const { data, error } = await q.select('id')
    if (error) failed.push({ id: u.id, error: /duplicate key/i.test(error.message) ? 'This text is identical to another question already in the bank' : error.message })
    else if (!data || data.length !== 1) failed.push({ id: u.id, error: 'Changed by someone else since you opened it, or no longer a draft. Reload the passage.' })
    else written.push(u.id)
  }
  return { written, failed }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const action = body?.action
  const group = typeof body?.group === 'string' ? body.group : ''
  if (action !== 'save' && action !== 'skip') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  if (!group) return NextResponse.json({ error: 'group is required' }, { status: 400 })

  const loaded = await loadGroup(group)
  if ('error' in loaded) return NextResponse.json({ error: loaded.error }, { status: 500 })

  const plan = action === 'skip'
    ? planSkip(loaded.rows, group)
    : planSave(loaded.rows, {
        group,
        passage: typeof body.passage === 'string' ? body.passage : undefined,
        note: typeof body.note === 'string' ? body.note : undefined,
        items: Array.isArray(body.items) ? (body.items as SaveRequest['items']) : [],
      }, { userId: admin.userId, now: new Date().toISOString() })
  if (!plan.ok) return NextResponse.json({ error: plan.error, details: plan.details }, { status: plan.status })

  const { written, failed } = await apply(plan)
  if (failed.length) {
    return NextResponse.json({ error: `${failed.length} of ${plan.updates.length} question(s) were not saved`, written, failed }, { status: 409 })
  }
  return NextResponse.json({ ok: true, action, written: written.length, changed: plan.changed })
}
