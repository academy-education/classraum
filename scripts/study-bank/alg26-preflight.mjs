#!/usr/bin/env node
/**
 * alg26-preflight.mjs [--selftest] [--merge] <batch.json ...>
 *
 * Mechanical pre-freeze checks for sat-math-v26-alg (PREREG-ALG26-2026-10-08.md),
 * written before any v26 item exists. Authors run it on their own file while
 * authoring; I run it with --merge on the four files together. Several files are
 * checked as ONE batch. v25's alg25-preflight rules R1-R5 are kept (imported
 * where unchanged); R2 is widened and R6-R9 are new.
 *
 *   R1  shape        4 choices, all numeric, Algebra, key among the choices
 *   R2  setup        `setup` {i, ii, iii} on every item; no two items share a full
 *                    triple, or (i)+(iii), or (within one mechanism) (i)+(ii); no
 *                    triple equal to ANY of the 66 v23/v24/v25 reference triples
 *                    (alg26-reference-triples.json, count asserted)
 *   R3  plain text   no U+2010-U+2015, U+2212, U+FE63, U+FF0D; no k^2 anywhere
 *   R4  non-integer  as v25: at most 2, every one declared, not all offering the
 *       constant     integer-k answer
 *   R5  off-by-one   key +- 1, or a declared `off_by_one_options` value next to the
 *                    key: per author A <= 2, B <= 1, C <= 3, D <= 2 (batch <= 8)
 *   R6  slot         every item's id is a commissioned slot; `mech` is the author's
 *                    mechanism; `ask` is the slot's ask; the key's VALUE RANK among
 *                    the four options (1 = smallest .. 4 = largest) is the slot's rank
 *   R7  cross-item   (--merge, barred) the best rule "on ask type T pick rank r",
 *       rules        one r per T, hits <= 40% of the batch, on the six-type ask
 *                    partition AND the coarse four-type one (count+difference /
 *                    sum / greatest+least / value); the best "on mechanism M pick
 *                    rank r" rule <= 40%; within every ask type with >= 4 items no
 *                    rank holds more than 50%. Without --merge: printed only.
 *   R8  mechanisms   (--merge) >= 4 distinct, <= 10 items per mechanism
 *   R9  keys         no two items share a key value
 *
 * Exit 1 on a failed rule, 2 if it cannot read its input.
 */
import { readFileSync } from 'node:fs'

const DIR = new URL('.', import.meta.url).pathname

export const MECH = { A: 'interval-bound', B: 'degenerate-parameter', C: 'integer-count-condition', D: 'integer-optimum' }
export const OBO_CAP = { A: 2, B: 1, C: 3, D: 2 }
export const ASKS = ['count', 'sum', 'difference', 'greatest', 'least', 'value']
export const COARSE = { count: 'range-size', difference: 'range-size', sum: 'sum', greatest: 'extreme', least: 'extreme', value: 'value' }
// slot -> [ask, key rank by value (1 smallest .. 4 largest)]
export const SLOTS = {
  A1: ['count', 1], A2: ['count', 4], A3: ['sum', 2], A4: ['sum', 4], A5: ['difference', 1], A6: ['difference', 3], A7: ['greatest', 2], A8: ['least', 4],
  B1: ['count', 2], B2: ['count', 4], B3: ['sum', 1], B4: ['sum', 3], B5: ['greatest', 4], B6: ['least', 1], B7: ['value', 1], B8: ['value', 3],
  C1: ['count', 1], C2: ['count', 3], C3: ['sum', 4], C4: ['difference', 2], C5: ['difference', 4], C6: ['greatest', 3], C7: ['greatest', 1], C8: ['least', 2],
  D1: ['count', 3], D2: ['sum', 1], D3: ['difference', 2], D4: ['greatest', 3], D5: ['least', 4], D6: ['least', 1], D7: ['value', 2], D8: ['value', 4],
}
const norm = s => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
const DASH = /[‐-―−﹣－]/
const KSQ = /k\s*\^\s*2|k²|k\s*\*\s*k\b|k\s*\*\*\s*2/
const isNonintStem = p => /\bvalues? (of |that )?k\b|\bvalues? k can\b|\bk can take\b/i.test(p) && /\binteger/i.test(p) && !/integer values? of k/i.test(p)

export function val(s) {
  const t = String(s).trim()
  let m = t.match(/^(-?\d+(?:\.\d+)?)$/); if (m) return Number(m[1])
  m = t.match(/^(-?)(\d+)\s*\/\s*(\d+)$/); if (m) return (m[1] ? -1 : 1) * Number(m[2]) / Number(m[3])
  return NaN
}
export function rank(choices, key) {
  const v = choices.map(val), k = val(key)
  if (v.some(Number.isNaN) || Number.isNaN(k)) return null
  return 1 + v.filter(x => x < k - 1e-12).length
}
const slotOf = id => String(id).replace(/^SM26L-/, '')

