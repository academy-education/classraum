import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/app/api/admin/_lib/admin-auth'
import {
  dealSlots, dealItem, groupRuns, readRun, reviewerAgreement,
  SLOTS, type Slot,
} from '@/lib/study/item-review'

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

/*
 * Reviews that still describe their item — migration 076.
 *
 * SCORING reads this; the draw and resume paths read the table. The
 * split is deliberate. `item_sha` is stamped when a row is INSERTED,
 * i.e. when the sample is drawn, so an item edited between the draw and
 * the answer makes that row stale. Freshness should decide whether a
 * review counts as EVIDENCE, not whether a reviewer can find the
 * sitting they are halfway through — routing resume through the view
 * would strand them mid-sample with no way back.
 */
const freshReviews = () => dbAdmin.from('study_item_reviews_fresh')

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

  /*
   * Paginated with .range(). The previous `.limit(5000)` carried a
   * comment claiming it defeated PostgREST's cap — it does not. The cap
   * is 1000 and .limit() above it returns 1000 silently, so the comment
   * asserted the opposite of what the line did. There are 72 rows today;
   * this would have started truncating scores without any error.
   *
   * Reads the FRESH view, so a review whose item has been edited since
   * stops counting toward any score on this page.
   */
  const rowsAll: ReviewRecord[] = []
  for (let from = 0; ; from += 1000) {
    const q = freshReviews()
      .select('run_id, reviewer_id, item_id, key_slot, blind_pick, blind_at, verdict, realism, note, reviewed_at')
      .order('run_id', { ascending: false })
      .range(from, from + 999)
    const { data, error } = runId ? await q.eq('run_id', runId) : await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data?.length) break
    rowsAll.push(...(data as ReviewRecord[]))
    if (data.length < 1000) break
  }

  /*
   * Grouped by run AND reviewer, not by run alone.
   *
   * Two people reviewing the same sample is the point — agreement
   * between them is the signal. Grouping by run_id only would average
   * their blind picks into a single score, which is not a measurement
   * of anybody: reviewer A scoring 90% and reviewer B scoring 30% would
   * print as one tidy 60% that neither of them produced, and the
   * disagreement — the most informative thing in the run — would be the
   * part that got destroyed. The view in migration 075 groups by both;
   * this now matches it.
   */
  const runs = groupRuns(rowsAll.map(r => ({
    runId: r.run_id,
    reviewerId: r.reviewer_id,
    keySlot: r.key_slot as Slot,
    blindPick: (r.blind_pick as Slot | null) ?? null,
    answered: r.blind_at !== null,
    verdict: r.verdict,
    realism: r.realism,
  }))).map(g => ({
    runId: g.runId,
    reviewerId: g.reviewerId,
    isMine: g.reviewerId === admin.userId,
    ...g.score,
    ...readRun(g.score, PUBLISHED_MARGIN),
  }))

  /*
   * The reviewer's own unfinished sitting, so the client can drop back
   * into it after a reload.
   *
   * Without this the panel forgot the run on refresh and the default
   * run name is `<cohort>-<today>` — so pressing Start the next day drew
   * a SECOND sample while the first one's unanswered items sat stranded.
   * Silently splitting one sitting into two partial runs destroys the
   * fixed denominator that the draw-before-you-look design exists to
   * protect.
   */
  const { data: open } = await reviews()
    .select('run_id')
    .eq('reviewer_id', admin.userId)
    .is('blind_at', null)
    .order('run_id', { ascending: false })
    .limit(1).maybeSingle()

  /*
   * Pairwise agreement, across reviewers, on the items they BOTH saw.
   *
   * This is what a second reviewer is for, and it is not extra sample
   * size. Every human number in this project comes from one person —
   * Choose a Response at 55.0% blind against a 25.0% control — and with
   * one reader there is no way to tell a property of the ITEMS from a
   * habit of that reader. Two readers on the same items decide it.
   *
   * Keyed on item, so it only reports where sittings actually overlap.
   * An empty array is the honest state of the evidence today.
   */
  const agreement = reviewerAgreement(rowsAll
    .filter(r => r.blind_at !== null)
    .map(r => ({
      itemId: r.item_id,
      reviewerId: r.reviewer_id,
      keySlot: r.key_slot as Slot,
      blindPick: (r.blind_pick as Slot | null) ?? null,
      answered: true,
      verdict: r.verdict,
      realism: r.realism,
    }))).filter(p => p.shared > 0)

  return NextResponse.json({
    publishedMargin: PUBLISHED_MARGIN,
    runs,
    agreement,
    openRun: (open as { run_id: string } | null)?.run_id ?? null,
  })
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

  /*
   * ── mirrorOf: sit SOMEONE ELSE'S run, item for item ─────────────────
   *
   * Register item B1 is "one OVERLAPPING sitting by a second reviewer",
   * and until this existed the route could not produce one: the normal
   * path shuffles the cohort and takes a fresh random slice, so two
   * reviewers drawing the same domain overlap only by luck. A second
   * sitting on DIFFERENT items cannot answer B1's question, which is
   * whether the 55% is a property of the items or a habit of the reader.
   *
   * The mirror copies item_id, shown_order AND key_slot unchanged.
   * Re-dealing would be worse, not fairer: reviewerAgreement compares
   * `a.blindPick === b.blindPick`, which are SLOT letters, so under two
   * different shuffles "both picked B" would mean two different options
   * and every agreement number would be noise. Identical presentation
   * holds everything constant except the person, which is the one
   * variable B1 is trying to isolate.
   */
  if (body.mirrorOf) {
    const source = String(body.mirrorOf)

    const { data: srcRows, error: srcErr } = await reviews()
      .select('item_id, reviewer_id, shown_order, key_slot, blind_at')
      .eq('run_id', source)
    if (srcErr) return NextResponse.json({ error: srcErr.message }, { status: 500 })
    if (!srcRows?.length) {
      return NextResponse.json({ error: `No run called "${source}".` }, { status: 404 })
    }

    /*
     * THE GUARD THAT MATTERS. All 72 reviews on this project were sat by
     * one account, and the obvious move — "let the second person use the
     * account that already has the reviews" — produces a run whose rows
     * carry the SAME reviewer_id. reviewerAgreement groups by reviewer,
     * so it would see one reviewer, compute no pair, and B1 would return
     * nothing while looking like it had run. Refuse it in code rather
     * than in a document nobody reads at the keyboard.
     */
    const owners = new Set(srcRows.map(r => r.reviewer_id as string))
    if (owners.has(admin.userId)) {
      return NextResponse.json({
        error: `You already sat "${source}". A mirror has to be a DIFFERENT person — `
          + `same account means one reviewer_id, and agreement between a reviewer and `
          + `themselves is not a measurement. Sign in as the second reviewer.`,
      }, { status: 409 })
    }

    // Mirroring a half-finished run silently shrinks the overlap.
    const unanswered = srcRows.filter(r => !r.blind_at).length
    if (unanswered && !body.force) {
      return NextResponse.json({
        error: `"${source}" is only ${srcRows.length - unanswered}/${srcRows.length} answered. `
          + `Mirroring it now would compare against a partial sitting. Pass force to do it anyway.`,
      }, { status: 409 })
    }

    // Same rule the normal path applies: an abandoned half-run reports a
    // denominator nobody actually sat.
    const { data: myOpen } = await reviews()
      .select('run_id').eq('reviewer_id', admin.userId).is('blind_at', null)
      .order('run_id', { ascending: false }).limit(1).maybeSingle()
    if (myOpen && !body.force) {
      return NextResponse.json({
        error: `"${(myOpen as { run_id: string }).run_id}" is still open — finish it before starting a mirror.`,
        openRun: (myOpen as { run_id: string }).run_id,
      }, { status: 409 })
    }

    const runId = String(body.runId || `${source}-mirror`)
    const rows = srcRows.map(r => ({
      item_id: r.item_id,
      run_id: runId,
      reviewer_id: admin.userId,
      shown_order: r.shown_order,
      key_slot: r.key_slot,
    }))

    const { error: insErr } = await reviews().insert(rows)
    if (insErr) {
      if (insErr.code === '23505') {
        return NextResponse.json(
          { error: `"${runId}" has already been drawn for you.` }, { status: 409 })
      }
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }
    return NextResponse.json({ runId, drawn: rows.length, mirrorOf: source })
  }

  const domain = String(body.domain ?? '')
  const size = Math.min(50, Math.max(4, Number(body.size) || 12))
  if (!domain) return NextResponse.json({ error: 'domain is required' }, { status: 400 })

  /*
   * Refuse to open a second sitting while one is unfinished.
   *
   * Resuming (see GET's `openRun`) makes an interrupted sitting
   * recoverable; this makes an abandoned one impossible. They are
   * different guarantees and both are needed: without this, a reviewer
   * who reloads and clicks Start on a new day silently draws a fresh
   * 12 and orphans the old 11, and the two partial runs each report a
   * denominator that is not the sample anybody actually sat.
   */
  const { data: unfinished } = await reviews()
    .select('run_id')
    .eq('reviewer_id', admin.userId)
    .is('blind_at', null)
    .order('run_id', { ascending: false })
    .limit(1).maybeSingle()
  if (unfinished && !body.force) {
    const open = (unfinished as { run_id: string }).run_id
    return NextResponse.json(
      {
        error: `"${open}" is still open — finish it before drawing another sample, or it becomes a partial run that no longer represents its cohort.`,
        openRun: open,
      },
      { status: 409 },
    )
  }

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
