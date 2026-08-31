/**
 * Visibility over how question banks are built and checked.
 *
 * The organising idea is that a raw blind-solve score means nothing on its
 * own. Key positions are not uniform — one real cohort sat at 40% on a single
 * letter, so "always C" beat a solver that had learned nothing. And published
 * ETS items themselves score 62-72% blind. So every number here is shown as a
 * MARGIN over that cohort's own fixed-letter control, next to the margin real
 * published items achieve. Absolute percentages are deliberately secondary.
 */

import React from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AlertTriangle, CheckCircle2, CircleDashed, FlaskConical, Layers, ShieldCheck, Workflow, XCircle } from 'lucide-react'
import {
  getLedger, ceilingFor, healthFor, formsFor, formsBySection, STAGE_ORDER,
  prettyTask, prettyTest, FAMILY_LABELS,
  readinessForRow, readinessTotals, READINESS_LABEL, READINESS_BLURB, type Readiness,
  type Health, type Coverage,
} from '@/lib/study/bank-ledger'
import { RegisterPanel } from './RegisterPanel'
import { A3_ATTEMPTS, PLAIN_STATUS } from '@/lib/study/bank-register'
import { LiveBankState } from './LiveBankState'
import { ItemSweepPanel } from './ItemSweepPanel'
import { UnverifiedCount } from './UnverifiedCount'
import { TASK_PIPELINES, type TaskPipeline } from '@/lib/study/task-pipelines'
import { FAMILY_STAGES, type ItemFamily } from '@/lib/study/bank-qc'

const CARD = 'bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]'

const READY_STYLE: Record<Readiness, string> = {
  ready:      "bg-emerald-50 text-emerald-700 ring-emerald-200",
  partial:    "bg-sky-50 text-sky-700 ring-sky-200",
  failed:     "bg-red-50 text-red-700 ring-red-200",
  unverified: "bg-gray-50 text-gray-500 ring-gray-200",
}

