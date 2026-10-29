// batch 9 feasibility core (copied from math-b8/search8.mjs): for each mechanism, search numbers whose NATURAL error set
// yields 3 distractors passing FORM/LONE/HUB/RUN/PAIR/KEYPRINT (../math-b6/feas-lib.mjs) plus DPAIR and DSUM
// (printed n+-1, sums of two printed ints >= 2), and the batch-9 refusals taken from the batch-8 written items
// (math-b8/ITEMS.md):
//   SIGN  every option shares the key's sign. Applied to EVERY mechanism, because b8 lost E09 and E17 to "the sign
//         rule strikes two distractors" and a 2-2 split is readable whenever the key's sign follows from a count of
//         negatives, a product/quotient sign or a comparison of printed numbers. (LONE already refuses 3-1.)
//   KGAP  the key is not n x (key - option) or (key - option) is not n x the key for a printed whole n >= 2 (b8 E16's
//         first set: key 6/7 = 6 x the 1/7 slip, 6 printed).
//   DIR   for a "least"/"greatest" stem the key is not the extreme option in that direction (b8 E07: rank 1 under
//         "least" lets a student pick the smallest).
//   NEAR  for a "closest to T" stem the key is not the option nearest T, and the key's mirror about T is not an
//         option (b8 E16: the key and its own negative made "pick nearest 0" a coin flip).
//   RANGE (bound screen, range kind) when a parameter set declares `range: [lo, hi]` - an interval the key must lie in
//         that a student can read off the stem without solving (sqrt n lies between a and a + 1; a point on the right
//         side has yb <= y <= yt) - at most ONE distractor may lie outside it (math-check BOUND-SCREEN: a valid bound
//         strikes at most one distractor). b8 FEASIBILITY did not model this and called E09/E17 writable.
// Read-only. run() returns ranks reachable; it never reports a mechanism as feasible when its generator produced no
// parameter sets (it throws instead).
import { check, near } from '../math-b6/feas-lib.mjs'
export const ints = p => p.filter(n => Number.isInteger(n) && n >= 2)
export function derived(p) { const s = ints(p), d = new Set(); for (const n of s) for (const x of [n - 1, n + 1]) if (x >= 2 && !s.includes(x)) d.add(x); for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) { const x = s[i] + s[j]; if (!s.includes(x)) d.add(x) } return [...d] }
export function sums(p) { const s = ints(p), d = new Set(); for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) { const x = s[i] + s[j]; if (!s.includes(x)) d.add(x) } return [...d] }
export const val = s => { let m = s.match(/^(-?)(\d+) (\d+)\/(\d+)$/); if (m) return (m[1] ? -1 : 1) * (+m[2] + m[3] / m[4]); m = s.match(/^(-?\d+)\/(\d+)$/); if (m) return m[1] / m[2]; return Number(s) }
export function extra(vs, printed) { const k = vs[0], D = derived(printed), S = sums(printed); for (let i = 1; i < 4; i++) { const v = vs[i]; for (const r of [v ? Math.abs(k / v) : NaN, k ? Math.abs(v / k) : NaN]) if (!near(r, 1) && D.some(x => near(r, x))) return false; if (S.some(x => near(Math.abs(k - v), x))) return false } return true }
export const SIGN = vs => vs.every(v => Math.sign(v) === Math.sign(vs[0]) && v !== 0)
export function KGAP(vs, printed) { const k = vs[0], P = ints(printed); for (let i = 1; i < 4; i++) { const d = Math.abs(k - vs[i]); if (!d) continue; for (const r of [Math.abs(k) / d, d / Math.abs(k)]) if (P.some(n => near(r, n))) return false } return true }
export function DIR(vs, dir) { if (!dir) return true; const k = vs[0]; if (dir === 'least') return vs.some(v => v < k); if (dir === 'greatest') return vs.some(v => v > k); throw new Error('bad dir ' + dir) }
export function NEAR(vs, t) { if (t == null) return true; const k = vs[0], dk = Math.abs(k - t); if (vs.slice(1).some(v => near(v, 2 * t - k))) return false; return vs.slice(1).some(v => Math.abs(v - t) < dk) }
export function RANGE(vs, range) { if (!range) return true; const [lo, hi] = range, out = v => v < lo - 1e-9 || v > hi + 1e-9; if (out(vs[0])) throw new Error('RANGE: key outside its own declared range ' + JSON.stringify(range)); return vs.slice(1).filter(out).length <= 1 }
export function feasible(key, errs, printed, opt = {}, range = null) { return check(key, errs, printed, null, 0).filter(r => { const vs = r.ch.map(val); return extra(vs, printed) && SIGN(vs) && KGAP(vs, printed) && DIR(vs, opt.dir) && NEAR(vs, opt.target) && RANGE(vs, range) }) }
export function run(name, gen, limit = 6, opt = {}) {
  const byRank = {}; let sets = 0
  for (const g of gen()) { sets++; for (const r of feasible(g.key, g.errs, g.printed, opt, g.range)) { byRank[r.rank] ??= []; if (byRank[r.rank].length < limit) byRank[r.rank].push({ params: g.params, options: r.ch, errors: r.names }) } }
  if (!sets) throw new Error(`${name}: generator produced 0 parameter sets (cannot report a result)`)
  const n = Object.values(byRank).reduce((s, x) => s + x.length, 0)
  console.log(`\n## ${name}: ${sets} parameter sets tried; ranks reachable ${Object.keys(byRank).join(',') || 'NONE'}`)
  for (const [rk, xs] of Object.entries(byRank)) for (const x of xs.slice(0, 2)) console.log(`  rank ${rk}  ${JSON.stringify(x)}`)
  return { sets, byRank, n }
}
