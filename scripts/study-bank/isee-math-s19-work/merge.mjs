// merge.mjs: items/*.mjs + the 11 s18 items M1 cleared -> isee-math-s19.batch.json, then the in-loop screen.
// Screen (refusals): CENT-a key nearest the option mean, CENT-b key nearest the mean of the others, CENT-e rank-2/3 key
// central in the range (38-62%), FORM key alone in its surface form. Warnings: CENT-c, CENT-d, OUTLIER, CLASS, SUMOPT,
// ADJ-key, CLOSEPAIR. Exits 2 if any item fails to parse, has != 3 distractors, or a duplicate id.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = new URL('.', import.meta.url).pathname
const all = []
for (const f of readdirSync(D + 'items').filter(f => /^[A-F]\.mjs$/.test(f)).sort()) {
  const { items } = await import(D + 'items/' + f)
  for (const x of items) all.push({ strand: f[0], ...x })
}
const S18 = JSON.parse(readFileSync(D + '../isee-math-s18-work/isee-math-s18.batch.json', 'utf8'))
const REUSE = { 'IM18A-07': 'A', 'IM18A-06': 'A', 'IM18A-02': 'A', 'IM18B-07': 'B', 'IM18E-05': 'B', 'IM18C-09': 'C', 'IM18E-01': 'E', 'IM18E-04': 'E', 'IM18F-04': 'F', 'IM18F-05': 'F', 'IM18F-06': 'F' }
let r = 0
for (const [sid, st] of Object.entries(REUSE)) {
  const o = S18.find(x => x.id === sid); if (!o) { console.error('REFUSING: missing s18 ' + sid); process.exit(2) }
  all.push({ strand: st, id: 'IM19R-' + String(++r).padStart(2, '0'), from_s18: sid, d: o.difficulty, sub: o.subskill, p: o.prompt, k: o.correct_answer, ds: o.distractor_solve, solve: o.solve, f: o.forced, e: o.explanation })
}
// Distractor re-deals on the reused s18 items (the central-key lesson postdates s18). Key and stem unchanged.
const OVR = {
  'IM19R-03': { '240':"// multiplies 8 by 30 instead of taking their least common multiple\nreturn String(8*30);", '720':"// multiplies 8 by 90\nreturn String(8*90);", '90':"// takes the least common multiple of 30 and 90\nlet m=90;while(m%30)m+=90;return String(m);" },
  'IM19R-04': { '34560':"// divides by 1.25 instead of multiplying, then takes the fee\nreturn String(Math.round(300/1.25*150*0.96));", '36000':"// divides by 1.25 instead of multiplying, and forgets the fee\nreturn String(300/1.25*150);", '43200':"// skips the euro-to-dollar step and changes 300 straight into yen, then takes the fee\nreturn String(300*150*0.96);" },
  'IM19R-05': { '1200':"// converts to meters per minute\nreturn String(72*1000/60);", '259.2':"// multiplies by 3.6 instead of dividing\nreturn String(Math.round(72*3.6*10)/10);", '1.2':"// converts to kilometers per minute\nreturn String(72/60);" },
  'IM19R-06': { '15':"// forgets to multiply the 9 by 2: a + 6 = 2a - 9\nfor(let a=0;a<100;a++)if(a+6===2*a-9)return String(a);", '21':"// reverses the relationship, a - 9 = 2(a + 6), and drops the minus sign from a = -21\nfor(let a=-100;a<100;a++)if(a-9===2*(a+6))return String(Math.abs(a));", '12':"// uses 9 years from now, a + 6 = 2(a + 9), and drops the minus sign from a = -12\nfor(let a=-100;a<100;a++)if(a+6===2*(a+9))return String(Math.abs(a));" },
  'IM19R-07': { '5 hours 29 minutes':"// subtracts the smaller minutes from the larger (47 - 18) and 15 - 10 without borrowing\nreturn (15-10)+' hours '+(47-18)+' minutes';", '5 hours 31 minutes':"// gets the minutes right but forgets to borrow the hour\nreturn (15-10)+' hours '+(78-47)+' minutes';", '7 hours 29 minutes':"// subtracts 3:18 from 10:47, ignoring a.m. and p.m.\nreturn (10-3)+' hours '+(47-18)+' minutes';" },
  'IM19R-08': { '399':"// uses n^2 - 1 with n = 20 instead of (n + 1)^2 - 1\nreturn String(20*20-1);", '420':"// uses n(n + 1) instead of n(n + 2)\nreturn String(20*21);", '380':"// uses n(n + 1) with n = 19\nreturn String(19*20);" },
  'IM19R-10': { '1/2':"// assumes greater and less each happen half the time, forgetting ties\nreturn '1/2';", '3/8':"// counts 24 favorable outcomes instead of 28\nreturn '3/8';", '7/8':"// gives the probability that the two numbers are different\nreturn '7/8';" },
}
for (const x of all) if (OVR[x.id]) { x.ds = OVR[x.id]; x.redealt = true }
// Items may carry a POOL of 4-6 natural errors instead of exactly 3. pick() chooses the triple: no refusal, key not in a
// +-pair, key not the sum/difference of two options, key not a hub (x2 x3 x4 x1.5 x10 or +-1 to two or more options),
// then the fewest warnings, then the rank the running histogram needs most (target ~25% each).
const HUBR = [2, 3, 4, 1.5, 10]
const isHub = (k, vs) => vs.filter(v => v && k && (HUBR.some(q => Math.abs(v / k - q) < 1e-9 || Math.abs(k / v - q) < 1e-9) || Math.abs(v - k) === 1)).length >= 2
const need = { 1: 0, 2: 0, 3: 0, 4: 0 }
for (const x of all) if (Object.keys(x.ds).length === 3) { const R = screen(x.k, Object.keys(x.ds)); if (R.rank) need[R.rank]++ }
for (const x of all) {
  const pool = Object.keys(x.ds); if (pool.length <= 3) continue
  let best = null
  for (let a = 0; a < pool.length; a++) for (let b = a + 1; b < pool.length; b++) for (let c = b + 1; c < pool.length; c++) {
    const tri = [pool[a], pool[b], pool[c]], R = screen(x.k, tri); if (R.refuse.length || R.nonnumeric) continue
    const k = val(x.k), vs = tri.map(val)
    if (vs.some(v => Math.abs(v + k) < 1e-9 && k !== 0)) continue
    if (isHub(k, vs)) continue
    let bad = false; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (i !== j && (Math.abs(vs[i] + vs[j] - k) < 1e-9 || Math.abs(vs[i] - vs[j] - k) < 1e-9)) bad = true
    if (bad) continue
    const score = R.warn.length * 4 + need[R.rank] * 3 + (x.rank && x.rank !== R.rank ? 50 : 0)
    if (!best || score < best.score) best = { tri, score, rank: R.rank }
  }
  if (!best) { console.error('REFUSING: no acceptable triple for ' + x.id + ' from pool ' + pool.join(', ')); process.exit(2) }
  need[best.rank]++; x.pool_unused = pool.filter(v => !best.tri.includes(v)); x.ds = Object.fromEntries(best.tri.map(v => [v, x.ds[v]]))
}
const ids = new Set(); for (const x of all) { if (ids.has(x.id)) { console.error('REFUSING: duplicate id ' + x.id); process.exit(2) } ids.add(x.id) }
let s = createHash('sha256').update('isee-math-s19-2026-10-31').digest().readUInt32BE(0)
const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 }
const sh = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const slots = sh(all.map((_, i) => i % 4))
export function val(t) { t = String(t).trim().replace(/−/g, '-'); let m = t.match(/^(-?\d+(?:\.\d+)?)\s*pi$/); if (m) return +m[1] * Math.PI
  m = t.match(/^(\d+(?:\.\d+)?) ([+-]) (\d+(?:\.\d+)?)\s*pi$/); if (m) return +m[1] + (m[2] === '-' ? -1 : 1) * +m[3] * Math.PI
  m = t.match(/^(-?\d+(?:\.\d+)?) x 10\^(-?\d+)$/); if (m) return +m[1] * 10 ** +m[2]
  m = t.match(/^(-?)(\d+) (\d+)\/(\d+)$/); if (m) return (m[1] ? -1 : 1) * (+m[2] + m[3] / m[4]); m = t.match(/^(-?\d+)\/(\d+)$/); if (m) return m[1] / m[2]
  m = t.match(/^-?\$?(\d[\d,]*(?:\.\d+)?)$/); if (m) return (t.startsWith('-') ? -1 : 1) * +m[1].replace(/,/g, '');   return NaN }

