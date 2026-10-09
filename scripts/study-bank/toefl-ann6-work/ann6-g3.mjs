// announcement-v6 G3 tally (PREREG-ANNOUNCEMENT-V6-2026-10-09.md).
//   node ann6-g3.mjs   (reads grade/ann6-ws.key.json, grade/ann6-ws.grader-{a,b,c}.json, attack/*)
// Prints per-set: off-key picks, second-defensible claims (for manual refutation),
// blind 3/3 AND passage_needed=false, grader-median difficulty; cross_item claims.
// Exits 2 on any unreadable input or a grader missing an item.
import { readFileSync } from 'node:fs'
import { score } from './ann6-score.mjs'
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const read = p => { try { return JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8')) } catch (e) { die(`${p}: ${e.message}`) } }
const key = read('./grade/ann6-ws.key.json')
const G = ['a', 'b', 'c'].map(s => read(`./grade/ann6-ws.grader-${s}.json`))
const blind = score(new URL('./attack', import.meta.url).pathname, ['ann6-f1', 'ann6-f2'])
const solved3 = new Set(blind.perItem.filter(x => x.solved === 3).map(x => x.localId))
const RANK = { easy: 0, medium: 1, hard: 2 }, NAME = ['easy', 'medium', 'hard']
const sets = new Map(), diff = {}
for (const [q, k] of Object.entries(key)) {
  const rows = G.map((g, i) => { const r = g.items?.[q]; if (!r || !/^[ABCD]$/.test(r.pick ?? '') || !(r.difficulty in RANK)) die(`grader-${'abc'[i]} item ${q} missing/invalid`); return r })
  const s = sets.get(k.group) ?? { off: [], second: [], corr: [] }; sets.set(k.group, s)
  rows.forEach((r, i) => {
    if (r.pick !== k.letter) s.off.push(`${k.localId} grader-${'abc'[i]} picked ${r.pick} (key ${k.letter})`)
    if (r.second_defensible) s.second.push(`${k.localId} grader-${'abc'[i]} second ${r.second_defensible}${r.second_defensible === k.letter ? ' (=key)' : ''}: ${r.second_why ?? ''}`)
    if (r.passage_needed === false && solved3.has(k.localId)) s.corr.push(`${k.localId} blind 3/3 + grader-${'abc'[i]} passage_needed=false`)
  })
  const ds = rows.map(r => RANK[r.difficulty]).sort((a, b) => a - b)
  diff[k.localId] = NAME[ds[1]] // median of three (no split possible with 3 ordinal labels)
}
let auto = 0
for (const [g, s] of [...sets].sort()) {
  const drop = s.off.length || s.corr.length
  if (drop) auto++
  console.log(`${g}: ${drop ? 'DROP' : (s.second.length ? 'REVIEW' : 'keep')}`)
  for (const x of [...s.off, ...s.corr]) console.log('   ' + x)
  for (const x of s.second) console.log('   second: ' + x)
}
console.log(`\nauto drops (off-key or corroborated): ${auto} of ${sets.size}`)
G.forEach((g, i) => console.log(`grader-${'abc'[i]} cross_item: ${JSON.stringify(g.cross_item)}`))
const dc = {}; for (const v of Object.values(diff)) dc[v] = (dc[v] ?? 0) + 1
console.log('median difficulty over 30:', JSON.stringify(dc))
console.log('DIFF ' + JSON.stringify(diff))
