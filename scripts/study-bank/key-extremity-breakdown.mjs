#!/usr/bin/env node
/**
 * key-extremity-breakdown.mjs [--self-test] [--json out.json]
 *
 * Population breakdown of "the key is the largest or smallest option" across
 * the LIVE maths bank of every family (sat, act, ssat, isee), written
 * 2026-10-02 to characterise check-key-extremity.mjs's 31.6% before anyone
 * proposes a repair. Read-only. No model calls.
 *
 * What it does differently from check-key-extremity.mjs, and why:
 *   - FAMILY-FILTERED (family = X, section = math, verified, not archived),
 *     paged with .order('id'), and asserts loaded == count(head) == distinct
 *     ids before printing a number. check-math-hub once scored 113 ACT rows
 *     as SAT for want of a family filter.
 *   - The chance line is DERIVED PER ITEM: (options whose value equals the
 *     min or the max) / k. Distinct values give 2/k; a tie at an extreme
 *     raises it. It is never a literal, and 5-choice SSAT gets 40%, not 50%.
 *   - Parses radicals, pi, fractions, mixed numbers, decimals, U+2212 and
 *     implicit multiplication with a small safe evaluator (no eval). Any
 *     option it cannot read makes the whole item NON-NUMERIC: counted and
 *     reported, never scored, never guessed at.
 *   - Simulates the exploit exactly: strike every option at the min or max
 *     value, guess uniformly among the rest; on a non-numeric item guess
 *     uniformly among all k. Expected score over the item population is an
 *     exact number, not an estimate.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/* ---------- tiny safe numeric evaluator ---------- */
export function val(raw) {
  let s = String(raw).trim()
    .replace(/[−–]/g, '-').replace(/×|⋅|·/g, '*').replace(/÷/g, '/')
    .replace(/^\$\s*/, '').replace(/^-\s*\$/, '-').replace(/%$/, '').replace(/\s*(degrees|°)$/, '')
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '')
  const mixed = s.match(/^(-?)(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) return (mixed[1] ? -1 : 1) * (Number(mixed[2]) + Number(mixed[3]) / Number(mixed[4]))
  if (/[a-oq-zA-OQ-Z]/.test(s.replace(/pi/g, ''))) return NaN   // any variable / unit / word
  s = s.replace(/pi/g, 'π')
  let i = 0
  const peek = () => s[i], skip = () => { while (s[i] === ' ') i++ }
  function num() {
    skip(); const m = s.slice(i).match(/^\d+(\.\d+)?|^\.\d+/)
    if (!m) return null; i += m[0].length; return Number(m[0])
  }
  function atom() {
    skip(); const c = peek()
    if (c === '(') { i++; const v = expr(); skip(); if (s[i] !== ')') throw 0; i++; return v }
    if (c === '√') { i++; return Math.sqrt(power()) }
    if (c === 'π') { i++; return Math.PI }
    const n = num(); if (n === null) throw 0; return n
  }
  function power() { const b = atom(); skip(); if (s[i] === '^') { i++; return b ** unary() } return b }
  function unary() { skip(); if (s[i] === '-') { i++; return -unary() } if (s[i] === '+') { i++; return unary() } return power() }
  function term() {
    let v = unary()
    for (;;) {
      skip(); const c = peek()
      if (c === '*') { i++; v *= unary() } else if (c === '/') { i++; v /= unary() }
      else if (c === '(' || c === '√' || c === 'π' || (c && /\d/.test(c))) v *= power()   // implicit
      else return v
    }
  }
  function expr() {
    let v = term()
    for (;;) { skip(); const c = peek(); if (c === '+') { i++; v += term() } else if (c === '-') { i++; v -= term() } else return v }
  }
  try { const v = expr(); skip(); return i === s.length && Number.isFinite(v) ? v : NaN } catch { return NaN }
}
const eq = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))

