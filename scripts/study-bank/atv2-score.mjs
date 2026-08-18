#!/usr/bin/env node
/**
 * ATV2 pilot scorer. Content-agnostic: compares solver letter picks to the
 * key file. Break-test mode: --shift N rotates every key letter by N
 * (A->B->C->D->A); a real scorer must then score near chance.
 *
 *   node atv2-score.mjs [--shift N]
 */
import { readFileSync } from 'node:fs'

const DIR = '/Users/andylee/Downloads/saas/classraum/scripts/study-bank'
// --batch bN: score atv2-bN-key.json / atv2-bN-solver-{a,b,c}.json (32 items)
const bArg = process.argv.indexOf('--batch')
const BATCH = bArg > -1 ? process.argv[bArg + 1] : null
if (bArg > -1 && !/^[a-z][a-z0-9]*$/.test(BATCH)) { console.error('FAIL: bad --batch'); process.exit(1) }
const KEYF = BATCH ? `atv2-${BATCH}-key.json` : 'atv2-pilot.key.json'
const SOLVER = (s) => BATCH ? `atv2-${BATCH}-solver-${s}.json` : `atv2-pilot.solver-${s}.json`
const NITEMS = BATCH ? (BATCH === 'b4' ? 36 : 32) : 24 // b4: 9 lectures
const LETTERS = ['A', 'B', 'C', 'D']
const shiftArg = process.argv.indexOf('--shift')
const shift = shiftArg > -1 ? parseInt(process.argv[shiftArg + 1], 10) : 0

const key = JSON.parse(readFileSync(`${DIR}/${KEYF}`, 'utf8'))
const ns = Object.keys(key)
if (ns.length !== NITEMS) { console.error(`FAIL: key has ${ns.length} entries, expected ${NITEMS}`); process.exit(1) }
const keyLetter = (n) => LETTERS[(LETTERS.indexOf(key[n].letter) + shift + 400) % 4]

// fixed-letter control (verified, not assumed)
let control = 0
for (const l of LETTERS) {
  const c = ns.filter(n => keyLetter(n) === l).length
  if (c > control) control = c
}
const controlPct = control / ns.length * 100

const solvers = ['a', 'b', 'c']
const results = []
const perItemCorrect = Object.fromEntries(ns.map(n => [n, 0]))
for (const s of solvers) {
  const picks = JSON.parse(readFileSync(`${DIR}/${SOLVER(s)}`, 'utf8'))
  const missing = ns.filter(n => !picks[n] || !LETTERS.includes(picks[n].pick))
  if (missing.length) { console.error(`FAIL: solver-${s} missing/invalid picks for items ${missing.join(',')}`); process.exit(1) }
  let correct = 0, confident = 0, confCorrect = 0
  const spread = { A: 0, B: 0, C: 0, D: 0 }
  for (const n of ns) {
    spread[picks[n].pick]++
    const ok = picks[n].pick === keyLetter(n)
    if (ok) { correct++; perItemCorrect[n]++ }
    if (picks[n].confident) { confident++; if (ok) confCorrect++ }
  }
  results.push({ s, correct, pct: correct / ns.length * 100, confident, confCorrect, spread })
}

for (const r of results) {
  console.log(`solver ${r.s}   ${String(r.correct).padStart(2)}/${NITEMS} = ${r.pct.toFixed(1)}%   confident ${r.confCorrect}/${r.confident}   spread ${LETTERS.map(l => r.spread[l]).join('/')}`)
}
const mean = results.reduce((s, r) => s + r.pct, 0) / results.length
const margin = mean - controlPct
const allSolved = ns.filter(n => perItemCorrect[n] === 3).length
const noneSolved = ns.filter(n => perItemCorrect[n] === 0).length
console.log(`\nMEAN ${mean.toFixed(1)}%   control ${controlPct.toFixed(1)}%   margin ${margin >= 0 ? '+' : ''}${margin.toFixed(1)}${shift ? `   [SHIFT ${shift} — break-test]` : ''}`)
console.log(`all-3-solved ${allSolved}/${NITEMS}   zero-solver items ${noneSolved}/${NITEMS}`)
// pre-registered rule (ATV2-DESIGN.md): >= +30 killed, <= +25 clear, else inconclusive
if (!shift) {
  const verdict = margin >= 30 ? 'KILLED (>= +30)' : margin <= 25 ? 'CLEAR (<= +25)' : 'INCONCLUSIVE (25-30)'
  console.log(`pre-registered verdict at n=${NITEMS}: ${verdict}`)
}
