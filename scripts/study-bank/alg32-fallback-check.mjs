#!/usr/bin/env node
/**
 * alg32-fallback-check.mjs [--table <slots.json>] — PREREG-MATH-ALG32-2026-10-23.md rule 6, checked AT
 * PREREG TIME against the planned slots, the way a bar is checked against the control's ceiling.
 *
 * WHY. alg31's strict fallback ("probe invalid twice -> every item at natural try 1-2 is treated as
 * substitutable, returned, then dropped if still at try 1-2") could only drop by POSITION, and its slot
 * table put 11 keys at try 1-2 BY DESIGN. Under the fallback those 11 dropped, and the 13 survivors
 * failed R7 (69.2%), R10 (degenerate-parameter bypass 0 above / 5 below) and the projection (~8.9 kept
 * < 12): a stop condition hidden inside a rule (alg31 Result, lesson 1).
 *
 * alg32's fallback, pre-registered (the batch probe is INVALID on two fresh readers):
 *   - nothing is dropped by position. The fallback DROP set is the items whose key is at natural try
 *     1-2 AND whose ask is not an aggregate (count / sum / difference) - the measured plug-back class
 *     (alg26: 5 of 8 greatest / least / value items at try 1-2 dropped to r6; 0 of 9 aggregates).
 *     alg32-slots forbids exactly that combination, so on a slot-compliant file the set is EMPTY BY
 *     CONSTRUCTION, and this script proves it from the table;
 *   - every try-1-2 item is instead RETURNED once if my stage-0 hand read finds a routine option check
 *     (rule 6), to be made non-substitutable WITHOUT changing its slot ask or rank. A return is never a
 *     drop; the post-freeze r6 (three graders) decides, as for every item.
 *
 * This script:
 *   1. derives the fallback drop set from the table and checks R6 (projection), R7 and R10 on the
 *      survivors of the WORST CASE the fallback allows. Exit 1 if any bar fails.
 *   2. BREAK-TEST: reproduces alg31's recorded stop from alg31's 24 parts (fixtures: seen by probes,
 *      never candidates) under alg31's position fallback: R7 9/13 = 69.2%, R10 B 0 above / 5 below,
 *      projection ~8.9. Exit 2 if it does not reproduce (the checker would not have caught alg31).
 *   3. REPORTS the post-drop bars. Coordinator decision 2026-10-23 (prereg section 5.1, decided before
 *      any item): R7, R10 and the projection are BARRED on the AUTHORED merge and only REPORTED after
 *      stage-0 drops (alg32-preflight --merge --after-drops), as alg31 already treated the kept file.
 *      So a drop can no longer stop the batch at pre-flight; this section prints, for m try-1-2 items
 *      (and any 1-2 slots) lost, how many drop sets would still meet the authored-merge bars - the
 *      information a reader of the reported lines needs, not a gate.
 *
 * --table <file>: evaluate another slot table ({ "B1": ["count", 1, "above"], ... }) with alg32's
 * fallback rule (a break-test input: alg31's table must FAIL here). Exit 2 on an empty / malformed table.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { SLOTS as ALG32, NONSUB_ASKS, COARSE, naturalTry, bestRule, rank, val } from './alg32-slots.mjs'
import { rates, bars, project } from './alg31-projection.mjs'

const D = new URL('.', import.meta.url).pathname
const pct = x => (100 * x).toFixed(1) + '%'

/** the cross-item bars on a set of [slot, ask, rank, side] rows, as alg32-preflight --merge applies them */
export function batchBars(rows, R) {
  const fails = [], n = rows.length
  if (!n) return { fails: ['no survivors'], n }
  const cap = 0.4 * n
  const fine = bestRule(rows.map(r => [r.ask, r.rank])), coarse = bestRule(rows.map(r => [COARSE[r.ask], r.rank])), mech = bestRule(rows.map(r => [r.slot[0], r.rank]))
  if (fine.hits > cap) fails.push(`R7 ask->rank ${fine.hits}/${n} = ${pct(fine.hits / n)} > 40%`)
  if (coarse.hits > cap) fails.push(`R7 coarse ${coarse.hits}/${n} = ${pct(coarse.hits / n)} > 40%`)
  if (mech.hits > cap) fails.push(`R7 mechanism->rank ${mech.hits}/${n} = ${pct(mech.hits / n)} > 40%`)
  for (const [k, c] of Object.entries(fine.groups)) { const t = c.reduce((a, b) => a + b, 0), m = Math.max(...c); if (t >= 4 && m / t > 0.5) fails.push(`R7 within ${k}: rank ${c.indexOf(m)} on ${m}/${t}`) }
  const side = {}
  for (const r of rows) { const s = (side[r.slot[0]] ??= { above: 0, below: 0, n: 0 }); s[r.side]++; s.n++ }
  for (const [m, s] of Object.entries(side)) { const need = Math.floor(3 * s.n / 8); if (s.above < need || s.below < need) fails.push(`R10 ${m}: above ${s.above} / below ${s.below} of ${s.n} (need >= ${need} each)`) }
  const t = { min: rows.filter(r => r.rank === 1).length, max: rows.filter(r => r.rank === 4).length, mid: rows.filter(r => r.rank === 2 || r.rank === 3).length, n }
  const b = bars(t, R)
  for (const f of b.fails) fails.push(`R6/projection ${f}`)
  return { fails, n, fine, coarse, mech, side, proj: b }
}

