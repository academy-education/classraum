#!/usr/bin/env node
/**
 * alg26-order.mjs [--dry]
 *
 * Builds the FROZEN file for sat-math-v26-alg (PREREG-ALG26-2026-10-08.md) from
 * the four author files, in an order fixed by a seed committed before any item
 * existed. Written because A85 found that rule 7 ("a grader majority names the
 * item one template with an EARLIER item -> the later item is dropped") let the
 * AUTHORING order decide which author's items died: v25's Q file, frozen second,
 * lost 8 of 11.
 *
 *   1. read sat-math-v26-alg-{a,b,c,d}.batch.json (ids must be commissioned slots)
 *   2. take the 32 commissioned ids A1..A8, B1..B8, C1..C8, D1..D8 in that order
 *   3. Fisher-Yates with seeded-shuffle.mjs rng(SEED), SEED = 20261026; items are
 *      placed in that order (an item dropped pre-freeze leaves its slot empty, so
 *      the order of the rest is the pre-registered one)
 *   4. write sat-math-v26-alg.meta.json (author-only fields per id, for the
 *      kept-set reports) and sat-math-v26-alg.batch.json with those fields
 *      stripped (setup, ask, mech, key_position, off_by_one_options, self-check
 *      notes), exactly as v25 stripped `setup`
 *
 * The seed is not chosen after seeing the items, and nothing re-runs this with
 * another seed. --dry prints the order without writing.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { rng, shuffleWith } from './seeded-shuffle.mjs'

export const SEED = 20261026
const DIR = new URL('.', import.meta.url).pathname
const AUTHOR_ONLY = ['setup', 'ask', 'mech', 'key_position', 'off_by_one_options', 'self_check', 'nonint_constant', 'integer_k_answer']
const KEEP = ['domain', 'difficulty', 'id', 'subskill', 'prompt', 'choices', 'correct_answer', 'explanation', 'mechanism', 'solve', 'distractor_solve']

const items = []
for (const a of ['a', 'b', 'c', 'd']) {
  const p = `${DIR}sat-math-v26-alg-${a}.batch.json`
  let j
  try { j = JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${p}: ${e.message}`); process.exit(2) }
  if (!Array.isArray(j) || !j.length || j.length > 8) { console.error(`REFUSING: ${p} holds ${Array.isArray(j) ? j.length : 'no'} items, expected 1-8`); process.exit(2) }
  items.push(...j)
}
const SLOTS = []; for (const a of 'ABCD') for (let i = 1; i <= 8; i++) SLOTS.push(`SM26L-${a}${i}`)
const ids = items.map(x => x.id)
if (new Set(ids).size !== ids.length) { console.error('REFUSING: duplicate ids'); process.exit(2) }
for (const id of ids) if (!SLOTS.includes(id)) { console.error(`REFUSING: ${id} is not a commissioned slot`); process.exit(2) }
const order = shuffleWith(SLOTS.slice(), rng(SEED))
const at = new Map(order.map((id, i) => [id, i]))
items.sort((x, y) => at.get(x.id) - at.get(y.id))
console.log(`seed ${SEED} slot order: ${order.map(x => x.replace('SM26L-', '')).join(' ')}`)
console.log(`frozen ${items.length}: ${items.map(x => x.id.replace('SM26L-', '')).join(' ')}`)
if (process.argv.includes('--dry')) process.exit(0)
const meta = {}, frozen = []
items.forEach((x, i) => {
  meta[x.id] = { position: i + 1, ...Object.fromEntries(AUTHOR_ONLY.filter(k => k in x).map(k => [k, x[k]])) }
  const extra = Object.keys(x).filter(k => !KEEP.includes(k) && !AUTHOR_ONLY.includes(k))
  if (extra.length) { console.error(`REFUSING: ${x.id} carries unexpected fields ${extra.join(',')}`); process.exit(2) }
  frozen.push(Object.fromEntries(KEEP.filter(k => k in x).map(k => [k, x[k]])))
})
writeFileSync(`${DIR}sat-math-v26-alg.meta.json`, JSON.stringify(meta, null, 1) + '\n')
writeFileSync(`${DIR}sat-math-v26-alg.batch.json`, JSON.stringify(frozen, null, 1) + '\n')
console.log(`wrote sat-math-v26-alg.batch.json (${frozen.length}) and sat-math-v26-alg.meta.json`)
