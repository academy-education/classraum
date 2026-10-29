// batch 8 feasibility generators, one per probe-surviving candidate, in the gen7 style: each lists its NATURAL error set
// in code and searches parameters for a key + 3 errors that pass FORM/LONE/HUB/RUN/PAIR/KEYPRINT/DPAIR/DSUM
// (search8.mjs -> ../math-b6/feas-lib.mjs). Read-only. Usage: node gen8.mjs <Qxx> | --all (writes feas-out.json).
import { run as run0 } from './search8.mjs'
import { diagRun } from './diag8.mjs'
let run = run0
import { writeFileSync } from 'node:fs'
const g = (a, b) => b ? g(b, a % b) : a
const S7 = []; for (let n = -34; n <= 34; n++) if (n % 7) S7.push(n)          // signed sevenths numerators
const pick = (arr, k, start = 0, acc = [], out = []) => { if (acc.length === k) { out.push(acc.slice()); return out } for (let i = start; i < arr.length; i++) { acc.push(arr[i]); pick(arr, k, i + 1, acc, out); acc.pop() } return out }
const perms = a => a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p]))
const r2 = x => Math.round(x * 1e6) / 1e6
const G = {}

G.Q01 = () => run('Q01 non-standard place-value units -> standard decimal', function* () {
  for (let a = 1; a <= 9; a++) for (let t = 11; t <= 19; t++) for (let h = 11; h <= 39; h++) for (let u = 1; u <= 9; u++) {
    if (h % 10 === 0) continue
    const key = a + t / 10 + h / 100 + u / 1000
    const errs = [{ name: 'one digit per place, no regrouping', v: a + (t % 10) / 10 + (h % 10) / 100 + u / 1000 },
      { name: 'regroups the tenths only', v: a + t / 10 + (h % 10) / 100 + u / 1000 }, { name: 'regroups the hundredths only', v: a + (t % 10) / 10 + h / 100 + u / 1000 },
      { name: 'reads t tenths as t hundredths', v: a + t / 100 + h / 100 + u / 1000 }, { name: 'reads h hundredths as h thousandths', v: a + t / 10 + h / 1000 + u / 1000 }]
    yield { params: { ones: a, tenths: t, hundredths: h, thousandths: u }, key, errs, printed: [a, t, h, u] }
  }
}, 4)

G.Q02 = () => run('Q02 digit cards, least positive 0.ab - 0.cd', function* () {
  for (const ds of pick([1, 2, 3, 4, 5, 6, 7, 8, 9], 4)) {
    let best = Infinity, worst = -Infinity
    for (const [a, b, c, d] of perms(ds)) { const v = (10 * a + b - 10 * c - d) / 100; if (v > 0) best = Math.min(best, v); worst = Math.max(worst, v) }
    const s = [...ds].sort((x, y) => x - y)
    let gp = null; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (s[j] > s[i] && (!gp || s[j] - s[i] < gp[1] - gp[0])) gp = [s[i], s[j]]
    const rest = s.filter(x => !gp.includes(x)), [p, q] = rest
    const errs = [{ name: 'greatest difference', v: worst }, { name: 'closest tenths, larger hundredth on the larger number', v: (10 * gp[1] + q - 10 * gp[0] - p) / 100 },
      { name: 'two smallest digits as the tenths', v: (10 * s[1] + s[2] - 10 * s[0] - s[3]) / 100 }, { name: 'cards in order, 0.(3rd 4th) - 0.(1st 2nd)', v: (10 * s[2] + s[3] - 10 * s[0] - s[1]) / 100 },
      { name: 'best placement, subtracts the smaller hundredth from the larger (no regroup)', v: ((gp[1] - gp[0]) * 10 + (q - p)) / 100 }]
    yield { params: { digits: ds }, key: best, errs, printed: ds }
  }
}, 4)

