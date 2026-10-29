// batch 9 feasibility generators, one per probe-surviving candidate, in the gen8 style: each lists its NATURAL error set
// in code and searches parameters for a key + 3 errors that pass FORM/LONE/HUB/RUN/PAIR/KEYPRINT/DPAIR/DSUM plus the
// batch-9 SIGN/KGAP/DIR/NEAR refusals (search9.mjs -> ../math-b6/feas-lib.mjs). Read-only.
// Usage: node gen9.mjs <Sxx> | --all (writes feas-out.json) | --diag [ids]
import { run as run0 } from './search9.mjs'
import { diagRun } from './diag9.mjs'
import { writeFileSync } from 'node:fs'
let run = run0
const g = (a, b) => b ? g(b, a % b) : a
const r2 = x => Math.round(x * 1e6) / 1e6
const rng = seed => () => (seed = (seed * 1103515245 + 12345) % 2147483648)
const G = {}

// S02: g/h girls, p/q of girls and r/s of boys walk; fraction of the class that walks
G.S02 = () => run('S02 fraction of a class that walks (different fractions of girls and boys)', function* () {
  const F = []; for (let d = 2; d <= 8; d++) for (let n = 1; n < d; n++) if (g(n, d) === 1) F.push([n, d])
  for (const [gn, gd] of F) for (const [pn, pd] of F) for (const [rn, rd] of F) {
    if (pn * rd === rn * pd) continue
    const G0 = gn / gd, P = pn / pd, Rr = rn / rd, key = G0 * P + (1 - G0) * Rr
    const errs = [{ name: 'uses r/s of the whole class for the boys', v: G0 * P + Rr }, { name: 'uses the girls fraction for the boys too', v: G0 * P + G0 * Rr },
      { name: 'fraction that does NOT walk', v: 1 - key }, { name: 'swaps the two walking fractions', v: G0 * Rr + (1 - G0) * P },
      { name: 'averages the two walking fractions', v: (P + Rr) / 2 }, { name: 'girls who walk only', v: G0 * P }, { name: 'boys who walk only', v: (1 - G0) * Rr }]
    yield { params: { girls: `${gn}/${gd}`, girlsWalk: `${pn}/${pd}`, boysWalk: `${rn}/${rd}` }, key, errs, printed: [gn, gd, pn, pd, rn, rd], range: [Math.min(P, Rr), Math.max(P, Rr)] }
  }
}, 4)

// S03: round each of four prices to the nearest dollar before adding; rounded total minus exact total
G.S03 = () => run('S03 rounded-first total minus exact total (nearest dollar, four prices)', function* () {
  const nx = rng(12345)
  for (let i = 0; i < 40000; i++) {
    const ps = Array.from({ length: 4 }, () => (1 + nx() % 9) + (1 + nx() % 98) / 100).map(r2)
    if (ps.some(p => Math.abs(p % 1 - 0.5) < 1e-9)) continue
    const e = ps.map(p => r2(Math.round(p) - p)), key = r2(e.reduce((s, x) => s + x, 0)); if (key <= 0) continue
    if (!e.some(x => x < 0) || !e.some(x => x > 0)) continue
    const S = r2(ps.reduce((s, x) => s + x, 0))
    const errs = [{ name: 'adds the sizes of the rounding changes', v: r2(e.reduce((s, x) => s + Math.abs(x), 0)) }, { name: 'rounds the exact total once', v: r2(Math.round(S) - S) },
      { name: 'counts only the prices rounded up', v: r2(e.filter(x => x > 0).reduce((s, x) => s + x, 0)) }, { name: 'counts only the prices rounded down (as sizes)', v: r2(-e.filter(x => x < 0).reduce((s, x) => s + x, 0)) },
      { name: 'rounds every price UP to the next dollar', v: r2(ps.reduce((s, p) => s + Math.ceil(p) - p, 0)) }]
    yield { params: { prices: ps }, key, errs, printed: ps }
  }
}, 4)

// S04: number pyramid, bottom a, x, b; top T = a + 2x + b; the missing middle brick
G.S04 = () => run('S04 pyramid: missing middle bottom brick', function* () {
  for (let a10 = 11; a10 <= 60; a10 += 3) for (let b100 = 105; b100 <= 690; b100 += 17) for (let x100 = 105; x100 <= 690; x100 += 13) {
    const a = a10 / 10, b = b100 / 100, x = x100 / 100, T = r2(a + 2 * x + b)
    const errs = [{ name: 'does not halve (top minus the two outer bricks)', v: r2(T - a - b) }, { name: 'halves the top only, then subtracts both outer bricks', v: r2(T / 2 - a - b) },
      { name: 'halves after removing one outer brick only', v: r2((T - a) / 2 - b) }, { name: 'divides by 3 (counts the middle three times)', v: r2((T - a - b) / 3) }]
    yield { params: { a, b, top: T }, key: x, errs, printed: [a, b, T] }
  }
}, 4)

// S39: four-brick pyramid, top = a + 3b + 3c + d
G.S39 = () => run('S39 pyramid: top brick from four bottom bricks', function* () {
  for (let a100 = 105; a100 <= 495; a100 += 11) for (let d100 = 105; d100 <= 495; d100 += 19) for (let b10 = 11; b10 <= 49; b10 += 2) for (let c10 = 11; c10 <= 49; c10 += 3) {
    const a = a100 / 100, d = d100 / 100, b = b10 / 10, c = c10 / 10, key = r2(a + 3 * b + 3 * c + d)
    const errs = [{ name: 'adds the bottom row once', v: r2(a + b + c + d) }, { name: 'stops at the second row and adds it (inner bricks twice)', v: r2(a + 2 * b + 2 * c + d) },
      { name: 'one inner brick counted twice instead of three times (left)', v: r2(a + 2 * b + 3 * c + d) }, { name: 'one inner brick counted twice instead of three times (right)', v: r2(a + 3 * b + 2 * c + d) },
      { name: 'adds the ends of the third row only once each and drops the middle', v: r2(a + 2 * b + c + (b + 2 * c + d) - (b + c)) }]
    yield { params: { bottom: [a, b, c, d] }, key, errs, printed: [a, b, c, d] }
  }
}, 4)

