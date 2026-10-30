#!/usr/bin/env node
/**
 * make-slots.mjs (batch 4): slots.json for MAP Science batch 4 (MAP-SCIENCE-B4.prereg.md). 240 slots, ids
 * MSB4-<A><g>-NN. Physical 24/24/24/23 (95), Life 19/19/19/18 (75), Earth 18/18/17/17 (70).
 * Copied from science-b3full/make-slots.mjs. Changes (prereg "Sizing"): a 24-row cell adds four rows to batch 1's
 * 20-row template, chosen from the formats that survived batch 3 best (investigation conditions, investigation values,
 * data bar conditions, investigation claim); a 23-row cell drops the fourth of those; a 17-row cell (Earth) drops the
 * variable slot as well as the 18-row drops (batch 3: variable 0 of 12 survived). The read deal (6 per area), the
 * trend deal (8 per area) and every flatness rule are unchanged, because no added or dropped row is a bar/line values
 * or trend row.
 *
 * Dealt like batch 2 (science-b2/make-slots.mjs): batch 1's 20-row template per cell; a 19-row cell drops the second
 * table/conditions slot; an 18-row cell also drops the fourth model claim. Tiers 6/8/6 (20), 6/7/6 (19), 5/8/5 (18), every
 * tier >= 2 model and >= 1 investigation slot; DCIs round-robin within a cell.
 * Pilot 2's randomizations, now dealt PER AREA (pilot 2's Physical read keys were both extremes; the lesson is that the
 * base rate must hold inside each area, not only across the batch):
 *   read items     per area 6 drawn-axis reads (3 bar, 3 line), `pos` tallest / shortest / middle 2 / 2 / 2; the key's
 *                  value rank follows (tallest 4, shortest 1, middle 2 or 3, one each)
 *   trend items    per area 8: 4 simple keys (increase, decrease, no-change, + one rotated by area) and 4 compound keys
 *                  (increase-then-level, decrease-then-level, decrease-then-increase, increase-then-decrease); simple keys
 *                  length rank 1-2, compound 3-4, two of each
 *   ranks          per area per format as flat as the format's size allows (counts differ by at most 1)
 *   letters        per area per format as flat as possible; per cell each letter >= 3
 * Asks rotate per area inside each (kind, stimulus, format) group. Seeded; `--check` verifies slots.json byte for byte.
 *
 *   node scripts/study-bank/map-v2-work/science-b3full/make-slots.mjs [--check]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rng, shuffleWith } from '../../seeded-shuffle.mjs'
import { AREAS, DCIS, TIERS, DIFF, RIT, LETTERS } from '../science-pilot/sci-spec.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, 'slots.json')
const SEED = 20261401
const GRADES = [5, 6, 7, 8]
const SIZES = { L: [19, 19, 19, 18], P: [24, 24, 24, 23], E: [18, 18, 17, 17] }
const TIER_COUNTS = { 24: { low: 7, mid: 10, high: 7 }, 23: { low: 7, mid: 9, high: 7 }, 17: { low: 5, mid: 7, high: 5 }, 20: { low: 6, mid: 8, high: 6 }, 19: { low: 6, mid: 7, high: 6 }, 18: { low: 5, mid: 8, high: 5 } }
const TEMPLATE = [
  ['data', 'table', 'values'], ['data', 'table', 'values'], ['data', 'table', 'conditions'], ['data', 'table', 'conditions'],
  ['data', 'bar', 'conditions'], ['data', 'bar', 'values'], ['data', 'line', 'values'], ['data', 'line', 'trend'],
  ['data', 'scatter', 'trend'],
  ['investigation', 'procedure', 'variable'], ['investigation', 'procedure+table', 'conditions'],
  ['investigation', 'procedure+table', 'values'], ['investigation', 'procedure', 'claim'],
  ['model', 'scenario', 'term'], ['model', 'scenario', 'term'], ['model', 'scenario', 'term'],
  ['model', 'scenario', 'claim'], ['model', 'scenario', 'claim'], ['model', 'scenario', 'claim'], ['model', 'scenario', 'claim'],
]
const EXTRA = [['investigation', 'procedure+table', 'conditions'], ['investigation', 'procedure+table', 'values'], ['data', 'bar', 'conditions'], ['investigation', 'procedure', 'claim']]
const templateFor = n => n >= 21 ? [...TEMPLATE, ...EXTRA.slice(0, n - 20)] : TEMPLATE.filter((_, i) => !(n <= 19 && i === 3) && !(n <= 18 && i === 19) && !(n <= 17 && i === 9))
export const SIMPLE = ['increase', 'decrease', 'no-change'], COMPOUND = ['increase-then-level', 'decrease-then-level', 'decrease-then-increase', 'increase-then-decrease']
const EXTRA_SIMPLE = { L: 'increase', P: 'decrease', E: 'no-change' }
const VARIABLE_4TH = { L: 'dependent', P: 'controlled', E: 'independent' }
/** Ask cycles per (kind, stimulus, format) group, per area. Bar and line values are handled by the read deal. */
function askCycle(a, kind, stimulus, format) {
  if (format === 'trend') return null
  if (format === 'values' && (stimulus === 'bar' || stimulus === 'line')) return null
  if (format === 'values' && stimulus === 'table') return ['difference', 'ratio', 'interpolate', 'read']
  if (format === 'values') return ['interpolate', 'difference', 'ratio', 'read']
  if (format === 'conditions' && stimulus === 'bar') return ['greatest', 'least', 'meets-criterion']
  if (format === 'conditions') return ['greatest', 'least', 'meets-criterion', 'controlled-pair']
  if (format === 'variable') return ['independent', 'dependent', 'controlled', VARIABLE_4TH[a]]
  if (format === 'claim') return kind === 'model' ? ['explains', 'predicts'] : ['supported', 'not-supported']
  if (format === 'term') return ['process', 'structure', 'quantity', 'example']
  throw new Error(`no ask cycle for ${kind}/${stimulus}/${format}`)
}
/** n counts as flat as possible over vals, shuffled. */
const flat = (vals, n, rand) => shuffleWith(Array.from({ length: n }, (_, i) => vals[i % vals.length]), rand)
const groupKey = r => `${r.kind}/${r.stimulus}/${r.format}`

