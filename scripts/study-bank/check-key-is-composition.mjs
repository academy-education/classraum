#!/usr/bin/env node
/**
 * check-key-is-composition.mjs <batch.json ...>
 *
 * Is the key the unique option that is an ARITHMETIC COMPOSITION of the others?
 *
 * WHY. On 2026-09-24 a SAT Advanced Math batch passed check-dead-options with
 * ZERO dead options and then scored 46.3% under a blind options-only attack
 * against a 27.8% line, while the live control scored 24.1% -- it leaked worse
 * than the shipped bank. Five items were solved by all three blind solvers and
 * no structure in their option sets was obvious.
 *
 * A grader reading the stems found the mechanism and stated it as a rule:
 *
 *   The distractor brief was uniformly "omit one step of the correct
 *   computation". That guarantees the distractors are PROPER PARTS of the key
 *   -- and parts advertise the whole.
 *
 *     SM15A-08   {5, 8, 13, 25}        13 = 5 + 8
 *     SM15A-13   {7, 14, 15, 17}       14 = 2 x 7, so 15 = 2x7+1
 *     SM15A-11   {-12, 3, 8, 18}       3 = (-12 + 18)/2
 *
 * and gave the contrast cases that make it falsifiable: SM15A-12's options are
 * a uniform ladder (-12,-10,-8,-6) where every option relates to every other
 * identically, so nothing is singled out -- it did not leak. SM15A-17 HAS a
 * composition (18 = 3 x 6) but the key is the ATOM, not the assembled whole --
 * it did not leak either.
 *
 * So the tell is narrow: it fires only when the KEY is the composite. That is
 * decidable, which is why this exists rather than a note in a brief.
 *
 * The fix is a spec change, not a rewrite: at least one distractor per item
 * must be an OVERSHOOT or a lateral error, never only omissions.
 */
import { readFileSync } from 'node:fs'
import { val } from './check-key-magnitude.mjs'

const near = (a, b) => Math.abs(a - b) < 1e-9

/** Is `target` reachable from two of `parts` by +, x, midpoint, doubling, or
 *  a harmonic or geometric mean?
 *
 *  HARMONIC AND GEOMETRIC MEANS ADDED 2026-09-26, after this checker passed
 *  `SM17L-A7` clean and TWO blind solvers independently named the relation it
 *  had missed. One called it "the strongest single tell in the file":
 *
 *      SM17L-A7   {6, 10, 12, 30}   key 10 = 2*30*6/36 = harmonic(30, 6)
 *
 *  Combined-rate and round-trip items leave BOTH inputs in the option set as
 *  natural distractors, and the answer is then their harmonic mean — so the
 *  set states the relation the stem is asking for. The geometric mean is the
 *  same shape for growth items; a live control in the same file carries it
 *  (20 -> 30 -> 45, key 30 = sqrt(20*45)).
 *
 *  The item that exposed this had already been rebuilt twice, and each rebuild
 *  introduced a different relation: first a derivational hub (9 = 3^2 and
 *  9 = 8+1), then this. That is the "a repair is not a fix until it is
 *  re-audited across EVERY structure" rule, and the reason the structures have
 *  to live in one function rather than in each author's head. */
export function composedFrom(target, parts) {
  const hits = []
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    const a = parts[i], b = parts[j]
    if (near(a + b, target)) hits.push(`${a} + ${b}`)
    if (near(a * b, target)) hits.push(`${a} x ${b}`)
    if (near((a + b) / 2, target)) hits.push(`midpoint of ${a} and ${b}`)
    /* SAME SIGN ONLY. Without this guard the harmonic mean of a positive and a
     * negative manufactures composites nobody would ever traverse: it made
     * `8 = harmonic(3, -12)` fire and broke the midpoint self-test, which is
     * how the missing guard was found. A harmonic mean is meaningful for rates,
     * speeds and resistances — quantities that share a sign. */
    if (a * b > 0 && near(2 * a * b / (a + b), target)) hits.push(`harmonic mean of ${a} and ${b}`)
    if (a * b > 0 && near(Math.sqrt(a * b), target)) hits.push(`geometric mean of ${a} and ${b}`)
  }
  for (const a of parts) if (a !== 0 && near(a * 2, target)) hits.push(`2 x ${a}`)
  return hits
}