// S07: exact product of two one-place decimals vs product of the nearest whole numbers
G.S07 = () => run('S07 exact product vs rounded-factor product: difference', function* () {
  for (let a10 = 11; a10 <= 99; a10++) for (let c10 = 11; c10 <= 99; c10++) {
    if (a10 % 10 === 0 || c10 % 10 === 0 || a10 % 10 === 5 || c10 % 10 === 5 || c10 <= a10) continue
    const a = a10 / 10, c = c10 / 10, E = r2(a * c), Rr = Math.round(a) * Math.round(c), key = r2(Math.abs(E - Rr))
    const errs = [{ name: 'truncates both factors', v: r2(Math.abs(E - Math.floor(a) * Math.floor(c))) }, { name: 'rounds both factors up', v: r2(Math.abs(E - Math.ceil(a) * Math.ceil(c))) },
      { name: 'rounds only the first factor', v: r2(Math.abs(E - Math.round(a) * c)) }, { name: 'rounds only the second factor', v: r2(Math.abs(E - a * Math.round(c))) },
      { name: 'adds the two rounding changes', v: r2(Math.abs(Math.round(a) - a) + Math.abs(Math.round(c) - c)) }]
    yield { params: { a, c, exact: E, estimate: Rr }, key, errs, printed: [a, c] }
  }
}, 4)

// S08: price rounded to the nearest tenth before buying n; rounded total minus exact total
G.S08 = () => run('S08 rounding one price to the nearest tenth, n items: rounded total minus exact', function* () {
  for (let p100 = 101; p100 <= 999; p100++) for (let n = 5; n <= 19; n++) {
    if ([0, 5].includes(p100 % 10) || n === 10) continue
    const p = p100 / 100, rp = Math.round(p * 10) / 10, e = r2(rp - p); if (e <= 0) continue
    const key = r2(e * n)
    const errs = [{ name: 'forgets to multiply by n', v: e }, { name: 'rounds the exact total once', v: r2(Math.abs(Math.round(n * p * 10) / 10 - n * p)) },
      { name: 'uses the distance to the other tenth', v: r2((0.1 - e) * n) }, { name: 'rounds to the nearest dollar instead', v: r2(Math.abs(Math.round(p) - p) * n) }]
    yield { params: { price: p, items: n }, key, errs, printed: [p, n], range: [0, 0.05 * n] }
  }
}, 4)

// S09: broken ruler, two objects
G.S09 = () => run('S09 broken ruler: total length of two objects', function* () {
  for (const L1 of [1.2, 2.4, 3.6, 1.8, 2.5, 3.3]) for (const L2 of [1.1, 2.7, 3.4, 4.2, 2.9]) for (let R1h = 450; R1h <= 990; R1h += 23) for (let R2h = 520; R2h <= 1190; R2h += 31) {
    const R1 = R1h / 100, R2 = R2h / 100, key = r2(R1 - L1 + R2 - L2)
    const errs = [{ name: 'reads the right marks only', v: r2(R1 + R2) }, { name: 'corrects the first object only', v: r2(R1 - L1 + R2) }, { name: 'corrects the second object only', v: r2(R1 + R2 - L2) },
      { name: 'subtracts one start mark from the total', v: r2(R1 + R2 - L1) }, { name: 'subtracts the start marks from each other', v: r2(R1 + R2 - Math.abs(L1 - L2)) }]
    yield { params: { first: [L1, R1], second: [L2, R2] }, key, errs, printed: [L1, R1, L2, R2] }
  }
}, 4)

// S10: strips a wide and b tall in a unit square: area shaded by exactly one strip
G.S10 = () => run('S10 two strips in a unit square: shaded by exactly one', function* () {
  const F = []; for (let d = 2; d <= 9; d++) for (let n = 1; n < d; n++) if (g(n, d) === 1) F.push([n, d])
  for (const [an, ad] of F) for (const [bn, bd] of F) {
    const a = an / ad, b = bn / bd, key = a + b - 2 * a * b; if (key <= 0) continue
    const errs = [{ name: 'shaded at least once (removes the overlap once)', v: a + b - a * b }, { name: 'shaded by both (the overlap)', v: a * b },
      { name: 'not shaded', v: 1 - a - b + a * b }, { name: 'adds the strips (no overlap removed)', v: a + b }]
    yield { params: { a: `${an}/${ad}`, b: `${bn}/${bd}` }, key, errs, printed: [an, ad, bn, bd] }
  }
}, 4)

// S13 / S41: least total distance to three houses (median); S13 decimals, S41 twelfths
function median3(den) {
  return function* () {
    const vals = []; if (den) { for (let n = -70; n <= 70; n++) if (n % den && g(Math.abs(n), den) === 1) vals.push(n / den) } else { for (let n = -95; n <= 95; n++) if (n % 10) vals.push(n / 10); for (let n = -950; n <= 950; n += 25) if (n % 100) vals.push(n / 100); for (let n = -45; n <= 45; n += 2) vals.push(n / 8) }
    const neg = vals.filter(v => v < 0), pos = vals.filter(v => v > 0); let c = 0
    for (const x1 of neg) for (const x2 of vals) for (const x3 of pos) {
      if (!(x1 < x2 && x2 < x3) || ++c % (den ? 3 : 11)) continue
      const key = x3 - x1, A = [x1, x2, x3]
      const tot = p => A.reduce((s, x) => s + Math.abs(x - p), 0)
      const errs = [{ name: 'total distance from 0', v: tot(0) }, { name: 'total distance from the leftmost house', v: tot(x1) }, { name: 'total distance from the rightmost house', v: tot(x3) },
        { name: 'total distance from the mean', v: tot((x1 + x2 + x3) / 3) }, { name: 'subtracts sizes across 0 (|x3| - |x1|)', v: Math.abs(Math.abs(x3) - Math.abs(x1)) }]
      yield { params: { houses: A.map(r2) }, key, errs, printed: A.map(Math.abs) }
    }
  }
}
G.S13 = () => run('S13 least total distance to three signed houses (decimals)', median3(0), 4, { dir: 'least' })
G.S41 = () => run('S41 least total distance, meeting at a house (twelfths)', median3(12), 4, { dir: 'least' })

