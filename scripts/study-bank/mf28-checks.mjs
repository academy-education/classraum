#!/usr/bin/env node
/**
 * mf28-checks.mjs [--selftest] <batch.json> — the stage-0 mechanical checks for
 * sat-math-v28-full (PREREG-MF28-2026-10-09.md). Mechanical RETURNS at stage 0 (exit 1 on
 * any finding), run on every author file before the return round is spent.
 *
 *   PAIR / RUN / DIR   unchanged from algf27-checks.mjs (imported, not copied): an option
 *                      pair joined by a printed number with the key; three options in
 *                      arithmetic/geometric progression through the key; the per-distractor
 *                      direction declaration, counter_error on extreme keys, one-way asks
 *                      banned on extreme keys.
 *   DPAIR (A90, new)   A89's pair through a DERIVED multiplier: key / option (either way)
 *                      equals a number ONE STEP from the printed numbers - a printed n - 1 or
 *                      n + 1, or the sum of two different printed numbers (printed INTEGERS >= 2;
 *                      the result >= 2).
 *                      A90 lost B01 (45 = 3 x the fee 15, 3 = printed 4 - 1) and D04 (96 = 4 x
 *                      the count 24, 4 = 1 + printed 3), both clean under PAIR. GATING.
 *                      READING LIST "(read)": a difference or sum of key and option equal to such
 *                      a derived number (recorded in the prereg calibration; a stem-readable one
 *                      is a return by hand).
 *   PLUG  (A90, new)   plug-back, the largest A90 drop class (8 of 18; seven S keys reached on
 *                      the FIRST ascending substitution). Every item declares
 *                      plugback {substitutable: bool, verify: "<JS body of v -> boolean>", why}.
 *                      The cheap order is DESCENDING when the stem asks for a greatest /
 *                      maximum / largest / most value, otherwise ASCENDING (the graders' order).
 *                      P1 the field is present and well-formed;
 *                      P2 substitutable: verify(v) is true for the key and false for all three
 *                         distractors (so the declared check is a real one), and the key is
 *                         reached at try >= 3 in the cheap order. A key at try 1 or 2 on a
 *                         substitutable ask is a return;
 *                      P3 not substitutable while the key sits at try 1 or 2: "(read)" - I read
 *                         every one by hand at stage 0 (could a student check an option against
 *                         the stem in one routine step?), and a yes is a return. Parameter asks
 *                         ("what is the value of k") at try 1-2 are marked on that line.
 * Exits 2 if it cannot read its input or scores zero items.
 */
import { readFileSync } from 'node:fs'
import { val } from './key-extremity-breakdown.mjs'
import { pairRun, directions } from './algf27-checks.mjs'
const eq = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
const stemNums = p => [...new Set([...String(p).replace(/(\d),(\d{3})/g, '$1$2').matchAll(/\d+(?:\.\d+)?/g)].map(m => Number(m[0])).filter(x => x !== 0))]
export const DESC = /\b(greatest|maximum|largest|most|highest)\b/i
const PARAM = /\bvalue of (the constant )?[a-z]\b|\bwhat is [a-z]\s*\?/i

export function derivedSet(prompt) {
  // integers >= 2 only: a printed 1 (1 + 1 = 2 is every doubling) and decimals (1.25 - 1) were
  // pure noise on the calibration sets (A90 frozen 50, adv25 frozen 59).
  const sn = stemNums(prompt).filter(n => Number.isInteger(n) && n >= 2), d = new Map()
  for (const n of sn) { for (const x of [n - 1, n + 1]) if (x >= 2 && !sn.includes(x)) d.set(x, `${n} ${x > n ? '+' : '-'} 1`) }
  for (let i = 0; i < sn.length; i++) for (let j = i + 1; j < sn.length; j++) { const x = sn[i] + sn[j]; if (!sn.includes(x) && !d.has(x)) d.set(x, `${sn[i]} + ${sn[j]}`) }
  return d
}

