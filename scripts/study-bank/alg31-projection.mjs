#!/usr/bin/env node
/**
 * alg31-projection.mjs [--selftest] <batch.json ...> — rule 1 of PREREG-MATH-ALG31-2026-10-23.md:
 * the kept set's key position projected BEFORE the attack, from survival rates DERIVED from the
 * files of the three prior hard-Algebra batches (asserted against REGISTER A84 / A85 / A87, never
 * typed in):
 *
 *   v24  sat-math-v24-alg.batch.json (13 frozen) / .held.batch.json (7 survived): ext 2/7, int 5/6
 *   v25  sat-math-v25-alg.batch.json (32) / .held.batch.json (19):                ext 13/24, int 6/8
 *   v26  sat-math-v26-alg.batch.json (32) / .kept.batch.json (25):                ext 13/18, int 12/14
 *   POOLED v24 + v25 + v26:                                                        ext 28/49, int 23/28
 *
 * This is key-extremity-projection.mjs --profile sat-alg26 with v26 added to the pool and the live
 * magnitude read removed (no bar used it under sat-alg26). Bars, merged set only (exit 1 on any):
 *   pooled-rate projection AND equal-rate projection (= the authored share) both inside 42.0-58.0%
 *   (2 points inside the 40-60% kept-set band); projected kept n >= 12.
 * v24-only, v25-only and v26-only projections are printed, not barred.
 * Exit 2 if it cannot read or score its input (an empty file, a non-numeric set, a rate file that
 * does not reproduce its register numbers).
 */
import { readFileSync } from 'node:fs'
import { scoreItem } from './key-extremity-breakdown.mjs'

const DIR = new URL('.', import.meta.url).pathname
const pct = x => (100 * x).toFixed(1) + '%'

export function position(items) {
  const t = { min: 0, mid: 0, max: 0, skip: 0, n: 0 }
  for (const it of items) {
    const s = scoreItem((it.choices || []).map(String), String(it.correct_answer))
    if (s.skip) { t.skip++; continue }
    t.n++
    if (s.keyMin) t.min++; else if (s.keyMax) t.max++; else t.mid++
  }
  return t
}
export function project(t, keepExt, keepInt) {
  const ext = (t.min + t.max) * keepExt, mid = t.mid * keepInt
  return { n: ext + mid, share: ext / (ext + mid) }
}
export const SOURCES = [
  ['v24', 'sat-math-v24-alg.batch.json', 'sat-math-v24-alg.held.batch.json', [2, 7, 5, 6]],
  ['v25', 'sat-math-v25-alg.batch.json', 'sat-math-v25-alg.held.batch.json', [13, 24, 6, 8]],
  ['v26', 'sat-math-v26-alg.batch.json', 'sat-math-v26-alg.kept.batch.json', [13, 18, 12, 14]],
]
export function rates() {
  const out = {}
  let E1 = 0, E0 = 0, I1 = 0, I0 = 0
  for (const [name, frozenF, keptF, want] of SOURCES) {
    const frozen = JSON.parse(readFileSync(DIR + frozenF, 'utf8')), kept = new Set(JSON.parse(readFileSync(DIR + keptF, 'utf8')).map(x => x.id))
    let e0 = 0, e1 = 0, i0 = 0, i1 = 0
    for (const x of frozen) {
      const s = scoreItem(x.choices.map(String), String(x.correct_answer)); if (s.skip) continue
      if (s.keyMin || s.keyMax) { e0++; if (kept.has(x.id)) e1++ } else { i0++; if (kept.has(x.id)) i1++ }
    }
    if (e1 !== want[0] || e0 !== want[1] || i1 !== want[2] || i0 !== want[3]) throw new Error(`${name} rates derived ${e1}/${e0}, ${i1}/${i0}; the register measured ${want[0]}/${want[1]}, ${want[2]}/${want[3]}`)
    out[name] = [e1 / e0, i1 / i0, `${e1}/${e0}`, `${i1}/${i0}`]
    E1 += e1; E0 += e0; I1 += i1; I0 += i0
  }
  out.pooled = [E1 / E0, I1 / I0, `${E1}/${E0}`, `${I1}/${I0}`]
  return out
}
export function bars(t, R) {
  const pr = project(t, R.pooled[0], R.pooled[1]), er = project(t, 1, 1)
  const fails = []
  if (!(pr.share >= 0.42 && pr.share <= 0.58)) fails.push(`pooled-rate ${pct(pr.share)} outside [42.0%, 58.0%]`)
  if (!(er.share >= 0.42 && er.share <= 0.58)) fails.push(`equal-rate ${pct(er.share)} outside [42.0%, 58.0%]`)
  if (pr.n < 12) fails.push(`projected kept n ${pr.n.toFixed(1)} < 12`)
  return { pr, er, fails }
}