// S14: least total distance to four signed points (mixed numbers in eighths)
G.S14 = () => run('S14 least total distance to four signed points', function* () {
  const vals = []; for (let n = -45; n <= 45; n++) if (n % 2) vals.push(n / 8)
  let c = 0
  for (const x1 of vals) for (const x2 of vals) for (const x3 of vals) for (const x4 of vals) {
    if (!(x1 < x2 && x2 < x3 && x3 < x4) || x1 >= 0 || x4 <= 0 || ++c % 97) continue
    const A = [x1, x2, x3, x4], tot = p => A.reduce((s, x) => s + Math.abs(x - p), 0), key = (x4 - x1) + (x3 - x2)
    const errs = [{ name: 'total distance from 0', v: tot(0) }, { name: 'outer span only (the three-point habit)', v: x4 - x1 }, { name: 'total from the leftmost point', v: tot(x1) },
      { name: 'total from the rightmost point', v: tot(x4) }, { name: 'total from the mean', v: tot((x1 + x2 + x3 + x4) / 4) }]
    yield { params: { points: A.map(v => Math.round(v * 8) + '/8') }, key, errs, printed: A.map(Math.abs) }
  }
}, 4, { dir: 'least' })

// S22: two houses, k1 and k2 deliveries; least weighted total
G.S22 = () => run('S22 weighted two-house total, least', function* () {
  for (let x1 = -95; x1 <= -5; x1 += 3) for (let x2 = 5; x2 <= 95; x2 += 4) for (let k1 = 2; k1 <= 7; k1++) for (let k2 = 2; k2 <= 7; k2++) {
    if (k1 === k2) continue
    const D = (x2 - x1) / 10, key = Math.min(k1, k2) * D
    const errs = [{ name: 'store at the house with fewer deliveries', v: Math.max(k1, k2) * D }, { name: 'store at the midpoint', v: (k1 + k2) * D / 2 },
      { name: 'store at 0', v: (k1 * Math.abs(x1) + k2 * Math.abs(x2)) / 10 }, { name: 'one trip each way (ignores the counts)', v: D }]
    yield { params: { houses: [x1 / 10, x2 / 10], deliveries: [k1, k2] }, key, errs, printed: [Math.abs(x1) / 10, x2 / 10, k1, k2] }
  }
}, 4, { dir: 'least' })

// S23: given point P: how much longer than the least total
G.S23 = () => run('S23 excess of a chosen meeting point over the least total', function* () {
  const vals = []; for (let n = -95; n <= 95; n++) if (n % 10) vals.push(n / 10)
  let c = 0
  for (const x1 of vals) for (const x2 of vals) for (const x3 of vals) for (const P of [-0.25, 0.75, 1.25, -1.75, 2.25, -2.75, 3.75]) {
    if (!(x1 < x2 && x2 < x3) || x1 >= 0 || x3 <= 0 || P <= x1 || P >= x3 || Math.abs(P - x2) < 1e-9 || ++c % 41) continue
    const A = [x1, x2, x3], tot = p => A.reduce((s, x) => s + Math.abs(x - p), 0), key = r2(tot(P) - tot(x2))
    const errs = [{ name: 'total from P', v: r2(tot(P)) }, { name: 'least total', v: r2(tot(x2)) }, { name: 'total from P minus total from 0', v: r2(Math.abs(tot(P) - tot(0))) },
      { name: 'distance from P to 0', v: Math.abs(P) }, { name: 'total from P minus the outer span counted twice', v: r2(Math.abs(tot(P) - 2 * (x3 - x1))) }]
    yield { params: { houses: A, P }, key, errs, printed: [...A.map(Math.abs), Math.abs(P)] }
  }
}, 4)

// S15: lowest running balance (positive decimals); transactions have no hundredths
G.S15 = () => run('S15 lowest running balance during the week', function* () {
  const nx = rng(777)
  for (let i = 0; i < 60000; i++) {
    const B0 = r2(20 + nx() % 40 + (1 + nx() % 98) / 100)
    const t = Array.from({ length: 5 }, (_, k) => (k % 2 ? 1 : -1) * ((4 + nx() % 18) + (nx() % 10) / 10)).map(r2)
    const run_ = []; let b = B0; for (const x of t) { b = r2(b + x); run_.push(b) }
    if (run_.some(x => x <= 0)) continue
    const key = Math.min(...run_); const idx = run_.indexOf(key); if (idx === 4 || run_.filter(x => x === key).length > 1) continue
    const sorted = [...run_].sort((a, b) => a - b), W = t.filter(x => x < 0)
    const errs = [{ name: 'final balance', v: run_[4] }, { name: 'start minus all the withdrawals', v: r2(B0 + W.reduce((s, x) => s + x, 0)) }, { name: 'start minus the largest withdrawal', v: r2(B0 + Math.min(...W)) },
      { name: 'second-lowest balance', v: sorted[1] }, { name: 'start minus the withdrawals up to the lowest point (ignores deposits)', v: r2(B0 + t.slice(0, idx + 1).filter(x => x < 0).reduce((s, x) => s + x, 0)) }]
    yield { params: { start: B0, transactions: t }, key, errs, printed: [B0, ...t.map(Math.abs)], range: [r2(B0 + W.reduce((s, x) => s + x, 0)), run_[4]] }
  }
}, 4, { dir: 'least' })

