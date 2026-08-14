#!/usr/bin/env node
/**
 * check-distractor-derivability.mjs — is the key the only option that
 * connects to the numbers in the stem?
 *
 * READ ONLY. Never writes to the bank.
 *
 * ── The defect ───────────────────────────────────────────────────────
 * A good SAT distractor is the answer you get from a SPECIFIC plausible
 * slip on the given quantities: you forgot to halve, you used the
 * diameter for the radius, you stopped one step early. It is reachable
 * from the stem.
 *
 * An ARBITRARY distractor is reachable from nothing. It is a number
 * someone made up to fill slot C. A student who has read the stem can
 * eliminate it without doing the arithmetic — the same shape as the
 * Choose a Response roster tell, in numbers instead of prose.
 *
 * The leak is the extreme case: **the key is the only option derivable
 * from the stem.** Then the item is answerable by connectivity alone.
 *
 * ── How this differs from check-math-hub.mjs ─────────────────────────
 * The hub check looks only INSIDE the option set — is every option
 * reachable from the key. This one looks from the STEM outward, and the
 * two can disagree: a set can be hub-clean (no option derives from the
 * key) and still leak here (only the key touches the given numbers).
 *
 * ── Control, by construction not by measurement ──────────────────────
 * If exactly one option is stem-derivable and derivability were
 * independent of correctness, that option is the key 1 in 4 times. So
 * the control is 25.0% by construction. Items where zero or several
 * options are derivable carry no signal and are excluded from the rate
 * rather than counted as clean — the denominator is stated everywhere.
 *
 * ── The instrument can be meaningless in two directions ──────────────
 * Too generous an operation set makes everything derivable; too narrow
 * makes nothing derivable. Both produce a confident, useless number. So
 * the run reports the overall derivability rate FIRST, and refuses to
 * report a leak rate if it is above 90% or below 10%.
 *
 * usage:
 *   node check-distractor-derivability.mjs --selftest   # no DB
 *   node check-distractor-derivability.mjs [domain]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const MATH_DOMAINS = [
  'Algebra', 'Advanced Math',
  'Geometry and Trigonometry', 'Problem-Solving and Data Analysis',
]

const EPS = 1e-9
const near = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < EPS * Math.max(1, Math.abs(a), Math.abs(b))

/* Parse a numeric option. Handles integers, decimals, fractions,
 * percentages and a leading currency symbol. Anything else returns
 * null and the ITEM is skipped — a half-parsed option set would
 * silently change the denominator. */
export function toNum(raw) {
  if (raw == null) return null
  let s = String(raw).trim().replace(/[$,\s]/g, '')
  if (!s) return null
  let pct = false
  if (s.endsWith('%')) { pct = true; s = s.slice(0, -1) }
  let v = null
  const frac = /^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(s)
  if (frac) v = Number(frac[1]) / Number(frac[2])
  else if (/^-?\d+(\.\d+)?$/.test(s)) v = Number(s)
  if (v == null || !Number.isFinite(v)) return null
  return pct ? v / 100 : v
}

/* Numbers written in the stem. Deliberately excludes anything attached
 * to a letter (x2, 3x) — those are coefficients inside an expression,
 * not given quantities a student would slip on. */
export function stemNumbers(text) {
  const t = String(text ?? '').replace(/[,$]/g, '')
  const out = new Set()
  // (?![\w.]) also rejected sentence-final numbers — "width 5." lost the
  // 5, so a two-number stem looked like a one-number stem and the item
  // silently abstained. The trailing guard must exclude only a DIGIT
  // (mid-decimal), not any dot. Caught by the self-test's first fixture.
  for (const m of t.matchAll(/(?<![\w.])(\d+(?:\.\d+)?)(?![\d\w])/g)) {
    const v = Number(m[1])
    if (Number.isFinite(v)) out.add(v)
  }
  return [...out]
}

/* One plausible slip, applied to the given quantities. Kept SMALL on
 * purpose: every operation added makes more things derivable, and an
 * operation set generous enough to reach any number measures nothing. */
