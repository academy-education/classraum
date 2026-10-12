#!/usr/bin/env node
/**
 * map-math-g58-v1.mjs — the whole pipeline script for map-math-g58-v1 (MAP-MATH-G58-V1.prereg.md).
 * Every bar the prereg names is computed here and break-tested by --selftest at its margin.
 *
 *   slots [batch.json]        print the slot table (seed 20261070); with a batch, check every item against its slot
 *   checks <batch.json>       stage-0 mechanical checks (imported: PAIR RUN DIR DPAIR PLUG DSUM FAR KEYPRINT STRUCT INTER)
 *                             + the MAP fields (grade, tier, RIT band, CCSS prefix, area, area_25, plain-numeric options)
 *   part <WORK/parts/X.json>  per-item check an author runs: sandbox verify + slots + checks + near-dup (isee, ssat) + interior niceness
 *   assemble                  WORK/parts/*.json -> WORK/assembled.json in slot order; batch-level stage-0 report
 *   freeze                    WORK/assembled.json minus WORK/stage0-drops.json -> scripts/study-bank/map-math-g58-v1.batch.json
 *                             (seeded frozen order 20261071); refuses unless every area keeps >= 12 and all pass checks
 *   oo                        options-only render vs a matched live ISEE control -> map-math-g58-v1/oo.{blind,key}.json
 *   grade                     cold + keyed with-source renders, two halves -> map-math-g58-v1/ws-h{1,2}{.md,.keyed.md,.key.json}
 *   stage <g> <h> cold|keyed  set up grader folder WORK/grade/<g>-<h>/ (keyed: snapshot + chmod 444 + hash stage1.json first)
 *   coldcheck                 every stage-1 field copied unchanged into stage2.json, stage1 hash unchanged
 *   score                     all bars -> map-math-g58-v1/stages.json (verdict, per-area status, kept ids, drops)
 *   build | insert [--commit] staged insert (verified=false, family map, section math, cohort map-math-g58-v1)
 *   --selftest                break-test every bar at its margin, without the DB
 *
 * A check that cannot read its input exits 2 and never prints a number.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync, chmodSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
import { val, scoreItem } from './key-extremity-breakdown.mjs'
import { keyExtremityVerdict } from './key-extremity-gate.mjs'
import { pairRun, directions } from './algf27-checks.mjs'
import { dpair, plug } from './mf28-checks.mjs'
import { dsum, far } from './mf29-checks.mjs'
import { keyprint, struct, inter } from './mf30-checks.mjs'

export const ROOT = '/Users/andylee/Downloads/saas/classraum'
export const WORK = ROOT + '/scratchpad/map-math-g58-work'
const D = ROOT + '/scripts/study-bank/'
const R = D + 'map-math-g58-v1/'
const FROZEN = D + 'map-math-g58-v1.batch.json'
const INSERTED = D + 'map-math-g58-v1.inserted.batch.json'
export const COHORT = 'map-math-g58-v1'
const die = (m, code = 2) => { console.error(`REFUSING: ${m}`); process.exit(code) }
const rd = p => { if (!existsSync(p)) die(`missing ${p}`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`unreadable ${p}: ${e.message}`) } }
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const eq = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
const pct = (a, b) => b ? 100 * a / b : NaN
const f1 = x => Number.isFinite(x) ? x.toFixed(1) : 'NaN'

/* ------------------------------------------------------------------ areas, grades, tiers, slots */
export const AREAS = {
  O: { key: 'oa', domain: 'Operations and Algebraic Thinking', area25: 'Operations and Algebraic Thinking' },
  N: { key: 'num', domain: 'Real and Complex Number Systems', area25: 'Number and Operations' },
  D: { key: 'data', domain: 'Statistics and Probability', area25: 'Measurement and Data' },
  G: { key: 'geo', domain: 'Geometry', area25: 'Geometry' },
}
// Target RIT band per grade x tier: 10-point bands around the 2025 fall norm means (MAP-RESEARCH §3:
// grade 5 206.2, grade 8 222.1; 6 and 7 interpolated ~212 / ~217). A TARGET label, never a measurement.
export const RIT = {
  5: { low: 'RIT 190-199', mid: 'RIT 200-209', high: 'RIT 210-219' },
  6: { low: 'RIT 200-209', mid: 'RIT 210-219', high: 'RIT 220-229' },
  7: { low: 'RIT 200-209', mid: 'RIT 210-219', high: 'RIT 220-229' },
  8: { low: 'RIT 210-219', mid: 'RIT 220-229', high: 'RIT 230-239' },
}
const EXTRAS = { O: ['6high', '7high', '8mid'], N: ['5high', '7mid', '8high'], D: ['5mid', '6high', '8high'], G: ['5high', '6mid', '7high'] }
export const TIER_TO_DIFF = { low: 'easy', mid: 'medium', high: 'hard' }

export function makeSlots() {
  const rand = rng(20261070)
  const out = []
  for (const [L, a] of Object.entries(AREAS)) {
    const cells = []
    for (const g of [5, 6, 7, 8]) for (const t of ['low', 'mid', 'high']) cells.push({ grade: g, tier: t })
    for (const e of EXTRAS[L]) cells.push({ grade: +e[0], tier: e.slice(1) })
    // 15 cells: 9 extreme (5 S / 4 L on O and D, 4 S / 5 L on N and G) + 6 interior, dealt by the seeded shuffle
    const nS = (L === 'O' || L === 'D') ? 5 : 4
    const pos = [...Array(nS).fill('S'), ...Array(9 - nS).fill('L'), ...Array(6).fill('I')]
    const p = shuffleWith(pos, rand)
    const c = shuffleWith(cells, rand).sort((x, y) => x.grade - y.grade || ['low', 'mid', 'high'].indexOf(x.tier) - ['low', 'mid', 'high'].indexOf(y.tier))
    c.forEach((cell, i) => out.push({ id: `MMG-${L}${String(i + 1).padStart(2, '0')}`, letter: L, area: a.key, domain: a.domain, area25: a.area25, ...cell, rit: RIT[cell.grade][cell.tier], pos: p[i] }))
  }
  return out
}
export const SLOTS = makeSlots()
const SLOT = Object.fromEntries(SLOTS.map(s => [s.id, s]))

export function keyPos(item) {
  const sc = scoreItem(item.choices.map(String), String(item.correct_answer))
  if (sc.skip) return null
  return sc.keyMin ? 'S' : sc.keyMax ? 'L' : 'I'
}