// S21: highest elevation reached (signed decimals)
G.S21 = () => run('S21 highest running elevation (signed)', function* () {
  const nx = rng(4242)
  for (let i = 0; i < 60000; i++) {
    const E0 = r2(-(10 + nx() % 40) - (1 + nx() % 98) / 100)
    const t = Array.from({ length: 5 }, (_, k) => (k % 2 ? -1 : 1) * ((3 + nx() % 15) + (nx() % 10) / 10)).map(r2)
    const run_ = []; let b = E0; for (const x of t) { b = r2(b + x); run_.push(b) }
    const key = Math.max(...run_); const idx = run_.indexOf(key); if (idx === 4 || run_.filter(x => x === key).length > 1) continue
    const sorted = [...run_].sort((a, b) => b - a), C = t.filter(x => x > 0)
    const errs = [{ name: 'final elevation', v: run_[4] }, { name: 'start plus all the climbs', v: r2(E0 + C.reduce((s, x) => s + x, 0)) }, { name: 'start plus the largest climb', v: r2(E0 + Math.max(...C)) },
      { name: 'second-highest elevation', v: sorted[1] }, { name: 'start plus the climbs up to the highest point (ignores descents)', v: r2(E0 + t.slice(0, idx + 1).filter(x => x > 0).reduce((s, x) => s + x, 0)) }]
    yield { params: { start: E0, changes: t }, key, errs, printed: [Math.abs(E0), ...t.map(Math.abs)], range: [run_[4], r2(E0 + C.reduce((s, x) => s + x, 0))] }
  }
}, 4, { dir: 'greatest' })

// S16: clockwise walk around a rectangle from the top-left vertex: y after d units
G.S16 = () => run('S16 perimeter walk: y-coordinate after d units', function* () {
  for (const xl of [-3.25, -4.75, -2.25, -5.25, -1.75]) for (const xr of [2.25, 3.75, 4.25, 1.75, 5.75]) for (let yt10 = 15; yt10 <= 65; yt10 += 5) for (let yb10 = -65; yb10 <= -15; yb10 += 5) for (let d100 = 105; d100 <= 2095; d100 += 10) {
    const yt = yt10 / 10, yb = yb10 / 10, W = xr - xl, H = yt - yb, d = d100 / 100; if (!(d > W + 0.05 && d < W + H - 0.05)) continue
    const key = r2(yt - (d - W))
    const errs = [{ name: 'ignores the corner (goes straight down d)', v: r2(yt - d) }, { name: 'top side as |xr| - |xl| (sizes subtracted across 0)', v: r2(yt - (d - Math.abs(Math.abs(xr) - Math.abs(xl)))) },
      { name: 'reports the distance walked down the side', v: r2(d - W) }, { name: 'goes up instead of down after the corner', v: r2(yt + (d - W)) }, { name: 'walks counterclockwise (down the left side first)', v: d <= H ? r2(yt - d) : NaN }]
    yield { params: { xl, xr, yt, yb, d }, key, errs, printed: [Math.abs(xl), xr, yt, Math.abs(yb), d], range: [yb, yt] }
  }
}, 4)

// S18: flips the dividend instead of the divisor: difference from the correct quotient
G.S18 = () => run('S18 flip-the-dividend error: difference from the correct quotient', function* () {
  for (let w = 1; w <= 4; w++) for (let an = 1; an <= 7; an++) for (let ad = 2; ad <= 8; ad++) for (let fn = 1; fn <= 7; fn++) for (let fd = 2; fd <= 9; fd++) {
    if (an >= ad || g(an, ad) !== 1 || fn >= fd || g(fn, fd) !== 1) continue
    const A = w + an / ad, f = fn / fd, C = A / f, H = f / A, key = C - H
    const errs = [{ name: 'the correct quotient', v: C }, { name: 'her value', v: H }, { name: 'adds the two values', v: C + H },
      { name: 'correct quotient minus the reciprocal of the divisor', v: C - fd / fn }]
    yield { params: { A: `${w} ${an}/${ad}`, f: `${fn}/${fd}` }, key, errs, printed: [w, an, ad, fn, fd] }
  }
}, 4)

// S20: q = a/b ÷ c/d, then q - 1/q
G.S20 = () => run('S20 quotient minus its reciprocal', function* () {
  for (let an = 1; an <= 9; an++) for (let ad = 2; ad <= 9; ad++) for (let cn = 1; cn <= 9; cn++) for (let cd = 2; cd <= 9; cd++) {
    if (g(an, ad) !== 1 || g(cn, cd) !== 1) continue
    const q = (an / ad) / (cn / cd); if (q <= 1 || q > 6) continue
    const P = (an / ad) * (cn / cd), key = q - 1 / q
    const errs = [{ name: 'adds the reciprocal', v: q + 1 / q }, { name: 'multiplies the fractions instead of dividing, then subtracts the reciprocal', v: Math.abs(P - 1 / P) },
      { name: 'subtracts the first fraction', v: q - an / ad }, { name: 'squares q and subtracts 1', v: q * q - 1 }, { name: 'gives q', v: q }]
    yield { params: { a: `${an}/${ad}`, b: `${cn}/${cd}` }, key, errs, printed: [an, ad, cn, cd] }
  }
}, 4)

// S24: recipe for m dozen uses c cups; cups for n dozen
G.S24 = () => run('S24 recipe scaled through cups per dozen', function* () {
  const M = []; for (let w = 1; w <= 3; w++) for (const [n, d] of [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4]]) M.push(w + n / d)
  for (const m of M) for (const c of M) for (let n = 2; n <= 5; n++) {
    const key = c / m * n
    const errs = [{ name: 'cups per dozen only', v: c / m }, { name: 'multiplies c by m, then divides by n', v: c * m / n }, { name: 'adds the change in dozens to c', v: c + (n - m) },
      { name: 'divides m by c, then multiplies by n', v: m / c * n }, { name: 'divides c by n, then multiplies by m', v: c / n * m }]
    yield { params: { m, c, n }, key, errs, printed: [m, c, n] }
  }
}, 4)

