/**
 * Score a no-source attack. See ANSWERABILITY-GATE.md for the full protocol.
 *
 *   node scripts/study-bank/score-blind.mjs <key.json> <solver1.json> [solver2.json ...]
 *
 * key.json     : { "1": {"letter":"C"}, ... }            one entry per item
 * solverN.json : { "1": {"pick":"C","basis":"confident"|"guess"}, ... }
 *
 * Optional: pass --blind <blind.json> to also report per-set full-marks
 * rates, where blind.json items carry a `set` field. A solver that only
 * exploits within-set consistency (guess the topic once, answer four
 * questions coherently) is a different failure from a per-item option tell.
 *
 * Two things this prints that a naive scorer would not, and both matter:
 *
 *   - Every fixed-letter control, not just "chance is 25%". Key positions
 *     are not uniform. One real cohort sat at 40% on C, so "always C" beat
 *     a solver that had genuinely learned nothing.
 *   - Each solver's own pick spread. IDENTICAL spreads across independent
 *     solvers is the signature of a deterministic tell — it is what every
 *     failing verbal task type showed and what sound maths did not. Read
 *     that before you read the accuracy.
 */
import { readFileSync, existsSync } from 'node:fs'

const argv = process.argv.slice(2)
const blindIx = argv.indexOf('--blind')
let blindPath = null
if (blindIx !== -1) { blindPath = argv[blindIx + 1]; argv.splice(blindIx, 2) }

const ceilIx = argv.indexOf('--ceiling')
let ceiling = null
if (ceilIx !== -1) {
  ceiling = Number(argv[ceilIx + 1]); argv.splice(ceilIx, 2)
  if (!Number.isFinite(ceiling)) { console.error('--ceiling needs a number of points'); process.exit(2) }
}

const [keyPath, ...solverPaths] = argv
if (!keyPath || !solverPaths.length) {
  console.error('usage: score-blind.mjs [--blind blind.json] <key.json> <solver.json...>')
  process.exit(2)
}

const LETTERS = ['A', 'B', 'C', 'D']
const key = JSON.parse(readFileSync(keyPath, 'utf8'))
const ids = Object.keys(key)
const N = ids.length

let setOf = null
if (blindPath && existsSync(blindPath)) {
  const blind = JSON.parse(readFileSync(blindPath, 'utf8'))
  if (blind.some(b => b.set !== undefined)) {
    setOf = Object.fromEntries(blind.map(b => [String(b.n), b.set]))
  }
}

const controls = LETTERS.map(L => ({ L, hits: ids.filter(n => key[n].letter === L).length }))
const best = Math.max(...controls.map(c => c.hits))
console.log(`items ${N}   chance 25.0%`)
console.log('controls: ' + controls.map(c => `${c.L}=${(100 * c.hits / N).toFixed(1)}%`).join('  ') +
  `   best fixed-letter ${(100 * best / N).toFixed(1)}%\n`)

const spreads = []
const scores = []
/** Solver files that did not answer every item. See the refusal below. */
const incomplete = []
for (const p of solverPaths) {
  if (!existsSync(p)) { console.log(`${p}: MISSING`); continue }
  const ans = JSON.parse(readFileSync(p, 'utf8'))
  const answered = Object.keys(ans).length
  if (answered !== N) {
    console.log(`!! ${p}: ${answered} answers for ${N} items`)
    incomplete.push({ name: p.split('/').pop(), answered })
  }

  let hit = 0, confN = 0, confHit = 0, gN = 0, gHit = 0
  const picks = { A: 0, B: 0, C: 0, D: 0 }
  const perSet = {}
  for (const n of ids) {
    const a = ans[n]; if (!a) continue
    picks[a.pick] = (picks[a.pick] ?? 0) + 1
    const ok = a.pick === key[n].letter
    if (ok) hit++
    if (a.basis === 'confident') { confN++; if (ok) confHit++ } else { gN++; if (ok) gHit++ }
    if (setOf) (perSet[setOf[n]] ??= []).push(ok)
  }
  scores.push(hit)
  const spread = LETTERS.map(l => picks[l] ?? 0).join('/')
  spreads.push(spread)
  let line = `${p.split('/').pop()}: ${hit}/${N} = ${(100 * hit / N).toFixed(1)}%` +
    `   confident ${confHit}/${confN}` +
    (gN ? `   guesses ${gHit}/${gN} = ${(100 * gHit / gN).toFixed(0)}%` : '') +
    `   spread ${spread}`
  if (setOf) {
    const full = Object.values(perSet).filter(v => v.every(Boolean)).length
    line += `   sets fully correct ${full}/${Object.keys(perSet).length}`
  }
  console.log(line)
}