/* ------------------------------------------------------------------ MAP field checks */
const PLAIN = /^-?(\d+(\.\d+)?|\d+\/\d+|\d+ \d+\/\d+)$/
export function mapFields(it) {
  const out = []
  const s = SLOT[it.id]
  if (!s) return [`MAP id ${it.id} is not a slot`]
  if (it.domain !== s.domain) out.push(`MAP domain '${it.domain}' != slot '${s.domain}'`)
  if (it.map_area !== s.area) out.push(`MAP map_area '${it.map_area}' != '${s.area}'`)
  if (it.grade_target !== s.grade) out.push(`MAP grade_target ${it.grade_target} != slot ${s.grade}`)
  if (it.tier !== s.tier) out.push(`MAP tier '${it.tier}' != slot '${s.tier}'`)
  if (it.rit_band !== s.rit) out.push(`MAP rit_band '${it.rit_band}' != '${s.rit}'`)
  if (it.difficulty !== TIER_TO_DIFF[s.tier]) out.push(`MAP difficulty '${it.difficulty}' != '${TIER_TO_DIFF[s.tier]}' (tier ${s.tier})`)
  if (s.grade === 5 && it.area_25 !== (s.area === 'geo' && /^5\.MD/.test(it.ccss ?? '') ? 'Measurement and Data' : s.area25)) out.push(`MAP area_25 '${it.area_25}' wrong for grade 5 (${s.area}, ${it.ccss})`)
  if (s.grade !== 5 && it.area_25 != null) out.push('MAP area_25 is for grade-5 items only')
  const cc = String(it.ccss ?? '')
  if (!new RegExp(`^${s.grade}\\.(OA|NBT|NF|MD|G|RP|EE|NS|SP|F)\\.`).test(cc)) out.push(`MAP ccss '${cc}' is not a grade-${s.grade} CCSS code`)
  const dom = cc.split('.')[1]
  const allowed = { oa: { 5: ['OA'], 6: ['RP', 'EE'], 7: ['RP', 'EE'], 8: ['EE', 'F'] }, num: { 5: ['NBT', 'NF'], 6: ['NS'], 7: ['NS'], 8: ['NS', 'EE'] }, data: { 5: ['MD'], 6: ['SP'], 7: ['SP'], 8: ['SP'] }, geo: { 5: ['G', 'MD'], 6: ['G'], 7: ['G'], 8: ['G'] } }[s.area][s.grade]
  if (!allowed.includes(dom)) out.push(`MAP ccss domain ${dom} not in ${allowed.join('/')} for ${s.area} grade ${s.grade}`)
  if (s.area === 'oa' && s.grade === 8 && dom === 'EE' && /^8\.EE\.A/.test(cc)) out.push('MAP 8.EE.A (exponents, roots, scientific notation) is filed under num, not oa')
  if (s.area === 'num' && s.grade === 8 && dom === 'EE' && !/^8\.EE\.A/.test(cc)) out.push('MAP num at grade 8 takes 8.NS or 8.EE.A only')
  if (s.area === 'data' && s.grade === 5 && !/^5\.MD\.(A|B)/.test(cc)) out.push('MAP grade-5 data takes 5.MD.A / 5.MD.B only (volume is geo)')
  if (s.area === 'geo' && s.grade === 5 && dom === 'MD' && !/^5\.MD\.C/.test(cc)) out.push('MAP grade-5 geo takes 5.G or 5.MD.C (volume) only')
  for (const c of it.choices ?? []) if (!PLAIN.test(String(c))) out.push(`MAP option '${c}' is not a plain number (integer, decimal, a/b or "w a/b"; units and symbols go in the stem)`)
  if (it.graphic && !(s.area === 'data' && ['table', 'twowaytable'].includes(it.graphic.type))) out.push('MAP graphic allowed only as a table on data items')
  if (/[−]/.test(JSON.stringify([it.prompt, it.choices]))) out.push('MAP U+2212 minus; use ASCII -')
  const kp = keyPos(it)
  if (kp && kp !== s.pos) out.push(`MAP key position ${kp} != slot ${s.pos}`)
  for (const f of ['explanation', 'solve', 'subskill']) if (typeof it[f] !== 'string' || !it[f].trim()) out.push(`MAP ${f} missing`)
  if (!it.distractor_solve || Object.keys(it.distractor_solve).length !== 3) out.push('MAP distractor_solve needs exactly 3 entries')
  if (typeof it.grade_rationale !== 'string' || it.grade_rationale.trim().length < 40) out.push('MAP grade_rationale (>= 40 chars): why this is a <tier> item for grade <g>')
  return out
}

export function checkItem(it) {
  const a = pairRun(it), d = directions(it), dp = dpair(it), ds = dsum(it), pl = plug(it), fr = far(it), kp = keyprint(it), st = struct(it), ia = inter(it)
  if (![a, d, dp, ds, pl, fr, kp, st].every(x => x.scored)) return { scored: false, gating: ['UNSCORABLE (non-numeric option set)', ...mapFields(it)], read: [] }
  return { scored: true, extreme: d.extreme, gating: [...a.out, ...d.out, ...dp.out, ...ds.out, ...pl.out, ...fr.out, ...kp.out, ...st.out, ...ia.out, ...mapFields(it)], read: [...a.soft, ...dp.soft, ...ds.soft, ...pl.soft, ...fr.soft, ...kp.soft, ...st.soft, ...ia.soft] }
}

/* ------------------------------------------------------------------ bars (pure, break-tested) */
export const BAR = { ooMargin: 10, ooUnan: 15, ooCeiling: 90, tooEasy: 15.0, tooHard: 25.0, offset: 0.5, tierSpread: 0.5, extMinN: 10, areaFreezeMin: 12 }

/** options-only per arm: { n, picks, hits, unan } -> verdict per area */
export function ooVerdict(cand, ctrl) {
  const cr = pct(cand.hits, cand.picks), kr = pct(ctrl.hits, ctrl.picks)
  const cu = pct(cand.unan, cand.n), ku = pct(ctrl.unan, ctrl.n)
  if (!cand.picks || !ctrl.picks) return { status: 'no-measurement', cr, kr, why: 'empty arm' }
  if (kr > BAR.ooCeiling) return { status: 'not-measured', cr, kr, cu, ku, margin: cr - kr, why: `control ${f1(kr)}% above the ${BAR.ooCeiling}% ceiling: the +${BAR.ooMargin} bar cannot fire` }
  const margin = cr - kr, umar = cu - ku
  const hold = margin > BAR.ooMargin + 1e-9 || umar > BAR.ooUnan + 1e-9
  return { status: hold ? 'hold' : 'pass', cr, kr, cu, ku, margin, umar, why: `candidate ${f1(cr)}% vs control ${f1(kr)}% (margin ${f1(margin)}, bar +${BAR.ooMargin}); unanimous-correct ${f1(cu)}% vs ${f1(ku)}% (${f1(umar)}, bar +${BAR.ooUnan})` }
}

const TIER_SHIFT = { low: -1, mid: 0, high: 1 }
const TIER_RANK = { below_grade: 0, low: 1, mid: 2, high: 3, above_grade: 4 }
/** rows: [{ tier, grade, a: {grade_fit, grade_assigned, tier_assigned}, b: {...} }] */
export function difficultyBars(rows) {
  const n = rows.length
  if (!n) return { status: 'no-measurement' }
  const j = rows.flatMap(r => [r.a, r.b])
  for (const x of j) if (!x || !['fits', 'too_easy', 'too_hard'].includes(x.grade_fit) || !Number.isFinite(+x.grade_assigned) || !(x.tier_assigned in TIER_RANK)) return { status: 'no-measurement', why: 'a grade field is missing or malformed' }
  const easy = j.filter(x => x.grade_fit === 'too_easy').length, hard = j.filter(x => x.grade_fit === 'too_hard').length
  const off = g => rows.reduce((s, r) => s + (+r[g].grade_assigned - r.grade - TIER_SHIFT[r.tier]), 0) / n
  const spread = g => { const hi = rows.filter(r => r.tier === 'high'), lo = rows.filter(r => r.tier === 'low'); if (!hi.length || !lo.length) return NaN; const m = s => s.reduce((a, r) => a + TIER_RANK[r[g].tier_assigned], 0) / s.length; return m(hi) - m(lo) }
  const r = { n, judgments: j.length, tooEasy: easy, tooHard: hard, tooEasyPct: pct(easy, j.length), tooHardPct: pct(hard, j.length), offA: off('a'), offB: off('b'), spreadA: spread('a'), spreadB: spread('b') }
  r.D1 = r.tooEasyPct <= BAR.tooEasy + 1e-9 && r.tooHardPct <= BAR.tooHard + 1e-9
  r.D2 = [r.offA, r.offB].every(x => x >= -BAR.offset - 1e-9 && x <= BAR.offset + 1e-9)
  r.D3 = [r.spreadA, r.spreadB].every(x => x >= BAR.tierSpread - 1e-9)
  r.status = r.D1 && r.D2 && r.D3 ? 'pass' : 'fail'
  return r
}