// S25: sqrt interpolation between consecutive squares
G.S25 = () => run('S25 square-root estimate by interpolation between consecutive squares', function* () {
  for (let a = 2; a <= 14; a++) for (let r = 1; r <= 2 * a; r++) {
    const n = a * a + r, gap = 2 * a + 1, key = a + r / gap
    const errs = [{ name: 'uses the distance to the upper square', v: a + (gap - r) / gap }, { name: 'adds the fraction to the upper root', v: a + 1 + r / gap },
      { name: 'counts back from the upper root by the lower fraction', v: a + 1 - r / gap }, { name: 'forgets the whole part', v: r / gap }, { name: 'both slips: upper distance added to the upper root', v: a + 1 + (gap - r) / gap },
      { name: 'divides by the lower square', v: a + r / (a * a) }, { name: 'divides by 2a', v: a + r / (2 * a) }]
    yield { params: { n, a }, key, errs, printed: [n], range: [a, a + 1] }
  }
}, 4)

// S26: cube-root interpolation between consecutive cubes
G.S26 = () => run('S26 cube-root estimate by interpolation between consecutive cubes', function* () {
  for (let a = 1; a <= 6; a++) { const gap = 3 * a * a + 3 * a + 1; for (let r = 1; r < gap; r++) {
    const n = a ** 3 + r, key = a + r / gap
    const errs = [{ name: 'uses the distance to the upper cube', v: a + (gap - r) / gap }, { name: 'adds the fraction to the upper root', v: a + 1 + r / gap },
      { name: 'counts back from the upper root by the lower fraction', v: a + 1 - r / gap }, { name: 'forgets the whole part', v: r / gap }, { name: 'both slips: upper distance added to the upper root', v: a + 1 + (gap - r) / gap },
      { name: 'divides by the lower cube', v: a + r / a ** 3 }, { name: 'uses the square gap 2a + 1', v: a + r / (2 * a + 1) }]
    yield { params: { n, a }, key, errs, printed: [n], range: [a, a + 1] }
  } }
}, 4)

// S38: interpolation estimate vs halfway estimate
G.S38 = () => run('S38 interpolation estimate vs halfway estimate: difference', function* () {
  for (let a = 2; a <= 14; a++) for (let r = 1; r <= 2 * a; r++) {
    const gap = 2 * a + 1, key = Math.abs(r / gap - 1 / 2)
    const errs = [{ name: 'gives the interpolation fraction', v: r / gap }, { name: 'difference of the two distances over the gap', v: Math.abs(gap - 2 * r) / gap },
      { name: 'uses the gap 2a', v: Math.abs(r / (2 * a) - 1 / 2) }]
    yield { params: { n: a * a + r, a }, key, errs, printed: [a * a + r] }
  }
}, 4)

// S42: sqrt interpolation of a mixed number a^2 + r/s
G.S42 = () => run('S42 interpolation estimate of the square root of a mixed number', function* () {
  for (let a = 2; a <= 9; a++) for (let w = 0; w < 2 * a + 1; w++) for (let s = 2; s <= 9; s++) for (let rn = 1; rn < s; rn++) {
    if (g(rn, s) !== 1) continue
    const R = w + rn / s, gap = 2 * a + 1, key = a + R / gap
    const errs = [{ name: 'uses the distance to the upper square', v: a + (gap - R) / gap }, { name: 'adds the fraction to the upper root', v: a + 1 + R / gap },
      { name: 'counts back from the upper root', v: a + 1 - R / gap }, { name: 'both slips: upper distance added to the upper root', v: a + 1 + (gap - R) / gap }, { name: 'drops the fraction part of n', v: a + w / gap }, { name: 'divides by 2a', v: a + R / (2 * a) }]
    yield { params: { n: `${a * a + w} ${rn}/${s}`, a }, key, errs, printed: [a * a + w, rn, s], range: [a, a + 1] }
  }
}, 4)

// S30: x^2 = p/q, y^3 = -r/s: least x + y
G.S30 = () => run('S30 least x + y from x^2 = p/q and y^3 = -r/s', function* () {
  for (let xn = 1; xn <= 9; xn++) for (let xd = 2; xd <= 9; xd++) for (let yn = 1; yn <= 5; yn++) for (let yd = 2; yd <= 5; yd++) {
    if (g(xn, xd) !== 1 || g(yn, yd) !== 1) continue
    const X = xn / xd, Y = yn / yd, key = -X - Y, p = xn * xn, q = xd * xd, r = yn ** 3, s = yd ** 3
    const errs = [{ name: 'positive square root', v: X - Y }, { name: 'cube root taken positive', v: -X + Y }, { name: 'halves instead of the square root', v: -p / (2 * q) - Y },
      { name: 'divides by 3 instead of the cube root', v: -X - r / (3 * s) }, { name: 'roots the numerators only', v: -xn / q - yn / s }]
    yield { params: { x2: `${p}/${q}`, y3: `-${r}/${s}` }, key, errs, printed: [p, q, r, s] }
  }
}, 4, { dir: 'least' })

// S31: x^3 = -p/q, y^2 = r/s, y < 0: xy
G.S31 = () => run('S31 xy from x^3 = -p/q and y^2 = r/s with y < 0', function* () {
  for (let xn = 1; xn <= 5; xn++) for (let xd = 2; xd <= 5; xd++) for (let yn = 1; yn <= 9; yn++) for (let yd = 2; yd <= 9; yd++) {
    if (g(xn, xd) !== 1 || g(yn, yd) !== 1) continue
    const X = xn / xd, Y = yn / yd, key = X * Y, p = xn ** 3, q = xd ** 3, r = yn * yn, s = yd * yd
    const errs = [{ name: 'divides by 3 instead of the cube root', v: (p / (3 * q)) * Y }, { name: 'halves instead of the square root', v: X * r / (2 * s) },
      { name: 'adds instead of multiplying (sizes)', v: X + Y }, { name: 'roots the numerators only', v: (xn / q) * (yn / s) }]
    yield { params: { x3: `-${p}/${q}`, y2: `${r}/${s}` }, key, errs, printed: [p, q, r, s] }
  }
}, 4)