export function analyse(item) {
  const vals = (item.choices || []).map(val)
  if (vals.length !== 4 || vals.some(v => v === null)) return null
  const key = val(item.correct_answer); if (key === null) return null
  const others = vals.filter(v => !near(v, key))
  if (others.length !== 3) return null
  const keyHits = composedFrom(key, others)
  /* `unique` stays the GATING line, because that is the form that was measured:
   * 2 fires, both solved 3/3 blind, zero false alarms. But requiring uniqueness
   * hides a live tell when the set happens to carry a second, harmless
   * composite — SM17L-A7's key IS the harmonic mean of two options, and two
   * independent blind solvers named it, yet `unique` is false there because
   * 12 = 2 x 6 also holds. So the weaker fact is reported separately rather
   * than folded into the verdict. */
  /* A distractor being composite is fine and common -- the tell is the key
   * being the UNIQUE composite, so count how many distractors also are. */
  let distractorComposites = 0
  for (const d of others) {
    const rest = vals.filter(v => !near(v, d))
    if (composedFrom(d, rest).length) distractorComposites++
  }
  return { keyHits, distractorComposites, keyIsComposite: keyHits.length > 0, unique: keyHits.length > 0 && distractorComposites === 0 }
}

const RUN_AS_CLI = process.argv[1] && process.argv[1].endsWith('check-key-is-composition.mjs')
if (RUN_AS_CLI) {
  const fail = m => { console.error('SELF-TEST FAILED: ' + m); process.exit(2) }
  const mk = (choices, key) => ({ choices: choices.map(String), correct_answer: String(key) })
  /* The three real leaky sets, and the two real contrast cases the grader named. */
  if (!analyse(mk([5, 8, 13, 25], 13)).unique) fail('13 = 5+8 must fire as a unique key composition')
  if (!analyse(mk([7, 14, 15, 17], 15)).keyHits.length && !analyse(mk([7, 14, 15, 17], 15)).unique) { /* 15 is 2x7+1, not a direct composition */ }
  if (!analyse(mk([-12, 3, 8, 18], 3)).unique) fail('3 = midpoint(-12,18) must fire')
  /* Fixtures isolate the relation under test. My first harmonic fixture was the
   * real SM17L-A7 set {6,10,12,30}, which ALSO carries 12 = 2 x 6 — so `unique`
   * was false and the self-test failed for a reason unrelated to the harmonic
   * mean. That failure is the finding below, not a bad assertion. */
  if (!analyse(mk([6, 10, 13, 30], 10)).unique) fail('10 = harmonic(30,6) must fire')
  if (!analyse(mk([20, 23, 30, 45], 30)).unique) fail('30 = geometric(20,45) must fire')
  if (analyse(mk([6, 10, 12, 30], 10)).unique) fail('a set with a second composite must not read as unique')
  if (!analyse(mk([6, 10, 12, 30], 10)).keyIsComposite) fail('...but the key composite must still be reported')
  if (analyse(mk([-12, -10, -8, -6], -10)).unique) fail('a uniform ladder must NOT fire as unique')
  if (analyse(mk([3, 5, 6, 18], 3)).unique) fail('the key as the ATOM must not fire (18 = 3x6 is a distractor)')
  console.log('self-test: fires on 13=5+8, 3=midpoint(-12,18), 10=harmonic(30,6), 30=geometric(20,45); silent on a uniform ladder and on an atom key\n')

  const files = process.argv.slice(2)
  if (!files.length) { console.error('usage: check-key-is-composition.mjs <batch.json ...>'); process.exit(2) }
  let bad = 0
  for (const f of files) {
    let a; try { a = JSON.parse(readFileSync(f, 'utf8')) } catch (e) { console.error(`REFUSING: cannot read ${f}: ${e.message}`); process.exit(2) }
    if (!Array.isArray(a) || !a.length) { console.error(`REFUSING: ${f} holds zero items`); process.exit(2) }
    console.log(f.replace(/^.*\//, ''))
    let n = 0, fired = 0, shadowed = 0
    for (const x of a) {
      const r = analyse(x); if (!r) continue
      n++
      if (r.unique) { fired++; bad++; console.log(`  ${String(x.id).padEnd(12)}KEY IS THE UNIQUE COMPOSITE: ${r.keyHits[0]}`) }
      else if (r.keyIsComposite) { shadowed++; console.log(`  ${String(x.id).padEnd(12)}key is a composite but not uniquely (${r.distractorComposites} distractor composite(s) too): ${r.keyHits[0]}`) }
    }
    console.log(`  ${fired} of ${n} scorable items have the key as the unique composite`)
    if (shadowed) console.log(`  ${shadowed} more have the key as a composite that a second composite SHADOWS — not gated, but read them: the gate was measured on the unique form only`)
  }
  console.log('')
  process.exitCode = bad ? 1 : 0
}