/** per-item drop rules over two graders' stage-2 rows (each holds the stage-1 fields). confirm: {rule: 'drop'|'keep'} for one-grader flags */
export function itemVerdict(it, a, b, confirm = {}, earlier = new Set()) {
  const key = String(it.correct_answer), ext = ['S', 'L'].includes(keyPos(it))
  const drop = [], hold = [], need = []
  const both = f => f(a) && f(b), any = f => f(a) || f(b), one = f => f(a) !== f(b)
  if (any(g => g.key_ok === false)) drop.push('R1 key disputed')
  if (any(g => g.exclusive === false || (g.second_defensible != null && g.second_defensible !== ''))) drop.push('R2 not exclusive / second defensible')
  if (both(g => g.distractors_weak === true)) drop.push('R3 distractors weak (both)')
  if (both(g => (+g.n_struck || 0) >= 2)) drop.push('R4 two or more free strikes (both)')
  if (both(g => g.key_identifiable_free === true)) drop.push('R5 key identifiable without solving (both)')
  const flag = (code, f) => { if (both(f)) drop.push(`${code} (both)`); else if (one(f)) { const c = confirm[code]; if (c === 'drop') drop.push(`${code} (one grader, confirmed)`); else if (c !== 'keep') need.push(code) } }
  flag('R6 plug-back routine <= 2', g => g.plugback_routine === true)
  if (ext) { flag('R8 one-sided extreme key', g => g.one_sided === true); flag('R10 single bound kills all', g => g.single_bound_kills_all === true) }
  for (const g of [a, b]) if (g.option_pair_tell != null && g.option_pair_tell !== '') { const c = confirm['R7 option pair']; if (c === 'drop') { drop.push('R7 option pair (confirmed)'); break } else if (c !== 'keep') { need.push('R7 option pair'); break } }
  const tmpl = g => (g.same_template_as ?? []).some(x => earlier.has(String(x)))
  flag('R11 template of an earlier item', tmpl)
  if (any(g => g.drop_recommend === true)) drop.push('EXT-1 drop_recommend')
  if (both(g => g.grade_fit === 'too_easy')) drop.push('G1 too easy for its grade (both)')
  if (both(g => g.grade_fit === 'too_hard')) drop.push('G1 too hard for its grade (both)')
  if (both(g => g.on_blueprint === false)) hold.push('OFF off-blueprint (both)')
  void key
  return { drop: [...new Set(drop)], hold, need: [...new Set(need)], keep: !drop.length && !hold.length && !need.length }
}

export function bankedDifficulty(a, b) {
  const r = x => Math.min(3, Math.max(1, TIER_RANK[x.tier_assigned]))
  const m = (r(a) + r(b)) / 2
  return m <= 1.5 ? 'easy' : m >= 2.5 ? 'hard' : 'medium'
}