G.Q03 = () => run('Q03 closest pair of four decimals of mixed lengths', function* () {
  const pool = []; for (let i = 11; i <= 89; i++) pool.push(i / 100); for (let i = 1; i <= 9; i++) pool.push(i / 10); for (const x of [0.105, 0.208, 0.307, 0.405, 0.508, 0.604, 0.706, 0.809, 0.455, 0.555, 0.375, 0.625]) pool.push(x)
  const after = x => { const s = String(x).split('.')[1]; return +s }, len = x => String(x).split('.')[1].length
  let n = 0
  for (let i = 0; i < 4000; i++) {
    const sel = []; let seed = i * 2654435761 % 4294967296
    while (sel.length < 4) { seed = (seed * 1103515245 + 12345) % 2147483648; const x = pool[seed % pool.length]; if (!sel.includes(x)) sel.push(x) }
    if (new Set(sel.map(len)).size < 3) continue
    const t = [...sel].sort((a, b) => a - b), diffs = t.slice(1).map((x, k) => r2(x - t[k]))
    const key = Math.min(...diffs); if (diffs.filter(d => d === key).length > 1) continue
    const sd = [...diffs].sort((a, b) => a - b)
    const w = [...sel].sort((a, b) => after(a) - after(b)), wd = w.slice(1).map((x, k) => r2(Math.abs(x - w[k])))
    let pi = null; for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) { const dd = Math.abs(after(sel[a]) - after(sel[b])); if (!pi || dd < pi[0]) pi = [dd, r2(Math.abs(sel[a] - sel[b]))] }
    const kp = t.findIndex((x, k) => k > 0 && r2(x - t[k - 1]) === key), A = t[kp], B = t[kp - 1]
    const errs = [{ name: 'orders by the digits after the point, then least adjacent gap', v: Math.min(...wd) }, { name: 'second-closest pair', v: sd[1] },
      { name: 'greatest minus least', v: r2(t[3] - t[0]) }, { name: 'closest digits-after-the-point, true gap', v: pi[1] },
      { name: 'right-aligned subtraction of the closest pair', v: Math.abs(after(A) - after(B)) / 10 ** Math.max(len(A), len(B)) }]
    n++; yield { params: { decimals: sel }, key, errs, printed: sel }
  }
}, 4)

G.Q04 = () => run('Q04 fraction red after k red added', function* () {
  for (let n = 8; n <= 40; n++) for (let r = 1; r < n; r++) for (let k = 1; k <= 12; k++) {
    const key = (r + k) / (n + k)
    const errs = [{ name: 'old fraction r/n', v: r / n }, { name: 'adds k to the red count only', v: (r + k) / n }, { name: 'added marbles over new total', v: k / (n + k) },
      { name: 'old red over new total', v: r / (n + k) }, { name: 'fraction NOT red now', v: (n - r) / (n + k) }]
    yield { params: { n, r, k }, key, errs, printed: [n, r, k] }
  }
}, 4)

G.Q05 = () => run('Q05 nested zoom on the number line', function* () {
  for (let A10 = 1; A10 <= 99; A10++) for (let m = 1; m <= 9; m++) for (let j = 1; j <= 9; j++) {
    const A = A10 / 10, key = A + m / 100 + j / 1000
    const errs = [{ name: 'first zoom read as tenths', v: A + m / 10 + j / 100 }, { name: 'second zoom read as hundredths', v: A + m / 100 + j / 100 },
      { name: 'counts the first marks from the right end', v: A + (10 - m) / 100 + j / 1000 }, { name: 'counts the second marks from the right end', v: A + m / 100 + (10 - j) / 1000 },
      { name: 'starts the second zoom one mark early', v: A + (m - 1) / 100 + j / 1000 }]
    yield { params: { A, m, j }, key, errs, printed: [A, r2(A + 0.1), m, j, 10] }
  }
}, 4)

G.Q06 = () => run('Q06 decimals in words, sum', function* () {
  for (let a = 1; a <= 9; a++) for (let b = 11; b <= 99; b++) for (let c = 1; c <= 9; c++) for (let d = 11; d <= 99; d += 2) {
    if (b % 10 === 0 || d % 10 === 0) continue
    const x = a + b / 1000, y = c + d / 100, key = x + y
    const errs = [{ name: 'b thousandths written as 0.b (no placeholder)', v: a + b / 100 + y }, { name: 'd hundredths written as thousandths', v: x + c + d / 1000 },
      { name: 'both misread', v: a + b / 100 + c + d / 1000 }, { name: 'd hundredths read as tenths', v: x + c + d / 10 }]
    yield { params: { x: `${a} and ${b} thousandths`, y: `${c} and ${d} hundredths` }, key, errs, printed: [a, b, c, d] }
  }
}, 4)

G.Q07 = () => run('Q07 total with one entry typed one place off', function* () {
  for (let T100 = 1500; T100 <= 4000; T100 += 7) for (let x = 1; x <= 9; x++) for (let y = 1; y <= 9; y++) {
    const T = T100 / 100, W = x + y / 10, V = W / 10, key = T - W + V
    const errs = [{ name: 'removes the wrong entry only', v: T - W }, { name: 'subtracts the intended entry', v: T - V }, { name: 'adds the wrong entry again', v: T + W - V },
      { name: 'adds the intended entry only', v: T + V }, { name: 'subtracts both entries', v: T - W - V }]
    yield { params: { shown: T, typed: W, meant: V }, key, errs, printed: [T, W, V] }
  }
}, 3)

