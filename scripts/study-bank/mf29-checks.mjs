#!/usr/bin/env node
/**
 * mf29-checks.mjs [--selftest] [--calibrate] <batch.json> — the stage-0 mechanical checks for
 * sat-math-v29-full (PREREG-MF29-2026-10-10.md). Mechanical RETURNS at stage 0 (exit 1 on any
 * finding), run on every part file during authoring and on every author file before the return.
 *
 *   PAIR / RUN / DIR   unchanged (algf27-checks.mjs, imported).
 *   DPAIR / PLUG       unchanged (mf28-checks.mjs, imported): a key/option ratio one step from the
 *                      printed numbers; plug-back order and the declared verify().
 *   DSUM  (A91, new)   GATING. key and an option differ by the SUM of two different printed
 *                      integers (>= 2), where that sum is not itself printed (a printed one is
 *                      PAIR's). mf28's DPAIR only listed it as "(read)", and A91 lost R01 to it:
 *                      key 24 = option 7 + (8 + 9), with 8 and 9 the printed constants.
 *                      The sum of key and option equal to such a number stays "(read)".
 *   FAR   (A91, new)   on every EXTREME key (smallest or largest option by value). A91's largest
 *                      drop class (9 of 13) was the extreme key whose three distractors were all
 *                      "forgot a constraint" shortfalls: the counter_error rule (mf28 rule 5) was
 *                      met by an error that is NOT an option, so it changed nothing a student sees.
 *                      An option cannot lie past an extreme key BY VALUE (it would make the key
 *                      interior), so "far side" is the side the error NATURALLY falls on:
 *                      FAR0 every distractor_meta row carries error_sense: "omits" (leaves out a
 *                           constraint, term, fee, condition or step; stops a step early) |
 *                           "adds" (puts in something extra: double-counts, a step applied twice,
 *                           a term that does not belong, ignores a reducing cap or discount) |
 *                           "swaps" (sign, inversion, swapped quantity, wrong operation or base);
 *                      FAR1 the three distractors are not all "omits" (A91's all-undershoot set)
 *                           and not all "adds" (its mirror);
 *                      FAR2 far_distractor {option, natural_side, why}: a REAL distractor, built
 *                           from an error of a kind that ordinarily lands on the FAR side of the
 *                           key (natural_side "above" on a largest key, "below" on a smallest
 *                           one), whose distractor_meta direction is the near side (it lands
 *                           there in THIS item), and why (>= 40 chars) says how.
 *                      A declaration is not a check (CLAUDE.md: an author declares the constraints
 *                      it has already satisfied). FAR only makes the claim explicit; the check is
 *                      the hand read of every "(read) FAR" line at stage 0 (would a student who
 *                      recognises that error sign it on the near side without computing? a yes is
 *                      a return) and, after freeze, the graders' one_sided / single_bound fields.
 *                      "(read) BOUND" prints cheap_bound_check for the A91 cheapest-bound read.
 * Exits 2 if it cannot read its input or scores zero items.
 */
import { readFileSync } from 'node:fs'
import { val, scoreItem } from './key-extremity-breakdown.mjs'
import { pairRun, directions } from './algf27-checks.mjs'
import { dpair, plug } from './mf28-checks.mjs'
const eq = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
const stemNums = p => [...new Set([...String(p).replace(/(\d),(\d{3})/g, '$1$2').matchAll(/\d+(?:\.\d+)?/g)].map(m => Number(m[0])).filter(x => x !== 0))]
const PARAM = /\bvalue of (the constant )?[a-z]\b|\bwhat is [a-z]\s*\?/i
export const SENSES = ['omits', 'adds', 'swaps']

export function dsum(item) {
  const key = val(String(item.correct_answer)), out = [], soft = []
  const opts = item.choices.map(c => ({ s: String(c), v: val(String(c)) }))
  if (!Number.isFinite(key) || opts.some(o => !Number.isFinite(o.v))) return { scored: false, out, soft }
  const sn = stemNums(item.prompt).filter(n => Number.isInteger(n) && n >= 2)
  const S = new Map()
  for (let i = 0; i < sn.length; i++) for (let j = i + 1; j < sn.length; j++) { const x = sn[i] + sn[j]; if (!sn.includes(x) && !S.has(x)) S.set(x, `${sn[i]} + ${sn[j]}`) }
  for (const o of opts) {
    if (eq(o.v, key)) continue
    for (const [x, how] of S) {
      if (eq(Math.abs(key - o.v), x)) out.push(`DSUM key ${item.correct_answer} and ${o.s} differ by ${x} = ${how} (a sum of two printed numbers joins the pair; A91 R01)`)
      if (eq(Math.abs(key + o.v), x)) soft.push(`DSUM sum of key ${item.correct_answer} and ${o.s} = ${x} = ${how}`)
    }
  }
  return { scored: true, out: [...new Set(out)], soft: [...new Set(soft)] }
}