/** null = not scorable; else { k, ext (key at extreme), m (survivors after strike), cExt (# options at an extreme), rank } */
export function scoreItem(choices, key) {
  const k = choices.length
  const ki = choices.findIndex(c => String(c) === String(key))
  if (ki < 0) return { skip: 'key-not-in-choices', k }
  const v = choices.map(val)
  if (v.some(x => !Number.isFinite(x))) return { skip: 'non-numeric', k }
  const mn = Math.min(...v), mx = Math.max(...v)
  if (eq(mn, mx)) return { skip: 'all-equal', k }
  const atExt = v.map(x => eq(x, mn) || eq(x, mx))
  const cExt = atExt.filter(Boolean).length
  const rank = 1 + v.filter(x => x < v[ki] && !eq(x, v[ki])).length
  return { k, ext: atExt[ki], cExt, m: k - cExt, rank, keyMin: eq(v[ki], mn), keyMax: eq(v[ki], mx) }
}

/* ---------- self-test: must reproduce known answers before touching live data ---------- */
function selfTest() {
  const cases = [
    ['3√13', 3 * Math.sqrt(13)], ['√117', Math.sqrt(117)], ['2√3/3', 2 * Math.sqrt(3) / 3], ['(√3)/2', Math.sqrt(3) / 2],
    ['4π', 4 * Math.PI], ['π/3', Math.PI / 3], ['−5', -5], ['$1,250', 1250], ['12%', 12], ['-3 1/2', -3.5],
    ['7/8', 0.875], ['.5', 0.5], ['2^10', 1024], ['x + 3', NaN], ['12 cm', NaN], ['none of these', NaN], ['36π', 36 * Math.PI],
  ]
  let bad = 0
  for (const [s, want] of cases) { const got = val(s); if (!(Number.isNaN(want) ? Number.isNaN(got) : eq(got, want))) { bad++; console.error('val FAIL', s, got, want) } }
  const t = [
    [['1', '2', '3', '4'], '1', { ext: true, cExt: 2, m: 2 }],
    [['1', '2', '3', '4'], '3', { ext: false, cExt: 2, m: 2 }],
    [['1', '1', '3', '4'], '1', { ext: true, cExt: 3, m: 1 }],     // tie at the min: chance 3/4
    [['5', '1', '2', '3', '4'], '3', { ext: false, cExt: 2, m: 3 }],
    [['3√13', '√117', '6', '13'], '3√13', { ext: false, cExt: 2, m: 2 }], // equal pair in the middle: 6 < 10.8 = 10.8 < 13
  ]
  for (const [c, k, want] of t) { const r = scoreItem(c, k); for (const f in want) if (r[f] !== want[f]) { bad++; console.error('score FAIL', c, k, f, r[f], want[f]) } }
  // break test: on a set whose key is the max, swapping the key into the middle must flip ext
  if (scoreItem(['2', '4', '6', '9'], '9').ext !== true || scoreItem(['2', '4', '6', '9'], '6').ext !== false) { bad++; console.error('break FAIL') }
  if (bad) { console.error(`self-test: ${bad} FAILURES`); process.exit(2) }
  console.log(`self-test: ${cases.length + t.length + 1} checks pass`)
}

/* ---------- stats ---------- */
function wilson(x, n, z = 1.96) {
  if (!n) return [NaN, NaN]; const p = x / n, d = 1 + z * z / n
  const c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
  return [c - h, c + h]
}
function lgamma(x) { const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]
  let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const c of g) s += c / ++y; return -t + Math.log(2.5066282746310005 * s / x) }
function gammaQ(a, x) { // upper regularised incomplete gamma
  if (x < a + 1) { let sum = 1 / a, del = sum, ap = a; for (let n = 0; n < 500; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-14) break } return 1 - sum * Math.exp(-x + a * Math.log(x) - lgamma(a)) }
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d; for (let i = 1; i < 500; i++) { const an = -i * (i - a); b += 2; d = an * d + b; d = 1 / d; c = b + an / c; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-14) break }
  return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h }