G.Q37 = () => run('Q37 board cut into k pieces, kerf per cut, leftover', function* () {
  for (let L10 = 20; L10 <= 60; L10++) for (let p100 = 35; p100 <= 125; p100 += 5) for (let k = 2; k <= 5; k++) for (const w of [0.1, 0.2, 0.3, 0.05]) {
    const L = L10 / 10, p = p100 / 100, key = L - k * p - k * w; if (key <= 0.05 || key > 1.5) continue
    const errs = [{ name: 'ignores the kerf', v: L - k * p }, { name: 'counts k - 1 cuts', v: L - k * p - (k - 1) * w }, { name: 'counts k + 1 cuts', v: L - k * p - (k + 1) * w },
      { name: 'subtracts one kerf only', v: L - k * p - w }, { name: 'two kerfs per piece', v: L - k * p - 2 * k * w }]
    yield { params: { board: L, piece: p, pieces: k, kerf: w }, key, errs, printed: [L, p, k, w] }
  }
}, 4)

G.Q48 = () => run('Q48 telescoping product (1 - 1/a)...(1 - 1/n)', function* () {
  for (let a = 2; a <= 6; a++) for (let n = a + 3; n <= 19; n++) {
    const key = (a - 1) / n
    const errs = [{ name: 'stops one factor early', v: (a - 1) / (n - 1) }, { name: 'last factor only', v: (n - 1) / n }, { name: 'first times last only', v: (a - 1) / a * (n - 1) / n },
      { name: 'cancels one step too far', v: (a - 1) / (n + 1) }, { name: 'first factor only', v: (a - 1) / a }, { name: 'subtracts the unit fractions from 1 once', v: 1 - (1 / a + 1 / n) }]
    yield { params: { from: `1 - 1/${a}`, to: `1 - 1/${n}` }, key, errs, printed: [1, a, n] }
  }
}, 4)

// magic square: rows [c+x, c-x-y, c+y], [c-x+y, c, c+x-y], [c-y, c+x+y, c-x]; target (1,1) = c+x; missing (1,1),(1,2),(2,1),(3,3)
function magic(signed, printSum) {
  return function* () {
    const rng = signed ? [-20, 20] : [8, 40]
    for (let c = rng[0]; c <= rng[1]; c++) for (let x = -12; x <= 12; x++) for (let y = -12; y <= 12; y++) {
      if (!x || !y || x === y || x === -y) continue
      const M = [[c + x, c - x - y, c + y], [c - x + y, c, c + x - y], [c - y, c + x + y, c - x]].map(r => r.map(v => v / 7))
      const flat = M.flat(); if (!signed && flat.some(v => v <= 0)) continue; if (flat.some(v => Number.isInteger(v))) continue
      if (signed && !(flat.some(v => v < 0) && flat.some(v => v > 0))) continue
      const S = 3 * c / 7, key = M[0][0], m12 = M[0][1], r13 = M[0][2]
      const errs = [{ name: 'treats the other gap in the row as 0', v: S - r13 }, { name: 'gives the first-step entry', v: m12 },
        { name: 'sign slip on the last step', v: S - m12 + r13 }, { name: 'adds the first-step entry instead of subtracting', v: S + m12 - r13 },
        { name: 'uses the column through the target with its gap as 0', v: S - M[2][0] }]
      const known = [M[0][2], M[1][1], M[1][2], M[2][0], M[2][1]].map(Math.abs)
      yield { params: { square: M.map(r => r.map(v => Math.round(v * 7) + '/7')), sum: Math.round(S * 7) + '/7' }, key, errs, printed: printSum ? [...known, Math.abs(S)] : known }
    }
  }
}
G.Q50 = () => run('Q50 magic square, positive sevenths, sum from a full line', magic(false, false), 4)
G.Q23 = () => run('Q23 magic square, signed sevenths, sum printed', magic(true, true), 4)

G.Q10 = () => run('Q10 continued fraction a + 1/(b + 1/c)', function* () {
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 7; b++) for (let c = 2; c <= 9; c++) {
    const key = a + c / (b * c + 1)
    const errs = [{ name: 'adds the unit fractions left to right', v: a + 1 / b + 1 / c }, { name: 'forgets the reciprocal', v: a + b + 1 / c },
      { name: 'misparses a + 1/(...) as (a + 1)/(...)', v: (a + 1) * c / (b * c + 1) },
      { name: 'reciprocal of b + 1/c taken as c/(b + c)', v: a + c / (b + c) }, { name: 'drops the inner unit fraction to c', v: a + 1 / (b + c) }]
    yield { params: { a, b, c }, key, errs, printed: [a, b, c] }
  }
}, 4)

G.Q45 = () => run('Q45 signed continued fraction a + 1/(b + 1/c), a, b < 0', function* () {
  for (let a = -6; a <= -1; a++) for (let b = -7; b <= -1; b++) for (let c = 2; c <= 9; c++) {
    const key = a + c / (b * c + 1)
    const errs = [{ name: 'adds the unit fractions left to right', v: a + 1 / b + 1 / c }, { name: 'forgets the reciprocal', v: a + b + 1 / c },
      { name: 'drops the sign of the reciprocal', v: a - c / (b * c + 1) }, { name: 'sign slip inside: b - 1/c', v: a + c / (b * c - 1) },
      { name: 'reciprocal taken as c/(b + c)', v: a + c / (b + c) }]
    yield { params: { a, b, c }, key, errs, printed: [Math.abs(a), Math.abs(b), c] }
  }
}, 4)