const rowsOf = table => Object.entries(table).map(([slot, [ask, rk, side]]) => ({ slot, ask, rank: rk, side, tri: naturalTry(ask, rk) }))
/** alg32's fallback: the drop set is try-1-2 AND not an aggregate ask */
export const fallbackDrops = rows => rows.filter(r => r.tri <= 2 && !NONSUB_ASKS.includes(r.ask))

function combos(arr, m, start = 0, acc = [], out = []) {
  if (acc.length === m) { out.push(acc.slice()); return out }
  for (let i = start; i < arr.length; i++) { acc.push(arr[i]); combos(arr, m, i + 1, acc, out); acc.pop() }
  return out
}

let R
try { R = rates() } catch (e) { console.error(`REFUSING: ${e.message}`); process.exit(2) }
const args = process.argv.slice(2)
let table = ALG32, label = 'alg32 slot table'
const ti = args.indexOf('--table')
if (ti >= 0) {
  try {
    table = JSON.parse(readFileSync(args[ti + 1], 'utf8'))
    if (!table || typeof table !== 'object' || Array.isArray(table) || !Object.keys(table).length) throw new Error('empty table')
    for (const [s, v] of Object.entries(table)) if (!Array.isArray(v) || v.length !== 3 || ![1, 2, 3, 4].includes(v[1]) || !['above', 'below'].includes(v[2])) throw new Error(`slot ${s}: expected [ask, rank 1-4, "above"|"below"]`)
  } catch (e) { console.error(`REFUSING: --table ${args[ti + 1] ?? '<none>'}: ${e.message}`); process.exit(2) }
  label = `table ${args[ti + 1]}`
}

// 2. BREAK-TEST FIRST: alg31's recorded stop must reproduce from its own parts under ITS fallback
let parts = []
try { const P = `${D}sat-math-alg31-work/parts`; parts = readdirSync(P).filter(f => /^SM31L-[BCD]\d\.json$/.test(f)).map(f => JSON.parse(readFileSync(`${P}/${f}`, 'utf8'))) } catch { }
if (parts.length !== 24) { console.error(`REFUSING: ${parts.length} alg31 fixture parts, expected 24`); process.exit(2) }
const a31 = parts.map(p => { const rk = rank(p.choices.map(String), String(p.correct_answer)); return { slot: p.id.replace('SM31L-', ''), ask: p.ask, rank: rk, side: val(p.bypass_option) > val(p.correct_answer) ? 'above' : 'below', tri: naturalTry(p.ask, rk) } })
const a31surv = a31.filter(r => r.tri > 2)
const a31b = batchBars(a31surv, R)
const repro = a31surv.length === 13 && a31b.fine.hits === 9 && a31b.side.B?.above === 0 && a31b.side.B?.below === 5 && Math.abs(a31b.proj.pr.n - 8.9) < 0.1 && a31b.fails.length > 0
console.log(`break-test - alg31's 24 parts under alg31's position fallback: ${a31.length - a31surv.length} dropped (${a31.filter(r => r.tri <= 2).map(r => r.slot).join(' ')}), ${a31surv.length} survive`)
for (const f of a31b.fails) console.log(`    FAIL ${f}`)
console.log(`  ${repro ? 'REPRODUCES the recorded stop (R7 69.2%, R10 B 0/5, projection ~8.9): the check would have caught alg31' : 'DOES NOT REPRODUCE the recorded stop'}`)
if (!repro) process.exit(2)
// and alg32's own fallback applied to alg31's TABLE drops the two non-aggregate try-2 slots (D6, D7)
const a31TableDrops = fallbackDrops(a31)
console.log(`  alg32's fallback rule on alg31's table would drop ${a31TableDrops.length}: ${a31TableDrops.map(r => `${r.slot} ${r.ask}/r${r.rank}`).join(', ') || 'none'} (alg31's table violated the alg32 slot rule there)`)