const chi2p = (x, df) => df > 0 ? gammaQ(df / 2, x / 2) : NaN
/** Poisson-binomial z for observed extremes vs per-item chance */
function agg(items) {
  const sc = items.filter(r => r.s && !r.s.skip)
  const n = sc.length, ext = sc.filter(r => r.s.ext).length
  const exp = sc.reduce((a, r) => a + r.s.cExt / r.s.k, 0)
  const vr = sc.reduce((a, r) => { const p = r.s.cExt / r.s.k; return a + p * (1 - p) }, 0)
  const z = vr ? (ext - exp) / Math.sqrt(vr) : NaN
  // exploit: strike extremes, guess the rest; non-numeric -> guess among k
  let strike = 0, base = 0, strikeMax = 0, strikeMin = 0
  const gains = []
  for (const r of items) {
    if (!r.s || r.s.skip === 'key-not-in-choices') continue
    const k = r.s.k; base += 1 / k
    let g
    if (r.s.skip) g = 1 / k
    else g = r.s.ext ? 0 : 1 / r.s.m
    strike += g; gains.push(g - 1 / k)
    if (!r.s.skip) { strikeMax += r.s.keyMax ? 0 : 1 / (k - 1); strikeMin += r.s.keyMin ? 0 : 1 / (k - 1) }
    else { strikeMax += 1 / k; strikeMin += 1 / k }
  }
  const N = gains.length
  const mean = N ? gains.reduce((a, b) => a + b, 0) / N : NaN
  const sd = N > 1 ? Math.sqrt(gains.reduce((a, b) => a + (b - mean) ** 2, 0) / (N - 1)) : NaN
  return { total: items.length, n, skipped: items.length - n, ext, exp, rate: n ? ext / n : NaN, chance: n ? exp / n : NaN, z, ci: wilson(ext, n),
    N, gainPts: 100 * mean, gainSd: sd, strikeRate: N ? strike / N : NaN, baseRate: N ? base / N : NaN,
    maxOnlyPts: N ? 100 * (strikeMax - base) / N : NaN, minOnlyPts: N ? 100 * (strikeMin - base) / N : NaN,
    deficit: exp - ext }
}
/** heterogeneity across groups: chi-square of observed vs per-group expected under ONE common odds shift */
function hetero(groups) {
  // compare each group's ext/n to the pooled RATE RATIO (obs/exp) applied to its own chance line
  const tot = groups.reduce((a, g) => ({ ext: a.ext + g.ext, exp: a.exp + g.exp }), { ext: 0, exp: 0 })
  const ratio = tot.ext / tot.exp
  let x2 = 0, df = 0
  for (const g of groups) { if (g.n < 1) continue
    const e1 = g.exp * ratio, e0 = g.n - e1
    if (e1 <= 0 || e0 <= 0) continue
    x2 += (g.ext - e1) ** 2 / e1 + ((g.n - g.ext) - e0) ** 2 / e0; df++ }
  df -= 1
  return { x2, df, p: chi2p(x2, df), ratio }
}

const f1 = x => (100 * x).toFixed(1)
function line(label, a) {
  if (!a.n) return `${label.padEnd(34)} n=0 scorable of ${a.total} — NOT MEASURED`
  return `${label.padEnd(34)} ${String(a.ext).padStart(4)}/${String(a.n).padEnd(4)} = ${f1(a.rate).padStart(5)}%  chance ${f1(a.chance).padStart(5)}%  diff ${(100 * (a.rate - a.chance)).toFixed(1).padStart(6)}  z ${a.z.toFixed(1).padStart(5)}  [${f1(a.ci[0])}-${f1(a.ci[1])}]  skip ${a.skipped}  deficit ${a.deficit.toFixed(1)}`
}