G.Q51 = () => run('Q51 a/(b + c/d)', function* () {
  for (let a = 1; a <= 9; a++) for (let b = 1; b <= 5; b++) for (let d = 2; d <= 9; d++) for (let c = 1; c < d; c++) {
    if (g(c, d) !== 1) continue
    const key = a * d / (b * d + c)
    const errs = [{ name: 'divides by each part and adds', v: a / b + a * d / c }, { name: 'a/b + c/d', v: a / b + c / d }, { name: 'multiplies instead of dividing', v: a * (b + c / d) },
      { name: 'forgets to multiply b by d', v: a * d / (b + c) }, { name: 'forgets the d: a/(bd + c)', v: a / (b * d + c) }]
    yield { params: { a, b, c, d }, key, errs, printed: [a, b, c, d] }
  }
}, 4)

G.Q11 = () => run('Q11 balance with debt > D and balance > -E (options chosen to violate one condition each)', function* () {
  for (const [D, E] of [[25.5, 40], [18.75, 30], [32.4, 50], [12.25, 20], [45, 60.5], [9.5, 15.25]]) for (const f of [0.15, 0.35, 0.45, 0.65, 0.85, 0.3, 0.7]) {
    const grid = []; for (let w = 1; w <= 80; w++) grid.push(w + f)
    const inK = grid.filter(v => v > D && v < E), small = grid.filter(v => v < D && v > D * 0.3), big = grid.filter(v => v > E && v < E * 1.6), pos = grid.filter(v => v > D && v < E)
    for (const k of inK.slice(0, 8)) for (const s of small.slice(-4)) for (const b of big.slice(0, 4)) for (const p of pos.slice(0, 8)) {
      if (p === k) continue
      const errs = [{ name: 'positive balance between D and E (ignores the sign)', v: p }, { name: 'debt less than D', v: -s }, { name: 'debt more than E', v: -b }]
      yield { params: { D, E }, key: -k, errs, printed: [D, E] }
    }
  }
}, 4)

G.Q13 = () => run('Q13 digit cards, greatest a.b x c.d', function* () {
  for (const ds of pick([1, 2, 3, 4, 5, 6, 7, 8, 9], 4)) {
    let best = -Infinity, worst = Infinity
    for (const [a, b, c, d] of perms(ds)) { const v = (a + b / 10) * (c + d / 10); best = Math.max(best, v); worst = Math.min(worst, v) }
    const [s0, s1, s2, s3] = [...ds].sort((x, y) => x - y)
    const errs = [{ name: 'larger tenth with the larger ones digit', v: (s3 + s1 / 10) * (s2 + s0 / 10) }, { name: 'two largest digits in one number', v: (s3 + s2 / 10) * (s1 + s0 / 10) },
      { name: 'least product', v: worst }, { name: 'largest digits as tenths', v: (s1 + s3 / 10) * (s0 + s2 / 10) }]
    yield { params: { digits: ds }, key: r2(best), errs: errs.map(e => ({ ...e, v: r2(e.v) })), printed: ds }
  }
}, 4)

function intervals(signed7) {
  return function* () {
    const vals = signed7 ? S7.map(n => n / 7) : (() => { const o = []; for (let i = -60; i <= 60; i++) if (i % 10) o.push(i / 10); for (let i = -600; i <= 600; i += 25) if (i % 100) o.push(i / 100); return o })()
    const neg = vals.filter(v => v < 0 && v > -6), posv = vals.filter(v => v > 0 && v < 6)
    let n = 0
    for (const a1 of neg) for (const a2 of neg) for (const b1 of posv) for (const b2 of posv) {
      if (!(a1 < a2 && b1 < b2)) continue; if (++n % (signed7 ? 7 : 37)) continue
      const key = b1 - a2, l1 = b1 - a1, l2 = b2 - a2
      const errs = [{ name: 'union length', v: b2 - a1 }, { name: 'length of the first interval', v: l1 }, { name: 'length of the second interval', v: l2 },
        { name: 'sum of the lengths', v: l1 + l2 }, { name: 'difference of the lengths', v: Math.abs(l1 - l2) }, { name: 'subtracts sizes across 0', v: Math.abs(Math.abs(b1) - Math.abs(a2)) }]
      yield { params: { first: [a1, b1], second: [a2, b2] }, key, errs, printed: [a1, b1, a2, b2].map(Math.abs) }
    }
  }
}
G.Q14 = () => run('Q14 overlap of two intervals (decimals)', intervals(false), 4)
G.Q22 = () => run('Q22 overlap of two intervals (signed sevenths)', intervals(true), 4)

