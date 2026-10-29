import { run } from './search7.mjs'
const g = (a, b) => b ? g(b, a % b) : a, lcm = (a, b) => a / g(a, b) * b
const red = (n, d) => { const k = g(n, d); return [n / k, d / k] }
const mech = process.argv[2]
if (mech === 'D03') run('D03 unit-fraction split, ask a+b', function* () {
  for (let a = 2; a <= 12; a++) for (let b = a + 1; b <= 40; b++) {
    const [p, q] = red(b + a, a * b); if (p === 1) continue
    let n = 0; for (let x = 2; x <= 200; x++) for (let y = x + 1; y <= 2000; y++) if (p * x * y === q * (x + y)) n++
    if (n !== 1) continue
    const errs = [{ name: 'product a*b', v: a * b }, { name: 'unsimplified 2q', v: 2 * q }, { name: 'p+q', v: p + q }, { name: 'b-a', v: b - a },
      { name: 'a+q', v: a + q }, { name: '2*lcm', v: 2 * lcm(a, b) }]
    if ((2 * q) % p === 0) errs.push({ name: 'repeat 2c', v: 2 * (2 * q / p) })
    const [n2, d2] = red(p - 1, q - a); if (n2 === 1 && d2 > 0) errs.push({ name: 'subtract across', v: a + d2 })
    yield { params: { frac: `${p}/${q}`, a, b }, key: a + b, errs, printed: [p, q] }
  }
})
if (mech === 'D05') run('D05 count factors > 1', function* () {
  for (let L = 6; L <= 10; L++) for (let gt = 1; gt < L; gt++) for (let mx = 0; mx <= gt; mx++) for (let eq = 0; eq <= 2; eq++) for (let close = 0; close <= 3; close++) {
    const lt = L - gt - eq; if (lt < 1 || close > lt) continue
    const errs = [{ name: 'counts =1 too', v: gt + eq }, { name: 'reverse (<1)', v: lt }, { name: 'reverse incl =1', v: lt + eq }, { name: 'misses mixed numbers', v: gt - mx },
      { name: 'counts near-1 proper fractions', v: gt + close }, { name: 'counts improper only and =1', v: gt - mx + eq }]
    yield { params: { L, gt, mixed: mx, eq, lt, close }, key: gt, errs, printed: [] }
  }
})
if (mech === 'D04') run('D04 count decimals > fraction', function* () {
  for (let L = 6; L <= 9; L++) for (let k = 1; k < L; k++) for (let tr = 0; tr <= 3; tr++) for (let ln = 0; ln <= 3; ln++) {
    // tr: decimals between the true benchmark and a mis-converted benchmark; ln: decimals that are longer-but-smaller
    if (k + tr > L || k - 0 < 0) continue
    const errs = [{ name: 'misconverts 3/8 as 0.38 (counts fewer)', v: k - Math.min(tr, k) }, { name: 'misconverts as 0.3 (counts more)', v: k + tr },
      { name: 'longer decimal is greater', v: k + ln }, { name: 'counts less-than', v: L - k }, { name: 'counts at-or-below incl equal', v: L - k + 1 }]
    yield { params: { L, key: k, tr, ln }, key: k, errs, printed: [] }
  }
})
if (mech === 'D19') run('D19 count true statements', function* () {
  for (let L = 5; L <= 8; L++) for (let t = 1; t < L; t++) for (let abs = 0; abs <= 3; abs++) for (let neg = 0; neg <= 3; neg++) for (let both = -2; both <= 2; both++) {
    const errs = [{ name: 'ignores absolute value bars', v: t + abs - 2 * Math.min(abs, 1) }, { name: 'compares negatives by size', v: t + neg }, { name: 'counts false ones', v: L - t },
      { name: 'both errors', v: t + both }, { name: 'abs flips', v: t - abs }, { name: 'neg flips', v: t - neg }]
    yield { params: { L, t, abs, neg, both }, key: t, errs, printed: [] }
  }
})
if (mech === 'D31') run('D31 first hour below threshold', function* () {
  for (let T0 = 2; T0 <= 12; T0++) for (let x = 2; x <= 6; x++) for (let h1 = 2; h1 <= 5; h1++) for (let y = 1; y <= 4; y++) for (let th = -12; th <= -2; th++) {
    if (y >= x) continue
    // hour-by-hour: first h1 hours fall x each, then y each; first hour with temp < th
    let T = T0, hr = 0, key = null; while (hr < 40) { hr++; T -= hr <= h1 ? x : y; if (T < th) { key = hr; break } }
    if (!key || key <= h1 + 1) continue
    const onlyFirst = Math.floor((T0 - th) / x) + 1
    let T2 = T0, h2 = 0, atOrBelow = null; while (h2 < 40) { h2++; T2 -= h2 <= h1 ? x : y; if (T2 <= th) { atOrBelow = h2; break } }
    let T3 = 0, h3 = 0, noStart = null; while (h3 < 40) { h3++; T3 -= h3 <= h1 ? x : y; if (T3 < th) { noStart = h3; break } }
    const afterSwitch = key - h1
    let T4 = T0, h4 = 0, swapRates = null; while (h4 < 40) { h4++; T4 -= h4 <= h1 ? y : x; if (T4 < th) { swapRates = h4; break } }
    const errs = [{ name: 'uses first rate throughout', v: onlyFirst }, { name: 'at-or-below', v: atOrBelow }, { name: 'ignores start temperature', v: noStart },
      { name: 'counts hours after the switch only', v: afterSwitch }, { name: 'swaps the two rates', v: swapRates }]
    yield { params: { T0, x, h1, y, th }, key, errs, printed: [T0, x, h1, y, Math.abs(th)] }
  }
})
const FR = []; for (let d = 2; d <= 12; d++) for (let n = 1; n <= 4 * d; n++) { if (g(n, d) === 1 && n !== d) FR.push([n, d]) }
const fv = ([n, d]) => n / d
if (mech === 'D16') run('D16 area / side -> perimeter', function* () {
  for (const s of FR) for (const w of FR) {
    const sv = fv(s), wv = fv(w); if (sv <= 0.5 || wv <= 0.5 || sv > 5 || wv > 5) continue
    const A = sv * wv, [an, ad] = red(s[0] * w[0], s[1] * w[1])
    const errs = [{ name: 'half perimeter', v: wv + sv }, { name: 'multiplies area by side', v: 2 * (A * sv + sv) }, { name: 'divides side by area', v: 2 * (sv / A + sv) },
      { name: 'other side only', v: wv }, { name: 'adds area and side', v: 2 * (A + sv) }, { name: 'two sides of one kind', v: wv + 2 * sv }, { name: 'w + s doubled only w', v: 2 * wv + sv }]
    yield { params: { area: `${an}/${ad}`, side: `${s[0]}/${s[1]}`, other: `${w[0]}/${w[1]}` }, key: 2 * (wv + sv), errs, printed: [an, ad, s[0], s[1]] }
  }
}, 4)
if (mech === 'D06') run('D06 add-across error distance', function* () {
  for (const x of FR) for (const y of FR) {
    const xv = fv(x), yv = fv(y); if (xv >= 1 || yv >= 1 || x[1] === y[1] || xv > yv) continue
    const tru = xv + yv, wrong = (x[0] + y[0]) / (x[1] + y[1]), key = tru - wrong; if (key <= 0) continue
    const errs = [{ name: 'reports the true sum', v: tru }, { name: 'reports the add-across value', v: wrong }, { name: 'common denominator without scaling numerators', v: tru - (x[0] + y[0]) / (x[1] * y[1]) },
      { name: 'true sum with denominators added', v: (x[0] * y[1] + y[0] * x[1]) / (x[1] + y[1]) - wrong }, { name: 'adds instead of subtracting', v: tru + wrong }, { name: 'difference of numerators over sum', v: Math.abs(x[0] - y[0]) / (x[1] + y[1]) }]
    yield { params: { a: `${x[0]}/${x[1]}`, b: `${y[0]}/${y[1]}` }, key, errs, printed: [x[0], x[1], y[0], y[1]] }
  }
}, 4)
if (mech === 'D07') run('D07 two-stage sharing', function* () {
  for (let a = 2; a <= 20; a++) for (let t = 2; t <= 9; t++) for (let p = 2; p <= 9; p++) {
    const key = a / (t * p)
    const errs = [{ name: 'one stage only', v: a / t }, { name: 'adds tables and people', v: a / (t + p) }, { name: 'inverted', v: (t * p) / a }, { name: 'multiplies share by people', v: a * p / t },
      { name: 'divides by people only', v: a / p }, { name: 'per table count wrong way', v: t / a / p }]
    yield { params: { pies: a, tables: t, people: p }, key, errs, printed: [a, t, p] }
  }
}, 4)
if (mech === 'D33') run('D33 iterate multiply by m then add c, 3 times', function* () {
  const starts = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5, -3.5, 3.5, -0.25, 0.75, -0.75, 1.25, -1.25, 0.4, -0.4, 1.2, -1.2, -2.4, 0.6, -0.6]
  for (const m of [-2, -3, -0.5]) for (const c of [1, 2, 3, 4, 5, -1, -2, -3, -4]) for (const x0 of starts) {
    const f = x => m * x + c, fwrong = x => m * (x + c), fpos = x => Math.abs(m) * x + c
    const key = f(f(f(x0)))
    const errs = [{ name: 'two rounds only', v: f(f(x0)) }, { name: 'add then multiply', v: fwrong(fwrong(fwrong(x0))) }, { name: 'drops the negative sign of the multiplier', v: fpos(fpos(fpos(x0))) },
      { name: 'four rounds', v: f(f(f(f(x0)))) }, { name: 'sign slip in round 2', v: f(-f(f(x0)) + 0) }, { name: 'multiplies three times then adds once', v: m * m * m * x0 + c },
      { name: 'one round', v: f(x0) }, { name: 'subtracts c', v: (x => m * x - c)((x => m * x - c)((x => m * x - c)(x0))) }]
    yield { params: { m, c, x0 }, key, errs, printed: [Math.abs(m), Math.abs(c), Math.abs(x0), 3].filter(v => v !== 0) }
  }
}, 4)
if (mech === 'D14') run('D14 sum of exponents', function* () {
  for (let a = 0; a <= 6; a++) for (let b = 0; b <= 4; b++) for (let c = 0; c <= 3; c++) {
    const N = 2 ** a * 3 ** b * 5 ** c; if (N < 50 || N > 2000 || [a, b, c].filter(x => x > 0).length < 2) continue
    const key = a + b + c
    let nd = 0; for (let k = 1; k <= N; k++) if (N % k === 0) nd++
    const errs = [{ name: 'counts distinct primes', v: [a, b, c].filter(x => x > 0).length }, { name: 'adds the primes used', v: (a ? 2 : 0) + (b ? 3 : 0) + (c ? 5 : 0) }, { name: 'multiplies exponents', v: [a, b, c].filter(x => x).reduce((s, x) => s * x, 1) },
      { name: 'counts divisors', v: nd }, { name: 'adds prime factors with repetition', v: 2 * a + 3 * b + 5 * c }, { name: 'drops the 5s', v: a + b }, { name: 'counts factor-tree leaves off by one', v: key + 1 }]
    yield { params: { N, a, b, c }, key, errs, printed: [N, 2, 3, 5] }
  }
})
if (mech === 'D39') run('D39 reciprocal pairing', function* () {
  for (const [a, b] of [[2, 3], [3, 2], [3, 4], [4, 3], [2, 5], [5, 2], [3, 5], [5, 3], [4, 5], [5, 4], [5, 6], [2, 7], [3, 7]]) for (let n = 3; n <= 8; n++) {
    const r = a / b, key = r
    const errs = [{ name: 'reciprocal left over', v: b / a }, { name: 'cancels to 1', v: 1 }, { name: 'adds exponents', v: r ** (2 * n - 1) }, { name: 'r^2', v: r * r }, { name: 'r^n', v: r ** n }, { name: 'subtracts exponents wrongly', v: r ** -1 }]
    yield { params: { a, b, n }, key, errs, printed: [a, b, n, n - 1] }
  }
}, 4)
