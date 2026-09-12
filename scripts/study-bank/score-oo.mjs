#!/usr/bin/env node
/**
 * score-oo.mjs <tag> [--stratify-midrun]
 *
 * Score an options-only attack against the control DERIVED from its own key
 * deal. Refuses a partial solver set: "score-attack reports solved-by-all over
 * the files it finds" once produced a 60.0% control computed from one of three
 * solver files, and that number was reported.
 *
 * --stratify-midrun splits the items by whether three of their four options
 * form an arithmetic or geometric run with one option at the middle. A solver
 * asked for exactly this split BEFORE seeing any key: the channel fires on far
 * more items than chance, but the enrichment is direction-blind -- distractors
 * built as key, key+d, key+2d put the KEY at the end of the run and produce
 * the identical count. It is only a tell if the run-middle items score above
 * the rest. That comparison is the measurement; the raw count is not.
 */
import { readFileSync, existsSync } from 'node:fs'
const D = 'scripts/study-bank'
const tag = process.argv[2]
if (!tag) { console.error('usage: score-oo.mjs <tag> [--stratify-midrun]'); process.exit(2) }

const keyPath = `${D}/${tag}-oo.key.json`
if (!existsSync(keyPath)) { console.error(`REFUSING: ${keyPath} not found.`); process.exit(2) }
const key = JSON.parse(readFileSync(keyPath, 'utf8'))
const blind = JSON.parse(readFileSync(`${D}/${tag}-oo.blind.json`, 'utf8'))

const names = ['a', 'b', 'c']
const missing = names.filter(n => !existsSync(`${D}/${tag}-oo.solver-${n}.json`))
if (missing.length) {
  console.error(`REFUSING: solver file(s) missing: ${missing.join(', ')}. A partial run is not a run.`)
  process.exit(2)
}
const solvers = names.map(n => JSON.parse(readFileSync(`${D}/${tag}-oo.solver-${n}.json`, 'utf8')))

const ids = Object.keys(key)
const W = Object.keys(blind[ids[0]].options).length
const chance = 100 / W
const dealt = {}
for (const k of Object.values(key)) dealt[k.letter] = (dealt[k.letter] ?? 0) + 1
const control = 100 * Math.max(...Object.values(dealt)) / ids.length

for (const [i, s] of solvers.entries()) {
  const gaps = ids.filter(id => !s[id]?.pick)
  if (gaps.length) { console.error(`REFUSING: solver ${names[i]} skipped ${gaps.length} item(s).`); process.exit(2) }
}

/* Does this item's option set put ONE option at the middle of an arith or geo
 * run formed by three of the four? Computed from the blind file, so it is
 * independent of the key -- which is the whole point. */
function midRun(id) {
  const vals = Object.values(blind[id].options).map(v => Number(String(v).replace(/[^0-9.\-]/g, '')))
  if (vals.some(v => !Number.isFinite(v))) return false
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (let c = 0; c < 4; c++) {
    if (a === b || b === c || a === c) continue
    const [x, y, z] = [vals[a], vals[b], vals[c]]
    if (Math.abs((y - x) - (z - y)) < 1e-9 && Math.abs(y - x) > 1e-9) return true
    if (x !== 0 && y !== 0 && Math.abs(y / x - z / y) < 1e-9 && Math.abs(y / x - 1) > 1e-9) return true
  }
  return false
}

function report(label, subset) {
  if (!subset.length) { console.log(`${label.padEnd(30)} (no items)`); return null }
  let ok = 0, n = 0
  for (const id of subset) for (const s of solvers) { n++; if (s[id].pick === key[id].letter) ok++ }
  const rate = 100 * ok / n
  console.log(`${label.padEnd(30)} ${String(ok).padStart(3)}/${String(n).padEnd(3)} = ${rate.toFixed(1).padStart(5)}%   margin ${(rate - control >= 0 ? '+' : '') + (rate - control).toFixed(1)}`)
  return { ok, n, rate }
}

console.log(`${tag}: ${ids.length} items, ${W}-choice, 3 solvers, ${ids.length * 3} picks`)
console.log(`keys dealt ${JSON.stringify(dealt)}  ->  chance ${chance.toFixed(1)}%, best-fixed-letter control ${control.toFixed(1)}%\n`)

report('OVERALL', ids)
console.log('')
for (const [i, s] of solvers.entries()) {
  const ok = ids.filter(id => s[id].pick === key[id].letter).length
  console.log(`  solver ${names[i]}                     ${String(ok).padStart(3)}/${ids.length}  = ${(100 * ok / ids.length).toFixed(1).padStart(5)}%`)
}

const all3 = ids.filter(id => solvers.every(s => s[id].pick === key[id].letter))
console.log(`\nsolved by ALL THREE: ${all3.length}${all3.length ? ' -> ' + all3.join(', ') : ''}`)
const expAll3 = ids.length * Math.pow(control / 100, 3)
console.log(`  expected at the control rate: ${expAll3.toFixed(2)}`)

if (process.argv.includes('--stratify-midrun')) {
  const mid = ids.filter(midRun), rest = ids.filter(id => !midRun(id))
  console.log(`\nPRE-REGISTERED SPLIT (a solver asked for this before any key was seen):`)
  console.log(`the run-middle channel fires on ${mid.length} of ${ids.length} items; it is a tell only if they score ABOVE the rest.`)
  const a = report('  run-middle present', mid)
  const b = report('  no run-middle', rest)
  if (a && b) {
    const d = a.rate - b.rate
    console.log(`\n  difference ${(d >= 0 ? '+' : '') + d.toFixed(1)} points.`)
    console.log(d > 10 ? '  -> the structure points AT the key. Real channel, act on it.'
      : d < -10 ? '  -> the structure points AWAY from the key (distractors run, key sits outside). Not a leak.'
      : '  -> no direction. The options are more structured than random and it does not help a solver.')
  }
}

const pooledOk = ids.reduce((t, id) => t + solvers.filter(s => s[id].pick === key[id].letter).length, 0)
const n = ids.length * 3, p = pooledOk / n, z = 1.96, d = 1 + z * z / n
const c = (p + z * z / (2 * n)) / d
const h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
console.log(`\noverall 95% CI ${(100 * (c - h)).toFixed(1)}% - ${(100 * (c + h)).toFixed(1)}%  against control ${control.toFixed(1)}%`)
