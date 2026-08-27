import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/app/api/admin/_lib/admin-auth'
import { progressFor, overallProgress, type HumanEvidence } from '@/lib/study/bank-targets'
import {
  pooledAcrossReviewers, reviewerAgreement,
  type AgreementPair, type Slot, type Verdict,
} from '@/lib/study/item-review'

/**
 * LIVE bank state for /admin/bank-qc — read from the database, every time.
 *
 * ── Why this route exists ────────────────────────────────────────────
 * The dashboard rendered `scripts/study-bank/ledger.json`, a checked-in
 * file last edited by hand. It has no `fetch`, no `useState`, no
 * `useEffect` — it is a static render of one snapshot of 1 batch and 13
 * audited cohorts. Meanwhile the bank holds 3,369 items and
 * study_item_attacks holds the real measurements, and the page could
 * see neither.
 *
 * So "is this cohort ready?" was unanswerable from the screen, which is
 * exactly the complaint. Two things are returned here, because
 * readiness and provenance are different questions:
 *
 *   cohorts    — WHAT STATE each domain is in: how many items, how many
 *                measured, the blind score, and a status that treats
 *                UNMEASURED as its own thing rather than as passing.
 *   provenance — HOW the items were made: authoring cohort, hand vs
 *                generated, the method recorded on the items themselves,
 *                and the measured quality of that batch.
 *
 * ── The rule this route is built around ──────────────────────────────
 * `study_item_bank.verified` is TRUE for 3,365 of 3,369 items and means
 * only that the answer key was checked. It is NOT evidence an item
 * requires its own passage or audio, and it is deliberately never
 * surfaced here as readiness — reading it that way is the mistake that
 * let a bank with a 100%-blind cohort look fully verified.
 */
export const dynamic = 'force-dynamic'

/*
 * Paginated reads. PostgREST silently caps a response at 1000 rows, and
 * a truncated read here would under-report both item counts and
 * coverage — i.e. make the bank look BETTER than it is, which is the
 * one direction this page must never fail in.
 *
 * Written as two concrete functions rather than one generic helper so
 * the table names stay literal and keep their generated types.
 */
/**
 * PAGES IN PARALLEL, NOT ONE AFTER ANOTHER.
 *
 * Measured 2026-08-27: the bank is 4,970 rows, so the sequential loop was
 * five round-trips that each waited on the last — 3,729ms, and the single
 * slowest thing in the admin panel. Counting first and fetching the pages
 * together does the identical work in 947ms.
 *
 * IT KEEPS THE SEQUENTIAL LOOP'S GUARANTEE. The old loop stopped when a
 * page came back short, which is self-correcting if rows are inserted
 * mid-read. A count taken up front is not: a row added between the count
 * and the fetch would fall past the last page and vanish. So if the final
 * page comes back FULL — meaning the bank grew — this keeps paging
 * sequentially until it sees a short one, exactly as before.
 *
 * The ORDER BY id below is what makes parallel ranges legitimate at all;
 * see the comment on it. Without a total order these would be five
 * independent scans rather than five windows onto one.
 */