function selftest(R) {
  let bad = 0
  // the commissioned matrix (13 extreme / 11 interior) passes: pooled 45.1%, equal 54.2%
  const m = bars({ min: 6, max: 7, mid: 11, n: 24 }, R)
  if (m.fails.length || Math.abs(m.pr.share - 0.4513) > 0.001 || Math.abs(m.er.share - 13 / 24) > 1e-9) { bad++; console.error('selftest matrix', m) }
  // 12 extreme fails LOW on the pooled rate (41.0%); 14 extreme fails HIGH on the equal rate (58.3%)
  if (!bars({ min: 6, max: 6, mid: 12, n: 24 }, R).fails.some(f => f.startsWith('pooled'))) { bad++; console.error('selftest: 12/24 extreme did not fail the pooled bar') }
  if (!bars({ min: 7, max: 7, mid: 10, n: 24 }, R).fails.some(f => f.startsWith('equal'))) { bad++; console.error('selftest: 14/24 extreme did not fail the equal bar') }
  // a 10-item file cannot project 12 kept
  if (!bars({ min: 3, max: 2, mid: 5, n: 10 }, R).fails.some(f => f.startsWith('projected kept'))) { bad++; console.error('selftest: small file did not fail kept n') }
  // v26 alone reproduces its kept share: 18 ext / 14 int at v26 rates -> 13/25
  const v = project({ min: 9, max: 9, mid: 14 }, R.v26[0], R.v26[1])
  if (Math.abs(v.share - 13 / 25) > 1e-9 || Math.abs(v.n - 25) > 1e-9) { bad++; console.error('selftest v26 reproduction', v) }
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log('selftest 5/5')
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  let R
  try { R = rates() } catch (e) { console.error(`REFUSING: ${e.message}`); process.exit(2) }
  selftest(R)
  const args = process.argv.slice(2)
  if (args.includes('--selftest')) process.exit(0)
  const paths = args.filter(a => !a.startsWith('--'))
  if (!paths.length) { console.error('usage: alg31-projection.mjs <batch.json ...>'); process.exit(2) }
  for (const k of ['v24', 'v25', 'v26', 'pooled']) console.log(`  survival ${k.padEnd(6)} extreme ${R[k][2]} = ${pct(R[k][0])}, interior ${R[k][3]} = ${pct(R[k][1])}`)
  let items = []
  try { for (const p of paths) { const j = JSON.parse(readFileSync(p, 'utf8')); if (!Array.isArray(j) || !j.length) throw new Error(`${p} holds no items`); items.push(...j) } } catch (e) { console.error(`REFUSING: ${e.message}`); process.exit(2) }
  const t = position(items)
  if (t.n < 1) { console.error('REFUSING: scored 0 items'); process.exit(2) }
  if (t.skip) { console.error(`REFUSING: ${t.skip} non-numeric item(s); every alg31 option set is numeric`); process.exit(2) }
  const { pr, er, fails } = bars(t, R)
  console.log(`  merged ${items.length} items: smallest ${t.min} / interior ${t.mid} / largest ${t.max}; extreme ${t.min + t.max}/${t.n} = ${pct((t.min + t.max) / t.n)}`)
  console.log(`  pooled-rate  kept ~${pr.n.toFixed(1)}, extreme ${pct(pr.share)}`)
  console.log(`  equal-rate   extreme ${pct(er.share)}`)
  for (const k of ['v24', 'v25', 'v26']) { const q = project(t, R[k][0], R[k][1]); console.log(`  ${k}-only     kept ~${q.n.toFixed(1)}, extreme ${pct(q.share)}  (reported)`) }
  console.log(`  PROJECTION ${fails.length ? 'FAIL: ' + fails.join('; ') : 'PASS'}`)
  process.exit(fails.length ? 1 : 0)
}