G.Q46 = () => run('Q46 cut until no full piece is left, kerf per cut, leftover', function* () {
  for (let L10 = 20; L10 <= 80; L10++) for (let p100 = 35; p100 <= 125; p100 += 5) for (const w of [0.1, 0.2, 0.05]) {
    const L = L10 / 10, p = p100 / 100; let n = 0; while ((n + 1) * (p + w) <= L + 1e-9) n++
    const key = L - n * p - n * w; if (n < 2 || key < 0.05) continue
    const n0 = Math.floor(L / p + 1e-9)
    const errs = [{ name: 'ignores the kerf (pieces and leftover)', v: L - n0 * p }, { name: 'counts n - 1 cuts', v: L - n * p - (n - 1) * w },
      { name: 'right count, ignores the kerf in the leftover', v: L - n * p }, { name: 'kerf-free count, then subtracts the cuts', v: L - n0 * p - n0 * w }]
    yield { params: { board: L, piece: p, kerf: w, pieces: n }, key, errs, printed: [L, p, w] }
  }
}, 4)

function fold(signed7) {
  return function* () {
    const vals = signed7 ? S7.map(n => n / 7).filter(v => Math.abs(v) < 5) : (() => { const o = []; for (let i = -50; i <= 50; i++) if (i) o.push(i / 10); return o })()
    let n = 0
    for (const a of vals) for (const b of vals) for (const c of vals) {
      if (!(a < 0 && b > 0) || c === a || c === b || ++n % 5) continue
      const key = a + b - c, m = (a + b) / 2
      const errs = [{ name: 'reflects about 0', v: -c }, { name: 'translates by b - a instead of reflecting', v: c + (b - a) }, { name: 'gives the crease', v: m },
        { name: 'sign slip: a + b + c', v: a + b + c }, { name: 'distance from the crease', v: Math.abs(c - m) }]
      yield { params: { a, b, c }, key, errs, printed: [a, b, c].map(Math.abs) }
    }
  }
}
G.Q47 = () => run('Q47 number-line fold (decimals)', fold(false), 4)
G.Q26 = () => run('Q26 number-line fold (signed sevenths)', fold(true), 4)

G.Q16 = () => run('Q16 least product of two from a signed set (sevenths)', function* () {
  const P = S7.filter(n => Math.abs(n) <= 27)
  let n = 0
  for (const set of pick(P, 4)) {
    if (++n % 11) continue; if (!(set.some(x => x < 0) && set.some(x => x > 0))) continue
    const pr = []; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) pr.push({ v: set[i] * set[j] / 49, i, j })
    const vs = pr.map(p => p.v), key = Math.min(...vs); if (vs.filter(v => v === key).length > 1) continue
    const s = [...set].sort((a, b) => a - b), bySize = [...set].sort((a, b) => Math.abs(a) - Math.abs(b))
    const errs = [{ name: 'two least numbers', v: s[0] * s[1] / 49 }, { name: 'greatest product', v: Math.max(...vs) }, { name: 'two smallest in size', v: bySize[0] * bySize[1] / 49 },
      { name: 'two greatest numbers', v: s[2] * s[3] / 49 }, { name: 'greatest positive times the negative closest to 0', v: Math.max(...set) * Math.max(...set.filter(x => x < 0)) / 49 }]
    yield { params: { set: set.map(x => x + '/7') }, key, errs, printed: set.map(x => Math.abs(x) / 7) }
  }
}, 4)

G.Q16d = () => run('Q16 (decimal variant) least product of two from a signed set of x.5 decimals', function* () {
  const P = []; for (let i = -9; i <= 9; i++) P.push(i + 0.5)
  for (const set of pick(P, 4)) {
    if (!(set.some(x => x < 0) && set.some(x => x > 0))) continue
    const pr = []; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) pr.push(set[i] * set[j])
    const key = Math.min(...pr); if (pr.filter(v => v === key).length > 1) continue
    const s = [...set].sort((a, b) => a - b), bySize = [...set].sort((a, b) => Math.abs(a) - Math.abs(b))
    const errs = [{ name: 'two least numbers', v: s[0] * s[1] }, { name: 'greatest product', v: Math.max(...pr) }, { name: 'two smallest in size', v: bySize[0] * bySize[1] },
      { name: 'two greatest numbers', v: s[2] * s[3] }, { name: 'greatest positive times the negative closest to 0', v: Math.max(...set) * Math.max(...set.filter(x => x < 0)) }]
    yield { params: { set }, key, errs, printed: set.map(Math.abs) }
  }
}, 4)

G.Q40 = () => run('Q40 greatest quotient of two from a signed set (sevenths)', function* () {
  const P = S7.filter(n => Math.abs(n) <= 27)
  let n = 0
  for (const set of pick(P, 4)) {
    if (++n % 11) continue; if (!(set.some(x => x < 0) && set.some(x => x > 0))) continue
    const q = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (i !== j) q.push(set[i] / set[j])
    const key = Math.max(...q), s = [...set].sort((a, b) => a - b)
    const errs = [{ name: 'greatest divided by least', v: s[3] / s[0] }, { name: 'two greatest, larger over smaller', v: s[3] / s[2] }, { name: 'least quotient', v: Math.min(...q) },
      { name: 'least over greatest', v: s[0] / s[3] }, { name: 'greatest product instead', v: Math.max(s[0] * s[1], s[2] * s[3]) / 49 }]
    yield { params: { set: set.map(x => x + '/7') }, key, errs, printed: set.map(x => Math.abs(x) / 7) }
  }
}, 4)