async function readBank() {
  const select = () =>
    dbAdmin
      .from('study_item_bank')
      .select('id, family, domain, source, cohort, created_at, verify_meta, item, archived')
      /*
       * ORDER BY id — the pagination is worthless without it.
       *
       * `.range()` is OFFSET/LIMIT. Postgres makes no ordering promise
       * for a query with no ORDER BY, so two successive .range() calls
       * are two independent scans: a row can appear in both windows or
       * in neither, and the loop's `data.length < 1000` stop condition
       * cannot tell. A dropped row makes the bank SMALLER and its
       * measured coverage HIGHER — i.e. it makes the bank look better
       * than it is, the one direction this page must never fail in.
       *
       * `id` is the primary key, so it is a TOTAL order: no ties, no
       * ambiguity left for the planner to resolve differently between
       * pages. A non-unique sort column (created_at, cohort) would not
       * be enough — rows sharing a value could still be re-ordered
       * between the two scans.
       */
      .order('id', { ascending: true })

  const { count, error: countError } = await dbAdmin
    .from('study_item_bank')
    .select('id', { count: 'exact', head: true })
  if (countError) throw new Error(`study_item_bank count: ${countError.message}`)

  const pages = Math.max(1, Math.ceil((count ?? 0) / 1000))
  const settled = await Promise.all(
    Array.from({ length: pages }, (_, i) => select().range(i * 1000, i * 1000 + 999)),
  )

  const out: BankRow[] = []
  for (const { data, error } of settled) {
    if (error) throw new Error(`study_item_bank: ${error.message}`)
    out.push(...((data ?? []) as unknown as BankRow[]))
  }

  // The bank grew while we were reading it. Fall back to the old
  // stop-on-short-page walk for whatever landed past the counted end.
  if ((settled[settled.length - 1]?.data ?? []).length === 1000) {
    for (let from = pages * 1000; ; from += 1000) {
      const { data, error } = await select().range(from, from + 999)
      if (error) throw new Error(`study_item_bank: ${error.message}`)
      out.push(...((data ?? []) as unknown as BankRow[]))
      if (!data || data.length < 1000) break
    }
  }
  return out
}

async function readAttacks() {
  const out: AttackRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await dbAdmin
      /* FRESH only (migration 077): an attack whose item has changed
       * since measured different text. Five items were repointed today
       * — their question was replaced — and without this the dashboard
       * would keep showing a blind score for a question the item no
       * longer asks. Same reasoning as 076 for reviews. */
      .from('study_item_attacks_fresh')
      .select('item_id, run_id, solvers, correct, attacked_at')
      /* Same reason as readBank: unordered .range() is not pagination.
       * The view exposes the row `id`, which is unique, so this is a
       * total order. Losing an attack row here silently drops an item
       * from `measured` — the coverage denominator on the finish bar. */
      .order('id', { ascending: true })
      .range(from, from + 999)
    if (error) throw new Error(`study_item_attacks: ${error.message}`)
    out.push(...((data ?? []) as unknown as AttackRow[]))
    if (!data || data.length < 1000) break
  }
  return out
}

interface BankRow {
  id: string; family: string | null; domain: string | null; source: string | null
  cohort: string | null; created_at: string; verify_meta: Record<string, unknown> | null
  item: Record<string, unknown> | null; archived: boolean
}
interface AttackRow {
  item_id: string; run_id: string; solvers: number; correct: number; attacked_at: string
}

type Status = 'ready' | 'spot-checked' | 'guessable' | 'badly-guessable' | 'unmeasured' | 'not-applicable'

/** Below this share of a cohort measured, a GOOD score is a spot check
 *  and not a verdict. See statusFor for why the rule is asymmetric. */
const MEANINGFUL_COVERAGE = 0.2

/**
 * A cohort's status from its blind score AND how much of it was seen.
 *
 * ── The asymmetry is the point ───────────────────────────────────────
 * A BAD sample proves a problem: if 12 of 12 sampled items are solvable
 * with the source withheld, the cohort has a defect regardless of the
 * other 200. So a failing score is reported as failing at any coverage.
 *
 * A GOOD sample proves nothing of the kind. 12 clean items out of 234
 * is a spot check, and calling it "Ready" is exactly the sample-to-
 * population leap that let "SAT Math is fixed" be said out loud when
 * only 96 repaired items had been re-measured and the rest scored 100%.
 *
 * So `ready` requires BOTH a low score and meaningful coverage;
 * otherwise a good score reads `spot-checked`, which is what it is.
 */
