#!/usr/bin/env node
/**
 * mf30-checks.mjs [--selftest] [--calibrate] <batch.json> — the stage-0 mechanical checks for
 * sat-math-v30-full (PREREG-MF30-2026-10-10.md). Mechanical RETURNS at stage 0 (exit 1 on any
 * finding), run on every part file during authoring and on every author file before the return.
 *
 *   PAIR / RUN / DIR   unchanged (algf27-checks.mjs, imported).
 *   DPAIR / PLUG       unchanged (mf28-checks.mjs, imported).
 *   DSUM / FAR         unchanged (mf29-checks.mjs, imported; FAR's far-side-by-ERROR definition).
 *   KEYPRINT (A92, new) GATING. The key's value equals a number printed in the stem (prompt, or any
 *                      label / cell / caption of a graphic). A92 recorded A11: key 45 = the minutes
 *                      printed in 7:45. A key equal to a printed number in absolute value only is "(read)".
 *   STRUCT   (A92, new) GATING on an EXTREME key: the stem carries a universal quantifier or an
 *                      extremum ("for every / all / each / any", vertex, maximum, minimum, highest,
 *                      lowest, peak, "top of"). A92: five of the six one-sided / single-bound drops
 *                      were items whose own structure (a strictest bound, a maximum) signs every error
 *                      (D01 "for every y", P09 the top of an arc). Such items take INTERIOR keys only.
 *                      Every extreme item also writes structure_check (>= 30 chars), printed as
 *                      "(read) STRUCT" for the hand read: a structure the regex cannot see is a return.
 *   INTER    (A92, new) every item writes intermediate_check (>= 30 chars): for each distractor, that it
 *                      is NOT a value the key follows from through ONE printed rate, purchase or
 *                      relation (A92: A01 A03 C02 C05). Missing = gating; the content is "(read)" and
 *                      hand-read on every item. No mechanical detector: an affine-of-two-printed-numbers
 *                      net fired on 30 of mf29's 70 frozen items and caught 1 of the 4 (C02).
 *   PLUGA    (A92, new) on every ALGEBRA item whose key is reached at try 1 or 2 in the natural order
 *                      (ascending; descending on a greatest / maximum / largest / most stem) a
 *                      "(read) PLUGA" line: the item goes to the cold plug-back probe (mf30-plugprobe.mjs),
 *                      which decides substitutability. The author's `substitutable` claim does not
 *                      exempt it.
 * Exits 2 if it cannot read its input or scores zero items.
 */
import { readFileSync } from 'node:fs'
import { val, scoreItem } from './key-extremity-breakdown.mjs'
import { pairRun, directions } from './algf27-checks.mjs'
import { dpair, plug } from './mf28-checks.mjs'
import { dsum, far } from './mf29-checks.mjs'
const eq = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
const nums = s => [...new Set([...String(s).replace(/(\d),(\d{3})/g, '$1$2').matchAll(/\d+(?:\.\d+)?/g)].map(m => Number(m[0])).filter(x => x !== 0))]
const graphicText = g => g ? JSON.stringify([g.rowLabels, g.colLabels, g.cells, g.caption, g.bars, g.points, g.series, g.xLabel, g.yLabel]) : ''
export const STRUCT_RE = /\bfor (every|all|each|any)\b|\bvertex\b|\bmaximum\b|\bminimum\b|\bhighest\b|\blowest\b|\bpeak\b|\btop of\b/i

export function keyprint(item) {
  const out = [], soft = []
  const key = val(String(item.correct_answer))
  if (!Number.isFinite(key)) return { scored: false, out, soft }
  const printed = nums(`${item.prompt} ${graphicText(item.graphic)}`)
  if (printed.some(n => eq(n, key))) out.push(`KEYPRINT the key ${item.correct_answer} equals a number printed in the stem (A92: A11's 45 = the minutes in 7:45)`)
  else if (key < 0 && printed.some(n => eq(n, -key))) soft.push(`KEYPRINT the key ${item.correct_answer} equals a printed number in absolute value`)
  return { scored: true, out, soft }
}

