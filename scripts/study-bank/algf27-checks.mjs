#!/usr/bin/env node
/**
 * algf27-checks.mjs [--selftest] <batch.json> — the three stage-0 checks NEW in
 * sat-math-v27-algfull (PREREG-ALGF27-2026-10-08.md). All three are MECHANICAL RETURNS
 * at stage 0 (exit 1 on any finding), and run on every author file BEFORE the
 * return round is spent (A88 process lesson 2), not only at the merge.
 *
 *   PAIR  (A89's drop class) an option pair joined by a number printed in the stem,
 *         where one member is the key: key -/+ option, key x or / option, equal to a
 *         printed number (or twice one), or key/option equal to a ratio of two printed
 *         numbers. adv25 lost 4 items to this after freeze (D10 -104 = 4 x -26 with
 *         "x - 4" printed; D14 195 = 243 - 48; C01 11 = 7 + 4; B03 3240 = 2160 x 720/480).
 *         GATING: difference, sum or ratio equal to a printed number other than 1.
 *         READING LIST (printed "(read)", every line read by hand, a stem-readable one is a
 *         return): a printed 1, twice a printed number, a ratio of two printed numbers
 *         (B03's class). Calibrated on the A88 frozen 48: the first version gated all of
 *         these and fired on 39 of 48 items, which is noise, not a check.
 *   RUN   three options in arithmetic or geometric progression that include the key
 *         (A88 dropped A01 and C03 at the merge for this; act-math-v26-option-shapes RUN).
 *   DIR   (A88's cause) the author's direction declaration, checked against the values:
 *         D1 every distractor has distractor_meta {error_kind, direction above|below,
 *            stem_predicts_direction false, why} and the direction matches its value;
 *         D2 >= 2 distinct error_kinds, at least one of sign_slip / inverted_rate /
 *            wrong_variable / wrong_operation / wrong_base, at most one omission or
 *            partial_answer;
 *         D3 an extreme key carries counter_error {error_kind, solve, direction}: a
 *            natural error whose JS solve lands STRICTLY on the other side of the key
 *            and is not an option (the error family goes both ways);
 *         D4 an extreme key is not on an ask whose natural errors move one stem-readable
 *            way (greatest / least / maximum / minimum / largest / smallest, "sum of all",
 *            "possible values", "difference between the greatest and least").
 * Exits 2 if it cannot read its input or scores zero items.
 */
import { readFileSync } from 'node:fs'
import { val, scoreItem } from './key-extremity-breakdown.mjs'
const eq = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
const stemNums = p => [...new Set([...String(p).replace(/(\d),(\d{3})/g, '$1$2').matchAll(/\d+(?:\.\d+)?/g)].map(m => Number(m[0])).filter(x => x !== 0))]
const STRONG = new Set(['sign_slip', 'inverted_rate', 'wrong_variable', 'wrong_operation', 'wrong_base'])
const WEAK = new Set(['omission', 'partial_answer'])
const KINDS = new Set([...STRONG, ...WEAK, 'other'])
const BAN = /\b(greatest|least|maximum|minimum|largest|smallest|sum of all|possible values?|all values)\b/i

