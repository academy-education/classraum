"use client"

import React from 'react'
import { ReviewPanel } from './ReviewPanel'
import { ItemSweepPanel } from './ItemSweepPanel'

/*
 * The Supabase client is imported DYNAMICALLY, inside the effect, not at
 * module scope.
 *
 * BankQcDashboard renders this component, and its jest suite imports the
 * dashboard. A static `import { db } from '@/lib/supabase'` pulls the
 * client — and its ESM dependencies — into that module graph at import
 * time, and the suite dies before collecting a single test. It then
 * reports "1 failed suite" next to a fully green test count, which is
 * the failure shape CLAUDE.md calls out: a suite that dies at import
 * collects zero tests and the other suites' passes hide it.
 *
 * Deferring the import keeps the graph clean for anything that only
 * renders this component, and the client is only needed once the effect
 * actually runs in a browser.
 */

/**
 * The LIVE half of /admin/bank-qc.
 *
 * Everything else on that page renders `scripts/study-bank/ledger.json`,
 * a checked-in file someone updates by hand. That is a record of QC RUNS
 * and it is genuinely useful history, but it cannot answer "is this
 * cohort ready" because it does not know what is in the bank. This
 * component asks the database, every load.
 *
 * Two tables, because they are two different questions and conflating
 * them is what made the page unreadable:
 *
 *   READINESS  — what state is each cohort in? Crucially, UNMEASURED is
 *                its own status, styled as a warning rather than as a
 *                pass. `study_item_bank.verified` is true for 3,365 of
 *                3,369 items and means only that the answer key was
 *                checked; it is never shown here as readiness.
 *
 *   PROVENANCE — how was each batch made? Source (hand vs generated),
 *                the authoring method recorded on the items themselves,
 *                when, and how that batch actually scored. This is the
 *                "how is each question made" view that did not exist.
 */

interface CohortRow {
  family: string; domain: string; items: number; multipleChoice: number
  measured: number; unmeasured: number; blindPct: number | null
  /** Whether blindPct describes the ITEMS. False where the attack has no
   *  source to withhold — the score then measures the solver. */
  judgeable?: boolean
  everySolverGotIt: number; status: Status
  progress: Progress; target: Target | null; remaining: string
}
type Progress = 'done' | 'too-easy' | 'unconfirmed' | 'human-cleared' | 'too-hard' | 'spot-checked' | 'unmeasured' | 'not-applicable'
interface Target { min: number; max: number; published: number | null; note: string }
interface Finish {
  done: number; tooEasy: number; unconfirmed: number; humanCleared: number
  tooHard: number; spotChecked: number
  unmeasured: number; total: number; pct: number
}
interface ProvenanceRow {
  cohort: string; source: string | null; method: string | null
  verifyMetaKeys: string[]; items: number; created: string | null
  measured: number; blindPct: number | null; status: Status
}
interface RunRow {
  runId: string; items: number; solvers: number; blindPct: number | null; at: string | null
}
type Status = 'ready' | 'spot-checked' | 'guessable' | 'badly-guessable' | 'unmeasured' | 'not-applicable'

interface Live {
  generatedAt: string
  totals: { items: number; measured: number; unmeasured: number }
  finish: Finish
  cohorts: CohortRow[]
  provenance: ProvenanceRow[]
  runs: RunRow[]
}

