#!/usr/bin/env node
/**
 * act-math-v27-ies-verify.mjs <frozen batch.json> <grader-a.json> <grader-b.json>
 *
 * Stage-2 comparison for act-math-v27 (ACT-MATH-V27-PREREGISTERED.md): the
 * graders VERIFY each IES author's direction declaration without ever seeing it.
 * The declaration (`direction_declaration`, checked against the item's own
 * numbers at stage 0 by act-math-v27-ies-directions.mjs) is stripped from the
 * render. Each grader independently fills `error_directions` for every option it
 * did not pick (error, above/below, predictable_from_stem) and, on IES items,
 * `ies_counter`: the most natural error that moves the answer the OTHER way from
 * the three wrong options (extreme key), or a confirmation that wrong options sit
 * on both sides (interior key), and whether that error is as natural as the
 * errors that made the options.
 *
 * This script lines the two up, per IES item and per distractor:
 *   - declared direction vs each grader's direction (mechanical; a mismatch can
 *     only come from a grader picking a different key, which rule 1 handles)
 *   - declared step / error_type beside each grader's named error (READ by hand:
 *     a grader naming a different error for an option is recorded, not a drop)
 *   - declared counter_error beside each grader's ies_counter (READ by hand)
 *   - predictable_from_stem per grader
 * and prints the verified count: declarations whose direction both graders
 * reproduce, out of all IES distractor declarations; and IES extreme-key items
 * on which at least one grader found a counter-direction error as natural as the
 * option errors (`as_natural: true`), out of all IES extreme-key items.
 *
 * Refuses (exit 2) if a grader output lacks error_directions on any item or
 * ies_counter on any IES item: an incomplete grade is re-run, not scored.
 */
import { readFileSync } from 'node:fs'

const IES = 'Integrating Essential Skills'
const [pb, pa, pg] = process.argv.slice(2)
if (!pb || !pa || !pg) { console.error('usage: act-math-v27-ies-verify.mjs <batch.json> <grader-a.json> <grader-b.json>'); process.exit(2) }
const rd = p => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${p}: ${e.message}`); process.exit(2) } }
const items = rd(pb), G = { A: rd(pa), B: rd(pg) }
if (!Array.isArray(items) || !items.length) { console.error('REFUSING: no items'); process.exit(2) }
const num = s => Number(String(s).replace(/[,$%\s]/g, '').replace(/−/g, '-'))
for (const [g, out] of Object.entries(G)) for (const it of items) {
  const r = out[it.id]
  if (!r) { console.error(`REFUSING: grader ${g} has no entry for ${it.id}`); process.exit(2) }
  if (!r.error_directions || Object.keys(r.error_directions).length < 3) { console.error(`REFUSING: grader ${g} error_directions incomplete on ${it.id}`); process.exit(2) }
  if (it.domain === IES && !r.ies_counter) { console.error(`REFUSING: grader ${g} ies_counter missing on IES ${it.id}`); process.exit(2) }
}
let decl = 0, both = 0, ext = 0, extCounter = 0
const ies = items.filter(i => i.domain === IES)
if (!ies.length) { console.error('REFUSING: no IES items'); process.exit(2) }
for (const it of ies) {
  const dd = it.direction_declaration || {}
  const k = num(it.correct_answer), v = it.choices.map(num).sort((a, b) => a - b)
  const isExt = k === v[0] || k === v[3]
  console.log(`\n${it.id}  key ${it.correct_answer}${isExt ? ' (EXTREME)' : ''}   picks A ${G.A[it.id].pick}  B ${G.B[it.id].pick}`)
  for (const c of it.choices.map(String).filter(c => c !== String(it.correct_answer))) {
    const d = dd[c] || {}; decl++
    const gd = g => { const e = G[g][it.id].error_directions[c]; return e ? { dir: e.direction === 'above' ? 'over' : e.direction === 'below' ? 'under' : e.direction, err: e.error, pred: e.predictable_from_stem } : null }
    const a = gd('A'), b = gd('B')
    const ok = a && b && a.dir === d.direction && b.dir === d.direction
    if (ok) both++
    console.log(`  ${c.padEnd(10)} declared ${String(d.direction).padEnd(5)} ${d.error_type || '?'} @ ${d.step || '?'}`)
    console.log(`  ${''.padEnd(10)}   A ${a ? a.dir : 'MISSING'} pred=${a?.pred} | ${String(a?.err ?? '').slice(0, 110)}`)
    console.log(`  ${''.padEnd(10)}   B ${b ? b.dir : 'MISSING'} pred=${b?.pred} | ${String(b?.err ?? '').slice(0, 110)}${ok ? '' : '   <- DIRECTION NOT REPRODUCED'}`)
  }
  const ce = dd.counter_error
  if (ce) console.log(`  counter declared: ${ce.direction} ${ce.error_type} @ ${ce.step}`)
  for (const g of ['A', 'B']) { const c = G[g][it.id].ies_counter; console.log(`  counter ${g}: ${typeof c === 'string' ? c : JSON.stringify(c).slice(0, 220)}`) }
  if (isExt) { ext++; if (['A', 'B'].some(g => G[g][it.id].ies_counter?.as_natural === true)) extCounter++ }
}
console.log(`\nIES ${ies.length}: distractor directions reproduced by both graders ${both}/${decl}; extreme-key IES items with a counter-direction error rated as natural by >= 1 grader ${extCounter}/${ext}`)