export function struct(item) {
  const out = [], soft = []
  const sc = scoreItem(item.choices.map(String), String(item.correct_answer))
  if (sc.skip) return { scored: false, out, soft }
  if (!(sc.keyMin || sc.keyMax)) return { scored: true, out, soft }
  const m = String(item.prompt).match(STRUCT_RE)
  if (m) out.push(`STRUCT "${m[0]}" in the stem of an extreme-key item: a universal quantifier or an extremum signs every error (A92: D01, P09); interior keys only`)
  if (typeof item.structure_check !== 'string' || item.structure_check.trim().length < 30) out.push('STRUCT structure_check (>= 30 chars) missing on an extreme key: does the item\'s own structure (a strictest bound, an extremum, a monotone "every slip lowers it") sign the errors?')
  else soft.push(`STRUCT ${item.structure_check.slice(0, 220)}`)
  return { scored: true, out, soft }
}

export function inter(item) {
  const out = [], soft = []
  if (typeof item.intermediate_check !== 'string' || item.intermediate_check.trim().length < 30) out.push('INTER intermediate_check (>= 30 chars) missing: is any distractor a value the key follows from through ONE printed rate, purchase or relation (A92: A01 A03 C02 C05)?')
  else soft.push(`INTER ${item.intermediate_check.slice(0, 220)}`)
  return { scored: true, out, soft }
}

export function pluga(item) {
  const soft = []
  if (item.domain !== 'Algebra') return { scored: true, out: [], soft, probe: false }
  const p = plug(item)
  if (!p.scored) return { scored: false, out: [], soft }
  const probe = p.tries <= 2
  if (probe) soft.push(`PLUGA Algebra key at try ${p.tries} ${p.desc ? 'descending' : 'ascending'}: decided by the cold plug-back probe, not by the author's claim (substitutable ${item.plugback?.substitutable})`)
  return { scored: true, out: [], soft, probe }
}

