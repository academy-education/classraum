#!/usr/bin/env node
/**
 * alg25-preflight.mjs [--selftest] <batch.json ...>
 *
 * Mechanical pre-freeze checks for sat-math-v25-alg (PREREG-ALG25-2026-10-08.md),
 * written before any v25 item exists. Authors run it on their own file while
 * authoring; I run it on the merge. Several files are checked as ONE batch.
 *
 *   R1  shape        every item: 4 choices, all numeric (key-extremity-breakdown's
 *                    evaluator), Algebra, key among the choices
 *   R2  setup        a `setup` {i, ii, iii} on every item; no two items share a full
 *                    triple; no two items share both (i) and (iii); no triple equal to
 *                    a BANNED reference triple (v23 A6/B7, v24 held A2/A4/B4/B6)
 *   R3  plain text   no U+2010-U+2015, U+2212, U+FE63, U+FF0D anywhere in an item;
 *                    no k^2 / k² / k*k / k**2 in prompt, explanation, solve
 *   R4  non-integer  items declared `nonint_constant: true` OR whose prompt asks for a
 *       constant     count / sum / mean of "values of k": at most 2 in the batch, every
 *                    one declared, every declared one carrying `integer_k_answer` (the
 *                    value an integer-k reading gives), and NOT ALL of them offering
 *                    that value as an option
 *   R5  off-by-one   items with a distractor whose value is key +- 1 exactly, or an
 *                    author-declared `off_by_one_options` value (an endpoint/inclusion
 *                    error) sitting next to the key in value order: at most
 *                    floor(n / 4) of the batch
 *   R6  key position counts by value (smallest / interior / largest) printed per
 *                    file against `--commission S,I,L` when given (exact match required)
 *
 * Exit 1 on a failed rule, 2 if it cannot read its input (never a number from an
 * empty or unreadable batch).
 */
import { readFileSync } from 'node:fs'
import { scoreItem } from './key-extremity-breakdown.mjs'

export const BANNED = [
  ['v23 A6', 'slope, pivot inside interval', 'two-sided', 'spread of f(t), t outside interval'],
  ['v23 B7', 'solution of a one-variable equation', 'compared with k itself', 'number of values of k'],
  ['v24 A2', 'slope, fixed y-intercept', 'lower only', 'number of integers f(t) can equal'],
  ['v24 A4', 'slope, pivot inside interval', 'between two fixed lines', 'greatest or least f(t)'],
  ['v24 B4', 'intercept of a line with k', 'range only', 'number of values of k'],
  ['v24 B6', 'solution where k is the x-coefficient', 'range only', 'number of values of k'],
]
const norm = s => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
const DASH = /[‐-―−﹣－]/
const KSQ = /k\s*\^\s*2|k²|k\s*\*\s*k\b|k\s*\*\*\s*2/
const isNonintStem = p => /\bvalues? (of |that )?k\b|\bvalues? k can\b|\bk can take\b/i.test(p) && /\binteger/i.test(p) && !/integer values? of k/i.test(p)

export function val(s) {
  const t = String(s).trim().replace(/−/g, '-')
  let m = t.match(/^(-?\d+(?:\.\d+)?)$/); if (m) return Number(m[1])
  m = t.match(/^(-?)(\d+)\s*\/\s*(\d+)$/); if (m) return (m[1] ? -1 : 1) * Number(m[2]) / Number(m[3])
  m = t.match(/^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/); if (m) return (m[1] ? -1 : 1) * (Number(m[2]) + Number(m[3]) / Number(m[4]))
  return NaN
}

