/**
 * Grade our own rubric-anchored answer ladders through the PRODUCTION
 * grading callbacks and report whether the grader is CONSISTENT with the
 * rubric: ordering, repeat stability, band hits, per-dimension
 * sensitivity, and an offset relative to our ladder.
 *
 *   npx tsx scripts/grader-ladder.ts --dry            validate fixtures, no model calls
 *   npx tsx scripts/grader-ladder.ts                  real run (gpt-4o + gpt-4o-mini), N=3
 *   npx tsx scripts/grader-ladder.ts --n=1 --only=email
 *   npx tsx scripts/grader-ladder.ts --fake=oracle [--shuffle-ladder=7]   break-tests, no model
 *   npx tsx scripts/grader-ladder.ts --fake=constant
 *   npx tsx scripts/grader-ladder.ts --json=/path/out.json   write raw grades (also on failure)
 *   npx tsx scripts/grader-ladder.ts --resume=/path/out.json --json=/path/out.json   grade only what is missing
 *
 * THIS IS A CONSISTENCY INSTRUMENT, NOT A CALIBRATION. The intended bands
 * are our reading of the official descriptors applied to answers we
 * wrote. Nothing here says what an ETS rater would give; see CLAUDE.md
 * "The grader is not calibrated, and cannot be from public data". Do NOT
 * tune prompts, rubrics or score mapping against these numbers — that
 * would turn a consistency check into a fitted one and it would stop
 * measuring anything.
 *
 * Path: runStagedGrade(…, openAiStages()) — the same callbacks
 * gradeAndPersistResponse uses, with the prompt composed by the same
 * composeGraderPrompt(passage, prompt). Speaking goes through the TEXT
 * path with null speech signals (a typed answer on the text tier): there
 * is no audio, so delivery is untested. Never writes to the database.
 *
 * Exit codes: 0 measured; 1 any grade failed or came back non-finite /
 * out of range (no metrics are printed over a partial set); 2 fixture
 * invalid or missing key.
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { createHash } from 'crypto'
import {
  SKILL_OF_TASK,
  validateLadders,
  ordering,
  findInversions,
  spreads,
  bandHits,
  bestConstantHitRate,
  ladderOffset,
  edges,
  sensitivityByDimension,
  shuffleIntended,
  wordCount,
  mean,
  type GradedStep,
  type LadderPrompt,
  type LadderTaskType,
} from '../src/lib/study/grader-ladder'
import { GRADER_LADDERS } from '../src/lib/study/__fixtures__/grader-ladder'
import { ETS_SCORED_SAMPLES } from '../src/lib/study/__fixtures__/ets-scored-samples'
import { composeGraderPrompt } from '../src/lib/study/openResponse'

config({ path: resolve(process.cwd(), '.env.local') })

const BANNER = 'CONSISTENCY INSTRUMENT — relative to OUR OWN ladder, NOT to ETS raters. Not a calibration.'

interface Args {
  dry: boolean
  n: number
  only: LadderTaskType | null
  fake: 'oracle' | 'constant' | null
  shuffleSeed: number | null
  concurrency: number
  json: string | null
  resume: string | null
  retries: number
}

function parseArgs(argv: string[]): Args {
  const get = (k: string) => argv.find(a => a === `--${k}` || a.startsWith(`--${k}=`))
  const val = (k: string) => { const a = get(k); return a && a.includes('=') ? a.split('=').slice(1).join('=') : null }
  const n = Number(val('n') ?? 3)
  const conc = Number(val('concurrency') ?? 4)
  const only = val('only') as LadderTaskType | null
  const fake = val('fake') as Args['fake']
  const shuffle = get('shuffle-ladder')
  if (!Number.isInteger(n) || n < 1) fail(2, `--n must be a positive integer, got ${val('n')}`)
  if (!Number.isInteger(conc) || conc < 1) fail(2, `--concurrency must be a positive integer`)
  if (only && !(only in SKILL_OF_TASK)) fail(2, `--only must be one of ${Object.keys(SKILL_OF_TASK).join(', ')}`)
  if (fake && fake !== 'oracle' && fake !== 'constant') fail(2, `--fake must be oracle or constant`)
  if (shuffle && !fake) fail(2, '--shuffle-ladder is a break-test; combine it with --fake=oracle (it would waste model calls otherwise)')
  return {
    dry: !!get('dry'),
    n,
    only,
    fake,
    shuffleSeed: shuffle ? Number(val('shuffle-ladder') ?? 1) : null,
    concurrency: conc,
    json: val('json'),
    resume: val('resume'),
    retries: Number(val('retries') ?? 2),
  }
}

function fail(code: number, msg: string): never {
  console.error(`\n${code === 2 ? 'INVALID' : 'FAILED'}: ${msg}`)
  process.exit(code)
}

const fmt = (x: number | null, d = 2) => (x === null ? 'undefined' : (x >= 0 ? ' ' : '') + x.toFixed(d))
const pct = (a: number, n: number) => `${a}/${n}${n ? ` (${((a / n) * 100).toFixed(1)}%)` : ''}`

interface GradeDetail {
  band: number
  relevanceLevel: string | null
  languageScore: number | null
  ceilingApplied: boolean
  zeroReasons: string[]
}

type Grader = (p: LadderPrompt, stepIndex: number) => Promise<GradeDetail>

/** Stage attempts that failed their schema and were retried INSIDE the
 *  pipeline (withSchemaRetry). Recovered ones never reach a student. */
