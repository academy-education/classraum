#!/usr/bin/env node
/**
 * alg31-preflight.mjs [--selftest] [--merge] <batch-or-part.json ...>
 *
 * Mechanical pre-freeze checks for sat-math-v31-alg (PREREG-MATH-ALG31-2026-10-23.md), written
 * before any item exists. Authors run it (through alg31-part-check.sh) on every part; I run it with
 * --merge on the three author files together. alg26-preflight's R1-R9 are kept with the sizes
 * changed; R10-R11 are new; the M block imports the post-alg26 stage-0 checks that measured as
 * working (algf27 / mf28 / mf29 / mf30), each named with its source.
 *
 *   R1  shape        4 choices, all numeric, distinct values, Algebra, key among the choices
 *   R2  setup        `setup` {i, ii, iii} on every item; no two items share a full triple, or
 *                    (i)+(iii), or (within one mechanism) (i)+(ii); no triple equal to ANY of the
 *                    98 reference triples (v23/v24/v25 66 + v26 32; count asserted)
 *   R3  plain text   no U+2010-U+2015, U+2212, U+FE63, U+FF0D; no k^2 anywhere
 *   R4  non-integer  at most 2, every one declared, not all offering the integer-k answer
 *       constant
 *   R5  off-by-one   key +- 1, or a declared `off_by_one_options` value next to the key:
 *                    B <= 1, C <= 3, D <= 2 (batch <= 6 = a quarter)
 *   R6  slot         alg31-slots.mjs: commissioned id, Algebra, hard, mech, ask, key rank
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
 *       PLUG31                mf28's plug with the ASK-based natural order (alg31-slots naturalTry):
 *                             plugback {substitutable, verify, why} required; a substitutable item
 *                             must reach its key at try >= 3 and verify must separate it; every
 *                             item at try 1-2 is listed for the cold probe (alg31-plugprobe.mjs)
 *
 * Exit 1 on a failed rule, 2 if it cannot read its input or reads no item.
 */
import { readFileSync } from 'node:fs'
import { SLOTS, MECH, COARSE, PREFIX, val, rank, bestRule, slotProblems, slotOf, naturalTry } from './alg31-slots.mjs'
import { pairRun, directions } from './algf27-checks.mjs'
import { dpair } from './mf28-checks.mjs'
import { dsum, far } from './mf29-checks.mjs'
import { keyprint, struct, inter } from './mf30-checks.mjs'

const DIR = new URL('.', import.meta.url).pathname
export const OBO_CAP = { B: 1, C: 3, D: 2 }
export const REF_COUNT = 98
const norm = s => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
const DASH = /[‐-―−﹣－]/
const KSQ = /k\s*\^\s*2|k²|k\s*\*\s*k\b|k\s*\*\*\s*2/
const isNonintStem = p => /\bvalues? (of |that )?k\b|\bvalues? k can\b|\bk can take\b/i.test(p) && /\binteger/i.test(p) && !/integer values? of k/i.test(p)
const eq = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))

export function plug31(item) {
  const out = [], soft = []
  const want = SLOTS[slotOf(item.id)]
  const key = val(String(item.correct_answer)), vals = (item.choices || []).map(c => val(String(c)))
  if (!want || !Number.isFinite(key) || vals.some(v => !Number.isFinite(v))) return { out, soft, tries: null }
  const desc = want[0] === 'greatest'
  const tries = [...vals].sort((a, b) => desc ? b - a : a - b).findIndex(v => eq(v, key)) + 1
  const p = item.plugback
  if (!p || typeof p.substitutable !== 'boolean' || typeof p.why !== 'string' || !p.why.trim()) { out.push('PLUG31 plugback {substitutable: bool, verify, why} missing or malformed'); return { out, soft, tries } }
  if (p.substitutable) {
    let f; try { f = new Function('v', '"use strict";' + p.verify) } catch (e) { out.push(`PLUG31 verify does not compile: ${e.message}`); return { out, soft, tries } }
    item.choices.forEach((c, i) => { let r; try { r = f(vals[i]) === true } catch { r = 'throws' } const isKey = eq(vals[i], key); if (r === 'throws') out.push(`PLUG31 verify throws on ${c}`); else if (r !== isKey) out.push(`PLUG31 verify(${c}) = ${r}, expected ${isKey}`) })
    if (tries <= 2) out.push(`PLUG31 substitutable ask with the key at natural try ${tries} (${desc ? 'descending' : 'ascending'}): must be >= 3`)
  }
  if (tries <= 2) soft.push(`PROBE key at natural try ${tries} ${desc ? 'descending' : 'ascending'}: the cold plug-back probe decides (author says substitutable ${p.substitutable})`)
  return { out, soft, tries }
}