export function derivableSet(nums) {
  const out = new Set()
  const add = v => { if (Number.isFinite(v) && Math.abs(v) < 1e12) out.add(v) }
  for (const a of nums) {
    add(a)                       // copied a given straight out
    add(-a); add(2 * a); add(a / 2); add(a * a)
    if (a > 0) add(Math.sqrt(a))
    if (a !== 0) add(1 / a)
    add(a + 1); add(a - 1)       // off-by-one
    add(a / 100); add(a * 100)   // percent slip
  }
  for (const a of nums) for (const b of nums) {
    if (a === b) continue
    add(a + b); add(a - b); add(a * b)
    if (b !== 0) add(a / b)
    if (a > 0 && b > 0) add(Math.sqrt(a * a + b * b))  // pythagoras
    // PART OVER WHOLE. The single most common ratio/probability
    // derivation on this test, and one the pairwise ops cannot reach:
    // "3 red and 4 blue, what fraction is red" has key 3/7, which needs
    // 3 combined with (3+4). Added as its own family rather than by
    // running a second generation of every operation, which would have
    // inflated derivability across the board for one missing case.
    if (a + b !== 0) { add(a / (a + b)); add(b / (a + b)); add((a + b) / a) }
  }
  return [...out]
}

export function classify(item) {
  const choices = Array.isArray(item?.choices)
    ? item.choices.map(c => (typeof c === 'string' ? c : c?.text ?? '')) : []
  if (choices.length < 3) return null
  const vals = choices.map(toNum)
  if (vals.some(v => v == null)) return null          // not a numeric set

  // key by TEXT/index, never by assuming a position
  const raw = item?.correct_answer
  let ki = -1
  if (typeof raw === 'number') ki = raw
  else {
    const s = String(raw ?? '').trim()
    if (/^[A-Ea-e]$/.test(s)) ki = 'ABCDE'.indexOf(s.toUpperCase())
    else ki = choices.findIndex(c => String(c).trim() === s)
  }
  if (ki < 0 || ki >= choices.length) return null

  const nums = stemNumbers(item?.prompt)
  if (nums.length < 2) return null                    // nothing to derive from
  const D = derivableSet(nums)
  const derivable = vals.map(v => D.some(d => near(d, v)))
  const n = derivable.filter(Boolean).length
  return { n, total: vals.length, keyDerivable: derivable[ki], keyOnly: n === 1 && derivable[ki] }
}

