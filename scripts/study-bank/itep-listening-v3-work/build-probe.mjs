#!/usr/bin/env node
// build-probe.mjs — the cross-item probe input (ITEP-SLATE-LISTENING-V3.prereg.md §3b): every item of the v3 author
// files (8 conversations), grouped by author, with kind, speakers, transcript, choices (authored order) and the key
// marked; plus, as context marked shipped:true, the 4 cleared v2 conversations (16 items) so cross-round patterns show.
//   node scripts/study-bank/itep-listening-v3-work/build-probe.mjs [--out probe/items.json]   (from the repo root)
// Exits 2 unless it reads exactly 32 v3 items in 8 sets and 16 shipped v2 items in 4 sets.
import { readFileSync, writeFileSync } from 'node:fs'
const W = 'scripts/study-bank/itep-listening-v3-work'
const i = process.argv.indexOf('--out'); const out = `${W}/${i >= 0 ? process.argv[i + 1] : 'probe/items.json'}`
const sets = []
for (const x of 'ABCDEFGH') for (const s of JSON.parse(readFileSync(`${W}/items/${x}.json`, 'utf8')).sets) sets.push({
  round: 'v3', author: x, set_id: s.set_id, part: s.part, setting: s.setting, speakers: s.speakers, transcript: s.transcript,
  items: s.items.map(it => ({ qid: it.qid, kind: it.kind, prompt: it.prompt, choices: it.choices, key: it.correct_answer })),
})
const n = sets.reduce((a, s) => a + s.items.length, 0)
if (n !== 32 || sets.length !== 8) { console.error(`build-probe: read ${n} v3 items in ${sets.length} sets, want 32 in 8`); process.exit(2) }
const V2 = 'scripts/study-bank/itep-listening-v2-work'
const cleared = new Set(JSON.parse(readFileSync(`${V2}/results/itep-listening-v2.json`, 'utf8')).cleared)
const ctx = []
for (const x of 'ABCDEFGHI') for (const s of JSON.parse(readFileSync(`${V2}/items/${x}.json`, 'utf8')).sets) if (s.part === 2 && s.items.every(i => cleared.has(i.qid))) ctx.push({
  round: 'v2', shipped: true, author: `v2-${x}`, set_id: s.set_id, part: s.part, setting: s.setting, speakers: s.speakers, transcript: s.transcript,
  items: s.items.map(it => ({ qid: it.qid, kind: it.kind, prompt: it.prompt, choices: it.choices, key: it.correct_answer })),
})
const m = ctx.reduce((a, s) => a + s.items.length, 0)
if (m !== 16 || ctx.length !== 4) { console.error(`build-probe: read ${m} shipped v2 conversation items in ${ctx.length} sets, want 16 in 4`); process.exit(2) }
writeFileSync(out, JSON.stringify([...sets, ...ctx], null, 1) + '\n')
console.log(`wrote ${out}: ${sets.length} v3 sets / ${n} items + ${ctx.length} shipped v2 sets / ${m} items`)
