#!/usr/bin/env node
/**
 * MC-ATTACK 2026-08-18 scorer. Files only — reads key + solver JSONs,
 * prints per-type metrics. No DB access at all.
 *
 *   node mcatk-score.mjs <slug> <solver.json> [solver2.json ...] [--shift N]
 *
 * --shift N break-tests the scorer: rotates the key letters by N items
 * (solver 1's answers scored against item i+N's key). A real solver file
 * must drop to ~chance under any nonzero shift, or the scorer is reading
 * position, not content.
 */
import { readFileSync } from 'node:fs'

const DIR = '/Users/andylee/Downloads/saas/classraum/scripts/study-bank'
const args = process.argv.slice(2)
const shiftIdx = args.indexOf('--shift')
const shift = shiftIdx === -1 ? 0 : Number(args[shiftIdx + 1])
const [slug, ...solverPaths] = args.filter((a, i) => shiftIdx === -1 || (i !== shiftIdx && i !== shiftIdx + 1))

const key = JSON.parse(readFileSync(`${DIR}/mcatk-${slug}.key.json`, 'utf8'))
const nums = Object.keys(key).filter(k => !k.startsWith('_')).sort((a, b) => a - b)
const solvers = solverPaths.map(p => JSON.parse(readFileSync(p, 'utf8')))

for (let i = 0; i < solvers.length; i++) {
  const missing = nums.filter(n => !solvers[i]?.[n]?.pick)
  if (missing.length) {
    console.error(`REFUSING: ${solverPaths[i]} missing ${missing.length}/${nums.length} answers (e.g. ${missing.slice(0, 5).join(',')})`)
    process.exit(2)
  }
}

// effective key (optionally shifted for the break-test)
const eff = {}
nums.forEach((n, i) => { eff[n] = key[nums[(i + shift) % nums.length]].letter })

const perSolver = solvers.map(s => nums.filter(n => s[n].pick === eff[n]).length)
const spread = {}
for (const n of nums) spread[eff[n]] = (spread[eff[n]] ?? 0) + 1
const control = Math.max(...Object.values(spread))
const allGot = nums.filter(n => solvers.every(s => s[n].pick === eff[n]))
const anyGot = nums.filter(n => solvers.some(s => s[n].pick === eff[n]))
const mean = perSolver.reduce((a, b) => a + b, 0) / solvers.length

// per-cohort mean
const byCohort = {}
for (const n of nums) {
  const c = key[n].cohort ?? '?'
  byCohort[c] ??= { items: 0, correct: 0 }
  byCohort[c].items++
  byCohort[c].correct += solvers.filter(s => s[n].pick === eff[n]).length
}

console.log(`type         : ${slug}${shift ? `   *** BREAK-TEST shift=${shift} ***` : ''}`)
console.log(`items        : ${nums.length}   solvers: ${solvers.length}`)
console.log(`per-solver   : ${perSolver.map((c, i) => `${solverPaths[i].split('/').pop()}: ${c}/${nums.length} (${(100 * c / nums.length).toFixed(1)}%)`).join('  ')}`)
console.log(`mean blind   : ${(100 * mean / nums.length).toFixed(1)}%`)
console.log(`best solver  : ${(100 * Math.max(...perSolver) / nums.length).toFixed(1)}%`)
console.log(`control      : ${(100 * control / nums.length).toFixed(1)}% (best fixed letter: ${JSON.stringify(spread)})`)
console.log(`margin       : ${(100 * (mean / nums.length - control / nums.length)).toFixed(1)}pts (mean - control)`)
console.log(`all-solvers  : ${allGot.length}/${nums.length} solved by every solver   any: ${anyGot.length}`)
console.log('per cohort   :')
for (const [c, v] of Object.entries(byCohort).sort())
  console.log(`  ${c.padEnd(12)} ${String(v.items).padStart(3)} items  ${(100 * v.correct / (v.items * solvers.length)).toFixed(1)}%`)
