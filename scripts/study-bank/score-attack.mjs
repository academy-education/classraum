#!/usr/bin/env node
// score-attack.mjs <tag> [solverSuffixes...]  — score <tag>.solver-*.json (or
// <tag>.grader-*.json) against <tag>.key.json. Prints per-solver accuracy,
// confident-subset accuracy, and per-item hit counts (items every solver got
// are the ones with a tell).
import { readFileSync, existsSync } from 'node:fs'
const [tag, ...suff] = process.argv.slice(2)
const key = JSON.parse(readFileSync(`scripts/study-bank/${tag}.key.json`, 'utf8'))
const ids = Object.keys(key)
const files = (suff.length ? suff : ['solver-a', 'solver-b', 'solver-c']).map(s => `scripts/study-bank/${tag}.${s}.json`).filter(existsSync)
const hits = Object.fromEntries(ids.map(i => [i, 0]))
for (const f of files) {
  const s = JSON.parse(readFileSync(f, 'utf8'))
  let ok = 0, cOk = 0, cN = 0, n = 0
  for (const i of ids) { const v = s[i]; if (!v) continue; n++; const h = v.pick === key[i].letter; if (h) { ok++; hits[i]++ } if (v.basis === 'confident') { cN++; if (h) cOk++ } }
  console.log(`${f.split('/').pop()}: ${ok}/${n} = ${(100 * ok / n).toFixed(1)}%  confident ${cOk}/${cN}`)
}
const tot = Object.values(hits).reduce((a, b) => a + b, 0)
console.log(`mean ${(100 * tot / (ids.length * files.length)).toFixed(1)}% vs chance 25.0 (margin ${(100 * tot / (ids.length * files.length) - 25).toFixed(1)})`)
const dist = {}; for (const h of Object.values(hits)) dist[h] = (dist[h] ?? 0) + 1
console.log('items by #solvers correct:', dist)
console.log('solved by all:', ids.filter(i => hits[i] === files.length).map(i => `${i}=${key[i].localId}`).join(' '))
