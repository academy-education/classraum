#!/usr/bin/env node
/**
 * make-slots.mjs (batch 3, PILOT): writes slots.json for the MAP Science batch-3 pilot (MAP-SCIENCE-B3.prereg.md).
 * 24 slots, 8 per area. The pilot exists to ask the graders' cross_item_pattern question on a small cell before the
 * full batch, so every area carries every format batch 2's rule-10 patterns came from, and each area carries MORE of
 * the format its own graders named:
 *   Life      2 trend (line + scatter), 2 term (structure, example: the definition-in-stem asks), 1 interpolation,
 *             1 variable, 1 bar read, 1 claim
 *   Physical  2 bar read, 2 claim, 1 interpolation, 1 trend, 1 variable, 1 term
 *   Earth     3 claim, 1 interpolation, 1 bar read, 1 trend, 1 variable, 1 term
 * Asks are fixed in the template (so the pilot covers each trend direction, each variable role, each term ask).
 * Seeded and deterministic (`--check` verifies slots.json byte for byte): per area 2 items per grade, tiers 3/3/2,
 * key letters 2 x A-D and key ranks 2 x 1-4 with no (letter, rank) pair repeated, DCIs round-robin (+-1).
 * Batch: letters 6 x 4, ranks 6 x 4.
 *
 *   node scripts/study-bank/map-v2-work/science-b3/make-slots.mjs [--check]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rng, shuffleWith } from '../../seeded-shuffle.mjs'
import { AREAS, DCIS, TIERS, DIFF, RIT, LETTERS } from '../science-pilot/sci-spec.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, 'slots.json')
const SEED = 20261201
const T = (kind, stimulus, format, ask) => ({ kind, stimulus, format, ask })
export const TEMPLATES = {
  L: [T('investigation', 'procedure+table', 'values', 'interpolate'), T('data', 'bar', 'values', 'read'), T('data', 'line', 'trend', 'decrease'),
    T('data', 'scatter', 'trend', 'increase-then-level'), T('investigation', 'procedure', 'variable', 'dependent'), T('model', 'scenario', 'term', 'structure'),
    T('model', 'scenario', 'term', 'example'), T('model', 'scenario', 'claim', 'explains')],
  P: [T('data', 'table', 'values', 'interpolate'), T('data', 'bar', 'values', 'read'), T('data', 'bar', 'values', 'read'), T('data', 'scatter', 'trend', 'no-change'),
    T('investigation', 'procedure', 'variable', 'controlled'), T('model', 'scenario', 'term', 'quantity'), T('model', 'scenario', 'claim', 'explains'),
    T('model', 'scenario', 'claim', 'predicts')],
  E: [T('investigation', 'procedure+table', 'values', 'interpolate'), T('data', 'bar', 'values', 'read'), T('data', 'line', 'trend', 'increase'),
    T('investigation', 'procedure', 'variable', 'independent'), T('model', 'scenario', 'term', 'process'), T('model', 'scenario', 'claim', 'predicts'),
    T('model', 'scenario', 'claim', 'predicts'), T('model', 'scenario', 'claim', 'explains')],
}
const GRADES = [5, 6, 7, 8]

function build(seed) {
  const rand = rng(seed), out = {}
  for (const [a, area] of Object.entries(AREAS)) {
    const tpl = TEMPLATES[a]
    const grades = shuffleWith(GRADES.flatMap(g => [g, g]), rand)
    const tiers = shuffleWith(['low', 'low', 'low', 'mid', 'mid', 'mid', 'high', 'high'], rand)
    const d = shuffleWith(DCIS[area].slice(), rand), dcis = shuffleWith(tpl.map((_, i) => d[i % d.length]), rand)
    let letters, ranks
    for (;;) {
      letters = shuffleWith(LETTERS.flatMap(l => [l, l]), rand); ranks = shuffleWith([1, 1, 2, 2, 3, 3, 4, 4], rand)
      if (new Set(letters.map((l, i) => l + ranks[i])).size === 8) break
    }
    const rows = tpl.map((t, i) => ({ g: grades[i], tier: tiers[i], difficulty: DIFF[tiers[i]], rit_band: RIT[grades[i]][tiers[i]], dci: dcis[i], ...t, key: letters[i], rank: ranks[i], invent: t.kind !== 'model' }))
    for (const g of GRADES) {
      const cell = rows.filter(r => r.g === g).sort((x, y) => TIERS.indexOf(x.tier) - TIERS.indexOf(y.tier))
      cell.forEach((r, i) => { r.id = `MSB3P-${a}${g}-${String(i + 1).padStart(2, '0')}` })
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
    if (GRADES.some(g => cnt(r => r.g)[g] !== 2)) p.push(`${a}: grades`)
    const tc = cnt(r => r.tier); if (tc.low !== 3 || tc.mid !== 3 || tc.high !== 2) p.push(`${a}: tiers`)
    const dc = Object.values(cnt(r => r.dci)); if (dc.length !== DCIS[AREAS[a]].length || Math.max(...dc) - Math.min(...dc) > 1) p.push(`${a}: DCI spread`)
    const want = TEMPLATES[a].map(t => `${t.kind}/${t.stimulus}/${t.format}/${t.ask}`).sort(), got = rows.map(r => `${r.kind}/${r.stimulus}/${r.format}/${r.ask}`).sort()
    if (JSON.stringify(want) !== JSON.stringify(got)) p.push(`${a}: template`)
    for (const r of rows) if (RIT[r.g][r.tier] !== r.rit_band || r.invent !== (r.kind !== 'model')) p.push(`${r.id}: fields`)
    all.push(...rows)
  }
  const bl = {}, br = {}; for (const r of all) { bl[r.key] = (bl[r.key] ?? 0) + 1; br[r.rank] = (br[r.rank] ?? 0) + 1 }
  if (LETTERS.some(l => bl[l] !== 6) || [1, 2, 3, 4].some(r => br[r] !== 6)) p.push('batch letters/ranks not flat')
  return p
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const S = build(SEED), bad = verifySlots(S)
  if (bad.length) { console.error(`REFUSING: ${bad.join('; ')}`); process.exit(2) }
  const json = JSON.stringify({ _seed: SEED, _note: 'generated by science-b3/make-slots.mjs (pilot); do not edit by hand', ...S }, null, 1) + '\n'
  if (process.argv.includes('--check')) {
    if (!existsSync(OUT) || readFileSync(OUT, 'utf8') !== json) { console.error('slots.json does not match make-slots.mjs output'); process.exit(1) }
    console.log(`slots.json reproduces (seed ${SEED})`); process.exit(0)
  }
  writeFileSync(OUT, json)
  console.log(`wrote ${OUT} (seed ${SEED}, 24 pilot slots, 12 cells)`)
}
