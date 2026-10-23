#!/usr/bin/env node
/**
 * alg32-preflight.mjs [--selftest] [--merge [--after-drops B3,D7] | --close] <batch-or-part.json ...>
 *   --merge                  the AUTHORED merge (every authored item, returned items in place): R7 / R10 BARRED
 *   --merge --after-drops L  the merge after the stage-0 drops in L: R7 / R10 REPORTED, never barred
 *                            (coordinator decision 2026-10-23, prereg section 5.1); every per-item rule,
 *                            R8 and R9 stay gating
 *   --close   only the CLOSE check (an option = sum / difference / average of two others)
 *
 * Mechanical pre-freeze checks for sat-math-v32-alg (PREREG-MATH-ALG32-2026-10-23.md), written
 * before any item exists. Authors run it (through alg32-part-check.sh) on every part; I run it with
 * --merge on the three author files together. It is alg31-preflight.mjs with three changes, each
 * from alg31's recorded stop (PREREG-MATH-ALG31-2026-10-23.md, Result): R2 adds alg31's 24 setups to
 * the references; PLUG31 becomes PLUG32 (the try-1-2 slot rule); CLOSE is new.
 *
 *   R1  shape        4 choices, all numeric, distinct values, Algebra, key among the choices
 *   R2  setup        `setup` {i, ii, iii} on every item; no two items share a full triple, or
 *                    (i)+(iii), or (within one mechanism) (i)+(ii); no triple equal to ANY of the
 *                    122 reference triples (v23/v24/v25 66 + v26 32 + v31 24; count asserted)
 *   R3  plain text   no U+2010-U+2015, U+2212, U+FE63, U+FF0D; no k^2 anywhere
 *   R4  non-integer  at most 2, every one declared, not all offering the integer-k answer
 *       constant
 *   R5  off-by-one   key +- 1, or a declared `off_by_one_options` value next to the key:
 *                    B <= 1, C <= 3, D <= 2 (batch <= 6 = a quarter)
 *   R6  slot         alg32-slots.mjs: commissioned id, Algebra, hard, mech, ask, key rank, and the
 *                    slot's planned bypass side (so R10 holds by construction)
 *   R7  cross-item   (--merge, barred) best "ask T -> rank r" <= 40% on the six asks AND the
 *       rules        coarse four; best "mechanism -> rank" <= 40%; within an ask type of >= 4
 *                    items no rank > 50%. Without --merge: printed only.
 *   R8  mechanisms   (--merge) exactly the 3 commissioned, <= 10 items each
 *   R9  keys         no two items share a key value
 *   R10 bypass       NEW (alg26 grader F: on the five two-branch interval items the single-branch
 *       direction    distractor sat BELOW the key every time). Every item names `bypass_option`,
 *                    the distractor a student gets by skipping the mechanism's decision point.
 *                    (--merge, barred) within each mechanism the bypass option lies above the key
 *                    on >= floor(3n/8) items AND below on >= floor(3n/8) (3 and 3 of 8).
 *   R11 fields       NEW. intermediate_check on every item; on an extreme key structure_check,
 *                    counter_error and far_distractor (checked by the M block).
 *
 *   M   imported, all GATING unless marked (read):
 *       PAIR / RUN            algf27-checks pairRun (A89 / A88)
 *       DIR D1-D3             algf27-checks directions; D4 (no greatest/least/sum-of-all ask on an
 *                             extreme key) is NOT applied: the slot matrix already keeps greatest /
 *                             least off the extremes, and alg26's extreme sum/count/difference asks
 *                             survived 13 of 18 (prereg rule 5)
 *       DPAIR                 mf28-checks dpair (A90)
 *       DSUM / FAR0-FAR2      mf29-checks dsum, far (A91)
 *       KEYPRINT              mf30-checks keyprint (A92)
 *       STRUCT                mf30-checks struct: the regex hit is printed (read), not gating (prereg
 *                             rule 5); a missing structure_check on an extreme key IS gating
 *       INTER                 mf30-checks inter (missing intermediate_check gating; content (read))
 *       PLUG32                plugback {substitutable, verify, why} required; a substitutable item's
 *                             verify must separate the key. An item whose key sits at natural try 1-2
 *                             must ask an AGGREGATE (count / sum / difference), declare
 *                             substitutable false, name plugback.aggregate_over, and its question
 *                             sentence must ask that aggregate (ASKWORD; "how many units of A" is a
 *                             single value, not a count). Every try-1-2 item still goes to the probe.
 *       CLOSE                 NEW (alg31 lesson 3): no option equals the sum, the difference or the
 *                             average of two other options. Sum and difference are ONE relation over
 *                             a set (a = b + c iff b = a - c), so the break-test disables them
 *                             together; disabling either alone is masked by the other by algebra.
 *
 * Exit 1 on a failed rule, 2 if it cannot read its input or reads no item.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { SLOTS, MECH, COARSE, PREFIX, NONSUB_ASKS, val, rank, bestRule, slotProblems, slotOf, naturalTry } from './alg32-slots.mjs'
import { pairRun, directions } from './algf27-checks.mjs'
import { dpair } from './mf28-checks.mjs'
import { dsum, far } from './mf29-checks.mjs'
import { keyprint, struct, inter } from './mf30-checks.mjs'

const DIR = new URL('.', import.meta.url).pathname
export const OBO_CAP = { B: 1, C: 3, D: 2 }
export const REF_COUNT = 122
const norm = s => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
const DASH = /[‐-―−﹣－]/
const KSQ = /k\s*\^\s*2|k²|k\s*\*\s*k\b|k\s*\*\*\s*2/
const isNonintStem = p => /\bvalues? (of |that )?k\b|\bvalues? k can\b|\bk can take\b/i.test(p) && /\binteger/i.test(p) && !/integer values? of k/i.test(p)
const eq = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))

/** the question sentence: the last sentence holding a '?', else the last sentence */
export const questionOf = prompt => { const segs = String(prompt ?? '').split(/(?<=[.?!])\s+/).filter(Boolean); return [...segs].reverse().find(x => x.includes('?')) ?? segs[segs.length - 1] ?? '' }
export const ASKWORD = {
  // a count OVER A SET (k values, integers, plans), not "how many units of A" (a single value: v26 D7)
  count: /\bfor how many\b|\bhow many ([\w-]+ ){0,2}(integers?|integer values|whole numbers|values|plans|combinations|solutions|pairs|ways|orders|choices)\b|\bnumber of ([\w-]+ ){0,2}(integers?|integer values|whole numbers|values|plans|combinations|solutions|pairs|ways|orders)\b/i,
  // "total" only when it is not the objective itself ("the greatest total profit" is not a sum ask)
  sum: /\bsum\b|\btotal\b(?! (profit|cost|revenue|income|earnings|price|amount of money|value)\b)|\bcombined\b|\badded\b|\bmean\b|\baverage\b/i,
  difference: /\bdifference\b|\bminus\b|\bsubtract|\bhow (much|many) (more|greater|less|fewer|larger|smaller|higher|lower)\b|\bexceeds?\b|\bwidth\b|\brange\b|\blonger\b|\bgap\b/i,
}
export function plug32(item) {
  const out = [], soft = []
  const want = SLOTS[slotOf(item.id)]
  const key = val(String(item.correct_answer)), vals = (item.choices || []).map(c => val(String(c)))
  if (!want || !Number.isFinite(key) || vals.some(v => !Number.isFinite(v))) return { out, soft, tries: null }
  const desc = want[0] === 'greatest'
  const tries = [...vals].sort((a, b) => desc ? b - a : a - b).findIndex(v => eq(v, key)) + 1
  const p = item.plugback
  if (!p || typeof p.substitutable !== 'boolean' || typeof p.why !== 'string' || !p.why.trim()) { out.push('PLUG32 plugback {substitutable: bool, verify, why} missing or malformed'); return { out, soft, tries } }
  if (p.substitutable) {
    let f; try { f = new Function('v', '"use strict";' + p.verify) } catch (e) { out.push(`PLUG32 verify does not compile: ${e.message}`); return { out, soft, tries } }
    item.choices.forEach((c, i) => { let r; try { r = f(vals[i]) === true } catch { r = 'throws' } const isKey = eq(vals[i], key); if (r === 'throws') out.push(`PLUG32 verify throws on ${c}`); else if (r !== isKey) out.push(`PLUG32 verify(${c}) = ${r}, expected ${isKey}`) })
  }
  if (tries <= 2) {
    // alg32's slot rule: only an AGGREGATE ask may sit at natural try 1-2, declared non-substitutable,
    // naming what it aggregates over, and the question sentence must actually ask that aggregate
    if (!NONSUB_ASKS.includes(item.ask)) out.push(`PLUG32 ask "${item.ask}" with the key at natural try ${tries}: only ${NONSUB_ASKS.join(' / ')} may sit at try 1-2`)
    if (p.substitutable !== false) out.push(`PLUG32 key at natural try ${tries} (${desc ? 'descending' : 'ascending'}) but plugback.substitutable is not false`)
    if (typeof p.aggregate_over !== 'string' || p.aggregate_over.trim().length < 20) out.push('PLUG32 plugback.aggregate_over (>= 20 chars: the set the count / sum / difference runs over) missing on a try-1-2 item')
    const q = questionOf(item.prompt)
    if (ASKWORD[item.ask] && !ASKWORD[item.ask].test(q)) out.push(`PLUG32 ASKWORD the question sentence does not ask a ${item.ask} ("${q.slice(0, 90)}")`)
    soft.push(`PROBE key at natural try ${tries} ${desc ? 'descending' : 'ascending'}: aggregate over ${String(p.aggregate_over ?? '').slice(0, 80)}`)
  }
  return { out, soft, tries }
}