/**
 * The finish bar.
 *
 * ── The correction of 2026-08-06 ─────────────────────────────────────
 * This bar showed "1,746 too guessable, 0% done" — every measured item
 * in one red segment — on the strength of MODEL solve rates alone.
 *
 * Four human sittings (72 items) then showed the model attack is
 * trustworthy where a cohort's tell is structural and inflated where the
 * item carries a passage it happens to know about:
 *
 *   Announcement       model 100%   human 15.0%  vs a 25% control
 *   Daily Life         model 100%   human 25.0%
 *   Choose a Response  model 100%   human 55.0%   3.1 sd, p<0.001
 *
 * So a model-only "too guessable" is a SUSPICION and gets its own amber
 * segment. Red now means a person reproduced the effect; green includes
 * cohorts a person actively CLEARED. The bar was telling the reader the
 * whole bank was broken on evidence that did not support it.
 *
 * ── What "finished" means, and why it is not one number ──────────────
 * An item is finished when its cohort's BLIND SCORE — how often solvers
 * pick the key with the passage or audio withheld — sits inside the band
 * for that task type, measured over at least 20% of the cohort.
 *
 * The bands live in src/lib/study/bank-targets.ts and differ per task,
 * because official items differ per task: College Board SAT R&W scores
 * 71.6% blind, ETS lectures 96.9%. A single bar across all cohorts was
 * the original mistake — it reported TOEFL lectures as failing when they
 * are the cohort closest to standard.
 *
 * ── Why five segments and not a percentage ───────────────────────────
 * "62% done" hides which 38%. The states are different KINDS of
 * outstanding work and cost different amounts:
 *
 *   too easy      rewrite distractors      expensive, per item
 *   too hard      review — options may be arbitrary
 *   spot-checked  in band, just needs more measuring   cheap
 *   unmeasured    unknown — attack it first            cheap
 *
 * `unmeasured` is deliberately its own segment. Folding it into failing
 * would claim we know those items are bad, which is the same overreach
 * as calling them fine — and the bar's whole job is to not do that.
 */
const SEGMENTS: Array<{
  key: keyof Omit<Finish, 'total' | 'pct'>; state: Progress
  label: string; bar: string; dot: string; blurb: string
}> = [
  { key: 'done', state: 'done', label: 'Finished', bar: 'bg-emerald-500', dot: 'bg-emerald-500',
    blurb: 'Blind score inside the band for its task type, over at least 20% of the cohort.' },
  { key: 'humanCleared', state: 'human-cleared', label: 'Cleared by hand', bar: 'bg-emerald-400', dot: 'bg-emerald-400',
    blurb: 'AI solvers flagged it, but a person could not beat the control across 20+ items — the model score reflected its own world knowledge, not a leak. No rewrite justified on this evidence.' },
  { key: 'spotChecked', state: 'spot-checked', label: 'In band, needs more measuring', bar: 'bg-sky-400', dot: 'bg-sky-400',
    blurb: 'Scoring well, but on too small a sample to claim the cohort. Cheap to close — just attack more items.' },
  { key: 'unmeasured', state: 'unmeasured', label: 'Not measured', bar: 'bg-violet-300', dot: 'bg-violet-300',
    blurb: 'Unknown, not passing. Needs an attack run before anything can be said about it.' },
  { key: 'tooHard', state: 'too-hard', label: 'Below the band', bar: 'bg-orange-400', dot: 'bg-orange-400',
    blurb: 'Harder to guess than intended — distractors may be arbitrary rather than plausible. Needs review.' },
  { key: 'unconfirmed', state: 'unconfirmed', label: 'Model says guessable — unconfirmed', bar: 'bg-amber-400', dot: 'bg-amber-400',
    blurb: 'AI solvers beat the band, but no human sitting has checked it. Three cohorts rated 100% by every solver were then scored at or below chance by a person — so this is a suspicion, not a verdict. 20 items reviewed by hand settles it either way.' },
  { key: 'tooEasy', state: 'too-easy', label: 'Too guessable — confirmed by hand', bar: 'bg-red-500', dot: 'bg-red-500',
    blurb: 'A person reproduced the effect: they picked the key from the options alone, well above that sample\'s own control. The real defect — distractors must be rewritten, per item.' },
]

