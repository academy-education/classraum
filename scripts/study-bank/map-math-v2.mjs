#!/usr/bin/env node
/**
 * map-math-v2.mjs — map-v2 Math batch 1 gate pipeline (MAP-MATH-V2.prereg.md, MAP-PLAN-2026-10-23 §3.1), 2026-10-24.
 * map-math-g58-v5.mjs made general to the four MAP maths areas. Inputs: the 11 author files
 * scratchpad/map-v2-math-work/<author>/items.json (221 slots in map-v2-work/math/slots.json, checked per item by
 * map-v2-work/math/math-check.mjs). Every bar runs PER AREA and each area freezes as its own batch.
 *
 *   assemble                     11 author files -> WORK/assembled.json; every file must exit 0 from math-check.mjs
 *   oo-pool                      read-only: live ISEE control pool per area x difficulty vs the assembled need
 *   screen-render 1              every assembled item, seeded order, packets of <= 40 -> WORK/screen/p1-<x>/screen.md
 *   screen-score 1               read every p1 screen.json; fails -> WORK/screen-p1.json and WORK/returns/needed-<author>.json
 *   screen-render 2              every pass-1 fail must be accounted for: WORK/returns/<id>.json (revised; must
 *                                pass math-check), withdrawn.json {id: why} or stand.json {id: why};
 *                                writes WORK/assembled.post-return.json and renders the REVISED items, p2-<x>
 *   screen-score 2               records pass-2 fails (WORK/screen-p2.json). NOT a drop: the screen returns once and
 *                                never drops on one screener (plan §2.1); the flags are carried to the score record
 *   freeze                       post-return items minus withdrawn, re-checked (math-check), PER AREA ->
 *                                map-math-v2/<area>/batch.json (order seed per area); no per-area minimum
 *   oo [O|N|G|D]                 options-only render per area vs a 1:1 tier-matched live ISEE control
 *                                -> WORK/oo/<A>/oo.blind.json (solvers write WORK/oo/<A>/solver-{a,b,c}.json)
 *   grade [O|N|G|D]              cold + keyed with-source renders per area, parts of <= 35
 *   stage <A> <part> <d|e> <cold|keyed>   grader folder WORK/grade/<A>-p<part>-<g>/ (keyed: snapshot + chmod 444 + hash first)
 *   coldcheck <A>                every stage-1 field copied unchanged into stage2.json, stage-1 hash unchanged
 *   score <A>                    all bars for one area -> map-math-v2/<area>/stages.json; one-grader flags -> tb-needs, exit 1
 *   tiebreak <A>                 cold render of the flagged items for grader F -> WORK/grade/<A>-f-tb/grade.md
 *   --selftest                   every bar and rule at its margin, then each rule reverted must fail a case
 *
 * No insert here: that needs math-bank-helper.mjs BANK_FAMILY=map (plan D2), done separately.
 * A check that cannot read its input exits 2 and never prints a number.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, chmodSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
import { val, scoreItem } from './key-extremity-breakdown.mjs'
import { keyExtremityVerdict } from './key-extremity-gate.mjs'
import { difficultyBars, iseeArea, jac } from './map-math-g58-v5.mjs'

export const ROOT = '/Users/andylee/Downloads/saas/classraum'
export const WORK = ROOT + '/scratchpad/map-math-v2-work'
const AUTHORED = ROOT + '/scratchpad/map-v2-math-work'
const D = ROOT + '/scripts/study-bank/'
const R = D + 'map-math-v2/'
const CHECK = D + 'map-v2-work/math/math-check.mjs'
const SLOTS_FILE = D + 'map-v2-work/math/slots.json'
export const PREREG = 'scripts/study-bank/MAP-MATH-V2.prereg.md'
const die = (m, code = 2) => { console.error(`REFUSING: ${m}`); process.exit(code) }
const rd = p => { if (!existsSync(p)) die(`missing ${p}`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`unreadable ${p}: ${e.message}`) } }
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const pct = (a, b) => b ? 100 * a / b : NaN
const f1 = x => Number.isFinite(x) ? x.toFixed(1) : 'NaN'
const wj = (p, o) => writeFileSync(p, JSON.stringify(o, null, 1) + '\n')

/* ------------------------------------------------------------------ areas, authors, seeds */
export const AREAS = {
  O: { key: 'oa', domain: 'Operations and Algebraic Thinking', authors: ['O56', 'O78'], cohort: 'map-math-v2-oa' },
  N: { key: 'num', domain: 'Real and Complex Number Systems', authors: ['N56', 'N7', 'N8'], cohort: 'map-math-v2-num' },
  G: { key: 'geo', domain: 'Geometry', authors: ['G56', 'G78'], cohort: 'map-math-v2-geo' },
  D: { key: 'data', domain: 'Statistics and Probability', authors: ['D5', 'D6', 'D7', 'D8'], cohort: 'map-math-v2-data' },
}
export const AUTHORS = Object.values(AREAS).flatMap(a => a.authors)
const LETTER_OF_DOMAIN = Object.fromEntries(Object.entries(AREAS).map(([L, a]) => [a.domain, L]))
export const SEED = {
  screen1Order: 20261301, screen1Deal: 20261302, screen2Order: 20261303, screen2Deal: 20261304,
  freeze: { O: 20261311, N: 20261312, G: 20261313, D: 20261314 },
  oo: { O: 20261321, N: 20261322, G: 20261323, D: 20261324 },
  grade: { O: 20261330, N: 20261340, G: 20261350, D: 20261360 },   // + part number
}
export const SCREEN_PACKET_MAX = 40, GRADE_PART_MAX = 35
export const ID_RE = /^MV2-([ONGD])\d+-\d\d$/
const areaOfItem = it => { const L = LETTER_OF_DOMAIN[it?.domain]; if (!L) die(`${it?.id}: domain '${it?.domain}' is not a MAP maths area`); if (AREAS[L].key !== it.map_area) die(`${it.id}: map_area '${it.map_area}' != '${AREAS[L].key}' for ${it.domain}`); return L }
const areaArg = a => { if (!a) return Object.keys(AREAS); if (!AREAS[a]) die(`area must be one of ${Object.keys(AREAS).join(' ')}`); return [a] }
const areaDir = L => R + AREAS[L].key + '/'

/** n items into k = ceil(n / max) balanced chunks, in order */
export function chunk(arr, max) {
  const k = Math.ceil(arr.length / max); if (!k) return []
  const out = []; let i = 0
  for (let c = 0; c < k; c++) { const sz = Math.floor(arr.length / k) + (c < arr.length % k ? 1 : 0); out.push(arr.slice(i, i + sz)); i += sz }
  return out
}

export function keyPos(item) {
  const sc = scoreItem(item.choices.map(String), String(item.correct_answer))
  if (sc.skip) return null
  return sc.keyMin ? 'S' : sc.keyMax ? 'L' : 'I'
}

/* ------------------------------------------------------------------ rules (every one toggleable so --selftest can revert it) */
export const RULES = {
  // options-only, per area, three samples (MAP-PLAN §3.1)
  ooMargin: 10,            // hold if candidate - control > +10 points
  ooUnan: 15,              // hold if candidate unanimous-correct RATE - control's > +15 points (batch level, never per item)
  ooCeiling: true,         // control > 100 - ooMargin: the margin bar cannot fire -> not-measured (held)
  unanCeiling: true,       // control unanimity > 100 - ooUnan: the unanimity bar cannot fire -> not-measured (held)
  emptyArmRefuses: true,   // an empty arm is no measurement (held), never a pass
  // kept-set key extremity, per insert batch (= per area)
  extremityGate: true,     // fail (< 0.8 x derived chance) -> area held
  smallNHolds: false,      // n < 10 -> no measurement, recorded; NOT a hold (plan removed v1's n >= 10 hold)
  // per-item with-source rules
  keyDisputeAnyDrops: true,   // R1 key_ok false by either grader -> drop (the key is sandbox-recomputed; a dispute is about the stem)
  exclBoth: true, exclOneTb: true,   // R2 exclusivity: both -> drop; one -> tie-break grader F
  freeBoth: true, freeOneTb: true,   // R4 (>= 2 free strikes) and R5 (key identifiable free): both -> drop; one -> F
  tbBoth: true, tbOne: true,         // R6 plug-back, R7 option pair, R8 one-sided, R10 single bound, R11 template: both -> drop; one -> F
  tieDrops: true,          // F row missing or malformed on a one-grader flag: tie -> drop
  r3Both: true,            // R3 distractors weak by both -> drop
  extRecommendDrops: true, // EXT-1 drop_recommend by either -> drop (v5, kept)
  offBlueprintHolds: true, // both graders judge another area -> hold
  gradeFitDrops: false,    // grade fit is RECORDED, not a drop rule (uncalibrated model judgment; plan §3.1)
  // screen
  screenStrikeMin: 2,      // S-R4: n_struck >= 2 fails the screen
  screenKeyIdent: true, screenPlugback: true, screenPair: true, screenOneSided: true, screenSingleBound: true, screenWrongAnswer: true, screenMalformed: true,
  screenP2Drops: false,    // a pass-2 fail is recorded, never dropped on one screener
  // freeze
  areaFreezeMin: 0,        // no per-area minimum
  // cold/keyed integrity
  coldCompare: true,
}