/** CLOSE (alg31 Result, lesson 3: author D found it by hand on D1 and D4; neither part-check nor
 *  pre-flight tested it). An option equal to the sum, the difference (either order) or the average of
 *  two OTHER options. Gating on every item, whichever option is the composite. */
export function closure(item) {
  const ch = (item.choices || []).map(String), v = ch.map(val)
  if (v.length !== 4 || v.some(x => !Number.isFinite(x))) return { out: [], scored: false }
  const hits = []
  for (let t = 0; t < 4; t++) for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    if (t === i || t === j || i === j) continue
    if (i < j && eq(v[t], v[i] + v[j])) hits.push(`${ch[t]} = ${ch[i]} + ${ch[j]}`)
    if (i < j && eq(v[t], (v[i] + v[j]) / 2)) hits.push(`${ch[t]} = (${ch[i]} + ${ch[j]})/2`)
    if (eq(v[t], v[i] - v[j])) hits.push(`${ch[t]} = ${ch[i]} - ${ch[j]}`)
  }
  return { out: hits.length ? [`CLOSE option set closed under +, - or average: ${[...new Set(hits)].join('; ')}`] : [], scored: true, hits }
}

export function check(items, { merge = false, refs = null, afterDrops = null } = {}) {
  // afterDrops: the slot ids dropped at stage 0. On the AUTHORED merge (afterDrops null) R7 and R10
  // are BARRED; after drops they are REPORTED, never barred (coordinator decision 2026-10-23,
  // PREREG-MATH-ALG32 section 5.1): a hindsight-best rule over a smaller set rises by construction,
  // which is why alg31 already reported them on the kept file.
  if (afterDrops && (!merge || !Array.isArray(afterDrops) || !afterDrops.length)) throw new Error('afterDrops needs --merge and a non-empty list of dropped slots')
  if (afterDrops) { const present = afterDrops.filter(s => items.some(x => slotOf(x.id) === slotOf(s))); if (present.length) throw new Error(`declared dropped but still in the input: ${present.join(' ')}`) }
  const fl = afterDrops ? (m => notes.push(`REPORTED (after drops ${afterDrops.join(' ')}): ${m}`)) : (m => fails.push(m))
  const fails = [], notes = [], reads = []
  if (!Array.isArray(items) || !items.length) throw new Error('no items')
  const ids = items.map(x => x.id)
  if (new Set(ids).size !== ids.length) fails.push('R1 duplicate ids')
  for (const x of items) {
    const ch = (x.choices || []).map(String)
    if (ch.length !== 4) fails.push(`R1 ${x.id}: ${ch.length} choices`)
    if (!ch.includes(String(x.correct_answer))) fails.push(`R1 ${x.id}: key not among choices`)
    if (ch.some(c => Number.isNaN(val(c)))) fails.push(`R1 ${x.id}: non-numeric option (${ch.join(' | ')})`)
    if (new Set(ch.map(val)).size !== ch.length) fails.push(`R1 ${x.id}: two options have the same value`)
    if (x.domain !== 'Algebra') fails.push(`R1 ${x.id}: domain ${x.domain}`)
  }
  // R2
  const trip = x => x.setup && [norm(x.setup.i), norm(x.setup.ii), norm(x.setup.iii)]
  const refSet = new Map((refs || []).map(r => [[norm(r.i), norm(r.ii), norm(r.iii)].join('|'), r.id]))
  for (const x of items) {
    const t = trip(x)
    if (!t || t.some(v => !v)) { fails.push(`R2 ${x.id}: setup {i,ii,iii} missing`); continue }
    if (refSet.has(t.join('|'))) fails.push(`R2 ${x.id}: setup equals reference ${refSet.get(t.join('|'))}`)
  }
  for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) {
    const A = trip(items[a]), B = trip(items[b]); if (!A || !B) continue
    const pair = `${items[a].id} / ${items[b].id}`
    if (A.join('|') === B.join('|')) fails.push(`R2 ${pair}: same full triple`)
    else if (A[0] === B[0] && A[2] === B[2]) fails.push(`R2 ${pair}: share (i) and (iii)`)
    else if (A[0] === B[0] && A[1] === B[1] && items[a].mech === items[b].mech) fails.push(`R2 ${pair}: share (i) and (ii) in one mechanism`)
  }
  // R3
  for (const x of items) {
    if (DASH.test(JSON.stringify(x))) fails.push(`R3 ${x.id}: non-ASCII dash`)
    for (const f of ['prompt', 'explanation', 'solve']) if (KSQ.test(String(x[f] ?? ''))) fails.push(`R3 ${x.id}: k-squared in ${f}`)
    for (const [o, body] of Object.entries(x.distractor_solve || {})) if (KSQ.test(body)) fails.push(`R3 ${x.id}: k-squared in distractor_solve ${o}`)
  }
  // R4
  const ni = items.filter(x => x.nonint_constant === true || isNonintStem(String(x.prompt)))
  for (const x of ni) {
    if (x.nonint_constant !== true) fails.push(`R4 ${x.id}: asks about values of k with an integer condition but is not declared nonint_constant`)
    else if (x.integer_k_answer == null) fails.push(`R4 ${x.id}: declared nonint_constant without integer_k_answer`)
  }
  if (ni.length > 2) fails.push(`R4 ${ni.length} non-integer-constant items (cap 2)`)
  const offers = ni.filter(x => x.integer_k_answer != null && x.choices.map(String).includes(String(x.integer_k_answer)))
  if (merge && ni.length && offers.length === ni.length) fails.push(`R4 every non-integer-constant item (${ni.length}) offers its integer-k answer`)
  notes.push(`R4 non-integer-constant ${ni.length} (cap 2); offering the integer-k answer ${offers.length} of ${ni.length}`)
  // R5
  const obo = items.filter(x => {
    const key = String(x.correct_answer), k = val(key)
    if (x.choices.some(c => String(c) !== key && Math.abs(Math.abs(val(c) - k) - 1) < 1e-9)) return true
    const sorted = x.choices.map(String).sort((a, b) => val(a) - val(b)), ki = sorted.indexOf(key)
    const nb = [sorted[ki - 1], sorted[ki + 1]].filter(Boolean)
    return (x.off_by_one_options || []).map(String).some(o => nb.includes(o))
  })
  const byAuthor = {}
  for (const x of obo) { const a = slotOf(x.id)[0]; byAuthor[a] = (byAuthor[a] || 0) + 1 }
  for (const [a, n] of Object.entries(byAuthor)) if (n > (OBO_CAP[a] ?? 0)) fails.push(`R5 author ${a}: off-by-one next to the key on ${n} (cap ${OBO_CAP[a] ?? 0})`)
  if (obo.length > 6) fails.push(`R5 off-by-one next to the key on ${obo.length} > 6`)
  notes.push(`R5 off-by-one next to the key ${obo.length} of ${items.length}${obo.length ? ': ' + obo.map(x => x.id).join(',') : ''}`)
  // R6
  const pos = [0, 0, 0, 0, 0]
  for (const x of items) {
    const r = rank(x.choices.map(String), String(x.correct_answer)); if (r) pos[r]++
    for (const p of slotProblems(x)) fails.push('R6 ' + p)
  }
  notes.push(`R6 key rank 1/2/3/4 = ${pos.slice(1).join('/')}; extreme ${pos[1] + pos[4]}/${items.length} = ${(100 * (pos[1] + pos[4]) / items.length).toFixed(1)}%`)
  // R7
  const n = items.length, cap = 0.4 * n
  const rk = x => rank(x.choices.map(String), String(x.correct_answer))
  const scorable = items.filter(x => rk(x) != null)
  const fine = bestRule(scorable.map(x => [x.ask, rk(x)])), coarse = bestRule(scorable.map(x => [COARSE[x.ask] ?? x.ask, rk(x)])), mech = bestRule(scorable.map(x => [x.mech, rk(x)]))
  notes.push(`R7 best ask->rank ${fine.hits}/${n} = ${(100 * fine.hits / n).toFixed(1)}%; coarse ${coarse.hits}/${n} = ${(100 * coarse.hits / n).toFixed(1)}%; mechanism->rank ${mech.hits}/${n} = ${(100 * mech.hits / n).toFixed(1)}%`)
  const perAsk = []
  for (const [k, c] of Object.entries(fine.groups)) { const t = c.reduce((a, b) => a + b, 0), m = Math.max(...c); if (t >= 4 && m / t > 0.5) perAsk.push(`${k} rank ${c.indexOf(m)} on ${m}/${t}`) }
  if (merge) {
    if (fine.hits > cap) fl(`R7 ask->rank rule hits ${fine.hits}/${n} > 40%`)
    if (coarse.hits > cap) fl(`R7 coarse ask->rank rule hits ${coarse.hits}/${n} > 40%`)
    if (mech.hits > cap) fl(`R7 mechanism->rank rule hits ${mech.hits}/${n} > 40%`)
    for (const p of perAsk) fl(`R7 within one ask type ${p} > 50%`)
    // R8
    const m = {}; for (const x of items) m[x.mech] = (m[x.mech] || 0) + 1
    notes.push(`R8 mechanisms ${JSON.stringify(m)}`)
    const want = Object.values(MECH)
    if (Object.keys(m).length !== 3 || !Object.keys(m).every(k => want.includes(k))) fails.push(`R8 mechanisms ${Object.keys(m).join(',')} != the 3 commissioned`)
    for (const [k, c] of Object.entries(m)) if (c > 10) fails.push(`R8 mechanism ${k} has ${c} > 10 items`)
  } else if (perAsk.length) notes.push(`R7 (not barred without --merge) within one ask type: ${perAsk.join('; ')}`)
  // R9
  const kv = {}
  for (const x of items) { const k = val(x.correct_answer); (kv[k] ??= []).push(x.id) }
  for (const [k, l] of Object.entries(kv)) if (l.length > 1) fails.push(`R9 key value ${k} shared by ${l.join(', ')}`)
  // R10
  const side = {}
  for (const x of items) {
    const ds = x.choices.map(String).filter(c => c !== String(x.correct_answer))
    const b = x.bypass_option == null ? null : String(x.bypass_option)
    if (!b || !ds.includes(b)) { fails.push(`R10 ${x.id}: bypass_option ${JSON.stringify(x.bypass_option)} is not one of the three distractors`); continue }
    const s = val(b) > val(x.correct_answer) ? 'above' : 'below'
    const st = (side[x.mech] ??= { above: 0, below: 0, n: 0 }); st[s]++; st.n++
  }
  for (const [m, st] of Object.entries(side)) {
    const need = Math.floor(3 * st.n / 8)
    notes.push(`R10 ${m}: bypass option above the key ${st.above}, below ${st.below} of ${st.n} (need >= ${need} each${merge ? '' : ', barred only with --merge'})`)
    if (merge && (st.above < need || st.below < need)) fl(`R10 ${m}: bypass option above ${st.above} / below ${st.below} of ${st.n}, each must be >= ${need}`)
  }
  // M block + R11
  let probe = 0
  for (const x of items) {
    const pr = pairRun(x), di = directions(x), dp = dpair(x), dsm = dsum(x), fr = far(x), kp = keyprint(x), st = struct(x), it = inter(x), pl = plug32(x), cl = closure(x)
    if (![pr, di, dp, dsm, fr, kp, st, cl].every(r => r.scored !== false)) { fails.push(`M ${x.id}: unscorable (non-numeric option set)`); continue }
    for (const l of [...pr.out, ...di.out.filter(l => !l.startsWith('D4')), ...dp.out, ...dsm.out, ...fr.out, ...kp.out, ...st.out.filter(l => !l.startsWith('STRUCT "')), ...it.out, ...pl.out, ...cl.out]) fails.push(`M ${x.id}: ${l}`)
    for (const l of [...pr.soft, ...dp.soft, ...dsm.soft, ...fr.soft, ...kp.soft, ...st.out.filter(l => l.startsWith('STRUCT "')), ...st.soft, ...it.soft, ...pl.soft, ...di.out.filter(l => l.startsWith('D4'))]) reads.push(`${x.id}  (read) ${l}`)
    if (pl.tries != null && pl.tries <= 2) probe++
  }
  notes.push(`M plug-back probe list (natural try 1-2): ${probe} of ${items.length}`)
  return { fails, notes, reads, pos, n, fine, coarse, mech }
}

