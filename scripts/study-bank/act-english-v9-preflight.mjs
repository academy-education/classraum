// Pre-registered bar 1 pre-flight for act-english-v9 (the act-english-v7/v8 pre-flight,
// copied from act-english-v8-preflight.mjs; only the per-passage type map differs).
// Exits 1 on any refusal.  node act-english-v8-preflight.mjs <batch.json...>
import { readFileSync } from 'node:fs'
const files = process.argv.slice(2)
if (!files.length) { console.error('usage: preflight.mjs <batch.json...>'); process.exit(2) }
const items = files.flatMap(f => JSON.parse(readFileSync(f, 'utf8')))
if (!items.length) { console.error('REFUSING: zero items read'); process.exit(2) }
const flat = s => String(s).replace(/\s+/g, ' ').trim()
const bad = []
console.log(`n=${items.length} items from ${files.length} file(s), ${new Set(items.map(i => i.passage_id)).size} passages`)

// passage domain mix
const byP = {}
for (const it of items) { const p = (byP[it.passage_id] ??= { c: 0, p: 0, k: 0 }); if (it.domain.startsWith('Conv')) p.c++; else if (it.domain.startsWith('Prod')) p.p++; else p.k++ }
// v9: per-passage mix fixed by act-english-v9.PREREG.md (10 x type X 5/3/2, 5 x type Y 6/3/1).
const TYPE = { P1: 'X', P2: 'Y', P3: 'X', P4: 'X', P5: 'Y', P6: 'X', P7: 'X', P8: 'Y', P9: 'X', P10: 'Y', P11: 'X', P12: 'X', P13: 'X', P14: 'Y', P15: 'X' }
const WANT = { X: [5, 3, 2], Y: [6, 3, 1] }
for (const [pid, m] of Object.entries(byP)) {
  const w = WANT[TYPE[pid]]
  if (!w) { bad.push(`passage ${pid} has no assigned type`); continue }
  if (m.c !== w[0] || m.p !== w[1] || m.k !== w[2]) bad.push(`passage ${pid} mix ${m.c}/${m.p}/${m.k}, want ${w.join('/')} (type ${TYPE[pid]})`)
}

// key unique longest / shortest
let longest = 0, shortest = 0
for (const it of items) {
  const opts = it.choices.filter(c => !/^no change$/i.test(flat(c)))
  if (!opts.includes(it.correct_answer)) continue
  const L = opts.map(c => flat(c).length), k = flat(it.correct_answer).length
  if (k === Math.max(...L) && L.filter(x => x === k).length === 1) longest++
  if (k === Math.min(...L) && L.filter(x => x === k).length === 1) shortest++
}
console.log(`key unique-longest ${longest}/${items.length}  unique-shortest ${shortest}/${items.length} (NO CHANGE excluded from the comparison)`)
if (longest > 0.25 * items.length) bad.push(`key uniquely longest in ${longest}`)
if (shortest > 0.25 * items.length) bad.push(`key uniquely shortest in ${shortest}`)

// NO CHANGE keying
const nc = items.filter(it => it.choices.some(c => /^no change$/i.test(flat(c))))
const ncKey = nc.filter(it => /^no change$/i.test(flat(it.correct_answer))).length
const ncRate = 100 * ncKey / nc.length
console.log(`NO CHANGE keyed ${ncKey}/${nc.length} = ${ncRate.toFixed(1)}%`)
if (ncRate < 15 || ncRate > 35) bad.push(`NO CHANGE key rate ${ncRate.toFixed(1)}% outside 15-35`)

// placement letters
const place = items.filter(it => it.choices.every(c => /^Point \[[A-D]\]\.?$/.test(flat(c))))
const pl = {}; for (const it of place) { const L = it.correct_answer.match(/\[([A-D])\]/)[1]; pl[L] = (pl[L] ?? 0) + 1 }
console.log(`placement keys ${JSON.stringify(pl)} over ${place.length}`)
for (const L of 'ABCD') if (place.length >= 4 && !pl[L]) bad.push(`placement Point ${L} never keyed`)

// Kept/Yes polarity
const pol = items.filter(it => it.choices.every(c => /^(Yes|No|Kept|Deleted)\b/i.test(flat(c))))
const pos = pol.filter(it => /^(Yes|Kept)\b/i.test(flat(it.correct_answer))).length
const polRate = 100 * pos / (pol.length || 1)
console.log(`Kept/Yes keyed ${pos}/${pol.length} = ${polRate.toFixed(1)}%`)
if (pol.length && (polRate < 30 || polRate > 70)) bad.push(`Kept/Yes polarity ${polRate.toFixed(1)}%`)

// semicolon key on boundary items
const bnd = items.filter(it => /splice|run-on|fragment|boundar|semicolon|colon|dash|independent clause/i.test(it.subskill ?? ''))
const semi = bnd.filter(it => /;/.test(it.correct_answer)).length
const semiRate = 100 * semi / (bnd.length || 1)
console.log(`semicolon key ${semi}/${bnd.length} boundary-punctuation items = ${semiRate.toFixed(1)}%`)
if (bnd.length && semiRate > 35) bad.push(`semicolon key ${semiRate.toFixed(1)}%`)

// duplicate options after normalising
for (const it of items) if (new Set(it.choices.map(c => flat(c).toLowerCase())).size !== 4) bad.push(`${it.id}: duplicate options`)

// option begins with punctuation
for (const it of items) for (const c of it.choices) if (/^[,;:.]/.test(flat(c))) bad.push(`${it.id}: option begins with punctuation "${c}"`)

// quoted span present in passage
for (const it of items) {
  const q = [...it.prompt.matchAll(/["“]([^"”]{2,})["”]/g)].map(m => flat(m[1]).replace(/[,.;:!?…]+$/, ''))
  for (const s of q) if (s.length > 3 && !flat(it.passage).includes(s) && !/^(No Change)$/.test(s)) {
    // added-sentence quotes are legitimately absent from the passage
    if (!/add|insert|following sentence|considering adding/i.test(it.prompt)) bad.push(`${it.id}: quoted "${s.slice(0, 50)}" not found in passage`)
  }
}

if (bad.length) { console.error('\nREFUSED:\n  ' + bad.join('\n  ')); process.exit(1) }
console.log('\npre-flight OK')