const stageRetries: Array<{ stepId: string; stage: string; attempt: number; message: string }> = []

function contentHash(p: LadderPrompt, i: number): string {
  return createHash('sha256').update(`${p.taskType}\n${p.passage}\n${p.prompt}\n${p.steps[i]!.response}`).digest('hex').slice(0, 12)
}

/** Wrap a stage callback so a failure says WHICH stage failed. Wrapping
 *  only annotates the thrown error; the call itself is unchanged. */
function tagStage<A extends unknown[], R>(stage: (a: A[0]) => string, fn: (...a: A) => Promise<R>) {
  return async (...a: A): Promise<R> => {
    try { return await fn(...a) }
    catch (e) { throw Object.assign(e instanceof Error ? e : new Error(String(e)), { stage: stage(a[0]) }) }
  }
}

async function modelGrader(): Promise<Grader> {
  if (!process.env.OPENAI_API_KEY) fail(2, 'OPENAI_API_KEY missing (.env.local in the working directory)')
  const { runStagedGrade } = await import('../src/lib/study/gradePipeline')
  const { openAiStages } = await import('../src/lib/study/gradeResponse')
  const prod = openAiStages()
  const stages = {
    text: tagStage((a: { schemaName: string }) => a.schemaName, prod.text) as typeof prod.text,
    quality: tagStage(() => 'rubric_grade', prod.quality) as typeof prod.quality,
  }
  return async (p, i) => {
    const step = p.steps[i]!
    const skill = SKILL_OF_TASK[p.taskType]
    const staged = await runStagedGrade({
      family: 'toefl',
      skill,
      taskType: p.taskType,
      promptText: composeGraderPrompt(p.passage, p.prompt),
      responseText: step.response,
      // Same word count gradeAndPersistResponse computes.
      wordCount: step.response.trim().split(/\s+/).filter(Boolean).length,
      durationSeconds: null,
      language: 'en',
      // Production passes an all-null signals object for a speaking
      // answer with no recording, and null for writing. Mirror it.
      speechSignals: skill === 'speaking' ? { wpm: null, pauseCount: null, clarity: null } : null,
    }, stages, {
      // runStagedGrade retries a schema failure itself (as production
      // does since 2026-10-07). Count those here, so a failure the
      // pipeline absorbed is still reported rather than hidden.
      onStageRetry: info => stageRetries.push({
        stepId: step.id,
        stage: info.stage,
        attempt: info.attempt,
        message: info.error instanceof Error ? info.error.message : String(info.error),
      }),
    })
    return {
      band: staged.grade.overallBand,
      relevanceLevel: staged.relevance?.level ?? null,
      languageScore: staged.languageScore,
      ceilingApplied: staged.ceilingApplied,
      zeroReasons: staged.zeroReasons,
    }
  }
}

function fakeGrader(kind: 'oracle' | 'constant'): Grader {
  // The oracle returns the band the FIXTURE assigned — keyed to the
  // content — so if the labels are shuffled afterwards, ordering must
  // collapse. The constant grader returns 3 for everything.
  return async (p, i) => ({
    band: kind === 'oracle' ? p.steps[i]!.intendedBand : 3,
    relevanceLevel: null, languageScore: null, ceilingApplied: false, zeroReasons: [],
  })
}

