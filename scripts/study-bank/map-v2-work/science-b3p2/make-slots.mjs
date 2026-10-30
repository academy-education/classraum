#!/usr/bin/env node
/**
 * make-slots.mjs (batch 3, PILOT 2): writes slots.json for the MAP Science batch-3 pilot 2 (MAP-SCIENCE-B3.prereg.md,
 * amendment P2). 24 slots, 8 per area, ids MSB3Q-<A><g>-NN.
 *
 * Pilot 1 failed with INVERSE tells: a rule that forbade a key property made that property mark a distractor. So pilot 2
 * RANDOMIZES the properties the graders named, at their base rate, in the slot table itself:
 *   read items      `pos` = where the asked bar/point sits: tallest / shortest / middle, 2 of each across the batch and
 *                   two different positions in each area. The key's value rank follows (tallest 4, shortest 1, middle 2
 *                   or 3), and the brief requires BOTH extremes to be offered as options in every read item, so the
 *                   top-tick value is the key in 2 of 6 items and a distractor in the other 4.
 *   trend items     one SIMPLE key (increase / decrease / no-change) and one COMPOUND key (increase-then-level /
 *                   decrease-then-level / decrease-then-increase) per area; every trend item carries 2 simple + 2
 *                   compound options, so compound options are the key 3 of 12 times and simple options 3 of 12.
 *                   Simple keys take length rank 1-2 and compound keys 3-4 (their natural lengths); in an item with two
 *                   options of each form that tells a reader nothing the form does not.
 *   ranks           within one area and one format no key rank repeats (values: 3 distinct value ranks per area; claims
 *                   distinct length ranks), and batch-wide per format no rank past RANKBAL's cap; per area 2 x ranks
 *                   1-4, batch 6 x 4.
 *   letters         per area 2 x A-D with no (letter, rank) pair repeated; within one area and one format no key letter
 *                   repeats (pilot 1 put both Life trend keys at C); batch 6 x 4.
 * Grades, tiers and DCIs come from SEED; letters and ranks are re-dealt from the first rank seed that meets every
 * constraint, including the batch-wide ones (`redeal`). `--check` verifies slots.json byte for byte.
 *
 *   node scripts/study-bank/map-v2-work/science-b3p2/make-slots.mjs [--check]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rng, shuffleWith } from '../../seeded-shuffle.mjs'
import { AREAS, DCIS, TIERS, DIFF, RIT, LETTERS } from '../science-pilot/sci-spec.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, 'slots.json')
const SEED = 20261231
const T = (kind, stimulus, format, ask, extra = {}) => ({ kind, stimulus, format, ask, ...extra })
const SIMPLE = ['increase', 'decrease', 'no-change'], COMPOUND = ['increase-then-level', 'decrease-then-level', 'decrease-then-increase']
export const TEMPLATES = {
  L: [T('data', 'bar', 'values', 'read', { pos: 'tallest' }), T('data', 'line', 'values', 'read', { pos: 'middle' }),
    T('data', 'line', 'trend', 'decrease'), T('data', 'scatter', 'trend', 'increase-then-level'),
    T('investigation', 'procedure+table', 'values', 'interpolate'), T('investigation', 'procedure', 'variable', 'controlled'),
    T('model', 'scenario', 'claim', 'predicts'), T('model', 'scenario', 'term', 'process')],
  P: [T('data', 'bar', 'values', 'read', { pos: 'shortest' }), T('data', 'line', 'values', 'read', { pos: 'tallest' }),
    T('data', 'scatter', 'trend', 'no-change'), T('data', 'line', 'trend', 'decrease-then-increase'),
    T('data', 'table', 'values', 'interpolate'), T('investigation', 'procedure', 'variable', 'dependent'),
    T('model', 'scenario', 'claim', 'explains'), T('model', 'scenario', 'claim', 'predicts')],
  E: [T('data', 'bar', 'values', 'read', { pos: 'middle' }), T('data', 'line', 'values', 'read', { pos: 'shortest' }),
    T('data', 'line', 'trend', 'increase'), T('data', 'scatter', 'trend', 'decrease-then-level'),
    T('investigation', 'procedure+table', 'values', 'interpolate'), T('model', 'scenario', 'claim', 'explains'),
    T('model', 'scenario', 'claim', 'predicts'), T('model', 'scenario', 'term', 'structure')],
}
const GRADES = [5, 6, 7, 8]
/** Allowed key ranks for a template row. */
function rankChoices(t) {
  if (t.format === 'values' && t.ask === 'read') return t.pos === 'tallest' ? [4] : t.pos === 'shortest' ? [1] : [2, 3]
  if (t.format === 'trend') return SIMPLE.includes(t.ask) ? [1, 2] : [3, 4]
  return [1, 2, 3, 4]
}
function distinctWithin(rows, f) {
  const by = {}; for (const r of rows) (by[r.format] ??= []).push(f(r))
  return Object.values(by).every(v => new Set(v).size === v.length)
}