export function far(item) {
  const out = [], soft = []
  const sc = scoreItem(item.choices.map(String), String(item.correct_answer))
  if (sc.skip) return { scored: false, out, soft }
  const extreme = sc.keyMin || sc.keyMax
  const key = val(String(item.correct_answer))
  const dist = item.choices.map(String).filter(c => !eq(val(c), key))
  const m = item.distractor_meta ?? {}
  const sense = dist.map(c => m[c]?.error_sense)
  dist.forEach((c, i) => { if (!SENSES.includes(sense[i])) out.push(`FAR0 distractor_meta["${c}"].error_sense must be one of ${SENSES.join(' | ')} (got ${JSON.stringify(sense[i])})`) })
  if (!extreme) return { scored: true, out, soft, extreme: false }
  const far = sc.keyMax ? 'above' : 'below', near = sc.keyMax ? 'below' : 'above'
  if (sense.every(s => s === 'omits')) out.push(`FAR1 all three distractors "omits" on a ${sc.keyMax ? 'largest' : 'smallest'} key (A91's all-undershoot "forgot a constraint" set)`)
  if (sense.every(s => s === 'adds')) out.push(`FAR1 all three distractors "adds" on a ${sc.keyMax ? 'largest' : 'smallest'} key (the mirror of A91's set)`)
  const f = item.far_distractor
  if (!f || typeof f !== 'object') out.push('FAR2 far_distractor {option, natural_side, why} missing on an extreme key')
  else {
    const o = String(f.option ?? '')
    if (!dist.includes(o)) out.push(`FAR2 far_distractor.option ${JSON.stringify(f.option)} is not one of the three distractors`)
    if (f.natural_side !== far) out.push(`FAR2 far_distractor.natural_side must be "${far}" on a ${sc.keyMax ? 'largest' : 'smallest'} key (got ${JSON.stringify(f.natural_side)})`)
    if (dist.includes(o) && m[o]?.direction !== near) out.push(`FAR2 distractor_meta["${o}"].direction must be "${near}" (where it lands by value)`)
    if (typeof f.why !== 'string' || f.why.trim().length < 40) out.push('FAR2 far_distractor.why must say (>= 40 chars) why an error of that kind lands on the near side here')
    if (!out.some(x => x.startsWith('FAR2'))) soft.push(`FAR ${o} [${m[o]?.error_sense}/${m[o]?.error_kind}] natural ${far}, lands ${near}: ${String(f.why).slice(0, 220)}`)
  }
  soft.push(`BOUND ${String(item.cheap_bound_check ?? '(cheap_bound_check missing)').slice(0, 220)}`)
  return { scored: true, out, soft, extreme: true }
}

