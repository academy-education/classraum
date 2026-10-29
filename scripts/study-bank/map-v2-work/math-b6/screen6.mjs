// screen6.mjs — the batch-6 feasibility search with a SCREEN model.
// For an option set, the screen model counts the options a cold screener can strike for free from facts the stem
// hands over: the answer's sign when a sign rule decides it, bounds readable off the stem (bigger / smaller than a
// printed number or a visible extreme), a multiple-of constraint, the last digit / parity when it is cheap, and a
// rounded estimate (K4). Facts are produced PER MECHANISM from its printed numbers (what a screener sees), never from
// the key. A set passes only if FORM, LONE, HUB, RUN, PAIR pass and the screen strikes at most ONE option.
// `node screen6.mjs --break` runs the break test on batch 5's real option sets; `node screen6.mjs` runs the search.
import { fmt, near, R } from './feas-lib.mjs'
const val = s => { s = String(s).trim(); let m = s.match(/^(-?)(\d+) (\d+)\/(\d+)$/); if (m) return (m[1] ? -1 : 1) * (+m[2] + m[3] / m[4]); m = s.match(/^(-?\d+)\/(\d+)$/); if (m) return m[1] / m[2]; return Number(s) }
const lastClass = d => d === '0' ? 'zero' : d === '5' ? 'five' : '2468'.includes(d) ? 'even' : 'odd'
const formOf = t => { const f = t.match(/^-?(?:(\d+) )?(\d+)\/(\d+)$/); if (f) { const n = +f[2], d = +f[3], g = (a, b) => b ? g(b, a % b) : a; return { kind: 'frac', den: d / g(n, d) } } const m = t.match(/^-?(\d+)(?:\.(\d+))?$/); return m ? { kind: 'dec', places: (m[2] ?? '').length, last: lastClass(t.slice(-1)), digits: t.replace(/[^0-9]/g, '').length } : { kind: 'other' } }
export const FORM = (ch, key) => { const k = formOf(key); for (const c of ch) { if (c === key) continue; const f = formOf(c); if (f.kind !== k.kind) return false; if (k.kind === 'frac' && f.den !== k.den) return false; if (k.kind === 'dec') { if (f.places !== k.places || f.last !== k.last) return false; if (k.digits >= 2 && c.slice(-1) !== key.slice(-1)) return false } } return true }
export const LONE = vs => { const sg = v => v > 0 ? 1 : v < 0 ? -1 : 0, lg = v => Math.log10(Math.abs(v)); for (let i = 0; i < 4; i++) { const v = vs[i], o = vs.filter((_, j) => j !== i); if (sg(v) && o.every(w => sg(w) === -sg(v))) return false; if (v === 0 || o.includes(0)) continue; const ol = o.map(lg), sp = Math.max(...ol) - Math.min(...ol), gap = Math.min(...ol.map(x => Math.abs(x - lg(v)))); if (gap >= Math.log10(2) && gap > 2 * sp) return false } return true }
export const HUB = (vs, k) => { const L = (a, b) => a && b && [2, 3, 4, 1.5, 10].some(q => near(b / a, q) || near(a / b, q)); for (let i = 0; i < 4; i++) { const d = vs.filter((w, j) => j !== i && L(vs[i], w)).length; if (d >= 2) return false; if (i === k && d >= 1) return false } for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (i !== k && j !== k && near((vs[i] + vs[j]) / 2, vs[k])) return false; return true }
export const RUN = (vs, k) => { for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) for (let c = b + 1; c < 4; c++) { if (![a, b, c].includes(k)) continue; const t = [vs[a], vs[b], vs[c]].sort((x, y) => x - y); if (near(t[1] - t[0], t[2] - t[1])) return false; if (t[0] && t[1] && Math.sign(t[0]) === Math.sign(t[2]) && near(t[1] / t[0], t[2] / t[1]) && !near(t[1] / t[0], 1)) return false } return true }
export const PAIR = (vs, k, printed) => { for (let i = 0; i < 4; i++) { if (i === k) continue; for (const r of [Math.abs(vs[k] - vs[i]), Math.abs(vs[k] + vs[i]), vs[i] ? Math.abs(vs[k] / vs[i]) : NaN, vs[k] ? Math.abs(vs[i] / vs[k]) : NaN]) for (const x of printed) if (x !== 1 && near(r, x)) return false } return true }
/** facts: { sign: 1|-1|null, gt, lt, ge, le, multipleOf, lastDigit, allowed (Set of values), estimate: {E, slack} } */
export function strikes(vs, keyIdx, facts) {
  const out = []
  vs.forEach((v, i) => {
    const why = []
    if (facts.sign && Math.sign(v) !== facts.sign && v !== 0) why.push('sign')
    if (facts.gt != null && !(v > facts.gt + 1e-9)) why.push(`not > ${facts.gt}`)
    if (facts.lt != null && !(v < facts.lt - 1e-9)) why.push(`not < ${facts.lt}`)
    if (facts.absLt != null && !(Math.abs(v) < facts.absLt - 1e-9)) why.push(`|x| not < ${facts.absLt}`)
    if (facts.multipleOf && !near(v / facts.multipleOf, Math.round(v / facts.multipleOf))) why.push(`not a multiple of ${facts.multipleOf}`)
    if (facts.allowed && ![...facts.allowed].some(a => near(a, v))) why.push('not an allowed value')
    if (facts.absEq != null && !near(Math.abs(v), facts.absEq) && facts.absEqStrict) why.push(`|x| must be ${facts.absEq}`)
    if (facts.estimate) { const { E, slack } = facts.estimate, dk = Math.abs(vs[keyIdx] - E); if (Math.abs(v - E) > dk + slack) why.push(`far from estimate ${E}`) }
    if (why.length) out.push({ i, v, why })
  })
  return out
}
// ---------------------------------------------------------------- batch-5 facts (what the stem handed over)
const B5 = {
  'MB5-N7-01': { opts: ['-8', '-6', '6', '8'], key: '-8', facts: { sign: -1 } },                       // three negative factors
  'MB5-N7-03': { opts: ['-42', '-8', '8', '288'], key: '8', facts: { sign: 1, absLt: 48 } },             // -48/n negative -> n > 0; |4.5/-0.75| > 1 -> |n| < 48
  'MB5-N6-01': { opts: ['-8.6', '-1.6', '2.6', '12.6'], key: '2.6', facts: { allowed: new Set([4.1, -5.9, 1.1, -2.7].map(x => +(8.5 + x).toFixed(4))) } }, // 8.5 plainly the top |x|
  'MB5-N6-02': { opts: ['-8.9', '-3.9', '3.9', '8.9'], key: '-3.9', facts: { absEq: 3.9, absEqStrict: true } }, // quadrant IV: opposite signs -> |x + y| = |6.4 - 2.5|
  'MB5-N6-03 (first written)': { opts: ['50', '70', '230', '250'], key: '230', facts: { gt: 90 } },     // LCM a multiple of 45, not 45 -> >= 90
  'MB5-N6-03 (revised)': { opts: ['220', '250', '260', '490'], key: '260', facts: { gt: 240 } },        // LCM a multiple of 80, not 80 -> >= 160; read loosely as >= 240 (3 x 80) is NOT free; >= 160 + GCF
  'MB5-N5-01': { opts: ['45', '175', '395', '405'], key: '405', facts: { gt: 135 } },                   // 20 < 60, so n > 135
  'MB5-N7-02': { opts: ['-17.45', '-10.05', '-6.35', '-5.85'], key: '-6.35', facts: { sign: -1, lt: -2.65 } }, // x - (-x) negative -> x negative -> x - 2.65 < -2.65
  'MB5-N8-01': { opts: ['-155', '-95', '95', '155'], key: '-95', facts: {} },                            // x^3 < 0, -6x > 0: sign not decided; no cheap bound
}
const SCREENER = { 'MB5-N7-01': 2, 'MB5-N7-03': 3, 'MB5-N6-01': 2, 'MB5-N6-02': 2, 'MB5-N6-03 (first written)': 2, 'MB5-N6-03 (revised)': 0, 'MB5-N5-01': 0, 'MB5-N7-02': 0, 'MB5-N8-01': 0 }
// (revised N6-03 and N5-01 passed the screen: the model may strike at most one, as the pass rule allows)
if (process.argv.includes('--break')) {
  let ok = true
  for (const [id, x] of Object.entries(B5)) {
    const vs = x.opts.map(val), k = x.opts.indexOf(x.key), s = strikes(vs, k, x.facts).filter(z => z.i !== k)
    const want = SCREENER[id], pass = want >= 2 ? s.length === want : s.length <= 1
    if (!pass) ok = false
    console.log(`${pass ? 'OK  ' : 'FAIL'} ${id.padEnd(26)} screener struck ${want}, model strikes ${s.length}: ${s.map(z => `${z.v} (${z.why.join(', ')})`).join('; ') || '-'}`)
  }
  // revert-test: each fact class removed must make at least one batch-5 failure go quiet
  for (const fact of ['sign', 'absLt', 'allowed', 'absEq', 'gt']) {
    const quiet = Object.entries(B5).filter(([id, x]) => SCREENER[id] >= 2 && fact in x.facts).map(([id, x]) => { const f = { ...x.facts }; delete f[fact]; const vs = x.opts.map(val), k = x.opts.indexOf(x.key); return strikes(vs, k, f).filter(z => z.i !== k).length < SCREENER[id] ? id : null }).filter(Boolean)
    console.log(`  revert ${fact.padEnd(8)}: failures the model no longer reproduces without it -> ${quiet.join(', ') || 'NONE (fact not load-bearing)'}`)
  }
  process.exit(ok ? 0 : 1)
}
export { val }