function build(seed) {
  const rand = rng(seed), out = {}
  for (const [a, area] of Object.entries(AREAS)) {
    const tpl = TEMPLATES[a]
    const grades = shuffleWith(GRADES.flatMap(g => [g, g]), rand)
    const tiers = shuffleWith(['low', 'low', 'low', 'mid', 'mid', 'mid', 'high', 'high'], rand)
    const d = shuffleWith(DCIS[area].slice(), rand), dcis = shuffleWith(tpl.map((_, i) => d[i % d.length]), rand)
    let letters, ranks
    for (let tries = 0; ; tries++) {
      if (tries > 200000) throw new Error(`${a}: no slot assignment satisfies the constraints`)
      letters = shuffleWith(LETTERS.flatMap(l => [l, l]), rand); ranks = shuffleWith([1, 1, 2, 2, 3, 3, 4, 4], rand)
      const rows = tpl.map((t, i) => ({ ...t, key: letters[i], rank: ranks[i] }))
      if (rows.some(r => !rankChoices(r).includes(r.rank))) continue
      if (new Set(rows.map(r => r.key + r.rank)).size !== 8) continue
      if (!distinctWithin(rows, r => r.rank) || !distinctWithin(rows, r => r.key)) continue
      break
    }
    const rows = tpl.map((t, i) => ({ g: grades[i], tier: tiers[i], difficulty: DIFF[tiers[i]], rit_band: RIT[grades[i]][tiers[i]], dci: dcis[i], ...t, key: letters[i], rank: ranks[i], invent: t.kind !== 'model' }))
    for (const g of GRADES) {
      const cell = rows.filter(r => r.g === g).sort((x, y) => TIERS.indexOf(x.tier) - TIERS.indexOf(y.tier))
      cell.forEach((r, i) => { r.id = `MSB3Q-${a}${g}-${String(i + 1).padStart(2, '0')}` })
      out[`${a}${g}`] = { area, grade: g, rows: cell.map(({ id, ...rest }) => ({ id, ...rest })) }
    }
  }
  return out
}

