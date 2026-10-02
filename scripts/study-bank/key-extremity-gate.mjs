#!/usr/bin/env node
/**
 * key-extremity-gate.mjs [--self-test | <batch.json>]
 *
 * BATCH-LEVEL authoring gate for "the key is the largest or smallest option",
 * wired into every maths insert path (math-bank-helper.mjs for SAT/ACT/SSAT/
 * ISEE, verbal-bank-helper.mjs with BANK_SECTION=math). Added 2026-10-02 from
 * KEY-EXTREMITY-RESULT.md: across live maths the key sits at an extreme far
 * under chance (SAT 31% vs 50%, SSAT 20% vs 40%), diffusely, and authors who
 * already knew about it still produced 33%. Advice did not move the number,
 * so this refuses.
 *
 * Rule:
 *   - Parse each item with the SAME evaluator the population study used
 *     (key-extremity-breakdown.mjs scoreItem). Any option it cannot read makes
 *     the item NON-NUMERIC: counted, excluded from the denominator.
 *   - Chance is DERIVED from the data: mean over scorable items of
 *     (options at the min or max) / k. Distinct values give 2/k (50% at k=4,
 *     40% at k=5). Never a literal.
 *   - Threshold = 0.8 x derived chance (40% at k=4, 32% at k=5).
 *   - Below MIN_N scorable items: "no measurement". Not a pass, not a fail.
 *
 * Per-batch, never per-item: a per-item rule would push every distractor to
 * one side of the key (RANK-SKEW-DECISION.md).
 */
import { pathToFileURL } from 'node:url'
import { readFileSync } from 'node:fs'
import { scoreItem } from './key-extremity-breakdown.mjs'

export const MIN_N = 10
export const RATIO = 0.8
const EPS = 1e-9   // 0.8 * 0.4 = 0.32000000000000006 in floating point; 8/25 must pass

/** @returns {{status:'pass'|'fail'|'no-measurement', total, n, nonNumeric, otherSkip, ext, rate, chance, threshold, reason}} */
export function keyExtremityVerdict(items, { minN = MIN_N, ratio = RATIO } = {}) {
  // A check that cannot read its input must not return a number.
  if (!Array.isArray(items)) throw new Error('key-extremity gate: batch is not an array of items')
  let n = 0, ext = 0, chanceSum = 0, nonNumeric = 0, otherSkip = 0
  for (const it of items) {
    const choices = Array.isArray(it?.choices) ? it.choices.map(String) : null
    if (!choices || !choices.length) { otherSkip++; continue }
    const s = scoreItem(choices, it.correct_answer)
    if (s.skip === 'non-numeric') { nonNumeric++; continue }
    if (s.skip) { otherSkip++; continue }
    n++; if (s.ext) ext++; chanceSum += s.cExt / s.k
  }
  const out = { total: items.length, n, nonNumeric, otherSkip, ext,
    rate: n ? ext / n : NaN, chance: n ? chanceSum / n : NaN, threshold: NaN }
  if (n < minN) {
    return { ...out, status: 'no-measurement',
      reason: `no measurement: ${n} scorable of ${items.length} (need >= ${minN}); ${nonNumeric} non-numeric, ${otherSkip} other skip` }
  }
  out.threshold = ratio * out.chance
  const pass = out.rate + EPS >= out.threshold
  const pct = x => (100 * x).toFixed(1) + '%'
  return { ...out, status: pass ? 'pass' : 'fail',
    reason: `key at an extreme ${ext}/${n} = ${pct(out.rate)}; derived chance ${pct(out.chance)}, bar ${ratio} x chance = ${pct(out.threshold)}; ${nonNumeric} non-numeric excluded (of ${items.length})` }
}

/**
 * Called from the inserters. Exits non-zero on a fail unless overrideFn()
 * returns a written reason (BANK_GATE_OVERRIDE, same mechanism as gate.mjs).
 */
export function enforceKeyExtremity(items, label, overrideFn) {
  const v = keyExtremityVerdict(items)
  if (v.status === 'fail') {
    const why = overrideFn()
    if (!why) {
      console.error(`REFUSING to insert ${label}: KEY-EXTREMITY GATE FAILED — ${v.reason}\n` +
        `  Place the key at the largest or smallest value about as often as chance (see the bank-*-math skill).\n` +
        `  Do not "fix" this by moving distractors all to one side; re-author. Override only with BANK_GATE_OVERRIDE="<reason>".`)
      process.exit(1)
    }
    console.log(`KEY-EXTREMITY GATE OVERRIDDEN (BANK_GATE_OVERRIDE): ${why}\n  the gate said: ${v.reason}`)
  } else {
    console.log(`key-extremity gate: ${v.status.toUpperCase()} — ${v.reason}`)
  }
  return v
}

