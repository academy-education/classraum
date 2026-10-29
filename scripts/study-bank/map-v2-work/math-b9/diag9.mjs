// diagnosis only: WHICH construction rule refuses a mechanism. FORM/LONE/HUB/RUN/PAIR are a copy of
// ../math-b6/feas-lib.mjs (as in math-b8/diag8.mjs); DPAIR/DSUM/SIGN/KGAP/DIR/NEAR/RANGE are imported from search9.mjs.
// Verdicts are never taken from here: for every parameter set the copy's all-pass result is compared with
// search9.feasible(), and any disagreement exits 2.
import { fmt, near } from '../math-b6/feas-lib.mjs'
import { feasible, extra, SIGN, KGAP, DIR, NEAR, RANGE, val } from './search9.mjs'
const lastClass = d => d === '0' ? 'zero' : d === '5' ? 'five' : '2468'.includes(d) ? 'even' : 'odd'
const formOf = t => { const f = t.match(/^-?(?:(\d+) )?(\d+)\/(\d+)$/); if (f) { const n = +f[2], d = +f[3], g = (a, b) => b ? g(b, a % b) : a; return { kind: 'frac', den: d / g(n, d) } } const m = t.match(/^-?(\d+)(?:\.(\d+))?$/); return m ? { kind: 'dec', places: (m[2] ?? '').length, last: lastClass(t.slice(-1)), digits: t.replace(/[^0-9]/g, '').length } : { kind: 'other' } }
const FORM1 = (c, key) => { const k = formOf(key), f = formOf(c); if (f.kind !== k.kind) return false; if (k.kind === 'frac' && f.den !== k.den) return false; if (k.kind === 'dec') { if (f.places !== k.places || f.last !== k.last) return false; if (k.digits >= 2 && c.slice(-1) !== key.slice(-1)) return false } return true }
const LONE = vs => { const sg = v => v > 0 ? 1 : v < 0 ? -1 : 0, lg = v => Math.log10(Math.abs(v)); for (let i = 0; i < 4; i++) { const v = vs[i], o = vs.filter((_, j) => j !== i); if (sg(v) && o.every(w => sg(w) === -sg(v))) return false; if (v === 0 || o.includes(0)) continue; const ol = o.map(lg), sp = Math.max(...ol) - Math.min(...ol), gap = Math.min(...ol.map(x => Math.abs(x - lg(v)))); if (gap >= Math.log10(2) && gap > 2 * sp) return false } return true }
const HUB = (vs, k) => { const L = (a, b) => a && b && [2, 3, 4, 1.5, 10].some(q => near(b / a, q) || near(a / b, q)); for (let i = 0; i < 4; i++) { const d = vs.filter((w, j) => j !== i && L(vs[i], w)).length; if (d >= 2) return false; if (i === k && d >= 1) return false } for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (i !== k && j !== k && near((vs[i] + vs[j]) / 2, vs[k])) return false; return true }
const RUN = (vs, k) => { for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) for (let c = b + 1; c < 4; c++) { if (![a, b, c].includes(k)) continue; const t = [vs[a], vs[b], vs[c]].sort((x, y) => x - y); if (near(t[1] - t[0], t[2] - t[1])) return false; if (t[0] && t[1] && Math.sign(t[0]) === Math.sign(t[2]) && near(t[1] / t[0], t[2] / t[1]) && !near(t[1] / t[0], 1)) return false } return true }
const PAIR = (vs, k, printed) => { for (let i = 0; i < 4; i++) { if (i === k) continue; for (const r of [Math.abs(vs[k] - vs[i]), Math.abs(vs[k] + vs[i]), vs[i] ? Math.abs(vs[k] / vs[i]) : NaN, vs[k] ? Math.abs(vs[i] / vs[k]) : NaN]) for (const x of printed) if (x !== 1 && near(r, x)) return false } return true }
export function diagRun(name, gen, limit, opt = {}) {
  const tally = {}, bump = r => tally[r] = (tally[r] ?? 0) + 1; let sets = 0, maxForm = 0, pass = 0
  for (const g of gen()) {
    sets++; const kS = fmt(g.key); if (kS == null) { bump('key not writable in 3 dp or as a fraction'); continue } if (g.printed.some(p => near(p, g.key))) { bump('KEYPRINT'); continue }
    const E2 = g.errs.filter(e => Number.isFinite(e.v) && !near(e.v, g.key)).filter((e, i, a) => a.findIndex(x => near(x.v, e.v)) === i)
    const sameForm = E2.filter(e => { const s = fmt(e.v); return s != null && FORM1(s, kS) })
    maxForm = Math.max(maxForm, sameForm.length)
    let ok = 0
    if (sameForm.length < 3) bump('FORM (fewer than 3 natural errors share the key\'s form)')
    else for (let a = 0; a < sameForm.length; a++) for (let b = a + 1; b < sameForm.length; b++) for (let c = b + 1; c < sameForm.length; c++) {
      const ch = [kS, ...[sameForm[a], sameForm[b], sameForm[c]].map(e => fmt(e.v))], vs = ch.map(val)
      const why = !LONE(vs) ? 'LONE' : !HUB(vs, 0) ? 'HUB' : !RUN(vs, 0) ? 'RUN' : !PAIR(vs, 0, g.printed) ? 'PAIR' : !extra(vs, g.printed) ? 'DPAIR/DSUM' : !SIGN(vs) ? 'SIGN' : !KGAP(vs, g.printed) ? 'KGAP' : !DIR(vs, opt.dir) ? 'DIR' : !NEAR(vs, opt.target) ? 'NEAR' : !RANGE(vs, g.range) ? 'RANGE (bound strikes 2)' : null
      if (why) bump(why); else ok++
    }
    const real = feasible(g.key, g.errs, g.printed, opt, g.range).length
    if ((ok > 0) !== (real > 0)) { console.error(`${name}: diag disagrees with search9 on ${JSON.stringify(g.params)} (diag ${ok}, search9 ${real})`); process.exit(2) }
    pass += ok
  }
  if (!sets) { console.error(`${name}: 0 parameter sets`); process.exit(2) }
  console.log(`${name}\n   sets ${sets}; most same-form natural errors in one set: ${maxForm}; passing triples ${pass}; refusals: ${Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', ')}`)
  return { sets, byRank: {}, n: 0 }
}