/* ------------------------------------------------------------------ selftest */
function selftest() {
  let bad = 0, n = 0
  const t = (cond, msg) => { n++; if (!cond) { bad++; console.error('FAIL', msg) } }
  // slots
  t(SLOTS.length === 60 && new Set(SLOTS.map(s => s.id)).size === 60, 'slots 60 distinct')
  for (const L of Object.keys(AREAS)) { const s = SLOTS.filter(x => x.letter === L); t(s.length === 15 && s.filter(x => x.pos !== 'I').length === 9, `area ${L} 15 slots, 9 extreme`) }
  for (const g of [5, 6, 7, 8]) t(SLOTS.filter(s => s.grade === g).length === 15, `grade ${g} 15 slots`)
  t(JSON.stringify(makeSlots()) === JSON.stringify(SLOTS), 'slots deterministic')
  // oo bar at its margins
  const arm = (hits, picks, unan, nn) => ({ hits, picks, unan, n: nn })
  t(ooVerdict(arm(42, 120, 6, 40), arm(30, 120, 4, 40)).status === 'pass', 'oo +10.0 exactly passes')
  t(ooVerdict(arm(43, 120, 6, 40), arm(30, 120, 4, 40)).status === 'hold', 'oo +10.8 holds')
  t(ooVerdict(arm(30, 120, 10, 40), arm(30, 120, 4, 40)).status === 'pass', 'oo unanimity +15.0 passes')
  t(ooVerdict(arm(30, 120, 11, 40), arm(30, 120, 4, 40)).status === 'hold', 'oo unanimity +17.5 holds')
  t(ooVerdict(arm(110, 120, 6, 40), arm(109, 120, 4, 40)).status === 'not-measured', 'oo control 90.8% above ceiling: not measured')
  t(ooVerdict(arm(110, 120, 6, 40), arm(108, 120, 4, 40)).status === 'pass', 'oo control 90.0% at ceiling: measured')
  t(ooVerdict(arm(0, 0, 0, 0), arm(30, 120, 4, 40)).status === 'no-measurement', 'oo empty arm: no number')
  // difficulty bars at their margins (40 items, 80 judgments)
  const mk = (nEasy, nHard, off = 0, spreadHi = 'high', spreadLo = 'low') => Array.from({ length: 40 }, (_, i) => {
    const tier = ['low', 'mid', 'high', 'mid'][i % 4], grade = 5 + (i % 4)
    const fit = k => (2 * i + k) < nEasy ? 'too_easy' : (2 * i + k) >= 80 - nHard ? 'too_hard' : 'fits'
    const ta = tier === 'high' ? spreadHi : tier === 'low' ? spreadLo : 'mid'
    return { tier, grade, a: { grade_fit: fit(0), grade_assigned: grade + TIER_SHIFT[tier] + off, tier_assigned: ta }, b: { grade_fit: fit(1), grade_assigned: grade + TIER_SHIFT[tier] + off, tier_assigned: ta } }
  })
  t(difficultyBars(mk(12, 0)).D1 === true, 'D1 too_easy 12/80 = 15.0% passes')
  t(difficultyBars(mk(13, 0)).D1 === false, 'D1 too_easy 13/80 = 16.25% fails')
  t(difficultyBars(mk(0, 20)).D1 === true && difficultyBars(mk(0, 21)).D1 === false, 'D1 too_hard 25.0% passes, 26.25% fails')
  t(difficultyBars(mk(0, 0, -0.5)).D2 === true && difficultyBars(mk(0, 0, -0.75)).D2 === false && difficultyBars(mk(0, 0, 0.75)).D2 === false, 'D2 offset -0.5 passes, -0.75 and +0.75 fail')
  t(difficultyBars(mk(0, 0, 0, 'mid', 'low')).D3 === true && difficultyBars(mk(0, 0, 0, 'low', 'low')).D3 === false, 'D3 spread 1.0 passes, 0 fails')
  const half = mk(0, 0); half.forEach((r, i) => { if (r.tier === 'high') { r.a.tier_assigned = r.b.tier_assigned = i % 8 === 2 ? 'mid' : 'low' } })
  t(difficultyBars(half).D3 === true, 'D3 spread exactly 0.5 passes')
  const malformed = mk(0, 0); malformed[3].a.grade_fit = 'ok'
  t(difficultyBars(malformed).status === 'no-measurement', 'difficulty bars refuse a malformed row')
  // item rules
  const it = { correct_answer: '14', choices: ['2', '5', '9', '14'] }, ok = { key_ok: true, exclusive: true, second_defensible: null, n_struck: 0, plugback_routine: false, one_sided: false, single_bound_kills_all: false, option_pair_tell: null, same_template_as: [], drop_recommend: false, grade_fit: 'fits', on_blueprint: true, distractors_weak: false, key_identifiable_free: false }
  t(itemVerdict(it, ok, ok).keep, 'clean item kept')
  t(itemVerdict(it, { ...ok, key_ok: false }, ok).drop.length === 1, 'key disputed by one grader drops')
  t(itemVerdict(it, { ...ok, n_struck: 2 }, ok).keep && itemVerdict(it, { ...ok, n_struck: 2 }, { ...ok, n_struck: 3 }).drop.length === 1, 'R4 needs both')
  t(itemVerdict(it, { ...ok, one_sided: true }, ok).need.length === 1, 'one-grader one_sided needs a hand decision')
  t(itemVerdict(it, { ...ok, one_sided: true }, ok, { 'R8 one-sided extreme key': 'keep' }).keep, 'confirmed keep keeps')
  t(itemVerdict({ correct_answer: '5', choices: ['2', '5', '9', '14'] }, { ...ok, one_sided: true }, { ...ok, one_sided: true }).keep, 'one_sided ignored on an interior key')
  t(itemVerdict(it, { ...ok, grade_fit: 'too_easy' }, ok).keep && !itemVerdict(it, { ...ok, grade_fit: 'too_easy' }, { ...ok, grade_fit: 'too_easy' }).keep, 'G1 needs both')
  t(itemVerdict(it, { ...ok, on_blueprint: false }, { ...ok, on_blueprint: false }).hold.length === 1, 'off-blueprint by both holds')
  t(itemVerdict(it, { ...ok, same_template_as: ['MMG-O01'] }, { ...ok, same_template_as: ['MMG-O01'] }, {}, new Set(['MMG-O01'])).drop.length === 1, 'template of an earlier item by both drops')
  t(bankedDifficulty({ tier_assigned: 'low' }, { tier_assigned: 'mid' }) === 'easy' && bankedDifficulty({ tier_assigned: 'mid' }, { tier_assigned: 'high' }) === 'hard' && bankedDifficulty({ tier_assigned: 'below_grade' }, { tier_assigned: 'above_grade' }) === 'medium', 'banked difficulty mapping')
  // extremity per area at the bar: 4/10 passes, 3/10 fails, 9 items no measurement
  const ex = (n, e) => Array.from({ length: n }, (_, i) => ({ choices: ['2', '5', '9', '14'], correct_answer: i < e ? (i % 2 ? '14' : '2') : '5' }))
  t(keyExtremityVerdict(ex(10, 4)).status === 'pass' && keyExtremityVerdict(ex(10, 3)).status === 'fail' && keyExtremityVerdict(ex(9, 9)).status === 'no-measurement', 'extremity 4/10 pass, 3/10 fail, n=9 no measurement')
  // map fields: a well-formed item passes, a wrong grade code fails
  const s = SLOTS.find(x => x.grade === 6 && x.area === 'oa')
  const good = { id: s.id, domain: s.domain, map_area: 'oa', grade_target: 6, tier: s.tier, rit_band: s.rit, difficulty: TIER_TO_DIFF[s.tier], ccss: '6.EE.B.7', choices: ['2', '5', '9', '14'], correct_answer: { S: '2', L: '14', I: '5' }[s.pos], explanation: 'x', solve: 'return 1', subskill: 'x', distractor_solve: { a: 1, b: 2, c: 3 }, grade_rationale: 'y'.repeat(45) }
  t(mapFields(good).length === 0, `well-formed MAP fields pass (${mapFields(good).join('; ')})`)
  t(mapFields({ ...good, ccss: '7.EE.B.4' }).length > 0, 'wrong-grade CCSS refused')
  t(mapFields({ ...good, choices: ['2 cm', '5', '9', '14'] }).length > 0, 'unit in an option refused')
  t(mapFields({ ...good, correct_answer: { S: '5', L: '5', I: '14' }[s.pos] }).some(x => x.includes('key position')), 'key off its slot position refused')
  if (bad) { console.error(`SELFTEST FAILED ${bad}/${n}`); process.exit(2) }
  console.log(`selftest ${n}/${n} (slots; options-only +10.0 pass / +10.8 hold, unanimity +15.0 / +17.5, ceiling 90.0 measured / 90.8 not; D1 15.0% / 16.25%, too_hard 25.0 / 26.25; D2 -0.5 / +-0.75; D3 0.5 pass / 0 fail; item rules; extremity 4/10 / 3/10 / n=9; MAP fields)`)
}

/* ------------------------------------------------------------------ commands */
const cmd = process.argv[2]
const isMain = import.meta.url === `file://${process.argv[1]}`

async function main() {
  if (cmd === '--selftest') { selftest(); return }
  if (cmd === 'slots') return cmdSlots()
  if (cmd === 'checks') return cmdChecks(process.argv[3])
  if (cmd === 'part') return cmdPart(process.argv[3])
  if (cmd === 'assemble') return cmdAssemble()
  if (cmd === 'freeze') return cmdFreeze()
  if (cmd === 'oo') return cmdOo()
  if (cmd === 'grade') return cmdGrade()
  if (cmd === 'stage') return cmdStage(process.argv[3], process.argv[4], process.argv[5])
  if (cmd === 'coldcheck') return cmdColdcheck()
  if (cmd === 'score') return cmdScore()
  if (cmd === 'build') return cmdBuild()
  if (cmd === 'insert') return cmdInsert(process.argv.includes('--commit'))
  die('usage: see the header of map-math-g58-v1.mjs')
}

function cmdSlots() {
  const p = process.argv[3]
  if (!p) {
    for (const L of Object.keys(AREAS)) console.log(`${AREAS[L].domain} (${AREAS[L].key}): ` + SLOTS.filter(s => s.letter === L).map(s => `${s.id.slice(4)} g${s.grade} ${s.tier}/${s.pos}`).join('  '))
    return
  }
  const items = rd(p); let bad = 0
  for (const it of (Array.isArray(items) ? items : [items])) { const e = mapFields(it); if (e.length) { bad++; for (const x of e) console.log(`  ${it.id}  ${x}`) } }
  console.log(`slots: ${bad ? bad + ' item(s) off their slot' : 'all items on their slot'}`); process.exit(bad ? 1 : 0)
}

function cmdChecks(p) {
  let items = rd(p); if (!Array.isArray(items)) items = [items]
  if (!items.length) die('no items')
  let scored = 0, hit = 0
  for (const it of items) {
    const r = checkItem(it); if (r.scored) scored++
    if (r.gating.length) hit++
    for (const x of r.gating) console.log(`  ${it.id}  ${x}`)
    for (const x of r.read) console.log(`  ${it.id}  (read) ${x}`)
  }
  console.log(`${p.replace(/^.*\//, '')}: scored ${scored} of ${items.length}; items with a gating finding ${hit}`)
  if (!scored) process.exit(2)
  process.exit(hit ? 1 : 0)
}

