// b13 candidate engine (MAP-MATH-V2-B13.prereg.md), 2026-10-31: engine12 (scratchpad/map-v2-math-b12-work/scratch/engine12.mjs)
// with every POSITION-CONDITIONAL rule removed (CENT a-e, OUTLIER, and the extreme-key block ext-stem / ext-far1 /
// ext-noCE / ext-noFD), so a key's rank among the sorted options is not filtered: the build deals it (ranks 1-4 at base
// rate) instead. A BAN-word stem (greatest, least, most, ...) is refused at every rank (rank-agnostic). accept() also
// records `nearMean` (key nearest the mean of the four) for the prereg's base-rate record; it never refuses on it.
// Original header follows.
// b12 candidate engine (OA / Geometry / Statistics). Ports the b11 refusals (CENT, extreme-key, bound-union) and adds
// the b10 screen's free-elimination families as generator refusals, because outside Number Systems math-check's FORM
// is advisory and the b10 screener found tells outside every rule list:
//   FORM-U   every option has the key's surface form (all whole, or all the same number of decimal places, or all
//            fractions) - a lone decimal among whole numbers is a strike ("a count cannot be 81.5") or a tell
//   PAIR-ALL no two options (key or not) are joined by a printed number (difference, sum) or a printed multiplier
//            (a printed number, 1 +/- a printed percent, a printed fraction, a ratio of two printed numbers, n +/- 1,
//            a sum of two printed numbers) - the b10 S-R7 tells (x9/5, x1.8, x0.7) were all non-key pairs too
//   ADJ      no two options differ by one unit of the key's last place (round-up adjacency, MB10-G7-01)
//   CLASS    the key is not alone in its parity, its last digit, or its multiple-of-5 class
//   SUM1     (probability mechanisms) no two options are complements (sum to 1)
//   SUMOPT   the key is not the sum or difference of two other options
//   LEGAL    per-mechanism stem-readable legality (multiple-of, impossible denominators or totals, increment bounds,
//            weighted-mean direction, sign, range): with the declared bounds, the UNION strikes at most one distractor
// plus math-check's own key-pair refusals (LONE, HUB, RUN, PAIR, DPAIR, DSUM, KGAP, KEYPRINT) and the b11 CENT rule.
import { fmt as fmt0, near } from '../math-b6/feas-lib.mjs'
import { extra, KGAP } from '../math-b9/search9.mjs'
export { near }
export const stemNums = p => [...new Set([...String(p).replace(/(\d),(\d{3})/g, '$1$2').matchAll(/\d+(?:\.\d+)?/g)].map(m => Number(m[0])).filter(x => x !== 0))]
export const BAN = /\b(greatest|least|maximum|minimum|largest|smallest|sum of all|possible values?|all values|most|highest|lowest)\b/i
export const STRUCT_RE = /\bfor (every|all|each|any)\b|\bvertex\b|\bmaximum\b|\bminimum\b|\bhighest\b|\blowest\b|\bpeak\b|\btop of\b/i
const STRONG = new Set(['sign_slip', 'inverted_rate', 'wrong_variable', 'wrong_operation', 'wrong_base'])
const WEAK = new Set(['omission', 'partial_answer'])
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a))
export const frac = v => { for (let d = 1; d <= 2000; d++) { const n = Math.round(v * d); if (Math.abs(n / d - v) < 1e-9) { const g = gcd(Math.abs(n), d); return d / g === 1 ? String(n / g) : `${n / g}/${d / g}` } } return null }
export const fmt = v => (Number.isFinite(v) ? fmt0(v) : null)
export const val = s => { let m = String(s).match(/^(-?)(\d+) (\d+)\/(\d+)$/); if (m) return (m[1] ? -1 : 1) * (+m[2] + m[3] / m[4]); m = String(s).match(/^(-?\d+)\/(\d+)$/); if (m) return m[1] / m[2]; return Number(s) }
const formOf = t => { if (/\//.test(t)) return 'frac'; const m = t.match(/^-?\d+(?:\.(\d+))?$/); return m ? 'dec' + (m[1] ?? '').length : 'other' }

function LONE(vs) { const sg = v => v > 0 ? 1 : v < 0 ? -1 : 0, lg = v => Math.log10(Math.abs(v)); for (let i = 0; i < 4; i++) { const v = vs[i], o = vs.filter((_, j) => j !== i); if (sg(v) && o.every(w => sg(w) === -sg(v))) return false; if (v === 0 || o.includes(0)) continue; const ol = o.map(lg), sp = Math.max(...ol) - Math.min(...ol), gap = Math.min(...ol.map(x => Math.abs(x - lg(v)))); if (gap >= Math.log10(2) && gap > 2 * sp) return false } return true }
function HUB(vs) { const L = (a, b) => a && b && [2, 3, 4, 1.5, 10].some(q => near(b / a, q) || near(a / b, q)); for (let i = 0; i < 4; i++) { const d = vs.filter((w, j) => j !== i && L(vs[i], w)).length; if (d >= 2) return false; if (i === 0 && d >= 1) return false } for (let i = 1; i < 4; i++) for (let j = i + 1; j < 4; j++) if (near((vs[i] + vs[j]) / 2, vs[0])) return false; return true }
function RUN(vs) { for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) for (let c = b + 1; c < 4; c++) { if (![a, b, c].includes(0)) continue; const t = [vs[a], vs[b], vs[c]].sort((x, y) => x - y); if (near(t[1] - t[0], t[2] - t[1])) return false; if (t[0] && t[1] && Math.sign(t[0]) === Math.sign(t[2]) && near(t[1] / t[0], t[2] / t[1]) && !near(t[1] / t[0], 1)) return false } return true }
export function printedSets(prompt, extraMult = []) {
  const N = stemNums(prompt), I = N.filter(n => Number.isInteger(n) && n >= 2)
  const pct = [...String(prompt).matchAll(/(\d+(?:\.\d+)?)\s*(%|percent)/g)].map(m => +m[1])
  const frs = [...String(prompt).matchAll(/(\d+)\/(\d+)/g)].map(m => [+m[1], +m[2]])
  const M = new Set(N.filter(x => x !== 1))
  for (const p of pct) { M.add(1 + p / 100); M.add(1 - p / 100); M.add(p / 100) }
  for (const [a, b] of frs) { M.add(a / b); M.add(b / a) }
  const MK = new Set(); for (const x of N) for (const y of N) if (x !== y) MK.add(x / y)
  for (const n of I) { M.add(n - 1); M.add(n + 1) }
  const S = new Set(); for (let i = 0; i < I.length; i++) for (let j = i + 1; j < I.length; j++) S.add(I[i] + I[j])
  for (const n of S) M.add(n)
  for (const x of extraMult) M.add(x)
  M.delete(1); M.delete(0)
  return { N, D: new Set([...N, ...S]), M: [...M].filter(x => x > 0 && Number.isFinite(x)), MK: [...MK].filter(x => x > 0 && x !== 1 && Number.isFinite(x)) }
}
export function cent(vs) { // b11 CENT, vs[0] = key
  const k = vs[0], s = [...vs].sort((a, b) => a - b), R = s[3] - s[0], m = vs.reduce((a, b) => a + b, 0) / 4
  if (!(R > 0)) return 'zero range'
  const d = vs.map(v => Math.abs(v - m))
  if (!(Math.min(...d.slice(1)) < d[0] - 0.03 * R)) return 'CENT-a key nearest the mean'
  const loo = vs.map((v, i) => Math.abs(v - vs.filter((_, j) => j !== i).reduce((a, b) => a + b, 0) / 3))
  if (loo[0] <= Math.min(...loo.slice(1))) return 'CENT-b key nearest the mean of the others'
  const r = s.indexOf(k)
  if (r === 1 || r === 2) {
    if (Math.max(k - s[r - 1], s[r + 1] - k) <= 0.3 * R) return 'CENT-c close on both sides'
    const p = (k - s[0]) / R; if (p >= 0.38 && p <= 0.62) return 'CENT-e key central in the range'
  }
  const dk = vs.slice(1).map(v => Math.abs(v - k)); if (Math.max(...dk) / Math.min(...dk) < 2.5) return 'CENT-d even distances'
  if (r === 0 || r === 3) { const g = [s[1] - s[0], s[2] - s[1], s[3] - s[2]], kg = r === 0 ? g[0] : g[2]; if (kg >= Math.max(...g) - 1e-12) return 'OUTLIER extreme key is the lone outlier' }
  return null
}
export const WHY = {}
const W0 = k => { WHY[k] = (WHY[k] ?? 0) + 1 }, W = W0
const lastDigit = s => s.replace(/[^0-9]/g, '').slice(-1)
// mech: { id, prob, extremeOK, fmt }; g: { prompt, key, errs:[{id,v,expr,kind,sense,mis,why,nat}], legal: v => reason|null, bounds:[{kind,text,strikes}] }
export function accept(mech, g) {
  const F = mech.fmt ?? fmt, out = []
  const ks = F(g.key); if (ks == null) { W('key-fmt'); return out }
  if (BAN.test(g.prompt)) { W('BAN-stem (refused at every rank)'); return out }
  const P = printedSets(g.prompt, g.mult ?? [])
  if (P.N.some(x => near(x, g.key))) { W('keyprint'); return out }
  if (g.errs.some(e => Number.isFinite(e.v) && near(e.v, g.key))) { W('ERR=KEY a natural error lands on the key'); return out }
  if (g.legal && g.legal(g.key)) throw new Error(`${mech.id}: legal() strikes the key ${ks} ${JSON.stringify(g.params)}: ${g.legal(g.key)}`)
  for (const b of g.bounds ?? []) if (b.strikes(g.key)) throw new Error(`${mech.id}: bound ${b.kind} strikes the key ${JSON.stringify(g.params)}`)
  const E2 = g.errs.filter(e => Number.isFinite(e.v) && F(e.v) != null && F(e.v) !== ks && !near(e.v, g.key) && (mech.allowNeg || e.v > 0))
    .filter((e, i, a) => a.findIndex(x => F(x.v) === F(e.v)) === i)
  for (let a = 0; a < E2.length; a++) for (let b = a + 1; b < E2.length; b++) for (let c = b + 1; c < E2.length; c++) {
    const es = [E2[a], E2[b], E2[c]], ch = [ks, ...es.map(e => F(e.v))], vs = ch.map(val)
    const RK = 1 + vs.filter(v => v < vs[0]).length, W = k => W0(k + '@r' + RK); W('triples')
    const fk = formOf(ks), fc = {}; for (const t of ch) fc[formOf(t)] = (fc[formOf(t)] ?? 0) + 1; if ((fc.frac && fc.frac < 4) || Object.values(fc).some(n => n < 2) || Object.keys(fc).some(f => f.startsWith('dec') && +f.slice(3) > 2)) { W('FORM-U'); continue }
    if (!LONE(vs)) { W('LONE'); continue } if (!HUB(vs)) { W('HUB'); continue } if (!RUN(vs)) { W('RUN'); continue }
    if (vs.some(v => P.N.some(x => near(v, x)))) { W('printed-option'); continue }
    let bad = false
    for (let i = 0; i < 4 && !bad; i++) for (let j = i + 1; j < 4 && !bad; j++) {
      const x = vs[i], y = vs[j], d = Math.abs(x - y), s = x + y, r = Math.max(x / y, y / x)
      if ([...P.D].some(n => near(d, n) || near(s, n))) bad = 'PAIR-ALL diff/sum'
      else if (P.M.some(m => near(r, m) || near(1 / r, m))) bad = 'PAIR-ALL multiplier'
      else if ((i === 0 || j === 0) && P.MK.some(m => near(r, m))) bad = 'PAIR key ratio = printed/printed'
      else if (mech.prob && near(s, 1)) bad = 'SUM1 complements'
    }
    if (bad) { W(bad); continue }
    if (!extra(vs, P.N) || !KGAP(vs, P.N)) { W('DPAIR/DSUM/KGAP'); continue }
    for (let i = 1; i < 4 && !bad; i++) for (let j = 1; j < 4 && !bad; j++) if (i !== j && (near(vs[i] + vs[j], vs[0]) || near(vs[i] - vs[j], vs[0]))) bad = true
    if (bad) { W('SUMOPT'); continue }
    // adjacency: one unit of the key's last place
    const unit = mech.prob ? 0 : Object.keys(fc).every(f => f === 'dec0') ? 1 : Math.min(...Object.keys(fc).map(f => 10 ** -(+f.slice(3)))) * 1
    if (!mech.prob) { for (let i = 0; i < 4 && !bad; i++) for (let j = i + 1; j < 4; j++) { const u = Number.isInteger(vs[i]) && Number.isInteger(vs[j]) ? 1 : unit; if (u && Math.abs(vs[i] - vs[j]) <= u * 1.0001) bad = true } if (bad) { W('ADJ'); continue } }
    { // CLOSEPAIR: exactly one close pair (gap < 10% of the range) and it holds the key
      const s = vs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]), R = s[3][0] - s[0][0], cp = []
      for (let i = 0; i < 3; i++) if (s[i + 1][0] - s[i][0] < 0.1 * R) cp.push([s[i][1], s[i + 1][1]])
      if (cp.length === 1 && cp[0].includes(0)) { W('CLOSEPAIR'); continue }
    }
    if (!mech.prob) {
      const cls = [t => lastDigit(t) % 2, t => lastDigit(t), t => { const v = val(t); return Number.isInteger(v) ? (v % 5 === 0 ? 1 : 0) : 0 }]
      for (const f of cls) { const k = f(ch[0]), o = ch.slice(1).map(f); if (o.every(x => x !== k) && new Set(o).size === 1) { bad = true; break } }
      if (bad) { W('CLASS'); continue }
    }
    const kinds = es.map(e => e.kind); if (new Set(kinds).size < 2 || !kinds.some(k => STRONG.has(k)) || kinds.filter(k => WEAK.has(k)).length > 1) { W('kinds'); continue }
    if (new Set(es.map(e => e.mis)).size < 3) { W('mis'); continue }
    const struck = new Map()
    for (let j = 1; j < 4; j++) { const why = g.legal ? g.legal(vs[j]) : null; if (why) struck.set(j, why) }
    for (const b of g.bounds ?? []) { const n = vs.slice(1).filter(b.strikes).length; if (n > 1) bad = true; vs.slice(1).forEach((v, j) => { if (b.strikes(v)) struck.set(j + 1, b.kind + ': ' + b.text) }) }
    if (bad || struck.size > 1) { W('bound/legal'); continue }
    const rank = 1 + vs.filter(v => v < vs[0]).length
    const mean = vs.reduce((a, b) => a + b, 0) / 4, dm = vs.map(v => Math.abs(v - mean)), nearMean = dm[0] <= Math.min(...dm.slice(1))
    W('ACCEPT'); out.push({ rank, nearMean, ch, es, struck: [...struck.entries()].map(([j, w]) => ({ option: ch[j], why: w })) })
  }
  return out
}
export const E = (id, expr, kind, sense, mis, why, nat = null) => { let v; try { v = Function('"use strict";return (' + expr + ')')() } catch { v = NaN } return { id, expr, v, kind, sense, mis, why, nat } }
export const ev = expr => Function('"use strict";return (' + expr + ')')()
// empirical natural side of each error over the mechanism's whole parameter grid: 'above' / 'below' when the error
// lands on that side of the key in at least 65% of the sets where it is defined, else null
export function natMap(mech) {
  const c = {}
  for (const g of mech.gen()) for (const e of g.errs) { if (!Number.isFinite(e.v)) continue; const t = (c[e.id] ??= { a: 0, n: 0 }); t.n++; if (e.v > g.key) t.a++ }
  return Object.fromEntries(Object.entries(c).map(([k, t]) => [k, t.a / t.n >= 0.65 ? 'above' : t.a / t.n <= 0.35 ? 'below' : null]))
}