function statusFor(measured: number, blindPct: number | null, cohortSize: number): Status {
  if (measured === 0 || blindPct === null) return 'unmeasured'
  if (blindPct >= 85) return 'badly-guessable'
  if (blindPct >= 60) return 'guessable'
  const coverage = cohortSize === 0 ? 0 : measured / cohortSize
  return coverage >= MEANINGFUL_COVERAGE ? 'ready' : 'spot-checked'
}

/**
 * How many items are LIVE in the bank, right now.
 *
 * ── Why this exists as its own query ─────────────────────────────────
 * The headline on /admin/bank-qc ("Everything else — unverified") was a
 * hardcoded 3,387 in bank-register.ts while the panel two screens down
 * read 3,377 off this route. One page, two totals for one bank, and the
 * literal was the bigger of the two — the flattering direction.
 *
 * A literal cannot be kept in step by discipline; it drifts the moment
 * a cohort is archived. So the headline is derived instead, and this is
 * the cheap way to derive it: `head: true` with an exact count runs a
 * COUNT in Postgres and returns NO rows, so it is immune to PostgREST's
 * 1000-row cap. Counting in SQL, not by fetching rows — the failure
 * CLAUDE.md records as a verifier reporting "0 problems" off a
 * truncated read.
 *
 * `.not('archived', 'is', true)` is the SAME live predicate the full
 * payload applies in JS (`.filter(i => !i.archived)`): archived rows
 * out, a NULL treated as live. Verified equal in SQL (3,377 both ways)
 * on 2026-08-24.
 */
