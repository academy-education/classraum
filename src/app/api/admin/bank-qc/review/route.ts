import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/app/api/admin/_lib/admin-auth'
import { dealSlots, dealItem, scoreRun, readRun, SLOTS, type Slot, type ReviewRow } from '@/lib/study/item-review'

/**
 * Human two-phase item review for /admin/bank-qc.
 *
 * ── The rule this route is built around ──────────────────────────────
 * A phase-1 response MUST NOT contain the stimulus or the key slot.
 *
 * Not "the UI doesn't render them" — not present in the JSON at all.
 * A reviewer with devtools open is not a hypothetical adversary here;
 * they are the person whose number we are about to stake the bank's QC
 * on, and a blind score they could have peeked at is unfalsifiable
 * afterwards. The reveal is a SEPARATE round trip that the server only
 * answers once the blind pick is recorded.
 *
 * The same reasoning is why phase 1 immutability lives in a database
 * trigger (migration 075) rather than in this file: a route can be
 * bypassed by the next script someone writes.
 */
export const dynamic = 'force-dynamic'

/** ETS reply items score +25.5 over their own control. Anything at or
 *  above that is leaking as badly as nothing at all. */
const PUBLISHED_MARGIN = 25.5

const reviews = () => dbAdmin.from('study_item_reviews')

interface ReviewRecord {
  run_id: string
  reviewer_id: string
  item_id: string
  key_slot: Slot
  blind_pick: Slot | null
  blind_at: string | null
  verdict: 'unique' | 'alternative' | 'broken' | null
  realism: 'authentic' | 'artificial' | null
  note: string | null
  reviewed_at: string | null
  shown_order: number[]
}

interface BankItem {
  id: string
  domain: string
  item: { passage?: string; prompt?: string; choices?: string[]; correct_answer?: string }
}

/** GET ?runId=… — results for a sitting. Safe to call at any time; it
 *  returns judgements, never unanswered items' keys. */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const runId = request.nextUrl.searchParams.get('runId')

  /*
   * ?runId=…&next=1 — the next unanswered item, as a BLIND payload.
   *
   * Returns the four options in their presented order and nothing else.
   * No stimulus, no prompt, no key slot, no item metadata that could
   * hint at either. If a field here would let a reviewer infer the
   * answer, the blind number it produces is worthless.
   */
  if (runId && request.nextUrl.searchParams.get('next')) {
    const { data: row, error: rowErr } = await reviews()
      .select('item_id, shown_order')
      .eq('run_id', runId).eq('reviewer_id', admin.userId)
      .is('blind_at', null)
      .limit(1).maybeSingle()
    if (rowErr) return NextResponse.json({ error: rowErr.message }, { status: 500 })
    if (!row) return NextResponse.json({ done: true })

    const { data: item, error: itemErr } = await dbAdmin
      .from('study_item_bank').select('item').eq('id', row.item_id).single()
    if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })

    const choices = (item as { item: BankItem['item'] }).item?.choices ?? []
    return NextResponse.json({
      itemId: row.item_id,
      options: (row.shown_order as number[]).map(i => choices[i] ?? ''),
    })
  }

  const q = reviews()
    .select('run_id, reviewer_id, item_id, key_slot, blind_pick, blind_at, verdict, realism, note, reviewed_at')
    .order('run_id', { ascending: false })
    .limit(5000)   // explicit: PostgREST silently caps at 1000
  const { data, error } = runId ? await q.eq('run_id', runId) : await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rowsAll = (data ?? []) as ReviewRecord[]
  const byRun = new Map<string, ReviewRecord[]>()
  for (const r of rowsAll) {
    if (!byRun.has(r.run_id)) byRun.set(r.run_id, [])
    byRun.get(r.run_id)!.push(r)
  }

  const runs = [...byRun.entries()].map(([id, rows]) => {
    const scored = scoreRun(rows.map((r): ReviewRow => ({
      keySlot: r.key_slot as Slot,
      blindPick: (r.blind_pick as Slot | null) ?? null,
      answered: r.blind_at !== null,
      verdict: r.verdict,
      realism: r.realism,
    })))
    return { runId: id, ...scored, ...readRun(scored, PUBLISHED_MARGIN) }
  })

  return NextResponse.json({ publishedMargin: PUBLISHED_MARGIN, runs })
}