const ALG31_PARTS = `${DIR}sat-math-alg31-work/parts`
const ASKQ = { count: 'For how many integer values of k is this true?', sum: 'What is the sum of all such values of k?', difference: 'What is the difference between the greatest and least such values?', greatest: 'What is the greatest possible value?', least: 'What is the least possible value?', value: 'What is the value of x?' }

function selftest() {
  let bad = 0
  const meta = (key, ch, kinds = ['sign_slip', 'wrong_operation', 'omission'], senses = ['swaps', 'adds', 'omits']) => Object.fromEntries(ch.filter(c => c !== key).map((c, i) => [c, { error_kind: kinds[i], error_sense: senses[i], direction: val(c) > val(key) ? 'above' : 'below', stem_predicts_direction: false, why: 'w' }]))
  const it = (s, o = {}, chIn = null) => {
    const [ask, r, side] = SLOTS[s] ?? ['count', 1, 'above']
    const n = Object.keys(SLOTS).indexOf(s) + 1
    const ch = chIn ?? [String(100 * n + 11), String(100 * n + 33), String(100 * n + 57), String(100 * n + 89)]
    const sorted = [...ch].sort((x, y) => val(x) - val(y)), key = sorted[r - 1], ds = ch.filter(c => c !== key)
    const extreme = r === 1 || r === 4
    const farOpt = r === 4 ? sorted[0] : sorted[3]
    const bypass = ds.find(c => (val(c) > val(key)) === (side === 'above')) ?? ds[0]
    const early = naturalTry(ask, r) <= 2
    const base = { id: PREFIX + s, domain: 'Algebra', difficulty: 'hard', mech: MECH[s[0]], ask, choices: ch, correct_answer: key, prompt: `p ${s}. ${ASKQ[ask]}`, explanation: 'e', solve: `return ${key}`,
      setup: { i: 'i' + s, ii: 'ii' + s, iii: 'iii' + s }, bypass_option: bypass, intermediate_check: 'no distractor is one printed relation away from the key, x',
      plugback: { substitutable: false, why: 'the option cannot be checked without the whole solution', ...(early ? { aggregate_over: 'every integer k in the stated range that qualifies' } : {}) }, distractor_meta: meta(key, ch) }
    if (extreme) {
      base.distractor_meta[farOpt].error_sense = 'adds'
      for (const d of ds) if (d !== farOpt && base.distractor_meta[d].error_sense === 'adds') base.distractor_meta[d].error_sense = 'swaps'
      Object.assign(base, { structure_check: 'the structure does not sign the errors because y', counter_error: { error_kind: 'sign_slip', solve: `return ${r === 4 ? val(key) + 5 : val(key) - 5}`, direction: r === 4 ? 'above' : 'below' },
        far_distractor: { option: farOpt, natural_side: r === 4 ? 'above' : 'below', why: 'an extra step enters a divisor here, so it lands on the near side' }, cheap_bound_check: 'b' })
    }
    return { ...base, ...o }
  }
  let nt = 0
  const t = (name, items, want, opt = {}) => { nt++; const r = check(items, opt); if (!r.fails.some(f => f.startsWith(want) || (want.includes(' ') && f.includes(want)))) { bad++; console.error(`selftest ${name}: expected ${want}, got`, r.fails) } }
  const clean = (name, items, opt = {}) => { nt++; const r = check(items, opt); if (r.fails.length) { bad++; console.error(`selftest ${name}: expected clean, got`, r.fails) } }
  clean('one good item per slot', Object.keys(SLOTS).map(s => it(s)))
  t('dash', [it('B1', { prompt: 'x − 3. For how many integer values of k?' })], 'R3')
  t('ksq', [it('B1', { solve: 'return k*k' })], 'R3')
  t('reference', [it('B1', { setup: { i: 'a', ii: 'b', iii: 'c' } })], 'R2', { refs: [{ id: 'SM26L-B1', i: 'a', ii: 'b', iii: 'c' }] })
  t('share i+ii one mech', [it('B1', { setup: { i: 'x', ii: 'y', iii: 'p' } }), it('B2', { setup: { i: 'x', ii: 'y', iii: 'q' } })], 'R2')
  t('rank', [it('B1', { correct_answer: it('B1').choices[3] })], 'R6')
  t('medium', [it('B1', { difficulty: 'medium' })], 'R6')
  t('bypass on the unplanned side', [it('B6', { bypass_option: it('B6').choices[3] })], 'R6')
  t('shared key', [it('B1'), it('C3', { choices: it('B1').choices, correct_answer: it('B1').correct_answer, bypass_option: it('B1').bypass_option, distractor_meta: it('B1').distractor_meta, far_distractor: it('B1').far_distractor })], 'R9')
  t('bypass missing', [it('B1', { bypass_option: '7' })], 'R10')
  t('keyprint', [it('C2', { prompt: `exactly ${it('C2').correct_answer} values. For how many integer values of k?` })], ': KEYPRINT')
  t('far1 all omits', [it('B2', { distractor_meta: meta(it('B2').correct_answer, it('B2').choices, ['sign_slip', 'wrong_operation', 'omission'], ['omits', 'omits', 'omits']) })], ': FAR1')
  t('intermediate_check missing', [it('B6', { intermediate_check: undefined })], ': INTER')
  // PLUG32 - each mechanism separately
  t('substitutable at try 1', [it('B1', { plugback: { substitutable: true, verify: `return v === ${it('B1').correct_answer}`, why: 'w', aggregate_over: 'every integer k in the stated range' } })], ': PLUG32 key at natural try')
  t('aggregate_over missing at try 1-2', [it('C5', { plugback: { substitutable: false, why: 'w' } })], ': PLUG32 plugback.aggregate_over')
  t('question does not ask the aggregate', [it('D7', { prompt: 'p D7. What is the value of x in the best plan?' })], ': PLUG32 ASKWORD')
  t('single-value "how many units" labelled count', [it('D2', { prompt: 'p D2. In the plan with the greatest total profit, how many units of product A are made?' })], ': PLUG32 ASKWORD')
  t('non-aggregate ask at try 2', [it('D7', { ask: 'least' })], ': PLUG32 ask')
  // CLOSE - sum, difference and average each alone, on a try-3 slot so nothing else is in play
  t('closure sum', [it('B6', {}, ['10', '25', '35', '47'])], ': CLOSE')
  t('closure difference', [it('B6', {}, ['12', '30', '42', '61'])], ': CLOSE')
  t('closure average', [it('C4', {}, ['14', '23', '32', '57'])], ': CLOSE')
  clean('no closure', [it('B6', {}, ['13', '29', '37', '62'])])
  // the commissioned matrix passes everything at --merge, with the prereg's rule hits
  const full = Object.keys(SLOTS).map(s => it(s))
  nt++; const ok = check(full, { merge: true })
  if (ok.fails.length) { bad++; console.error('selftest commissioned matrix failed', ok.fails) }
  if (ok.fine.hits !== 9 || ok.coarse.hits !== 8 || ok.mech.hits !== 9) { bad++; console.error('selftest matrix rule hits', ok.fine.hits, ok.coarse.hits, ok.mech.hits, 'expected 9/8/9') }
  nt++; const under = full.map(x => { const below = x.choices.filter(c => val(c) < val(x.correct_answer)); return below.length ? { ...x, bypass_option: below[0] } : x })
  if (!check(under, { merge: true }).fails.some(f => f.startsWith('R10'))) { bad++; console.error('selftest: an always-below bypass did not fail R10') }
  nt++; const skew = full.map(x => x.ask === 'count' ? { ...x, correct_answer: [...x.choices].sort((a, b) => val(a) - val(b))[3] } : x)
  if (!check(skew, { merge: true }).fails.some(f => f.startsWith('R7'))) { bad++; console.error('selftest: count -> largest skew did not fail R7') }
  // after drops: the same R7 skew is REPORTED, not barred, and every per-item rule still bars
  nt++; const dropped = ['B1', 'C3']
  const skewAfter = skew.filter(x => !dropped.includes(slotOf(x.id)))
  const sa = check(skewAfter, { merge: true, afterDrops: dropped })
  const batchBar = f => /^R7 |^R10 (degenerate|integer)/.test(f)   // the per-item R10 line (bypass not a distractor) stays gating
  if (sa.fails.some(batchBar) || !sa.notes.some(l => l.startsWith('REPORTED') && l.includes('R7'))) { bad++; console.error('selftest: R7 after drops not reported-only', sa.fails.filter(batchBar)) }
  nt++; const underAfter = check(under.filter(x => !dropped.includes(slotOf(x.id))), { merge: true, afterDrops: dropped })
  if (underAfter.fails.some(batchBar) || !underAfter.notes.some(l => l.startsWith('REPORTED') && l.includes('R10'))) { bad++; console.error('selftest: R10 after drops not reported-only') }
  nt++; const perItem = check([it('B6', {}, ['10', '25', '35', '47']), ...skewAfter.filter(x => slotOf(x.id) !== 'B6')], { merge: true, afterDrops: dropped })
  if (!perItem.fails.some(f => f.includes(': CLOSE'))) { bad++; console.error('selftest: a per-item rule stopped barring after drops') }
  nt++; let thr = false; try { check(full, { merge: true, afterDrops: ['B1'] }) } catch { thr = true }
  if (!thr) { bad++; console.error('selftest: a dropped slot still in the input was accepted') }
  // FIXTURES: alg31's 24 authored parts (seen by probes; never candidates here). All 24 are closure-free
  // after author D's two fixes; a closure planted in each (sum, difference, average) must fire on all 24;
  // alg31's D6 / D7 (greatest r3, least r2 at try 2) must be refused under alg32's slots.
  let parts = []
  try { parts = readdirSync(ALG31_PARTS).filter(f => /^SM31L-[BCD]\d\.json$/.test(f)).map(f => JSON.parse(readFileSync(`${ALG31_PARTS}/${f}`, 'utf8'))) } catch { }
  nt++; if (parts.length !== 24) { bad++; console.error(`selftest: ${parts.length} alg31 fixture parts read, expected 24`) }
  else {
    const fired = parts.filter(p => closure(p).out.length)
    if (fired.length) { bad++; console.error('selftest: closure fires on clean alg31 parts', fired.map(p => p.id)) }
    for (const kind of ['sum', 'difference', 'average']) {
      nt++
      const miss = parts.filter(p => {
        const ch = p.choices.map(String), key = String(p.correct_answer), ds = ch.filter(c => c !== key), [a, b] = [val(ch[0]), val(ch[1])]
        const target = ds.find(c => c !== ch[0] && c !== ch[1]) ?? ds[0]
        const planted = kind === 'sum' ? a + b : kind === 'difference' ? a - b : (a + b) / 2
        if (ch.some(c => Math.abs(val(c) - planted) < 1e-9)) return false
        const m = { ...p, choices: ch.map(c => c === target ? String(planted) : c) }
        return !closure(m).out.length
      })
      if (miss.length) { bad++; console.error(`selftest: planted ${kind} closure missed on`, miss.map(p => p.id)) }
    }
    nt++
    const remap = (p, s) => ({ ...p, id: PREFIX + s })
    for (const s of ['D6', 'D7']) {
      const p = parts.find(x => x.id === 'SM31L-' + s), r = check([remap(p, s)])
      if (!r.fails.some(f => f.includes('PLUG32 ask') || f.startsWith('R6'))) { bad++; console.error(`selftest: alg31 ${s} not refused under alg32 slots`, r.fails) }
    }
    // the nine alg31 aggregate try-1-2 parts pass ASKWORD as written (recall on real stems)
    const agg = parts.filter(p => ['count', 'sum', 'difference'].includes(p.ask))
    const deaf = agg.filter(p => !ASKWORD[p.ask].test(questionOf(p.prompt)))
    if (deaf.length) { bad++; console.error('selftest: ASKWORD misses real aggregate stems', deaf.map(p => p.id)) }
  }
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log(`selftest ${nt}/${nt}`)
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  const args = process.argv.slice(2)
  selftest()
  if (args.includes('--selftest')) process.exit(0)
  const merge = args.includes('--merge')
  const ai = args.indexOf('--after-drops')
  let afterDrops = null
  if (ai >= 0) {
    afterDrops = String(args[ai + 1] ?? '').split(',').map(x => x.trim()).filter(Boolean)
    if (!afterDrops.length || !afterDrops.every(x => SLOTS[slotOf(x)])) { console.error('REFUSING: --after-drops needs a comma list of commissioned slots (e.g. B3,D7)'); process.exit(2) }
    if (!merge) { console.error('REFUSING: --after-drops is a --merge mode'); process.exit(2) }
    args.splice(ai, 2)
  }
  const paths = args.filter(a => !a.startsWith('--'))
  if (!paths.length) { console.error('usage: alg32-preflight.mjs [--merge] <batch-or-part.json ...>'); process.exit(2) }
  let items, refs
  try {
    items = paths.flatMap(p => { const j = JSON.parse(readFileSync(p, 'utf8')); const a = Array.isArray(j) ? j : (j && j.id ? [j] : []); if (!a.length) throw new Error(`${p} holds no items`); return a })
    refs = JSON.parse(readFileSync(DIR + 'alg32-reference-triples.json', 'utf8'))
    if (refs.length !== REF_COUNT) throw new Error(`alg32-reference-triples.json holds ${refs.length}, expected ${REF_COUNT} (v23 14 + v24 20 + v25 32 + v26 32 + v31 24)`)
  } catch (e) { console.error(`REFUSING: ${e.message}`); process.exit(2) }
  if (args.includes('--close')) {
    // the closure check alone (alg32-part-check.sh step 3b; stage 0 runs it inside the full pre-flight too)
    let n = 0, unscored = 0
    for (const x of items) { const c = closure(x); if (!c.scored) { unscored++; console.log(`  CLOSE ${x.id}: UNSCORABLE (non-numeric or not 4 options)`); continue } for (const l of c.out) { n++; console.log(`  FAIL ${x.id}: ${l}`) } }
    console.log(`closure: ${items.length - unscored} of ${items.length} option sets scored, ${n} closed`)
    if (!(items.length - unscored)) { console.error('REFUSING: no option set could be scored'); process.exit(2) }
    process.exit(n || unscored ? 1 : 0)
  }
  let r
  try { r = check(items, { merge, refs, afterDrops }) } catch (e) { console.error(`REFUSING: ${e.message}`); process.exit(2) }
  console.log(`alg32-preflight${merge ? ' --merge' : ''}${afterDrops ? ` --after-drops ${afterDrops.join(',')} (R7 / R10 REPORTED, not barred)` : ''}: ${r.n} items from ${paths.length} file(s); ${refs.length} reference triples`)
  for (const x of r.notes) console.log('  ' + x)
  for (const x of r.reads) console.log('  ' + x)
  for (const f of r.fails) console.log('  FAIL ' + f)
  console.log(r.fails.length ? `PRE-FLIGHT FAIL (${r.fails.length})` : 'PRE-FLIGHT PASS')
  process.exit(r.fails.length ? 1 : 0)
}