export function dpair(item) {
  const key = val(String(item.correct_answer)), out = [], soft = []
  const opts = item.choices.map(c => ({ s: String(c), v: val(String(c)) }))
  if (!Number.isFinite(key) || opts.some(o => !Number.isFinite(o.v))) return { scored: false, out, soft }
  const D = derivedSet(item.prompt)
  for (const o of opts) {
    if (eq(o.v, key)) continue
    const rat = []; if (o.v !== 0) rat.push(Math.abs(key / o.v)); if (key !== 0) rat.push(Math.abs(o.v / key))
    for (const r of rat) for (const [x, how] of D) if (!eq(r, 1) && eq(r, x)) out.push(`DPAIR ratio of key ${item.correct_answer} and ${o.s} = ${+r.toFixed(6)} = ${how} (a multiplier one step from the printed numbers)`)
    for (const [lab, r] of [['difference', Math.abs(key - o.v)], ['sum', Math.abs(key + o.v)]]) for (const [x, how] of D) if (eq(r, x)) soft.push(`DPAIR ${lab} of key ${item.correct_answer} and ${o.s} = ${+r.toFixed(6)} = ${how}`)
  }
  return { scored: true, out: [...new Set(out)], soft: [...new Set(soft)] }
}

export function plug(item) {
  const out = [], soft = []
  const key = val(String(item.correct_answer))
  const vals = item.choices.map(c => val(String(c)))
  if (!Number.isFinite(key) || vals.some(v => !Number.isFinite(v))) return { scored: false, out, soft }
  const desc = DESC.test(String(item.prompt))
  const sorted = [...vals].sort((a, b) => desc ? b - a : a - b)
  const tries = sorted.findIndex(v => eq(v, key)) + 1
  const p = item.plugback
  if (!p || typeof p.substitutable !== 'boolean' || typeof p.why !== 'string' || !p.why.trim()) { out.push('P1 plugback {substitutable: bool, verify, why} missing or malformed'); return { scored: true, out, soft, tries, desc } }
  if (p.substitutable) {
    let f; try { f = new Function('v', '"use strict";' + p.verify) } catch (e) { out.push(`P2 verify does not compile: ${e.message}`); return { scored: true, out, soft, tries, desc } }
    const res = vals.map(v => { try { return f(v) === true } catch { return 'throws' } })
    item.choices.forEach((c, i) => { const isKey = eq(vals[i], key); if (res[i] === 'throws') out.push(`P2 verify throws on ${c}`); else if (res[i] !== isKey) out.push(`P2 verify(${c}) = ${res[i]}, expected ${isKey} (the declared check does not separate the key)`) })
    if (tries <= 2) out.push(`P2 substitutable ask and the key is reached at try ${tries} in ${desc ? 'descending' : 'ascending'} order (A90 R6: must be >= 3)`)
  } else if (tries <= 2) {
    soft.push(`PLUG key at try ${tries} ${desc ? 'descending' : 'ascending'}; author says not substitutable: "${p.why.slice(0, 160)}"${PARAM.test(String(item.prompt)) ? '  [PARAMETER ASK]' : ''}`)
  }
  return { scored: true, out, soft, tries, desc }
}

