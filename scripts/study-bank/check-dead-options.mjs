#!/usr/bin/env node
/**
 * check-dead-options.mjs <batch.json ...>
 *
 * A DEAD OPTION is one a student can eliminate without doing the item's work,
 * because it violates a constraint the STEM ITSELF states. It turns a
 * four-choice item into a three- or two-choice one and is worth 8 to 25 points
 * of free guessing.
 *
 * WHY THIS EXISTS. On 2026-09-24 two graders found dead options in NINE of
 * twenty SAT Algebra items and five of twenty Advanced Math items, and four
 * were bypassable end to end with no algebra at all:
 *
 *   SM14L-10  the quantities are people; one fraction forces a multiple of 5
 *             and another a multiple of 4, so of 12/36/45/60 only 60 survives
 *   SM14A-02  3*2^x is even, so two of four options die on PARITY alone
 *   SM14L-20  the middle of three evenly spaced values is the mean, so the
 *             greatest must exceed it, killing two options
 *   SM14L-17  A = 5B forces a multiple of 5; two options are not
 *
 * Every one of those is decidable. Asking authors to "check for dead options"
 * did not work -- both authors ran that check by eye and both missed most of
 * them. So this tool does not ask for a judgement: it asks the author to
 * DECLARE, per item, the constraints the stem states, and then verifies them
 * mechanically. Declaring a bound you then fail is loud; failing to notice one
 * is silent.
 *
 * USAGE. Add an optional `bounds` array to an item. Each entry is a JS
 * expression in `v`, the candidate value as a Number:
 *
 *   "bounds": ["v > 0", "Number.isInteger(v)", "v % 20 === 0", "v <= 900"]
 *
 * The tool then reports, per item:
 *   - REFUSES if the KEY violates any declared bound (the bound or key is wrong)
 *   - counts distractors killed by the declared bounds -- those are dead
 *   - flags items with NO bounds declared, which is not a pass, only a silence
 *
 * THE LIMIT OF THIS TOOL, FOUND THE FIRST TIME IT WAS USED. It can only see
 * bounds an author DECLARES, so a clean run is evidence about the declaration,
 * not about the item. The first batch to use it came back 0 dead of 18 -- and
 * three undeclared bounds each killed a distractor when an independent party
 * probed for them:
 *
 *     SM15A-09   v % 5 === 0    kills 144    5^(2x+1) = 5*(5^x)^2
 *     SM15A-15   v < 0          kills 9/2    the sum -b/a is negative
 *     SM15A-02   v > 0          kills -29    a>0 and b<0, so -b/2a is positive
 *
 * To that author's credit it NAMED all three as judgement calls and argued each
 * -- that deriving the bound IS the item's work, so a student who has it has
 * already solved. That argument holds for the first two, where the bound needs
 * the first real step. It fails for the third: reading the sign of -b/2a off
 * the signs of a and b takes no arithmetic at all, and the author called that
 * one its own weakest.
 *
 * So: a zero here is necessary and not sufficient. Someone other than the
 * author must ask, per item, "what does the stem let me rule out for free?"
 * and probe the bounds that answer it. The tool makes the declared case
 * decidable; it does not make the undeclared case go away.
 */
import { readFileSync } from 'node:fs'
import { val } from './check-key-magnitude.mjs'

export function audit(item) {
  const bounds = Array.isArray(item.bounds) ? item.bounds : null
  const key = val(item.correct_answer)
  const opts = (item.choices || []).map(c => ({ text: c, v: val(c) }))
  if (!bounds || !bounds.length) return { declared: false, dead: [], keyFails: [] }
  const test = (expr, v) => {
    if (v === null) return true                       // unparseable: cannot judge, treat as alive
    try { return Function('v', `"use strict";return (${expr})`)(v) === true } catch { return true }
  }
  const keyFails = bounds.filter(b => !test(b, key))
  const dead = opts
    .filter(o => o.text !== item.correct_answer)
    .map(o => ({ text: o.text, by: bounds.filter(b => !test(b, o.v)) }))
    .filter(o => o.by.length)
  /* AN INERT BOUND IS NOT A DECLARATION. A bound every option already satisfies
   * constrains nothing, and an item whose bounds are ALL inert has effectively
   * declared nothing while passing. Found 2026-09-24: a batch passed with zero
   * dead options where the declarations were `Number.isInteger(v)` on sets of
   * four integers and `v > 12` on a set whose smallest option was 60, while a
   * grader found a live undeclared bound on all 18 items and seven that lose
   * ALL THREE distractors to one. Passing by declaring nothing is the
   * "check that cannot read its input" pattern wearing a new coat. */
  const inert = bounds.filter(b => opts.every(o => test(b, o.v)))
  return { declared: true, dead, keyFails, nBounds: bounds.length, inert, allInert: inert.length === bounds.length }
}