/* ---- options-only verdict, per area */
export function ooVerdict(cand, ctrl, Rl = RULES) {
  const cr = pct(cand.hits, cand.picks), kr = pct(ctrl.hits, ctrl.picks)
  const cu = pct(cand.unan, cand.n), ku = pct(ctrl.unan, ctrl.n)
  if (Rl.emptyArmRefuses && (!cand.picks || !ctrl.picks)) return { status: 'no-measurement', cr, kr, why: 'empty arm' }
  const margin = cr - kr, umar = cu - ku
  if (Rl.ooCeiling && kr > 100 - Rl.ooMargin + 1e-9) return { status: 'not-measured', cr, kr, cu, ku, margin, umar, why: `control ${f1(kr)}% leaves under ${Rl.ooMargin} points of headroom: the +${Rl.ooMargin} bar cannot fire (attainable control range for this bar: 0-${100 - Rl.ooMargin}%)` }
  if (Rl.unanCeiling && ku > 100 - Rl.ooUnan + 1e-9) return { status: 'not-measured', cr, kr, cu, ku, margin, umar, why: `control unanimous-correct ${f1(ku)}% leaves under ${Rl.ooUnan} points: the unanimity bar cannot fire (attainable range 0-${100 - Rl.ooUnan}%)` }
  const hold = margin > Rl.ooMargin + 1e-9 || umar > Rl.ooUnan + 1e-9
  return { status: hold ? 'hold' : 'pass', cr, kr, cu, ku, margin, umar, why: `candidate ${f1(cr)}% vs control ${f1(kr)}% (margin ${f1(margin)}, bar +${Rl.ooMargin}); unanimous-correct rate ${f1(cu)}% vs control ${f1(ku)}% (${f1(umar)}, bar +${Rl.ooUnan})` }
}

/* ---- area status: options-only + kept-set extremity */
export function areaStatus(kept, oo, Rl = RULES) {
  const ext = keyExtremityVerdict(kept), reasons = [], notes = []
  if (oo !== 'pass') reasons.push(`options-only ${oo}`)
  if (ext.status === 'fail' && Rl.extremityGate) reasons.push(`kept-set key extremity fail: ${ext.reason}`)
  if (ext.status === 'no-measurement') (Rl.smallNHolds ? reasons : notes).push(`kept-set extremity: ${ext.reason} (recorded; the inserter's gate measures from n >= 10)`)
  if (!kept.length) reasons.push('nothing kept')
  return { status: reasons.length ? 'held' : 'pass', reasons, notes, extremity: ext }
}

/* ---- the screen: one cold screener row -> rule codes */
export function screenFails(it, s, Rl = RULES) {
  if (!s || typeof s !== 'object') return ['S-MISSING screener row missing']
  const ext = ['S', 'L'].includes(keyPos(it)), f = []
  const bools = ['key_identifiable_free', 'plugback_routine', 'one_sided', 'single_bound_kills_all']
  if (Rl.screenMalformed && (s.n_struck === null || s.n_struck === '' || !Number.isFinite(+s.n_struck) || bools.some(k => typeof s[k] !== 'boolean'))) return ['S-MALFORMED screener row malformed']
  if (Rl.screenWrongAnswer && val(s.my_answer) !== val(it.correct_answer) && String(s.my_answer).trim() !== String(it.correct_answer)) f.push(`S-KEY screener answered ${s.my_answer}`)
  if (+s.n_struck >= Rl.screenStrikeMin) f.push(`S-R4 ${s.n_struck} struck without solving: ${JSON.stringify(s.struck)} (${String(s.free_elimination ?? '').slice(0, 160)})`)
  if (Rl.screenKeyIdent && s.key_identifiable_free === true) f.push('S-R5 key identifiable without solving')
  if (Rl.screenPlugback && s.plugback_routine === true) f.push(`S-R6 plug-back routine at try ${s.plugback_tries}`)
  if (Rl.screenPair && s.option_pair_tell != null && s.option_pair_tell !== '') f.push(`S-R7 option pair ${String(s.option_pair_tell).slice(0, 120)}`)
  if (Rl.screenOneSided && ext && s.one_sided === true) f.push('S-R8 one-sided extreme key')
  if (Rl.screenSingleBound && ext && s.single_bound_kills_all === true) f.push(`S-R10 single bound kills all (${String(s.extreme_single_bound ?? '').slice(0, 100)})`)
  return f
}

/** stage-0 drops: withdrawn items only, unless the (reverted) rule drops pass-2 fails */
export function stage0Drops(withdrawn, p2fails, Rl = RULES) {
  const d = {}
  for (const [id, why] of Object.entries(withdrawn ?? {})) d[id] = `withdrawn by its author after the screen return: ${why}`
  if (Rl.screenP2Drops) for (const [id, f] of Object.entries(p2fails ?? {})) d[id] = `still fails the screen after its return: ${f.join(' | ')}`
  return d
}

/** which areas may freeze (no minimum unless reverted) */
export function freezable(byArea, Rl = RULES) {
  return Object.fromEntries(Object.entries(byArea).map(([L, n]) => [L, n > 0 && n >= Rl.areaFreezeMin]))
}

/** F's vote on one flag: true / false / null (no vote: missing or malformed) */
export function fVote(code, F, earlierNamed) {
  if (!F || typeof F !== 'object') return null
  const b = k => typeof F[k] === 'boolean' ? F[k] : null
  if (code.startsWith('R2')) { if (typeof F.exclusive !== 'boolean' || !('second_defensible' in F)) return null; return F.exclusive === false || (F.second_defensible != null && F.second_defensible !== '') }
  if (code.startsWith('R4')) { const n = F.n_struck; if (n === null || n === '' || n === undefined || !Number.isFinite(+n)) return null; return +n >= 2 }
  if (code.startsWith('R5')) return b('key_identifiable_free')
  if (code.startsWith('R6')) return b('plugback_routine')
  if (code.startsWith('R8')) return b('one_sided')
  if (code.startsWith('R10')) return b('single_bound_kills_all')
  if (code.startsWith('R7')) return F.option_pair_tell === undefined ? null : (F.option_pair_tell != null && F.option_pair_tell !== '')
  if (code.startsWith('R11')) return Array.isArray(F.same_template_as) ? F.same_template_as.some(x => earlierNamed.has(String(x))) : null
  return null
}

/**
 * per-item rules over two graders' stage-2 rows. F: grader F's cold row, or undefined if the item was not in the
 * tie-break render. One-grader flag: F yes -> drop, F no -> no drop, F no vote -> tie -> drop.
 */
export function itemVerdict(it, a, b, F, earlier = new Set(), Rl = RULES) {
  const ext = ['S', 'L'].includes(keyPos(it))
  const drop = [], hold = [], need = [], rec = []
  const both = f => f(a) && f(b), any = f => f(a) || f(b), one = f => !!f(a) !== !!f(b)
  const named = new Set([a, b].flatMap(g => (g.same_template_as ?? []).map(String)).filter(x => earlier.has(x)))
  const flag = (code, f, onBoth, onOne) => {
    if (both(f)) { if (onBoth) drop.push(`${code} (both)`); return }
    if (!one(f) || !onOne) return
    if (F === undefined) { need.push(code); return }
    const v = fVote(code, F, named)
    if (v === true) drop.push(`${code} (one grader + F)`)
    else if (v === null && Rl.tieDrops) drop.push(`${code} (one grader, F no vote: tie -> drop)`)
  }
  if (Rl.keyDisputeAnyDrops && any(g => g.key_ok === false)) drop.push('R1 key disputed')
  flag('R2 not exclusive / second defensible', g => g.exclusive === false || (g.second_defensible != null && g.second_defensible !== ''), Rl.exclBoth, Rl.exclOneTb)
  if (Rl.r3Both && both(g => g.distractors_weak === true)) drop.push('R3 distractors weak (both)')
  flag('R4 two or more free strikes', g => (+g.n_struck || 0) >= 2, Rl.freeBoth, Rl.freeOneTb)
  flag('R5 key identifiable without solving', g => g.key_identifiable_free === true, Rl.freeBoth, Rl.freeOneTb)
  flag('R6 plug-back routine <= 2', g => g.plugback_routine === true, Rl.tbBoth, Rl.tbOne)
  if (ext) { flag('R8 one-sided extreme key', g => g.one_sided === true, Rl.tbBoth, Rl.tbOne); flag('R10 single bound kills all', g => g.single_bound_kills_all === true, Rl.tbBoth, Rl.tbOne) }
  flag('R7 option pair', g => g.option_pair_tell != null && g.option_pair_tell !== '', Rl.tbBoth, Rl.tbOne)
  flag('R11 template of an earlier item', g => (g.same_template_as ?? []).some(x => earlier.has(String(x))), Rl.tbBoth, Rl.tbOne)
  if (Rl.extRecommendDrops && any(g => g.drop_recommend === true)) drop.push('EXT-1 drop_recommend')
  for (const fit of ['too_easy', 'too_hard']) if (both(g => g.grade_fit === fit)) (Rl.gradeFitDrops ? drop : rec).push(`G1 ${fit} for its grade (both)${Rl.gradeFitDrops ? '' : ' - recorded, not a drop rule'}`)
  if (Rl.offBlueprintHolds && both(g => g.on_blueprint === false)) hold.push('OFF off-blueprint (both)')
  return { drop: [...new Set(drop)], hold, need: [...new Set(need)], rec, named: [...named], keep: !drop.length && !hold.length && !need.length }
}

const TIER_RANK = { below_grade: 0, low: 1, mid: 2, high: 3, above_grade: 4 }
export function bankedDifficulty(a, b) {
  const r = x => Math.min(3, Math.max(1, TIER_RANK[x.tier_assigned] ?? 2))
  const m = (r(a) + r(b)) / 2
  return m <= 1.5 ? 'easy' : m >= 2.5 ? 'hard' : 'medium'
}