// 1. the worst case alg32's fallback allows, on the table under test
const rows = rowsOf(table)
const drops = fallbackDrops(rows), surv = rows.filter(r => !drops.includes(r))
const early = rows.filter(r => r.tri <= 2)
console.log(`\n${label}: ${rows.length} slots; ${early.length} at natural try 1-2 (${early.map(r => `${r.slot} ${r.ask}`).join(', ')})`)
console.log(`  fallback drop set (try 1-2 AND not count/sum/difference): ${drops.length ? drops.map(r => `${r.slot} ${r.ask}/r${r.rank}`).join(', ') : 'EMPTY'}${drops.length ? '' : ' - by construction of the slot rule'}`)
const wb = batchBars(surv, R)
console.log(`  worst case under the fallback: ${surv.length} survive; extreme ${wb.proj.pr ? `pooled ${pct(wb.proj.pr.share)}, equal ${pct(wb.proj.er.share)}, kept ~${wb.proj.pr.n.toFixed(1)}` : '-'}; R7 ${wb.fine?.hits}/${surv.length} fine, ${wb.coarse?.hits} coarse, ${wb.mech?.hits} mech; R10 ${Object.entries(wb.side ?? {}).map(([m, s]) => `${m} ${s.above}/${s.below}`).join(' ')}`)
for (const f of wb.fails) console.log(`    FAIL ${f}`)
console.log(`  WORST-CASE FALLBACK: ${wb.fails.length ? 'FAILS a bar - the fallback can stop the batch by construction' : 'PASSES R6 / R7 / R10 / projection'}`)

// 3. measurement drop budget (reported, not barred): try-1-2 items lost to a VALID probe or to post-freeze r6
console.log('\n  after stage-0 drops these bars are REPORTED, not barred (prereg 5.1). For information: m try-1-2 items lost -> drop sets still meeting the authored-merge bars; projected kept / extreme share (pooled rates)')
for (let m = 1; m <= early.length; m++) {
  const cs = combos(early, m)
  let pass = 0, minN = Infinity, maxN = -Infinity, worstShare = null
  for (const c of cs) {
    const s = rows.filter(r => !c.includes(r)), b = batchBars(s, R)
    if (!b.fails.length) pass++
    const t = { min: s.filter(r => r.rank === 1).length, max: s.filter(r => r.rank === 4).length, mid: s.filter(r => r.rank === 2 || r.rank === 3).length }
    const p = project(t, R.pooled[0], R.pooled[1])
    if (p.n < minN) { minN = p.n; worstShare = p.share }
    maxN = Math.max(maxN, p.n)
  }
  console.log(`    m=${String(m).padStart(2)}: ${String(pass).padStart(3)}/${String(cs.length).padEnd(3)} sets still meet the authored-merge bars; projected kept ${minN.toFixed(1)}-${maxN.toFixed(1)} (lowest at extreme share ${pct(worstShare)})`)
}
// the same budget over ALL slots (a stage-0 drop of any kind: live duplicate, a failed return)
for (const m of [1, 2]) {
  const cs = combos(rows, m); let pass = 0; const why = {}
  for (const c of cs) { const b = batchBars(rows.filter(r => !c.includes(r)), R); if (!b.fails.length) pass++; else for (const f of b.fails) { const k = f.split(' ').slice(0, 2).join(' '); why[k] = (why[k] || 0) + 1 } }
  console.log(`    any ${m} of ${rows.length} slots dropped: ${pass}/${cs.length} sets still meet the authored-merge bars (reported only)${Object.keys(why).length ? '; failing bars ' + JSON.stringify(why) : ''}`)
}
process.exit(wb.fails.length ? 1 : 0)