/**
 * POST — draw a random sample and open a sitting.
 * body: { domain: string, size?: number, runId?: string }
 *
 * Rows are written BEFORE anything is shown, so the denominator is
 * fixed in advance and a flattering subset cannot be selected after the
 * fact. Skipped rows stay on the table and stay in `drawn`.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const domain = String(body.domain ?? '')
  const size = Math.min(50, Math.max(4, Number(body.size) || 12))
  if (!domain) return NextResponse.json({ error: 'domain is required' }, { status: 400 })

  const { data: pool, error: poolErr } = await dbAdmin
    .from('study_item_bank')
    .select('id, domain, item')
    .eq('domain', domain)
    .neq('archived', true)
    .limit(5000)
  if (poolErr) return NextResponse.json({ error: poolErr.message }, { status: 500 })

  // Only 4-option items with a locatable key can be reviewed this way.
  // Excluded ones are COUNTED and returned — a silently shrunk pool is
  // how a sample stops representing the cohort.
  const usable = (pool ?? []).filter((r) => {
    const it = (r as BankItem).item
    return Array.isArray(it?.choices) && it.choices.length === 4
      && typeof it.correct_answer === 'string'
      && it.choices.indexOf(it.correct_answer) >= 0
  }) as BankItem[]

  if (usable.length < size) {
    return NextResponse.json(
      { error: `Only ${usable.length} reviewable items in "${domain}" (need ${size}).` },
      { status: 400 },
    )
  }

  const rand = Math.random
  const shuffled = [...usable]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const sample = shuffled.slice(0, size)
  const slots = dealSlots(size, rand)

  const runId = String(body.runId || `${domain.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}`)

  const rows = sample.map((it, i) => {
    const keyIndex = it.item.choices!.indexOf(it.item.correct_answer!)
    const { shownOrder, keySlot } = dealItem(4, keyIndex, slots[i], rand)
    return {
      item_id: it.id,
      run_id: runId,
      reviewer_id: admin.userId,
      shown_order: shownOrder,
      key_slot: keySlot,
    }
  })

  const { error: insErr } = await reviews().insert(rows)
  if (insErr) {
    /*
     * Distinguish "already drawn" from "the insert broke".
     *
     * This originally returned 409 with "use a different run name" for
     * ANY insert error. Before migration 075 was applied the table did
     * not exist, so two live POSTs reported a duplicate sitting when
     * the real fault was a missing relation — a wrong diagnosis
     * delivered confidently, which is worse than a raw error.
     *
     * 23505 is the unique violation and only that means the run id was
     * already used; re-drawing would replace a sample the reviewer had
     * started, so it is refused rather than upserted.
     */
    if (insErr.code === '23505') {
      return NextResponse.json(
        { error: `"${runId}" has already been drawn for you. Use a different run name for a fresh sample.` },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { error: `Could not open "${runId}": ${insErr.message}${insErr.code ? ` (${insErr.code})` : ''}` },
      { status: 500 },
    )
  }

  return NextResponse.json({
    runId,
    drawn: rows.length,
    poolSize: usable.length,
    excluded: (pool ?? []).length - usable.length,
  })
}

/**
 * PATCH — advance one review by exactly one phase.
 *
 *   { runId, itemId, phase: 'blind',  pick: 'A'|'B'|'C'|'D'|null }
 *   { runId, itemId, phase: 'reveal', verdict, realism, note? }
 *
 * The blind response carries the reveal payload, and nothing before it
 * does. `pick: null` is an explicit "can't tell" and is recorded as an
 * answer, not as an abstention — abstaining must not be able to improve
 * a score.
 */
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { runId, itemId, phase } = body
  if (!runId || !itemId) return NextResponse.json({ error: 'runId and itemId are required' }, { status: 400 })

  const key = { run_id: String(runId), item_id: String(itemId), reviewer_id: admin.userId }

  if (phase === 'blind') {
    const pick = body.pick === null || body.pick === undefined ? null : String(body.pick)
    if (pick !== null && !SLOTS.includes(pick as Slot)) {
      return NextResponse.json({ error: `pick must be A-D or null, got ${pick}` }, { status: 400 })
    }

    // The trigger in 075 rejects a second write; this filter makes the
    // first-write case a clean 409 rather than a 500 from the database.
    const { data: updated, error } = await reviews()
      .update({ blind_pick: pick, blind_at: new Date().toISOString() })
      .match(key).is('blind_at', null)
      .select('item_id, key_slot, shown_order')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!updated) {
      return NextResponse.json({ error: 'Already answered — phase 1 is sealed.' }, { status: 409 })
    }

    // Only NOW does the server part with the answer.
    const { data: item } = await dbAdmin
      .from('study_item_bank').select('item').eq('id', updated.item_id).single()
    const it = (item as { item: BankItem['item'] } | null)?.item
    const shown = (updated.shown_order as number[]).map(i => it?.choices?.[i] ?? '')
    return NextResponse.json({
      reveal: {
        stimulus: it?.passage ?? '',
        prompt: it?.prompt ?? '',
        options: shown,
        keySlot: updated.key_slot,
        wasCorrect: pick !== null && pick === updated.key_slot,
      },
    })
  }

  if (phase === 'reveal') {
    const { verdict, realism, note } = body
    if (!['unique', 'alternative', 'broken'].includes(verdict)) {
      return NextResponse.json({ error: `bad verdict: ${verdict}` }, { status: 400 })
    }
    if (!['authentic', 'artificial'].includes(realism)) {
      return NextResponse.json({ error: `bad realism: ${realism}` }, { status: 400 })
    }
    const { data, error } = await reviews()
      .update({ verdict, realism, note: note ? String(note).slice(0, 2000) : null, reviewed_at: new Date().toISOString() })
      .match(key).not('blind_at', 'is', null)
      .select('item_id').maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Answer phase 1 first.' }, { status: 409 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: `unknown phase: ${phase}` }, { status: 400 })
}