function build(seed) {
  const rand = rng(seed), out = {}
  for (const [a, area] of Object.entries(AREAS)) {
    const rows = []
    GRADES.forEach((g, gi) => {
      const n = SIZES[a][gi], T = templateFor(n), TC = TIER_COUNTS[n]
      let tiers
      for (let t = 0; ; t++) {
        if (t > 5000) return null
        tiers = shuffleWith(TIERS.flatMap(x => Array(TC[x]).fill(x)), rand)
        if (TIERS.every(x => T.filter((_, i) => tiers[i] === x && T[i][0] === 'model').length >= 2 && T.filter((_, i) => tiers[i] === x && T[i][0] === 'investigation').length >= 1)) break
      }
      const d = shuffleWith(DCIS[area].slice(), rand), dcis = shuffleWith(T.map((_, i) => d[i % d.length]), rand)
      T.forEach(([kind, stimulus, format], i) => rows.push({ cell: `${a}${g}`, g, tier: tiers[i], dci: dcis[i], kind, stimulus, format }))
    })
    // asks: rotate inside each group in a shuffled order of its rows
    const groups = {}
    for (const r of rows) (groups[groupKey(r)] ??= []).push(r)
    for (const [k, G] of Object.entries(groups)) {
      const [kind, stimulus, format] = k.split('/'), cyc = askCycle(a, kind, stimulus, format)
      if (!cyc) continue
      const asks = flat(cyc, G.length, rand); G.forEach((r, i) => { r.ask = asks[i] })
    }
    // drawn-axis values: 3 bar + 3 line reads with pos 2/2/2; the 4th bar is `difference`, the 4th line `interpolate`
    const bars = shuffleWith(groups['data/bar/values'].slice(), rand), lines = shuffleWith(groups['data/line/values'].slice(), rand)
    const pos = shuffleWith(['tallest', 'tallest', 'shortest', 'shortest', 'middle', 'middle'], rand), mid = shuffleWith([2, 3], rand)
    const reads = [...bars.slice(0, 3), ...lines.slice(0, 3)]
    reads.forEach((r, i) => { r.ask = 'read'; r.pos = pos[i] })
    bars[3].ask = 'difference'; lines[3].ask = 'interpolate'
    // trends: 4 simple + 4 compound over the 8 line/scatter trend rows
    const tr = shuffleWith([...groups['data/line/trend'], ...groups['data/scatter/trend']], rand)
    const tasks = shuffleWith([...SIMPLE, EXTRA_SIMPLE[a], ...COMPOUND], rand)
    tr.forEach((r, i) => { r.ask = tasks[i] })
    // ranks per format (flat), with read and trend constraints
    const byF = {}
    for (const r of rows) (byF[r.format] ??= []).push(r)
    for (const [f, F] of Object.entries(byF)) {
      if (f === 'values') {
        const rd = F.filter(r => r.ask === 'read' && r.pos)
        let mi = 0
        for (const r of rd) r.rank = r.pos === 'tallest' ? 4 : r.pos === 'shortest' ? 1 : mid[mi++]
        const have = { 1: 0, 2: 0, 3: 0, 4: 0 }; for (const r of rd) have[r.rank]++
        const rest = F.filter(r => !r.rank), want = Math.ceil(F.length / 4), pool = []
        for (const k of [1, 2, 3, 4]) for (let j = have[k]; j < want; j++) pool.push(k)
        const deal = shuffleWith(pool, rand).slice(0, rest.length)
        if (deal.length < rest.length) return null
        rest.forEach((r, i) => { r.rank = deal[i] })
      } else if (f === 'trend') {
        const simple = shuffleWith([1, 1, 2, 2], rand), comp = shuffleWith([3, 3, 4, 4], rand)
        let si = 0, ci = 0
        for (const r of F) r.rank = COMPOUND.includes(r.ask) ? comp[ci++] : simple[si++]
      } else { const rk = flat([1, 2, 3, 4], F.length, rand); F.forEach((r, i) => { r.rank = rk[i] }) }
      const lt = flat(LETTERS, F.length, rand); F.forEach((r, i) => { r.key = lt[i] })
    }
    for (const g of GRADES) {
      const cell = rows.filter(r => r.g === g).sort((x, y) => TIERS.indexOf(x.tier) - TIERS.indexOf(y.tier))
      out[`${a}${g}`] = {
        area, grade: g, rows: cell.map((r, i) => ({
          id: `MSB4-${a}${g}-${String(i + 1).padStart(2, '0')}`, g, tier: r.tier, difficulty: DIFF[r.tier], rit_band: RIT[g][r.tier], dci: r.dci,
          kind: r.kind, stimulus: r.stimulus, format: r.format, ask: r.ask, ...(r.pos ? { pos: r.pos } : {}), key: r.key, rank: r.rank, invent: r.kind !== 'model',
        })),
      }
    }
  }
  return out
}