function formOf(t) { return /pi$/.test(t) ? (/[+-] /.test(t) ? 'mixpi' : 'pi') : /^(-?\d+(?:\.\d+)?) x 10/.test(t) ? 'sci' : /\//.test(t) ? 'frac' : /:/.test(t) ? 'time' : /h(ours?)? \d+ min/.test(t) ? 'hm' : (t.match(/\.(\d+)/) ? 'dec' + t.match(/\.(\d+)/)[1].length : 'int') }
export function screen(key, ds) {
  const ch = [key, ...ds], vs = ch.map(val), R = { refuse: [], warn: [], rank: null }
  if (vs.some(v => !Number.isFinite(v))) { R.nonnumeric = true; return R }
  const sorted = [...vs].sort((a, b) => a - b), rng = sorted[3] - sorted[0], k = vs[0], rank = 1 + vs.filter(v => v < k).length; R.rank = rank
  const m = vs.reduce((a, b) => a + b, 0) / 4, d = vs.map(v => Math.abs(v - m))
  if (!(Math.min(...d.slice(1)) < d[0] - 0.03 * rng)) R.refuse.push('CENT-a key nearest the mean')
  const loo = vs.map((v, i) => Math.abs(v - vs.filter((_, j) => j !== i).reduce((a, b) => a + b, 0) / 3))
  if (loo[0] <= Math.min(...loo.slice(1))) R.refuse.push('CENT-b key nearest the mean of the others')
  const ri = sorted.indexOf(k)
  if (ri === 1 || ri === 2) { const p = (k - sorted[0]) / rng; if (p >= 0.38 && p <= 0.62) R.refuse.push('CENT-e key central in the range'); if (Math.max(k - sorted[ri - 1], sorted[ri + 1] - k) <= 0.3 * rng) R.warn.push('CENT-c close both sides') }
  const dk = vs.slice(1).map(v => Math.abs(v - k)); if (Math.max(...dk) / Math.min(...dk) < 2.5) R.warn.push('CENT-d even distances')
  if (ri === 0 || ri === 3) { const g = [sorted[1] - sorted[0], sorted[2] - sorted[1], sorted[3] - sorted[2]], kg = ri === 0 ? g[0] : g[2]; if (kg >= Math.max(...g) - 1e-12) R.warn.push('OUTLIER') }
  const fk = formOf(ch[0]); if (ch.slice(1).every(t => formOf(t) !== fk)) R.refuse.push('FORM key alone in its form (' + fk + ')')
  const ld = t => String(t).replace(/[^0-9]/g, '').slice(-1)
  if (vs.every(Number.isInteger)) for (const [nm, f] of [['parity', v => Math.abs(v) % 2], ['last digit', v => ld(v)], ['mult5', v => v % 5 === 0]]) { const kk = f(vs[0]), o = vs.slice(1).map(f); if (o.every(x => x !== kk) && new Set(o).size === 1) R.warn.push('CLASS ' + nm) }
  for (let i = 1; i < 4; i++) for (let j = 1; j < 4; j++) if (i !== j && (Math.abs(vs[i] + vs[j] - k) < 1e-9 || Math.abs(vs[i] - vs[j] - k) < 1e-9)) R.warn.push('SUMOPT')
  if (vs.every(Number.isInteger) && vs.slice(1).some(v => Math.abs(v - k) === 1)) R.warn.push('ADJ-key')
  return R
}
const meta = {}
const out = all.map((x, i) => {
  const ds = Object.keys(x.ds); if (ds.length !== 3) { console.error('REFUSING: ' + x.id + ' has ' + ds.length + ' distractors'); process.exit(2) }
  const dsh = sh([...ds]); const choices = [...dsh.slice(0, slots[i]), x.k, ...dsh.slice(slots[i])]
  meta[x.id] = { strand: x.strand, ...(x.from_s18 ? { from_s18: x.from_s18, distractors_redealt: !!x.redealt } : {}), ...(x.pool_unused?.length ? { pool_unused: x.pool_unused } : {}) }
  return { id: x.id, family: 'isee', section: 'math', domain: 'Math', subskill: x.sub, difficulty: x.d, prompt: x.p, choices, correct_answer: x.k, explanation: x.e, solve: x.solve, distractor_solve: x.ds, forced: x.f }
})
writeFileSync(D + 'isee-math-s19.batch.json', JSON.stringify(out, null, 1) + '\n')
writeFileSync(D + 'isee-math-s19.meta.json', JSON.stringify(meta, null, 1) + '\n')
const hist = { 1: 0, 2: 0, 3: 0, 4: 0, nn: 0 }, byS = {}, byD = {}; let nref = 0, nw = 0
for (const it of out) {
  const R = screen(it.correct_answer, it.choices.filter(c => c !== it.correct_answer)); it._screen = R
  if (R.nonnumeric) hist.nn++; else hist[R.rank]++
  byS[meta[it.id].strand] = (byS[meta[it.id].strand] ?? 0) + 1; byD[it.difficulty] = (byD[it.difficulty] ?? 0) + 1
  if (R.refuse?.length) { nref++; console.log('REFUSE', it.id, 'rank', R.rank, R.refuse.join('; '), '|', it.choices.join(', '), 'key', it.correct_answer) }
  if (R.warn?.length && process.argv.includes('--warn')) { nw++; console.log('  warn', it.id, 'rank', R.rank, R.warn.join('; '), '|', it.choices.join(', ')) }
}
writeFileSync(D + 'screen.json', JSON.stringify(Object.fromEntries(out.map(o => [o.id, o._screen])), null, 1))
console.log(`${out.length} items; strands ${JSON.stringify(byS)}; difficulty ${JSON.stringify(byD)}; key rank ${JSON.stringify(hist)}; refused ${nref}`)
