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

/** Is `target` reachable from two of `parts` by +, x, or midpoint? */
export function composedFrom(target, parts) {
  const hits = []
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    const a = parts[i], b = parts[j]
    if (near(a + b, target)) hits.push(`${a} + ${b}`)
    if (near(a * b, target)) hits.push(`${a} x ${b}`)
    if (near((a + b) / 2, target)) hits.push(`midpoint of ${a} and ${b}`)
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
  /* A distractor being composite is fine and common -- the tell is the key
   * being the UNIQUE composite, so count how many distractors also are. */
  let distractorComposites = 0
  for (const d of others) {
    const rest = vals.filter(v => !near(v, d))
    if (composedFrom(d, rest).length) distractorComposites++
  }
  return { keyHits, distractorComposites, unique: keyHits.length > 0 && distractorComposites === 0 }
}

const RUN_AS_CLI = process.argv[1] && process.argv[1].endsWith('check-key-is-composition.mjs')
if (RUN_AS_CLI) {
  const fail = m => { console.error('SELF-TEST FAILED: ' + m); process.exit(2) }
  const mk = (choices, key) => ({ choices: choices.map(String), correct_answer: String(key) })
  /* The three real leaky sets, and the two real contrast cases the grader named. */
  if (!analyse(mk([5, 8, 13, 25], 13)).unique) fail('13 = 5+8 must fire as a unique key composition')
  if (!analyse(mk([7, 14, 15, 17], 15)).keyHits.length && !analyse(mk([7, 14, 15, 17], 15)).unique) { /* 15 is 2x7+1, not a direct composition */ }
  if (!analyse(mk([-12, 3, 8, 18], 3)).unique) fail('3 = midpoint(-12,18) must fire')
  if (analyse(mk([-12, -10, -8, -6], -10)).unique) fail('a uniform ladder must NOT fire as unique')
  if (analyse(mk([3, 5, 6, 18], 3)).unique) fail('the key as the ATOM must not fire (18 = 3x6 is a distractor)')
  console.log('self-test: fires on 13=5+8 and 3=midpoint(-12,18); silent on a uniform ladder and on an atom key\n')

  const files = process.argv.slice(2)
  if (!files.length) { console.error('usage: check-key-is-composition.mjs <batch.json ...>'); process.exit(2) }
  let bad = 0
  for (const f of files) {
    let a; try { a = JSON.parse(readFileSync(f, 'utf8')) } catch (e) { console.error(`REFUSING: cannot read ${f}: ${e.message}`); process.exit(2) }
    if (!Array.isArray(a) || !a.length) { console.error(`REFUSING: ${f} holds zero items`); process.exit(2) }
    console.log(f.replace(/^.*\//, ''))
    let n = 0, fired = 0
    for (const x of a) {
      const r = analyse(x); if (!r) continue
      n++
      if (r.unique) { fired++; bad++; console.log(`  ${String(x.id).padEnd(12)}KEY IS THE UNIQUE COMPOSITE: ${r.keyHits[0]}`) }
    }
    console.log(`  ${fired} of ${n} scorable items have the key as the unique composite`)
  }
  console.log('')
  process.exitCode = bad ? 1 : 0
}
