#!/usr/bin/env node
/**
 * make-slots.mjs (batch 1): writes slots.json for MAP Science batch 1. That is 240 slots, 12 authors, one per
 * (area x grade) cell, 20 slots each (MAP-SCIENCE-PLAN.md §4.5). It is seeded and deterministic: `--check` verifies
 * slots.json reproduces byte for byte.
 *
 *   node scripts/study-bank/map-v2-work/science-b1/make-slots.mjs [--check]
 *
 * Per author (codes L5 L6 L7 L8 P5 .. E8): one grade; tiers 6 low / 8 mid / 6 high; kinds data 9 / investigation 4 /
 * model 7 (45/20/35, plan §2.3); key letters 5/5/5/5 and key ranks 5/5/5/5, with every letter carrying >= 3 distinct
 * ranks; DCIs round-robin (+-1); every tier holds >= 2 model items and >= 1 investigation item.
 * Batch: letters 60 x 4, ranks 60 x 4, no letter x rank cell above 20 (expected 15); asks rotate batch-wide inside each
 * (kind, format), so within a group no ask exceeds another by more than its cycle allows; data/investigation claim slots
 * <= 1 in 10.
 * Pilot lessons built into the template (MAP-SCIENCE-B1.prereg.md):
 *   - bar-chart `conditions` slots never take `controlled-pair`: a bar's only text is its label, so a controlled
 *     pair over bars forces labels that spell out the settings (MSP-L-03, MSP-E-04, both dropped). Controlled pairs
 *     go on tables and procedure+table, where the settings sit in columns.
 *   - one variable slot per author (the pilot lost 2 of 3, and the third had a free kill), now under the ROLE rule.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rng, shuffleWith } from '../../seeded-shuffle.mjs'
import { AREAS, DCIS, TIERS, DIFF, RIT, ASKS, LETTERS } from '../science-pilot/sci-spec.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, 'slots.json')
const SEED = 20261101
const GRADES = [5, 6, 7, 8]
const TIER_COUNTS = { low: 6, mid: 8, high: 6 }

const TEMPLATE = [
  ['data', 'table', 'values'], ['data', 'table', 'values'], ['data', 'table', 'conditions'], ['data', 'table', 'conditions'],
  ['data', 'bar', 'conditions'], ['data', 'bar', 'values'], ['data', 'line', 'values'], ['data', 'line', 'trend'],
  ['data', 'scatter', 'trend'],
  ['investigation', 'procedure', 'variable'], ['investigation', 'procedure+table', 'conditions'],
  ['investigation', 'procedure+table', 'values'], ['investigation', 'procedure', 'claim'],
  ['model', 'scenario', 'term'], ['model', 'scenario', 'term'], ['model', 'scenario', 'term'],
  ['model', 'scenario', 'claim'], ['model', 'scenario', 'claim'], ['model', 'scenario', 'claim'], ['model', 'scenario', 'claim'],
]
export const askList = (kind, format, stimulus) => {
  if (format === 'claim') return kind === 'model' ? ['explains', 'predicts'] : ['supported', 'not-supported']
  if (format === 'conditions' && stimulus === 'bar') return ['greatest', 'least', 'meets-criterion']
  return ASKS[format]
}
const askKey = r => `${r.kind}/${r.format}/${r.format === 'conditions' && r.stimulus === 'bar' ? 'bar' : 'other'}`

function build(seed) {
  const rand = rng(seed), out = {}, cursor = {}, cross = {}
  for (const [a, area] of Object.entries(AREAS)) for (const g of GRADES) {
    const code = `${a}${g}`
    // Redraw (from the same seeded stream, so still deterministic) until the per-author constraints hold.
    let tiers
    for (;;) {
      tiers = shuffleWith(TIERS.flatMap(t => Array(TIER_COUNTS[t]).fill(t)), rand)
      const ok = TIERS.every(t => { const rows = TEMPLATE.filter((_, i) => tiers[i] === t); return rows.filter(r => r[0] === 'model').length >= 2 && rows.filter(r => r[0] === 'investigation').length >= 1 })
      if (ok) break
    }
    const d = shuffleWith(DCIS[area].slice(), rand)
    const dcis = shuffleWith(Array.from({ length: 20 }, (_, i) => d[i % d.length]), rand)
    let letters, ranks
    for (;;) {
      letters = shuffleWith(LETTERS.flatMap(l => Array(5).fill(l)), rand)
      ranks = shuffleWith([1, 2, 3, 4].flatMap(r => Array(5).fill(r)), rand)
      if (LETTERS.every(l => new Set(letters.map((x, i) => (x === l ? ranks[i] : null)).filter(Boolean)).size >= 3)) break
    }
    const rows = TEMPLATE.map(([kind, stimulus, format], i) => {
      const k = askKey({ kind, format, stimulus }), list = askList(kind, format, stimulus)
      cursor[k] = cursor[k] ?? Math.floor(rand() * list.length)
      const ask = list[cursor[k]++ % list.length]
      cross[letters[i] + ranks[i]] = (cross[letters[i] + ranks[i]] ?? 0) + 1
      return { g, tier: tiers[i], difficulty: DIFF[tiers[i]], rit_band: RIT[g][tiers[i]], dci: dcis[i], kind, stimulus, format, ask, key: letters[i], rank: ranks[i], invent: kind !== 'model' }
    }).sort((x, y) => TIERS.indexOf(x.tier) - TIERS.indexOf(y.tier))
    rows.forEach((r, i) => { r.id = `MSB1-${code}-${String(i + 1).padStart(2, '0')}` })
    out[code] = { area, grade: g, rows: rows.map(({ id, ...rest }) => ({ id, ...rest })) }
  }
  if (Object.values(cross).some(n => n > 20)) return null
  return out
}

export function verifySlots(S) {
  const p = [], all = []
  const cnt = (rows, f) => { const c = {}; for (const r of rows) c[f(r)] = (c[f(r)] ?? 0) + 1; return c }
  const codes = Object.keys(S).filter(k => !k.startsWith('_'))
  if (codes.length !== 12) p.push(`${codes.length} authors, want 12`)
  for (const code of codes) {
    const { area, grade, rows } = S[code]
    if (AREAS[code[0]] !== area || Number(code.slice(1)) !== grade) p.push(`${code}: area/grade header`)
    if (rows.length !== 20) p.push(`${code}: ${rows.length} rows`)
    const lc = cnt(rows, r => r.key), rc = cnt(rows, r => r.rank), tc = cnt(rows, r => r.tier), kc = cnt(rows, r => r.kind)
    if (LETTERS.some(l => lc[l] !== 5)) p.push(`${code}: letters ${JSON.stringify(lc)}`)
    if ([1, 2, 3, 4].some(r => rc[r] !== 5)) p.push(`${code}: ranks ${JSON.stringify(rc)}`)
    if (TIERS.some(t => tc[t] !== TIER_COUNTS[t])) p.push(`${code}: tiers ${JSON.stringify(tc)}`)
    if (kc.data !== 9 || kc.investigation !== 4 || kc.model !== 7) p.push(`${code}: kinds ${JSON.stringify(kc)}`)
    for (const t of TIERS) {
      if (rows.filter(r => r.tier === t && r.kind === 'model').length < 2) p.push(`${code}: tier ${t} < 2 model`)
      if (rows.filter(r => r.tier === t && r.kind === 'investigation').length < 1) p.push(`${code}: tier ${t} no investigation`)
    }
    for (const l of LETTERS) if (new Set(rows.filter(r => r.key === l).map(r => r.rank)).size < 3) p.push(`${code}: letter ${l} on < 3 ranks`)
    const dc = Object.values(cnt(rows, r => r.dci))
    if (dc.length !== DCIS[area].length || Math.max(...dc) - Math.min(...dc) > 1) p.push(`${code}: DCI spread`)
    for (const r of rows) {
      if (r.g !== grade || RIT[r.g][r.tier] !== r.rit_band || DIFF[r.tier] !== r.difficulty) p.push(`${r.id}: grade/tier fields`)
      if (!askList(r.kind, r.format, r.stimulus).includes(r.ask)) p.push(`${r.id}: ask ${r.ask} invalid for ${askKey(r)}`)
      if (r.stimulus === 'bar' && r.ask === 'controlled-pair') p.push(`${r.id}: controlled-pair on a bar chart`)
      if (r.invent !== (r.kind !== 'model')) p.push(`${r.id}: invent flag`)
    }
    all.push(...rows)
  }
  const bl = cnt(all, r => r.key), br = cnt(all, r => r.rank), cross = cnt(all, r => r.key + r.rank)
  if (all.length !== 240) p.push(`batch ${all.length} slots`)
  if (LETTERS.some(l => bl[l] !== 60)) p.push(`batch letters ${JSON.stringify(bl)}`)
  if ([1, 2, 3, 4].some(r => br[r] !== 60)) p.push(`batch ranks ${JSON.stringify(br)}`)
  if (Object.values(cross).some(n => n > 20)) p.push(`batch letter x rank cell > 20 ${JSON.stringify(cross)}`)
  const groups = {}
  for (const r of all) (groups[askKey(r)] ??= []).push(r.ask)
  for (const [k, asks] of Object.entries(groups)) {
    const list = askList(...k.split('/').slice(0, 2), k.endsWith('/bar') ? 'bar' : 'table')
    const per = {}; for (const a of list) per[a] = (per[a] ?? 0) + 1             // multiplicity in the cycle
    const c = cnt(asks, a => a), share = Object.keys(per).map(a => (c[a] ?? 0) / per[a])
    if (Math.max(...share) - Math.min(...share) > 1) p.push(`batch ${k}: asks not rotated ${JSON.stringify(c)}`)
  }
  const D = all.filter(r => r.kind !== 'model')
  if (D.filter(r => r.format === 'claim').length > Math.floor(D.length / 10)) p.push('batch: data/investigation claims above 1 in 10')
  return p
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  let S = null, used = null
  for (let s = SEED; s < SEED + 200000 && !S; s++) { const t = build(s); if (t && !verifySlots(t).length) { S = t; used = s } }
  if (!S) { console.error('REFUSING: no seed in range satisfies the constraints'); process.exit(2) }
  const json = JSON.stringify({ _seed: used, _note: 'generated by science-b1/make-slots.mjs; do not edit by hand', ...S }, null, 1) + '\n'
  if (process.argv.includes('--check')) {
    if (!existsSync(OUT) || readFileSync(OUT, 'utf8') !== json) { console.error('slots.json does not match make-slots.mjs output'); process.exit(1) }
    console.log(`slots.json reproduces (seed ${used})`); process.exit(0)
  }
  writeFileSync(OUT, json)
  const all = Object.entries(S).flatMap(([, v]) => v.rows)
  const t = f => { const c = {}; for (const r of all) c[f(r)] = (c[f(r)] ?? 0) + 1; return JSON.stringify(c) }
  console.log(`wrote ${OUT} (seed ${used}, ${all.length} slots, 12 authors)`)
  console.log(`  letters ${t(r => r.key)}  ranks ${t(r => r.rank)}  tiers ${t(r => r.tier)}  kinds ${t(r => r.kind)}`)
  console.log(`  formats ${t(r => r.format)}  stimuli ${t(r => r.stimulus)}`)
  console.log(`  asks ${t(r => `${r.format}:${r.ask}`)}`)
}