/** best "on group g pick rank r" rule: sum over groups of the largest rank count */
export function bestRule(items, groupOf) {
  const g = {}
  for (const x of items) { const k = groupOf(x), r = rank(x.choices.map(String), String(x.correct_answer)); if (r == null) continue; (g[k] ??= [0, 0, 0, 0, 0])[r]++ }
  let hits = 0; const rule = {}
  for (const [k, c] of Object.entries(g)) { const m = Math.max(...c); hits += m; rule[k] = `${c.indexOf(m)}(${m}/${c.reduce((a, b) => a + b, 0)})` }
  return { hits, rule, groups: g }
}

export function check(items, { merge = false, refs = null } = {}) {
  const fails = [], notes = []
  if (!Array.isArray(items) || !items.length) throw new Error('no items')
  const ids = items.map(x => x.id)
  if (new Set(ids).size !== ids.length) fails.push('R1 duplicate ids')
  for (const x of items) {
    const ch = (x.choices || []).map(String)
    if (ch.length !== 4) fails.push(`R1 ${x.id}: ${ch.length} choices`)
    if (!ch.includes(String(x.correct_answer))) fails.push(`R1 ${x.id}: key not among choices`)
    if (ch.some(c => Number.isNaN(val(c)))) fails.push(`R1 ${x.id}: non-numeric option (${ch.join(' | ')})`)
    if (new Set(ch.map(val)).size !== 4) fails.push(`R1 ${x.id}: two options have the same value`)
    if (x.domain !== 'Algebra') fails.push(`R1 ${x.id}: domain ${x.domain}`)
  }
  // R2
  const trip = x => x.setup && [norm(x.setup.i), norm(x.setup.ii), norm(x.setup.iii)]
  const refSet = new Map((refs || []).map(r => [[norm(r.i), norm(r.ii), norm(r.iii)].join('|'), r.id]))
  for (const x of items) {
    const t = trip(x)
    if (!t || t.some(v => !v)) { fails.push(`R2 ${x.id}: setup {i,ii,iii} missing`); continue }
    if (refSet.has(t.join('|'))) fails.push(`R2 ${x.id}: setup equals reference ${refSet.get(t.join('|'))}`)
  }
  for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) {
    const A = trip(items[a]), B = trip(items[b]); if (!A || !B) continue
    const pair = `${items[a].id} / ${items[b].id}`
    if (A.join('|') === B.join('|')) fails.push(`R2 ${pair}: same full triple`)
    else if (A[0] === B[0] && A[2] === B[2]) fails.push(`R2 ${pair}: share (i) and (iii)`)
    else if (A[0] === B[0] && A[1] === B[1] && items[a].mech === items[b].mech) fails.push(`R2 ${pair}: share (i) and (ii) in one mechanism`)
  }
  // R3
  for (const x of items) {
    if (DASH.test(JSON.stringify(x))) fails.push(`R3 ${x.id}: non-ASCII dash`)
    for (const f of ['prompt', 'explanation', 'solve']) if (KSQ.test(String(x[f] ?? ''))) fails.push(`R3 ${x.id}: k-squared in ${f}`)
    for (const [o, body] of Object.entries(x.distractor_solve || {})) if (KSQ.test(body)) fails.push(`R3 ${x.id}: k-squared in distractor_solve ${o}`)
  }
  // R4
  const ni = items.filter(x => x.nonint_constant === true || isNonintStem(String(x.prompt)))
  for (const x of ni) {
    if (x.nonint_constant !== true) fails.push(`R4 ${x.id}: asks about values of k with an integer condition but is not declared nonint_constant`)
    else if (x.integer_k_answer == null) fails.push(`R4 ${x.id}: declared nonint_constant without integer_k_answer`)
  }
  if (ni.length > 2) fails.push(`R4 ${ni.length} non-integer-constant items (cap 2)`)
  const offers = ni.filter(x => x.integer_k_answer != null && x.choices.map(String).includes(String(x.integer_k_answer)))
  if (ni.length && offers.length === ni.length) fails.push(`R4 every non-integer-constant item (${ni.length}) offers its integer-k answer`)
  notes.push(`R4 non-integer-constant ${ni.length} (cap 2); offering the integer-k answer ${offers.length} of ${ni.length}`)
  // R5
  const obo = items.filter(x => {
    const key = String(x.correct_answer), k = val(key)
    if (x.choices.some(c => String(c) !== key && Math.abs(Math.abs(val(c) - k) - 1) < 1e-9)) return true
    const sorted = x.choices.map(String).sort((a, b) => val(a) - val(b)), ki = sorted.indexOf(key)
    const nb = [sorted[ki - 1], sorted[ki + 1]].filter(Boolean)
    return (x.off_by_one_options || []).map(String).some(o => nb.includes(o))
  })
  const byAuthor = {}
  for (const x of obo) { const a = slotOf(x.id)[0]; byAuthor[a] = (byAuthor[a] || 0) + 1 }
  for (const [a, n] of Object.entries(byAuthor)) if (n > (OBO_CAP[a] ?? 0)) fails.push(`R5 author ${a}: off-by-one next to the key on ${n} (cap ${OBO_CAP[a] ?? 0})`)
  if (obo.length > 8) fails.push(`R5 off-by-one next to the key on ${obo.length} > 8`)
  notes.push(`R5 off-by-one next to the key ${obo.length} of ${items.length}${obo.length ? ': ' + obo.map(x => x.id).join(',') : ''}`)
  // R6
  const pos = [0, 0, 0, 0, 0]
  for (const x of items) {
    const s = slotOf(x.id), want = SLOTS[s]
    const r = rank(x.choices.map(String), String(x.correct_answer)); if (r) pos[r]++
    if (!want) { fails.push(`R6 ${x.id}: not a commissioned slot`); continue }
    if (x.mech !== MECH[s[0]]) fails.push(`R6 ${x.id}: mech "${x.mech}" != "${MECH[s[0]]}"`)
    if (x.ask !== want[0]) fails.push(`R6 ${x.id}: ask "${x.ask}" != slot ask "${want[0]}"`)
    if (r !== want[1]) fails.push(`R6 ${x.id}: key rank ${r} != slot rank ${want[1]}`)
  }
  notes.push(`R6 key rank 1/2/3/4 = ${pos.slice(1).join('/')}; extreme ${pos[1] + pos[4]}/${items.length} = ${(100 * (pos[1] + pos[4]) / items.length).toFixed(1)}%`)
  // R7
  const n = items.length, cap = 0.4 * n
  const fine = bestRule(items, x => x.ask), coarse = bestRule(items, x => COARSE[x.ask] ?? x.ask), mech = bestRule(items, x => x.mech)
  notes.push(`R7 best ask->rank rule ${fine.hits}/${n} = ${(100 * fine.hits / n).toFixed(1)}%  ${JSON.stringify(fine.rule)}`)
  notes.push(`R7 best coarse-ask->rank rule ${coarse.hits}/${n} = ${(100 * coarse.hits / n).toFixed(1)}%  ${JSON.stringify(coarse.rule)}`)
  notes.push(`R7 best mechanism->rank rule ${mech.hits}/${n} = ${(100 * mech.hits / n).toFixed(1)}%`)
  const perAsk = []
  for (const [k, c] of Object.entries(fine.groups)) { const t = c.reduce((a, b) => a + b, 0), m = Math.max(...c); if (t >= 4 && m / t > 0.5) perAsk.push(`${k} rank ${c.indexOf(m)} on ${m}/${t}`) }
  if (merge) {
    if (fine.hits > cap) fails.push(`R7 ask->rank rule hits ${fine.hits}/${n} > 40%`)
    if (coarse.hits > cap) fails.push(`R7 coarse ask->rank rule hits ${coarse.hits}/${n} > 40%`)
    if (mech.hits > cap) fails.push(`R7 mechanism->rank rule hits ${mech.hits}/${n} > 40%`)
    for (const p of perAsk) fails.push(`R7 within one ask type ${p} > 50%`)
    // R8
    const m = {}; for (const x of items) m[x.mech] = (m[x.mech] || 0) + 1
    notes.push(`R8 mechanisms ${JSON.stringify(m)}`)
    if (Object.keys(m).length < 4) fails.push(`R8 ${Object.keys(m).length} mechanisms < 4`)
    for (const [k, c] of Object.entries(m)) if (c > 10) fails.push(`R8 mechanism ${k} has ${c} > 10 items`)
  } else if (perAsk.length) notes.push(`R7 (single file, not barred) within one ask type: ${perAsk.join('; ')}`)
  // R9
  const kv = {}
  for (const x of items) { const k = val(x.correct_answer); (kv[k] ??= []).push(x.id) }
  for (const [k, l] of Object.entries(kv)) if (l.length > 1) fails.push(`R9 key value ${k} shared by ${l.join(', ')}`)
  return { fails, notes, pos, n, fine, coarse, mech }
}

