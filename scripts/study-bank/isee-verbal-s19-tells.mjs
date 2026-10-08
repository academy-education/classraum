#!/usr/bin/env node
/**
 * isee-verbal-s19-tells.mjs <syn|sc>
 *
 * The computable parts of the s19 tells stage (isee-verbal-s19.prereg.md):
 *   - key strictly longest / strictly shortest share (bar <= 35% each)
 *   - solver heuristic: per sample, every named heuristic's CANDIDATE picks and
 *     how many hit the key (each pick carries the heuristic that decided it).
 *     The type FAILS if all three samples name one heuristic and, pooled, its
 *     candidate picks score > 70% on >= 15 picks. Whether three names are "one
 *     heuristic" is read by hand from the printed descriptions.
 *   - synonyms: antonym-of-key and part-of-speech outliers as reported by the
 *     three with-source graders (an item counts when >= 2 graders name one).
 * check-recycled-distractor.mjs and verify-answer-key-spread.ts are run
 * separately. Refuses (exit 2) on a solver file missing any id or heuristic tag.
 */
import { readFileSync, existsSync } from 'node:fs'
const type = process.argv[2]
if (!['syn', 'sc'].includes(type)) { console.error('usage: <syn|sc>'); process.exit(2) }
const D = 'scripts/study-bank', tag = (process.argv[3] ?? `isee-verbal-s19-${type}`)  // optional tag: s20 passes isee-verbal-s20-sc
const batch = JSON.parse(readFileSync(`${D}/${tag}.batch.json`, 'utf8'))
const n = batch.length
let longest = 0, shortest = 0
for (const it of batch) {
  const L = it.choices.map(c => c.length), k = it.correct_answer.length
  if (L.filter(x => x >= k).length === 1) longest++
  if (L.filter(x => x <= k).length === 1) shortest++
}
const pct = x => (100 * x / n).toFixed(1)
console.log(`${tag}: key strictly longest ${longest}/${n} = ${pct(longest)}%, strictly shortest ${shortest}/${n} = ${pct(shortest)}% (bar <= 35% each) -> ${longest / n <= 0.35 && shortest / n <= 0.35 ? 'ok' : 'FAIL'}`)

const key = JSON.parse(readFileSync(`${D}/${tag}-oo.key.json`, 'utf8'))
const cand = Object.keys(key).filter(id => key[id].kind === 'candidate')
for (const s of ['a', 'b', 'c']) {
  const sol = JSON.parse(readFileSync(`${D}/${tag}-oo.solver-${s}.json`, 'utf8'))
  const H = JSON.parse(readFileSync(`${D}/${tag}-oo.heuristics-${s}.json`, 'utf8'))
  for (const id of Object.keys(key)) if (!sol[id]?.pick || sol[id].heuristic === undefined) { console.error(`REFUSING: sample ${s} lacks pick/heuristic on ${id}`); process.exit(2) }
  const by = {}
  for (const id of cand) { const h = sol[id].heuristic || 'none'; by[h] ??= [0, 0]; by[h][1]++; if (sol[id].pick === key[id].letter) by[h][0]++ }
  console.log(`  sample ${s}: candidate picks by heuristic`)
  for (const [h, [hit, tot]] of Object.entries(by).sort((a, b) => b[1][1] - a[1][1])) {
    const desc = (H.heuristics ?? []).find(x => x.name === h)?.description ?? ''
    console.log(`    ${h.padEnd(34)} ${hit}/${tot} = ${(100 * hit / tot).toFixed(1)}%   ${desc.slice(0, 110)}`)
  }
}
if (type === 'syn') {
  const gfiles = ['a', 'b', 'c'].map(g => `${D}/${tag}.grader-${g}.json`)
  if (gfiles.every(existsSync)) {
    const G = gfiles.map(f => JSON.parse(readFileSync(f, 'utf8')))
    let ant = 0, pos = 0
    for (const it of batch) {
      const a = {}; for (const g of G) if (g[it.id]?.antonym_of_key) a[g[it.id].antonym_of_key.toLowerCase()] = (a[g[it.id].antonym_of_key.toLowerCase()] ?? 0) + 1
      if (Object.values(a).some(v => v >= 2)) ant++
      const p = {}; for (const g of G) for (const w of g[it.id]?.pos_mismatch ?? []) p[w.toLowerCase()] = (p[w.toLowerCase()] ?? 0) + 1
      if (Object.values(p).some(v => v >= 2)) pos++
    }
    console.log(`  antonym-of-key items (>= 2 graders) ${ant}/${n} = ${pct(ant)}% (bar <= 25%) -> ${ant / n <= 0.25 ? 'ok' : 'FAIL'}; POS outlier items (>= 2 graders) ${pos}/${n} -> ${pos === 0 ? 'ok' : 'FAIL'}`)
  } else console.log('  (grader files absent: antonym/POS not measured)')
}