// S32: sqrt28 + sqrt63 with an approximation of sqrt7 (decimal 2dp and fraction forms)
G.S32 = () => run('S32 approximate √(k1^2 m) + √(k2^2 m) from a printed approximation of √m', function* () {
  for (const [m, A] of [[7, 2.65], [6, 2.45], [7, 53 / 20], [6, 49 / 20], [3, 1.73], [2, 1.41], [5, 2.24], [10, 3.16]]) for (let k1 = 2; k1 <= 5; k1++) for (let k2 = k1 + 1; k2 <= 6; k2++) {
    const key = (k1 + k2) * A
    const errs = [{ name: 'takes the radicand / m as the coefficient (√28 = 4√7)', v: (k1 * k1 + k2 * k2) * A }, { name: 'multiplies the coefficients', v: k1 * k2 * A },
      { name: 'treats √(k^2 m) as k + √m', v: k1 + k2 + 2 * A }]
    yield { params: { m, approx: A, radicands: [k1 * k1 * m, k2 * k2 * m] }, key, errs, printed: [k1 * k1 * m, k2 * k2 * m, A] }
  }
}, 4)

// S33: sum of the rational numbers in a list
G.S33 = () => run('S33 sum of the rational numbers in a mixed list', function* () {
  for (let an = 1; an <= 8; an++) for (let ad = 2; ad <= 9; ad++) for (const [cn, cd, cs] of [[1, 2, -1], [2, 3, -1], [1, 3, -1], [3, 2, -1], [1, 2, 1], [2, 3, 1], [4, 3, 1], [3, 4, -1], [2, 5, 1]]) for (let k = 1; k <= 8; k++) {
    if (g(an, ad) !== 1) continue
    const sq = an / ad, cb = cs * cn / cd, rep = k / 9, key = sq + cb + rep
    const errs = [{ name: 'leaves out the repeating decimal (thinks it irrational)', v: sq + cb }, { name: 'leaves out the square root (thinks every root irrational)', v: cb + rep },
      { name: 'leaves out the cube root', v: sq + rep }, { name: 'reads the repeating decimal as k/10', v: sq + cb + k / 10 }, { name: 'drops the cube root sign', v: sq + Math.abs(cb) + rep }]
    yield { params: { sqrt: `√(${an * an}/${ad * ad})`, cbrt: `∛(${cs < 0 ? '-' : ''}${cn ** 3}/${cd ** 3})`, repeating: `0.${k}${k}${k}...` }, key, errs, printed: [an * an, ad * ad, cn ** 3, cd ** 3, k] }
  }
}, 4)

// S43: sum of the fractions greater than 1/2 (dens 3, 4, 6, 12; one equals 1/2)
G.S43 = () => run('S43 sum of the listed fractions greater than 1/2', function* () {
  const pool = [[1, 3], [2, 3], [1, 4], [3, 4], [1, 6], [5, 6], [1, 12], [5, 12], [7, 12], [11, 12], [2, 4], [3, 6], [6, 12]]
  const halves = pool.filter(([n, d]) => 2 * n === d), others = pool.filter(([n, d]) => 2 * n !== d)
  const pick = (arr, k, st = 0, acc = [], out = []) => { if (acc.length === k) { out.push(acc.slice()); return out } for (let i = st; i < arr.length; i++) { acc.push(arr[i]); pick(arr, k, i + 1, acc, out); acc.pop() } return out }
  for (const h of halves) for (const four of pick(others, 4)) {
    const L = [h, ...four], v = ([n, d]) => n / d, gt = four.filter(f => v(f) > 0.5), lt = four.filter(f => v(f) < 0.5)
    if (gt.length < 2 || lt.length < 1) continue
    const S = a => a.reduce((t, f) => t + v(f), 0), key = S(gt)
    const close = [...lt].sort((a, b) => v(b) - v(a))[0], small = [...gt].sort((a, b) => v(a) - v(b))[0]
    const errs = [{ name: 'includes the fraction equal to 1/2', v: key + 0.5 }, { name: 'adds the fractions less than 1/2', v: S(lt) }, { name: 'adds all five', v: S(L) },
      { name: 'leaves out the kept fraction nearest 1/2', v: key - v(small) }, { name: 'keeps the left-out fraction nearest 1/2 as well', v: key + v(close) },
      { name: 'keeps fractions with numerator greater than 1 (ignores the denominator)', v: S(L.filter(([n]) => n > 1)) }]
    yield { params: { list: L.map(([n, d]) => `${n}/${d}`) }, key, errs, printed: L.flat() }
  }
}, 4)

// S44: one more full serving: (1 - fractional part of S/f) x f
G.S44 = () => run('S44 flour needed for one more full serving', function* () {
  for (let w = 2; w <= 9; w++) for (let sn = 1; sn <= 7; sn++) for (let sd = 2; sd <= 8; sd++) for (let fn = 1; fn <= 5; fn++) for (let fd = 2; fd <= 8; fd++) {
    if (sn >= sd || g(sn, sd) !== 1 || fn >= fd || g(fn, fd) !== 1) continue
    const S = w + sn / sd, f = fn / fd, q = S / f, phi = q - Math.floor(q); if (phi < 1e-9) continue
    const key = (1 - phi) * f
    const errs = [{ name: 'the leftover flour (fractional part x f)', v: phi * f }, { name: 'the missing part in servings, not cups', v: 1 - phi }, { name: 'the fractional part of the quotient', v: phi },
      { name: 'divides the missing part by f', v: (1 - phi) / f }]
    yield { params: { S: `${w} ${sn}/${sd}`, f: `${fn}/${fd}`, servings: q }, key, errs, printed: [w, sn, sd, fn, fd], range: [0, f] }
  }
}, 4)