export function check(items) {
  const fails = [], notes = []
  if (!Array.isArray(items) || !items.length) throw new Error('no items')
  const ids = items.map(x => x.id)
  if (new Set(ids).size !== ids.length) fails.push('R1 duplicate ids')
  // R1
  for (const x of items) {
    const ch = (x.choices || []).map(String)
    if (ch.length !== 4) fails.push(`R1 ${x.id}: ${ch.length} choices`)
    if (!ch.includes(String(x.correct_answer))) fails.push(`R1 ${x.id}: key not among choices`)
    if (ch.some(c => Number.isNaN(val(c)))) fails.push(`R1 ${x.id}: non-numeric option (${ch.join(' | ')})`)
    if (x.domain !== 'Algebra') fails.push(`R1 ${x.id}: domain ${x.domain}`)
  }
  // R2
  const trip = x => x.setup && [norm(x.setup.i), norm(x.setup.ii), norm(x.setup.iii)]
  for (const x of items) {
    const t = trip(x)
    if (!t || t.some(v => !v)) { fails.push(`R2 ${x.id}: setup {i,ii,iii} missing`); continue }
    for (const [name, ...b] of BANNED) if (b.map(norm).join('|') === t.join('|')) fails.push(`R2 ${x.id}: setup equals banned ${name}`)
  }
  for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) {
    const A = trip(items[a]), B = trip(items[b]); if (!A || !B) continue
    if (A.join('|') === B.join('|')) fails.push(`R2 ${items[a].id} / ${items[b].id}: same full triple`)
    else if (A[0] === B[0] && A[2] === B[2]) fails.push(`R2 ${items[a].id} / ${items[b].id}: share (i) and (iii)`)
  }
  // R3
  for (const x of items) {
    const blob = JSON.stringify(x)
    if (DASH.test(blob)) fails.push(`R3 ${x.id}: non-ASCII dash`)
    for (const f of ['prompt', 'explanation', 'solve']) if (KSQ.test(String(x[f] ?? ''))) fails.push(`R3 ${x.id}: k-squared in ${f}`)
    for (const [o, body] of Object.entries(x.distractor_solve || {})) if (KSQ.test(body)) fails.push(`R3 ${x.id}: k-squared in distractor_solve ${o}`)
  }
  // R4
  const ni = items.filter(x => x.nonint_constant === true || isNonintStem(String(x.prompt)))
  for (const x of ni) {
    if (x.nonint_constant !== true) fails.push(`R4 ${x.id}: asks about values of k but is not declared nonint_constant`)
    else if (x.integer_k_answer == null) fails.push(`R4 ${x.id}: declared nonint_constant without integer_k_answer`)
  }
  if (ni.length > 2) fails.push(`R4 ${ni.length} non-integer-constant items (cap 2): ${ni.map(x => x.id).join(',')}`)
  const offers = ni.filter(x => x.integer_k_answer != null && x.choices.map(String).includes(String(x.integer_k_answer)))
  if (ni.length && offers.length === ni.length) fails.push(`R4 every non-integer-constant item (${ni.length}) offers its integer-k answer as an option`)
  notes.push(`R4 non-integer-constant ${ni.length} (cap 2); offering the integer-k answer ${offers.length} of ${ni.length}`)
  // R5
  // an option whose value is key +- 1, OR an author-declared off-by-one-endpoint option
  // (`off_by_one_options`) that sits next to the key in value order
  const obo = items.filter(x => {
    const k = val(x.correct_answer), key = String(x.correct_answer)
    if (x.choices.some(c => String(c) !== key && Math.abs(Math.abs(val(c) - k) - 1) < 1e-9)) return true
    const sorted = x.choices.map(String).sort((a, b) => val(a) - val(b)), ki = sorted.indexOf(key)
    const nb = [sorted[ki - 1], sorted[ki + 1]].filter(Boolean)
    return (x.off_by_one_options || []).map(String).some(o => nb.includes(o))
  })
  const cap = Math.floor(items.length / 4)
  notes.push(`R5 off-by-one next to the key ${obo.length} of ${items.length} (cap ${cap})${obo.length ? ': ' + obo.map(x => x.id).join(',') : ''}`)
  if (obo.length > cap) fails.push(`R5 off-by-one next to the key on ${obo.length} of ${items.length} > ${cap}`)
  // R6
  const pos = { min: 0, mid: 0, max: 0, skip: 0 }
  for (const x of items) { const s = scoreItem(x.choices.map(String), String(x.correct_answer)); if (s.skip) pos.skip++; else if (s.keyMin) pos.min++; else if (s.keyMax) pos.max++; else pos.mid++ }
  notes.push(`R6 key smallest ${pos.min} / interior ${pos.mid} / largest ${pos.max}${pos.skip ? ` / unscored ${pos.skip}` : ''}`)
  return { fails, notes, pos, n: items.length }
}