function cmdPart(p) {
  if (!p || !existsSync(p)) die(`${p} missing`)
  let it; try { it = JSON.parse(readFileSync(p, 'utf8')) } catch { die(`${p} unparseable`) }
  mkdirSync(WORK + '/tmp', { recursive: true })
  const one = `${WORK}/tmp/one-${process.pid}.json`; writeFileSync(one, JSON.stringify([it]))
  let bad = 0
  const run = (args, env = {}) => spawnSync('node', args, { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env } })
  const v = run([D + 'math-bank-helper.mjs', 'verify', one]); console.log(v.stdout.split('\n').filter(l => /^(OK|FAIL|SHAPE)|DISTRACTOR|Sandbox|Distractors/.test(l)).join('\n')); if (v.status !== 0) bad = 1
  const r = checkItem(it)
  for (const x of r.gating) console.log(`  GATING ${x}`)
  for (const x of r.read) console.log(`  (read) ${x}`)
  if (r.gating.length) bad = 1
  const env = Object.fromEntries(readFileSync(ROOT + '/.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  for (const fam of ['isee', 'ssat']) {
    const nd = run([D + 'check-math-near-dup.mjs', one, '--family', fam], env)
    const lines = (nd.stdout + nd.stderr).split('\n').filter(l => /FLAG|best|REFUS/.test(l)); console.log(lines.map(l => `  near-dup ${fam}: ${l.trim()}`).join('\n'))
    if (nd.status !== 0) bad = 1
  }
  const ni = run([D + 'check-interior-niceness.mjs', one])
  const nl = ni.stdout.split('\n').filter(l => /KEY-CLEANER|parity [a-z]|complement|denominator/.test(l) && !/violations|pairs|singling/.test(l))
  if (nl.length) { bad = 1; console.log(nl.map(l => `  niceness: ${l.trim()}`).join('\n')) }
  console.log(`PART ${bad ? 'FAIL' : 'OK'} ${p}`); process.exit(bad)
}

function loadParts() {
  const dir = WORK + '/parts'
  if (!existsSync(dir)) die('no parts directory')
  const items = []
  for (const s of SLOTS) { const p = `${dir}/${s.id}.json`; if (existsSync(p)) items.push(JSON.parse(readFileSync(p, 'utf8'))) }
  return items
}

function batchReport(items) {
  let gating = 0
  for (const it of items) { const r = checkItem(it); if (r.gating.length) { gating++; for (const x of r.gating) console.log(`  ${it.id}  ${x}`) } }
  // cross-item: a key value repeated across items; identical option multisets
  const keys = {}; for (const it of items) (keys[String(val(it.correct_answer))] ??= []).push(it.id)
  const rep = Object.entries(keys).filter(([, v]) => v.length > 1)
  for (const [k, v] of rep) console.log(`  cross-item: key value ${k} repeated on ${v.join(', ')}`)
  const kx = keyExtremityVerdict(items)
  console.log(`items ${items.length}; with a gating finding ${gating}; repeated key values ${rep.length}; key extremity ${kx.status} - ${kx.reason}`)
  for (const L of Object.keys(AREAS)) { const a = items.filter(i => i.id.startsWith(`MMG-${L}`)); const v = keyExtremityVerdict(a); console.log(`  ${AREAS[L].key.padEnd(5)} n ${a.length}  extremity ${v.status} ${Number.isFinite(v.rate) ? f1(100 * v.rate) + '%' : ''}`) }
  const g = {}; for (const it of items) { const k = `g${it.grade_target} ${it.tier}`; g[k] = (g[k] ?? 0) + 1 }
  console.log(`  by grade x tier ${JSON.stringify(g)}`)
  return { gating, rep: rep.length }
}

function cmdAssemble() {
  const items = loadParts()
  console.log(`parts on disk ${items.length} of ${SLOTS.length}; missing ${SLOTS.filter(s => !items.find(i => i.id === s.id)).map(s => s.id).join(' ') || 'none'}`)
  writeFileSync(WORK + '/assembled.json', JSON.stringify(items, null, 1) + '\n')
  batchReport(items)
}

function cmdFreeze() {
  const items = rd(WORK + '/assembled.json')
  const drops = existsSync(WORK + '/stage0-drops.json') ? rd(WORK + '/stage0-drops.json') : {}
  const kept = items.filter(it => !drops[it.id])
  for (const L of Object.keys(AREAS)) { const n = kept.filter(i => i.id.startsWith(`MMG-${L}`)).length; if (n < BAR.areaFreezeMin) die(`area ${AREAS[L].key} keeps ${n} < ${BAR.areaFreezeMin}: the batch stops (stage 0)`, 1) }
  const r = batchReport(kept)
  if (r.gating) die(`${r.gating} frozen item(s) fail a gating check`, 1)
  const order = shuffleWith(kept.map(i => i.id), rng(20261071))
  const frozen = order.map(id => kept.find(i => i.id === id))
  writeFileSync(FROZEN, JSON.stringify(frozen, null, 1) + '\n')
  console.log(`FROZEN ${frozen.length} items -> ${FROZEN}\n  sha256 ${sha(FROZEN)}\n  dropped at stage 0: ${Object.keys(drops).join(' ') || 'none'}`)
}

/* ---- options-only: candidates vs a 1:1 matched live ISEE control (same MAP area by keyword, low tier -> easy, mid/high -> medium) */
const STATS = /probab|median|mean\b|average|data|statistic|frequency|percentile|standard deviation|scatter|survey|sampl|histogram|range of|mode\b|expected value|chance/i
const GEOM = /triangle|circle|area|volume|perimeter|angle|polygon|coordinate|distance between|slope|cone|cylinder|sphere|rectang|square|cube|surface|radius|diameter|arc|chord|similar|congruen|trig|sine|cosine|tangent|parallelogram|trapezoid|hexagon|pythag/i
const NUMSYS = /prime|factor|divisib|multiple|digit|fraction|decimal|exponent|radical|root|integer|irrational|complex|scientific notation|remainder|gcd|lcm|reciprocal|absolute value|number line|place value/i
// copied from map-reband-count.mjs classify() isee/math (that module runs its main on import)
export const iseeArea = sub => STATS.test(sub) ? 'data' : GEOM.test(sub) ? 'geo' : NUMSYS.test(sub) ? 'num' : 'oa'

