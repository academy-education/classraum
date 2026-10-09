#!/usr/bin/env node
/**
 * mf29-slots.mjs [batch.json] — the pre-registered slot table and frozen order for
 * sat-math-v29-full (PREREG-MF29-2026-10-10.md), DERIVED from seed 20261050 so the
 * table printed in the prereg can be regenerated and cannot be re-chosen after review.
 *
 *   Algebra authors A B C D (ids SM29F-<A..D><NN>), Advanced Math authors P Q R S (SM29F-<P..S><NN>):
 *     author  n   difficulty E/M/H   key S/I/L
 *     A      11   0/9/2              3/5/3
 *     B      11   0/9/2              4/4/3
 *     C      11   0/9/2              3/4/4
 *     D       7   0/6/1              2/3/2
 *     P      10   0/8/2              3/4/3
 *     Q       7   0/6/1              2/3/2
 *     R       6   0/5/1              2/2/2
 *     S      12   0/10/2             4/5/3
 *   Algebra 40 = 0/33/7, S12/I16/L12 (extreme 24/40 = 60.0%);
 *   Advanced Math 35 = 0/29/6, S11/I14/L10 (extreme 21/35 = 60.0%).
 *   Each multiset is Fisher-Yates shuffled with rng(SEED) in the order A-diff, A-key, B-diff,
 *   B-key, ... S-diff, S-key and dealt to slots 01..n. Frozen order: the 75 ids shuffled with a
 *   fresh rng(SEED + 1).
 *
 * No argument: print the table and the order. With a batch file: check every item's domain,
 * authored difficulty and key position by value against its slot (exit 1 on any mismatch,
 * 2 on unreadable input or an unknown id).
 */
import { readFileSync } from 'node:fs'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
import { scoreItem } from './key-extremity-breakdown.mjs'
export const SEED = 20261050
// Author parts, author scratch and the graders' private folders live OUTSIDE the repo (the user's rule for
// sat-math-v29-full; A91 process note 3: author scratch inside scripts/ broke repo-hygiene once). Session-specific.
export const WORK = '/private/tmp/claude-501/-Users-andylee-Downloads-saas-classraum/93d95221-6d94-4948-9914-9bd6bbc5b2a4/scratchpad/sat-math-v29-full-work'
export const SPEC = {
  A: [11, '0/9/2', '3/5/3', 'Algebra'], B: [11, '0/9/2', '4/4/3', 'Algebra'], C: [11, '0/9/2', '3/4/4', 'Algebra'], D: [7, '0/6/1', '2/3/2', 'Algebra'],
  P: [10, '0/8/2', '3/4/3', 'Advanced Math'], Q: [7, '0/6/1', '2/3/2', 'Advanced Math'], R: [6, '0/5/1', '2/2/2', 'Advanced Math'], S: [12, '0/10/2', '4/5/3', 'Advanced Math'],
}
const r = rng(SEED)
export const slot = {}
for (const [a, [n, d, k, dom]] of Object.entries(SPEC)) {
  const [e, m, h] = d.split('/').map(Number), [s, i, l] = k.split('/').map(Number)
  const ds = shuffleWith([...Array(e).fill('E'), ...Array(m).fill('M'), ...Array(h).fill('H')], r)
  const ks = shuffleWith([...Array(s).fill('S'), ...Array(i).fill('I'), ...Array(l).fill('L')], r)
  if (ds.length !== n || ks.length !== n) throw new Error(`spec for ${a} is not ${n}`)
  for (let j = 0; j < n; j++) slot[`SM29F-${a}${String(j + 1).padStart(2, '0')}`] = { d: ds[j], k: ks[j], domain: dom }
}
export const ORDER = shuffleWith(Object.keys(slot), rng(SEED + 1))
const isMain = import.meta.url === `file://${process.argv[1]}`
const path = process.argv[2]
if (isMain && !path) {
  for (const a of Object.keys(SPEC)) console.log(`    ${a}: ` + Object.entries(slot).filter(([id]) => id[6] === a).map(([id, s]) => `${id.slice(6)} ${s.d}/${s.k}`).join('  '))
  for (const dom of ['Algebra', 'Advanced Math']) {
    const t = { E: 0, M: 0, H: 0, S: 0, I: 0, L: 0 }; let n = 0
    for (const s of Object.values(slot)) if (s.domain === dom) { n++; t[s.d]++; t[s.k]++ }
    console.log(`    ${dom} ${n}: E${t.E}/M${t.M}/H${t.H}, S${t.S}/I${t.I}/L${t.L} (extreme ${t.S + t.L}/${n} = ${(100 * (t.S + t.L) / n).toFixed(1)}%)`)
  }
  console.log(`    frozen order (seed ${SEED + 1}):`)
  for (let i = 0; i < ORDER.length; i += 20) console.log('      ' + ORDER.slice(i, i + 20).map(x => x.slice(6)).join(' '))
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