// S47: three grades, different riding fractions
G.S47 = () => run('S47 fraction of all students who ride (three grades)', function* () {
  const F = []; for (let d = 2; d <= 6; d++) for (let n = 1; n < d; n++) if (g(n, d) === 1) F.push([n, d])
  for (const [an, ad] of F) for (const [bn, bd] of F) { const A = an / ad, B = bn / bd, C = 1 - A - B; if (C <= 0.05) continue
    for (const [pn, pd] of F) for (const [qn, qd] of F) for (const [rn, rd] of F) {
      const P = pn / pd, Q = qn / qd, R = rn / rd; if (P === Q || Q === R || P === R) continue
      const key = A * P + B * Q + C * R
      const errs = [{ name: 'uses the third riding fraction of the whole school', v: A * P + B * Q + R }, { name: 'averages the three riding fractions', v: (P + Q + R) / 3 },
        { name: 'fraction that does NOT ride', v: 1 - key }, { name: 'leaves out the third grade (its share not found)', v: A * P + B * Q }, { name: "uses the first grade's riding fraction for the third grade", v: A * P + B * Q + C * P }]
      yield { params: { grades: [`${an}/${ad}`, `${bn}/${bd}`, 'rest'], ride: [`${pn}/${pd}`, `${qn}/${qd}`, `${rn}/${rd}`] }, key, errs, printed: [an, ad, bn, bd, pn, pd, qn, qd, rn, rd], range: [Math.min(P, Q, R), Math.max(P, Q, R)] }
    } }
}, 4)

// S48: lowest running water level in mixed numbers (eighths)
G.S48 = () => run('S48 lowest running level (mixed numbers, eighths)', function* () {
  const nx = rng(9090)
  for (let i = 0; i < 60000; i++) {
    const L0 = (40 + nx() % 60) / 8, ch = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 18, 20, 22, 25, 27, 29]
    const t = Array.from({ length: 5 }, (_, k) => (k % 2 ? 1 : -1) * ch[nx() % ch.length] / 8)
    const run_ = []; let b = L0; for (const x of t) { b += x; run_.push(b) }
    if (run_.some(x => x <= 0)) continue
    const key = Math.min(...run_), idx = run_.indexOf(key); if (idx === 4 || run_.filter(x => x === key).length > 1) continue
    const sorted = [...run_].sort((a, b) => a - b), W = t.filter(x => x < 0)
    const errs = [{ name: 'final level', v: run_[4] }, { name: 'start minus all the drops', v: L0 + W.reduce((s, x) => s + x, 0) }, { name: 'start minus the largest drop', v: L0 + Math.min(...W) },
      { name: 'second-lowest level', v: sorted[1] }, { name: 'start minus the drops up to the lowest point (ignores rises)', v: L0 + t.slice(0, idx + 1).filter(x => x < 0).reduce((s, x) => s + x, 0) }]
    yield { params: { start: L0, changes: t }, key, errs, printed: [L0, ...t.map(Math.abs)], range: [L0 + W.reduce((s, x) => s + x, 0), run_[4]] }
  }
}, 4, { dir: 'least' })

// S49: clockwise from the bottom-left vertex: x after d units
G.S49 = () => run('S49 perimeter walk: x-coordinate after d units', function* () {
  for (const yb of [-3.25, -4.75, -2.25, -5.25, -1.75]) for (const yt of [2.25, 3.75, 4.25, 1.75, 5.75]) for (let xl10 = -65; xl10 <= -15; xl10 += 5) for (let xr10 = 15; xr10 <= 65; xr10 += 5) for (let d100 = 105; d100 <= 2095; d100 += 10) {
    const xl = xl10 / 10, xr = xr10 / 10, H = yt - yb, W = xr - xl, d = d100 / 100; if (!(d > H + 0.05 && d < H + W - 0.05)) continue
    const key = r2(xl + (d - H))
    const errs = [{ name: 'ignores the corner (goes straight on d)', v: r2(xl + d) }, { name: 'left side as |yt| - |yb| (sizes subtracted across 0)', v: r2(xl + (d - Math.abs(Math.abs(yt) - Math.abs(yb)))) },
      { name: 'reports the distance walked along the top', v: r2(d - H) }, { name: 'goes left instead of right after the corner', v: r2(xl - (d - H)) }]
    yield { params: { xl, xr, yt, yb, d }, key, errs, printed: [Math.abs(xl), xr, yt, Math.abs(yb), d], range: [xl, xr] }
  }
}, 4)

// S50: sum of the rational numbers in a decimal list
G.S50 = () => run('S50 sum of the rational numbers in a decimal list', function* () {
  for (const sq of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.1, 1.2, 1.3]) for (const cb of [0.1, 0.2, 0.3, 0.4, 0.5, -0.1, -0.2, -0.3, -0.4]) for (let k = 1; k <= 8; k++) for (const t of [0.25, 0.75, 0.125, 0.375, 0.05, 0.45, 0.6, 1.5]) {
    const rep = k / 9, key = sq + cb + rep + t
    const errs = [{ name: 'leaves out the repeating decimal (thinks it irrational)', v: sq + cb + t }, { name: 'leaves out the square root of the decimal (thinks it irrational)', v: cb + rep + t },
      { name: 'leaves out the cube root', v: sq + rep + t }, { name: 'reads the repeating decimal as k/10', v: sq + cb + k / 10 + t }, { name: 'takes the square root of the decimal as half of it', v: sq * sq / 2 + cb + rep + t }]
    yield { params: { sqrtOf: r2(sq * sq), cbrtOf: r2(cb ** 3), repeating: `0.${k}${k}${k}...`, terminating: t }, key, errs, printed: [r2(sq * sq), Math.abs(r2(cb ** 3)), k, t] }
  }
}, 4)

// S51: greatest rational minus least rational in a list
G.S51 = () => run('S51 greatest rational minus least rational in a mixed list', function* () {
  for (let an = 1; an <= 8; an++) for (let ad = 2; ad <= 9; ad++) for (const [cn, cd, cs] of [[1, 2, -1], [2, 3, -1], [1, 3, -1], [3, 2, -1], [1, 2, 1], [2, 3, 1], [4, 3, 1], [3, 4, -1], [2, 5, 1], [1, 4, -1]]) for (let k = 1; k <= 8; k++) for (const [tn, td] of [[1, 4], [3, 4], [5, 6], [1, 6], [7, 9], [2, 9], [5, 12], [7, 12]]) {
    if (g(an, ad) !== 1) continue
    const R = { sq: an / ad, cb: cs * cn / cd, rep: k / 9, fr: tn / td }, vals = o => Object.values(o), spread = o => Math.max(...vals(o)) - Math.min(...vals(o))
    const key = spread(R), drop = n => { const o = { ...R }; delete o[n]; return spread(o) }
    const errs = [{ name: 'leaves out the repeating decimal', v: drop('rep') }, { name: 'leaves out the square root', v: drop('sq') }, { name: 'leaves out the cube root', v: drop('cb') },
      { name: 'drops the cube root sign', v: spread({ ...R, cb: Math.abs(R.cb) }) }, { name: 'reads the repeating decimal as k/10', v: spread({ ...R, rep: k / 10 }) }]
    yield { params: { sqrt: `√(${an * an}/${ad * ad})`, cbrt: `∛(${cs < 0 ? '-' : ''}${cn ** 3}/${cd ** 3})`, repeating: `0.${k}${k}${k}...`, fraction: `${tn}/${td}` }, key, errs, printed: [an * an, ad * ad, cn ** 3, cd ** 3, k, tn, td] }
  }
}, 4)