export function verifySlots(S) {
  const p = [], all = []
  const codes = Object.keys(S).filter(k => !k.startsWith('_'))
  if (codes.length !== 12) p.push(`${codes.length} cells, want 12`)
  for (const a of Object.keys(AREAS)) {
    const rows = codes.filter(c => c[0] === a).flatMap(c => S[c].rows)
    const cnt = f => { const c = {}; for (const r of rows) c[f(r)] = (c[f(r)] ?? 0) + 1; return c }
    if (rows.length !== 8) p.push(`${a}: ${rows.length} rows`)
    if (LETTERS.some(l => cnt(r => r.key)[l] !== 2)) p.push(`${a}: letters`)
    if ([1, 2, 3, 4].some(r => cnt(x => x.rank)[r] !== 2)) p.push(`${a}: ranks`)
    if (new Set(rows.map(r => r.key + r.rank)).size !== 8) p.push(`${a}: letter x rank repeated`)
    if (!distinctWithin(rows, r => r.rank)) p.push(`${a}: a key rank repeats within one format`)
    if (!distinctWithin(rows, r => r.key)) p.push(`${a}: a key letter repeats within one format`)
    if (rows.some(r => !rankChoices(r).includes(r.rank))) p.push(`${a}: a read/trend rank disagrees with its position/form`)
    const reads = rows.filter(r => r.ask === 'read'); if (new Set(reads.map(r => r.pos)).size !== reads.length) p.push(`${a}: read positions repeat`)
    const tr = rows.filter(r => r.format === 'trend'); if (tr.filter(r => SIMPLE.includes(r.ask)).length !== 1 || tr.filter(r => COMPOUND.includes(r.ask)).length !== 1) p.push(`${a}: trend forms`)
    if (GRADES.some(g => cnt(r => r.g)[g] !== 2)) p.push(`${a}: grades`)
    const tc = cnt(r => r.tier); if (tc.low !== 3 || tc.mid !== 3 || tc.high !== 2) p.push(`${a}: tiers`)
    const dc = Object.values(cnt(r => r.dci)); if (dc.length !== DCIS[AREAS[a]].length || Math.max(...dc) - Math.min(...dc) > 1) p.push(`${a}: DCI spread`)
    const want = TEMPLATES[a].map(t => `${t.kind}/${t.stimulus}/${t.format}/${t.ask}/${t.pos ?? ''}`).sort(), got = rows.map(r => `${r.kind}/${r.stimulus}/${r.format}/${r.ask}/${r.pos ?? ''}`).sort()
    if (JSON.stringify(want) !== JSON.stringify(got)) p.push(`${a}: template`)
    for (const r of rows) if (RIT[r.g][r.tier] !== r.rit_band || r.invent !== (r.kind !== 'model')) p.push(`${r.id}: fields`)
    all.push(...rows)
  }
  const bl = {}, br = {}, bp = {}; for (const r of all) { bl[r.key] = (bl[r.key] ?? 0) + 1; br[r.rank] = (br[r.rank] ?? 0) + 1; if (r.pos) bp[r.pos] = (bp[r.pos] ?? 0) + 1 }
  if (LETTERS.some(l => bl[l] !== 6) || [1, 2, 3, 4].some(r => br[r] !== 6)) p.push('batch letters/ranks not flat')
  if (['tallest', 'shortest', 'middle'].some(k => bp[k] !== 2)) p.push('batch read positions not 2/2/2')
  // RANKBAL batch-wide: within one format no key rank holds more than ceil(n/4) (+1 once n >= 8) keys
  for (const f of [...new Set(all.map(r => r.format))]) {
    const F = all.filter(r => r.format === f), c = {}; for (const r of F) c[r.rank] = (c[r.rank] ?? 0) + 1
    if (F.length >= 2 && Math.max(...Object.values(c)) > Math.ceil(F.length / 4) + (F.length >= 8 ? 1 : 0)) p.push(`batch ${f}: a key rank repeats past RANKBAL's cap`)
  }
  const trl = {}; for (const r of all.filter(x => x.format === 'trend')) trl[r.key] = (trl[r.key] ?? 0) + 1
  if (Math.max(...Object.values(trl)) > 2) p.push('batch trend key letters: one letter keys 3+ trend items')
  return p
}

/** Second stage: re-deal key letters and ranks with their own seeded stream (grades, tiers and DCIs from build() are
 *  kept), so a batch-wide constraint can be met by searching rank seeds without moving any item's grade or DCI. */
function redeal(S, seed2) {
  const rand = rng(seed2), out = structuredClone(S)
  for (const a of Object.keys(AREAS)) {
    const rows = Object.keys(out).filter(c => c[0] === a).flatMap(c => out[c].rows)
    for (let tries = 0; ; tries++) {
      if (tries > 200000) return null
      const letters = shuffleWith(LETTERS.flatMap(l => [l, l]), rand), ranks = shuffleWith([1, 1, 2, 2, 3, 3, 4, 4], rand)
      const cand = rows.map((r, i) => ({ ...r, key: letters[i], rank: ranks[i] }))
      if (cand.some(r => !rankChoices(r).includes(r.rank))) continue
      if (new Set(cand.map(r => r.key + r.rank)).size !== 8) continue
      if (!distinctWithin(cand, r => r.rank) || !distinctWithin(cand, r => r.key)) continue
      rows.forEach((r, i) => { r.key = letters[i]; r.rank = ranks[i] })
      break
    }
  }
  return out
}
export const RANK_SEED0 = 1

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const S0 = build(SEED)
  let S, seed2 = RANK_SEED0, bad
  for (;; seed2++) { S = redeal(S0, seed2); bad = S ? verifySlots(S) : ['no deal']; if (!bad.length) break; if (seed2 > RANK_SEED0 + 5000) { console.error(`REFUSING: ${bad.join('; ')}`); process.exit(2) } }
  const json = JSON.stringify({ _seed: SEED, _rank_seed: seed2, _note: 'generated by science-b3p2/make-slots.mjs (pilot 2); do not edit by hand', ...S }, null, 1) + '\n'
  if (process.argv.includes('--check')) {
    if (!existsSync(OUT) || readFileSync(OUT, 'utf8') !== json) { console.error('slots.json does not match make-slots.mjs output'); process.exit(1) }
    console.log(`slots.json reproduces (seed ${SEED}, rank seed ${seed2})`); process.exit(0)
  }
  writeFileSync(OUT, json)
  console.log(`wrote ${OUT} (seed ${SEED}, rank seed ${seed2}, 24 pilot-2 slots, 12 cells)`)
}
