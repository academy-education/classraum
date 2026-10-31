#!/usr/bin/env node
// build-probe.mjs — the cross-item probe input (ITEP-SLATE-LISTENING-V2.prereg.md §3b): every item of the 9 author
// files, grouped by author and script, with kind, speakers, transcript, choices (authored order) and the key marked.
//   node scripts/study-bank/itep-listening-v2-work/build-probe.mjs [--out probe/items.json]   (from the repo root)
// Exits 2 unless it reads exactly 126 items in 54 sets.
import { readFileSync, writeFileSync } from 'node:fs'
const W = 'scripts/study-bank/itep-listening-v2-work'
const i = process.argv.indexOf('--out'); const out = `${W}/${i >= 0 ? process.argv[i + 1] : 'probe/items.json'}`
const sets = []
for (const x of 'ABCDEFGHI') for (const s of JSON.parse(readFileSync(`${W}/items/${x}.json`, 'utf8')).sets) sets.push({
  author: x, set_id: s.set_id, part: s.part, setting: s.setting, speakers: s.speakers, transcript: s.transcript,
  items: s.items.map(it => ({ qid: it.qid, kind: it.kind, prompt: it.prompt, choices: it.choices, key: it.correct_answer })),
})
const n = sets.reduce((a, s) => a + s.items.length, 0)
if (n !== 126 || sets.length !== 54) { console.error(`build-probe: read ${n} items in ${sets.length} sets, want 126 in 54`); process.exit(2) }
writeFileSync(out, JSON.stringify(sets, null, 1) + '\n')
console.log(`wrote ${out}: ${sets.length} sets, ${n} items`)
