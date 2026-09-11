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
/*
 * THE CHANCE LINE IS DERIVED, NOT 25.0 — fixed 2026-09-11.
 *
 * This printed "vs chance 25.0" unconditionally. SSAT items are FIVE
 * choices, so every SSAT run scored here was compared against a line five
 * points too high, understating the margin by 5 points on the only family
 * where the blind attack is known to discriminate cleanly (shipped SSAT
 * reading measures 12.5%). Its partner defect was in make-options-only.mjs,
 * which hardcoded a four-option render and silently dropped a distractor
 * from every five-choice item — so the two agreed with each other and
 * neither described the item.
 *
 * Width comes from the blind file when it is there, because that is what
 * the solver actually saw. CLAUDE.md: derive the control from the data,
 * never a literal.
 */
let width = null
const blindPath = `scripts/study-bank/${tag}.blind.json`
if (existsSync(blindPath)) {
  const b = JSON.parse(readFileSync(blindPath, 'utf8'))
  const list = Array.isArray(b) ? b : Object.values(b)
  const w = [...new Set(list.map(x => Object.keys(x.options ?? {}).length).filter(Boolean))]
  if (w.length === 1) width = w[0]
  else if (w.length > 1) {
    console.error(`REFUSING: ${blindPath} mixes option counts (${w.sort().join(', ')}). One render, one chance line.`)
    process.exit(2)
  }
}
if (width === null) {
  console.error(`REFUSING: cannot read an option count for ${tag} — no ${tag}.blind.json. A margin against an assumed chance line is not a measurement.`)
  process.exit(2)
}
const chance = 100 / width
const tot = Object.values(hits).reduce((a, b) => a + b, 0)
const mean = 100 * tot / (ids.length * files.length)
console.log(`width ${width} choices -> chance ${chance.toFixed(1)}%`)
console.log(`mean ${mean.toFixed(1)}% vs chance ${chance.toFixed(1)} (margin ${(mean - chance).toFixed(1)})`)
const dist = {}; for (const h of Object.values(hits)) dist[h] = (dist[h] ?? 0) + 1
console.log('items by #solvers correct:', dist)
console.log('solved by all:', ids.filter(i => hits[i] === files.length).map(i => `${i}=${key[i].localId}`).join(' '))
