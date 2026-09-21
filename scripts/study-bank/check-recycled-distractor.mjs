#!/usr/bin/env node
/**
 * check-recycled-distractor.mjs — within one cohort, is the KEY the option
 * no other item reuses?
 *
 * READ ONLY. Refuses rather than returning a number on unreadable input.
 *
 * Found 2026-09-21 by a blind solver attacking an 80-item SSAT synonym
 * batch: "400 option slots hold only 314 distinct words; `hollow` appears
 * 8 times, `wealthy` 7. Keys are item-specific because every stem differs,
 * so a recycled word is far more likely to be filler — in 11 items exactly
 * four options are recycled and one is unique, and I picked the unique
 * one."
 *
 * That is a CROSS-ITEM tell and invisible inside any single item, which is
 * the class CLAUDE.md records as having reached the bank three times
 * (slot-A keys, complete ABCD permutations, identical key prose). It is
 * also decidable, so it is measured exactly over the whole cohort instead
 * of sampled, and against a live control — the question is never "does
 * this cohort recycle words" but "does recycling locate the key".
 *
 *   node check-recycled-distractor.mjs <batch.json> [more.json ...]
 *
 * Each file is scored as its OWN cohort: recycling only helps a solver who
 * sees the items together, and a student meets one cohort's items spread
 * across forms. Pooling two unrelated batches would invent a tell.
 */
import { readFileSync } from 'node:fs'

const norm = s => String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

export function scoreCohort(batch) {
  const freq = new Map()
  for (const it of batch) for (const c of it.choices ?? []) freq.set(norm(c), (freq.get(norm(c)) ?? 0) + 1)
  let structured = 0, credit = 0, control = 0, n = 0
  const detail = []
  for (const it of batch) {
    const ch = it.choices ?? []
    if (ch.length < 4 || !it.correct_answer) continue
    n++
    const uniq = ch.filter(c => freq.get(norm(c)) === 1)
    /* The tell fires only when exactly ONE option is unique to the cohort:
     * that is when "pick the unique one" is a decision rather than a guess. */
    if (uniq.length !== 1) continue
    structured++
    const hit = norm(uniq[0]) === norm(it.correct_answer)
    if (hit) credit++
    /* Control derived from the data: with one unique option among ch.length,
     * a solver following the heuristic on an uninformative set is right
     * 1/ch.length of the time. */
    control += 1 / ch.length
    detail.push(`${it.id ?? '?'} ${hit ? 'KEY' : '   '} unique="${uniq[0]}"`)
  }
  return { n, structured, credit, control, detail }
}

const files = process.argv.slice(2)
if (!files.length) { console.error('usage: check-recycled-distractor.mjs <batch.json> ...'); process.exit(2) }
let bad = 0
for (const f of files) {
  let batch
  try { batch = JSON.parse(readFileSync(f, 'utf8')) } catch (e) { console.error(`REFUSING ${f}: ${e.message}`); process.exit(2) }
  if (!Array.isArray(batch) || !batch.length) { console.error(`REFUSING ${f}: parsed to zero items`); process.exit(2) }
  const slots = batch.reduce((a, it) => a + (it.choices?.length ?? 0), 0)
  const distinct = new Set(batch.flatMap(it => (it.choices ?? []).map(norm))).size
  const r = scoreCohort(batch)
  console.log(`\n${f}`)
  console.log(`  ${r.n} items, ${slots} option slots, ${distinct} distinct words (${(slots / Math.max(1, distinct)).toFixed(2)} uses per word)`)
  if (!r.structured) { console.log('  NO MEASUREMENT — no item has exactly one cohort-unique option'); continue }
  const rate = 100 * r.credit / r.structured, ctl = 100 * r.control / r.structured
  const margin = rate - ctl
  console.log(`  items with exactly ONE unique option: ${r.structured}`)
  console.log(`  that option IS the key: ${r.credit}/${r.structured} = ${rate.toFixed(1)}%  vs derived control ${ctl.toFixed(1)}%  margin ${(margin >= 0 ? '+' : '') + margin.toFixed(1)}pts`)
  if (margin > 15) { console.log('  ^ FIRES: within this cohort the key is locatable by word recycling alone'); bad++ }
}
process.exit(bad ? 1 : 0)
