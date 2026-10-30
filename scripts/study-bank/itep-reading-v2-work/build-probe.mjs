#!/usr/bin/env node
// build-probe.mjs — the cross-item probe input (ITEP-SLATE-READING-V2.prereg.md §3b): every item of the 8 author
// files, grouped by author and passage, with kind, choices (authored order) and the key marked.
//   node scripts/study-bank/itep-reading-v2-work/build-probe.mjs [--out probe/items.json]   (from the repo root)
// Exits 2 unless it reads exactly 152 items in 42 sets.
import { readFileSync, writeFileSync } from 'node:fs'
const W = 'scripts/study-bank/itep-reading-v2-work'
const i = process.argv.indexOf('--out'); const out = `${W}/${i >= 0 ? process.argv[i + 1] : 'probe/items.json'}`
const sets = []
for (const x of 'ABCDEFGH') for (const s of JSON.parse(readFileSync(`${W}/items/${x}.json`, 'utf8')).sets) sets.push({
  author: x, set_id: s.set_id, part: s.part, genre: s.genre, passage: s.passage,
  items: s.items.map(it => ({ qid: it.qid, kind: it.kind, prompt: it.prompt, choices: it.choices, key: it.correct_answer })),
})
const n = sets.reduce((a, s) => a + s.items.length, 0)
if (n !== 152 || sets.length !== 42) { console.error(`build-probe: read ${n} items in ${sets.length} sets, want 152 in 42`); process.exit(2) }
writeFileSync(out, JSON.stringify(sets, null, 1) + '\n')
console.log(`wrote ${out}: ${sets.length} sets, ${n} items`)
