// map-v2 Math batch 6 feasibility search with the SCREEN model. Run from this folder: node search6.mjs (search), node screen6.mjs --break (break test on batch 5).
// search6.mjs — batch-6 candidates through FORM, LONE, HUB, RUN, PAIR and the SCREEN model (<= 1 free strike).
import { fmt, near, R } from './feas-lib.mjs'
import { FORM, LONE, HUB, RUN, PAIR, strikes, val } from './screen6.mjs'
let seed = 20261026; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const pick = a => a[Math.floor(rnd() * a.length)]
const out = {}, why = {}
function check(mech, key, errs, printed, facts, ex) {
  const kS = fmt(key); if (kS == null || printed.some(p => near(Math.abs(p), Math.abs(key)))) return
  const E = errs.filter(e => Number.isFinite(e.v) && !near(e.v, key)).filter((e, i, a) => a.findIndex(x => near(x.v, e.v)) === i)
  for (let a = 0; a < E.length; a++) for (let b = a + 1; b < E.length; b++) for (let c = b + 1; c < E.length; c++) {
    const ds = [E[a], E[b], E[c]], ss = ds.map(d => fmt(d.v)); if (ss.some(s => s == null)) continue
    const ch = [kS, ...ss], vs = ch.map(val)
    const fail = !FORM(ch, kS) ? 'FORM' : !LONE(vs) ? 'LONE' : !HUB(vs, 0) ? 'HUB' : !RUN(vs, 0) ? 'RUN' : !PAIR(vs, 0, printed) ? 'PAIR' : null
    const st = fail ? [] : strikes(vs, 0, facts).filter(z => z.i !== 0), keyStruck = fail ? false : strikes(vs, 0, facts).some(z => z.i === 0)
    const f2 = fail ?? (keyStruck ? 'MODEL-ERROR(key struck)' : st.length > 1 ? 'SCREEN' : null)
    why[mech] ??= {}; if (f2) { why[mech][f2] = (why[mech][f2] ?? 0) + 1; continue }
    const rank = 1 + vs.filter(v => v < vs[0]).length
    out[mech] ??= {}; out[mech][rank] ??= { n: 0, ex: null }; out[mech][rank].n++
    out[mech][rank].ex ??= { ...ex, options: ch, errors: ds.map(d => d.name), screenStrikes: st.map(z => `${z.v}: ${z.why.join(', ')}`) }
  }
}
const sum = a => a.reduce((x, y) => x + y, 0), r4 = x => +x.toFixed(4)
const D1 = R(0.1, 9.9, 0.1).flatMap(x => [x, -x]), D2q = R(0.25, 9.75, 0.5).flatMap(x => [x, -x]), D2 = R(0.05, 9.95, 0.1).flatMap(x => [x, -x])
const POOLS = [['tenths', D1], ['hund5', D2], ['quarters', D2q], ['halves', R(0.5, 9.5, 1).flatMap(x => [x, -x])], ['fifths', R(0.2, 9.8, 0.4).flatMap(x => [x, -x])], ['ints', R(1, 19, 1).flatMap(x => [x, -x])], ['fives', R(5, 95, 10).flatMap(x => [x, -x])]]
const distinct = (n, pool) => { const L = []; while (L.length < n) { const x = pick(pool); if (!L.some(y => near(Math.abs(y), Math.abs(x)))) L.push(x) } return L }
// F01 sum of distances from a printed point p to four printed signed numbers
for (const [pn, pool] of [['tenths', D1], ['quarters', D2q]]) for (let t = 0; t < 40000; t++) {
  const xs = distinct(4, pool), p = pick(pool); if (xs.some(x => near(x, p))) continue
  const d = xs.map(x => x - p), key = r4(sum(d.map(Math.abs))), neg = d.filter(z => z < 0)
  const errs = [{ name: 'distances from 0 (sum of |x|)', v: sum(xs.map(Math.abs)) }, { name: 'net: |sum of (x - p)|', v: Math.abs(sum(d)) },
    { name: 'forgot the absolute value on the most negative difference', v: neg.length ? key - 2 * Math.abs(Math.min(...neg)) : NaN },
    { name: 'subtracted |p| from each |x|', v: sum(xs.map(x => Math.abs(x) - Math.abs(p))) }, { name: 'added |p| to each |x|', v: sum(xs.map(x => Math.abs(x) + Math.abs(p))) },
    { name: 'measured from -p (sign of p)', v: sum(xs.map(x => Math.abs(x + p))) }].map(e => ({ ...e, v: r4(e.v) }))
  const all = [...xs, p], E = sum(xs.map(x => Math.abs(Math.round(x) - Math.round(p))))
  check('F01-' + pn, key, errs, [...xs, p].map(Math.abs), { sign: 1, gt: r4(Math.max(...xs) - Math.min(...xs) - 1e-6), estimate: { E, slack: 2 } }, { points: xs, p })
}
// F02 total needed to bring every negative balance to zero (sum of |negatives|), positives present
for (const [pn, pool] of POOLS) for (let t = 0; t < 30000; t++) {
  const xs = distinct(5, pool); const ng = xs.filter(x => x < 0); if (ng.length < 2 || ng.length > 3) continue
  const key = r4(sum(ng.map(Math.abs)))
  const errs = [{ name: 'net: |sum of all balances|', v: Math.abs(sum(xs)) }, { name: 'sum of all sizes', v: sum(xs.map(Math.abs)) }, { name: 'missed the smallest negative', v: key - Math.min(...ng.map(Math.abs)) },
    { name: 'largest debt only', v: Math.max(...ng.map(Math.abs)) }, { name: 'sum of the positives', v: sum(xs.filter(x => x > 0)) }, { name: 'negatives plus the smallest positive', v: key + Math.min(...xs.filter(x => x > 0)) }].map(e => ({ ...e, v: r4(e.v) }))
  check('F02-' + pn, key, errs, xs.map(Math.abs), { sign: 1, gt: Math.max(...ng.map(Math.abs)), estimate: { E: sum(ng.map(x => Math.abs(Math.round(x)))), slack: 1.5 } }, { balances: xs })
}
// F03 sum of the sizes minus the size of the sum
for (const [pn, pool] of POOLS) for (let t = 0; t < 30000; t++) {
  const xs = distinct(5, pool); const S = sum(xs), A = sum(xs.map(Math.abs)), key = r4(A - Math.abs(S)); if (key <= 0) continue
  const pos = sum(xs.filter(x => x > 0)), ngs = sum(xs.filter(x => x < 0).map(Math.abs))
  const errs = [{ name: 'sum of the sizes only', v: A }, { name: 'size of the sum only', v: Math.abs(S) }, { name: 'added instead of subtracted', v: A + Math.abs(S) },
    { name: 'twice the larger side', v: 2 * Math.max(pos, ngs) }, { name: 'the smaller side once (did not double)', v: Math.min(pos, ngs) }, { name: 'sum of sizes minus the signed sum', v: A - S }].map(e => ({ ...e, v: r4(e.v) }))
  check('F03-' + pn, key, errs, xs.map(Math.abs), { sign: 1, estimate: { E: sum(xs.map(x => Math.abs(Math.round(x)))) - Math.abs(sum(xs.map(Math.round))), slack: 2 } }, { list: xs })
}
// F04 distance between a + b and a - b (= 2|b|)
for (const [pn, pool] of POOLS) for (const a of pool) for (const b of pool) { if (near(Math.abs(a), Math.abs(b))) continue
  const key = r4(2 * Math.abs(b))
  const errs = [{ name: 'added the two sizes |a+b| + |a-b|', v: Math.abs(a + b) + Math.abs(a - b) }, { name: 'twice a', v: 2 * Math.abs(a) }, { name: 'difference of the sizes', v: Math.abs(Math.abs(a + b) - Math.abs(a - b)) }, { name: 'the sum only', v: Math.abs(a + b) }, { name: 'the difference only', v: Math.abs(a - b) }].map(e => ({ ...e, v: r4(e.v) }))
  check('F04-' + pn, key, errs, [Math.abs(a), Math.abs(b)], { sign: 1, estimate: { E: 2 * Math.abs(Math.round(b)), slack: 1 } }, { a, b })
}
// F11 total of the sizes of the changes between consecutive readings (4 readings)
for (let t = 0; t < 60000; t++) {
  const r = distinct(4, D2); const dl = [r[1] - r[0], r[2] - r[1], r[3] - r[2]], key = r4(sum(dl.map(Math.abs)))
  const errs = [{ name: 'net change |last - first|', v: Math.abs(r[3] - r[0]) }, { name: 'sum of the sizes of the readings', v: sum(r.map(Math.abs)) }, { name: 'highest minus lowest', v: Math.max(...r) - Math.min(...r) },
    { name: 'left out the last change', v: Math.abs(dl[0]) + Math.abs(dl[1]) }, { name: 'a crossing change taken as a difference of sizes', v: sum(dl.map((z, i) => Math.sign(r[i]) !== Math.sign(r[i + 1]) ? Math.abs(Math.abs(r[i + 1]) - Math.abs(r[i])) : Math.abs(z))) }].map(e => ({ ...e, v: r4(e.v) }))
  check('F11', key, errs, r.map(Math.abs), { sign: 1, gt: r4(Math.max(...r) - Math.min(...r) - 1e-6), estimate: { E: sum(dl.map((_, i) => Math.abs(Math.round(r[i + 1]) - Math.round(r[i])))), slack: 1.5 } }, { readings: r })
}
// F17 sum of the numbers whose absolute value is less than a printed T
for (const [pn, pool] of POOLS) for (let t = 0; t < 30000; t++) {
  const xs = distinct(6, pool), T = pick([2, 2.5, 3, 3.5, 4, 5]); if (xs.some(x => near(Math.abs(x), T))) continue
  const inn = xs.filter(x => Math.abs(x) < T); if (inn.length < 2 || inn.length > 4) continue
  const key = r4(sum(inn))
  const errs = [{ name: 'took x < T (every negative counts)', v: sum(xs.filter(x => x < T)) }, { name: 'added the sizes', v: sum(inn.map(Math.abs)) }, { name: 'took |x| > T', v: sum(xs.filter(x => Math.abs(x) > T)) },
    { name: 'took -T < x only on the positive side (0 < x < T)', v: sum(xs.filter(x => x > 0 && x < T)) }, { name: 'took the negatives with |x| < T only', v: sum(inn.filter(x => x < 0)) }].map(e => ({ ...e, v: r4(e.v) }))
  check('F17-' + pn, key, errs, [...xs.map(Math.abs), T], { estimate: { E: sum(inn.map(Math.round)), slack: 1.5 } }, { list: xs, T })
}
// F20 sum of all the common factors of two numbers
const divs = n => { const o = []; for (let i = 1; i <= n; i++) if (n % i === 0) o.push(i); return o }
for (let A = 12; A <= 99; A++) for (let B = A + 1; B <= 99; B++) { const g = (x, y) => y ? g(y, x % y) : x, G = g(A, B); if (G < 6) continue
  const key = sum(divs(G))
  const errs = [{ name: 'the GCF only', v: G }, { name: 'all factors of the smaller number', v: sum(divs(A)) }, { name: 'common factors except 1', v: key - 1 }, { name: 'common factors except the GCF', v: key - G },
    { name: 'added the common factors of A and B listed twice', v: 2 * key }, { name: 'factors of A + factors of B', v: sum(divs(A)) + sum(divs(B)) }]
  check('F20', key, errs, [A, B], { sign: 1 }, { A, B, G })
}
for (const [m, r] of Object.entries(out)) { console.log(`\n== ${m}`); for (const k of [1, 2, 3, 4]) console.log(`  rank ${k}: ${r[k]?.n ?? 0}` + (r[k] ? `  e.g. ${JSON.stringify(r[k].ex)}` : '')) }
console.log('\nrejections by first failing rule:'); for (const [m, w] of Object.entries(why)) console.log(' ', m, JSON.stringify(w))
for (const m of ['F01-tenths', 'F01-quarters', 'F11', 'F20']) if (!out[m]) console.log(`== ${m}: NO option set passes at any rank`)