function selftest() {
  const it = (id, o) => ({ id, domain: 'Algebra', choices: ['1', '2', '5', '9'], correct_answer: '5', prompt: 'p', explanation: 'e', solve: 'return 5', setup: { i: 'a' + id, ii: 'b', iii: 'c' + id }, ...o })
  let bad = 0
  const t = (name, items, want) => { const r = check(items); const got = r.fails.some(f => f.startsWith(want)); if (!got) { bad++; console.error(`selftest ${name}: expected ${want}, got`, r.fails) } }
  t('dash', [it('A', { prompt: 'x − 3' })], 'R3')
  t('ksq', [it('A', { solve: 'return k*k' })], 'R3')
  t('banned', [it('A', { setup: { i: 'slope, fixed y-intercept', ii: 'lower only', iii: 'number of integers f(t) can equal' } })], 'R2')
  t('share i+iii', [it('A', { setup: { i: 'x', ii: 'p', iii: 'y' } }), it('B', { setup: { i: 'x', ii: 'q', iii: 'y' } })], 'R2')
  t('nonint undeclared', [it('A', { prompt: 'The solution is an integer. For how many values of k is this true?' })], 'R4')
  t('nonint all offer', [it('A', { nonint_constant: true, integer_k_answer: '2' }), it('B', { nonint_constant: true, integer_k_answer: '9' })], 'R4')
  t('nonint cap', ['A', 'B', 'C'].map(i => it(i, { nonint_constant: true, integer_k_answer: '77' })), 'R4')
  t('obo', ['A', 'B', 'C', 'D'].map(i => it(i, { choices: ['1', '4', '5', '9'] })), 'R5')
  t('obo declared', ['A', 'B', 'C', 'D'].map(i => it(i, { off_by_one_options: ['2'] })), 'R5')
  // the clean case must pass
  const clean = check(['A', 'B', 'C', 'D'].map(i => it(i)))
  if (clean.fails.length) { bad++; console.error('selftest clean failed', clean.fails) }
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log('selftest 10/10')
}

const args = process.argv.slice(2)
selftest()
if (args.includes('--selftest')) process.exit(0)
const ci = args.indexOf('--commission')
const commission = ci >= 0 ? args[ci + 1].split(',').map(Number) : null
const paths = args.filter((a, i) => !a.startsWith('--') && !(ci >= 0 && i === ci + 1))
if (!paths.length) { console.error('usage: alg25-preflight.mjs [--commission S,I,L] <batch.json ...>'); process.exit(2) }
let items
try { items = paths.flatMap(p => { const j = JSON.parse(readFileSync(p, 'utf8')); if (!Array.isArray(j) || !j.length) throw new Error(`${p} holds no items`); return j }) }
catch (e) { console.error(`REFUSING: ${e.message}`); process.exit(2) }
const r = check(items)
console.log(`alg25-preflight: ${r.n} items from ${paths.length} file(s)`)
for (const n of r.notes) console.log('  ' + n)
if (commission) {
  const [S, I, L] = commission
  if (r.pos.min !== S || r.pos.mid !== I || r.pos.max !== L) r.fails.push(`R6 key position ${r.pos.min}/${r.pos.mid}/${r.pos.max} != commission ${S}/${I}/${L}`)
}
for (const f of r.fails) console.log('  FAIL ' + f)
console.log(r.fails.length ? `PRE-FLIGHT FAIL (${r.fails.length})` : 'PRE-FLIGHT PASS')
process.exit(r.fails.length ? 1 : 0)