export function check(items, { merge = false, refs = null } = {}) {
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
    if (fine.hits > cap) fails.push(`R7 ask->rank rule hits ${fine.hits}/${n} > 40%`)
    if (coarse.hits > cap) fails.push(`R7 coarse ask->rank rule hits ${coarse.hits}/${n} > 40%`)
    if (mech.hits > cap) fails.push(`R7 mechanism->rank rule hits ${mech.hits}/${n} > 40%`)
    for (const p of perAsk) fails.push(`R7 within one ask type ${p} > 50%`)
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
    if (merge && (st.above < need || st.below < need)) fails.push(`R10 ${m}: bypass option above ${st.above} / below ${st.below} of ${st.n}, each must be >= ${need}`)
  }
  // M block + R11
  let probe = 0
  for (const x of items) {
    const pr = pairRun(x), di = directions(x), dp = dpair(x), dsm = dsum(x), fr = far(x), kp = keyprint(x), st = struct(x), it = inter(x), pl = plug31(x)
    if (![pr, di, dp, dsm, fr, kp, st].every(r => r.scored !== false)) { fails.push(`M ${x.id}: unscorable (non-numeric option set)`); continue }
    for (const l of [...pr.out, ...di.out.filter(l => !l.startsWith('D4')), ...dp.out, ...dsm.out, ...fr.out, ...kp.out, ...st.out.filter(l => !l.startsWith('STRUCT "')), ...it.out, ...pl.out]) fails.push(`M ${x.id}: ${l}`)
    for (const l of [...pr.soft, ...dp.soft, ...dsm.soft, ...fr.soft, ...kp.soft, ...st.out.filter(l => l.startsWith('STRUCT "')), ...st.soft, ...it.soft, ...pl.soft, ...di.out.filter(l => l.startsWith('D4'))]) reads.push(`${x.id}  (read) ${l}`)
    if (pl.tries != null && pl.tries <= 2) probe++
  }
  notes.push(`M plug-back probe list (natural try 1-2): ${probe} of ${items.length}`)
  return { fails, notes, reads, pos, n, fine, coarse, mech }
}