export const S1_FIELDS = ['my_answer', 'exclusive', 'second_defensible', 'struck', 'n_struck', 'free_elimination', 'key_identifiable_free', 'plugback_tries', 'plugback_routine', 'error_directions', 'one_sided', 'extreme_single_bound', 'single_bound_kills_all', 'interior_parity', 'interior_tell', 'arith_tell', 'option_pair_tell', 'same_template_as', 'live_duplicate', 'area_judged', 'on_blueprint', 'grade_fit', 'grade_assigned', 'tier_assigned', 'grade_note', 'note']
export const S2_FIELDS = ['key_ok', 'key_note', 'path_coherent', 'path_note', 'distractors_weak', 'drop_recommend', 'drop_reason', 'grade_fit_final', 'grade_note_final']
/** stage-1 -> stage-2 integrity for one grader: list of problems */
export function coldDiff(s1, s2, Rl = RULES) {
  const out = []
  for (const id of Object.keys(s1).filter(k => ID_RE.test(k))) {
    if (!s2[id]) { out.push(`${id} missing from stage2`); continue }
    if (Rl.coldCompare) for (const f of S1_FIELDS) if (JSON.stringify(s1[id][f]) !== JSON.stringify(s2[id][f])) out.push(`${id} stage-1 field ${f} changed`)
    for (const f of S2_FIELDS) if (!(f in s2[id])) out.push(`${id} stage-2 field ${f} missing`)
  }
  return out
}

/* ------------------------------------------------------------------ renders */
const TIER_WORDS = { low: 'low (easier than typical for this grade: most students in the grade answer it correctly)', mid: 'mid (typical for this grade: about half of students in the grade answer it correctly)', high: 'high (harder than typical for this grade: only stronger students in the grade answer it correctly)' }
export function renderGraphic(g, id = '?') {
  if (!g) return ''
  if (!['table', 'twowaytable'].includes(g.type) || !Array.isArray(g.cells) || !Array.isArray(g.colLabels)) die(`${id}: cannot render graphic type '${g?.type}'`)
  const rows = g.cells.map((row, ri) => `| ${[(g.rowLabels ?? [])[ri] ?? '', ...row].join(' | ')} |`)
  return `\nTable${g.caption ? ` (${g.caption})` : ''}:\n\n| ${['', ...g.colLabels].join(' | ')} |\n| ${['', ...g.colLabels].map(() => '---').join(' | ')} |\n${rows.join('\n')}\n`
}
export function coldBlock(it, opts) {
  return `\n---\n\n## ${it.id}\n\nArea: ${it.domain} | Target grade: ${it.grade_target} | Target tier: ${TIER_WORDS[it.tier]}\n\nQuestion: ${it.prompt}\n${renderGraphic(it.graphic, it.id)}\n${opts.map((o, j) => `${'ABCD'[j]}. ${o}`).join('\n')}\n`
}
/** key at letter 'ABCD'[i % 4], the rest seeded */
function dealOptions(it, i, rand) {
  const L = 'ABCD'[i % 4], rest = shuffleWith(it.choices.map(String).filter(c => c !== String(it.correct_answer)), rand)
  let q = 0; return { letter: L, opts: [...'ABCD'].map(s => s === L ? String(it.correct_answer) : rest[q++]) }
}

/* ------------------------------------------------------------------ math-check over files, in parallel */
function runCheck(file) {
  return new Promise(res => {
    const p = spawn('node', [CHECK, file], { cwd: ROOT }); let out = '', err = ''
    p.stdout.on('data', d => { out += d }); p.stderr.on('data', d => { err += d })
    p.on('close', code => { const m = out.match(/(\d+) items read; (\d+) PART OK; (\d+) failing/); res({ file, code, read: m ? +m[1] : NaN, ok: m ? +m[2] : NaN, fails: out.split('\n').filter(l => /PART FAIL/.test(l)).map(l => l.trim()), err: err.trim() }) })
  })
}
async function checkAll(files, label) {
  const rs = await Promise.all(files.map(runCheck))
  let bad = 0
  for (const r of rs) {
    console.log(`  math-check ${r.file.replace(ROOT + '/', '')}: exit ${r.code}, ${r.ok} PART OK of ${r.read}`)
    if (r.code !== 0 || !(r.read > 0) || r.ok !== r.read) { bad++; for (const f of r.fails) console.log(`    ${f}`); if (r.err) console.log(`    ${r.err.slice(0, 400)}`) }
  }
  if (bad) die(`${label}: ${bad} file(s) not all PART OK`, 1)
  return rs.reduce((s, r) => s + r.read, 0)
}