export function pairRun(item) {
  const opts = item.choices.map(c => ({ s: String(c), v: val(String(c)) }))
  const key = val(String(item.correct_answer))
  const out = [], soft = []
  if (!Number.isFinite(key) || opts.some(o => !Number.isFinite(o.v))) return { scored: false, out, soft }
  const sn = stemNums(item.prompt)
  for (const o of opts) {
    if (eq(o.v, key)) continue
    const rel = [['difference', Math.abs(key - o.v)], ['sum', Math.abs(key + o.v)]]
    if (o.v !== 0) rel.push(['ratio', Math.abs(key / o.v)])
    if (key !== 0) rel.push(['ratio', Math.abs(o.v / key)])
    for (const [lab, r] of rel) for (const x of sn) {
      if (lab === 'ratio' && eq(x, 1)) continue
      if (eq(r, x)) (x === 1 ? soft : out).push(`PAIR ${lab} of key ${item.correct_answer} and ${o.s} = ${+r.toFixed(6)} = printed ${x}`)
      else if (lab !== 'ratio' && eq(r, 2 * x)) soft.push(`PAIR ${lab} of key ${item.correct_answer} and ${o.s} = ${+r.toFixed(6)} = 2 x printed ${x}`)
    }
    if (o.v !== 0) for (const x of sn) for (const y of sn) if (x !== y && !eq(x / y, 1) && eq(Math.abs(key / o.v), x / y)) soft.push(`PAIR ratio of key ${item.correct_answer} and ${o.s} = ${x}/${y} (two printed numbers)`)
  }
  for (let a = 0; a < opts.length; a++) for (let b = a + 1; b < opts.length; b++) for (let c = b + 1; c < opts.length; c++) {
    const t = [opts[a], opts[b], opts[c]].sort((x, y) => x.v - y.v)
    if (!t.some(o => eq(o.v, key))) continue
    const ap = eq(t[1].v - t[0].v, t[2].v - t[1].v)
    const gp = t[0].v !== 0 && t[1].v !== 0 && Math.sign(t[0].v) === Math.sign(t[2].v) && eq(t[1].v / t[0].v, t[2].v / t[1].v) && !eq(t[1].v / t[0].v, 1)
    if (ap || gp) out.push(`RUN ${ap ? 'arithmetic' : 'geometric'} ${t.map(o => o.s).join(' / ')} through the key`)
  }
  return { scored: true, out: [...new Set(out)], soft: [...new Set(soft)] }
}

export function directions(item) {
  const out = []
  const key = val(String(item.correct_answer))
  const sc = scoreItem(item.choices.map(String), String(item.correct_answer))
  if (sc.skip) return { scored: false, out: [`not numeric (${sc.skip})`] }
  const extreme = sc.keyMin || sc.keyMax
  const meta = item.distractor_meta ?? {}
  const ds = item.choices.map(String).filter(c => c !== String(item.correct_answer))
  const kinds = []
  for (const d of ds) {
    const m = meta[d]
    if (!m) { out.push(`D1 no distractor_meta for ${d}`); continue }
    if (!KINDS.has(m.error_kind)) out.push(`D1 ${d}: error_kind '${m.error_kind}' not in ${[...KINDS].join('/')}`)
    kinds.push(m.error_kind)
    const want = val(d) > key ? 'above' : 'below'
    if (m.direction !== want) out.push(`D1 ${d}: declared ${m.direction}, value is ${want} the key`)
    if (m.stem_predicts_direction !== false) out.push(`D1 ${d}: stem_predicts_direction is not false`)
  }
  if (new Set(kinds).size < 2) out.push(`D2 fewer than 2 distinct error_kinds (${kinds.join(',')})`)
  if (!kinds.some(k => STRONG.has(k))) out.push(`D2 no sign_slip / inverted_rate / wrong_variable / wrong_operation / wrong_base`)
  if (kinds.filter(k => WEAK.has(k)).length > 1) out.push(`D2 more than one omission/partial_answer (${kinds.join(',')})`)
  if (extreme) {
    const ce = item.counter_error
    if (!ce || !ce.solve) out.push('D3 extreme key without counter_error.solve')
    else {
      let v; try { v = val(String(new Function('"use strict";' + ce.solve)())) } catch (e) { v = NaN }
      const other = sc.keyMin ? 'above' : 'below'
      if (!Number.isFinite(v)) out.push('D3 counter_error.solve does not evaluate to a number')
      else if (sc.keyMin ? !(v < key && !eq(v, key)) : !(v > key && !eq(v, key))) out.push(`D3 counter_error ${v} is not strictly ${sc.keyMin ? 'below' : 'above'} the key ${key} (the key is the ${sc.keyMin ? 'smallest' : 'largest'} option, so the counter error must land past it)`)
      else if (item.choices.some(c => eq(val(String(c)), v))) out.push(`D3 counter_error ${v} is an option`)
      void other
    }
    const m = String(item.prompt).match(BAN)
    if (m) out.push(`D4 extreme key on a "${m[0]}" ask`)
  }
  return { scored: true, out, extreme }
}