const HEALTH: Record<Health, { chip: string; bar: string; label: string }> = {
  ok:      { chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-500', label: 'Pass' },
  watch:   { chip: 'bg-amber-50 text-amber-700 ring-amber-200',       bar: 'bg-amber-500',   label: 'Too guessable' },
  bad:     { chip: 'bg-red-50 text-red-700 ring-red-200',             bar: 'bg-red-500',     label: 'Far too guessable' },
  unknown: { chip: 'bg-gray-50 text-gray-600 ring-gray-200',          bar: 'bg-gray-400',    label: 'Not measured' },
}

function MarginBar({ margin, ceiling }: { margin: number; ceiling: number | null }) {
  // Scale to the worst real cohort (~69pts) so bars stay comparable across
  // the page rather than each re-normalising to its own row.
  const pct = Math.max(0, Math.min(100, (margin / 70) * 100))
  const ceilPct = ceiling === null ? null : Math.max(0, Math.min(100, (ceiling / 70) * 100))
  const health = healthFor(margin, ceiling)
  return (
    <div className="relative h-2 w-full rounded-full bg-gray-100 overflow-hidden">
      <div className={`h-full rounded-full ${HEALTH[health].bar}`} style={{ width: `${pct}%` }} />
      {ceilPct !== null && (
        // The published bar, drawn on top — the thing every number is judged against.
        <div className="absolute inset-y-0 w-px bg-gray-900/70" style={{ left: `${ceilPct}%` }} aria-hidden />
      )}
    </div>
  )
}

function Chip({ health, children }: { health: Health; children: React.ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${HEALTH[health].chip}`}>
      {children}
    </span>
  )
}

/** Display names for the ledger stage keys, so the batch strip does not
 *  render raw identifiers like "withsource". */
const STAGE_LABELS: Record<string, string> = {
  shape: "Shape", withsource: "With source", nosource: "No source",
  elimination: "Elimination", tells: "Batch tells",
}

const PIPELINE_STAGES = [
  { key: 'spec',        short: 'Spec',        always: true,  blurb: 'counts and difficulty mix read from the bank, not chosen' },
  { key: 'author',      short: 'Author',      always: true,  blurb: 'sub-batches, no emphasis over a third of the batch' },
  { key: 'shape',       short: 'Shape',       always: true,  blurb: 'schema, distinct options, no duplicate stems' },
  { key: 'withsource',  short: 'With source', always: false, blurb: 'answerable? right difficulty? right construct?' },
  { key: 'nosource',    short: 'No source',   always: false, blurb: 'can it be solved with the audio or passage hidden?' },
  { key: 'elimination', short: 'Elimination', always: false, blurb: 'is any option rejectable on sight, without the source?' },
  // `tells` was missing from this list while FAMILY_STAGES required it of
  // every family — so the strip omitted the one BATCH-level gate, the one
  // that catches a key sitting in slot A across a cohort or every item
  // sharing a key shape. That is the defect class this project has shipped
  // three times, and the diagram said it was not checked at all.
  { key: 'tells',       short: 'Batch tells', always: true,  blurb: 'across the batch: key position, option length, uniform key shape' },
  { key: 'insert',      short: 'Insert',      always: true,  blurb: 'refused unless every required gate passed at this content hash' },
] as const

/** Colour per family, so a reader can see at a glance that Listening and
 *  Reading MC are gated identically while Speaking and Writing are not. */
const FAMILY_STYLE: Record<string, { dot: string; node: string; tint: string; short: string }> = {
  mc_hidden_source: { dot: "bg-indigo-500",  node: "bg-indigo-500",  tint: "ring-indigo-100",  short: "Source hidden" },
  mc_stem_source:   { dot: "bg-emerald-500", node: "bg-emerald-500", tint: "ring-emerald-100", short: "Stem is source" },
  cloze:            { dot: "bg-amber-500",   node: "bg-amber-500",   tint: "ring-amber-100",   short: "Cloze" },
  production:       { dot: "bg-rose-500",    node: "bg-rose-500",    tint: "ring-rose-100",    short: "No answer key" },
}

/** Which gates each family actually runs — DERIVED from bank-qc.ts rather
 *  than restated here.
 *
 *  This was previously a hand-written second copy, under a comment claiming
 *  "a test pins the two together so they cannot drift". No such test existed,
 *  and they had already drifted: this copy omitted `tells`, which
 *  FAMILY_STAGES requires of every family. Deriving removes the possibility
 *  rather than asserting it away. */
const FAMILY_GATES: Record<ItemFamily, readonly string[]> = Object.fromEntries(
  (Object.keys(FAMILY_STAGES) as ItemFamily[]).map(f => [f, FAMILY_STAGES[f]]),
) as Record<ItemFamily, readonly string[]>

/** Group the pipeline table by test → section, preserving declaration order
 *  so Listening reads before Reading rather than alphabetically. */
const TEST_GROUPS = (() => {
  const tests: { test: string; sections: { section: string; tasks: TaskPipeline[] }[] }[] = []
  for (const t of TASK_PIPELINES) {
    let g = tests.find(x => x.test === t.test)
    if (!g) { g = { test: t.test, sections: [] }; tests.push(g) }
    let sec = g.sections.find(x => x.section === t.section)
    if (!sec) { sec = { section: t.section, tasks: [] }; g.sections.push(sec) }
    sec.tasks.push(t)
  }
  return tests
})()

function TaskCard({ t, auditFor, coverage }: {
  t: TaskPipeline
  auditFor: (task: string | null) => number | undefined
  coverage: Coverage[]
}) {
  const style = FAMILY_STYLE[t.family]!
  const gates = FAMILY_GATES[t.family]!
  const cov = coverage.find(c => c.task === t.task)
  // Read the cohorts off the ledger row rather than re-deriving them here.
  // A hardcoded sat_rw -> sat_information_and_ideas mapping used to live at
  // this line: it named ONE of four measured domains and presented its score
  // as the section's, which read 848 passing maths items as failed.
  const margins = (cov?.qualityTasks ?? [])
    .map(q => auditFor(q))
    .filter((m): m is number => m !== undefined)
    .sort((a, b) => a - b)

  return (
    <div className={`rounded-xl bg-white ring-1 ${style.tint} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-2 w-2 rounded-full shrink-0 ${style.dot}`} aria-hidden />
          <span className="text-sm font-semibold text-gray-900 truncate">{t.label}</span>
        </div>
        <span className="text-[10px] whitespace-nowrap rounded-full bg-gray-50 px-2 py-0.5 text-gray-600 ring-1 ring-gray-200">
          {style.short}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
        <dt className="text-gray-500">Source</dt><dd className="text-gray-800">{t.source}</dd>
        <dt className="text-gray-500">Format</dt><dd className="text-gray-800">{t.format}</dd>
        {cov && (
          <>
            <dt className="text-gray-500">Banked</dt>
            <dd className="text-gray-800 tabular-nums">
              {cov.items} items · {cov.perTest}/test · {Math.floor(cov.usableItems / cov.perTest)} tests
            </dd>
          </>
        )}
        <dt className="text-gray-500">Quality</dt>
        <dd className={margins.length === 0 ? "text-gray-400" : "text-gray-800 tabular-nums"}>
          {margins.length === 0
            ? "not measured"
            // A range when the row covers several measured domains — the SAT
            // rows span four apiece and they disagree by up to 31 points.
            // One number here would be a claim about the others.
            : margins.length === 1
              ? `+${margins[0]} pts blind vs its own control`
              : `+${margins[0]} to +${margins[margins.length - 1]} pts blind across ${margins.length} domains`}
        </dd>
      </dl>

      <ol className="mt-3 grid grid-cols-8 gap-1">
        {PIPELINE_STAGES.map((st, i) => {
          const applies = st.always || gates.includes(st.key)
          return (
            <li key={st.key} className="relative flex flex-col items-center text-center">
              {i > 0 && (
                <span aria-hidden className={`absolute top-2.5 right-1/2 w-full h-px ${applies ? "bg-gray-300" : "bg-gray-200"}`} />
              )}
              <span
                title={st.blurb}
                className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold ${
                  applies ? `${style.node} text-white` : "border border-dashed border-gray-300 bg-white text-gray-300"
                }`}
              >
                {applies ? i : "–"}
              </span>
              <span className={`mt-1 text-[9px] leading-tight ${applies ? "text-gray-600" : "text-gray-300"}`}>
                {st.short}
              </span>
            </li>
          )
        })}
      </ol>

      {/* Stage 3 is one label over genuinely different jobs — spelling them
          out per task is what stops production tasks reading "not measured"
          because nobody knew what to run. */}
      <div className="mt-3 rounded-lg bg-gray-50 px-2.5 py-2">
        <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-1">
          Stage 3 · with source must verify
        </div>
        <ul className="space-y-0.5">
          {t.withSourceChecks.map(c => (
            <li key={c} className="text-[11px] text-gray-700 leading-snug flex gap-1.5">
              <span className="text-gray-400 shrink-0" aria-hidden>·</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-3 text-[11px] text-gray-600 leading-snug">
        <span className="font-medium text-gray-800">Attack.</span> {t.attack}
      </p>
      <p className="mt-1.5 text-[11px] text-amber-800 bg-amber-50/70 rounded-lg px-2.5 py-1.5 leading-snug">
        <span className="font-medium">Watch for.</span> {t.watchFor}
      </p>
    </div>
  )
}

function Stat({ label, value, sub, tone = 'default' }: {
  label: string; value: React.ReactNode; sub?: string; tone?: 'default' | 'bad' | 'good'
}) {
  const valueColor = tone === 'bad' ? 'text-red-600' : tone === 'good' ? 'text-emerald-600' : 'text-gray-900'
  return (
    <div className={`${CARD} p-4`}>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums mt-1 ${valueColor}`}>{value}</div>
      {sub && <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">{sub}</div>}
    </div>
  )
}

/** Coverage rows for one test+section, sorted scarcest first — the scarcest
 *  task is the one that caps the whole section, so it belongs at the top. */
function CoverageGroup({ title, rows, auditFor, readiness }: {
  title: string
  rows: Coverage[]
  auditFor: (task: string | null) => number | undefined
  readiness: (c: Coverage) => Readiness
}) {
  const sorted = [...rows].sort((a, b) => formsFor(a) - formsFor(b))
  const limit = formsFor(sorted[0]!)
  return (
    <div className="rounded-xl ring-1 ring-gray-100 overflow-hidden">
      <div className="flex items-baseline justify-between gap-2 px-4 py-2.5 bg-gray-50">
        <span className="text-sm font-medium text-gray-900">{title}</span>
        <span className="text-[11px] text-gray-600">
          <strong className="tabular-nums text-gray-900">{limit}</strong> full tests · capped by {sorted[0]!.label}
        </span>
      </div>
      {/* Scrolls rather than clips: the fixed columns total ~464px before the
          Task column, so under ~600px the Status column was unreachable —
          the parent's overflow-hidden cut it off instead of scrolling. */}
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{title} — items, questions per test, whole tests available, blind-solve margin and gate status per task</caption>
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-gray-400 border-t border-gray-100">
            <th scope="col" className="py-1.5 px-4 font-medium text-left">Task</th>
            <th scope="col" className="py-1.5 px-2 font-medium text-right w-20">Items</th>
            <th scope="col" className="py-1.5 px-2 font-medium text-right w-20">Per test</th>
            <th scope="col" className="py-1.5 px-2 font-medium text-right w-16">Tests</th>
            <th scope="col" className="py-1.5 px-4 font-medium text-right w-28">Quality</th>
            <th scope="col" className="py-1.5 px-4 font-medium text-right w-32">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(c => {
            const forms = formsFor(c)
            const ms = c.qualityTasks.map(auditFor)
              .filter((m): m is number => m !== undefined).sort((a, b) => a - b)
            const margin = ms.length === 0 ? undefined
              : ms.length === 1 ? `+${ms[0]}`
              : `+${ms[0]} to +${ms[ms.length - 1]}`
            const excluded = c.items - c.usableItems
            return (
              <tr key={c.task} className="border-t border-gray-50">
                <td className="py-2 px-4">
                  <div className="text-gray-900">{c.label}</div>
                  {c.note && <div className="text-[11px] text-gray-500 leading-snug">{c.note}</div>}
                </td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-900 w-20">
                  {c.items}
                  {excluded > 0 && <div className="text-[11px] text-amber-600">−{excluded} unusable</div>}
                </td>
                <td className="py-2 px-2 text-right tabular-nums text-gray-500 w-20">{c.perTest}/test</td>
                <td className="py-2 px-2 text-right tabular-nums w-16">
                  <span className={forms === limit ? 'font-semibold text-gray-900' : 'text-gray-600'}>{forms}</span>
                </td>
                <td className="py-2 px-4 w-28 text-right">
                  {margin === undefined
                    ? <span className="text-[11px] text-gray-400">not measured</span>
                    : <span className="text-[11px] tabular-nums text-gray-600">{margin} blind</span>}
                </td>
                <td className="py-2 px-4 w-32 text-right">
                  <span
                    title={READINESS_BLURB[readiness(c)]}
                    className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${READY_STYLE[readiness(c)]}`}
                  >
                    {READINESS_LABEL[readiness(c)]}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </div>
  )
}