async function db() {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync(ROOT + '/.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}

async function cmdOo() {
  const frozen = rd(FROZEN)
  const c = await db(), rows = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await c.from('study_item_bank').select('id,cohort,difficulty,subskill,item').eq('family', 'isee').eq('section', 'math').eq('verified', true).eq('archived', false).order('id').range(f, f + 999)
    if (error) die(error.message); rows.push(...data); if (data.length < 1000) break
  }
  if (!rows.length || new Set(rows.map(r => r.id)).size !== rows.length) die('empty or slipped paging')
  const pool = {}
  for (const r of rows) {
    const ch = (r.item?.choices ?? []).map(String)
    if (ch.length !== 4 || !ch.includes(String(r.item?.correct_answer ?? ''))) continue
    if (scoreItem(ch, String(r.item.correct_answer)).skip) continue
    if (!['easy', 'medium'].includes(r.difficulty)) continue
    ;(pool[`${iseeArea(r.subskill ?? '')}/${r.difficulty}`] ??= []).push(r)
  }
  console.log(`live isee/math ${rows.length}; eligible 4-choice numeric easy/medium by area: ${JSON.stringify(Object.fromEntries(Object.entries(pool).map(([k, v]) => [k, v.length])))}`)
  const rand = rng(20261072), shuffle = a => shuffleWith(a.slice(), rand)
  const need = {}; for (const it of frozen) { const k = `${it.map_area}/${it.tier === 'low' ? 'easy' : 'medium'}`; need[k] = (need[k] ?? 0) + 1 }
  const control = []
  for (const [k, n] of Object.entries(need).sort()) { const p = pool[k] ?? []; if (p.length < n) die(`need ${n} ${k}, ${p.length} eligible`); control.push(...shuffle(p).slice(0, n).map(r => ({ r, area: k.split('/')[0] }))) }
  const SL = ['A', 'B', 'C', 'D'], entries = []
  const deal = (choices, key, i) => { const ch = choices.map(x => String(x).replace(/−/g, '-')); const ci = ch.indexOf(String(key).replace(/−/g, '-')); const want = SL[i % 4]; const rest = shuffle(ch.filter((_, j) => j !== ci)); let q = 0; return { want, options: Object.fromEntries(SL.map(s => [s, s === want ? ch[ci] : rest[q++]])) } }
  frozen.forEach((it, i) => { const d = deal(it.choices, it.correct_answer, i); entries.push({ blind: { options: d.options }, key: { letter: d.want, localId: it.id, area: it.map_area, kind: 'candidate' } }) })
  control.forEach(({ r, area }, i) => { const d = deal(r.item.choices, r.item.correct_answer, i); entries.push({ blind: { options: d.options }, key: { letter: d.want, localId: r.id, cohort: r.cohort, area, difficulty: r.difficulty, kind: 'live-control' } }) })
  const order = shuffle(entries), blind = {}, key = {}
  order.forEach((e, i) => { const id = `L${String(i + 1).padStart(3, '0')}`; blind[id] = e.blind; key[id] = e.key })
  mkdirSync(R, { recursive: true })
  writeFileSync(R + 'oo.blind.json', JSON.stringify(blind, null, 1) + '\n'); writeFileSync(R + 'oo.key.json', JSON.stringify(key, null, 1) + '\n')
  for (const arm of ['candidate', 'live-control']) { const d = {}, a = {}; for (const k of Object.values(key)) if (k.kind === arm) { d[k.letter] = (d[k.letter] ?? 0) + 1; a[k.area] = (a[k.area] ?? 0) + 1 } console.log(`  ${arm.padEnd(13)} areas ${JSON.stringify(a)} deal ${JSON.stringify(d)}`) }
  console.log(`  blind sha ${sha(R + 'oo.blind.json').slice(0, 16)}; ${Object.keys(blind).length} items`)
}

/* ---- with-source renders: halves h1 (frozen positions 1..ceil(n/2)) and h2 */
const TIER_WORDS = { low: 'low (easier than typical for this grade: most students in the grade answer it correctly)', mid: 'mid (typical for this grade: about half of students in the grade answer it correctly)', high: 'high (harder than typical for this grade: only stronger students in the grade answer it correctly)' }
function cmdGrade() {
  const frozen = rd(FROZEN), h = Math.ceil(frozen.length / 2)
  mkdirSync(R, { recursive: true })
  for (const [hn, part] of [['h1', frozen.slice(0, h)], ['h2', frozen.slice(h)]]) {
    const rand = rng(hn === 'h1' ? 20261073 : 20261074)
    let md = `# Items for review (${part.length})\n\nEach item: id, area, target grade and target tier, the question, four options. The correct answer is NOT marked.\n`
    let kd = `# Items for review, KEYED (${part.length})\n\nThe same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.\n`
    const keyj = {}
    part.forEach((it, i) => {
      const L = ['A', 'B', 'C', 'D'][i % 4], rest = shuffleWith(it.choices.map(String).filter(c => c !== String(it.correct_answer)), rand)
      let q = 0; const opts = ['A', 'B', 'C', 'D'].map(s => s === L ? String(it.correct_answer) : rest[q++])
      keyj[it.id] = { letter: L, choices: opts }
      const g = it.graphic ? `\nTable${it.graphic.caption ? ` (${it.graphic.caption})` : ''}:\n\n| ${['', ...(it.graphic.colLabels ?? [])].join(' | ')} |\n| ${['', ...(it.graphic.colLabels ?? [])].map(() => '---').join(' | ')} |\n${(it.graphic.cells ?? []).map((row, ri) => `| ${[(it.graphic.rowLabels ?? [])[ri] ?? '', ...row].join(' | ')} |`).join('\n')}\n` : ''
      const head = `\n---\n\n## ${it.id}\n\nArea: ${it.domain} | Target grade: ${it.grade_target} | Target tier: ${TIER_WORDS[it.tier]}\n\nQuestion: ${it.prompt}\n${g}\n${opts.map((o, j) => `${'ABCD'[j]}. ${o}`).join('\n')}\n`
      md += head
      kd += head + `\nKEY: ${L} (${it.correct_answer})\n\nWorked solution: ${it.explanation}\n\nKey computation (JS): \`${it.solve}\`\n\nDistractors:\n${opts.filter(o => o !== String(it.correct_answer)).map(o => `- ${'ABCD'[opts.indexOf(o)]} (${o}): ${it.distractor_meta?.[o]?.why ?? ''} | computation: \`${it.distractor_solve?.[o] ?? ''}\``).join('\n')}\n`
    })
    writeFileSync(R + `ws-${hn}.md`, md); writeFileSync(R + `ws-${hn}.keyed.md`, kd); writeFileSync(R + `ws-${hn}.key.json`, JSON.stringify(keyj, null, 1) + '\n')
    const slots = Object.values(keyj).reduce((m, k) => (m[k.letter] = (m[k.letter] ?? 0) + 1, m), {})
    console.log(`  ${hn}: ${part.length} items, key letters ${JSON.stringify(slots)}, cold sha ${sha(R + `ws-${hn}.md`).slice(0, 16)}, keyed sha ${sha(R + `ws-${hn}.keyed.md`).slice(0, 16)}`)
  }
}

const S1_FIELDS = ['my_answer', 'exclusive', 'second_defensible', 'struck', 'n_struck', 'free_elimination', 'key_identifiable_free', 'plugback_tries', 'plugback_routine', 'error_directions', 'one_sided', 'extreme_single_bound', 'single_bound_kills_all', 'interior_parity', 'interior_tell', 'arith_tell', 'option_pair_tell', 'same_template_as', 'live_duplicate', 'area_judged', 'on_blueprint', 'grade_fit', 'grade_assigned', 'tier_assigned', 'grade_note', 'note']
const S2_FIELDS = ['key_ok', 'key_note', 'path_coherent', 'path_note', 'distractors_weak', 'drop_recommend', 'drop_reason', 'grade_fit_final', 'grade_note_final']

function cmdStage(g, h, which) {
  if (!['d', 'e'].includes(g) || !['h1', 'h2'].includes(h) || !['cold', 'keyed'].includes(which)) die('stage <d|e> <h1|h2> <cold|keyed>')
  const dir = `${WORK}/grade/${g}-${h}`; mkdirSync(dir, { recursive: true })
  if (which === 'cold') { copyFileSync(R + `ws-${h}.md`, `${dir}/grade.md`); console.log(`${dir}/grade.md  sha ${sha(dir + '/grade.md').slice(0, 16)}`); return }
  const s1 = `${dir}/stage1.json`; const j = rd(s1)
  const want = Object.keys(rd(R + `ws-${h}.key.json`))
  const miss = want.filter(id => !j[id] || S1_FIELDS.some(f => !(f in j[id])))
  if (miss.length) die(`stage1 incomplete for ${miss.length}: ${miss.slice(0, 6).join(' ')}`)
  mkdirSync(WORK + '/snap', { recursive: true })
  const snap = `${WORK}/snap/${g}-${h}.stage1.json`; copyFileSync(s1, snap); chmodSync(snap, 0o444); chmodSync(s1, 0o444)
  const shas = existsSync(WORK + '/coldshas.json') ? rd(WORK + '/coldshas.json') : {}
  shas[`${g}-${h}`] = sha(snap); writeFileSync(WORK + '/coldshas.json', JSON.stringify(shas, null, 1))
  copyFileSync(R + `ws-${h}.keyed.md`, `${dir}/keyed.md`)
  console.log(`snapshot ${snap} sha ${shas[`${g}-${h}`].slice(0, 16)}; keyed.md released into ${dir}`)
}

function loadGrader(g, h) {
  const dir = `${WORK}/grade/${g}-${h}`
  return { s1: rd(`${WORK}/snap/${g}-${h}.stage1.json`), s2: rd(`${dir}/stage2.json`), snapSha: sha(`${WORK}/snap/${g}-${h}.stage1.json`) }
}

function cmdColdcheck() {
  const shas = rd(WORK + '/coldshas.json'); let rows = 0, changed = 0
  for (const g of ['d', 'e']) for (const h of ['h1', 'h2']) {
    const { s1, s2, snapSha } = loadGrader(g, h)
    if (snapSha !== shas[`${g}-${h}`]) die(`${g}-${h} stage1 snapshot hash changed`)
    const live = sha(`${WORK}/grade/${g}-${h}/stage1.json`); if (live !== snapSha) { console.log(`  ${g}-${h} stage1.json in the folder differs from the snapshot`); changed++ }
    for (const id of Object.keys(s1).filter(k => k.startsWith('MMG-'))) {
      rows++
      if (!s2[id]) { console.log(`  ${g}-${h} ${id} missing from stage2`); changed++; continue }
      for (const f of S1_FIELDS) if (JSON.stringify(s1[id][f]) !== JSON.stringify(s2[id][f])) { console.log(`  ${g}-${h} ${id} stage-1 field ${f} changed`); changed++ }
      for (const f of S2_FIELDS) if (!(f in s2[id])) { console.log(`  ${g}-${h} ${id} stage-2 field ${f} missing`); changed++ }
    }
  }
  console.log(`coldcheck: ${rows} cold rows, ${changed} changed or missing`); if (!rows) process.exit(2); process.exit(changed ? 1 : 0)
}

function scoreOo() {
  const key = rd(R + 'oo.key.json'), ids = Object.keys(key)
  const sol = ['a', 'b', 'c'].map(x => { const j = rd(`${R}oo.solver-${x}.json`); const m = j.items ?? j; const got = ids.filter(i => m[i]?.pick).length; if (got !== ids.length) die(`solver ${x} answered ${got} of ${ids.length}`); return m })
  const res = {}
  for (const area of ['all', 'oa', 'num', 'data', 'geo']) {
    const arm = kind => { const s = ids.filter(i => key[i].kind === kind && (area === 'all' || key[i].area === area)); let hits = 0, unan = 0; for (const i of s) { const h = sol.filter(m => String(m[i].pick).trim().toUpperCase() === key[i].letter).length; hits += h; if (h === 3) unan++ } return { n: s.length, picks: 3 * s.length, hits, unan } }
    const c = arm('candidate'), k = arm('live-control')
    res[area] = { cand: c, ctrl: k, ...ooVerdict(c, k) }
  }
  const dist = {}; for (const i of ids) dist[key[i].letter] = (dist[key[i].letter] ?? 0) + 1
  return { res, letterControl: pct(Math.max(...Object.values(dist)), ids.length) }
}

function cmdScore() {
  const frozen = rd(FROZEN), byId = Object.fromEntries(frozen.map(i => [i.id, i]))
  const confirm = existsSync(R + 'confirm.json') ? rd(R + 'confirm.json') : {}
  const out = { prereg: 'MAP-MATH-G58-V1.prereg.md', frozenSha: sha(FROZEN), n: frozen.length }
  // stage 1: options-only
  const oo = scoreOo(); out.optionsOnly = oo
  console.log(`OPTIONS-ONLY (3 samples; letter control ${f1(oo.letterControl)}%)`)
  for (const [a, r] of Object.entries(oo.res)) console.log(`  ${a.padEnd(5)} cand ${r.cand.hits}/${r.cand.picks}  ctrl ${r.ctrl.hits}/${r.ctrl.picks}  ${r.status.toUpperCase()}  ${r.why}`)
  // stage 2: graders
  const G = {}; for (const g of ['d', 'e']) { G[g] = {}; for (const h of ['h1', 'h2']) { const { s2 } = loadGrader(g, h); for (const [id, row] of Object.entries(s2)) if (id.startsWith('MMG-')) G[g][id] = row } }
  const missing = frozen.filter(i => !G.d[i.id] || !G.e[i.id]).map(i => i.id); if (missing.length) die(`grader rows missing for ${missing.join(' ')}`)
  const diff = difficultyBars(frozen.map(it => ({ tier: it.tier, grade: it.grade_target, a: G.d[it.id], b: G.e[it.id] })))
  out.difficulty = diff
  console.log(`DIFFICULTY over ${diff.n} frozen (${diff.judgments} judgments): too_easy ${diff.tooEasy} = ${f1(diff.tooEasyPct)}% (bar <= ${BAR.tooEasy}), too_hard ${diff.tooHard} = ${f1(diff.tooHardPct)}% (bar <= ${BAR.tooHard}) D1 ${diff.D1 ? 'PASS' : 'FAIL'}; offset d ${diff.offA?.toFixed(2)} e ${diff.offB?.toFixed(2)} (bar +-${BAR.offset}) D2 ${diff.D2 ? 'PASS' : 'FAIL'}; tier spread d ${diff.spreadA?.toFixed(2)} e ${diff.spreadB?.toFixed(2)} (bar >= ${BAR.tierSpread}) D3 ${diff.D3 ? 'PASS' : 'FAIL'}`)
  const byArea = {}; for (const it of frozen) { const a = (byArea[it.map_area] ??= { easy: 0, hard: 0, n: 0 }); a.n++; for (const g of ['d', 'e']) { if (G[g][it.id].grade_fit === 'too_easy') a.easy++; if (G[g][it.id].grade_fit === 'too_hard') a.hard++ } }
  console.log(`  too_easy / too_hard by area: ${Object.entries(byArea).map(([a, v]) => `${a} ${v.easy}/${v.hard} of ${2 * v.n}`).join(', ')}`)
  const coldOn = frozen.reduce((s, it) => s + ['d', 'e'].filter(g => val(G[g][it.id].my_answer) === val(it.correct_answer) || String(G[g][it.id].my_answer).trim() === String(it.correct_answer)).length, 0)
  out.coldOnKey = coldOn
  // per item
  const items = {}, needs = []
  frozen.forEach((it, i) => {
    const earlier = new Set(frozen.slice(0, i).map(x => x.id))
    const v = itemVerdict(it, G.d[it.id], G.e[it.id], confirm[it.id] ?? {}, earlier)
    items[it.id] = { ...v, difficulty: bankedDifficulty(G.d[it.id], G.e[it.id]) }
    if (v.need.length) needs.push(`${it.id}: ${v.need.join(', ')}`)
  })
  out.items = items
  if (needs.length) { console.log(`HAND DECISIONS NEEDED in map-math-g58-v1/confirm.json (${needs.length}):\n  ${needs.join('\n  ')}`); writeFileSync(R + 'stages.json', JSON.stringify({ ...out, verdict: 'INCOMPLETE' }, null, 1) + '\n'); process.exit(1) }
  // per area
  const areas = {}
  for (const L of Object.keys(AREAS)) {
    const a = AREAS[L].key, fz = frozen.filter(i => i.map_area === a), kept = fz.filter(i => items[i.id].keep)
    const ext = keyExtremityVerdict(kept), o = oo.res[a]
    const reasons = []
    if (o.status !== 'pass') reasons.push(`options-only ${o.status}`)
    if (ext.status !== 'pass') reasons.push(`kept-set extremity ${ext.status}: ${ext.reason}`)
    areas[a] = { frozen: fz.length, kept: kept.length, keptIds: kept.map(i => i.id), extremity: ext, oo: o.status, status: reasons.length ? 'held' : 'pass', reasons }
    console.log(`AREA ${a.padEnd(5)} frozen ${fz.length} kept ${kept.length}  extremity ${ext.status} (${ext.reason})  oo ${o.status}  => ${areas[a].status.toUpperCase()}`)
  }
  out.areas = areas
  const dropped = frozen.filter(i => !items[i.id].keep)
  for (const it of dropped) console.log(`  DROP/HOLD ${it.id} g${it.grade_target} ${it.tier}: ${[...items[it.id].drop, ...items[it.id].hold].join('; ')}`)
  const batchPass = diff.status === 'pass'
  out.passIds = batchPass ? Object.values(areas).filter(a => a.status === 'pass').flatMap(a => a.keptIds) : []
  out.verdict = !batchPass ? 'FAIL' : out.passIds.length ? 'PASS' : 'FAIL'
  console.log(`cold answers on key ${coldOn}/${2 * frozen.length}; kept (all areas) ${frozen.length - dropped.length}; VERDICT ${out.verdict}; insertable ${out.passIds.length}`)
  writeFileSync(R + 'stages.json', JSON.stringify(out, null, 1) + '\n')
}

/* ---- staged insert */
const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const hashOf = ({ prompt, choices }) => createHash('md5').update([norm(prompt), (choices || []).map(norm).join('|')].join('~~')).digest('hex')

function cmdBuild() {
  const st = rd(R + 'stages.json'); if (st.verdict !== 'PASS') die(`stages.json verdict ${st.verdict}`)
  if (st.frozenSha !== sha(FROZEN)) die('frozen batch changed since score')
  const frozen = Object.fromEntries(rd(FROZEN).map(i => [i.id, i]))
  const keys = { ...rd(R + 'ws-h1.key.json'), ...rd(R + 'ws-h2.key.json') }
  const items = st.passIds.map(id => {
    const it = frozen[id], k = keys[id]
    if (!k || !k.choices.includes(String(it.correct_answer)) || new Set(k.choices).size !== 4) die(`${id}: rendered choices do not hold the key`)
    return {
      id, type: 'multiple_choice', prompt: it.prompt, choices: k.choices, correct_answer: String(it.correct_answer), explanation: it.explanation,
      graphic: it.graphic ?? null, passage: null, passageGroupId: null, blanks: null, correct_answers: null, acceptable_answers: null,
      difficulty: st.items[id].difficulty, domain: it.domain, subskill: it.subskill, solve: it.solve,
      distractor_rationales: k.choices.filter(c => c !== String(it.correct_answer)).map(c => ({ choice: c, reason: it.distractor_meta?.[c]?.why ?? '' })),
      map: { area: it.map_area, area_25: it.area_25 ?? null, grade_target: it.grade_target, tier: it.tier, rit_band_target: it.rit_band, ccss: it.ccss, author_difficulty: it.difficulty },
    }
  })
  writeFileSync(INSERTED, JSON.stringify(items, null, 1) + '\n')
  const kx = keyExtremityVerdict(items)
  console.log(`${items.length} items -> ${INSERTED}; sha256 ${sha(INSERTED)}; key extremity ${kx.status} (${kx.reason})`)
  console.log(`banked difficulty ${['easy', 'medium', 'hard'].map(d => `${d} ${items.filter(i => i.difficulty === d).length}`).join(' / ')}`)
}

async function cmdInsert(commit) {
  const { gateBatch } = await import('./gate.mjs')
  const g = gateBatch({ task: 'multiple_choice', family: 'map', section: 'math', itemFiles: [INSERTED] })
  console.log(`gate (${g.family}, ledger ${g.batch ?? 'none'}): ${g.canInsert ? 'PASS' : 'REFUSED'} - ${g.reason}`)
  if (!g.canInsert) process.exit(2)
  const items = rd(INSERTED)
  const kx = keyExtremityVerdict(items); if (kx.status === 'fail') die(`key extremity ${kx.reason}`)
  for (const it of items) { let v; try { v = String(new Function('"use strict";' + it.solve)()) } catch (e) { v = 'ERR' } if (!eq(val(v), val(it.correct_answer))) die(`${it.id}: sandbox ${v} != key ${it.correct_answer}`) }
  const rows = items.map(({ id, map, solve, ...item }) => ({
    family: 'map', section: 'math', domain: item.domain, subskill: item.subskill, difficulty: item.difficulty, topic_tag: map.ccss,
    item_type: 'multiple_choice', task: 'multiple_choice', passage_group_id: null, item, content_hash: hashOf(item), word_count: null,
    verified: false, source: 'hand', cohort: COHORT, archived: false,
    verify_meta: {
      method: 'map-math-g58-v1: claude-authored, sandbox key + distractor recompute, stage-0 mechanical checks, options-only vs matched live ISEE control (per area), two Claude graders cold then keyed incl. grade fit',
      staged: true, release: 'NOT released. MAP is not a shipped family; a person releases (human sitting, decision rule fixed before the draw). Never verified=true from a script.',
      localId: id, map, solve, prereg: 'scripts/study-bank/MAP-MATH-G58-V1.prereg.md', contentSha: g.sha,
    },
  }))
  const c = await db()
  const { data: dup, error: e1 } = await c.from('study_item_bank').select('id,cohort').in('content_hash', rows.map(r => r.content_hash)); if (e1) die(e1.message)
  if (dup.length) die(`${dup.length} content_hash already in the bank (${dup.map(d => d.cohort).join(',')})`)
  const { data: same, error: e2 } = await c.from('study_item_bank').select('id').eq('cohort', COHORT); if (e2) die(e2.message)
  if (same.length) die(`cohort ${COHORT} already has ${same.length} rows`)
  console.log(`${rows.length} rows ready: family map, section math, verified=false, cohort ${COHORT}`)
  if (!commit) { console.log('DRY RUN: nothing inserted (pass --commit)'); return }
  const { data: ins, error: e3 } = await c.from('study_item_bank').insert(rows).select('id,verified,cohort,difficulty,domain'); if (e3) die(e3.message)
  console.log(`INSERTED ${ins.length} rows, verified=${[...new Set(ins.map(r => r.verified))].join(',')}`)
}

// run last: main() reaches module-scope consts declared below the command table (TDZ fix 2026-10-12, after the prereg; no bar changed)
if (isMain) await main()
