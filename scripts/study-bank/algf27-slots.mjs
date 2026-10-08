#!/usr/bin/env node
/**
 * algf27-slots.mjs [batch.json] — the pre-registered slot table and frozen order for
 * sat-math-v27-algfull (PREREG-ALGF27-2026-10-08.md), DERIVED from seed 20261029 so the
 * table printed in the prereg can be regenerated and cannot be re-chosen after review.
 *
 *   per author (A, B, C, D; 13 slots each, ids SM27F-<author><01..13>):
 *     difficulty multiset   0E / 11M / 2H        (total 0 / 44 / 8)
 *     key-rank multiset     S4 / I5 / L4         (total S16 / I20 / L16, extreme 32/52 = 61.5%)
 *   each multiset is Fisher-Yates shuffled with rng(SEED) in the order
 *   A-diff, A-key, B-diff, B-key, C-diff, C-key, D-diff, D-key and dealt to slots 01..13.
 *   frozen order: the 52 ids shuffled with a fresh rng(SEED + 1).
 *
 * No argument: print the table and the order. With a batch file: check every item's
 * authored difficulty and key position by value against its slot (exit 1 on any
 * mismatch, 2 on unreadable input or an unknown id).
 */
import { readFileSync } from 'node:fs'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
import { scoreItem } from './key-extremity-breakdown.mjs'
export const SEED = 20261029
const SPEC = { A: ['0/11/2', '4/5/4'], B: ['0/11/2', '4/5/4'], C: ['0/11/2', '4/5/4'], D: ['0/11/2', '4/5/4'] }
const r = rng(SEED)
export const slot = {}
for (const [a, [d, k]] of Object.entries(SPEC)) {
  const [e, m, h] = d.split('/').map(Number), [s, i, l] = k.split('/').map(Number)
  const ds = shuffleWith([...Array(e).fill('E'), ...Array(m).fill('M'), ...Array(h).fill('H')], r)
  const ks = shuffleWith([...Array(s).fill('S'), ...Array(i).fill('I'), ...Array(l).fill('L')], r)
  if (ds.length !== 13 || ks.length !== 13) throw new Error('spec is not 13 per author')
  for (let j = 0; j < 13; j++) slot[`SM27F-${a}${String(j + 1).padStart(2, '0')}`] = { d: ds[j], k: ks[j] }
}
export const ORDER = shuffleWith(Object.keys(slot), rng(SEED + 1))
const isMain = import.meta.url === `file://${process.argv[1]}`
const path = process.argv[2]
if (isMain && !path) {
  for (const a of 'ABCD') console.log(`    ${a}: ` + Object.entries(slot).filter(([id]) => id[6] === a).map(([id, s]) => `${id.slice(6)} ${s.d}/${s.k}`).join('  '))
  const t = { E: 0, M: 0, H: 0, S: 0, I: 0, L: 0 }; for (const s of Object.values(slot)) { t[s.d]++; t[s.k]++ }
  console.log(`    totals ${JSON.stringify(t)}`)
  console.log(`    frozen order (seed ${SEED + 1}): ${ORDER.map(x => x.slice(6)).join(' ')}`)
  process.exit(0)
}
if (isMain) {
  let items; try { items = JSON.parse(readFileSync(path, 'utf8')) } catch { console.error('REFUSING: unreadable'); process.exit(2) }
  if (!Array.isArray(items) || !items.length) { console.error('REFUSING: no items'); process.exit(2) }
  const D = { easy: 'E', medium: 'M', hard: 'H' }
  let bad = 0
  for (const it of items) {
    const s = slot[it.id]; if (!s) { console.error(`REFUSING: unknown id ${it.id}`); process.exit(2) }
    const sc = scoreItem(it.choices.map(String), String(it.correct_answer))
    const k = sc.skip ? 'non-numeric' : sc.keyMin ? 'S' : sc.keyMax ? 'L' : 'I'
    if (k !== s.k || D[it.difficulty] !== s.d) { bad++; console.log(`SLOT MISMATCH ${it.id}: assigned ${s.d}/${s.k}, got ${D[it.difficulty] ?? it.difficulty}/${k}`) }
  }
  console.log(`slots: ${items.length - bad} of ${items.length} match the pre-registered table`)
  process.exit(bad ? 1 : 0)
}