function selftest() {
  let bad = 0
  const b = JSON.parse(readFileSync(new URL('./sat-math-v25-adv.batch.json', import.meta.url), 'utf8'))
  for (const id of ['SM25V-D10', 'SM25V-D14', 'SM25V-C01']) { const r = pairRun(b.find(x => x.id === id)); if (!r.out.some(x => x.startsWith('PAIR'))) { bad++; console.error(`FAIL ${id} (A89 drop) not caught`, r) } }
  { const r = pairRun(b.find(x => x.id === 'SM25V-B03')); if (!r.soft.some(x => x.includes('two printed'))) { bad++; console.error('FAIL SM25V-B03 (A89 drop, ratio of two printed numbers) not on the reading list', r) } }
  const clean = pairRun({ prompt: 'A tank holds 40 liters and drains 3 liters per hour.', choices: ['12.7', '15.2', '19.9', '23.4'], correct_answer: '15.2' })
  if (clean.out.length) { bad++; console.error('FAIL clean item flagged', clean.out) }
  const run = pairRun({ prompt: 'x/7 = 9', choices: ['12', '44', '76', '30'], correct_answer: '44' })
  if (!run.out.some(x => x.startsWith('RUN'))) { bad++; console.error('FAIL A88 A01-style run not caught') }
  const good = { prompt: 'Solve for k.', choices: ['2', '5', '9', '14'], correct_answer: '2',
    distractor_meta: { 5: { error_kind: 'sign_slip', direction: 'above', stem_predicts_direction: false }, 9: { error_kind: 'inverted_rate', direction: 'above', stem_predicts_direction: false }, 14: { error_kind: 'omission', direction: 'above', stem_predicts_direction: false } },
    counter_error: { error_kind: 'sign_slip', solve: 'return -3', direction: 'below' } }
  if (directions(good).out.length) { bad++; console.error('FAIL good declaration refused', directions(good).out) }
  const t = (mut, code) => { const it = JSON.parse(JSON.stringify(good)); mut(it); if (!directions(it).out.some(x => x.startsWith(code))) { bad++; console.error(`FAIL ${code} not caught`) } }
  t(it => { it.distractor_meta[5].direction = 'below' }, 'D1')
  t(it => { it.distractor_meta[9].error_kind = 'sign_slip'; it.distractor_meta[14].error_kind = 'sign_slip' }, 'D2')
  t(it => { it.distractor_meta[5].error_kind = 'omission'; it.distractor_meta[9].error_kind = 'partial_answer' }, 'D2')
  t(it => { it.counter_error.solve = 'return 7' }, 'D3')
  t(it => { delete it.counter_error }, 'D3')
  t(it => { it.prompt = 'What is the greatest value of k?' }, 'D4')
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log('selftest 13/13 (3 adv25 A89 drops gated + B03 on the reading list, 1 clean, 1 run, 1 good declaration, 6 mutations)')
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  const args = process.argv.slice(2)
  selftest()
  if (args.includes('--selftest')) process.exit(0)
  const p = args.find(a => !a.startsWith('--'))
  let items; try { items = JSON.parse(readFileSync(p, 'utf8')) } catch { console.error('REFUSING: unreadable input'); process.exit(2) }
  if (!Array.isArray(items) || !items.length) { console.error('REFUSING: no items'); process.exit(2) }
  let scored = 0, hit = 0, ext = 0
  for (const it of items) {
    const a = pairRun(it), d = directions(it)
    if (!a.scored || !d.scored) { hit++; console.log(`  ${it.id}  UNSCORABLE (non-numeric option set)`); continue }
    scored++; if (d.extreme) ext++
    const lines = [...a.out, ...d.out]
    if (lines.length) hit++
    for (const x of lines) console.log(`  ${it.id}  ${x}`)
    for (const x of a.soft) console.log(`  ${it.id}  (read) ${x}`)
  }
  console.log(`${p.replace(/^.*\//, '')}: scored ${scored} of ${items.length} (extreme keys ${ext}); items with a PAIR/RUN/DIR finding ${hit}`)
  if (!scored) process.exit(2)
  process.exit(hit ? 1 : 0)
}