// S54: sum of the square roots of the listed fractions that are perfect squares (one only after simplifying)
G.S54 = () => run('S54 sum of the rational square roots in a list of fractions', function* () {
  const sq = []; for (let n = 1; n <= 9; n++) for (let d = 2; d <= 9; d++) if (n < d && g(n, d) === 1) sq.push([n, d])
  for (const [a1, b1] of sq) for (const [a2, b2] of sq) for (const [a3, b3] of sq) for (const m of [2, 3, 5]) {
    if (a1 * b2 === a2 * b1 || a1 * b3 === a3 * b1 || a2 * b3 === a3 * b2) continue
    if (a1 * b2 > a2 * b1 || a2 * b3 > a3 * b2) continue
    const r1 = a1 / b1, r2_ = a2 / b2, r3 = a3 / b3, key = r1 + r2_ + r3          // third one printed as (m a3^2)/(m b3^2)
    const errs = [{ name: 'leaves out the fraction that is a perfect square only after simplifying', v: r1 + r2_ }, { name: 'roots the numerators only', v: a1 / (b1 * b1) + a2 / (b2 * b2) + a3 / (m * b3 * b3) },
      { name: 'adds the disguised fraction without rooting it', v: r1 + r2_ + (a3 * a3) / (b3 * b3) }, { name: 'halves instead of taking roots', v: (a1 * a1) / (2 * b1 * b1) + (a2 * a2) / (2 * b2 * b2) + (a3 * a3) / (2 * b3 * b3) }]
    yield { params: { list: [`${a1 * a1}/${b1 * b1}`, `${a2 * a2}/${b2 * b2}`, `${m * a3 * a3}/${m * b3 * b3}`, 'plus two non-squares'] }, key, errs, printed: [a1 * a1, b1 * b1, a2 * a2, b2 * b2, m * a3 * a3, m * b3 * b3] }
  }
}, 4)

// S55: of five powers with zero and negative exponents (bases powers of 2), add the ones less than 1
G.S55 = () => run('S55 sum of the listed powers that are less than 1', function* () {
  const pool = []; for (const b of [2, 4, 8, 0.5, 0.25, 0.125, -2, -4]) for (const e of [-3, -2, -1, 0, 1, 2, 3]) { const x = b ** e; if (Math.abs(x) <= 16 && Math.abs(x) >= 1 / 64) pool.push([b, e]) }
  const pick = (arr, k, st = 0, acc = [], out = []) => { if (acc.length === k) { out.push(acc.slice()); return out } for (let i = st; i < arr.length; i++) { acc.push(arr[i]); pick(arr, k, i + 1, acc, out); acc.pop() } return out }
  const nx = rng(31337); for (let it = 0; it < 120000; it++) { const L = []; while (L.length < 5) { const c = pool[nx() % pool.length]; if (!L.some(x => x[0] ** x[1] === c[0] ** c[1])) L.push(c) }
    const v = ([b, e]) => b ** e, sum = f => L.reduce((t, x) => { const y = f(x); return y !== null && y < 1 ? t + y : t }, 0)
    const key = sum(v); if (key <= 0) continue
    if (!L.some(([b, e]) => b < 1 && b > 0 && e < 0) || !L.some(([b, e]) => b > 1 && e < 0) || !L.some(([, e]) => e === 0)) continue
    const errs = [{ name: 'does not flip a fraction base with a negative exponent', v: sum(([b, e]) => b > 0 && b < 1 && e < 0 ? b ** -e : b ** e) },
      { name: 'reads a negative exponent as a negative number', v: sum(([b, e]) => e < 0 ? -(Math.abs(b) ** -e) : b ** e) },
      { name: 'counts a zero power as 0', v: sum(([b, e]) => e === 0 ? 0 : b ** e) }, { name: 'includes the zero powers (reads less than 1 as at most 1)', v: L.reduce((t, x) => v(x) <= 1 ? t + v(x) : t, 0) },
      { name: 'does not flip a whole-number base with a negative exponent', v: sum(([b, e]) => Math.abs(b) > 1 && e < 0 ? b ** -e : b ** e) }]
    yield { params: { powers: L.map(([b, e]) => `(${b})^${e}`) }, key, errs, printed: L.map(([b]) => Math.abs(b)) }
  }
}, 4)

const which = process.argv[2]
if (which === '--diag') {
  run = diagRun; const ids = process.argv[3] ? process.argv[3].split(',') : Object.keys(G)
  for (const id of ids) G[id]()
} else if (which === '--all') {
  const res = {}
  for (const [id, f] of Object.entries(G)) { const r = f(); res[id] = { sets: r.sets, ranks: Object.keys(r.byRank).map(Number), examples: Object.fromEntries(Object.entries(r.byRank).map(([k, v]) => [k, v.slice(0, 2)])) } }
  writeFileSync(new URL('./feas-out.json', import.meta.url), JSON.stringify(res, null, 1) + '\n')
  console.log('\nSUMMARY'); for (const [id, r] of Object.entries(res)) console.log(id, 'sets', r.sets, 'ranks', r.ranks.join(',') || 'NONE')
} else if (G[which]) G[which]()
else { console.error('usage: node gen9.mjs <' + Object.keys(G).join('|') + '> | --all | --diag [ids]'); process.exit(2) }
