#!/usr/bin/env node
// dedupe.mjs — ITEP-SLATE-LISTENING-V3.prereg.md §3. For every pair of v3 sets, and every v3 set against every v1
// and v2 authored set (dropped ones included), flags:
//   (a) transcript content-word Jaccard >= 0.20     (b) a shared invented name
//   (c) a key 4-gram shared with any other key      (d) an option text repeated verbatim
//   node scripts/study-bank/itep-listening-v3-work/dedupe.mjs [--v3-dir <dir>] [--expect-v3 32] [--top 10]   (from the repo root)
// Exits 2 unless it reads --expect-v3 v3 items (default 32 in 8 sets), 126 v2 items in 54 sets and 56 v1 items in 24
// sets; 1 on any flag; 0 when clean.
import { readFileSync, existsSync } from 'node:fs'
const argv = process.argv.slice(2)
const flag = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d }
const V3 = flag('--v3-dir', 'scripts/study-bank/itep-listening-v3-work/items')
const V2 = 'scripts/study-bank/itep-listening-v2-work/items'
const V1 = 'scripts/study-bank/itep-listening-v1-work/items'
const XS = flag('--authors', 'ABCDEFGH')
const EXP3 = Number(flag('--expect-v3', 4 * XS.length))
const TOP = Number(flag('--top', 10))
const die = m => { console.error(`dedupe: ${m}`); process.exit(2) }
function load(dir, xs, round) {
  const sets = []
  for (const x of xs) {
    const p = `${dir}/${x}.json`; if (!existsSync(p)) die(`missing ${p}`)
    let d; try { d = JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`${p}: ${e.message}`) }
    for (const s of d.sets || []) sets.push({ round, author: x, ...s })
  }
  return sets
}
const v3 = load(V3, XS, 'v3'), v1 = [...load(V1, 'ABCD', 'v1'), ...load(V2, 'ABCDEFGHI', 'v2')]
const v1only = v1.filter(s => s.round === 'v1'), v2only = v1.filter(s => s.round === 'v2')
const count = ss => ss.reduce((n, s) => n + (s.items || []).length, 0)
if (count(v3) !== EXP3 || v3.length !== EXP3 / 4) die(`read ${count(v3)} v3 items in ${v3.length} sets, want ${EXP3} in ${EXP3 / 4}`)
if (count(v2only) !== 126 || v2only.length !== 54) die(`read ${count(v2only)} v2 items in ${v2only.length} sets, want 126 in 54`)
if (count(v1only) !== 56 || v1only.length !== 24) die(`read ${count(v1only)} v1 items in ${v1only.length} sets, want 56 in 24`)
const v2 = v3
const STOP = new Set('the a an and or but of to in on at for with by from as is are was were be been being it its this that these those there their they them he she his her him we our you your i me my not no do does did have has had will would can could should may might must so than then too very just also about into over after before what which who whom when where why how all any some more most other such only own same few each both one two three yeah okay right well really think know like get got going want need good sure thing things lot mean say said let sorry thanks oh hmm'.split(' '))
const stem = w => w.replace(/'s$/, '').replace(/ies$/, 'y').replace(/(?<=\w{3})(es|s)$/, '').replace(/(?<=\w{3})ing$/, '').replace(/(?<=\w{3})ed$/, '')
const content = t => new Set(String(t).replace(/^[WM]: /gm, '').toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(w => w.length >= 3 && !STOP.has(w)).map(stem))
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim()
for (const s of [...v2, ...v1]) s._cw = content(s.transcript)
const flags = [], pairs = []
const all = [...v2, ...v1]
for (let i = 0; i < v2.length; i++) for (let j = i + 1; j < all.length; j++) {
  const a = v2[i], b = all[j]
  let k = 0; for (const w of a._cw) if (b._cw.has(w)) k++
  const jac = k / (a._cw.size + b._cw.size - k || 1)
  pairs.push([jac, a.set_id, b.set_id])
  if (jac >= 0.20) flags.push(`(a) transcripts ${a.set_id} ~ ${b.set_id}: Jaccard ${jac.toFixed(3)}`)
  const na = new Set((a.names || []).flatMap(n => n.split(/\s+/)))
  for (const n of (b.names || []).flatMap(n => n.split(/\s+/))) if (na.has(n)) flags.push(`(b) name "${n}" in ${a.set_id} and ${b.set_id}`)
}
const grams = new Map(), opts = new Map()
for (const s of all) for (const it of s.items || []) {
  const w = norm(it.correct_answer).split(' ')
  const mine = new Set(); for (let i = 0; i + 4 <= w.length; i++) mine.add(w.slice(i, i + 4).join(' '))
  for (const g of mine) { const o = grams.get(g); if (o && o.qid !== it.qid && (s.round === 'v3' || o.round === 'v3')) flags.push(`(c) keys ${o.qid} and ${it.qid} share "${g}"`); if (!o) grams.set(g, { qid: it.qid, round: s.round }) }
  for (const c of it.choices || []) { const k = norm(c); const o = opts.get(k); if (o && o.qid !== it.qid && (s.round === 'v3' || o.round === 'v3')) flags.push(`(d) option "${String(c).slice(0, 50)}" in ${o.qid} and ${it.qid}`); if (!o) opts.set(k, { qid: it.qid, round: s.round }) }
}
pairs.sort((x, y) => y[0] - x[0])
console.log(`read v3 ${count(v3)} items / ${v3.length} sets, v1+v2 ${count(v1)} items / ${v1.length} sets; ${pairs.length} transcript pairs`)
console.log(`top ${TOP} transcript pairs by Jaccard:`); for (const [j, a, b] of pairs.slice(0, TOP)) console.log(`  ${j.toFixed(3)}  ${a} ~ ${b}`)
console.log(`FLAGS ${flags.length}`); for (const f of flags) console.log('  ' + f)
process.exit(flags.length ? 1 : 0)