export function BankQcDashboard() {
  const ledger = getLedger()
  const { baselines, batches, auditedCohorts, coverage } = ledger

  const totalItems = coverage.reduce((s, c) => s + c.items, 0)
  const sections = formsBySection(coverage)
  const auditFor = (task: string | null) =>
    task ? auditedCohorts.find(a => a.task === task)?.margin : undefined
  const tightest = sections.reduce((a, b) => (b.forms < a.forms ? b : a))

  // Which gates a task must clear before it can be called ready. Mirrors
  // FAMILY_STAGES in bank-qc.ts; the widest set is used so nothing is called
  // ready on a technicality.
  const REQUIRED = ["shape", "withsource", "nosource", "elimination", "tells"]
  // A row's verdict is its WORST cohort — a section is not clean because
  // three of its four domains are. Item COUNTS are attributed per cohort by
  // readinessTotals, so a failing domain no longer drags its passing
  // siblings into the failed tally.
  const readiness = (c: Coverage) =>
    readinessForRow(c, auditedCohorts, baselines, ledger.gatesRunOnBank, REQUIRED)
  const totals = readinessTotals(coverage, auditedCohorts, baselines, ledger.gatesRunOnBank, REQUIRED)

  // Group coverage by test+section, preserving ledger order.
  const groups: { key: string; rows: Coverage[] }[] = []
  for (const c of coverage) {
    const key = `${c.test} · ${c.section}`
    const g = groups.find(x => x.key === key)
    if (g) g.rows.push(c); else groups.push({ key, rows: [c] })
  }

  return (
    <div className="space-y-6">
      {/* Was a bespoke <header> with a text-xl h1 — 22px against the 30px
          every other admin page renders through AdminPageHeader. Same
          copy, same page; only the chrome is now shared. */}
      <AdminPageHeader
        kicker="Quality"
        title="Question bank QC"
        description="How each batch of questions is authored and what every quality gate measured. Scores are shown as points above the cohort's own best fixed-letter control, because raw accuracy is meaningless when key positions are not uniform."
      />
      <header>
        <p className="text-[11px] text-gray-500">
          Ledger generated {ledger.generatedAt} · updates on deploy, not live to the second
        </p>
        <p className="text-[11px] text-amber-800 bg-amber-50/70 ring-1 ring-amber-100 rounded-lg px-3 py-2 mt-3 max-w-3xl leading-snug">
          <strong>All solve numbers come from AI solvers, not students.</strong> No real test-taker
          data exists yet — the 8 accounts on record are internal. Every figure here is valid as a
          comparison against published ETS and College Board items measured the same way, and is
          not a prediction of what a student would score. Two of the tells the solvers exploited —
          eliminate absolutes, prefer the hedged option — are standard taught prep strategy, so a
          coached student may exploit them more, not less. Unverified either way.
        </p>
      </header>

      {/* ── WHAT IS ACTUALLY WRONG ────────────────────────────────────
          Added 2026-08-11. Andy said twice that there was no visibility
          and he was right: this page led with per-cohort readiness and
          the register led with open work, so a reader could scroll both
          and still not learn that ONE cohort is broken and the rest is
          merely unread. 2% is a quality problem; 98% is a scheduling
          problem; they need opposite responses and were being reported
          as one thing.

          Same source as REGISTER.md (lib/study/bank-register.ts), so
          the page and the file cannot drift — the failure that created
          this register in the first place. */}
      <section className="mt-6 rounded-2xl ring-1 ring-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">What is actually wrong</h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-red-50/70 ring-1 ring-red-100 p-4">
            <div className="text-2xl font-semibold text-red-900 tabular-nums">
              {PLAIN_STATUS.brokenItems}
            </div>
            <div className="text-[12px] font-medium text-red-900 mt-0.5">
              {PLAIN_STATUS.brokenCohort} — known broken
            </div>
            <p className="text-[11px] text-red-800/90 mt-1.5 leading-snug">
              Solvable without the audio, agreed by two independent instruments.
              {PLAIN_STATUS.brokenIsLive && <strong> Live to students right now.</strong>}
            </p>
          </div>
          {/* Counted from the bank at render time, not typed in. This
              card read a hardcoded 3,387 while the live panel below read
              3,377 for the same bank — see UnverifiedCount. */}
          <UnverifiedCount />
        </div>

        <p className="text-[11px] text-gray-600 mt-3 leading-snug max-w-3xl">
          {PLAIN_STATUS.humanChecksSoFar}
        </p>

        <h3 className="text-[12px] font-semibold text-gray-900 mt-5">
          Every attempt to fix {PLAIN_STATUS.brokenCohort}
        </h3>
        <p className="text-[11px] text-gray-500 mt-1 max-w-3xl leading-snug">
          <span className="font-medium text-gray-700">blind</span> is how often three AI solvers
          pick the right answer with the audio withheld;{' '}
          <span className="font-medium text-gray-700">control</span> is the best a fixed-letter
          guesser could do. A gap near zero is the goal — cr-v7 reached it (shipped
          2026-08-18). The shape of the earlier rows is the finding: each attempt removed the
          previous tell and introduced a new one, until cr-v7 removed the authorship asymmetry itself.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-[11.5px] border-collapse">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-1.5 pr-3 font-medium">attempt</th>
                <th className="py-1.5 pr-3 font-medium">blind</th>
                <th className="py-1.5 pr-3 font-medium">control</th>
                <th className="py-1.5 pr-3 font-medium">gap</th>
                <th className="py-1.5 font-medium">verdict</th>
              </tr>
            </thead>
            <tbody>
              {A3_ATTEMPTS.map(a => {
                const gap = a.controlPct === null ? null : a.blindPct - a.controlPct
                return (
                  <tr key={a.label} className="border-t border-gray-100 align-top">
                    <td className="py-2 pr-3">
                      <div className="font-medium text-gray-900">{a.label}</div>
                      <div className="text-[11px] text-gray-500 leading-snug mt-0.5">{a.why}</div>
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-gray-800 whitespace-nowrap">{a.blindPct}%</td>
                    <td className="py-2 pr-3 tabular-nums text-gray-800 whitespace-nowrap">
                      {a.controlPct === null ? '—' : `${a.controlPct}%`}
                    </td>
                    <td className="py-2 pr-3 tabular-nums whitespace-nowrap">
                      {gap === null
                        ? <span className="text-gray-400 italic">not recorded</span>
                        : <span className={gap > 25 ? 'text-red-700 font-semibold' : 'text-amber-700 font-semibold'}>
                            +{gap.toFixed(1)}
                          </span>}
                    </td>
                    <td className="py-2 whitespace-nowrap">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] ring-1 ${
                        a.verdict === 'cleared'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : a.verdict === 'inconclusive'
                            ? 'bg-amber-50 text-amber-800 ring-amber-200'
                            : 'bg-red-50 text-red-700 ring-red-200'}`}>
                        {a.verdict}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* LIVE — the database, read on every load. Placed FIRST because
          everything below it is the checked-in ledger file, and the
          ledger cannot answer "is this ready" (it does not know what is
          in the bank). Putting history above state is what made this
          page unreadable. */}
      <LiveBankState />
      {/*
        * MOUNTED HERE, NOT INSIDE LiveBankState.
        *
        * It was inside, after that component's `if (error)` and
        * `if (!data)` early returns — so whenever /api/admin/bank-qc/live
        * was slow or failed, this panel did not render AT ALL and the
        * page just looked empty. That is what a reviewer reported on
        * 2026-08-31. The live route pages the whole 4,500-row bank plus
        * attacks and reviews, so it is the most failure-prone fetch on
        * the page, and the review tool must not be behind it.
        *
        * It fetches its own data and shows its own errors.
        */}
      <ItemSweepPanel />
      <RegisterPanel />

      <div className="pt-2 border-t border-gray-100">
        <h2 className="text-[15px] font-semibold text-gray-900">Historical QC runs</h2>
        <p className="text-[12.5px] text-gray-500 mt-1 max-w-3xl leading-relaxed">
          Everything below comes from <code className="text-[11.5px]">scripts/study-bank/ledger.json</code>,
          a checked-in file that records batches we ran by hand. It updates on deploy and
          does NOT reflect the current bank — treat it as a log, not as status.
        </p>
      </div>

      {/* At-a-glance. Deliberately four numbers, not twelve — the point is to
          answer "how much do we have and how much of it is sound" in one look. */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Stat label="Questions banked" value={totalItems.toLocaleString()} sub="across TOEFL and SAT" />
        <Stat
          label="Full tests available"
          value={tightest.forms}
          sub={`${tightest.test} ${tightest.section} is scarcest — capped by ${tightest.limitedBy}`}
        />
        <Stat
          label="Questions ready to serve"
          value={`${totals.ready.toLocaleString()} / ${totalItems.toLocaleString()}`}
          tone={totals.ready === 0 ? 'bad' : 'good'}
          sub={`${totals.failed.toLocaleString()} failed a gate · ${totals.partial.toLocaleString()} partly checked · ${totals.unverified.toLocaleString()} never checked`}
        />
        <Stat
          label="Batches in QC"
          value={batches.filter(b => b.status !== 'inserted').length}
          sub={batches.length ? batches[0]!.id : 'none'}
        />
      </div>

      {/* Coverage — the "how many questions per test type" answer. */}
      <section className={`${CARD} p-5`}>
        <div className="flex items-center gap-2 mb-1">
          <Layers className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">Coverage by test type</h2>
        </div>
        <p className="text-xs text-gray-600 mb-4 max-w-3xl">
          Items banked, how many each test draws, and how many distinct tests that supports
          before questions repeat. A section can only run as many tests as its scarcest task
          allows, so the capping task is listed first in each group.
        </p>
        <div className="space-y-4">
          {groups.map(g => (
            <CoverageGroup key={g.key} title={g.key} rows={g.rows} auditFor={auditFor} readiness={readiness} />
          ))}
        </div>
      </section>

      {/* Baselines first: without these every other number on the page is
          uninterpretable, which is exactly the mistake that failed a good
          batch and condemned a healthy domain before they were measured. */}
      <section className={`${CARD} p-5`}>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">Published baseline</h2>
        </div>
        <p className="text-xs text-gray-600 mb-4 max-w-3xl">
          Official ETS and College Board items run through the identical attack. Real exams leak
          too — but <strong>how much depends entirely on the format</strong>, from +13 for a short
          two-speaker exchange to +68.8 for a lecture set, where world knowledge alone often decides
          the answer. Each task is judged against the baseline for <em>its own</em> format, never
          against 25% and never against an average across formats — averaging the two listening
          figures into one +46.7 would have been wrong for both.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {baselines.map(b => (
            <div key={b.task} className="rounded-xl ring-1 ring-gray-100 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">{b.label}</span>
                <span className="text-lg font-semibold tabular-nums text-gray-900">+{b.margin}</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {b.mean}% vs {b.control}% control · n={b.n} · {b.source}
              </div>
              <div className="mt-3"><MarginBar margin={b.margin} ceiling={b.margin} /></div>
            </div>
          ))}
        </div>
      </section>

      {/* How questions are made — grouped by test, the way people ask about it. */}
      <section className={`${CARD} p-5`}>
        <div className="flex items-center gap-2 mb-1">
          <Workflow className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">How questions are made</h2>
        </div>
        <p className="text-xs text-gray-600 mb-5 max-w-3xl">
          Every task runs the same eight stages, but which gates apply depends on what is
          being hidden. Four of the eleven TOEFL task types have no answer key at all, so two
          of the gates are undefined for them — those show as dashed.
        </p>

        <div className="space-y-6">
          {TEST_GROUPS.map(group => (
            <div key={group.test}>
              <div className="flex items-baseline gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-900">{group.test}</h3>
                <span className="text-[11px] text-gray-500">
                  {group.sections.reduce((n, sec) => n + sec.tasks.length, 0)} task types
                </span>
              </div>
              <div className="space-y-4">
                {group.sections.map(sec => (
                  <div key={sec.section}>
                    <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-2">
                      {sec.section}
                    </div>
                    <div className="grid gap-3 xl:grid-cols-2">
                      {sec.tasks.map(t => <TaskCard key={t.task} t={t} auditFor={auditFor} coverage={coverage} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3">
          <div className="text-[11px] font-medium text-gray-700 mb-1.5">The eight stages</div>
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE_STAGES.map((st, i) => (
              <div key={st.key} className="text-[11px] text-gray-600 leading-snug">
                <span className="font-semibold text-gray-900 tabular-nums">{i}</span>{" "}
                <span className="font-medium text-gray-800">{st.short}</span> — {st.blurb}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Batches in flight */}
      <section className={`${CARD} p-5`}>
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">Batches</h2>
        </div>

        {batches.length === 0 && (
          <p className="text-sm text-gray-500">No batches recorded.</p>
        )}

        <div className="space-y-4">
          {batches.map(batch => {
            const ceiling = ceilingFor(batch.task, baselines)
            const ns = batch.stages.nosource
            const health = healthFor(ns?.margin, ceiling)
            return (
              <div key={batch.id} className="rounded-xl ring-1 ring-gray-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{batch.id}</div>
                    <div className="text-xs text-gray-500">
                      {prettyTest(batch.targetTest)} · {batch.section.replace(/\b\w/g, m => m.toUpperCase())} · {prettyTask(batch.task)} · {FAMILY_LABELS[batch.family] ?? batch.family}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip health={health}>
                      {health === 'ok' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {ns?.margin !== undefined ? `+${ns.margin} vs +${ceiling?.toFixed(0)} allowed` : 'not measured'}
                    </Chip>
                    <span className="text-[11px] uppercase tracking-wide text-gray-500">{batch.status}</span>
                  </div>
                </div>

                {ns?.margin !== undefined && (
                  <div className="mt-3"><MarginBar margin={ns.margin} ceiling={ceiling} /></div>
                )}

                {/* Stage strip — the procedure itself, made visible. A stage
                    with no recorded run is not a pass; it shows as pending. */}
                <div className="mt-4 grid gap-2 sm:grid-cols-5">
                  {STAGE_ORDER.map(stage => {
                    const r = batch.stages[stage]
                    return (
                      <div key={stage} className="rounded-lg bg-gray-50 px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          {r ? <CheckCircle2 className="w-3 h-3 text-gray-500" /> : <CircleDashed className="w-3 h-3 text-gray-400" />}
                          <span className="text-[11px] font-medium text-gray-700">{STAGE_LABELS[stage] ?? stage}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1 leading-snug">
                          {r ? summarise(stage, r) : 'not run'}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <details className="mt-3">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-800">
                    spec &amp; content hash
                  </summary>
                  <div className="mt-2 text-[11px] text-gray-600 space-y-1">
                    <div className="font-mono break-all">sha256 {batch.contentSha}</div>
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto text-[11px]">
{JSON.stringify(batch.spec, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            )
          })}
        </div>
      </section>

      {/* Already in the bank */}
      <section className={`${CARD} p-5`}>
        <div className="flex items-center gap-2 mb-1">
          <XCircle className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">Cohorts already in the bank</h2>
        </div>
        <p className="text-xs text-gray-600 mb-4 max-w-3xl">
          Every cohort already serving students, put through the same no-source attack: hide the
          audio or passage, show only the options, and see how often three independent <em>AI</em>{" "}
          solvers still pick the right answer. <strong>Blind</strong> is how often they did —
          this is a model, not a student, so read it as a comparison against the published
          baseline rather than as a prediction of what a real test-taker would score.
          <strong> Control</strong> is what &ldquo;always pick slot B&rdquo; would have scored on the same
          cohort — the honest floor, since key positions are not evenly spread.
          <strong> Margin</strong> is the gap between them, and it is the only number that means
          anything on its own — <strong>lower is better</strong>, because a high margin means the
          options alone give the answer away. The black line on each bar is what real published ETS and College
          Board items score. These cohorts were authored before any of these gates existed.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-100">
                <th className="py-2 pr-4 font-medium">Task</th>
                <th className="py-2 pr-4 font-medium text-right">Items</th>
                <th className="py-2 pr-4 font-medium text-right">Blind</th>
                <th className="py-2 pr-4 font-medium text-right">Control</th>
                <th className="py-2 pr-4 font-medium text-right">Margin ↓</th>
                <th className="py-2 pr-4 font-medium w-56">Guessability</th>
              </tr>
            </thead>
            <tbody>
              {[...auditedCohorts].sort((a, b) => b.margin - a.margin).map(c => {
                const ceiling = ceilingFor(c.task, baselines)
                const health = healthFor(c.margin, ceiling)
                return (
                  <tr key={c.task} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-4 text-gray-900">{prettyTask(c.task)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-gray-600">{c.n}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-gray-600">{c.mean}%</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-gray-500">{c.control}%</td>
                    <td className="py-2 pr-4 text-right tabular-nums font-medium text-gray-900">
                      {c.margin > 0 ? '+' : ''}{c.margin}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <MarginBar margin={c.margin} ceiling={ceiling} />
                        <Chip health={health}>{HEALTH[health].label}</Chip>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

/** One line per stage. Deliberately shows the measurement, not just a tick —
 *  a stage that says "passed" and nothing else is how a green check ends up
 *  meaning nothing. */
function summarise(stage: string, r: Record<string, unknown>): string {
  switch (stage) {
    case 'nosource':
      return `${r.mean}% vs ${r.control}% control${r.identicalSpreads ? ' · IDENTICAL spreads' : ''}`
    case 'elimination':
      return `${r.itemsWithRejectableOption}/${r.total} items rejectable blind`
    case 'withsource': {
      const d = r.difficulty as Record<string, number> | undefined
      return d ? `hard ${d.hard} · medium ${d.medium} · easy ${d.easy}` : 'run'
    }
    case 'tells':
      return `key at length extreme ${r.keyAtLengthExtremePct}% (chance ${r.chancePct}%)`
    default:
      return 'run'
  }
}
