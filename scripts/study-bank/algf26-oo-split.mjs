#!/usr/bin/env node
/** algf26-oo-split.mjs — options-only hit rate split by key position (extreme / interior) per arm,
 *  for sat-math-v26-algfull (PREREG-ALGF26: reported, not gated). Refuses on missing input. */
import { readFileSync } from 'node:fs'
import { scoreItem } from './key-extremity-breakdown.mjs'
const S = 'scripts/study-bank/'
const key = JSON.parse(readFileSync(S + 'algf26-oo.key.json')); const blind = JSON.parse(readFileSync(S + 'algf26-oo.blind.json'))
const sol = ['a', 'b', 'c'].map(x => JSON.parse(readFileSync(S + 'algf26-oo.solver-' + x + '.json')))
const t = {}
for (const [id, k] of Object.entries(key)) {
  const ch = Object.values(blind[id].options); const s = scoreItem(ch, blind[id].options[k.letter])
  const pos = s.skip ? 'skip' : (s.keyMin || s.keyMax) ? 'extreme' : 'interior'
  const g = (t[k.kind + ' ' + pos] ??= { items: 0, n: 0, hit: 0 }); g.items++
  for (const so of sol) { if (!so[id]) { console.error('REFUSING: solver missing ' + id); process.exit(2) } g.n++; if (so[id].pick === k.letter) g.hit++ }
}
for (const [k, v] of Object.entries(t).sort()) console.log(k.padEnd(24), `items ${v.items}`, `${v.hit}/${v.n}`, (100 * v.hit / v.n).toFixed(1) + '%')