/* ------------------------------------------------------------------ selftest */
function cases(Rl) {
  const c = []
  const t = (cond, msg) => c.push([!!cond, msg])
  // options-only, at the margins
  const arm = (hits, picks, unan, n) => ({ hits, picks, unan, n })
  t(ooVerdict(arm(42, 120, 6, 40), arm(30, 120, 4, 40), Rl).status === 'pass', 'oo +10.0 exactly passes')
  t(ooVerdict(arm(43, 120, 6, 40), arm(30, 120, 4, 40), Rl).status === 'hold', 'oo +10.8 holds')
  t(ooVerdict(arm(30, 120, 10, 40), arm(30, 120, 4, 40), Rl).status === 'pass', 'oo unanimity rate +15.0 passes')
  t(ooVerdict(arm(30, 120, 11, 40), arm(30, 120, 4, 40), Rl).status === 'hold', 'oo unanimity rate +17.5 holds')
  t(ooVerdict(arm(110, 120, 6, 40), arm(109, 120, 4, 40), Rl).status === 'not-measured', 'oo control 90.8% (headroom 9.2 < 10): not measured')
  t(ooVerdict(arm(108, 120, 6, 40), arm(108, 120, 4, 40), Rl).status === 'pass', 'oo control 90.0% (headroom exactly 10): measured')
  t(ooVerdict(arm(60, 120, 36, 40), arm(60, 120, 35, 40), Rl).status === 'not-measured', 'oo control unanimity 87.5% (headroom 12.5 < 15): not measured')
  t(ooVerdict(arm(60, 120, 34, 40), arm(60, 120, 34, 40), Rl).status === 'pass', 'oo control unanimity 85.0% (headroom exactly 15): measured')
  t(ooVerdict(arm(0, 0, 0, 0), arm(30, 120, 4, 40), Rl).status === 'no-measurement', 'oo empty candidate arm: no number')
  // area status: kept-set extremity, no per-area minimum
  const ex = (n, e) => Array.from({ length: n }, (_, i) => ({ choices: ['2', '5', '9', '14'], correct_answer: i < e ? (i % 2 ? '14' : '2') : '5' }))
  t(areaStatus(ex(10, 4), 'pass', Rl).status === 'pass', 'extremity 4/10 = 40.0% passes')
  t(areaStatus(ex(10, 3), 'pass', Rl).status === 'held', 'extremity 3/10 = 30.0% holds the area')
  t(areaStatus(ex(9, 0), 'pass', Rl).status === 'pass', 'n = 9: extremity not measured, recorded, NOT a hold (no per-area minimum)')
  t(areaStatus(ex(12, 6), 'hold', Rl).status === 'held', 'options-only hold holds the area')
  t(areaStatus(ex(12, 6), 'not-measured', Rl).status === 'held', 'options-only not-measured holds the area')
  // control plan: same cell first, deficit from the same area one difficulty up, never another area
  const cp = controlPlan({ 'data/easy': 19, 'data/medium': 40 }, { 'data/easy': 14, 'data/medium': 49, 'data/hard': 3, 'geo/easy': 99 })
  t(!cp.short && cp.take.find(x => x.cell === 'data/easy' && x.from === 'data/medium')?.n === 5 && cp.take.find(x => x.cell === 'data/medium' && x.from === 'data/medium')?.n === 40, 'control: 5 data/easy drawn from data/medium after medium\'s own 40')
  const cp2 = controlPlan({ 'data/easy': 19, 'data/medium': 45 }, { 'data/easy': 14, 'data/medium': 49, 'geo/easy': 99 })
  t(cp2.short.includes('data/easy short by 1') && !cp2.take.some(x => x.from.startsWith('geo')), 'control: exhausted -> short (refuses), never another area')
  t(controlPlan({ 'oa/easy': 12 }, { 'oa/easy': 51 }).substituted.length === 0, 'control: a covered cell substitutes nothing')
  // freeze and screen-drop policy
  t(freezable({ O: 3, N: 40 }, Rl).O === true, 'an area keeping 3 still freezes (no minimum)')
  t(Object.keys(stage0Drops({ 'MV2-O56-01': 'x' }, { 'MV2-N7-02': ['S-R4 2 struck'] }, Rl)).join() === 'MV2-O56-01', 'pass-2 fail recorded, not dropped; withdrawal drops')
  // screen at its margins
  const it = { correct_answer: '14', choices: ['2', '5', '9', '14'] }
  const sOk = { my_answer: '14', n_struck: 1, struck: ['2'], key_identifiable_free: false, plugback_routine: false, one_sided: false, single_bound_kills_all: false, option_pair_tell: null }
  t(screenFails(it, sOk, Rl).length === 0, 'screen: one strike passes')
  t(screenFails(it, { ...sOk, n_struck: 2 }, Rl).some(x => x.startsWith('S-R4')), 'screen: two strikes fail')
  t(screenFails(it, { ...sOk, key_identifiable_free: true }, Rl).some(x => x.startsWith('S-R5')), 'screen: key identifiable fails')
  t(screenFails(it, { ...sOk, plugback_routine: true }, Rl).some(x => x.startsWith('S-R6')), 'screen: routine plug-back fails')
  t(screenFails(it, { ...sOk, option_pair_tell: '14 = 2 x 7' }, Rl).some(x => x.startsWith('S-R7')), 'screen: option pair fails')
  t(screenFails(it, { ...sOk, one_sided: true }, Rl).some(x => x.startsWith('S-R8')), 'screen: one-sided extreme key fails')
  t(screenFails(it, { ...sOk, single_bound_kills_all: true }, Rl).some(x => x.startsWith('S-R10')), 'screen: single bound on an extreme key fails')
  t(screenFails({ correct_answer: '5', choices: ['2', '5', '9', '14'] }, { ...sOk, my_answer: '5', one_sided: true, single_bound_kills_all: true }, Rl).length === 0, 'screen: one_sided / single bound ignored on an interior key')
  t(screenFails(it, { ...sOk, my_answer: '9' }, Rl).some(x => x.startsWith('S-KEY')), 'screen: wrong answer flags')
  t(screenFails(it, { ...sOk, plugback_routine: 'no' }, Rl)[0]?.startsWith('S-MALFORMED'), 'screen: string boolean is malformed, never a pass')
  t(screenFails(it, { ...sOk, n_struck: null }, Rl)[0]?.startsWith('S-MALFORMED'), 'screen: null n_struck is malformed, not zero')
  t(screenFails(it, undefined, Rl)[0]?.startsWith('S-MISSING'), 'screen: missing row never passes')
  // item rules
  const ok = { key_ok: true, exclusive: true, second_defensible: null, n_struck: 0, plugback_routine: false, one_sided: false, single_bound_kills_all: false, option_pair_tell: null, same_template_as: [], drop_recommend: false, grade_fit: 'fits', on_blueprint: true, distractors_weak: false, key_identifiable_free: false }
  const V = (a, b, F, E) => itemVerdict(it, a, b, F, E, Rl)
  t(V(ok, ok).keep, 'clean item kept')
  t(V({ ...ok, key_ok: false }, ok).drop.some(x => x.startsWith('R1')), 'R1 key disputed by one grader drops')
  t(V({ ...ok, exclusive: false }, { ...ok, second_defensible: '9' }).drop.some(x => x.startsWith('R2')), 'R2 exclusivity named by both drops')
  t(V({ ...ok, exclusive: false }, ok).need.some(x => x.startsWith('R2')), 'R2 exclusivity by one grader goes to F')
  t(V({ ...ok, exclusive: false }, ok, { ...ok, second_defensible: '9' }).drop.some(x => /R2.*F\)/.test(x)), 'R2 one + F names a second answer: drop')
  t(V({ ...ok, exclusive: false }, ok, { ...ok }).keep, 'R2 one + F exclusive: keep')
  t(V({ ...ok, n_struck: 2 }, { ...ok, n_struck: 3 }).drop.some(x => x.startsWith('R4')), 'R4 two free strikes by both drops')
  t(V({ ...ok, n_struck: 2 }, { ...ok, n_struck: 1 }).need.some(x => x.startsWith('R4')), 'R4 at the margin: 2 by one, 1 by the other -> F')
  t(V({ ...ok, n_struck: 2 }, ok, { ...ok, n_struck: 1 }).keep && V({ ...ok, n_struck: 2 }, ok, { ...ok, n_struck: 2 }).drop.length === 1, 'R4 one + F: F 1 keeps, F 2 drops')
  t(V({ ...ok, n_struck: 2 }, ok, { ...ok, n_struck: null }).drop.some(x => /tie/.test(x)), 'R4 one + F null n_struck: tie -> drop')
  t(V({ ...ok, key_identifiable_free: true }, { ...ok, key_identifiable_free: true }).drop.some(x => x.startsWith('R5')), 'R5 by both drops')
  t(V({ ...ok, key_identifiable_free: true }, ok).need.some(x => x.startsWith('R5')), 'R5 by one goes to F')
  t(V({ ...ok, distractors_weak: true }, { ...ok, distractors_weak: true }).drop.some(x => x.startsWith('R3')) && V({ ...ok, distractors_weak: true }, ok).keep, 'R3 needs both')
  t(V({ ...ok, plugback_routine: true }, { ...ok, plugback_routine: true }).drop.some(x => x.startsWith('R6')), 'R6 by both drops')
  t(V({ ...ok, one_sided: true }, ok).need.length === 1, 'R8 one grader without F: needs the tie-break')
  t(V({ ...ok, one_sided: true }, ok, { ...ok, one_sided: true }).drop.some(x => /F\)/.test(x)), 'R8 one grader + F yes: 2 of 3 drops')
  t(V({ ...ok, one_sided: true }, ok, { ...ok }).keep, 'R8 one grader + F no: keeps')
  t(V({ ...ok, one_sided: true }, ok, { ...ok, one_sided: 'yes' }).drop.some(x => /tie/.test(x)), 'F malformed: tie -> drop')
  t(V({ ...ok, one_sided: true }, ok, {}).drop.some(x => /tie/.test(x)), 'F row without the field: tie -> drop')
  t(itemVerdict({ correct_answer: '5', choices: ['2', '5', '9', '14'] }, { ...ok, one_sided: true }, { ...ok, one_sided: true }, undefined, new Set(), Rl).keep, 'one_sided ignored on an interior key')
  t(V({ ...ok, option_pair_tell: '14 = 2 x 7' }, { ...ok, option_pair_tell: '14 - 5' }).drop.some(x => x.startsWith('R7')), 'R7 by both drops')
  const E = new Set(['MV2-O56-01'])
  t(V({ ...ok, same_template_as: ['MV2-O56-01'] }, { ...ok, same_template_as: ['MV2-O56-01'] }, undefined, E).drop.some(x => x.startsWith('R11')), 'R11 template of an earlier item by both drops')
  t(V({ ...ok, same_template_as: ['MV2-O56-09'] }, ok, undefined, E).keep, 'template of a LATER item is not R11')
  t(V({ ...ok, drop_recommend: true }, ok).drop.some(x => x.startsWith('EXT-1')), 'EXT-1 drop_recommend by one grader drops')
  t(V({ ...ok, grade_fit: 'too_easy' }, { ...ok, grade_fit: 'too_easy' }).keep && V({ ...ok, grade_fit: 'too_easy' }, { ...ok, grade_fit: 'too_easy' }).rec.length === 1, 'grade fit too_easy by both: RECORDED, kept')
  t(V({ ...ok, on_blueprint: false }, { ...ok, on_blueprint: false }).hold.length === 1, 'off-blueprint by both holds')
  // cold integrity
  const s1 = { 'MV2-O56-01': Object.fromEntries(S1_FIELDS.map(f => [f, f === 'n_struck' ? 1 : null])) }
  const s2 = { 'MV2-O56-01': { ...s1['MV2-O56-01'], ...Object.fromEntries(S2_FIELDS.map(f => [f, null])) } }
  t(coldDiff(s1, s2, Rl).length === 0, 'coldcheck: unchanged copy passes')
  t(coldDiff(s1, { 'MV2-O56-01': { ...s2['MV2-O56-01'], n_struck: 0 } }, Rl).length === 1, 'coldcheck: a changed stage-1 field is caught')
  return c
}

const MUTATIONS = {
  'oo margin bar removed': { ooMargin: Infinity }, 'oo margin bar loosened to +11': { ooMargin: 11 },
  'oo unanimity bar removed': { ooUnan: Infinity }, 'oo margin ceiling check removed': { ooCeiling: false },
  'oo unanimity ceiling check removed': { unanCeiling: false }, 'empty arm allowed': { emptyArmRefuses: false },
  'extremity gate removed': { extremityGate: false }, 'n>=10 hold re-imposed': { smallNHolds: true },
  'R1 removed': { keyDisputeAnyDrops: false }, 'R2 both-drop removed': { exclBoth: false }, 'R2 one -> F removed': { exclOneTb: false },
  'R4/R5 both-drop removed': { freeBoth: false }, 'R4/R5 one -> F removed': { freeOneTb: false },
  'R6-R11 both-drop removed': { tbBoth: false }, 'R6-R11 one -> F removed': { tbOne: false }, 'tie -> keep': { tieDrops: false },
  'R3 removed': { r3Both: false }, 'EXT-1 removed': { extRecommendDrops: false }, 'off-blueprint hold removed': { offBlueprintHolds: false },
  'grade fit made a drop rule (v5)': { gradeFitDrops: true },
  'screen strikes bar at 3': { screenStrikeMin: 3 }, 'screen R5 removed': { screenKeyIdent: false }, 'screen R6 removed': { screenPlugback: false },
  'screen R7 removed': { screenPair: false }, 'screen R8 removed': { screenOneSided: false }, 'screen R10 removed': { screenSingleBound: false },
  'screen wrong-answer flag removed': { screenWrongAnswer: false }, 'screen malformed check removed': { screenMalformed: false },
  'pass-2 one-screener drop re-imposed (v5)': { screenP2Drops: true }, 'per-area freeze minimum 15 re-imposed (v5)': { areaFreezeMin: 15 },
  'coldcheck field compare removed': { coldCompare: false },
}