function selftest() {
  let bad = 0
  const b29 = JSON.parse(readFileSync(new URL('./sat-math-v29-full.batch.json', import.meta.url), 'utf8'))
  const get = id => b29.find(x => x.id === id)
  if (!keyprint(get('SM29F-A11')).out.length) { bad++; console.error('FAIL SM29F-A11 (A92: key 45 = minutes in 7:45) not gated by KEYPRINT') }
  const clean = { prompt: 'A tank holds 40 liters and drains 3 liters per hour.', choices: ['12.7', '15.2', '19.9', '23.4'], correct_answer: '15.2' }
  if (keyprint(clean).out.length) { bad++; console.error('FAIL clean item KEYPRINT-flagged') }
  if (!keyprint({ ...clean, graphic: { type: 'table', rowLabels: ['a'], colLabels: ['b'], cells: [['15.2']] } }).out.length) { bad++; console.error('FAIL a key printed in a table cell not gated') }
  if (keyprint({ ...clean, correct_answer: '-3', choices: ['-3', '1', '2', '4'] }).out.length || !keyprint({ ...clean, correct_answer: '-3', choices: ['-3', '1', '2', '4'] }).soft.length) { bad++; console.error('FAIL key -3 with printed 3 must be (read), not gating') }
  for (const id of ['SM29F-D01', 'SM29F-D03', 'SM29F-P09']) if (!struct(get(id)).out.some(x => x.startsWith('STRUCT "'))) { bad++; console.error(`FAIL ${id} (A92 one-sided on an extreme key with a structural bound) not gated by STRUCT`) }
  const ok = { prompt: 'For every hour, 3 liters drain.', choices: ['2', '5', '9', '14'], correct_answer: '5', structure_check: 'x'.repeat(40) }
  if (struct(ok).out.length) { bad++; console.error('FAIL an INTERIOR key with "for every" must pass STRUCT') }
  if (!struct({ ...ok, prompt: 'A tank drains.', correct_answer: '14', structure_check: undefined }).out.length) { bad++; console.error('FAIL missing structure_check on an extreme key not gated') }
  if (struct({ ...ok, prompt: 'A tank drains.', correct_answer: '14' }).out.length) { bad++; console.error('FAIL clean extreme item with structure_check gated') }
  if (!inter({}).out.length || inter({ intermediate_check: 'y'.repeat(40) }).out.length) { bad++; console.error('FAIL INTER field rule') }
  for (const id of ['SM29F-B09', 'SM29F-D04', 'SM29F-A07', 'SM29F-A04']) if (!pluga(get(id)).probe) { bad++; console.error(`FAIL ${id} (A92 plug-back on an S key at ascending try 1) not sent to the probe`) }
  if (pluga(get('SM29F-B04')).probe || pluga(get('SM29F-P09')).probe) { bad++; console.error('FAIL PLUGA sent a try-4 / non-Algebra item to the probe') }
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log('selftest 19/19 (KEYPRINT: A92 A11 gated, 1 clean, 1 table cell, 1 abs-only read; STRUCT: D01 D03 P09 gated, interior passes, missing field gated, clean passes; INTER field; PLUGA: B09 D04 A07 A04 to the probe, B04 and P09 not)')
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  const args = process.argv.slice(2)
  selftest()
  if (args.includes('--selftest')) process.exit(0)
  const calib = args.includes('--calibrate')
  const p = args.find(a => !a.startsWith('--'))
  let items; try { items = JSON.parse(readFileSync(p, 'utf8')) } catch { console.error('REFUSING: unreadable input'); process.exit(2) }
  if (!Array.isArray(items) || !items.length) { console.error('REFUSING: no items'); process.exit(2) }
  let scored = 0, hit = 0, ext = 0; const cnt = { DPAIR: 0, DSUM: 0, FAR: 0, KEYPRINT: 0, STRUCT: 0, PLUGA: 0 }
  for (const it of items) {
    const a = pairRun(it), d = directions(it), dp = dpair(it), ds = dsum(it), pl = plug(it), fr = far(it), kp = keyprint(it), st = struct(it), ia = inter(it), pa = pluga(it)
    if (![a, d, dp, ds, pl, fr, kp, st, pa].every(x => x.scored)) { hit++; console.log(`  ${it.id}  UNSCORABLE (non-numeric option set)`); continue }
    scored++; if (d.extreme) ext++
    if (dp.out.length) cnt.DPAIR++; if (ds.out.length) cnt.DSUM++; if (fr.out.length) cnt.FAR++; if (kp.out.length) cnt.KEYPRINT++
    if (st.out.some(x => x.startsWith('STRUCT "'))) cnt.STRUCT++; if (pa.probe) cnt.PLUGA++
    if (calib) { for (const x of [...kp.out, ...st.out.filter(x => x.startsWith('STRUCT "'))]) console.log(`  ${it.id}  ${x}`); if (pa.probe) console.log(`  ${it.id}  PLUGA probe`); continue }
    const lines = [...a.out, ...d.out, ...dp.out, ...ds.out, ...pl.out, ...fr.out, ...kp.out, ...st.out, ...ia.out]
    if (lines.length) hit++
    for (const x of lines) console.log(`  ${it.id}  ${x}`)
    for (const x of [...a.soft, ...dp.soft, ...ds.soft, ...pl.soft, ...fr.soft, ...kp.soft, ...st.soft, ...ia.soft, ...pa.soft]) console.log(`  ${it.id}  (read) ${x}`)
  }
  console.log(`${p.replace(/^.*\//, '')}: scored ${scored} of ${items.length} (extreme keys ${ext}); DPAIR ${cnt.DPAIR}, DSUM ${cnt.DSUM}, FAR ${cnt.FAR}, KEYPRINT ${cnt.KEYPRINT}, STRUCT-regex ${cnt.STRUCT} gating; Algebra items for the plug-back probe ${cnt.PLUGA}${calib ? '' : `; items with a gating finding ${hit}`}`)
  if (!scored) process.exit(2)
  if (calib) process.exit(0)
  process.exit(hit ? 1 : 0)
}