async function countLiveItems(): Promise<number> {
  const { count, error } = await dbAdmin
    .from('study_item_bank')
    .select('id', { count: 'exact', head: true })
    .not('archived', 'is', true)
  if (error) throw new Error(`study_item_bank count: ${error.message}`)
  return count ?? 0
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    /*
     * `?only=totals` — the headline card's read.
     *
     * The full payload below pages the whole bank and every attack row
     * to build per-cohort state. The card at the top of the page needs
     * one integer, and rendering it from a second full read would double
     * a multi-thousand-row scan on every page load. Same source, same
     * predicate, one COUNT.
     */
    if (new URL(request.url).searchParams.get('only') === 'totals') {
      return NextResponse.json({
        generatedAt: new Date().toISOString(),
        totals: { items: await countLiveItems() },
      })
    }

    const live = (await readBank()).filter(i => !i.archived)
    const attacks = await readAttacks()

    // Latest attack per item — a repaired item should report its
    // post-repair number while its history stays on the table.
    const latest = new Map<string, { solvers: number; correct: number; at: string; run: string }>()
    for (const a of attacks) {
      const prev = latest.get(a.item_id)
      if (!prev || a.attacked_at > prev.at) {
        latest.set(a.item_id, { solvers: a.solvers, correct: a.correct, at: a.attacked_at, run: a.run_id })
      }
    }

    const agg = <K extends string>(keyOf: (i: typeof live[number]) => K) => {
      const m = new Map<K, {
        items: number; measured: number; picks: number; correct: number
        allSolversGotIt: number; mc: number
      }>()
      for (const i of live) {
        const k = keyOf(i)
        const e = m.get(k) ?? { items: 0, measured: 0, picks: 0, correct: 0, allSolversGotIt: 0, mc: 0 }
        e.items++
        // Whether the attack even APPLIES: an item with no choices has
        // nothing to withhold, so counting it as unmeasured would make
        // free-response cohorts look permanently behind.
        if (Array.isArray((i.item as { choices?: unknown[] })?.choices)) e.mc++
        const a = latest.get(i.id)
        if (a) {
          e.measured++
          e.picks += a.solvers
          e.correct += a.correct
          if (a.correct === a.solvers) e.allSolversGotIt++
        }
        m.set(k, e)
      }
      return m
    }

    /*
     * HUMAN evidence, per domain.
     *
     * A model's blind score is where the investigation starts. Four
     * sittings on 2026-08-06 showed the model attack is trustworthy
     * where a cohort's tell is structural and inflated where the item
     * carries a passage it happens to know about — Announcement was
     * rated 100% by every solver and a person scored 15%. Until this
     * landed, the bar put 1,746 items in a red "too guessable" segment
     * on model evidence alone.
     *
     * Aggregated across runs and reviewers deliberately: two people
     * reviewing the same cohort is more evidence, not less. Per-reviewer
     * scores stay separate in the review panel itself, where
     * disagreement between them is the signal.
     */
    const humanByDomain = new Map<string, HumanEvidence>()
    const agreementByDomain = new Map<string, AgreementPair[]>()
    {
      /*
       * Paginated with .range(), NOT .limit(5000).
       *
       * PostgREST caps a response at 1000 rows and .limit() above that
       * does not lift it — it silently returns 1000. A verifier in this
       * repo already reported "0 problems" from a bank truncated that
       * way, having never loaded the rows carrying the defect. There are
       * 72 review rows today so the cap is not biting yet; the point of
       * fixing it now is that it would start biting invisibly, on a
       * number this dashboard presents as a verdict.
       */
      const reviews: Array<{
        item_id: string; reviewer_id: string; key_slot: string
        blind_pick: string | null; verdict: string | null
      }> = []
      let droppedRows = 0
      for (let from = 0; ; from += 1000) {
        const { data, error } = await dbAdmin
          /* The FRESH view (migration 076): a review whose item has been
           * edited since no longer describes that item, and must not be
           * counted as human evidence. Stale rows stay in the table as
           * history — they are what you read to ask whether a repair
           * changed anything — but they are not evidence about today. */
          .from('study_item_reviews_fresh')
          .select('item_id, reviewer_id, key_slot, blind_pick, verdict, blind_at')
          .not('blind_at', 'is', null)
          /*
           * HUMAN ONLY. On 2026-08-06 forty reviews were entered with
           * ChatGPT answering, and the human column is worth exactly one
           * thing: being the number a model did NOT produce. Unfiltered,
           * SAT Craft and Structure rendered "CONFIRMED BROKEN — both
           * instruments agree" off blind 97.4% + "human" 100%, which is a
           * model agreeing with itself about 211 items.
           */
          .eq('reviewer_kind', 'human')
          /*
           * item_id FIRST for readability, `id` as the tiebreaker.
           *
           * item_id alone is NOT unique here — two reviewers on the
           * same item is the design of this table — so ordering by it
           * leaves ties, and Postgres may break a tie differently on
           * the page-2 scan than it did on page 1. That is the same
           * skip/duplicate hazard as an unordered .range(), just harder
           * to see. Adding the unique `id` makes the order total.
           */
          .order('item_id', { ascending: true })
          .order('id', { ascending: true })
          .range(from, from + 999)
        if (error || !data?.length) break
        /*
         * A VIEW types every column nullable, because Postgres cannot
         * promise otherwise. Narrowing rather than casting: a row
         * missing an id, a reviewer or a key slot cannot be scored, and
         * coercing it would put a `null` reviewer into the agreement
         * pairing where it would silently become its own "reviewer".
         *
         * `dropped` is counted and logged rather than ignored — it
         * should always be 0, and if it ever is not, that is a schema
         * problem worth seeing rather than a row worth skipping.
         */
        for (const r of data) {
          if (!r.item_id || !r.reviewer_id || !r.key_slot) { droppedRows++; continue }
          reviews.push({
            item_id: r.item_id,
            reviewer_id: r.reviewer_id,
            key_slot: r.key_slot,
            blind_pick: r.blind_pick,
            verdict: r.verdict,
          })
        }
        if (data.length < 1000) break
      }
      if (droppedRows > 0) {
        console.warn(`[bank-qc] ${droppedRows} review row(s) missing item_id/reviewer_id/key_slot — not scored`)
      }

      const domainOf = new Map(live.map(i => [i.id, i.domain ?? '?']))
      const byDomainRows = new Map<string, typeof reviews>()
      for (const r of reviews) {
        const d = domainOf.get(r.item_id)
        if (!d) continue
        if (!byDomainRows.has(d)) byDomainRows.set(d, [])
        byDomainRows.get(d)!.push(r)
      }

      for (const [d, rows] of byDomainRows) {
        /*
         * Deduplicated by ITEM before scoring.
         *
         * Two reviewers on the same item is the design — it is how a
         * one-person finding gets confirmed — but counting that item
         * twice inflates `answered` and shrinks the apparent error bar
         * on evidence that was never independent. With a single
         * reviewer this was a no-op, so the defect could not show up
         * until the moment the instrument actually scaled.
         *
         * The overlap is not discarded: it feeds the agreement figures
         * below, which is the thing a second reviewer is FOR.
         */
        const shaped = rows.map(r => ({
          itemId: r.item_id,
          reviewerId: r.reviewer_id,
          keySlot: r.key_slot as Slot,
          blindPick: (r.blind_pick ?? null) as Slot | null,
          answered: true,
          verdict: (r.verdict ?? null) as Verdict | null,
          realism: null,
        }))
        const { score } = pooledAcrossReviewers(shaped)
        humanByDomain.set(d, {
          answered: score.answered,
          correct: score.correct,
          // Passed so progressFor can refuse to CLEAR a cohort on a
          // sitting the reader abstained through — see ABSTENTION_CEILING.
          cantTell: score.cantTell,
          // Best fixed-SLOT strategy over the same deduplicated rows.
          // Scoring a human against a flat 25% would credit or punish
          // them for a shuffle they did not choose.
          controlBest: score.controlPct === null
            ? 0
            : Math.round((score.controlPct / 100) * score.answered),
        })
        const pairs = reviewerAgreement(shaped).filter(p => p.shared > 0)
        if (pairs.length) agreementByDomain.set(d, pairs)
      }
    }

    const byDomain = agg(i => `${i.family ?? '?'}|${i.domain ?? '?'}`)
    const cohorts = [...byDomain.entries()].map(([k, e]) => {
      const [family, domain] = k.split('|')
      const blindPct = e.picks > 0 ? Math.round((1000 * e.correct) / e.picks) / 10 : null
      /*
       * Progress is judged over the MULTIPLE-CHOICE population, not the
       * whole cohort. The attack shuffles options and withholds a
       * source, so an item with no options is not outstanding work —
       * it is out of scope, and counting it as unfinished would park
       * the finish bar permanently below 100%.
       */
      const human = humanByDomain.get(domain) ?? null
      const prog = e.mc === 0
        ? { state: 'not-applicable' as const, target: null, remaining: '' }
        : progressFor(domain, e.mc, e.measured, blindPct, human)
      return {
        family, domain,
        items: e.items,
        multipleChoice: e.mc,
        measured: e.measured,
        unmeasured: e.items - e.measured,
        blindPct,
        /*
         * Whether that percentage DESCRIBES THE ITEMS.
         *
         * Standard English Conventions measured 52.8% and reads like a
         * middling score. It is not one: the attack withholds a SOURCE,
         * and a conventions item carries its sentence in the stem, so
         * there is nothing to withhold — the same reason 848 maths items
         * scored "100% blind" and were briefly reported as the bank's
         * worst cohorts (see bank-targets.ts). The number is real; what
         * it measures is the solver, not the item.
         *
         * Kept on the payload rather than nulled, because deleting a
         * measurement to avoid misreading it is its own kind of lie.
         * The UI renders it as not-judgeable and puts the raw figure in
         * the title.
         */
        judgeable: prog.state !== 'not-applicable',
        human,
        everySolverGotIt: e.allSolversGotIt,
        // A cohort with no MC items cannot be attacked at all; say so
        // rather than showing it as work outstanding forever.
        status: e.mc === 0 ? ('not-applicable' as Status) : statusFor(e.measured, blindPct, e.mc),
        // What "finished" means for THIS task type, and what is left.
        progress: prog.state,
        target: prog.target,
        remaining: prog.remaining,
      }
    }).sort((a, b) => b.items - a.items)

    /*
     * The finish bar. Every attackable item lands in exactly one bucket,
     * so the four counts sum to `total` and the bar cannot show progress
     * that has not happened.
     *
     * `unmeasured` is its own segment rather than being folded into
     * failing: we do not know those items are bad, and claiming we do
     * would be the same overreach in the opposite direction.
     */
    const bar = { done: 0, tooEasy: 0, unconfirmed: 0, humanCleared: 0, tooHard: 0, spotChecked: 0, unmeasured: 0 }
    for (const c of cohorts) {
      if (c.progress === 'not-applicable') continue
      if (c.progress === 'done') bar.done += c.multipleChoice
      else if (c.progress === 'too-easy') bar.tooEasy += c.multipleChoice
      else if (c.progress === 'unconfirmed') bar.unconfirmed += c.multipleChoice
      else if (c.progress === 'human-cleared') bar.humanCleared += c.multipleChoice
      else if (c.progress === 'too-hard') bar.tooHard += c.multipleChoice
      else if (c.progress === 'spot-checked') bar.spotChecked += c.multipleChoice
      else bar.unmeasured += c.multipleChoice
    }
    const overall = overallProgress(
      cohorts.map(c => ({ domain: c.domain, items: c.multipleChoice, measured: c.measured, blindPct: c.blindPct, human: c.human })),
    )

    const byCohort = agg(i => i.cohort ?? '(none)')
    const provenance = [...byCohort.entries()].map(([cohort, e]) => {
      const members = live.filter(i => (i.cohort ?? '(none)') === cohort)
      const first = members[0]
      const vm = (first?.verify_meta ?? {}) as Record<string, unknown>
      const blindPct = e.picks > 0 ? Math.round((1000 * e.correct) / e.picks) / 10 : null
      return {
        cohort,
        source: first?.source ?? null,
        // The authoring METHOD as recorded on the items themselves —
        // this is the "how was it made" the page never showed.
        method: (vm.method as string) ?? (vm.harvested_from ? `harvested: ${vm.harvested_from}` : null),
        verifyMetaKeys: [...new Set(members.flatMap(m => Object.keys(m.verify_meta ?? {})))].sort(),
        items: e.items,
        created: members.map(m => m.created_at).sort()[0]?.slice(0, 10) ?? null,
        measured: e.measured,
        blindPct,
        status: statusFor(e.measured, blindPct, e.items),
      }
    }).sort((a, b) => b.items - a.items)

    const runs = [...new Set(attacks.map(a => a.run_id))].map(run => {
      const rows = attacks.filter(a => a.run_id === run)
      const picks = rows.reduce((n, r) => n + r.solvers, 0)
      const correct = rows.reduce((n, r) => n + r.correct, 0)
      return {
        runId: run,
        items: rows.length,
        solvers: rows[0]?.solvers ?? 0,
        blindPct: picks > 0 ? Math.round((1000 * correct) / picks) / 10 : null,
        at: rows.map(r => r.attacked_at).sort().at(-1)?.slice(0, 10) ?? null,
      }
    }).sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      totals: {
        items: live.length,
        measured: live.filter(i => latest.has(i.id)).length,
        unmeasured: live.filter(i => !latest.has(i.id)).length,
      },
      finish: { ...bar, total: overall.total, pct: overall.pct },
      /* Per-cohort reviewer agreement. Empty until a second person
       * reviews an item someone else already did — which is the point:
       * an empty array here is the honest statement that every human
       * number on this page rests on one reader. */
      agreement: [...agreementByDomain.entries()].map(([domain, pairs]) => ({ domain, pairs })),
      cohorts,
      provenance,
      runs,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
