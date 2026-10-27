#!/usr/bin/env node
/**
 * make-slots.mjs: writes slots.json for the MAP Science pilot (36 slots, 3 authors L / P / E, one per area).
 * It is seeded and deterministic (SEED below). Re-running it must reproduce slots.json byte for byte, and
 * `--check` verifies that without writing.
 *
 *   node scripts/study-bank/map-v2-work/science-pilot/make-slots.mjs           # write slots.json
 *   node scripts/study-bank/map-v2-work/science-pilot/make-slots.mjs --check   # exit 1 if slots.json differs
 *
 * Fixed per slot: area, grade, tier, DCI, kind, stimulus, option format, ask, key letter, key rank, invented system.
 *
 * WHY THE ASSIGNMENT IS SEEDED, NOT LEFT TO AUTHORS (CLAUDE.md "a batch built to one brief develops a cross-item
 * tell"; MAP-PLAN 2026-10-23 §2.2: map-lu-v6 passed only once the construction was assigned per slot):
 *   - key letter flat per author (3/3/3/3) and per batch (9/9/9/9)
 *   - key rank flat per author and per batch, and NOT tied to the letter: every letter carries at least two
 *     distinct ranks per author, and no letter x rank cell holds more than 3 of the 36
 *   - the load-bearing element varies across items: `ask` rotates through each format's list, so (for example) a
 *     trend key is not always "increases", a variable item does not always ask for the controlled variable, and a
 *     conditions key is not always the greatest
 *   - each grade gets exactly one model (K) item per author, and the three investigation slots fall in three grades
 *   - DCIs round-robin per author, so no author writes three items on one idea
 * The generator retries seeds deterministically until every constraint holds, then verifies the result again.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rng, shuffleWith } from '../../seeded-shuffle.mjs'
import { AREAS, DCIS, TIERS, DIFF, RIT, ASKS, LETTERS } from './sci-spec.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, 'slots.json')
const SEED = 20261027

/** Kind / stimulus / format per template row. The P author's row 8 is a trend over a procedure + table instead of a
 *  claim, which keeps D-claims at 2 of 24 data/investigation slots (the plan's cap is 1 in 10). */
const TEMPLATE = [
  ['data', 'table', 'values'],
  ['data', 'table', 'conditions'],
  ['data', 'bar', 'conditions'],
  ['data', 'line', 'values'],
  ['data', 'scatter', 'trend'],
  ['investigation', 'procedure', 'variable'],
  ['investigation', 'procedure+table', 'conditions'],
  ['investigation', 'procedure', 'claim'],
  ['model', 'scenario', 'term'],
  ['model', 'scenario', 'term'],
  ['model', 'scenario', 'claim'],
  ['model', 'scenario', 'claim'],
]
const askList = (kind, format) => format === 'claim'
  ? (kind === 'model' ? ['explains', 'predicts'] : ['supported', 'not-supported'])
  : ASKS[format]

function build(seed) {
  const rand = rng(seed)
  const out = {}
  const askCursor = {}           // batch-wide rotation per (kind, format)
  const cross = {}               // letter x rank across the batch
  for (const [code, area] of Object.entries(AREAS)) {
    const tmpl = TEMPLATE.map(r => r.slice())
    if (code === 'P') tmpl[7] = ['investigation', 'procedure+table', 'trend']
    // grade x tier cells, shuffled onto template rows
    const cells = shuffleWith([5, 6, 7, 8].flatMap(g => TIERS.map(t => [g, t])), rand)
    const kGrades = new Set(), invGrades = new Set()
    tmpl.forEach(([kind], i) => { const g = cells[i][0]; if (kind === 'model') kGrades.add(g); if (kind === 'investigation') invGrades.add(g) })
    if (kGrades.size !== 4 || invGrades.size !== 3) return null
    // DCIs round-robin in a seeded order
    const d = shuffleWith(DCIS[area].slice(), rand)
    const dcis = shuffleWith(Array.from({ length: 12 }, (_, i) => d[i % d.length]), rand)
    // letters and ranks: flat, decoupled
    const letters = shuffleWith(LETTERS.flatMap(l => [l, l, l]), rand)
    const ranks = shuffleWith([1, 2, 3, 4].flatMap(r => [r, r, r]), rand)
    for (const l of LETTERS) {
      const rs = new Set(letters.map((x, i) => (x === l ? ranks[i] : null)).filter(Boolean))
      if (rs.size < 2) return null
    }
    const rows = tmpl.map(([kind, stimulus, format], i) => {
      const k = `${kind}/${format}`, list = askList(kind, format)
      askCursor[k] = askCursor[k] ?? Math.floor(rand() * list.length)
      const ask = list[askCursor[k]++ % list.length]
      const [g, tier] = cells[i]
      const cell = `${letters[i]}${ranks[i]}`; cross[cell] = (cross[cell] ?? 0) + 1
      return {
        id: `MSP-${code}-${String(i + 1).padStart(2, '0')}`,
        g, tier, difficulty: DIFF[tier], rit_band: RIT[g][tier], dci: dcis[i],
        kind, stimulus, format, ask, key: letters[i], rank: ranks[i],
        invent: kind !== 'model',
      }
    }).sort((a, b) => a.g - b.g || TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier))
    // renumber in grade order so the table reads naturally
    rows.forEach((r, i) => { r.id = `MSP-${code}-${String(i + 1).padStart(2, '0')}` })
    out[code] = { area, rows }
  }
  if (Object.values(cross).some(n => n > 3)) return null
  return out
}