function FinishBar({ finish, cohorts }: { finish: Finish; cohorts: CohortRow[] }) {
  const [open, setOpen] = React.useState<Progress | null>(null)
  const pctOf = (n: number) => (finish.total === 0 ? 0 : (100 * n) / finish.total)
  /* The headline count must agree with the percentage beside it, and
   * `pct` comes from overallProgress(), which counts human-cleared as
   * finished. Printing bar.done alone rendered "18% — 0 of 1,449", two
   * numbers describing the same thing and disagreeing. */
  const finished = finish.done + finish.humanCleared

  return (
    <div className={`${CARD} p-5`}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-[15px] font-semibold text-gray-900">Bank optimization — how far in</h2>
        <span className="text-[13px] tabular-nums text-gray-500">
          <strong className="text-[19px] text-gray-900 mr-1">{finish.pct}%</strong>
          {finished.toLocaleString()} of {finish.total.toLocaleString()} attackable items finished
        </span>
      </div>

      <div
        className="mt-3 flex h-3.5 w-full overflow-hidden rounded-full bg-gray-100"
        onMouseLeave={() => setOpen(null)}
      >
        {SEGMENTS.map(s => {
          const n = finish[s.key]
          if (n === 0) return null
          return (
            <button
              key={s.key}
              type="button"
              aria-label={`${s.label}: ${n} items`}
              className={`${s.bar} h-full transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 ${
                open && open !== s.state ? 'opacity-40' : ''
              }`}
              style={{ width: `${pctOf(n)}%` }}
              onMouseEnter={() => setOpen(s.state)}
              onFocus={() => setOpen(s.state)}
              onClick={() => setOpen(open === s.state ? null : s.state)}
            />
          )
        })}
      </div>

      {/* The legend is also the hover target — the bar's thin segments are
          hard to hit, and a keyboard user cannot hover at all. */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5" onMouseLeave={() => setOpen(null)}>
        {SEGMENTS.map(s => {
          const n = finish[s.key]
          if (n === 0) return null
          return (
            <button
              key={s.key}
              type="button"
              className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-gray-900 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
              onMouseEnter={() => setOpen(s.state)}
              onFocus={() => setOpen(s.state)}
              onClick={() => setOpen(open === s.state ? null : s.state)}
            >
              <span className={`inline-block h-2 w-2 rounded-full ${s.dot}`} />
              <span>{s.label}</span>
              <span className="tabular-nums text-gray-400">{n.toLocaleString()}</span>
            </button>
          )
        })}
      </div>

      {open && <WhatIsLeft state={open} cohorts={cohorts} />}

      {!open && (
        <p className="mt-3 text-[12px] text-gray-400">
          Hover a segment to see which cohorts are in it and what each one needs.
        </p>
      )}
    </div>
  )
}

/** The hover panel: which cohorts are in this state, and the next
 *  concrete action for each — not a status word the reader has to
 *  translate into work. */
function WhatIsLeft({ state, cohorts }: { state: Progress; cohorts: CohortRow[] }) {
  const seg = SEGMENTS.find(s => s.state === state)
  const rows = cohorts.filter(c => c.progress === state)
    .sort((a, b) => b.multipleChoice - a.multipleChoice)

  return (
    <div className="mt-3 rounded-xl bg-gray-50 ring-1 ring-gray-100 p-3.5">
      <div className="flex items-center gap-1.5">
        <span className={`inline-block h-2 w-2 rounded-full ${seg?.dot}`} />
        <span className="text-[12.5px] font-medium text-gray-900">{seg?.label}</span>
      </div>
      <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">{seg?.blurb}</p>

      <ul className="mt-2.5 space-y-1.5">
        {rows.map(c => (
          <li key={`${c.family}|${c.domain}`} className="text-[12px] leading-relaxed">
            <span className="text-gray-400 uppercase text-[10px] mr-1">{c.family}</span>
            <span className="text-gray-800 font-medium">{c.domain}</span>
            <span className="text-gray-400 tabular-nums ml-1.5">{c.multipleChoice} items</span>
            {c.target && (
              <span className="text-gray-400 tabular-nums ml-1.5">
                · now {c.blindPct === null ? 'unmeasured' : `${c.blindPct}%`}, target {c.target.min}–{c.target.max}%
              </span>
            )}
            {c.remaining && <div className="text-gray-600">{c.remaining}</div>}
            {/* The band's justification travels WITH the number. A target
                the reader has to take on trust is how the lecture cohort
                got held to a reading bar in the first place. */}
            {c.target && <div className="text-gray-400 text-[11px]">{c.target.note}</div>}
          </li>
        ))}
      </ul>
    </div>
  )
}

const STATUS: Record<Status, { label: string; chip: string }> = {
  ready:             { label: 'Ready',             chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  // A clean score on a small sample. Distinct from Ready ON PURPOSE: a
  // good sample does not license a claim about the cohort, and merging
  // the two is how "measured 12 of 234" becomes "this cohort is fine".
  'spot-checked':    { label: 'Spot-checked only', chip: 'bg-sky-50 text-sky-700 ring-sky-200' },
  guessable:         { label: 'Too guessable',     chip: 'bg-amber-50 text-amber-700 ring-amber-200' },
  'badly-guessable': { label: 'Far too guessable', chip: 'bg-red-50 text-red-700 ring-red-200' },
  // Deliberately NOT grey-and-quiet. An unmeasured cohort is unknown, and
  // unknown reading as "fine" is the exact failure this panel exists to
  // stop — 93.7% of the bank is in this state.
  unmeasured:        { label: 'Not measured',      chip: 'bg-violet-50 text-violet-700 ring-violet-200' },
  'not-applicable':  { label: 'N/A — no options',  chip: 'bg-gray-50 text-gray-500 ring-gray-200' },
}

const CARD = 'bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]'

function Chip({ status }: { status: Status }) {
  return (
    <span className={`inline-flex shrink-0 whitespace-nowrap items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${STATUS[status].chip}`}>
      {STATUS[status].label}
    </span>
  )
}

export function LiveBankState() {
  const [data, setData] = React.useState<Live | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { db } = await import('@/lib/supabase')
        const { data: { session } } = await db.auth.getSession()
        const res = await fetch('/api/admin/bank-qc/live', {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        })
        if (!res.ok) throw new Error(`${res.status}`)
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch (e) {
        // Shown, not swallowed. A silent failure here would leave the
        // static ledger below looking like the whole picture, which is
        // the situation this component was added to end.
        if (!cancelled) setError((e as Error).message)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (error) {
    return (
      <div className={`${CARD} p-5 mb-6`}>
        <p className="text-sm text-red-600">Live bank state unavailable ({error}).</p>
        <p className="text-[12.5px] text-gray-500 mt-1">
          Everything below this point is the checked-in ledger file, not the current bank.
        </p>
      </div>
    )
  }

  if (!data) {
    return <div className={`${CARD} p-5 mb-6 animate-pulse h-32`} />
  }

  const pctMeasured = data.totals.items === 0 ? 0
    : Math.round((100 * data.totals.measured) / data.totals.items)

  return (
    <section className="mb-8 space-y-4">
      {data.finish && <FinishBar finish={data.finish} cohorts={data.cohorts} />}

      {/* The one instrument no script here can talk itself into. Only
          cohorts the blind attack applies to — a maths cohort carries
          its whole problem in the stem, so "guess it from the options"
          is not a question about the item. */}
      <ReviewPanel
        domains={data.cohorts
          .filter(c => c.progress !== 'not-applicable')
          .map(c => c.domain)
          .filter((d, i, a) => a.indexOf(d) === i)}
      />

      {/* The open counterpart to the blind sitting above: the whole
          SSAT/ISEE bank with the key showing, so the semantic defects
          no gate here can see get read by a person. */}
      <ItemSweepPanel />

      <div className={`${CARD} p-5`}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-[15px] font-semibold text-gray-900">Bank readiness — live</h2>
          <span className="text-[11.5px] text-gray-400">
            read from the database {new Date(data.generatedAt).toLocaleString()}
          </span>
        </div>
        <p className="text-[12.5px] text-gray-500 mt-1 leading-relaxed">
          {data.totals.items.toLocaleString()} live items · {data.totals.measured.toLocaleString()} measured
          ({pctMeasured}%) · <strong className="text-violet-700">{data.totals.unmeasured.toLocaleString()} never measured</strong>.
          A cohort that has not been attacked is unknown, not passing.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-1.5 pr-3 font-medium">Cohort</th>
                <th className="py-1.5 pr-3 font-medium text-right">Items</th>
                <th className="py-1.5 pr-3 font-medium text-right">Measured</th>
                <th className="py-1.5 pr-3 font-medium text-right">Blind score</th>
                <th className="py-1.5 pr-3 font-medium text-right">All solvers</th>
                <th className="py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.cohorts.map(c => (
                <tr key={`${c.family}|${c.domain}`} className="border-b border-gray-50 last:border-0">
                  <td className="py-1.5 pr-3">
                    <span className="text-gray-400 uppercase text-[10.5px] mr-1.5">{c.family}</span>
                    <span className="text-gray-800">{c.domain}</span>
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-gray-600">{c.items}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-gray-600">{c.measured}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-gray-800">
                    {/* A score from the wrong instrument is shown as n/a, not
                        as a percentage. 52.8% on Standard English Conventions
                        reads as a middling result and is not one — the item
                        carries its sentence in the stem, so nothing was
                        withheld. The raw figure stays in the title so the
                        measurement is not lost, only stopped from lying. */}
                    {c.judgeable === false && c.blindPct !== null ? (
                      <span
                        className="text-gray-400 cursor-help"
                        title={`Measured ${c.blindPct}%, but this task type carries its source in the stem — the attack has nothing to withhold, so the number describes the solver, not the item.`}
                      >
                        n/a
                      </span>
                    ) : c.blindPct === null ? '—' : `${c.blindPct}%`}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-gray-500">
                    {/* Items every solver answered without the source — the
                        list to act on, not an average that hides them. */}
                    {c.measured === 0 ? '—' : `${c.everySolverGotIt}/${c.measured}`}
                  </td>
                  <td className="py-1.5"><Chip status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`${CARD} p-5`}>
        <h2 className="text-[15px] font-semibold text-gray-900">How these questions were made — live</h2>
        <p className="text-[12.5px] text-gray-500 mt-1 leading-relaxed">
          Authoring batches as recorded on the items themselves: where they came from,
          the method used, and how that batch scored when attacked.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-1.5 pr-3 font-medium">Batch</th>
                <th className="py-1.5 pr-3 font-medium">Source</th>
                <th className="py-1.5 pr-3 font-medium">Method</th>
                <th className="py-1.5 pr-3 font-medium">Created</th>
                <th className="py-1.5 pr-3 font-medium text-right">Items</th>
                <th className="py-1.5 pr-3 font-medium text-right">Blind</th>
                <th className="py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.provenance.map(p => (
                <tr key={p.cohort} className="border-b border-gray-50 last:border-0 align-top">
                  <td className="py-1.5 pr-3">
                    <div className="text-gray-800">{p.cohort}</div>
                    {p.verifyMetaKeys.length > 0 && (
                      <div className="text-[10.5px] text-gray-400 mt-0.5">
                        checks recorded: {p.verifyMetaKeys.join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-gray-600">{p.source ?? '—'}</td>
                  <td className="py-1.5 pr-3 text-gray-600">{p.method ?? '—'}</td>
                  <td className="py-1.5 pr-3 text-gray-500 tabular-nums">{p.created ?? '—'}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-gray-600">{p.items}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-gray-800">
                    {p.blindPct === null ? '—' : `${p.blindPct}%`}
                  </td>
                  <td className="py-1.5"><Chip status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data.runs.length > 0 && (
        <div className={`${CARD} p-5`}>
          <h2 className="text-[15px] font-semibold text-gray-900">Attack runs</h2>
          <p className="text-[12.5px] text-gray-500 mt-1">
            Every measurement, newest first. Re-attacking uses a new run id, so a
            before/after comparison is never overwritten.
          </p>
          <ul className="mt-3 space-y-1">
            {data.runs.map(r => (
              <li key={r.runId} className="flex items-baseline gap-3 text-[12.5px]">
                <span className="text-gray-400 tabular-nums w-[86px] shrink-0">{r.at ?? '—'}</span>
                <span className="text-gray-800 flex-1 truncate">{r.runId}</span>
                <span className="text-gray-500 tabular-nums">{r.items} items · {r.solvers} solvers</span>
                <span className="text-gray-900 tabular-nums w-14 text-right">
                  {r.blindPct === null ? '—' : `${r.blindPct}%`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
