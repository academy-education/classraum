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
async function readBank() {
  const out: BankRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await dbAdmin
      .from('study_item_bank')
      .select('id, family, domain, source, cohort, created_at, verify_meta, item, archived')
      .range(from, from + 999)
    if (error) throw new Error(`study_item_bank: ${error.message}`)
    out.push(...((data ?? []) as unknown as BankRow[]))
    if (!data || data.length < 1000) break
  }
  return out
}

async function readAttacks() {
  const out: AttackRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await dbAdmin
      .from('study_item_attacks')
      .select('item_id, run_id, solvers, correct, attacked_at')
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

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
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
      for (let from = 0; ; from += 1000) {
        const { data, error } = await dbAdmin
          .from('study_item_reviews')
          .select('item_id, reviewer_id, key_slot, blind_pick, verdict, blind_at')
          .not('blind_at', 'is', null)
          .order('item_id', { ascending: true })
          .range(from, from + 999)
        if (error || !data?.length) break
        reviews.push(...data)
        if (data.length < 1000) break
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