function selftest() {
  let bad = 0
  const b = JSON.parse(readFileSync(new URL('./sat-math-v27-algfull.batch.json', import.meta.url), 'utf8'))
  for (const id of ['SM27F-B01', 'SM27F-D04']) { const it = b.find(x => x.id === id); const r = dpair(it); if (!r.out.length) { bad++; console.error(`FAIL ${id} (A90 R7pair through a derived multiplier) not gated`, r) } if (pairRun(it).out.some(x => x.startsWith('PAIR'))) { bad++; console.error(`FAIL ${id}: PAIR already caught it, so DPAIR is not what is being tested`) } }
  const clean = dpair({ prompt: 'A tank holds 40 liters and drains 3 liters per hour.', choices: ['12.7', '15.2', '19.9', '23.4'], correct_answer: '15.2' })
  if (clean.out.length) { bad++; console.error('FAIL clean item DPAIR-flagged', clean.out) }
  const sum = dpair({ prompt: 'Rides cost 7 dollars and snacks cost 2 dollars.', choices: ['5', '45', '30', '17'], correct_answer: '45' })
  if (!sum.out.some(x => x.includes('7 + 2'))) { bad++; console.error('FAIL sum-of-two-printed multiplier (45 = 9 x 5) not gated', sum) }
  // PLUG: the A90 S-key parameter shape (D05: key 22 smallest, "what is the value of k")
  const base = { prompt: 'In the system above, k is a constant. What is the value of k?', choices: ['22', '29', '50', '92'], correct_answer: '22' }
  const t = (it, want, code) => { const r = plug(it); const hit = [...r.out, ...r.soft].some(x => x.startsWith(code)); if (hit !== want) { bad++; console.error(`FAIL PLUG ${code} expected ${want}`, r) } }
  t({ ...base }, true, 'P1')
  t({ ...base, plugback: { substitutable: true, verify: 'return v === 22', why: 'k makes the boundaries coincide' } }, true, 'P2')
  t({ ...base, plugback: { substitutable: false, why: 'no' } }, true, 'PLUG')
  t({ ...base, correct_answer: '50', plugback: { substitutable: true, verify: 'return v === 50', why: 'x' } }, false, 'P2')
  t({ ...base, correct_answer: '50', plugback: { substitutable: true, verify: 'return v > 20', why: 'x' } }, true, 'P2')
  t({ ...base, prompt: 'What is the greatest value of k?', correct_answer: '50', plugback: { substitutable: true, verify: 'return v === 50', why: 'x' } }, true, 'P2')
  t({ ...base, prompt: 'What is the greatest value of k?', correct_answer: '29', plugback: { substitutable: true, verify: 'return v === 29', why: 'x' } }, false, 'P2')
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log('selftest 11/11 (A90 B01 + D04 gated by DPAIR and not by PAIR, 1 clean, 1 sum-of-two-printed, 7 PLUG cases incl. D05\'s S-key parameter shape and the descending order on a "greatest" ask)')
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
  let scored = 0, hit = 0, ext = 0; const cnt = { DPAIR: 0, DPAIRsoft: 0, PLUGtry12: 0, PARAM12: 0 }
  for (const it of items) {
    const a = pairRun(it), d = directions(it), dp = dpair(it), pl = plug(it)
    if (!a.scored || !d.scored || !dp.scored || !pl.scored) { hit++; console.log(`  ${it.id}  UNSCORABLE (non-numeric option set)`); continue }
    scored++; if (d.extreme) ext++
    if (dp.out.length) cnt.DPAIR++; if (dp.soft.length) cnt.DPAIRsoft++
    if (pl.tries <= 2) { cnt.PLUGtry12++; if (PARAM.test(String(it.prompt))) cnt.PARAM12++ }
    if (calib) { for (const x of dp.out) console.log(`  ${it.id}  ${x}`); continue }
    const lines = [...a.out, ...d.out, ...dp.out, ...pl.out]
    if (lines.length) hit++
    for (const x of lines) console.log(`  ${it.id}  ${x}`)
    for (const x of [...a.soft, ...dp.soft, ...pl.soft]) console.log(`  ${it.id}  (read) ${x}`)
  }
  console.log(`${p.replace(/^.*\//, '')}: scored ${scored} of ${items.length} (extreme keys ${ext}); DPAIR gating ${cnt.DPAIR}, DPAIR read ${cnt.DPAIRsoft}, key at try 1-2 ${cnt.PLUGtry12} (parameter asks ${cnt.PARAM12})${calib ? '' : `; items with a PAIR/RUN/DIR/DPAIR/PLUG finding ${hit}`}`)
  if (!scored) process.exit(2)
  if (calib) process.exit(0)
  process.exit(hit ? 1 : 0)
}