if (!scores.length) process.exit(1)

const mean = 100 * (scores.reduce((a, b) => a + b, 0) / scores.length) / N
const ctl = 100 * best / N
console.log(`\nMEAN ${mean.toFixed(1)}%   vs control ${ctl.toFixed(1)}%`)

// The variance condition. Independent solvers converging on the same picks
// is stronger evidence of a tell than the accuracy number itself.
const identical = spreads.length > 1 && new Set(spreads).size === 1
if (identical) {
  console.log(`!! all ${spreads.length} solvers produced an IDENTICAL pick spread (${spreads[0]}).`)
  console.log('   Independent solvers do not agree by accident — this is a deterministic tell.')
}

// REFUSE A VERDICT ON AN INCOMPLETE SOLVER FILE.
//
// A solver that answered nothing scores 0%, which is "at or below control",
// which printed PASS. A silently dead solver — a crashed agent, a truncated
// write, a wrong path — was therefore indistinguishable from a clean cohort,
// and PASS is the line people read. The `!!` warning above was printed in
// the same run and did not stop it.
//
// This is the exact failure this repo keeps hitting: a check that cannot go
// red. Refusing is the only safe answer, because a partial file understates
// accuracy in proportion to how much is missing.
if (incomplete.length) {
  console.log('')
  for (const s of incomplete) {
    console.log(`REFUSED — ${s.name} answered ${s.answered} of ${N} items.`)
  }
  console.log('  A missing answer is scored as wrong, so an incomplete file always')
  console.log('  UNDERSTATES accuracy — the direction that manufactures a pass.')
  console.log('  Re-run the solver; do not read a verdict from this.')
  process.exit(2)
}

const margin = mean - ctl
console.log(`margin ${margin.toFixed(1)}pts over this cohort's own fixed-letter control.`)

/*
 * THE VERDICT.
 *
 * Pass --ceiling <pts> with the published baseline for THIS format and
 * the line below is the real one. Without it the script prints no
 * verdict at all, deliberately.
 *
 * The old default was `mean <= control`, and it is unreachable:
 * measured against 183 official items, published ETS and College Board
 * questions beat their own controls by +25.5 to +68.8. So that bar
 * fails a batch as good as the real exam. It was left in place with a
 * NOTE underneath explaining it was superseded — and a QC writeup then
 * recorded reading PASS off it and having to discard the run. A
 * verdict nobody should use should not be printed; the explanatory
 * paragraph under it does not undo the word PASS.
 *
 * ceilingFor() in src/lib/study/bank-ledger.ts holds the per-format
 * numbers. Choose a Response is +25.5 published, 29.5 with tolerance.
 */
if (ceiling === null) {
  console.log('')
  console.log('NO VERDICT — pass --ceiling <pts> with the published baseline for this')
  console.log('  format to get one. See ceilingFor() in src/lib/study/bank-ledger.ts.')
  console.log('  There is no format-independent bar: "at or below control" fails items')
  console.log('  as good as the real exam, and 25% is not what published items score.')
  process.exit(0)
}
console.log('')
if (identical) {
  console.log(`FAIL — solvers produced an identical spread, so the margin is not the point.`)
  process.exit(1)
}
if (margin <= ceiling) {
  console.log(`PASS — ${margin.toFixed(1)}pts is within the ${ceiling}pt published ceiling for this format.`)
} else {
  console.log(`FAIL — ${margin.toFixed(1)}pts exceeds the ${ceiling}pt published ceiling by ${(margin - ceiling).toFixed(1)}.`)
  process.exit(1)
}
