import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { kOf } from '/Users/andylee/Downloads/saas/classraum/scripts/study-bank/ssat-wv.mjs'
const [out, ...files] = process.argv.slice(2), sorted = [...files].sort()
const frozenSha = createHash('sha256').update(Buffer.concat(sorted.map(f => readFileSync(f)))).digest('hex')
const batch = [], drawn = {}
for (const f of sorted) { const p = JSON.parse(readFileSync(f, 'utf8')), k = drawn[p.passage_id] = kOf(frozenSha, p.passage_id)
  for (const q of p.questions) batch.push({ id: q.qid, set_id: p.passage_id, version: k, subskill: q.kind, prompt: q.prompt, choices: q.choices, correct_answer: q.choices[k] }) }
writeFileSync(out, JSON.stringify(batch, null, 1)); console.log('pseudo-draw (NOT a freeze; report-only):', frozenSha.slice(0, 12), JSON.stringify(drawn))
