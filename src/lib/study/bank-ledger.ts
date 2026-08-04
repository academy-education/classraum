/**
 * Reader for the file-based QC ledger (`scripts/study-bank/ledger.json`).
 *
 * WHY A FILE AND NOT A TABLE. The ledger records how each batch of items was
 * authored and what every quality gate measured. That is low-frequency data —
 * a handful of rows per batch, a few batches a month — and it benefits far
 * more from being diffable in a pull request than from being queryable. A
 * reviewer can see "this batch's no-source margin moved from +25 to +41" in
 * the diff, which a DB row cannot show. It also needs no migration.
 *
 * The tradeoff, stated plainly: the page is live as of the last deploy, not
 * live to the second. A gate run after the deploy is not visible until the
 * ledger is committed and shipped. If runs ever become frequent enough that
 * this hurts, `database/migrations/067_bank_qc_ledger.sql` holds the table
 * version of exactly this shape.
 *
 * Pass/fail lives in `bank-qc.ts`; this module only reads and summarises.
 */
import ledger from '../../../scripts/study-bank/ledger.json'

/** A published-item measurement. The bar every batch is judged against.
 *  Measured 2026-08-01 from 183 official ETS / College Board items — before
 *  that, thresholds were guessed, and the guess was wrong in both directions:
 *  it failed a batch that matched ETS and condemned a healthy SAT domain. */
export interface Baseline {
  task: string
  label: string
  source: string
  n: number
  mean: number
  control: number
  /** Points above the cohort's own best fixed-letter control. THE number.
   *  Raw accuracy is meaningless without it — key positions are not uniform
   *  and one real cohort sat at 40% on a single letter. */
  margin: number
  identicalSpreads: boolean
  solvers: { score: number; pct: number; confident: number; spread: string }[]
}

export interface StageResult {
  mean?: number
  control?: number
  margin?: number
  identicalSpreads?: boolean
  n?: number
  [k: string]: unknown
}

export interface Batch {
  id: string
  createdAt: string
  targetTest: string
  section: string
  task: string
  family: string
  spec: Record<string, unknown>
  contentSha: string
  status: string
  cohort: string | null
  stages: Record<string, StageResult>
}

/** A cohort already in the bank that has been attacked but not re-authored. */
export interface AuditedCohort {
  task: string
  n: number
  mean: number
  control: number
  margin: number
}

/** How many items exist per task, and how many distinct tests they support. */
export interface Coverage {
  test: string
  section: string
  task: string
  label: string
  items: number
  /** Items the draw can actually use. Differs from `items` only where the
   *  blueprint needs whole sets — Daily Life has 133 items but 69 sit in
   *  single-question texts, and an odd quota is not a reachable sum of
   *  two-question sets, so the draw silently comes up short. */
  usableItems: number
  perTest: number
  note?: string
  /** EVERY audited cohort making up this row, not a representative one.
   *
   *  The two SAT rows each span four College Board domains that were
   *  measured separately and disagree sharply — Advanced Math is the only
   *  failing maths domain, and judging the row by it counted all 848 maths
   *  items as failed when 643 of them are in passing domains. Cohort `n`
   *  values sum exactly to `items` for every measured row, so readiness is
   *  attributed per cohort rather than smeared across the row. */
  qualityTasks: string[]
}

export interface Ledger {
  generatedAt: string
  /** Bumped whenever a gate or threshold changes. A pass recorded under an
   *  older version is STALE, not Ready — see the Readiness block below. */
  gateVersion: number
  gateVersionNote: string
  /** Which gates have actually been run against the LIVE bank. Currently
   *  only the no-source attack, which is why nothing can be "ready" yet. */
  gatesRunOnBank: string[]
  note: string
  baselines: Baseline[]
  batches: Batch[]
  auditedCohorts: AuditedCohort[]
  coverage: Coverage[]
}

/** Distinct tests before items repeat. Floor, not round — 5.9 forms is 5. */
export function formsFor(c: Coverage): number {
  return Math.floor(c.usableItems / c.perTest)
}