G.Q17 = () => run('Q17 consecutive-pair signed sum closest to zero', function* () {
  for (let i = 0; i < 30000; i++) {
    let seed = (i * 2654435761) % 2147483648; const nx = () => (seed = (seed * 1103515245 + 12345) % 2147483648)
    const ch = []; for (let k = 0; k < 6; k++) { const w = 1 + nx() % 9, t = nx() % 10; ch.push((k % 2 ? -1 : 1) * (w + t / 10 + (k % 2 ? 0.02 : 0.07))) }
    const sums = ch.slice(1).map((x, k) => r2(x + ch[k])), sz = sums.map(Math.abs), mn = Math.min(...sz)
    if (sz.filter(s => s === mn).length > 1) continue
    const key = sums[sz.indexOf(mn)], ss = [...sums].sort((a, b) => Math.abs(a) - Math.abs(b))
    const errs = [{ name: 'second-closest pair', v: ss[1] }, { name: 'drops the sign of the sum', v: -key }, { name: 'greatest combined change', v: Math.max(...sums) },
      { name: 'least combined change', v: Math.min(...sums) }, { name: 'adds the sizes of the closest pair', v: Math.abs(ch[sz.indexOf(mn)]) + Math.abs(ch[sz.indexOf(mn) + 1]) }]
    yield { params: { changes: ch.map(r2) }, key, errs, printed: ch.map(x => r2(Math.abs(x))) }
  }
}, 4)

G.Q18 = () => run('Q18 telescoping signed product (-a/(a+1))...(-(n-1)/n)', function* () {
  for (let a = 1; a <= 5; a++) for (let n = a + 3; n <= 19; n++) {
    const cnt = n - a, sg = cnt % 2 ? -1 : 1, key = sg * a / n
    const errs = [{ name: 'wrong sign', v: -key }, { name: 'one factor short', v: -sg * a / (n - 1) }, { name: 'last factor only, with the sign', v: sg * (n - 1) / n },
      { name: 'first times last', v: (a / (a + 1)) * ((n - 1) / n) }, { name: 'cancels one step too far', v: sg * a / (n + 1) }, { name: 'last factor only, negative', v: -(n - 1) / n }]
    yield { params: { from: `-${a}/${a + 1}`, to: `-${n - 1}/${n}`, factors: cnt }, key, errs, printed: [a, a + 1, n - 1, n] }
  }
}, 4)

G.Q20 = () => run('Q20 total with one change entered with the wrong sign', function* () {
  for (const T of S7.filter(n => Math.abs(n) <= 30)) for (const e of S7.filter(n => n > 0 && n <= 30)) {
    const key = (T - 2 * e) / 7
    const errs = [{ name: 'subtracts the change once', v: (T - e) / 7 }, { name: 'reports the shown total', v: T / 7 }, { name: 'moves the wrong way by twice', v: (T + 2 * e) / 7 },
      { name: 'adds the change once', v: (T + e) / 7 }, { name: 'flips the sign of the shown total', v: -T / 7 }]
    yield { params: { shown: T + '/7', change: '+' + e + '/7 should be -' + e + '/7' }, key, errs, printed: [Math.abs(T) / 7, e / 7] }
  }
}, 4)

G.Q21 = () => run('Q21 total distance minus distance from start (signed sevenths)', function* () {
  const P = S7.filter(n => Math.abs(n) <= 30)
  let n = 0
  for (let i = 0; i < 60000; i++) {
    let seed = (i * 2654435761) % 2147483648; const nx = () => (seed = (seed * 1103515245 + 12345) % 2147483648)
    const m = [0, 1, 2, 3].map(() => P[nx() % P.length]); if (!(m.some(x => x < 0) && m.some(x => x > 0))) continue
    const sa = m.reduce((s, x) => s + Math.abs(x), 0), sm = m.reduce((s, x) => s + x, 0); if (!sm || sa === Math.abs(sm)) continue
    const key = (sa - Math.abs(sm)) / 7
    const errs = [{ name: 'total distance only', v: sa / 7 }, { name: 'distance from start only', v: Math.abs(sm) / 7 }, { name: 'adds the two', v: (sa + Math.abs(sm)) / 7 },
      { name: 'signed sum', v: sm / 7 }]
    yield { params: { moves: m.map(x => x + '/7') }, key, errs, printed: m.map(x => Math.abs(x) / 7) }
  }
}, 4)