function selftest() {
  let bad = 0
  const it = (id, o) => ({ id: 'SM26L-' + id, domain: 'Algebra', mech: MECH[id[0]], ask: SLOTS[id]?.[0], choices: ['1', '3', '6', '10'],
    correct_answer: ['1', '3', '6', '10'][(SLOTS[id]?.[1] ?? 1) - 1], prompt: 'p', explanation: 'e', solve: 'return 1',
    setup: { i: 'i' + id, ii: 'ii' + id, iii: 'iii' + id }, ...o })
  const t = (name, items, want, opt = {}) => { const r = check(items, opt); if (!r.fails.some(f => f.startsWith(want))) { bad++; console.error(`selftest ${name}: expected ${want}, got`, r.fails) } }
  t('dash', [it('A1', { prompt: 'x − 3' })], 'R3')
  t('ksq', [it('A1', { solve: 'return k*k' })], 'R3')
  t('reference', [it('A1', { setup: { i: 'slope, fixed y-intercept', ii: 'two-sided', iii: 'number of integers f(t) can equal' } })], 'R2', { refs: [{ id: 'SM25L-P1', i: 'slope, fixed y-intercept', ii: 'two-sided', iii: 'number of integers f(t) can equal' }] })
  t('share i+ii one mech', [it('A1', { setup: { i: 'x', ii: 'y', iii: 'p' } }), it('A2', { setup: { i: 'x', ii: 'y', iii: 'q' } })], 'R2')
  t('rank', [it('A1', { correct_answer: '10' })], 'R6')
  t('ask', [it('A1', { ask: 'sum' })], 'R6')
  t('slot', [it('A9')], 'R6')
  t('obo per author', [it('B1', { choices: ['1', '3', '4', '9'], correct_answer: '3' }), it('B2', { choices: ['1', '2', '8', '9'] , correct_answer: '9' })], 'R5')
  t('shared key', [it('A1'), it('C1')], 'R9')
  // the commissioned matrix itself passes R7/R8; a batch keyed "count -> largest" fails R7
  const full = Object.keys(SLOTS).map((s, i) => { const c = [String(i * 20 + 1), String(i * 20 + 3), String(i * 20 + 6), String(i * 20 + 10)]; return it(s, { choices: c, correct_answer: c[SLOTS[s][1] - 1] }) })
  const ok = check(full, { merge: true })
  if (ok.fails.length) { bad++; console.error('selftest commissioned matrix failed', ok.fails) }
  if (ok.fine.hits !== 11 || ok.coarse.hits !== 9 || ok.mech.hits !== 10) { bad++; console.error('selftest matrix rule hits', ok.fine.hits, ok.coarse.hits, ok.mech.hits, 'expected 11/9/10') }
  const skew = full.map(x => x.ask === 'count' || x.ask === 'difference' ? { ...x, correct_answer: x.choices[3] } : x.ask === 'sum' ? { ...x, correct_answer: x.choices[0] } : x)
  const r = check(skew, { merge: true })
  if (!r.fails.some(f => f.startsWith('R7'))) { bad++; console.error('selftest v25-style skew did not fail R7', r.fine.hits) }
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log('selftest 12/12')
}