async function pool<T>(tasks: Array<() => Promise<T>>, size: number): Promise<PromiseSettledResult<T>[]> {
  const out: PromiseSettledResult<T>[] = new Array(tasks.length)
  let next = 0
  const worker = async () => {
    while (next < tasks.length) {
      const k = next++
      try { out[k] = { status: 'fulfilled', value: await tasks[k]!() } }
      catch (e) { out[k] = { status: 'rejected', reason: e } }
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, tasks.length) }, worker))
  return out
}

function report(title: string, steps: GradedStep[]) {
  console.log(`\n──────── ${title} ────────`)
  const o = ordering(steps)
  console.log(`  ordering (per-step mean band vs intended, n=${o.n} steps)`)
  console.log(`    Spearman rho  ${fmt(o.spearman)}`)
  console.log(`    Kendall tau-b ${fmt(o.kendall)}`)
  if (o.undefinedReason) console.log(`    ordering information = 0: ${o.undefinedReason}`)
  const inv = findInversions(steps)
  console.log(`    inversions    ${inv.inversions.length} of ${inv.pairs} ordered pairs (within prompt)`)
  for (const f of inv.inversions) {
    console.log(`      INVERSION ${f.higher} (intended ${f.intendedHigher}, got ${f.givenHigher.toFixed(2)}) < ${f.lower} (intended ${f.intendedLower}, got ${f.givenLower.toFixed(2)})`)
  }
  console.log(`    flat          ${inv.flat.length} of ${inv.pairs} pairs ≥1 band apart graded identically`)
  for (const f of inv.flat.slice(0, 12)) console.log(`      flat ${f.higher} (${f.intendedHigher}) = ${f.lower} (${f.intendedLower}) at ${f.givenHigher.toFixed(2)}`)
  if (inv.flat.length > 12) console.log(`      … ${inv.flat.length - 12} more flat pairs`)

  const sp = spreads(steps)
  const unstable = sp.filter(r => r.spread > 0)
  console.log(`  consistency (spread = max − min across repeats, n=${sp.length} steps × ${sp[0]?.n ?? 0} repeats)`)
  console.log(`    mean spread   ${mean(sp.map(r => r.spread)).toFixed(2)}   max ${Math.max(...sp.map(r => r.spread)).toFixed(2)}`)
  console.log(`    steps with any spread  ${pct(unstable.length, sp.length)}`)
  for (const r of unstable) console.log(`      ${r.stepId}: ${r.min}–${r.max}`)

  const h = bandHits(steps)
  const base = bestConstantHitRate(steps)
  console.log(`  band hit rate (|given − intended| ≤ 0.5)  ${pct(h.hits, h.n)} grades`)
  console.log(`    control: a grader answering ${base.band} to everything hits ${pct(base.hits, base.n)} — only the excess is evidence`)

  const e = edges(steps)
  const dims = sensitivityByDimension(e)
  console.log(`  per-dimension sensitivity (parent → child edges where ONLY that dimension changed)`)
  console.log(`    ${'dimension'.padEnd(20)} n  lowered flat raised | held moved | mean drop expected → given`)
  for (const d of dims) {
    console.log(`    ${d.dimension.padEnd(20)} ${String(d.n).padStart(1)}  ${String(d.lowered).padStart(7)} ${String(d.flat).padStart(4)} ${String(d.raised).padStart(6)} | ${String(d.held).padStart(4)} ${String(d.moved).padStart(5)} | ${d.meanExpectedDrop.toFixed(2)} → ${d.meanGivenDrop.toFixed(2)}`)
  }
  if (dims.some(d => d.held > 0)) console.log(`    note: "held" on an invariance edge is evidence only if the same grader LOWERED the other edges — a constant grader holds every one.`)
  for (const r of e.filter(r => r.verdict === 'flat' || r.verdict === 'raised' || r.verdict === 'moved')) {
    console.log(`      ${r.verdict.toUpperCase()} ${r.parent} → ${r.child} [${r.dimension}] expected −${r.expectedDrop}, given ${r.givenDrop >= 0 ? '−' : '+'}${Math.abs(r.givenDrop).toFixed(2)}`)
  }

  const off = ladderOffset(steps)
  console.log(`  offset  ${off.offset >= 0 ? '+' : ''}${off.offset.toFixed(2)} bands over n=${off.n} grades`)
  console.log(`          ^ RELATIVE TO OUR OWN LADDER, NOT TO ETS RATERS. Not a calibration offset.`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  console.log(BANNER)

  const forbidden = ETS_SCORED_SAMPLES.flatMap(s => [s.promptText, s.responseText])
  const problems = validateLadders(GRADER_LADDERS, forbidden)
  if (problems.length) {
    for (const p of problems) console.error(`  ✗ ${p}`)
    fail(2, `${problems.length} fixture problem(s)`)
  }
  const prompts = GRADER_LADDERS.filter(p => !args.only || p.taskType === args.only)
  if (prompts.length === 0) fail(2, `no ladder for --only=${args.only}`)
  const total = prompts.reduce((a, p) => a + p.steps.length, 0)
  console.log(`fixtures OK: ${prompts.length} prompts, ${total} steps`)
  for (const p of prompts) {
    console.log(`  ${p.id} [${p.taskType}] bank ${p.bankItemId} (${p.bankCohort ?? 'no cohort'})`)
    for (const s of p.steps) {
      console.log(`    ${s.id.padEnd(18)} ${String(s.intendedBand).padStart(3)}  ${(s.changed ?? 'anchor').padEnd(18)} ${String(wordCount(s.response)).padStart(3)}w  ← ${s.parent ?? '—'}`)
    }
  }
  if (args.dry) {
    console.log(`\nDRY: validated only. A real run is ${total} steps × N=${args.n} = ${total * args.n} grades (~3 model calls each).`)
    return
  }

  const grader = args.fake ? fakeGrader(args.fake) : await modelGrader()
  console.log(`\ngrading with ${args.fake ? `FAKE ${args.fake} grader` : 'PRODUCTION callbacks (openAiStages)'} — N=${args.n}, concurrency ${args.concurrency}`)

  // Raw grades, keyed by step id AND a hash of exactly what was graded,
  // so a resumed run can never reuse a grade for an answer or prompt
  // that has since changed.
  const keyOf = (p: LadderPrompt, i: number) => `${p.steps[i]!.id}@${contentHash(p, i)}`
  const byStep = new Map<string, GradeDetail[]>()
  if (args.resume) {
    const prior = JSON.parse(readFileSync(args.resume, 'utf8')) as { grader?: string; grades?: Record<string, GradeDetail[]> }
    if ((prior.grader ?? 'production') !== (args.fake ?? 'production')) fail(2, `--resume file was graded by ${prior.grader}, this run is ${args.fake ?? 'production'}`)
    let reused = 0
    for (const p of prompts) for (let i = 0; i < p.steps.length; i++) {
      const got = (prior.grades?.[keyOf(p, i)] ?? []).slice(0, args.n)
      if (got.length) { byStep.set(keyOf(p, i), got); reused += got.length }
    }
    console.log(`resume: reused ${reused} grades from ${args.resume} (only unchanged step+prompt content is reused)`)
  }

  // Whole grades that came back with NO band even after the pipeline's own
  // per-stage schema retries (withSchemaRetry, 3 attempts per stage). Each
  // is a request on which a student would have got an error. Reported
  // whether or not this runner's outer retry then recovered it.
  const attemptFailures: Array<{ stepId: string; stage: string; message: string }> = []
  const tasks: Array<() => Promise<void>> = []
  for (const p of prompts) {
    for (let i = 0; i < p.steps.length; i++) {
      const have = byStep.get(keyOf(p, i))?.length ?? 0
      for (let r = have; r < args.n; r++) {
        tasks.push(async () => {
          for (let attempt = 0; attempt <= args.retries; attempt++) {
            try {
              const g = await grader(p, i)
              if (!Number.isFinite(g.band) || g.band < 0 || g.band > 5) {
                throw Object.assign(new Error(`band ${g.band} is not a finite 0-5 value`), { stage: 'result' })
              }
              byStep.set(keyOf(p, i), [...(byStep.get(keyOf(p, i)) ?? []), g])
              return
            } catch (e) {
              const stage = (e as { stage?: string }).stage ?? 'unknown'
              const message = e instanceof Error ? e.message : String(e)
              attemptFailures.push({ stepId: p.steps[i]!.id, stage, message })
              console.warn(`  attempt failed ${p.steps[i]!.id} [${stage}] ${attempt < args.retries ? '(retrying)' : '(giving up)'}: ${message.slice(0, 120)}`)
            }
          }
        })
      }
    }
  }
  const started = Date.now()
  await pool(tasks, args.concurrency)

  const writeRaw = (partial: boolean) => {
    if (!args.json) return
    writeFileSync(args.json, JSON.stringify({
      banner: BANNER,
      ranAt: new Date().toISOString(),
      grader: args.fake ?? 'production',
      n: args.n,
      partial,
      attemptFailures,
      stageRetries,
      grades: Object.fromEntries(byStep),
    }, null, 2))
    console.log(`raw grades${partial ? ' (PARTIAL — resume with --resume=' + args.json + ')' : ''} → ${args.json}`)
  }

  if (attemptFailures.length) {
    const byKey = new Map<string, number>()
    for (const f of attemptFailures) byKey.set(`${f.stepId} [${f.stage}]`, (byKey.get(`${f.stepId} [${f.stage}]`) ?? 0) + 1)
    console.log(`
GRADER FAILURES — ${attemptFailures.length} grade(s) produced no band after the pipeline's stage retries (each is an error a student would see)`)
    for (const [k, c] of byKey) console.log(`  ${k}: ${c}`)
  }
  {
    const byKey = new Map<string, number>()
    for (const f of stageRetries) byKey.set(`${f.stepId} [${f.stage}]`, (byKey.get(`${f.stepId} [${f.stage}]`) ?? 0) + 1)
    console.log(`\nSTAGE SCHEMA FAILURES retried inside the pipeline: ${stageRetries.length} attempt(s)${stageRetries.length ? ' (a grade still failing after 3 attempts appears under GRADER FAILURES)' : ''}`)
    for (const [k, c] of byKey) console.log(`  ${k}: ${c}`)
  }
  const missing: string[] = []
  for (const p of prompts) for (let i = 0; i < p.steps.length; i++) {
    const got = byStep.get(keyOf(p, i))?.length ?? 0
    if (got !== args.n) missing.push(`${p.steps[i]!.id}: ${got} of ${args.n} repeats graded`)
  }
  if (missing.length) {
    for (const f of missing) console.error(`  ✗ ${f}`)
    writeRaw(true)
    fail(1, `${missing.length} step(s) short of N=${args.n} — no statistics over a partial ladder`)
  }
  console.log(`graded ${tasks.length} new in ${((Date.now() - started) / 1000).toFixed(0)}s`)
  writeRaw(false)

  let graded: GradedStep[] = prompts.flatMap(p => p.steps.map(s => ({
    promptId: p.id,
    taskType: p.taskType,
    stepId: s.id,
    parent: s.parent,
    changed: s.changed,
    intendedBand: s.intendedBand,
    given: byStep.get(keyOf(p, p.steps.indexOf(s)))!.map(g => g.band),
  })))
  if (args.shuffleSeed !== null) {
    // Break-test: permute the intended LABELS within each prompt.
    const out: GradedStep[] = []
    for (const p of prompts) out.push(...shuffleIntended(graded.filter(g => g.promptId === p.id), args.shuffleSeed + p.id.length))
    graded = out
    console.log(`BREAK-TEST: intended labels shuffled within each prompt (seed ${args.shuffleSeed}). Ordering MUST look broken.`)
  }

  console.log('\nper step (intended → each repeat; relevance level / language score / ceiling)')
  for (const s of graded) {
    const pr = prompts.find(p => p.id === s.promptId)!
    const ds = byStep.get(keyOf(pr, pr.steps.findIndex(x => x.id === s.stepId)))!
    const diag = ds.map(d => `${d.relevanceLevel ?? '—'}/${d.languageScore ?? '—'}${d.ceilingApplied ? '↓' : ''}${d.zeroReasons.length ? ` ZERO:${d.zeroReasons.join('+')}` : ''}`)
    console.log(`  ${s.stepId.padEnd(18)} ${String(s.intendedBand).padStart(3)} → ${s.given.join(', ').padEnd(14)} ${[...new Set(diag)].join(' | ')}`)
  }

  const taskTypes = [...new Set(graded.map(g => g.taskType))]
  for (const t of taskTypes) report(`${t} (${SKILL_OF_TASK[t]})${t === 'take_interview' ? ' — TRANSCRIPT PATH ONLY, delivery untested' : ''}`, graded.filter(g => g.taskType === t))
  if (taskTypes.length > 1) report('ALL TASK TYPES', graded)

  console.log(`\n${BANNER}`)
}

main().catch(e => { console.error(e); process.exit(1) })