G.Q24 = () => run('Q24 scale zero offset, true total of n readings', function* () {
  for (const o of [-0.4, -0.3, -0.2, 0.3, 0.2, 0.4, -0.6]) for (let n = 2; n <= 4; n++) for (let i = 0; i < 1500; i++) {
    let seed = (i * 2654435761 + n * 7) % 2147483648; const nx = () => (seed = (seed * 1103515245 + 12345) % 2147483648)
    const rd = Array.from({ length: n }, () => r2(1 + nx() % 6 + (nx() % 99 + 1) / 100)), sr = r2(rd.reduce((s, x) => s + x, 0))
    const key = r2(sr - n * o)
    const errs = [{ name: 'ignores the offset', v: sr }, { name: 'corrects once for the whole total', v: r2(sr - o) }, { name: 'corrects the wrong way n times', v: r2(sr + n * o) },
      { name: 'corrects the wrong way once', v: r2(sr + o) }, { name: 'corrects n - 1 times', v: r2(sr - (n - 1) * o) }]
    yield { params: { offset: o, readings: rd }, key, errs, printed: [...rd, Math.abs(o), n] }
  }
}, 4)

G.Q44 = () => run('Q44 thermometer offset cancels in a change (signed sevenths)', function* () {
  const P = S7.filter(n => Math.abs(n) <= 30)
  for (const o of [-12, -9, -5, -3, 3, 5, 9, 12, -10, 10, 4, -4]) for (const r1 of P) for (const r2_ of P) {
    if (!(r1 < 0 && r2_ > 0) && !(r1 > 0 && r2_ < 0)) continue
    const key = (r2_ - r1) / 7
    const errs = [{ name: 'subtracts the offset once', v: (r2_ - r1 - o) / 7 }, { name: 'adds the offset once', v: (r2_ - r1 + o) / 7 }, { name: 'subtracts the offset twice', v: (r2_ - r1 - 2 * o) / 7 },
      { name: 'subtracts sizes across 0', v: (Math.abs(r2_) - Math.abs(r1)) / 7 }, { name: 'corrected second reading minus first', v: (r2_ - o - r1) / 7 }]
    yield { params: { offset: o + '/7', first: r1 + '/7', second: r2_ + '/7' }, key, errs, printed: [Math.abs(o), Math.abs(r1), Math.abs(r2_)].map(x => x / 7) }
  }
}, 4)

G.Q25 = () => run('Q25 divided by f instead of multiplying; correct = R f^2', function* () {
  for (let p = 1; p <= 9; p++) for (let q = 2; q <= 9; q++) for (let a = -30; a <= 30; a++) for (let b = 1; b <= 9; b++) {
    if (!a || g(p, q) !== 1 || g(Math.abs(a), b) !== 1 || p === q) continue
    const f = -p / q, R = a / b, key = R * f * f
    const errs = [{ name: 'multiplies R by f once (recovers the original number)', v: R * f }, { name: 'divides R by f again', v: R / f }, { name: 'reports R', v: R }, { name: 'sign slip on f^2', v: -key }]
    yield { params: { f: `-${p}/${q}`, R: `${a}/${b}` }, key, errs, printed: [p, q, Math.abs(a), b] }
  }
}, 4)

G.Q27 = () => run('Q27 signs before three numbers, value closest to 0 (first sign +)', function* () {
  const P = S7.filter(n => n > 7 && n <= 34)
  for (const [x, y, z] of pick(P, 3)) {
    const v = []; for (const s1 of [1, -1]) for (const s2 of [1, -1]) v.push({ v: (x + s1 * y + s2 * z) / 7, s: [s1, s2] })
    const sz = v.map(o => Math.abs(o.v)), mn = Math.min(...sz); if (sz.filter(s => s === mn).length > 1 || !mn) continue
    const key = v[sz.indexOf(mn)].v, rest = v.filter(o => Math.abs(o.v) !== mn).map(o => o.v)
    const errs = [{ name: 'all plus', v: (x + y + z) / 7 }, { name: 'plus then minuses', v: (x - y - z) / 7 }, ...rest.map((r, i) => ({ name: 'another sign choice ' + i, v: r })), { name: 'drops the sign of the result', v: -key }]
    yield { params: { numbers: [x, y, z].map(n => n + '/7') }, key, errs, printed: [x, y, z].map(n => n / 7) }
  }
}, 4)

