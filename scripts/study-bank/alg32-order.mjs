#!/usr/bin/env node
/**
 * alg32-order.mjs [--print-order | --dry]
 *
 * Builds the FROZEN file for sat-math-v32-alg (PREREG-MATH-ALG32-2026-10-23.md) from the three
 * author files, in an order fixed by a seed committed before any item existed (alg26-order.mjs
 * with the ids, seed and allow-lists changed). Rule 11 / rule 7 ("template of an EARLIER item")
 * read "earlier" in THIS order, so the authoring order cannot decide whose items die (A85).
 *
 *   --print-order  prints the seeded slot order and exits (no input read; the prereg quotes it)
 *   --dry          reads the author files and prints the frozen order without writing
 *   (default)      reads sat-math-v32-alg-{b,c,d}.batch.json, writes sat-math-v32-alg.meta.json
 *                  (author-only fields per id, for the kept-set reports) and
 *                  sat-math-v32-alg.batch.json (only the KEEP fields, the student-facing item plus
 *                  solve / distractor_solve for the sandbox)
 *
 * SEED_ORDER (alg32-slots.mjs) = 20261041. Nothing re-runs this with another seed. An item dropped
 * before freeze leaves its slot empty, so the order of the rest is the pre-registered one.
 * Refuses (exit 2): a missing / empty / oversized author file, an uncommissioned id, a duplicate,
 * or a field on neither list.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
import { SLOTS, PREFIX, COHORT, SEED_ORDER } from './alg32-slots.mjs'

const DIR = new URL('.', import.meta.url).pathname
export const AUTHOR_ONLY = ['setup', 'ask', 'mech', 'key_position', 'off_by_one_options', 'nonint_constant', 'integer_k_answer', 'bypass_option',
  'plugback', 'distractor_meta', 'counter_error', 'far_distractor', 'structure_check', 'intermediate_check', 'cheap_bound_check', 'shape_check',
  'interior_parity_check', 'arith_class_check', 'quantity_asked', 'dup_search', 'idea_probe', 'self_audit', 'bounds']
export const KEEP = ['domain', 'difficulty', 'id', 'subskill', 'prompt', 'choices', 'correct_answer', 'explanation', 'mechanism', 'solve', 'distractor_solve']
const ALL = Object.keys(SLOTS).map(s => PREFIX + s)
export const ORDER = shuffleWith(ALL.slice(), rng(SEED_ORDER))

const args = process.argv.slice(2)
console.log(`seed ${SEED_ORDER} slot order: ${ORDER.map(x => x.replace(PREFIX, '')).join(' ')}`)
if (args.includes('--print-order')) {
  const mean = a => (ORDER.reduce((s, id, i) => s + (id.replace(PREFIX, '')[0] === a ? i + 1 : 0), 0) / ORDER.filter(id => id.replace(PREFIX, '')[0] === a).length).toFixed(1)
  console.log(`mean position B ${mean('B')}, C ${mean('C')}, D ${mean('D')}`)
  process.exit(0)
}
const items = []
for (const a of ['b', 'c', 'd']) {
  const p = `${DIR}${COHORT}-${a}.batch.json`
  let j
  try { j = JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${p}: ${e.message}`); process.exit(2) }
  if (!Array.isArray(j) || !j.length || j.length > 8) { console.error(`REFUSING: ${p} holds ${Array.isArray(j) ? j.length : 'no'} items, expected 1-8`); process.exit(2) }
  items.push(...j)
}
const ids = items.map(x => x.id)
if (new Set(ids).size !== ids.length) { console.error('REFUSING: duplicate ids'); process.exit(2) }
for (const id of ids) if (!ALL.includes(id)) { console.error(`REFUSING: ${id} is not a commissioned slot`); process.exit(2) }
const at = new Map(ORDER.map((id, i) => [id, i]))
items.sort((x, y) => at.get(x.id) - at.get(y.id))
console.log(`frozen ${items.length}: ${items.map(x => x.id.replace(PREFIX, '')).join(' ')}`)
const meta = {}, frozen = []
for (const [i, x] of items.entries()) {
  const extra = Object.keys(x).filter(k => !KEEP.includes(k) && !AUTHOR_ONLY.includes(k))
  if (extra.length) { console.error(`REFUSING: ${x.id} carries unexpected fields ${extra.join(',')}`); process.exit(2) }
  meta[x.id] = { position: i + 1, ...Object.fromEntries(AUTHOR_ONLY.filter(k => k in x).map(k => [k, x[k]])) }
  frozen.push(Object.fromEntries(KEEP.filter(k => k in x).map(k => [k, x[k]])))
}
if (args.includes('--dry')) process.exit(0)
writeFileSync(`${DIR}${COHORT}.meta.json`, JSON.stringify(meta, null, 1) + '\n')
writeFileSync(`${DIR}${COHORT}.batch.json`, JSON.stringify(frozen, null, 1) + '\n')
console.log(`wrote ${COHORT}.batch.json (${frozen.length}) and ${COHORT}.meta.json`)