/* ---------- self-test ---------- */
const mk = (choices, key) => ({ choices, correct_answer: key })
const sets4 = [['2', '5', '9', '14'], ['3', '7', '11', '20'], ['1.5', '2.5', '4', '6'], ['10', '12', '15', '18'], ['√2', '2', '3', 'π']]
/** 4-choice batch of size n with exactly e keys at an extreme */
function batch4(n, e) {
  return Array.from({ length: n }, (_, i) => { const c = sets4[i % sets4.length]; return mk(c, i < e ? c[i % 2 ? 3 : 0] : c[1 + (i % 2)]) })
}
const set5 = ['1', '2', '3', '4', '5']
function batch5(n, e) { return Array.from({ length: n }, (_, i) => mk(set5, i < e ? set5[i % 2 ? 4 : 0] : set5[1 + (i % 3)])) }

export function selfTest(verdict = keyExtremityVerdict) {
  const fails = []
  const expect = (name, items, status) => { const v = verdict(items); if (v.status !== status) fails.push(`${name}: got ${v.status} want ${status} (${v.reason})`); return v }
  // rigged: key never extreme -> refused
  expect('rigged k=4 (0/20)', batch4(20, 0), 'fail')
  expect('rigged k=5 (0/20)', batch5(20, 0), 'fail')
  // clean: at chance -> passes
  expect('clean k=4 (10/20)', batch4(20, 10), 'pass')
  expect('clean k=5 (8/20)', batch5(20, 8), 'pass')
  // marginal, exactly at and one under the bar
  expect('marginal k=4 4/10 = 40% (at bar)', batch4(10, 4), 'pass')
  expect('marginal k=4 3/10 = 30% (under)', batch4(10, 3), 'fail')
  expect('marginal k=4 8/20 = 40% (at bar)', batch4(20, 8), 'pass')
  expect('marginal k=4 7/20 = 35% (under)', batch4(20, 7), 'fail')
  expect('marginal k=5 8/25 = 32% (at bar, float)', batch5(25, 8), 'pass')
  expect('marginal k=5 7/25 = 28% (under)', batch5(25, 7), 'fail')
  // the bar is derived, not 25%: 3/10 is above a literal-25% bar and must still fail
  // min-N: 9 scorable rigged items is no measurement, not a fail and not a pass
  expect('rigged but n=9', batch4(9, 0), 'no-measurement')
  // non-numeric batch -> no measurement; non-numeric rows excluded and counted
  const sym = Array.from({ length: 12 }, () => mk(['x + 3', '2x', 'x - 1', '3x + 2'], '2x'))
  const v = expect('non-numeric batch', sym, 'no-measurement')
  if (v.nonNumeric !== 12 || v.n !== 0) fails.push(`non-numeric count: got n=${v.n} nonNumeric=${v.nonNumeric}`)
  const mixed = expect('10 clean numeric + 12 symbolic', [...batch4(10, 5), ...sym], 'pass')
  if (mixed.n !== 10 || mixed.nonNumeric !== 12) fails.push(`mixed denominator: n=${mixed.n} nonNumeric=${mixed.nonNumeric}`)
  // derived chance: k=4 -> 0.5, k=5 -> 0.4; a tie at an extreme raises it
  const c4 = verdict(batch4(20, 10)).chance, c5 = verdict(batch5(20, 8)).chance
  if (Math.abs(c4 - 0.5) > 1e-12 || Math.abs(c5 - 0.4) > 1e-12) fails.push(`derived chance ${c4} / ${c5}`)
  const tied = verdict(Array.from({ length: 10 }, () => mk(['1', '1', '3', '4'], '3'))).chance
  if (Math.abs(tied - 0.75) > 1e-12) fails.push(`tie chance ${tied} want 0.75`)
  return fails
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === '--self-test' || !process.argv[2]) {
    const fails = selfTest()
    if (fails.length) { console.error(`self-test: ${fails.length} FAILURES\n  ` + fails.join('\n  ')); process.exit(2) }
    // BREAK TEST: a disabled check (always passes) must be caught by the same harness.
    const broken = selfTest(items => ({ ...keyExtremityVerdict(items), status: 'pass' }))
    if (!broken.some(f => f.startsWith('rigged'))) { console.error('break test FAILED: a disabled check let the rigged fixture through unnoticed'); process.exit(2) }
    console.log(`self-test: all checks pass; break test: disabled check caught (${broken.length} fixture failures)`)
  } else {
    const items = JSON.parse(readFileSync(process.argv[2], 'utf8'))
    if (!Array.isArray(items)) { console.error(`${process.argv[2]}: not an array of items - cannot measure`); process.exit(2) }
    const v = keyExtremityVerdict(items)
    console.log(`${v.status.toUpperCase()} — ${v.reason}`)
    if (v.status === 'fail') process.exitCode = 1
  }
}
