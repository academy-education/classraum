#!/usr/bin/env node
/**
 * mf30-slots.mjs [batch.json] — the pre-registered slot table and frozen order for
 * sat-math-v30-full (PREREG-MF30-2026-10-10.md), DERIVED from seed 20261060 so the
 * table printed in the prereg can be regenerated and cannot be re-chosen after review.
 *
 *   13 authors, 5 slots each (ids SM30F-<X><NN>), four domains:
 *     author  domain                               difficulty E/M/H   key S/I/L
 *     A B C D Algebra                              0/3/2 each         A 2/2/1  B 1/2/2  C 2/2/1  D 1/2/2
 *     P Q R   Advanced Math                        0/4/1 each         P 2/2/1  Q 1/2/2  R 2/2/1
 *     G H J   Geometry and Trigonometry            0/4/1 each         G 1/2/2  H 2/2/1  J 1/2/2
 *     T U V   Problem-Solving and Data Analysis    0/4/1 each         T 2/2/1  U 1/2/2  V 2/2/1
 *   Algebra 20 = 0/12/8, S6/I8/L6; Advanced Math 15 = 0/12/3, S5/I6/L4;
 *   Geometry 15 = 0/12/3, S4/I6/L5; PSDA 15 = 0/12/3, S5/I6/L4 (extreme 60.0% in every domain).
 *   Each multiset is Fisher-Yates shuffled with rng(SEED) in the order A-diff, A-key, B-diff,
 *   B-key, ... V-diff, V-key and dealt to slots 01..05. Frozen order: the 65 ids shuffled with a
 *   fresh rng(SEED + 1).
 *
 * No argument: print the table and the order. With a batch file: check every item's domain,
 * authored difficulty and key position by value against its slot (exit 1 on any mismatch,
 * 2 on unreadable input or an unknown id).
 */
import { readFileSync } from 'node:fs'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
import { scoreItem } from './key-extremity-breakdown.mjs'
export const SEED = 20261060
// Author parts, author scratch, the plug-back probe and the graders' private folders live OUTSIDE the repo
// (the user's rule; scratchpad/sat-math-v30-full-work). Session-specific.
export const WORK = '/private/tmp/claude-501/-Users-andylee-Downloads-saas-classraum/93d95221-6d94-4948-9914-9bd6bbc5b2a4/scratchpad/sat-math-v30-full-work'
export const ALG = 'Algebra', ADV = 'Advanced Math', GEO = 'Geometry and Trigonometry', PSDA = 'Problem-Solving and Data Analysis'
export const DOMAINS = [ALG, ADV, GEO, PSDA]
export const DTAG = { [ALG]: 'alg', [ADV]: 'adv', [GEO]: 'geo', [PSDA]: 'psda' }
export const SPEC = {
  A: [5, '0/3/2', '2/2/1', ALG], B: [5, '0/3/2', '1/2/2', ALG], C: [5, '0/3/2', '2/2/1', ALG], D: [5, '0/3/2', '1/2/2', ALG],
  P: [5, '0/4/1', '2/2/1', ADV], Q: [5, '0/4/1', '1/2/2', ADV], R: [5, '0/4/1', '2/2/1', ADV],
  G: [5, '0/4/1', '1/2/2', GEO], H: [5, '0/4/1', '2/2/1', GEO], J: [5, '0/4/1', '1/2/2', GEO],
  T: [5, '0/4/1', '2/2/1', PSDA], U: [5, '0/4/1', '1/2/2', PSDA], V: [5, '0/4/1', '2/2/1', PSDA],
}
export const LETTERS = Object.keys(SPEC).join('').toLowerCase()
const r = rng(SEED)
export const slot = {}
for (const [a, [n, d, k, dom]] of Object.entries(SPEC)) {
  const [e, m, h] = d.split('/').map(Number), [s, i, l] = k.split('/').map(Number)
  const ds = shuffleWith([...Array(e).fill('E'), ...Array(m).fill('M'), ...Array(h).fill('H')], r)
  const ks = shuffleWith([...Array(s).fill('S'), ...Array(i).fill('I'), ...Array(l).fill('L')], r)
  if (ds.length !== n || ks.length !== n) throw new Error(`spec for ${a} is not ${n}`)
  for (let j = 0; j < n; j++) slot[`SM30F-${a}${String(j + 1).padStart(2, '0')}`] = { d: ds[j], k: ks[j], domain: dom }
}
export const ORDER = shuffleWith(Object.keys(slot), rng(SEED + 1))
const isMain = import.meta.url === `file://${process.argv[1]}`
const path = process.argv[2]
if (isMain && !path) {
  for (const a of Object.keys(SPEC)) console.log(`    ${a}: ` + Object.entries(slot).filter(([id]) => id[6] === a).map(([id, s]) => `${id.slice(6)} ${s.d}/${s.k}`).join('  '))
  for (const dom of DOMAINS) {
    const t = { E: 0, M: 0, H: 0, S: 0, I: 0, L: 0 }; let n = 0
    for (const s of Object.values(slot)) if (s.domain === dom) { n++; t[s.d]++; t[s.k]++ }
    console.log(`    ${dom} ${n}: E${t.E}/M${t.M}/H${t.H}, S${t.S}/I${t.I}/L${t.L} (extreme ${t.S + t.L}/${n} = ${(100 * (t.S + t.L) / n).toFixed(1)}%)`)
  }
  console.log(`    frozen order (seed ${SEED + 1}):`)
  for (let i = 0; i < ORDER.length; i += 22) console.log('      ' + ORDER.slice(i, i + 22).map(x => x.slice(6)).join(' '))
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
    if (k !== s.k || D[it.difficulty] !== s.d || it.domain !== s.domain) { bad++; console.log(`SLOT MISMATCH ${it.id}: assigned ${s.domain} ${s.d}/${s.k}, got ${it.domain} ${D[it.difficulty] ?? it.difficulty}/${k}`) }
  }
  console.log(`slots: ${items.length - bad} of ${items.length} match the pre-registered table`)
  process.exit(bad ? 1 : 0)
}