function selftest() {
  let bad = 0
  const base = cases(RULES)
  for (const [ok, msg] of base) if (!ok) { bad++; console.error('FAIL', msg) }
  // structure
  const sl = rd(SLOTS_FILE), slotIds = Object.values(sl).flatMap(v => v.rows.map(r => r.id))
  const st = [[slotIds.length === 221 && slotIds.every(id => ID_RE.test(id)), 'slots.json: 221 ids, all MV2-<area><cell>-NN'],
    [Object.keys(sl).sort().join() === [...AUTHORS].sort().join(), 'slots.json authors = the 11 cells'],
    [Object.entries(sl).every(([a, v]) => AREAS[a[0]].domain === v.area), 'each author cell is in its letter\'s area'],
    [chunk([...Array(221).keys()], SCREEN_PACKET_MAX).map(x => x.length).join() === '37,37,37,37,37,36', 'screen packets 221 -> 6 of 36-37'],
    [chunk([...Array(35).keys()], GRADE_PART_MAX).length === 1 && chunk([...Array(36).keys()], GRADE_PART_MAX).map(x => x.length).join() === '18,18', 'grade parts: 35 -> 1, 36 -> 18+18'],
    [(() => { try { return renderGraphic({ type: 'twowaytable', colLabels: ['a', 'b'], rowLabels: ['x'], cells: [['1', '2']] }).includes('| x | 1 | 2 |') } catch { return false } })(), 'graphic renders as a markdown table']]
  for (const [ok, msg] of st) if (!ok) { bad++; console.error('FAIL', msg) }
  const n = base.length + st.length
  if (bad) { console.error(`SELFTEST FAILED ${bad}/${n}`); process.exit(2) }
  // break-test: each rule reverted must fail at least one case
  let caught = 0; const missed = []
  for (const [name, m] of Object.entries(MUTATIONS)) {
    const failed = cases({ ...RULES, ...m }).filter(([ok]) => !ok).map(([, msg]) => msg)
    if (failed.length) { caught++; console.log(`  reverted: ${name.padEnd(44)} -> ${failed.length} case(s) fail, e.g. "${failed[0]}"`) } else missed.push(name)
  }
  if (missed.length) { console.error(`SELFTEST: ${missed.length} reverted rule(s) went undetected: ${missed.join('; ')}`); process.exit(2) }
  console.log(`selftest ${n}/${n} cases pass; ${caught}/${Object.keys(MUTATIONS).length} reverted rules each fail >= 1 case`)
}