/** Every constraint, re-checked on the output (and on any slots.json handed to --verify). Returns problems. */
export function verifySlots(S) {
  const p = [], all = []
  for (const [code, { area, rows }] of Object.entries(S)) {
    if (AREAS[code] !== area) p.push(`${code}: area ${area}`)
    if (rows.length !== 12) p.push(`${code}: ${rows.length} rows`)
    const cnt = (f) => { const c = {}; for (const r of rows) c[f(r)] = (c[f(r)] ?? 0) + 1; return c }
    const lc = cnt(r => r.key), rc = cnt(r => r.rank), gc = cnt(r => r.g)
    if (LETTERS.some(l => lc[l] !== 3)) p.push(`${code}: key letters ${JSON.stringify(lc)}`)
    if ([1, 2, 3, 4].some(r => rc[r] !== 3)) p.push(`${code}: ranks ${JSON.stringify(rc)}`)
    if ([5, 6, 7, 8].some(g => gc[g] !== 3)) p.push(`${code}: grades ${JSON.stringify(gc)}`)
    for (const g of [5, 6, 7, 8]) {
      const ts = rows.filter(r => r.g === g).map(r => r.tier).sort().join(',')
      if (ts !== 'high,low,mid') p.push(`${code}: grade ${g} tiers ${ts}`)
      if (rows.filter(r => r.g === g && r.kind === 'model').length !== 1) p.push(`${code}: grade ${g} model items != 1`)
    }
    if (new Set(rows.filter(r => r.kind === 'investigation').map(r => r.g)).size !== 3) p.push(`${code}: investigation slots not in 3 grades`)
    for (const l of LETTERS) if (new Set(rows.filter(r => r.key === l).map(r => r.rank)).size < 2) p.push(`${code}: letter ${l} tied to one rank`)
    const dc = cnt(r => r.dci)
    if (Math.max(...Object.values(dc)) - Math.min(...Object.values(dc)) > 1 || Object.keys(dc).length !== DCIS[area].length) p.push(`${code}: DCI spread ${JSON.stringify(dc)}`)
    for (const r of rows) {
      if (RIT[r.g][r.tier] !== r.rit_band || DIFF[r.tier] !== r.difficulty) p.push(`${r.id}: tier fields`)
      if (!askList(r.kind, r.format).includes(r.ask)) p.push(`${r.id}: ask ${r.ask} not valid for ${r.kind}/${r.format}`)
      if (r.invent !== (r.kind !== 'model')) p.push(`${r.id}: invent flag`)
    }
    all.push(...rows)
  }
  const bl = {}, br = {}, cross = {}
  for (const r of all) { bl[r.key] = (bl[r.key] ?? 0) + 1; br[r.rank] = (br[r.rank] ?? 0) + 1; cross[r.key + r.rank] = (cross[r.key + r.rank] ?? 0) + 1 }
  if (all.length !== 36) p.push(`batch: ${all.length} slots`)
  if (LETTERS.some(l => bl[l] !== 9)) p.push(`batch letters ${JSON.stringify(bl)}`)
  if ([1, 2, 3, 4].some(r => br[r] !== 9)) p.push(`batch ranks ${JSON.stringify(br)}`)
  if (Object.values(cross).some(n => n > 3)) p.push(`batch letter x rank cell > 3: ${JSON.stringify(cross)}`)
  // load-bearing element varies: within each (kind, format) with >= 3 slots, no ask holds more than half
  const byKF = {}
  for (const r of all) (byKF[`${r.kind}/${r.format}`] ??= []).push(r.ask)
  for (const [k, asks] of Object.entries(byKF)) {
    const c = {}; for (const a of asks) c[a] = (c[a] ?? 0) + 1
    if (asks.length >= 3 && Math.max(...Object.values(c)) > Math.ceil(asks.length / 2)) p.push(`batch ${k}: ask not varied ${JSON.stringify(c)}`)
  }
  const dClaims = all.filter(r => r.kind !== 'model' && r.format === 'claim').length
  if (dClaims > Math.floor(all.filter(r => r.kind !== 'model').length / 10)) p.push(`batch: ${dClaims} data/investigation claim slots (cap 1 in 10)`)
  return p
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  let S = null, used = null
  for (let s = SEED; s < SEED + 100000 && !S; s++) { const t = build(s); if (t && !verifySlots(t).length) { S = t; used = s } }
  if (!S) { console.error('REFUSING: no seed in range satisfies the constraints'); process.exit(2) }
  const json = JSON.stringify({ _seed: used, _note: 'generated by make-slots.mjs; do not edit by hand', ...S }, null, 1) + '\n'
  if (process.argv.includes('--check')) {
    if (!existsSync(OUT) || readFileSync(OUT, 'utf8') !== json) { console.error('slots.json does not match make-slots.mjs output'); process.exit(1) }
    console.log(`slots.json reproduces (seed ${used})`); process.exit(0)
  }
  writeFileSync(OUT, json)
  const all = Object.values(S).flatMap(v => v.rows)
  const tally = f => { const c = {}; for (const r of all) c[f(r)] = (c[f(r)] ?? 0) + 1; return JSON.stringify(c) }
  console.log(`wrote ${OUT} (seed ${used}, ${all.length} slots)`)
  console.log(`  letters ${tally(r => r.key)}  ranks ${tally(r => r.rank)}  kinds ${tally(r => r.kind)}`)
  console.log(`  formats ${tally(r => r.format)}  stimuli ${tally(r => r.stimulus)}`)
  console.log(`  asks ${tally(r => `${r.format}:${r.ask}`)}`)
}