const args = process.argv.slice(2)
selftest()
if (args.includes('--selftest')) process.exit(0)
const merge = args.includes('--merge')
const paths = args.filter(a => !a.startsWith('--'))
if (!paths.length) { console.error('usage: alg26-preflight.mjs [--merge] <batch.json ...>'); process.exit(2) }
let items, refs
try {
  items = paths.flatMap(p => { const j = JSON.parse(readFileSync(p, 'utf8')); if (!Array.isArray(j) || !j.length) throw new Error(`${p} holds no items`); return j })
  refs = JSON.parse(readFileSync(DIR + 'alg26-reference-triples.json', 'utf8'))
  if (refs.length !== 66) throw new Error(`alg26-reference-triples.json holds ${refs.length}, expected 66 (v23 14 + v24 20 + v25 32)`)
} catch (e) { console.error(`REFUSING: ${e.message}`); process.exit(2) }
// --derive-ask: BREAK-TEST ONLY, for v24/v25 files that carry no `ask`. Derives the
// ask from setup (iii) and the mechanism from the author letter, so R7 can be run
// on the batch whose cross-item tell it was written to catch.
if (args.includes('--derive-ask')) {
  const d = t => /sum|mean/i.test(t) ? 'sum' : /number|how many|count/i.test(t) ? 'count' : /width|spread|difference/i.test(t) ? 'difference' : /greatest or least|least or greatest/i.test(t) ? 'greatest' : /greatest/i.test(t) ? 'greatest' : /least/i.test(t) ? 'least' : 'value'
  items = items.map(x => ({ ...x, ask: x.ask ?? d(String(x.setup?.iii ?? '')), mech: x.mech ?? String(x.id).replace(/^SM2\dL-/, '')[0] }))
}
const r = check(items, { merge, refs })
console.log(`alg26-preflight${merge ? ' --merge' : ''}: ${r.n} items from ${paths.length} file(s); ${refs.length} reference triples`)
for (const n of r.notes) console.log('  ' + n)
for (const f of r.fails) console.log('  FAIL ' + f)
console.log(r.fails.length ? `PRE-FLIGHT FAIL (${r.fails.length})` : 'PRE-FLIGHT PASS')
process.exit(r.fails.length ? 1 : 0)