/** A section can only run as many tests as its scarcest task allows. */
export function formsBySection(coverage: Coverage[]): { test: string; section: string; forms: number; limitedBy: string }[] {
  const groups = new Map<string, Coverage[]>()
  for (const c of coverage) {
    const k = `${c.test}\u0000${c.section}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(c)
  }
  // Read test/section off the first member, never by splitting the key:
  // "SAT Reading & Writing" contains spaces, so splitting on one would leave
  // the section as "Reading" and silently mislabel the row.
  return [...groups.values()].map(list => {
    const scarcest = list.reduce((a, b) => (formsFor(b) < formsFor(a) ? b : a))
    return {
      test: list[0]!.test,
      section: list[0]!.section,
      forms: formsFor(scarcest),
      limitedBy: scarcest.label,
    }
  })
}

export function getLedger(): Ledger {
  return ledger as unknown as Ledger
}

/** Calibrated ceilings, derived from the published baselines rather than
 *  chosen. Reply-style listening tasks are compared to the ETS Essentials
 *  figure; everything else to the SAT R&W figure, which is higher because
 *  its stems legitimately carry more of the item. A small tolerance is added
 *  so a batch is not failed for landing a point above a 30-item measurement. */
const TOLERANCE = 4

/** Maths is judged against CHANCE, not against a published verbal margin.
 *  Its attack strips the stem entirely, so a solver seeing four bare values
 *  has nothing legitimate to work from and the honest expectation is the
 *  fixed-letter control itself. Comparing it to the SAT R&W figure (+40) was
 *  a bug: it rendered Advanced Math as "At standard" at +16.6 while
 *  verify-math-hub.ts was reporting the key as the derivable centre in 64%
 *  of its items. 10pts allows for noise at these sample sizes and nothing
 *  more. */
const MATH_CEILING = 10

export function ceilingFor(task: string, baselines: Baseline[]): number | null {
  // Maths is judged against chance — see MATH_CEILING above.
  if (task.includes("math")) return MATH_CEILING

  const of = (t: string) => baselines.find(b => b.task === t)?.margin

  // Each task type gets the baseline for ITS OWN format. Measured
  // 2026-08-01 by attacking 82 official ETS listening items and splitting
  // them by content structure, which produced two wildly different figures:
  //
  //   long lecture/talk sets      +68.8   (n=32)
  //   short 2-speaker exchanges   +13.0   (n=23)
  //
  // Real TOEFL lectures ARE largely solvable from options plus world
  // knowledge; short conversations are not. Averaging them into one
  // "listening" number (+46.7) would have been meaningless for both.
  //
  // This reversed two verdicts. academic_talk at +68.3 sits ON the lecture
  // baseline and is fine, where a reading-derived ceiling of 40 had it
  // failing. conversation and announcement at ~+59 are 4.5x the
  // conversation baseline, not the ~2x a reply-task ceiling suggested.
  //
  // CAVEAT, and it is a real one: n=32 and n=23 are small, and the
  // lecture/conversation split came from the solvers describing the item
  // content rather than from the source document structure. Treat these two
  // as provisional and re-measure if more official items become available.
  if (task.includes("academic_talk")) return withTolerance(of("listening_lecture"))
  if (task.includes("conversation") || task.includes("announcement")) {
    return withTolerance(of("listening_conversation"))
  }
  if (task.includes("choose_response")) return withTolerance(of("choose_response"))
  // Reading-style: academic_passage, daily_life, SAT R&W.
  return withTolerance(of("sat_rw"))
}

function withTolerance(m: number | undefined): number | null {
  return m === undefined ? null : m + TOLERANCE
}

export type Health = 'ok' | 'watch' | 'bad' | 'unknown'

/** How a measured margin compares to the published bar for that task.
 *  `watch` exists because a cohort at 1.5x the baseline is not yet the
 *  emergency that 2.5x is, and collapsing them loses the ordering that tells
 *  you what to fix first. */
export function healthFor(margin: number | undefined, ceiling: number | null): Health {
  if (margin === undefined || ceiling === null) return 'unknown'
  if (margin <= ceiling) return 'ok'
  if (margin <= ceiling * 1.5) return 'watch'
  return 'bad'
}

/** Display names. The ledger stores raw task keys (`sat_craft_and_structure`,
 *  `choose_response`) because those are what the DB and the draw use — but a
 *  naive title-case turns "sat" into "Sat" and "mc" into "Mc", so the
 *  acronyms and the ETS task names are spelled out explicitly. */
const TASK_LABELS: Record<string, string> = {
  choose_response: 'Choose a Response',
  conversation: 'Conversation',
  announcement: 'Announcement',
  academic_talk: 'Academic Talk',
  daily_life: 'Daily Life',
  academic_passage: 'Academic Passage',
  fill_in_blanks: 'Complete the Words',
  speaking_repeat: 'Listen and Repeat',
  speaking_interview: 'Interview',
  arrange_words: 'Build a Sentence',
  writing_email: 'Email',
  writing_discussion: 'Academic Discussion',
  sat_craft_and_structure: 'SAT Craft and Structure',
  sat_expression_of_ideas: 'SAT Expression of Ideas',
  sat_information_and_ideas: 'SAT Information and Ideas',
  sat_standard_english_conventions: 'SAT Standard English Conventions',
  sat_math_advanced: 'SAT Advanced Math',
  sat_math_algebra: 'SAT Algebra',
  sat_math_geometry: 'SAT Geometry and Trigonometry',
  sat_math_problem_solving: 'SAT Problem-Solving and Data',
  sat_rw: 'SAT Reading and Writing',
  sat_math: 'SAT Math',
}

export function prettyTask(task: string): string {
  return TASK_LABELS[task] ?? task.replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase())
}

export function prettyTest(test: string): string {
  const t = test.toLowerCase()
  if (t === 'toefl') return 'TOEFL'
  if (t === 'sat') return 'SAT'
  return test.replace(/\b\w/g, m => m.toUpperCase())
}

export const FAMILY_LABELS: Record<string, string> = {
  mc_hidden_source: 'Multiple choice — source can be hidden',
  mc_stem_source: 'Multiple choice — the stem is the source',
  cloze: 'Cloze',
  production: 'Production — no answer key',
}

/** Stages a family must clear, mirroring FAMILY_STAGES in bank-qc.ts.
 *  Duplicated as a display concern only — bank-qc.ts defines the contract
 *  on whether a batch may insert. */
export const STAGE_ORDER = ['shape', 'withsource', 'nosource', 'elimination', 'tells'] as const

/* ─── Readiness ──────────────────────────────────────────────────────────
 *
 * `study_item_bank.verified` cannot answer "is this question ready to
 * serve". It is written `true` unconditionally by insertListening(), so all
 * 3,365 live items carry it — including cohorts later measured at 3.5x the
 * published guessability bar. It records that a row was inserted, nothing
 * more.
 *
 * Readiness is also not a boolean, which 2026-08-01 demonstrated: calibrating
 * the thresholds moved academic_talk from failing to passing and SAT Advanced
 * Math from passing to failing, with no item changing at all. A stored flag
 * would have kept asserting whatever was true when it was written.
 *
 * So readiness is DERIVED, never stored — item -> cohort -> which gates ran
 * on that task, at which gate version. A derived value cannot drift from the
 * ledger the way a column drifts from reality.
 */

export type Readiness = 'ready' | 'partial' | 'failed' | 'unverified'

export const READINESS_LABEL: Record<Readiness, string> = {
  ready: 'Ready',
  partial: 'Partly checked',
  failed: 'Failed a gate',
  unverified: 'Never checked',
}

export const READINESS_BLURB: Record<Readiness, string> = {
  ready: 'every required gate passed, at this content hash, under the current gate version',
  partial: 'the gates that ran passed — the rest have never been run on it',
  failed: 'measured on at least one required gate and failed it',
  unverified: 'no gate has ever been run on this task',
}

/**
 * Readiness for one task.
 *
 * `gatesRun` is which gates have actually been executed against the live
 * bank — currently just the no-source attack. Nothing in the bank has been
 * through the full pipeline, so nothing can be `ready`; the most any task
 * can be is `partial`. That is the honest answer and it should stay visible
 * until a repaired cohort earns better.
 */
export function readinessFor(
  qualityTask: string | null,
  audited: AuditedCohort[],
  baselines: Baseline[],
  gatesRun: string[],
  requiredGates: readonly string[],
): Readiness {
  if (!qualityTask) return 'unverified'
  const row = audited.find(a => a.task === qualityTask)
  if (!row) return 'unverified'

  const health = healthFor(row.margin, ceilingFor(row.task, baselines))
  if (health !== 'ok') return 'failed'

  // Passed what was run. Only 'ready' once every required gate has run.
  const everyGateRun = requiredGates.every(g => gatesRun.includes(g))
  return everyGateRun ? 'ready' : 'partial'
}

/** Readiness for a whole coverage row: the WORST of its cohorts.
 *
 *  A section is not servable because three of its four domains are clean.
 *  This is the display verdict for the row — for item counts use
 *  `readinessTotals`, which attributes each cohort's items to its own
 *  verdict instead of pushing the whole row into the worst bucket. */
export function readinessForRow(
  c: Coverage,
  audited: AuditedCohort[],
  baselines: Baseline[],
  gatesRun: string[],
  requiredGates: readonly string[],
): Readiness {
  if (c.qualityTasks.length === 0) return 'unverified'
  const RANK: Record<Readiness, number> = { failed: 0, unverified: 1, partial: 2, ready: 3 }
  return c.qualityTasks
    .map(t => readinessFor(t, audited, baselines, gatesRun, requiredGates))
    .reduce((worst, r) => (RANK[r] < RANK[worst] ? r : worst))
}

/**
 * Item counts by readiness.
 *
 * Attributed PER COHORT, not per row. The two SAT rows each span four
 * College Board domains measured separately: Advanced Math fails at +16.6
 * while Algebra, Geometry and Problem-Solving all pass. Judging the row by
 * one of them put all 848 maths items in `failed` when 643 belong to
 * passing domains — the same "each part internally consistent, wrong
 * together" shape as the band-vs-score bug.
 *
 * Cohort `n` values sum exactly to `items` on every measured row today, so
 * this is exact rather than apportioned. Any remainder is counted
 * `unverified`, which is what unmeasured items are.
 */
export function readinessTotals(
  coverage: Coverage[],
  audited: AuditedCohort[],
  baselines: Baseline[],
  gatesRun: string[],
  requiredGates: readonly string[],
): Record<Readiness, number> {
  const totals: Record<Readiness, number> = { ready: 0, partial: 0, failed: 0, unverified: 0 }
  for (const c of coverage) {
    let attributed = 0
    for (const t of c.qualityTasks) {
      const cohort = audited.find(a => a.task === t)
      if (!cohort) continue
      totals[readinessFor(t, audited, baselines, gatesRun, requiredGates)] += cohort.n
      attributed += cohort.n
    }
    // Items no cohort measured are unverified, not silently dropped.
    totals.unverified += Math.max(0, c.items - attributed)
  }
  return totals
}
