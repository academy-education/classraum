#!/usr/bin/env node
/**
 * check-analogy-reversal.mjs — is the key recoverable as the option that
 * is NOT the reverse of another option?
 *
 * READ ONLY. Refuses rather than returning a number when it cannot read
 * its input.
 *
 * Two blind solvers, independently, named this as the tell that carried a
 * 102-item analogy batch on 2026-09-21: "one option is visibly another
 * option inverted, which marks the un-inverted pair as the original".
 * The published distractor list tells an author to include "the correct
 * relation REVERSED in order" — every author did, in almost every item,
 * so the reversal became a constant of the batch rather than a trap. It
 * is the shape CLAUDE.md records as "a batch built to one brief develops
 * a cross-item tell": the more rigid the spec, the more the answer is
 * predictable from the spec instead of the content.
 *
 * Unlike a semantic tell this one is decidable, so it is measured exactly
 * over the whole population rather than sampled — and against the LIVE
 * bank as a control, because the question is not "does this batch contain
 * reversals" but "does containing them make the key findable".
 */
import { readFileSync } from 'node:fs'

const norm = s => String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
const split = s => {
  const m = norm(s).match(/^(.*?) is to (.*)$/)
  return m ? [m[1].trim(), m[2].trim()] : null
}

/** For one option set: which options are the reverse of another option? */
export function scoreItem(choices, key) {
  const pairs = choices.map(split)
  if (pairs.some(p => !p)) return null            // not an analogy option set
  const isReversed = pairs.map(([a, b], i) =>
    pairs.some(([c, d], j) => j !== i && c === b && d === a))
  const clean = isReversed.map((r, i) => !r ? i : -1).filter(i => i >= 0)
  if (!isReversed.some(Boolean)) return { structured: false }
  const keyIdx = choices.indexOf(key)
  if (keyIdx < 0) return null
  return {
    structured: true,
    reversedCount: isReversed.filter(Boolean).length,
    cleanCount: clean.length,
    /* Credit as a blind solver would score it: among the options that are
     * NOT a reversal of another, is the key one of them, and how much does
     * that narrow the field? 1/cleanCount if so, 0 if the key is itself a
     * reversal member. */
    credit: clean.includes(keyIdx) ? 1 / clean.length : 0,
  }
}

const file = process.argv[2]
if (!file) { console.error('usage: check-analogy-reversal.mjs <batch.json>'); process.exit(2) }
let batch
try { batch = JSON.parse(readFileSync(file, 'utf8')) } catch (e) {
  console.error(`REFUSING: cannot read ${file}: ${e.message}`); process.exit(2)
}
if (!Array.isArray(batch) || !batch.length) { console.error(`REFUSING: ${file} parsed to zero items`); process.exit(2) }

let n = 0, structured = 0, credit = 0, control = 0
for (const it of batch) {
  const r = scoreItem(it.choices, it.correct_answer)
  if (!r) continue
  n++
  if (!r.structured) continue
  structured++
  credit += r.credit
  /* Control derived from the data: rotate which option is called the key
   * and average, so a set whose reversal structure carries no information
   * returns exactly 1/5. */
  let c = 0
  for (const alt of it.choices) c += (scoreItem(it.choices, alt)?.credit ?? 0)
  control += c / it.choices.length
}
console.log(`${file}`)
console.log(`  scorable ${n} of ${batch.length}   with a reversal pair: ${structured} (${(100 * structured / Math.max(1, n)).toFixed(1)}%)`)
if (!structured) { console.log('  NO MEASUREMENT — no reversal structure in any option set'); process.exit(0) }
const rate = 100 * credit / structured, ctl = 100 * control / structured
console.log(`  key is a NON-reversal option: ${rate.toFixed(1)}%  vs derived control ${ctl.toFixed(1)}%  margin ${(rate - ctl >= 0 ? '+' : '') + (rate - ctl).toFixed(1)}pts`)