/* ---------- main ---------- */
if (import.meta.url !== pathToFileURL(process.argv[1]).href) { /* imported: export only */ } else {
if (process.argv.includes('--self-test')) { selfTest(); process.exit(0) }
selfTest()
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null
const env = { ...Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()])), ...process.env }
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const out = {}
for (const family of ['sat', 'act', 'ssat', 'isee']) {
  const rows = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('study_item_bank').select('id,family,section,domain,difficulty,cohort,item,verify_meta')
      .eq('family', family).eq('section', 'math').eq('verified', true).eq('archived', false).order('id').range(f, f + 999)
    if (error) { console.error('read failed:', error.message); process.exit(2) }
    rows.push(...data); if (data.length < 1000) break
  }
  const { count, error } = await db.from('study_item_bank').select('id', { count: 'exact', head: true })
    .eq('family', family).eq('section', 'math').eq('verified', true).eq('archived', false)
  if (error) { console.error(error.message); process.exit(2) }
  const distinct = new Set(rows.map(r => r.id)).size
  if (!rows.length || rows.length !== count || distinct !== count || rows.some(r => r.family !== family)) {
    console.error(`${family}: loaded ${rows.length}, count ${count}, distinct ${distinct} — refusing to print a number`); process.exit(2) }
  const items = rows.map(r => ({ ...r, s: Array.isArray(r.item?.choices) ? scoreItem(r.item.choices.map(String), r.item.correct_answer) : { skip: 'no-choices', k: 0 } }))
  const skips = {}; for (const r of items) if (r.s.skip) skips[r.s.skip] = (skips[r.s.skip] || 0) + 1
  const A = agg(items)
  console.log(`\n=== ${family.toUpperCase()} MATH  live ${count} (loaded ${rows.length}, distinct ${distinct})  skips ${JSON.stringify(skips)}`)
  console.log(line('ALL', A))
  console.log(`  exploit: strike both extremes ${f1(A.strikeRate)}% vs guess ${f1(A.baseRate)}%  gain ${A.gainPts.toFixed(2)} pts/item (exact over ${A.N})  | strike max only ${A.maxOnlyPts.toFixed(2)}  strike min only ${A.minOnlyPts.toFixed(2)}`)
  const ranks = {}; for (const r of items) if (!r.s.skip) { const k = `k${r.s.k}`; ranks[k] ??= Array(r.s.k).fill(0); ranks[k][r.s.rank - 1]++ }
  console.log('  key rank by value (1 = smallest):', JSON.stringify(ranks))
  const fam = { A, skips, count, groups: {} }
  for (const [dim, keyf] of [['cohort', r => r.cohort], ['domain', r => r.domain], ['difficulty', r => r.difficulty], ['k', r => `k=${r.s.k}`]]) {
    const by = new Map(); for (const r of items) { const g = keyf(r) ?? '(null)'; if (!by.has(g)) by.set(g, []); by.get(g).push(r) }
    const gs = [...by.entries()].map(([g, its]) => [g, agg(its)]).sort((a, b) => b[1].n - a[1].n)
    const h = hetero(gs.map(x => x[1]))
    console.log(`  -- by ${dim}: heterogeneity chi2=${h.x2.toFixed(1)} df=${h.df} p=${h.p < 1e-4 ? h.p.toExponential(1) : h.p.toFixed(3)}  (pooled obs/exp ${h.ratio.toFixed(3)})`)
    for (const [g, a] of gs) console.log('    ' + line(String(g), a))
    fam.groups[dim] = { hetero: h, rows: Object.fromEntries(gs) }
  }
  if (family === 'sat') {
    const rep = items.filter(r => r.verify_meta && 'legacy_choices' in r.verify_meta)
    const before = rep.map(r => ({ ...r, s: scoreItem(r.verify_meta.legacy_choices.map(String), r.item.correct_answer) }))
    console.log(`  -- hub-repaired items (verify_meta.legacy_choices), n=${rep.length}`)
    console.log('    ' + line('BEFORE repair (legacy_choices)', agg(before)))
    console.log('    ' + line('AFTER repair (current choices)', agg(rep)))
    console.log('    ' + line('v2 NOT repaired', agg(items.filter(r => r.cohort === 'v2' && !rep.includes(r)))))
    const recent = c => /v1[6-9]|v2\d|alg19/.test(c ?? '')
    console.log('    ' + line('non-v2 (all)', agg(items.filter(r => r.cohort !== 'v2'))))
    console.log('    ' + line('recent: sat-math-v16/v17/v18', agg(items.filter(r => recent(r.cohort)))))
    fam.repaired = { before: agg(before), after: agg(rep) }
  }
  out[family] = fam
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(out, null, 1))
}