export function verifySlots(S) {
  const p = [], all = []
  const cnt = (rows, f) => { const c = {}; for (const r of rows) c[f(r)] = (c[f(r)] ?? 0) + 1; return c }
  const spread = c => Math.max(...Object.values(c)) - Math.min(...Object.values(c))
  const codes = Object.keys(S).filter(k => !k.startsWith('_'))
  if (codes.length !== 12) p.push(`${codes.length} cells`)
  for (const a of Object.keys(AREAS)) {
    const rows = codes.filter(c => c[0] === a).flatMap(c => S[c].rows)
    if (rows.length !== SIZES[a].reduce((x, y) => x + y)) p.push(`${a}: ${rows.length} rows`)
    GRADES.forEach((g, gi) => {
      const R = S[`${a}${g}`].rows, n = SIZES[a][gi]
      if (R.length !== n) p.push(`${a}${g}: ${R.length} rows`)
      const tc = cnt(R, r => r.tier); if (TIERS.some(t => tc[t] !== TIER_COUNTS[n][t])) p.push(`${a}${g}: tiers`)
      for (const t of TIERS) if (R.filter(r => r.tier === t && r.kind === 'model').length < 2 || R.filter(r => r.tier === t && r.kind === 'investigation').length < 1) p.push(`${a}${g}: tier ${t} kinds`)
      const lc = cnt(R, r => r.key); if (LETTERS.some(l => (lc[l] ?? 0) < 3)) p.push(`${a}${g}: a letter under 3 (${JSON.stringify(lc)})`)
      const dc = Object.values(cnt(R, r => r.dci)); if (dc.length !== DCIS[AREAS[a]].length || Math.max(...dc) - Math.min(...dc) > 1) p.push(`${a}${g}: DCI spread`)
    })
    for (const f of [...new Set(rows.map(r => r.format))]) {
      const F = rows.filter(r => r.format === f)
      const rc = cnt(F, r => r.rank), lc = cnt(F, r => r.key)
      if ([1, 2, 3, 4].some(k => !rc[k]) && F.length >= 4) p.push(`${a} ${f}: a rank missing`)
      if (spread({ 1: rc[1] ?? 0, 2: rc[2] ?? 0, 3: rc[3] ?? 0, 4: rc[4] ?? 0 }) > 1) p.push(`${a} ${f}: ranks not flat ${JSON.stringify(rc)}`)
      if (spread(Object.fromEntries(LETTERS.map(l => [l, lc[l] ?? 0]))) > 1) p.push(`${a} ${f}: letters not flat ${JSON.stringify(lc)}`)
    }
    const RD = rows.filter(r => r.ask === 'read' && r.pos), pc = cnt(RD, r => r.pos)
    if (RD.length !== 6 || pc.tallest !== 2 || pc.shortest !== 2 || pc.middle !== 2) p.push(`${a}: read positions ${JSON.stringify(pc)}`)
    for (const r of RD) if ((r.pos === 'tallest' && r.rank !== 4) || (r.pos === 'shortest' && r.rank !== 1) || (r.pos === 'middle' && ![2, 3].includes(r.rank))) p.push(`${r.id}: pos/rank`)
    const TR = rows.filter(r => r.format === 'trend')
    if (TR.filter(r => COMPOUND.includes(r.ask)).length !== 4 || TR.filter(r => SIMPLE.includes(r.ask)).length !== 4) p.push(`${a}: trend forms`)
    for (const r of TR) if (COMPOUND.includes(r.ask) ? r.rank < 3 : r.rank > 2) p.push(`${r.id}: trend rank vs form`)
    for (const r of rows) if (r.invent !== (r.kind !== 'model') || RIT[r.g][r.tier] !== r.rit_band) p.push(`${r.id}: fields`)
    all.push(...rows)
  }
  if (all.length !== 240) p.push(`batch ${all.length} slots`)
  const bl = cnt(all, r => r.key), br = cnt(all, r => r.rank), cross = cnt(all, r => r.key + r.rank)
  if (spread(bl) > 4 || spread(br) > 4) p.push(`batch letters ${JSON.stringify(bl)} ranks ${JSON.stringify(br)}`)
  if (Math.max(...Object.values(cross)) > 21) p.push(`batch letter x rank cell above 21 ${JSON.stringify(cross)}`)
  if (all.some(r => r.stimulus === 'bar' && r.ask === 'controlled-pair')) p.push('controlled pair on a bar chart')
  return p
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  let S = null, used = null
  for (let s = SEED; s < SEED + 20000 && !S; s++) { const t = build(s); if (t && !verifySlots(t).length) { S = t; used = s } }
  if (!S) { console.error('REFUSING: no seed in range satisfies the constraints'); process.exit(2) }
  const json = JSON.stringify({ _seed: used, _note: 'generated by science-b4/make-slots.mjs; do not edit by hand', ...S }, null, 1) + '\n'
  if (process.argv.includes('--check')) {
    if (!existsSync(OUT) || readFileSync(OUT, 'utf8') !== json) { console.error('slots.json does not match make-slots.mjs output'); process.exit(1) }
    console.log(`slots.json reproduces (seed ${used})`); process.exit(0)
  }
  writeFileSync(OUT, json)
  const all = Object.values(S).flatMap(v => v.rows)
  const t = f => { const c = {}; for (const r of all) c[f(r)] = (c[f(r)] ?? 0) + 1; return JSON.stringify(c) }
  console.log(`wrote ${OUT} (seed ${used}, ${all.length} slots, 12 cells)`)
  console.log(`  letters ${t(r => r.key)}  ranks ${t(r => r.rank)}  tiers ${t(r => r.tier)}  kinds ${t(r => r.kind)}`)
  console.log(`  formats ${t(r => r.format)}`)
  console.log(`  asks ${t(r => `${r.format}:${r.ask}`)}`)
  console.log(`  read pos ${t(r => `${r.cell ?? ''}${r.pos ? r.id.slice(5, 6) + ':' + r.pos : '-'}`)}`)
}