// ── self-test ────────────────────────────────────────────────────────
function selftest() {
  const F = [
    ['key only derivable — LEAK', {
      prompt: 'A rectangle has length 12 and width 5. What is its area?',
      choices: ['60', '97', '113', '141'], correct_answer: '60',
    }, r => r.keyOnly === true],
    ['all four derivable — no signal', {
      prompt: 'A rectangle has length 12 and width 5. What is its area?',
      choices: ['60', '17', '7', '24'], correct_answer: '60',
    }, r => r.n === 4 && r.keyOnly === false],
    ['a distractor is the only derivable one — not a key leak', {
      prompt: 'A rectangle has length 12 and width 5. What is its area?',
      choices: ['61', '17', '113', '141'], correct_answer: '61',
    }, r => r.keyOnly === false && r.n === 1],
    ['non-numeric options — must ABSTAIN', {
      prompt: 'The value of x is 4 and y is 9.',
      choices: ['increasing', 'decreasing', 'constant', 'undefined'], correct_answer: 'increasing',
    }, r => r === null],
    ['fewer than two stem numbers — must ABSTAIN', {
      prompt: 'What is the value of the expression?',
      choices: ['1', '2', '3', '4'], correct_answer: '2',
    }, r => r === null],
    ['key given as a LETTER still resolves', {
      prompt: 'A rectangle has length 12 and width 5. What is its area?',
      choices: ['97', '60', '113', '141'], correct_answer: 'B',
    }, r => r.keyOnly === true],
    ['fraction options parse', {
      prompt: 'If a jar has 3 red and 4 blue marbles, what fraction is red?',
      choices: ['3/7', '9/13', '11/17', '13/19'], correct_answer: '3/7',
    }, r => r != null && r.keyDerivable === true],
  ]
  let bad = 0
  console.log('SELF-TEST — fixtures with known verdicts\n')
  for (const [label, item, ok] of F) {
    const r = classify(item)
    let pass
    try { pass = ok(r) } catch { pass = false }   // a null must FAIL, not crash
    bad += !pass
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label.padEnd(46)} ${r ? `n=${r.n} keyOnly=${r.keyOnly}` : 'abstained'}`)
  }
  console.log()
  if (bad) { console.log(`SELF-TEST FAILED — ${bad} of ${F.length}.`); process.exit(1) }
  console.log(`SELF-TEST PASSED — ${F.length}/${F.length}.`)
  console.log('Two of these are abstentions. A detector that answers on a')
  console.log('non-numeric option set is inventing a number.')
}

if (process.argv.includes('--selftest')) { selftest(); process.exit(0) }
selftest()
console.log('\n' + '='.repeat(68) + '\n')

const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const only = process.argv.slice(2).filter(a => !a.startsWith('-')).join(' ')
const domains = only ? [only] : MATH_DOMAINS
const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id, domain, item')
    .eq('family', 'sat').eq('archived', false).in('domain', domains).range(f, f + 999)
  if (error) throw new Error(`study_item_bank: ${error.message}`)
  rows.push(...(data ?? []))
  if (!data || data.length < 1000) break
}
if (!rows.length) throw new Error('no live items — refusing to report on nothing')

const per = new Map()
let scored = 0, abstained = 0, derivTotal = 0, derivCount = 0, signal = 0, leaks = 0
const leakItems = []
for (const r of rows) {
  const c = classify(r.item)
  if (!c) { abstained++; continue }
  scored++
  derivTotal += c.total; derivCount += c.n
  const d = per.get(r.domain) ?? { scored: 0, signal: 0, leaks: 0 }
  d.scored++
  if (c.n === 1) { signal++; d.signal++; if (c.keyOnly) { leaks++; d.leaks++; leakItems.push(r) } }
  per.set(r.domain, d)
}

const rate = 100 * derivCount / derivTotal
console.log('SAT MATH — DISTRACTOR DERIVABILITY FROM THE STEM\n')
console.log(`  items in scope             ${rows.length}`)
console.log(`  scored                     ${scored}`)
console.log(`  abstained                  ${abstained}   (non-numeric options, or <2 given numbers)`)
console.log(`\n  OVERALL DERIVABILITY       ${rate.toFixed(1)}% of all options\n`)
if (rate > 90 || rate < 10) {
  console.log('  *** INSTRUMENT REFUSES TO REPORT ***')
  console.log(`  At ${rate.toFixed(1)}% the operation set is too ${rate > 90 ? 'generous' : 'narrow'} to`)
  console.log('  discriminate: nearly every option falls on the same side, so')
  console.log('  a leak rate computed from it would be an artefact of the')
  console.log('  operation set rather than a fact about the bank.')
  process.exit(0)
}
console.log(`  items with exactly ONE derivable option   ${signal}`)
console.log(`    of those, the derivable one IS the key  ${leaks}`)
if (signal) {
  const pct = 100 * leaks / signal
  console.log(`\n  LEAK RATE  ${pct.toFixed(1)}%   vs 25.0% control (by construction)`)
  console.log(`  margin     ${(pct - 25).toFixed(1)} points\n`)
}
if (leakItems.length && process.argv.includes('--list')) {
  console.log('\n  key-only items — candidates, NOT verdicts:\n')
  for (const r of leakItems.slice(0, 25)) {
    console.log(`    ${r.id} [${r.domain}]`)
    console.log(`      ${String(r.item?.prompt).replace(/\s+/g, ' ').slice(0, 120)}`)
    console.log(`      options: ${(r.item?.choices ?? []).map(c => typeof c === 'string' ? c : c?.text).join(' | ')}  key=${r.item?.correct_answer}`)
  }
  console.log()
}
console.log('  per cohort:')
for (const [d, v] of [...per].sort((a, b) => b[1].scored - a[1].scored)) {
  const pct = v.signal ? (100 * v.leaks / v.signal).toFixed(1) + '%' : '—'
  console.log(`    ${d.padEnd(36)} scored ${String(v.scored).padStart(4)}  signal ${String(v.signal).padStart(3)}  key-only ${String(v.leaks).padStart(3)}  ${pct}`)
}
