// batch 7 feasibility: for each mechanism, search numbers whose NATURAL error set yields 3 distractors passing
// FORM/LONE/HUB/RUN/PAIR (feas-lib) plus DPAIR and DSUM (printed n+-1, sums of two printed ints >= 2). Read-only.
import { check, near } from '../math-b6/feas-lib.mjs'
const ints = p => p.filter(n => Number.isInteger(n) && n >= 2)
function derived(p) { const s = ints(p), d = new Set(); for (const n of s) for (const x of [n - 1, n + 1]) if (x >= 2 && !s.includes(x)) d.add(x); for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) { const x = s[i] + s[j]; if (!s.includes(x)) d.add(x) } return [...d] }
function sums(p) { const s = ints(p), d = new Set(); for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) { const x = s[i] + s[j]; if (!s.includes(x)) d.add(x) } return [...d] }
const val = s => { let m = s.match(/^(-?)(\d+) (\d+)\/(\d+)$/); if (m) return (m[1] ? -1 : 1) * (+m[2] + m[3] / m[4]); m = s.match(/^(-?\d+)\/(\d+)$/); if (m) return m[1] / m[2]; return Number(s) }
function extra(ch, printed) { const vs = ch.map(val), k = vs[0], D = derived(printed), S = sums(printed); for (let i = 1; i < 4; i++) { const v = vs[i]; for (const r of [v ? Math.abs(k / v) : NaN, k ? Math.abs(v / k) : NaN]) if (!near(r, 1) && D.some(x => near(r, x))) return false; if (S.some(x => near(Math.abs(k - v), x))) return false } return true }
export function feasible(key, errs, printed) { return check(key, errs, printed, null, 0).filter(r => extra(r.ch, printed)) }
export function run(name, gen, limit = 6) {
  const byRank = {}
  for (const g of gen()) for (const r of feasible(g.key, g.errs, g.printed)) { byRank[r.rank] ??= []; if (byRank[r.rank].length < limit) byRank[r.rank].push({ params: g.params, options: r.ch, errors: r.names }) }
  console.log(`\n## ${name}: ranks reachable ${Object.keys(byRank).join(',') || 'NONE'}`)
  for (const [rk, xs] of Object.entries(byRank)) for (const x of xs.slice(0, 3)) console.log(`  rank ${rk}  ${JSON.stringify(x)}`)
  return byRank
}
