import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/app/api/admin/_lib/admin-auth'
import {
  applyHardeningEdit, canHarden, hardeningHint, stringChoices,
  type BankItemJson, type HardeningEditInput,
} from '@/lib/study/hardening'

/**
 * The co-founder hardening pass for /admin/bank-qc (tab "Hardening").
 *
 * GET  ?index=N  — the N-th open candidate, with its grader votes and a hint.
 * POST           — save an edit. STAGES a new row; never touches the live one.
 *
 * ── The rule this route exists to keep ───────────────────────────────
 * A save must not go live. It calls study_item_hardening_stage (migration
 * 124), which inserts a NEW bank row with verified=false — the assembler
 * ignores it — linked to the original, and queues it. Only
 * scripts/study-bank/hardening-gate.ts, after the per-family checks and a
 * with-source grade at the staged row's exact content, may swap it in.
 *
 * super_admin only. requireAdmin also admits `admin`; this tool writes bank
 * content, so it narrows further and says so with a 403 rather than a 401.
 *
 * The expected content_sha comes from the client because it is what the
 * editor LOOKED at; the database compares it to the live row and refuses a
 * stale tab (409). The original's sha is never trusted for anything else.
 */
export const dynamic = 'force-dynamic'

const OPEN = ['queued', 'in_gate', 'passed'] as const

interface CandidateRow {
  item_id: string
  family: string
  section: string
  domain: string
  subskill: string | null
  priority: number
  hard_votes: number
  total_votes: number
  votes: unknown
  signals: string[]
  item_sha: string
}

interface BankRow {
  id: string
  family: string
  section: string
  domain: string
  subskill: string | null
  difficulty: string
  cohort: string | null
  passage_group_id: string | null
  verified: boolean
  archived: boolean
  content_sha: string | null
  item: BankItemJson
}

const BANK_COLS = 'id, family, section, domain, subskill, difficulty, cohort, passage_group_id, verified, archived, content_sha, item'

async function guard(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!canHarden(admin.role)) {
    return { error: NextResponse.json({ error: 'Hardening edits are limited to super admins.' }, { status: 403 }) }
  }
  return { admin }
}

/** Every candidate row, paged past PostgREST's 1000-row cap on a total order. */
async function allCandidates(): Promise<CandidateRow[]> {
  const out: CandidateRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await dbAdmin.from('study_item_hardening_candidates')
      .select('item_id, family, section, domain, subskill, priority, hard_votes, total_votes, votes, signals, item_sha')
      .order('priority', { ascending: true })
      .order('hard_votes', { ascending: false })
      .order('item_id', { ascending: true })
      .range(from, from + 999)
    if (error) throw new Error(`candidates: ${error.message}`)
    out.push(...((data ?? []) as CandidateRow[]))
    if (!data || data.length < 1000) break
  }
  return out
}

async function passageShared(row: BankRow): Promise<boolean> {
  if (!row.passage_group_id) return false
  const { count, error } = await dbAdmin.from('study_item_bank')
    .select('id', { count: 'exact', head: true })
    .eq('passage_group_id', row.passage_group_id)
    .eq('archived', false)
    .neq('id', row.id)
  if (error) throw new Error(`passage group: ${error.message}`)
  // Unknown is treated as shared: refusing a passage edit is recoverable,
  // silently forking a set's passage is not.
  return typeof count !== 'number' || count > 0
}