/* ------------------------------------------------------------------ commands */
async function cmdAssemble() {
  const sl = rd(SLOTS_FILE)
  const slot = Object.fromEntries(Object.entries(sl).flatMap(([a, v]) => v.rows.map(r => [r.id, { ...r, author: a, domain: v.area }])))
  const files = AUTHORS.map(a => `${AUTHORED}/${a}/items.json`)
  const items = []
  for (const [i, f] of files.entries()) {
    const j = rd(f); if (!Array.isArray(j) || !j.length) die(`${f}: not a non-empty array`)
    for (const it of j) {
      const s = slot[it.id]; if (!s) die(`${it.id} (${f}) is not a slot`)
      if (s.author !== AUTHORS[i]) die(`${it.id} is ${s.author}'s slot but sits in ${AUTHORS[i]}'s file`)
      if (it.domain !== s.domain) die(`${it.id}: domain '${it.domain}' != slot area '${s.domain}'`)
      areaOfItem(it); items.push(it)
    }
  }
  if (new Set(items.map(i => i.id)).size !== items.length) die('duplicate ids across files')
  const missing = Object.keys(slot).filter(id => !items.find(i => i.id === id))
  console.log(`items read ${items.length} of ${Object.keys(slot).length} slots; empty slots: ${missing.join(' ') || 'none'}`)
  const checked = await checkAll(files, 'assemble')
  if (checked !== items.length) die(`math-check read ${checked} items, files hold ${items.length}`)
  // batch-level (read) lines: cross-author near-duplicates and repeated key values
  const bag = s => new Set(String(s ?? '').toLowerCase().replace(/\d+(\.\d+)?/g, ' # ').replace(/[^a-z#]+/g, ' ').trim().split(/\s+/).filter(w => w === '#' || w.length > 2))
  const dups = []
  for (let i = 0; i < items.length; i++) for (let k = i + 1; k < items.length; k++) { const j = jac(bag(items[i].prompt), bag(items[k].prompt)); if (j >= 0.6) dups.push(`${items[i].id} ~ ${items[k].id} j=${j.toFixed(2)}`) }
  for (const d of dups) console.log(`  (read) within-batch near-dup ${d}`)
  const keys = {}; for (const it of items) (keys[`${areaOfItem(it)} ${val(it.correct_answer)}`] ??= []).push(it.id)
  const rep = Object.entries(keys).filter(([, v]) => v.length > 1)
  console.log(`  (read) key values repeated within an area: ${rep.length}${rep.length ? ' - ' + rep.map(([k, v]) => `${k}: ${v.join(',')}`).join('; ') : ''}`)
  mkdirSync(WORK, { recursive: true })
  const order = Object.keys(slot)
  const sorted = order.map(id => items.find(i => i.id === id)).filter(Boolean)
  wj(WORK + '/assembled.json', sorted)
  for (const L of Object.keys(AREAS)) {
    const a = sorted.filter(i => areaOfItem(i) === L), v = keyExtremityVerdict(a)
    const g = {}; for (const it of a) g[it.grade_target] = (g[it.grade_target] ?? 0) + 1
    console.log(`  ${L} ${AREAS[L].domain.padEnd(34)} n ${String(a.length).padStart(3)}  by grade ${JSON.stringify(g)}  key extremity ${v.status} ${Number.isFinite(v.rate) ? f1(100 * v.rate) + '%' : ''}  graphics ${a.filter(i => i.graphic).length}`)
  }
  console.log(`ASSEMBLED ${sorted.length} -> ${WORK}/assembled.json sha ${sha(WORK + '/assembled.json').slice(0, 16)}; within-batch near-dups ${dups.length} (read)`)
}

async function db() {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync(ROOT + '/.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}
async function iseePool() {
  const c = await db(), rows = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await c.from('study_item_bank').select('id,cohort,difficulty,subskill,item').eq('family', 'isee').eq('section', 'math').eq('verified', true).eq('archived', false).order('id').range(f, f + 999)
    if (error) die(error.message); rows.push(...data); if (data.length < 1000) break
  }
  const { count, error: ce } = await c.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('family', 'isee').eq('section', 'math').eq('verified', true).eq('archived', false)
  if (ce || count !== rows.length) die(`paging read ${rows.length} rows, server count ${count} (${ce?.message ?? ''})`)
  if (!rows.length || new Set(rows.map(r => r.id)).size !== rows.length) die('empty or slipped paging')
  const pool = {}
  for (const r of rows) {
    const ch = (r.item?.choices ?? []).map(String)
    if (ch.length !== 4 || !ch.includes(String(r.item?.correct_answer ?? ''))) continue
    if (scoreItem(ch, String(r.item.correct_answer)).skip) continue
    if (!['easy', 'medium', 'hard'].includes(r.difficulty)) continue
    ;(pool[`${iseeArea(r.subskill ?? '')}/${r.difficulty}`] ??= []).push(r)
  }
  return { rows: rows.length, pool }
}
const tierDiff = it => it.tier === 'low' ? 'easy' : 'medium'   // v1-v5's matching: low -> easy, mid/high -> medium
/**
 * 1:1 control plan. Each candidate cell <area>/<easy|medium> draws from the same live ISEE cell; a cell that is
 * short takes ALL of it and the deficit from the SAME AREA's next difficulty up (easy -> medium -> hard,
 * medium -> hard), after that cell's own need is met. Pre-registered (MAP-MATH-V2.prereg.md); printed and recorded.
 */
export function controlPlan(need, avail) {
  const left = { ...avail }, take = [], substituted = []
  const order = Object.keys(need).sort((a, b) => (a.endsWith('/medium') ? 0 : 1) - (b.endsWith('/medium') ? 0 : 1) || a.localeCompare(b))   // own cells first: medium, then easy
  const own = {}
  for (const cell of Object.keys(need)) { const n = Math.min(need[cell], left[cell] ?? 0); own[cell] = n; left[cell] = (left[cell] ?? 0) - n; if (n) take.push({ cell, from: cell, n }) }
  let short = ''
  for (const cell of order) {
    let def = need[cell] - own[cell]; if (!def) continue
    const [area, diff] = cell.split('/')
    for (const up of (diff === 'easy' ? ['medium', 'hard'] : ['hard'])) {
      const from = `${area}/${up}`, n = Math.min(def, left[from] ?? 0)
      if (n) { take.push({ cell, from, n }); left[from] -= n; def -= n; substituted.push(`${cell}: ${n} drawn from ${from}`) }
      if (!def) break
    }
    if (def) short += `${cell} short by ${def}; `
  }
  return { take, substituted, short }
}

async function cmdOoPool() {
  const items = rd(existsSync(WORK + '/assembled.post-return.json') ? WORK + '/assembled.post-return.json' : WORK + '/assembled.json')
  const { rows, pool } = await iseePool()
  const need = {}; for (const it of items) { const k = `${it.map_area}/${tierDiff(it)}`; need[k] = (need[k] ?? 0) + 1 }
  console.log(`live isee/math ${rows}; per area/difficulty: eligible vs needed at most (all assembled kept)`)
  let short = 0
  for (const k of [...new Set([...Object.keys(need), ...Object.keys(pool)])].sort()) { const e = pool[k]?.length ?? 0, n = need[k] ?? 0; if (n > e) short++; console.log(`  ${k.padEnd(12)} eligible ${String(e).padStart(4)}  need <= ${String(n).padStart(3)}${n > e ? '  SHORT' : ''}`) }
  const plan = controlPlan(need, Object.fromEntries(Object.entries(pool).map(([k, v]) => [k, v.length])))
  console.log(`own-cell shortfalls ${short}; pre-registered substitution at the maximum need: ${plan.substituted.join('; ') || 'none needed'}${plan.short ? '; STILL SHORT: ' + plan.short : ''}`)
}

function cmdScreenRender(pass) {
  if (!['1', '2'].includes(pass)) die('screen-render <1|2>')
  const all = rd(WORK + '/assembled.json')
  let items, base
  if (pass === '1') {
    if (existsSync(WORK + '/screen/p1.manifest.json')) die('pass-1 packets already rendered (screen/p1.manifest.json); rendered once')
    items = shuffleWith(all.slice(), rng(SEED.screen1Order)); base = all
  } else {
    if (existsSync(WORK + '/screen/p2.manifest.json')) die('pass-2 packets already rendered')
    const p1 = rd(WORK + '/screen-p1.json'), fails = Object.keys(p1.fails)
    if (!fails.length) die('no item failed pass 1; there is no pass 2')
    const rdir = WORK + '/returns'
    const withdrawn = existsSync(rdir + '/withdrawn.json') ? rd(rdir + '/withdrawn.json') : {}
    const stand = existsSync(rdir + '/stand.json') ? rd(rdir + '/stand.json') : {}
    const revised = {}, unacc = []
    for (const id of fails) {
      const p = `${rdir}/${id}.json`, n = [existsSync(p), id in withdrawn, id in stand].filter(Boolean).length
      if (n !== 1) { unacc.push(`${id} (${n ? 'accounted ' + n + ' times' : 'unaccounted'})`); continue }
      if (existsSync(p)) { const r = rd(p); if (r.id !== id) die(`${p}: id ${r.id}`); revised[id] = r }
    }
    if (unacc.length) die(`every pass-1 fail needs exactly one of returns/<id>.json, withdrawn.json, stand.json: ${unacc.join(' ')}`)
    for (const id of [...Object.keys(withdrawn), ...Object.keys(stand)]) if (!fails.includes(id)) die(`${id} is in withdrawn/stand but did not fail pass 1`)
    base = all.filter(i => !(i.id in withdrawn)).map(i => revised[i.id] ?? i)
    items = shuffleWith(Object.values(revised), rng(SEED.screen2Order))
    console.log(`pass-1 fails ${fails.length}: revised ${items.length}, withdrawn ${Object.keys(withdrawn).length}, stand ${Object.keys(stand).length}`)
    if (!items.length) { wj(WORK + '/assembled.post-return.json', base); console.log('no revised item to re-screen; assembled.post-return.json written; no pass 2'); return }
    return checkRevisedThenRender(items, base)
  }
  renderPackets('p1', items, SEED.screen1Deal, base)
}
async function checkRevisedThenRender(items, base) {
  mkdirSync(WORK + '/tmp', { recursive: true })
  const by = {}; for (const it of items) (by[it.id.split('-')[1]] ??= []).push(it)
  const files = Object.entries(by).map(([a, xs]) => { const p = `${WORK}/tmp/revised-${a}.json`; wj(p, xs); return p })
  await checkAll(files, 'revised items')
  wj(WORK + '/assembled.post-return.json', base)
  renderPackets('p2', items, SEED.screen2Deal, base)
}
function renderPackets(pass, items, dealSeed, base) {
  const rand = rng(dealSeed), manifest = {}, letters = {}
  const packets = chunk(items, SCREEN_PACKET_MAX)
  packets.forEach((part, pi) => {
    const name = `${pass}-${'abcdefghijklmnopqrstuvwxyz'[pi]}`, dir = `${WORK}/screen/${name}`
    mkdirSync(dir, { recursive: true })
    let md = `# Items for screening (${part.length})\n\nEach item: id, area, target grade and tier, the question, four options. The correct answer is NOT marked.\n`
    part.forEach((it, i) => { const d = dealOptions(it, i, rand); letters[it.id] = { packet: name, letter: d.letter, choices: d.opts }; md += coldBlock(it, d.opts) })
    writeFileSync(`${dir}/screen.md`, md)
    manifest[name] = { dir, n: part.length, ids: part.map(i => i.id), sha: sha(`${dir}/screen.md`) }
    const deal = {}; for (const it of part) deal[letters[it.id].letter] = (deal[letters[it.id].letter] ?? 0) + 1
    const ar = {}; for (const it of part) ar[it.map_area] = (ar[it.map_area] ?? 0) + 1
    console.log(`${dir}/screen.md  ${part.length} items  areas ${JSON.stringify(ar)}  key letters ${JSON.stringify(deal)}  sha ${manifest[name].sha.slice(0, 16)}`)
  })
  wj(`${WORK}/screen/${pass}.manifest.json`, { seedDeal: dealSeed, baseSha: createHash('sha256').update(JSON.stringify(base)).digest('hex'), packets: manifest })
  wj(`${WORK}/screen/${pass}.key.json`, letters)
  console.log(`${pass}: ${items.length} items in ${packets.length} packet(s)`)
}

function cmdScreenScore(pass) {
  if (!['1', '2'].includes(pass)) die('screen-score <1|2>')
  const man = rd(`${WORK}/screen/p${pass}.manifest.json`)
  const src = pass === '1' ? rd(WORK + '/assembled.json') : rd(WORK + '/assembled.post-return.json')
  const all = Object.fromEntries(src.map(i => [i.id, i]))
  const rows = {}; let want = 0
  for (const [nm, p] of Object.entries(man.packets)) {
    if (sha(`${p.dir}/screen.md`) !== p.sha) die(`${nm}/screen.md changed since render`)
    const j = rd(`${p.dir}/screen.json`)
    const got = p.ids.filter(id => j[id]).length
    console.log(`  ${nm}: rows ${got} of ${p.n}`)
    for (const id of p.ids) { want++; rows[id] = j[id] ?? null }
  }
  if (!want) die('no screened ids')
  const fails = {}
  for (const [id, s] of Object.entries(rows)) { if (!all[id]) die(`${id} not in the item set`); const f = screenFails(all[id], s); if (f.length) fails[id] = f }
  for (const [id, f] of Object.entries(fails)) console.log(`  ${id}  ${f.join(' | ')}`)
  const byArea = {}; for (const id of Object.keys(rows)) { const L = ID_RE.exec(id)[1]; byArea[L] ??= [0, 0]; byArea[L][0]++; if (fails[id]) byArea[L][1]++ }
  console.log(`  by area (fail / screened): ${Object.entries(byArea).map(([L, [n, f]]) => `${L} ${f}/${n}`).join('  ')}`)
  console.log(`screen pass ${pass}: ${want} screened, ${Object.keys(fails).length} fail`)
  wj(`${WORK}/screen-p${pass}.json`, { screened: want, fails })
  if (pass === '1') {
    mkdirSync(WORK + '/returns', { recursive: true })
    const sl = rd(SLOTS_FILE), author = Object.fromEntries(Object.entries(sl).flatMap(([a, v]) => v.rows.map(r => [r.id, a])))
    const per = {}; for (const [id, f] of Object.entries(fails)) (per[author[id]] ??= {})[id] = f
    for (const [a, x] of Object.entries(per)) wj(`${WORK}/returns/needed-${a}.json`, x)
    console.log(`returns needed: ${Object.entries(per).map(([a, x]) => `${a} ${Object.keys(x).length}`).join(', ') || 'none'} -> ${WORK}/returns/needed-<author>.json`)
  } else console.log('pass-2 fails are RECORDED (carried to each area\'s score record), not dropped: the screen never drops on one screener')
}

async function cmdFreeze() {
  if (!existsSync(WORK + '/screen-p1.json')) die('the screen has not run (screen-p1.json missing)')
  const p1 = rd(WORK + '/screen-p1.json'), nf = Object.keys(p1.fails).length
  if (Object.keys(AREAS).some(L => existsSync(areaDir(L) + 'batch.json'))) die('an area batch is already frozen; freeze runs once')
  let items
  const withdrawn = existsSync(WORK + '/returns/withdrawn.json') ? rd(WORK + '/returns/withdrawn.json') : {}
  let p2 = { fails: {} }
  if (nf) {
    items = rd(WORK + '/assembled.post-return.json')
    const revised = Object.keys(p1.fails).filter(id => existsSync(`${WORK}/returns/${id}.json`))
    if (revised.length) { if (!existsSync(WORK + '/screen-p2.json')) die(`${revised.length} revised item(s) and pass 2 has not been scored`); p2 = rd(WORK + '/screen-p2.json') }
  } else items = rd(WORK + '/assembled.json')
  const drops = stage0Drops(withdrawn, p2.fails)
  const kept = items.filter(i => !drops[i.id])
  mkdirSync(WORK + '/tmp', { recursive: true })
  const by = {}; for (const it of kept) (by[it.id.split('-')[1]] ??= []).push(it)
  const files = Object.entries(by).map(([a, xs]) => { const p = `${WORK}/tmp/freeze-${a}.json`; wj(p, xs); return p })
  const n = await checkAll(files, 'freeze')
  if (n !== kept.length) die(`math-check read ${n}, kept ${kept.length}`)
  const counts = Object.fromEntries(Object.keys(AREAS).map(L => [L, kept.filter(i => areaOfItem(i) === L).length]))
  const fz = freezable(counts)
  for (const L of Object.keys(AREAS)) {
    if (!fz[L]) { console.log(`  ${L} keeps ${counts[L]}: nothing to freeze`); continue }
    const a = kept.filter(i => areaOfItem(i) === L)
    const order = shuffleWith(a.map(i => i.id), rng(SEED.freeze[L]))
    const frozen = order.map(id => a.find(i => i.id === id))
    mkdirSync(areaDir(L), { recursive: true })
    wj(areaDir(L) + 'batch.json', frozen)
    const flags = {}; for (const it of a) { const f1x = p1.fails[it.id], f2x = p2.fails[it.id]; if (f1x || f2x) flags[it.id] = { p1: f1x ?? null, revised: existsSync(`${WORK}/returns/${it.id}.json`), p2: f2x ?? null } }
    wj(areaDir(L) + 'screen-flags.json', flags)
    const v = keyExtremityVerdict(frozen)
    console.log(`FROZEN ${L} ${AREAS[L].key.padEnd(4)} ${frozen.length} -> ${areaDir(L)}batch.json sha256 ${sha(areaDir(L) + 'batch.json')}  extremity ${v.status} (${v.reason})  screen-flagged ${Object.keys(flags).length}`)
  }
  mkdirSync(R, { recursive: true })
  wj(R + 'stage0-drops.json', drops)
  for (const f of ['screen-p1.json', 'screen-p2.json']) if (existsSync(`${WORK}/${f}`)) copyFileSync(`${WORK}/${f}`, R + f)
  console.log(`stage-0 drops (withdrawn): ${Object.keys(drops).join(' ') || 'none'}`)
}

async function cmdOo(a) {
  const areas = areaArg(a)
  for (const L of areas) if (existsSync(`${WORK}/oo/${L}/oo.blind.json`)) die(`options-only render for ${L} already exists; made once`)
  const { rows, pool } = await iseePool()
  console.log(`live isee/math ${rows}; eligible by area/difficulty: ${JSON.stringify(Object.fromEntries(Object.entries(pool).map(([k, v]) => [k, v.length])))}`)
  for (const L of areas) {
    const frozen = rd(areaDir(L) + 'batch.json')
    const rand = rng(SEED.oo[L]), shuffle = x => shuffleWith(x.slice(), rand)
    const need = {}; for (const it of frozen) { const k = `${it.map_area}/${tierDiff(it)}`; need[k] = (need[k] ?? 0) + 1 }
    const plan = controlPlan(need, Object.fromEntries(Object.entries(pool).map(([k, v]) => [k, v.length])))
    if (plan.short) die(`${L}: control short: ${plan.short} (pre-registered substitution exhausted; no other fallback)`)
    const control = [], used = new Set()
    for (const { cell, from, n } of plan.take) { const p = shuffle((pool[from] ?? []).filter(r => !used.has(r.id))).slice(0, n); for (const r of p) used.add(r.id); control.push(...p.map(r => ({ r, k: cell, from }))) }
    if (plan.substituted.length) console.log(`  ${L}: PRE-REGISTERED SUBSTITUTION (recorded in oo.key.json): ${plan.substituted.join('; ')}`)
    const SL = ['A', 'B', 'C', 'D'], entries = []
    const deal = (choices, key, i) => { const ch = choices.map(x => String(x).replace(/−/g, '-')); const ci = ch.indexOf(String(key).replace(/−/g, '-')); const want = SL[i % 4]; const rest = shuffle(ch.filter((_, j) => j !== ci)); let q = 0; return { want, options: Object.fromEntries(SL.map(s => [s, s === want ? ch[ci] : rest[q++]])) } }
    frozen.forEach((it, i) => { const d = deal(it.choices, it.correct_answer, i); entries.push({ blind: { options: d.options }, key: { letter: d.want, localId: it.id, cell: `${it.map_area}/${tierDiff(it)}`, kind: 'candidate' } }) })
    control.forEach(({ r, k, from }, i) => { const d = deal(r.item.choices, r.item.correct_answer, i); entries.push({ blind: { options: d.options }, key: { letter: d.want, localId: r.id, cohort: r.cohort, cell: k, drawnFrom: from, kind: 'live-control' } }) })
    const order = shuffle(entries), blind = {}, key = {}
    order.forEach((e, i) => { const id = `${L}${String(i + 1).padStart(3, '0')}`; blind[id] = e.blind; key[id] = e.key })
    mkdirSync(`${WORK}/oo/${L}`, { recursive: true }); mkdirSync(areaDir(L), { recursive: true })
    wj(`${WORK}/oo/${L}/oo.blind.json`, blind); copyFileSync(`${WORK}/oo/${L}/oo.blind.json`, areaDir(L) + 'oo.blind.json'); wj(areaDir(L) + 'oo.key.json', key)
    for (const kind of ['candidate', 'live-control']) { const d = {}; for (const k of Object.values(key)) if (k.kind === kind) d[k.letter] = (d[k.letter] ?? 0) + 1; console.log(`  ${L} ${kind.padEnd(13)} n ${Object.values(key).filter(k => k.kind === kind).length} deal ${JSON.stringify(d)}`) }
    console.log(`  ${L}: ${WORK}/oo/${L}/oo.blind.json  ${Object.keys(blind).length} ids  sha ${sha(`${WORK}/oo/${L}/oo.blind.json`).slice(0, 16)}`)
  }
}

function cmdGrade(a) {
  for (const L of areaArg(a)) {
    const frozen = rd(areaDir(L) + 'batch.json'), parts = chunk(frozen, GRADE_PART_MAX)
    if (existsSync(areaDir(L) + 'ws-p1.md')) die(`${L}: with-source renders already exist; made once`)
    parts.forEach((part, pi) => {
      const k = pi + 1, rand = rng(SEED.grade[L] + k)
      let md = `# Items for review (${part.length})\n\nEach item: id, area, target grade and target tier, the question, four options. The correct answer is NOT marked.\n`
      let kd = `# Items for review, KEYED (${part.length})\n\nThe same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.\n`
      const keyj = {}
      part.forEach((it, i) => {
        const d = dealOptions(it, i, rand), opts = d.opts
        keyj[it.id] = { letter: d.letter, choices: opts }
        const head = coldBlock(it, opts); md += head
        kd += head + `\nKEY: ${d.letter} (${it.correct_answer})\n\nWorked solution: ${it.explanation}\n\nKey computation (JS): \`${it.solve}\`\n\nDistractors:\n${opts.filter(o => o !== String(it.correct_answer)).map(o => `- ${'ABCD'[opts.indexOf(o)]} (${o}): ${it.distractor_meta?.[o]?.why ?? ''} | computation: \`${it.distractor_solve?.[o] ?? ''}\``).join('\n')}\n`
      })
      writeFileSync(areaDir(L) + `ws-p${k}.md`, md); writeFileSync(areaDir(L) + `ws-p${k}.keyed.md`, kd); wj(areaDir(L) + `ws-p${k}.key.json`, keyj)
      const slots = Object.values(keyj).reduce((m, x) => (m[x.letter] = (m[x.letter] ?? 0) + 1, m), {})
      console.log(`  ${L} p${k}: ${part.length} items, key letters ${JSON.stringify(slots)}, cold sha ${sha(areaDir(L) + `ws-p${k}.md`).slice(0, 16)}`)
    })
    wj(areaDir(L) + 'ws.parts.json', parts.map((p, i) => ({ part: i + 1, ids: p.map(x => x.id) })))
  }
}

const partsOf = L => rd(areaDir(L) + 'ws.parts.json').map(p => p.part)
function cmdStage(L, k, g, which) {
  if (!AREAS[L] || !partsOf(L).includes(+k) || !['d', 'e'].includes(g) || !['cold', 'keyed'].includes(which)) die('stage <O|N|G|D> <part> <d|e> <cold|keyed>')
  const tag = `${L}-p${k}-${g}`, dir = `${WORK}/grade/${tag}`; mkdirSync(dir, { recursive: true })
  if (which === 'cold') { copyFileSync(areaDir(L) + `ws-p${k}.md`, `${dir}/grade.md`); console.log(`${dir}/grade.md  sha ${sha(dir + '/grade.md').slice(0, 16)}`); return }
  const s1 = `${dir}/stage1.json`, j = rd(s1)
  const want = Object.keys(rd(areaDir(L) + `ws-p${k}.key.json`))
  const miss = want.filter(id => !j[id] || S1_FIELDS.some(f => !(f in j[id])))
  if (miss.length) die(`stage1 incomplete for ${miss.length}: ${miss.slice(0, 6).join(' ')}`)
  mkdirSync(WORK + '/snap', { recursive: true })
  const snap = `${WORK}/snap/${tag}.stage1.json`; copyFileSync(s1, snap); chmodSync(snap, 0o444); chmodSync(s1, 0o444)
  const shas = existsSync(WORK + '/coldshas.json') ? rd(WORK + '/coldshas.json') : {}
  shas[tag] = sha(snap); wj(WORK + '/coldshas.json', shas)
  copyFileSync(areaDir(L) + `ws-p${k}.keyed.md`, `${dir}/keyed.md`)
  console.log(`snapshot ${snap} sha ${shas[tag].slice(0, 16)}; keyed.md released into ${dir}`)
}

function loadGrader(tag) {
  const snapP = `${WORK}/snap/${tag}.stage1.json`
  return { s1: rd(snapP), s2: rd(`${WORK}/grade/${tag}/stage2.json`), snapSha: sha(snapP) }
}
function cmdColdcheck(L) {
  if (!AREAS[L]) die('coldcheck <O|N|G|D>')
  const shas = rd(WORK + '/coldshas.json'); let rows = 0, changed = 0
  for (const k of partsOf(L)) for (const g of ['d', 'e']) {
    const tag = `${L}-p${k}-${g}`, { s1, s2, snapSha } = loadGrader(tag)
    if (snapSha !== shas[tag]) die(`${tag} stage1 snapshot hash changed`)
    if (sha(`${WORK}/grade/${tag}/stage1.json`) !== snapSha) { console.log(`  ${tag} stage1.json in the folder differs from the snapshot`); changed++ }
    rows += Object.keys(s1).filter(x => ID_RE.test(x)).length
    for (const p of coldDiff(s1, s2)) { console.log(`  ${tag} ${p}`); changed++ }
  }
  console.log(`coldcheck ${L}: ${rows} cold rows, ${changed} changed or missing`); if (!rows) process.exit(2); process.exit(changed ? 1 : 0)
}

function scoreOo(L) {
  const key = rd(areaDir(L) + 'oo.key.json'), ids = Object.keys(key)
  const sol = ['a', 'b', 'c'].map(x => { const j = rd(`${WORK}/oo/${L}/solver-${x}.json`); const m = j.items ?? j; const got = ids.filter(i => m[i]?.pick).length; if (got !== ids.length) die(`${L} solver ${x} answered ${got} of ${ids.length}`); return m })
  const arm = kind => { const s = ids.filter(i => key[i].kind === kind); let hits = 0, unan = 0; for (const i of s) { const h = sol.filter(m => String(m[i].pick).trim().toUpperCase() === key[i].letter).length; hits += h; if (h === 3) unan++ } return { n: s.length, picks: 3 * s.length, hits, unan } }
  const c = arm('candidate'), k = arm('live-control')
  const dist = {}; for (const i of ids) dist[key[i].letter] = (dist[key[i].letter] ?? 0) + 1
  return { cand: c, ctrl: k, ...ooVerdict(c, k), letterControl: pct(Math.max(...Object.values(dist)), ids.length) }
}
function loadF(L) {
  const kp = areaDir(L) + 'tb.key.json'
  if (!existsSync(kp)) return null
  const p = `${WORK}/grade/${L}-f-tb/stage1.json`
  if (!existsSync(p)) die('tie-break render exists but grader F has not written stage1.json')
  return { key: rd(kp), rows: rd(p) }
}

function cmdScore(L) {
  if (!AREAS[L]) die('score <O|N|G|D>')
  const FZ = areaDir(L) + 'batch.json', frozen = rd(FZ)
  const out = { prereg: PREREG, area: AREAS[L].domain, frozenSha: sha(FZ), n: frozen.length }
  const oo = scoreOo(L); out.optionsOnly = oo
  console.log(`OPTIONS-ONLY ${L} (three samples of one solver; letter control ${f1(oo.letterControl)}%): cand ${oo.cand.hits}/${oo.cand.picks} ctrl ${oo.ctrl.hits}/${oo.ctrl.picks}  ${oo.status.toUpperCase()}  ${oo.why}`)
  const G = { d: {}, e: {} }
  for (const k of partsOf(L)) for (const g of ['d', 'e']) { const { s2 } = loadGrader(`${L}-p${k}-${g}`); for (const [id, row] of Object.entries(s2)) if (ID_RE.test(id)) G[g][id] = row }
  const missing = frozen.filter(i => !G.d[i.id] || !G.e[i.id]).map(i => i.id); if (missing.length) die(`grader rows missing for ${missing.join(' ')}`)
  const diff = difficultyBars(frozen.map(it => ({ tier: it.tier, grade: it.grade_target, a: G.d[it.id], b: G.e[it.id] })))
  out.gradeFitRecorded = diff
  console.log(`GRADE FIT (recorded, not a bar): too_easy ${diff.tooEasy} = ${f1(diff.tooEasyPct)}%, too_hard ${diff.tooHard} = ${f1(diff.tooHardPct)}% of ${diff.judgments}; offset d ${diff.offA?.toFixed(2)} e ${diff.offB?.toFixed(2)}; tier spread d ${diff.spreadA?.toFixed(2)} e ${diff.spreadB?.toFixed(2)}${diff.status === 'no-measurement' ? ' (no measurement: ' + diff.why + ')' : ''}`)
  out.coldOnKey = frozen.reduce((s, it) => s + ['d', 'e'].filter(g => val(G[g][it.id].my_answer) === val(it.correct_answer) || String(G[g][it.id].my_answer).trim() === String(it.correct_answer)).length, 0)
  const F = loadF(L), items = {}, needs = []
  frozen.forEach((it, i) => {
    const earlier = new Set(frozen.slice(0, i).map(x => x.id))
    const inTb = F && F.key.items?.[it.id]
    const v = itemVerdict(it, G.d[it.id], G.e[it.id], inTb ? (F.rows[it.id] ?? {}) : undefined, earlier)
    items[it.id] = { ...v, difficulty: bankedDifficulty(G.d[it.id], G.e[it.id]) }
    if (v.need.length && !v.drop.length && !v.hold.length) needs.push({ id: it.id, codes: v.need, named: v.named })
    else if (v.need.length) items[it.id].need = []
    items[it.id].keep = !items[it.id].drop.length && !items[it.id].hold.length && !items[it.id].need.length
  })
  out.items = items
  if (needs.length) {
    if (F) die(`tie-break already ran but ${needs.length} item(s) still need it: ${needs.map(n => n.id).join(' ')}`)
    wj(`${WORK}/tb-needs-${L}.json`, needs)
    console.log(`TIE-BREAK NEEDED ${L} (${needs.length}): ${needs.map(n => `${n.id} [${n.codes.join(', ')}]`).join('; ')}\n  run: map-math-v2.mjs tiebreak ${L}`)
    wj(areaDir(L) + 'stages.json', { ...out, verdict: 'INCOMPLETE' }); process.exit(1)
  }
  const kept = frozen.filter(i => items[i.id].keep)
  const as = areaStatus(kept, oo.status); out.areaResult = { ...as, kept: kept.length, keptIds: kept.map(i => i.id) }
  const flags = existsSync(areaDir(L) + 'screen-flags.json') ? rd(areaDir(L) + 'screen-flags.json') : {}
  out.screenFlagsRecorded = Object.fromEntries(Object.entries(flags).map(([id, f]) => [id, { ...f, kept: items[id]?.keep ?? null }]))
  for (const it of frozen.filter(i => !items[i.id].keep)) console.log(`  DROP/HOLD ${it.id} g${it.grade_target} ${it.tier}: ${[...items[it.id].drop, ...items[it.id].hold].join('; ')}`)
  for (const it of frozen) if (items[it.id].rec.length) console.log(`  (recorded) ${it.id}: ${items[it.id].rec.join('; ')}`)
  const sf = Object.entries(out.screenFlagsRecorded); if (sf.length) console.log(`  screen-flagged items: ${sf.length}, kept by the graders ${sf.filter(([, f]) => f.kept).length}${sf.filter(([, f]) => f.p2).length ? `; still failing pass 2: ${sf.filter(([, f]) => f.p2).map(([id, f]) => id + (f.kept ? ' (kept)' : '')).join(' ')}` : ''}`)
  console.log(`AREA ${L} ${AREAS[L].key} frozen ${frozen.length} kept ${kept.length}  extremity ${as.extremity.status} (${as.extremity.reason})  oo ${oo.status}  => ${as.status.toUpperCase()}${as.reasons.length ? ' - ' + as.reasons.join('; ') : ''}${as.notes.length ? ' | ' + as.notes.join('; ') : ''}`)
  out.passIds = as.status === 'pass' ? kept.map(i => i.id) : []
  out.verdict = out.passIds.length ? 'PASS' : 'HELD'
  console.log(`cold answers on key ${out.coldOnKey}/${2 * frozen.length}; VERDICT ${out.verdict}; insertable ${out.passIds.length} (cohort ${AREAS[L].cohort})`)
  wj(areaDir(L) + 'stages.json', out)
}

function cmdTiebreak(L) {
  if (!AREAS[L]) die('tiebreak <O|N|G|D>')
  const needs = rd(`${WORK}/tb-needs-${L}.json`); if (!needs.length) die('no tie-break needs')
  if (existsSync(areaDir(L) + 'tb.key.json')) die('tie-break render already exists; it is made once')
  const frozen = rd(areaDir(L) + 'batch.json')
  const keys = Object.assign({}, ...partsOf(L).map(k => rd(areaDir(L) + `ws-p${k}.key.json`)))
  const ids = new Set(needs.map(n => n.id)); for (const n of needs) if (n.codes.some(c => c.startsWith('R11'))) for (const x of n.named) ids.add(x)
  const part = frozen.filter(i => ids.has(i.id))
  let md = `# Items for review (${part.length})\n\nEach item: id, area, target grade and target tier, the question, four options. The correct answer is NOT marked.\n`
  for (const it of part) md += coldBlock(it, keys[it.id].choices)
  writeFileSync(areaDir(L) + 'tb.md', md)
  wj(areaDir(L) + 'tb.key.json', { items: Object.fromEntries(needs.map(n => [n.id, n.codes])), context: [...ids].filter(x => !needs.find(n => n.id === x)) })
  const dir = `${WORK}/grade/${L}-f-tb`; mkdirSync(dir, { recursive: true }); copyFileSync(areaDir(L) + 'tb.md', dir + '/grade.md')
  console.log(`tie-break render ${L}: ${part.length} items (${needs.length} flagged) -> ${dir}/grade.md, sha ${sha(dir + '/grade.md').slice(0, 16)}`)
}

const cmd = process.argv[2]
const isMain = import.meta.url === `file://${process.argv[1]}`
async function main() {
  const a = process.argv.slice(3)
  if (cmd === '--selftest') return selftest()
  if (cmd === 'assemble') return cmdAssemble()
  if (cmd === 'oo-pool') return cmdOoPool()
  if (cmd === 'screen-render') return cmdScreenRender(a[0])
  if (cmd === 'screen-score') return cmdScreenScore(a[0])
  if (cmd === 'freeze') return cmdFreeze()
  if (cmd === 'oo') return cmdOo(a[0])
  if (cmd === 'grade') return cmdGrade(a[0])
  if (cmd === 'stage') return cmdStage(a[0], a[1], a[2], a[3])
  if (cmd === 'coldcheck') return cmdColdcheck(a[0])
  if (cmd === 'score') return cmdScore(a[0])
  if (cmd === 'tiebreak') return cmdTiebreak(a[0])
  die('usage: see the header of map-math-v2.mjs')
}
if (isMain) await main()