function selftest() {
  let bad = 0
  const b28 = JSON.parse(readFileSync(new URL('./sat-math-v28-full.batch.json', import.meta.url), 'utf8'))
  const r01 = b28.find(x => x.id === 'SM28F-R01')
  if (!dsum(r01).out.length) { bad++; console.error('FAIL SM28F-R01 (A91: 24 = 7 + (8 + 9)) not gated by DSUM') }
  if (dpair(r01).out.length || pairRun(r01).out.some(x => x.startsWith('PAIR'))) { bad++; console.error('FAIL SM28F-R01 already gated by DPAIR/PAIR, so DSUM is not what is being tested') }
  const clean = { prompt: 'A tank holds 40 liters and drains 3 liters per hour.', choices: ['12.7', '15.2', '19.9', '23.4'], correct_answer: '15.2' }
  if (dsum(clean).out.length) { bad++; console.error('FAIL clean item DSUM-flagged') }
  const printed = dsum({ prompt: 'It costs 5 dollars, 7 dollars or 12 dollars.', choices: ['3', '15', '40', '52'], correct_answer: '52' })
  if (printed.out.length) { bad++; console.error('FAIL a difference equal to a PRINTED number (12 = 5 + 7 is printed) is PAIR\'s, not DSUM\'s', printed) }
  const meta = (s1, s2, s3, dir = 'below') => ({ 2: { error_kind: 'sign_slip', direction: dir, error_sense: s1 }, 5: { error_kind: 'omission', direction: dir, error_sense: s2 }, 9: { error_kind: 'wrong_operation', direction: dir, error_sense: s3 } })
  const L = { prompt: 'p', choices: ['2', '5', '9', '14'], correct_answer: '14' }
  const fd = { option: '9', natural_side: 'above', why: 'counting the shared shelf twice inflates the divisor, so the count falls' }
  const t = (it, want, code, label) => { const r = far(it); const hit = r.out.some(x => x.startsWith(code)); if (hit !== want) { bad++; console.error(`FAIL FAR ${label}: ${code} expected ${want}`, r.out) } }
  t({ ...L, distractor_meta: meta('omits', 'omits', 'omits'), far_distractor: fd }, true, 'FAR1', 'all-omits on a largest key')
  t({ ...L, distractor_meta: meta('adds', 'omits', 'swaps') }, true, 'FAR2', 'far_distractor missing')
  t({ ...L, distractor_meta: meta('adds', 'omits', 'swaps'), far_distractor: { ...fd, natural_side: 'below' } }, true, 'FAR2', 'natural side = near side')
  t({ ...L, distractor_meta: meta('adds', 'omits', 'swaps'), far_distractor: { ...fd, option: '14' } }, true, 'FAR2', 'far_distractor is the key')
  t({ ...L, distractor_meta: meta('adds', 'omits', 'swaps'), far_distractor: { ...fd, why: 'short' } }, true, 'FAR2', 'why too short')
  t({ ...L, distractor_meta: meta('adds', 'omits', undefined), far_distractor: fd }, true, 'FAR0', 'missing error_sense')
  t({ ...L, distractor_meta: meta('adds', 'omits', 'swaps'), far_distractor: fd }, false, 'FAR', 'a good largest key')
  const S = { prompt: 'p', choices: ['2', '5', '9', '14'], correct_answer: '2', distractor_meta: { 5: { direction: 'above', error_sense: 'omits' }, 9: { direction: 'above', error_sense: 'adds' }, 14: { direction: 'above', error_sense: 'adds' } } }
  t({ ...S, far_distractor: { option: '5', natural_side: 'below', why: 'dropping the refund that is subtracted from the cost leaves the cost higher here' } }, false, 'FAR', 'a good smallest key')
  t({ ...S, distractor_meta: { 5: { direction: 'above', error_sense: 'adds' }, 9: { direction: 'above', error_sense: 'adds' }, 14: { direction: 'above', error_sense: 'adds' } }, far_distractor: { option: '5', natural_side: 'below', why: 'x'.repeat(50) } }, true, 'FAR1', 'all-adds on a smallest key')
  t({ prompt: 'p', choices: ['2', '5', '9', '14'], correct_answer: '5', distractor_meta: { 2: { direction: 'below', error_sense: 'adds' }, 9: { direction: 'above', error_sense: 'adds' }, 14: { direction: 'above', error_sense: 'adds' } } }, false, 'FAR', 'interior key needs no far_distractor')
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log('selftest 13/13 (A91 R01 gated by DSUM and not by DPAIR/PAIR, 1 clean, 1 printed-sum left to PAIR; 10 FAR cases: all-omits, all-adds, missing, near side, key, short why, missing sense, good L, good S, interior)')
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
  let scored = 0, hit = 0, ext = 0; const cnt = { DPAIR: 0, DSUM: 0, PLUGtry12: 0, PARAM12: 0, FAR: 0 }
  for (const it of items) {
    const a = pairRun(it), d = directions(it), dp = dpair(it), ds = dsum(it), pl = plug(it), fr = far(it)
    if (!a.scored || !d.scored || !dp.scored || !ds.scored || !pl.scored || !fr.scored) { hit++; console.log(`  ${it.id}  UNSCORABLE (non-numeric option set)`); continue }
    scored++; if (d.extreme) ext++
    if (dp.out.length) cnt.DPAIR++; if (ds.out.length) cnt.DSUM++; if (fr.out.length) cnt.FAR++
    if (pl.tries <= 2) { cnt.PLUGtry12++; if (PARAM.test(String(it.prompt))) cnt.PARAM12++ }
    if (calib) { for (const x of ds.out) console.log(`  ${it.id}  ${x}`); continue }
    const lines = [...a.out, ...d.out, ...dp.out, ...ds.out, ...pl.out, ...fr.out]
    if (lines.length) hit++
    for (const x of lines) console.log(`  ${it.id}  ${x}`)
    for (const x of [...a.soft, ...dp.soft, ...ds.soft, ...pl.soft, ...fr.soft]) console.log(`  ${it.id}  (read) ${x}`)
  }
  console.log(`${p.replace(/^.*\//, '')}: scored ${scored} of ${items.length} (extreme keys ${ext}); DPAIR gating ${cnt.DPAIR}, DSUM gating ${cnt.DSUM}, FAR gating ${cnt.FAR}, key at try 1-2 ${cnt.PLUGtry12} (parameter asks ${cnt.PARAM12})${calib ? '' : `; items with a PAIR/RUN/DIR/DPAIR/DSUM/PLUG/FAR finding ${hit}`}`)
  if (!scored) process.exit(2)
  if (calib) process.exit(0)
  process.exit(hit ? 1 : 0)
}