const RUN_AS_CLI = process.argv[1] && process.argv[1].endsWith('check-dead-options.mjs')
if (RUN_AS_CLI) {
  /* SELF-TEST. The detector must reproduce a KNOWN answer before it is pointed
   * at unknown data: the real SM14L-10 shape, a clean item, and a bad bound. */
  const fail = m => { console.error('SELF-TEST FAILED: ' + m); process.exit(2) }
  const killer = audit({ correct_answer: '60', choices: ['12', '36', '45', '60'], bounds: ['v % 20 === 0'] })
  if (killer.dead.length !== 3) fail(`the multiple-of-20 case should kill 3, killed ${killer.dead.length}`)
  const clean = audit({ correct_answer: '7', choices: ['5', '7', '9', '11'], bounds: ['v > 0', 'Number.isInteger(v)'] })
  if (clean.dead.length !== 0) fail(`a clean set should kill 0, killed ${clean.dead.length}`)
  const badKey = audit({ correct_answer: '7', choices: ['5', '7', '9', '11'], bounds: ['v % 2 === 0'] })
  if (!badKey.keyFails.length) fail('a key violating its own declared bound must be caught')
  const silent = audit({ correct_answer: '7', choices: ['5', '7', '9', '11'] })
  if (silent.declared) fail('an item with no bounds must report declared:false, not a pass')
  const frac = audit({ correct_answer: '1/2', choices: ['1/2', '2', '3', '4'], bounds: ['v < 1'] })
  if (frac.dead.length !== 3) fail(`fractions must be evaluated: expected 3 dead, got ${frac.dead.length}`)
  console.log('self-test: 5 fixtures pass (killer set, clean set, bad key, silence, fractions)\n')

  const files = process.argv.slice(2)
  if (!files.length) { console.error('usage: check-dead-options.mjs <batch.json ...>'); process.exit(2) }
  let n = 0, undeclared = 0, withDead = 0, keyBad = 0, allInert = 0
  for (const f of files) {
    let a; try { a = JSON.parse(readFileSync(f, 'utf8')) } catch (e) { console.error(`REFUSING: cannot read ${f}: ${e.message}`); process.exit(2) }
    if (!Array.isArray(a) || !a.length) { console.error(`REFUSING: ${f} holds zero items`); process.exit(2) }
    console.log(f.replace(/^.*\//, ''))
    for (const x of a) {
      n++
      const r = audit(x)
      if (!r.declared) { undeclared++; console.log(`  ${String(x.id).padEnd(12)}no bounds declared — NOT a pass, only a silence`); continue }
      if (r.keyFails.length) { keyBad++; console.log(`  ${String(x.id).padEnd(12)}KEY VIOLATES ITS OWN BOUND: ${r.keyFails.join(' AND ')}`); continue }
      if (r.dead.length) { withDead++; console.log(`  ${String(x.id).padEnd(12)}${r.dead.length} DEAD of 3: ` + r.dead.map(d => `${d.text} (${d.by[0]})`).join(', ')) }
      else if (r.allInert) { allInert++; console.log(`  ${String(x.id).padEnd(12)}ALL ${r.nBounds} BOUND(S) INERT — every option already satisfies them, so nothing was declared`) }
      else console.log(`  ${String(x.id).padEnd(12)}ok — ${r.nBounds} bound(s), ${r.inert.length} inert, no distractor dies`)
    }
  }
  console.log(`\n  ${n} items: ${withDead} with a dead option, ${keyBad} whose key breaks its own bound, ${undeclared} with nothing declared, ${allInert} whose bounds are ALL INERT`)
  if (allInert) console.log('  An all-inert item has passed by declaring nothing. Treat it as undeclared.')
  process.exitCode = (withDead || keyBad || allInert) ? 1 : 0
}