function selftest() {
  let bad = 0
  const meta = (key, ch, kinds = ['sign_slip', 'wrong_operation', 'omission'], senses = ['swaps', 'adds', 'omits']) => Object.fromEntries(ch.filter(c => c !== key).map((c, i) => [c, { error_kind: kinds[i], error_sense: senses[i], direction: val(c) > val(key) ? 'above' : 'below', stem_predicts_direction: false, why: 'w' }]))
  const it = (s, o = {}) => {
    const [ask, r] = SLOTS[s] ?? ['count', 1]
    const n = Object.keys(SLOTS).indexOf(s) + 1
    const ch = [String(100 * n + 11), String(100 * n + 33), String(100 * n + 57), String(100 * n + 89)]
    const key = ch[r - 1], ds = ch.filter(c => c !== key)
    const extreme = r === 1 || r === 4
    const farOpt = r === 4 ? ds[2] : ds[0]
    const base = { id: PREFIX + s, domain: 'Algebra', difficulty: 'hard', mech: MECH[s[0]], ask, choices: ch, correct_answer: key, prompt: `p ${s}`, explanation: 'e', solve: `return ${key}`,
      setup: { i: 'i' + s, ii: 'ii' + s, iii: 'iii' + s }, bypass_option: ds[0], intermediate_check: 'no distractor is one printed relation away from the key, x',
      plugback: { substitutable: false, why: 'the option cannot be checked without the whole solution' }, distractor_meta: meta(key, ch) }
    if (extreme) {
      base.distractor_meta[farOpt].error_sense = 'adds'
      for (const d of ds) if (d !== farOpt && base.distractor_meta[d].error_sense === 'adds') base.distractor_meta[d].error_sense = 'swaps'
      Object.assign(base, { structure_check: 'the structure does not sign the errors because y', counter_error: { error_kind: 'sign_slip', solve: `return ${r === 4 ? Number(key) + 5 : Number(key) - 5}`, direction: r === 4 ? 'above' : 'below' },
        far_distractor: { option: farOpt, natural_side: r === 4 ? 'above' : 'below', why: 'an extra step enters a divisor here, so it lands on the near side' }, cheap_bound_check: 'b' })
    }
    return { ...base, ...o }
  }
  const t = (name, items, want, opt = {}) => { const r = check(items, opt); if (!r.fails.some(f => f.startsWith(want) || (want.includes(' ') && f.includes(want)))) { bad++; console.error(`selftest ${name}: expected ${want}, got`, r.fails) } }
  t('dash', [it('B1', { prompt: 'x − 3' })], 'R3')
  t('ksq', [it('B1', { solve: 'return k*k' })], 'R3')
  t('reference', [it('B1', { setup: { i: 'a', ii: 'b', iii: 'c' } })], 'R2', { refs: [{ id: 'SM26L-B1', i: 'a', ii: 'b', iii: 'c' }] })
  t('share i+ii one mech', [it('B1', { setup: { i: 'x', ii: 'y', iii: 'p' } }), it('B2', { setup: { i: 'x', ii: 'y', iii: 'q' } })], 'R2')
  t('rank', [it('B1', { correct_answer: it('B1').choices[3] })], 'R6')
  t('medium', [it('B1', { difficulty: 'medium' })], 'R6')
  t('shared key', [it('B1'), it('C3', { choices: it('B1').choices, correct_answer: it('B1').correct_answer })], 'R9')
  t('bypass missing', [it('B1', { bypass_option: '7' })], 'R10')
  t('keyprint', [it('C2', { prompt: `exactly ${it('C2').correct_answer} values` })], ': KEYPRINT')
  t('far1 all omits', [it('B2', { distractor_meta: meta(it('B2').correct_answer, it('B2').choices, ['sign_slip', 'wrong_operation', 'omission'], ['omits', 'omits', 'omits']) })], ': FAR1')
  t('substitutable at try 1', [it('B1', { plugback: { substitutable: true, verify: `return v === ${it('B1').correct_answer}`, why: 'w' } })], ': PLUG31 substitutable')
  t('intermediate_check missing', [it('B6', { intermediate_check: undefined })], ': INTER')
  // the commissioned matrix passes everything; a bypass that always undershoots fails R10
  const full = Object.keys(SLOTS).map(s => it(s))
  const half = full.map((x, i) => { const ds = x.choices.filter(c => c !== x.correct_answer); const above = ds.filter(c => val(c) > val(x.correct_answer)), below = ds.filter(c => val(c) < val(x.correct_answer)); return { ...x, bypass_option: (i % 2 ? above[0] : below[0]) ?? ds[0] } })
  const ok = check(half, { merge: true })
  if (ok.fails.length) { bad++; console.error('selftest commissioned matrix failed', ok.fails) }
  if (ok.fine.hits !== 9 || ok.coarse.hits !== 9 || ok.mech.hits !== 8) { bad++; console.error('selftest matrix rule hits', ok.fine.hits, ok.coarse.hits, ok.mech.hits, 'expected 9/9/8') }
  const under = half.map(x => { const below = x.choices.filter(c => val(c) < val(x.correct_answer)); return below.length ? { ...x, bypass_option: below[0] } : x })
  if (!check(under, { merge: true }).fails.some(f => f.startsWith('R10'))) { bad++; console.error('selftest: an always-below bypass did not fail R10') }
  const skew = half.map(x => x.ask === 'count' ? { ...x, correct_answer: x.choices[3] } : x)
  if (!check(skew, { merge: true }).fails.some(f => f.startsWith('R7'))) { bad++; console.error('selftest: count -> largest skew did not fail R7') }
  // fine rule alone: both greatest keys at rank 2 and both least keys at rank 3 lift ask->rank to
  // 11/24 while the coarse rule stays 9 and no ask type of >= 4 items crosses 50%
  const fineOnly = half.map(x => x.ask === 'greatest' ? { ...x, correct_answer: [...x.choices].sort((a, b) => val(a) - val(b))[1] } : x.ask === 'least' ? { ...x, correct_answer: [...x.choices].sort((a, b) => val(a) - val(b))[2] } : x)
  const fo = check(fineOnly, { merge: true })
  if (!fo.fails.some(f => f.startsWith('R7 ask->rank')) || fo.fails.some(f => f.startsWith('R7 coarse') || f.startsWith('R7 within'))) { bad++; console.error('selftest: the fine-only skew did not isolate R7 ask->rank', fo.fine.hits, fo.coarse.hits) }
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log('selftest 17/17')
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  const args = process.argv.slice(2)
  selftest()
  if (args.includes('--selftest')) process.exit(0)
  const merge = args.includes('--merge')
  const paths = args.filter(a => !a.startsWith('--'))
  if (!paths.length) { console.error('usage: alg31-preflight.mjs [--merge] <batch-or-part.json ...>'); process.exit(2) }
  let items, refs
  try {
    items = paths.flatMap(p => { const j = JSON.parse(readFileSync(p, 'utf8')); const a = Array.isArray(j) ? j : (j && j.id ? [j] : []); if (!a.length) throw new Error(`${p} holds no items`); return a })
    refs = JSON.parse(readFileSync(DIR + 'alg31-reference-triples.json', 'utf8'))
    if (refs.length !== REF_COUNT) throw new Error(`alg31-reference-triples.json holds ${refs.length}, expected ${REF_COUNT} (v23 14 + v24 20 + v25 32 + v26 32)`)
  } catch (e) { console.error(`REFUSING: ${e.message}`); process.exit(2) }
  const r = check(items, { merge, refs })
  console.log(`alg31-preflight${merge ? ' --merge' : ''}: ${r.n} items from ${paths.length} file(s); ${refs.length} reference triples`)
  for (const x of r.notes) console.log('  ' + x)
  for (const x of r.reads) console.log('  ' + x)
  for (const f of r.fails) console.log('  FAIL ' + f)
  console.log(r.fails.length ? `PRE-FLIGHT FAIL (${r.fails.length})` : 'PRE-FLIGHT PASS')
  process.exit(r.fails.length ? 1 : 0)
}