export async function GET(request: NextRequest) {
  const g = await guard(request)
  if (g.error) return g.error

  try {
    const candidates = await allCandidates()
    const { data: openEdits, error: editErr } = await dbAdmin.from('study_item_hardening_edits')
      .select('id, original_id, staged_id, status, editor_id, changed_fields, note, gate_result, updated_at')
      .in('status', [...OPEN, 'failed', 'swapped'])
      .order('updated_at', { ascending: false })
      .limit(1000)
    if (editErr) throw new Error(`edits: ${editErr.message}`)
    const edits = openEdits ?? []
    const blocked = new Set(edits.filter(e => e.status !== 'failed' && e.status !== 'queued').map(e => e.original_id))

    // Candidates whose item is still live and still the text the votes
    // describe. A changed item's votes are about other text — hidden, and
    // counted so the denominator stays honest.
    const ids = candidates.map(c => c.item_id)
    const live = new Map<string, BankRow>()
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await dbAdmin.from('study_item_bank').select(BANK_COLS).in('id', ids.slice(i, i + 200))
      if (error) throw new Error(`bank: ${error.message}`)
      for (const r of (data ?? []) as unknown as BankRow[]) live.set(r.id, r)
    }
    let staleVotes = 0
    const open = candidates.filter(c => {
      const r = live.get(c.item_id)
      if (!r || !r.verified || r.archived) return false
      if (r.content_sha !== c.item_sha) { staleVotes++; return false }
      return !blocked.has(c.item_id)
    })

    const index = Math.max(0, Math.min(Number(request.nextUrl.searchParams.get('index') ?? 0) || 0, Math.max(0, open.length - 1)))
    const c = open[index]
    const counts = {
      candidates: candidates.length,
      open: open.length,
      staleVotes,
      queued: edits.filter(e => e.status === 'queued').length,
      inGate: edits.filter(e => e.status === 'in_gate').length,
      passed: edits.filter(e => e.status === 'passed').length,
      swapped: edits.filter(e => e.status === 'swapped').length,
      failed: edits.filter(e => e.status === 'failed').length,
    }
    if (!c) return NextResponse.json({ counts, index: 0, item: null })

    const row = live.get(c.item_id)!
    const queued = edits.find(e => e.original_id === row.id && e.status === 'queued') ?? null
    let staged: BankItemJson | null = null
    if (queued) {
      const { data } = await dbAdmin.from('study_item_bank').select('item').eq('id', queued.staged_id).maybeSingle()
      staged = ((data as { item?: BankItemJson } | null)?.item) ?? null
    }
    const lastFailed = edits.find(e => e.original_id === row.id && e.status === 'failed') ?? null

    return NextResponse.json({
      counts,
      index,
      item: {
        id: row.id,
        family: row.family,
        section: row.section,
        domain: row.domain,
        subskill: row.subskill,
        difficulty: row.difficulty,
        cohort: row.cohort,
        sha: row.content_sha,
        passageShared: await passageShared(row),
        passage: row.item.passage ?? null,
        prompt: String(row.item.prompt ?? ''),
        choices: stringChoices(row.item),
        correctAnswer: String(row.item.correct_answer ?? ''),
        explanation: String(row.item.explanation ?? ''),
        hasGraphic: row.item.graphic != null,
        votes: c.votes,
        hardVotes: c.hard_votes,
        totalVotes: c.total_votes,
        signals: c.signals,
        hint: hardeningHint(row.family, row.section, row.domain, row.subskill),
        queuedEdit: queued ? { id: queued.id, note: queued.note, changed: queued.changed_fields, staged } : null,
        lastFailed: lastFailed ? { id: lastFailed.id, result: lastFailed.gate_result } : null,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

interface SaveBody extends HardeningEditInput {
  itemId?: string
  expectedSha?: string
  note?: string
}

export async function POST(request: NextRequest) {
  const g = await guard(request)
  if (g.error) return g.error
  const admin = g.admin!

  let body: SaveBody
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body.itemId || typeof body.itemId !== 'string') return NextResponse.json({ error: 'itemId required' }, { status: 400 })
  if (!body.expectedSha || typeof body.expectedSha !== 'string') return NextResponse.json({ error: 'expectedSha required' }, { status: 400 })

  const { data, error } = await dbAdmin.from('study_item_bank').select(BANK_COLS).eq('id', body.itemId).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const row = data as unknown as BankRow | null
  if (!row) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  if (!row.verified || row.archived) return NextResponse.json({ error: 'Only a live item can be hardened.' }, { status: 409 })
  if (row.content_sha !== body.expectedSha) {
    return NextResponse.json({ error: 'This item changed since you opened it. Reload before editing.' }, { status: 409 })
  }

  let shared: boolean
  try { shared = await passageShared(row) } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
  const applied = applyHardeningEdit(row.item, {
    prompt: body.prompt, passage: body.passage, choices: body.choices,
    correctIndex: body.correctIndex, explanation: body.explanation,
  }, { passageShared: shared })
  if (!applied.ok) return NextResponse.json({ error: applied.error }, { status: 400 })

  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 2000) : null
  const { data: editId, error: rpcErr } = await dbAdmin.rpc('study_item_hardening_stage', {
    p_original: row.id,
    p_item: applied.item as never,
    p_editor: admin.userId,
    p_expected_sha: body.expectedSha,
    p_changed: applied.changed,
    p_note: note,
  })
  if (rpcErr) {
    const code = (rpcErr as { code?: string }).code
    const status = code === '40001' || code === '55006' ? 409 : code === '22023' ? 400 : code === 'P0002' ? 404 : 500
    return NextResponse.json({ error: rpcErr.message }, { status })
  }
  return NextResponse.json({ editId, status: 'queued', changed: applied.changed, live: false })
}