G.Q29 = () => run('Q29 choose a, b, c from a signed set to maximise a - b x c', function* () {
  for (let i = 0; i < 20000; i++) {
    let seed = (i * 2654435761) % 2147483648; const nx = () => (seed = (seed * 1103515245 + 12345) % 2147483648)
    const set = []; while (set.length < 5) { const v = ((nx() % 2) ? -1 : 1) * (1 + nx() % 40) / 10; if (!set.includes(v)) set.push(v) }
    if (!(set.some(x => x < 0) && set.some(x => x > 0))) continue
    let best = -Infinity, bestPlus = -Infinity, bestSmall = null
    for (const [a, b, c] of perms([0, 1, 2, 3, 4]).map(p => p.slice(0, 3))) { const v = set[a] - set[b] * set[c]; if (v > best) best = v; bestPlus = Math.max(bestPlus, set[a] + set[b] * set[c]) }
    const s = [...set].sort((x, y) => x - y), amax = (ex) => Math.max(...set.filter(x => !ex.includes(x)))
    const e1 = amax([s[0], s[1]]) - s[0] * s[1], e2 = amax([s[3], s[4]]) - s[3] * s[4]
    const bs = [...set].sort((x, y) => Math.abs(x) - Math.abs(y)); const e4 = amax([bs[0], bs[1]]) - bs[0] * bs[1]
    const errs = [{ name: 'b, c the two least numbers', v: r2(e1) }, { name: 'b, c the two greatest numbers', v: r2(e2) }, { name: 'maximises a + b x c', v: r2(bestPlus) }, { name: 'b, c smallest in size', v: r2(e4) }]
    yield { params: { set }, key: r2(best), errs, printed: set.map(Math.abs) }
  }
}, 4)

G.Q31 = () => run('Q31 x^3 + c = d, x negative fraction', function* () {
  for (const q of [3, 5, 7]) for (let p = 1; p <= 9; p++) for (let r = -9; r <= 9; r++) {
    if (!r || g(p, q) !== 1 || g(Math.abs(r), q) !== 1 || p === Math.abs(r) || (p ** 3 - r ** 3) % 2) continue
    const Q = q ** 3, x = -p / q, X = -(p ** 3), Y = r ** 3, cN = (Y - X) / 2, dN = (X + Y) / 2
    if (!cN) continue
    const errs = [{ name: 'adds c instead of subtracting', v: r / q }, { name: 'drops the sign', v: p / q }, { name: 'adds c and drops the sign', v: -r / q }]
    yield { params: { equation: `x^3 + ${cN}/${Q} = ${dN}/${Q}` }, key: x, errs, printed: [Math.abs(cN), Math.abs(dN), Q, 3].filter(Boolean) }
  }
}, 4)

G.Q34 = () => run('Q34 circumference with 22/7 minus with 3.14', function* () {
  for (let d = 1; d <= 100; d++) {
    const key = d * (22 / 7 - 3.14)
    const errs = [{ name: 'uses d as the radius', v: 2 * d * (22 / 7 - 3.14) }, { name: 'difference of the two values of pi only', v: 22 / 7 - 3.14 },
      { name: 'area difference instead', v: (d / 2) ** 2 * (22 / 7 - 3.14) }, { name: 'reads 22/7 as 3.17', v: d * (3.17 - 3.14) }, { name: 'reads 22/7 as 3.1', v: d * (3.14 - 3.1) }]
    yield { params: { d }, key, errs, printed: [d, 22, 7, 3.14] }
  }
}, 4)

G.Q35 = () => run('Q35 one averaging step for sqrt(n) from guess g', function* () {
  for (let n = 5; n <= 99; n++) { if (Number.isInteger(Math.sqrt(n))) continue
    for (const gg of [Math.floor(Math.sqrt(n)), Math.ceil(Math.sqrt(n))]) {
      const key = (gg + n / gg) / 2
      const errs = [{ name: 'n / g only', v: n / gg }, { name: '(g + n)/2', v: (gg + n) / 2 }, { name: 'correction only (n - g^2)/(2g)', v: (n - gg * gg) / (2 * gg) },
        { name: 'g + (n - g^2)/g (no halving of the correction)', v: gg + (n - gg * gg) / gg }, { name: 'g - (n - g^2)/(2g)', v: gg - (n - gg * gg) / (2 * gg) }]
      yield { params: { n, guess: gg }, key, errs, printed: [n, gg, 2] }
    } }
}, 4)

G.Q42 = () => run('Q42 side of a square with area = sum of two squares (fraction sides)', function* () {
  const T = []; for (let a = 1; a <= 40; a++) for (let b = a + 1; b <= 40; b++) { const h = Math.sqrt(a * a + b * b); if (Number.isInteger(h)) T.push([a, b, h]) }
  for (const [a, b, h] of T) for (const q of [3, 7, 9, 11, 13]) {
    if (g(h, q) !== 1 || g(a, q) !== 1 || g(b, q) !== 1) continue
    const key = h / q
    const errs = [{ name: 'adds the sides', v: (a + b) / q }, { name: 'subtracts the sides', v: (b - a) / q },      { name: 'area sum, no root', v: (a * a + b * b) / (q * q) }, { name: 'adds the sides and halves', v: (a + b) / (2 * q) }]
    yield { params: { sides: [`${a}/${q}`, `${b}/${q}`] }, key, errs, printed: [a, b, q] }
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
else { console.error('usage: node gen8.mjs <' + Object.keys(G).join('|') + '> | --all | --diag [ids]'); process.exit(2) }
