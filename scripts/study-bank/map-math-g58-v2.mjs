#!/usr/bin/env node
/**
 * map-math-g58-v2.mjs — the whole pipeline script for map-math-g58-v2 (MAP-MATH-G58-V2.prereg.md).
 * v1's machinery (map-math-g58-v1.mjs) for the three areas v1 held, with three changes fixed in the prereg:
 *   1. BOUND-SCREEN: every item declares one cheap bound per kind (sign, magnitude, parity, units digit, range from
 *      one printed number); a declared bound that strikes more than one distractor is a gating failure, and a
 *      PRINTED (read) line lists every printed number with two or more distractors beyond it from the key.
 *      Declared bounds are authoring hygiene, NOT the check (CLAUDE.md 2026-09-24): the check is the screen.
 *   2. SCREEN: a fresh cold Claude screener fills the graders' free-elimination fields before freeze; a screen fail
 *      is returned to its author once, re-screened by a fresh screener, and dropped before freeze if it still fails.
 *   3. TIE-BREAK: a one-grader flag (R6 R7 R8 R10 R11) is decided by a third cold grader F, 2 of 3; no hand decisions.
 *      F missing / malformed on the field = a 1-1 tie = DROP.
 *
 *   slots [batch.json]        slot table (seed 20261080); with a batch, check every item against its slot
 *   checks <batch.json>       stage-0 mechanical checks (v1's imported set + MAP fields + BOUND-SCREEN + PRINTED)
 *   part <WORK/parts/X.json>  per-item author check: sandbox verify + slot + checks + near-dup (isee, ssat, v1 items) + niceness
 *   assemble                  WORK/parts/*.json -> WORK/assembled.json; batch-level stage-0 report
 *   screen-render <pass>      pass 1: every assembled item, two halves -> WORK/screen/p1-{a,b}/screen.md
 *                             pass 2: the items returned in pass 1 -> WORK/screen/p2-a/screen.md
 *   screen-score <pass>       read every screen.json of that pass; print and record fails (WORK/screen-p<pass>.json);
 *                             pass 2 writes the still-failing items to WORK/stage0-drops.json
 *   freeze                    assembled minus stage0-drops -> map-math-g58-v2.batch.json (order seed 20261081);
 *                             refuses unless every area keeps >= 15 of 20 and all pass the gating checks
 *   oo                        options-only render vs a matched live ISEE control (seed 20261082)
 *   grade                     cold + keyed with-source renders, two halves (seeds 20261083 / 20261084)
 *   stage <g> <h> cold|keyed  grader folder WORK/grade/<g>-<h>/ (keyed: snapshot + chmod 444 + hash stage1 first)
 *   coldcheck                 every stage-1 field copied unchanged into stage2.json, stage1 hash unchanged
 *   score                     all bars -> map-math-g58-v2/stages.json; if one-grader flags remain, writes tb-needs and stops
 *   tiebreak                  cold render of the flagged items for grader F -> map-math-g58-v2/tb.md, tb.key.json
 *   build | insert [--commit] staged insert (verified=false, family map, section math, cohort map-math-g58-v2)
 *   forms                     v1+v2 staged pool -> grades 5-8 MAP maths forms (MAP-LAUNCH-PLAN §1: 40 = 10 per area)
 *   --selftest                break-test every bar and rule at its margin, without the DB
 *
 * A check that cannot read its input exits 2 and never prints a number.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, chmodSync } from 'node:fs'
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
export const WORK = ROOT + '/scratchpad/map-math-g58-v2-work'
const D = ROOT + '/scripts/study-bank/'
const R = D + 'map-math-g58-v2/'
const FROZEN = D + 'map-math-g58-v2.batch.json'
const INSERTED = D + 'map-math-g58-v2.inserted.batch.json'
const V1_FROZEN = D + 'map-math-g58-v1.batch.json'
export const COHORT = 'map-math-g58-v2'
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
  G: { key: 'geo', domain: 'Geometry', area25: 'Geometry' },
}
export const RIT = {
  5: { low: 'RIT 190-199', mid: 'RIT 200-209', high: 'RIT 210-219' },
  6: { low: 'RIT 200-209', mid: 'RIT 210-219', high: 'RIT 220-229' },
  7: { low: 'RIT 200-209', mid: 'RIT 210-219', high: 'RIT 220-229' },
  8: { low: 'RIT 210-219', mid: 'RIT 220-229', high: 'RIT 230-239' },
}
// 20 per area: grades 5-8 x low/mid/high (12) + 8 extras, the same in every area -> 5 per grade per area; low 6 / mid 7 / high 7
const EXTRAS = ['5mid', '5high', '6mid', '6high', '7low', '7high', '8low', '8mid']
export const TIER_TO_DIFF = { low: 'easy', mid: 'medium', high: 'hard' }
export const PER_AREA = 20

export function makeSlots() {
  const rand = rng(20261080)
  const out = []
  for (const [L, a] of Object.entries(AREAS)) {
    const cells = []
    for (const g of [5, 6, 7, 8]) for (const t of ['low', 'mid', 'high']) cells.push({ grade: g, tier: t })
    for (const e of EXTRAS) cells.push({ grade: +e[0], tier: e.slice(1) })
    // 12 extreme (6 S / 6 L) + 8 interior = 60% extreme, as v1; dealt by the seeded shuffle
    const p = shuffleWith([...Array(6).fill('S'), ...Array(6).fill('L'), ...Array(8).fill('I')], rand)
    const c = cells.sort((x, y) => x.grade - y.grade || ['low', 'mid', 'high'].indexOf(x.tier) - ['low', 'mid', 'high'].indexOf(y.tier))
    c.forEach((cell, i) => out.push({ id: `MM2-${L}${String(i + 1).padStart(2, '0')}`, letter: L, area: a.key, domain: a.domain, area25: a.area25, ...cell, rit: RIT[cell.grade][cell.tier], pos: p[i] }))
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
  if (!new RegExp(`^${s.grade}\\.(OA|NBT|NF|MD|G|RP|EE|NS|F)\\.`).test(cc)) out.push(`MAP ccss '${cc}' is not a grade-${s.grade} CCSS code for these areas`)
  const dom = cc.split('.')[1]
  const allowed = { oa: { 5: ['OA'], 6: ['RP', 'EE'], 7: ['RP', 'EE'], 8: ['EE', 'F'] }, num: { 5: ['NBT', 'NF'], 6: ['NS'], 7: ['NS'], 8: ['NS', 'EE'] }, geo: { 5: ['G', 'MD'], 6: ['G'], 7: ['G'], 8: ['G'] } }[s.area][s.grade]
  if (!allowed.includes(dom)) out.push(`MAP ccss domain ${dom} not in ${allowed.join('/')} for ${s.area} grade ${s.grade}`)
  if (s.area === 'oa' && s.grade === 8 && dom === 'EE' && /^8\.EE\.A/.test(cc)) out.push('MAP 8.EE.A (exponents, roots, scientific notation) is filed under num, not oa')
  if (s.area === 'num' && s.grade === 8 && dom === 'EE' && !/^8\.EE\.A/.test(cc)) out.push('MAP num at grade 8 takes 8.NS or 8.EE.A only')
  if (s.area === 'geo' && s.grade === 5 && dom === 'MD' && !/^5\.MD\.C/.test(cc)) out.push('MAP grade-5 geo takes 5.G or 5.MD.C (volume) only')
  for (const c of it.choices ?? []) if (!PLAIN.test(String(c))) out.push(`MAP option '${c}' is not a plain number (integer, decimal, a/b or "w a/b"; units and symbols go in the stem)`)
  if (it.graphic) out.push('MAP no graphic in these areas (describe every figure in words)')
  if (/[−]/.test(JSON.stringify([it.prompt, it.choices]))) out.push('MAP U+2212 minus; use ASCII -')
  const kp = keyPos(it)
  if (kp && kp !== s.pos) out.push(`MAP key position ${kp} != slot ${s.pos}`)
  for (const f of ['explanation', 'solve', 'subskill']) if (typeof it[f] !== 'string' || !it[f].trim()) out.push(`MAP ${f} missing`)
  if (!it.distractor_solve || Object.keys(it.distractor_solve).length !== 3) out.push('MAP distractor_solve needs exactly 3 entries')
  if (typeof it.grade_rationale !== 'string' || it.grade_rationale.trim().length < 40) out.push('MAP grade_rationale (>= 40 chars): why this is a <tier> item for grade <g>')
  return out
}

/* ------------------------------------------------------------------ v2 rule: no cheap bound strikes more than one distractor */
export const BOUND_KINDS = ['sign', 'magnitude', 'parity', 'units_digit', 'range']
export function printedNumbers(it) {
  const s = [it.prompt ?? '', ...((it.graphic?.cells ?? []).flat())].join(' ')
  const out = new Set()
  for (const m of s.matchAll(/(\d+)\s*\/\s*(\d+)|\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d*\.\d+|\d+/g)) {
    if (m[1] && m[2] && +m[2] !== 0) { out.add(+m[1] / +m[2]); out.add(+m[1]); out.add(+m[2]); continue }
    const v = Number(m[0].replace(/,/g, '')); if (Number.isFinite(v)) out.add(v)
  }
  return [...out]
}
export function boundScreen(it) {
  const out = [], soft = []
  const key = String(it.correct_answer), ch = (it.choices ?? []).map(String), dis = ch.filter(c => c !== key)
  const bs = it.bound_screen
  if (!Array.isArray(bs)) out.push('BOUND-SCREEN missing: one entry per kind (sign, magnitude, parity, units_digit, range)')
  else {
    const kinds = new Set(bs.map(b => b?.kind))
    for (const k of BOUND_KINDS) if (!kinds.has(k)) out.push(`BOUND-SCREEN no '${k}' entry`)
    for (const b of bs) {
      if (!BOUND_KINDS.includes(b?.kind)) { out.push(`BOUND-SCREEN unknown kind '${b?.kind}'`); continue }
      if (typeof b.bound !== 'string' || !b.bound.trim()) out.push(`BOUND-SCREEN ${b.kind}: bound text missing`)
      if (!Array.isArray(b.strikes)) { out.push(`BOUND-SCREEN ${b.kind}: strikes must be an array of options`); continue }
      const s = b.strikes.map(String)
      for (const x of s) if (!ch.includes(x)) out.push(`BOUND-SCREEN ${b.kind}: '${x}' is not an option`)
      if (s.includes(key)) out.push(`BOUND-SCREEN ${b.kind}: a valid bound cannot strike the key`)
      const nd = new Set(s.filter(x => dis.includes(x))).size
      if (nd > 1) out.push(`BOUND-SCREEN ${b.kind} '${String(b.bound).slice(0, 80)}' strikes ${nd} distractors (rule: at most one)`)
    }
  }
  // PRINTED: a number printed in the stem with two or more distractors beyond it from the key. Whether "answer < p"
  // is readable without solving is semantic, so this is a (read) line the author answers and the screen decides.
  const kv = val(key)
  if (Number.isFinite(kv)) for (const p of printedNumbers(it)) {
    if (eq(p, kv)) continue
    const beyond = dis.filter(d => { const v = val(d); return Number.isFinite(v) && (kv < p ? v > p && !eq(v, p) : v < p && !eq(v, p)) })
    if (beyond.length >= 2) soft.push(`PRINTED ${p}: key ${kv < p ? '<' : '>'} ${p} and ${beyond.join(', ')} lie beyond it; if "answer ${kv < p ? '<' : '>'} ${p}" is readable from the stem without the work, one bound strikes ${beyond.length} - say why it is not, in bound_screen (range)`)
  }
  return { out, soft }
}

export function checkItem(it) {
  const a = pairRun(it), d = directions(it), dp = dpair(it), ds = dsum(it), pl = plug(it), fr = far(it), kp = keyprint(it), st = struct(it), ia = inter(it)
  const bs = boundScreen(it)
  if (![a, d, dp, ds, pl, fr, kp, st].every(x => x.scored)) return { scored: false, gating: ['UNSCORABLE (non-numeric option set)', ...mapFields(it)], read: [] }
  return { scored: true, extreme: d.extreme, gating: [...a.out, ...d.out, ...dp.out, ...ds.out, ...pl.out, ...fr.out, ...kp.out, ...st.out, ...ia.out, ...mapFields(it), ...bs.out], read: [...a.soft, ...dp.soft, ...ds.soft, ...pl.soft, ...fr.soft, ...kp.soft, ...st.soft, ...ia.soft, ...bs.soft] }
}

/* ------------------------------------------------------------------ near-duplicate vs v1's items (prompt token-Jaccard, digits folded) */
const normT = s => String(s ?? '').toLowerCase().replace(/−/g, '-').replace(/\d+(\.\d+)?/g, ' # ').replace(/[^a-z#]+/g, ' ').trim()
const bag = s => new Set(normT(s).split(/\s+/).filter(w => w === '#' || w.length > 2))
export const jac = (a, b) => { if (!a.size || !b.size) return 0; let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i) }
export const DUP_J = 0.6
function v1Items() {
  const v1 = existsSync(V1_FROZEN) ? JSON.parse(readFileSync(V1_FROZEN, 'utf8')) : null
  if (!Array.isArray(v1) || v1.length !== 59) die('cannot read the 59 frozen v1 items for the near-duplicate check')
  const o15 = ROOT + '/scratchpad/map-math-g58-work/parts/MMG-O15.json'   // v1's stage-0 drop; best effort, it is also in the dump
  return existsSync(o15) ? [...v1, JSON.parse(readFileSync(o15, 'utf8'))] : v1
}

/* ------------------------------------------------------------------ bars (pure, break-tested) */
export const BAR = { ooMargin: 10, ooUnan: 15, ooCeiling: 90, tooEasy: 15.0, tooHard: 25.0, offset: 0.5, tierSpread: 0.5, extMinN: 10, areaFreezeMin: 15 }

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

/** the screen: the graders' free-elimination fields from one cold screener row -> the rule codes it would fire */
export function screenFails(it, s) {
  if (!s || typeof s !== 'object') return ['S-MISSING screener row missing']
  const ext = ['S', 'L'].includes(keyPos(it)), f = []
  const bools = ['key_identifiable_free', 'plugback_routine', 'one_sided', 'single_bound_kills_all']
  if (!Number.isFinite(+s.n_struck) || bools.some(k => typeof s[k] !== 'boolean')) return ['S-MALFORMED screener row malformed']
  if (val(s.my_answer) !== val(it.correct_answer) && String(s.my_answer).trim() !== String(it.correct_answer)) f.push(`S-KEY screener answered ${s.my_answer}`)
  if (+s.n_struck >= 2) f.push(`S-R4 ${s.n_struck} struck without solving: ${JSON.stringify(s.struck)} (${String(s.free_elimination ?? '').slice(0, 160)})`)
  if (s.key_identifiable_free === true) f.push('S-R5 key identifiable without solving')
  if (s.plugback_routine === true) f.push(`S-R6 plug-back routine at try ${s.plugback_tries}`)
  if (s.option_pair_tell != null && s.option_pair_tell !== '') f.push(`S-R7 option pair ${String(s.option_pair_tell).slice(0, 120)}`)
  if (ext && s.one_sided === true) f.push('S-R8 one-sided extreme key')
  if (ext && s.single_bound_kills_all === true) f.push(`S-R10 single bound kills all (${String(s.extreme_single_bound ?? '').slice(0, 100)})`)
  return f
}

/** F's vote on one flag: true / false / null (no vote: missing or malformed) */
export function fVote(code, F, earlierNamed) {
  if (!F || typeof F !== 'object') return null
  const b = k => typeof F[k] === 'boolean' ? F[k] : null
  if (code.startsWith('R6')) return b('plugback_routine')
  if (code.startsWith('R8')) return b('one_sided')
  if (code.startsWith('R10')) return b('single_bound_kills_all')
  if (code.startsWith('R7')) return F.option_pair_tell === undefined ? null : (F.option_pair_tell != null && F.option_pair_tell !== '')
  if (code.startsWith('R11')) return Array.isArray(F.same_template_as) ? F.same_template_as.some(x => earlierNamed.has(String(x))) : null
  return null
}

/**
 * per-item drop rules over two graders' stage-2 rows. F: grader F's cold row for this item, or undefined if the item
 * was not in the tie-break render. A one-grader flag: F yes -> drop, F no -> no drop, F no vote -> tie -> DROP.
 */
export function itemVerdict(it, a, b, F, earlier = new Set()) {
  const ext = ['S', 'L'].includes(keyPos(it))
  const drop = [], hold = [], need = []
  const both = f => f(a) && f(b), any = f => f(a) || f(b), one = f => !!f(a) !== !!f(b)
  if (any(g => g.key_ok === false)) drop.push('R1 key disputed')
  if (any(g => g.exclusive === false || (g.second_defensible != null && g.second_defensible !== ''))) drop.push('R2 not exclusive / second defensible')
  if (both(g => g.distractors_weak === true)) drop.push('R3 distractors weak (both)')
  if (both(g => (+g.n_struck || 0) >= 2)) drop.push('R4 two or more free strikes (both)')
  if (both(g => g.key_identifiable_free === true)) drop.push('R5 key identifiable without solving (both)')
  const named = new Set([a, b].flatMap(g => (g.same_template_as ?? []).map(String)).filter(x => earlier.has(x)))
  const flag = (code, f) => {
    if (both(f)) { drop.push(`${code} (both)`); return }
    if (!one(f)) return
    if (F === undefined) { need.push(code); return }
    const v = fVote(code, F, named)
    if (v === true) drop.push(`${code} (one grader + F)`)
    else if (v === null) drop.push(`${code} (one grader, F no vote: tie -> drop)`)
  }
  flag('R6 plug-back routine <= 2', g => g.plugback_routine === true)
  if (ext) { flag('R8 one-sided extreme key', g => g.one_sided === true); flag('R10 single bound kills all', g => g.single_bound_kills_all === true) }
  flag('R7 option pair', g => g.option_pair_tell != null && g.option_pair_tell !== '')
  flag('R11 template of an earlier item', g => (g.same_template_as ?? []).some(x => earlier.has(String(x))))
  if (any(g => g.drop_recommend === true)) drop.push('EXT-1 drop_recommend')
  if (both(g => g.grade_fit === 'too_easy')) drop.push('G1 too easy for its grade (both)')
  if (both(g => g.grade_fit === 'too_hard')) drop.push('G1 too hard for its grade (both)')
  if (both(g => g.on_blueprint === false)) hold.push('OFF off-blueprint (both)')
  return { drop: [...new Set(drop)], hold, need: [...new Set(need)], named: [...named], keep: !drop.length && !hold.length && !need.length }
}

export function bankedDifficulty(a, b) {
  const r = x => Math.min(3, Math.max(1, TIER_RANK[x.tier_assigned]))
  const m = (r(a) + r(b)) / 2
  return m <= 1.5 ? 'easy' : m >= 2.5 ? 'hard' : 'medium'
}

/** forms per level: per area floor(n / 10), the thinnest area binds */
export const FORM = { perArea: 10, areas: ['Operations and Algebraic Thinking', 'Real and Complex Number Systems', 'Statistics and Probability', 'Geometry'] }
export function formsFor(rows) {
  const by = Object.fromEntries(FORM.areas.map(a => [a, 0]))
  for (const r of rows) if (r.domain in by) by[r.domain]++
  const per = Object.fromEntries(Object.entries(by).map(([a, n]) => [a, Math.floor(n / FORM.perArea)]))
  return { counts: by, forms: Math.min(...Object.values(per)), per }
}

/* ------------------------------------------------------------------ selftest */
function selftest() {
  let bad = 0, n = 0
  const t = (cond, msg) => { n++; if (!cond) { bad++; console.error('FAIL', msg) } }
  t(SLOTS.length === 60 && new Set(SLOTS.map(s => s.id)).size === 60, 'slots 60 distinct')
  for (const L of Object.keys(AREAS)) { const s = SLOTS.filter(x => x.letter === L); t(s.length === 20 && s.filter(x => x.pos !== 'I').length === 12 && s.filter(x => x.pos === 'S').length === 6, `area ${L} 20 slots, 12 extreme (6 S)`); for (const g of [5, 6, 7, 8]) t(s.filter(x => x.grade === g).length === 5, `area ${L} grade ${g} 5 slots`); t(['low', 'mid', 'high'].map(tt => s.filter(x => x.tier === tt).length).join('/') === '6/7/7', `area ${L} tiers 6/7/7`) }
  t(JSON.stringify(makeSlots()) === JSON.stringify(SLOTS), 'slots deterministic')
  const arm = (hits, picks, unan, nn) => ({ hits, picks, unan, n: nn })
  t(ooVerdict(arm(42, 120, 6, 40), arm(30, 120, 4, 40)).status === 'pass', 'oo +10.0 exactly passes')
  t(ooVerdict(arm(43, 120, 6, 40), arm(30, 120, 4, 40)).status === 'hold', 'oo +10.8 holds')
  t(ooVerdict(arm(30, 120, 10, 40), arm(30, 120, 4, 40)).status === 'pass', 'oo unanimity +15.0 passes')
  t(ooVerdict(arm(30, 120, 11, 40), arm(30, 120, 4, 40)).status === 'hold', 'oo unanimity +17.5 holds')
  t(ooVerdict(arm(110, 120, 6, 40), arm(109, 120, 4, 40)).status === 'not-measured', 'oo control 90.8% above ceiling: not measured')
  t(ooVerdict(arm(110, 120, 6, 40), arm(108, 120, 4, 40)).status === 'pass', 'oo control 90.0% at ceiling: measured')
  t(ooVerdict(arm(0, 0, 0, 0), arm(30, 120, 4, 40)).status === 'no-measurement', 'oo empty arm: no number')
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
  // item rules incl. the v2 tie-break
  const it = { correct_answer: '14', choices: ['2', '5', '9', '14'] }, ok = { key_ok: true, exclusive: true, second_defensible: null, n_struck: 0, plugback_routine: false, one_sided: false, single_bound_kills_all: false, option_pair_tell: null, same_template_as: [], drop_recommend: false, grade_fit: 'fits', on_blueprint: true, distractors_weak: false, key_identifiable_free: false }
  t(itemVerdict(it, ok, ok).keep, 'clean item kept')
  t(itemVerdict(it, { ...ok, key_ok: false }, ok).drop.length === 1, 'key disputed by one grader drops')
  t(itemVerdict(it, { ...ok, n_struck: 2 }, ok).keep && itemVerdict(it, { ...ok, n_struck: 2 }, { ...ok, n_struck: 3 }).drop.length === 1, 'R4 needs both')
  t(itemVerdict(it, { ...ok, one_sided: true }, ok).need.length === 1, 'one-grader one_sided without F: needs the tie-break')
  t(itemVerdict(it, { ...ok, one_sided: true }, ok, { ...ok, one_sided: true }).drop.some(x => /F\)/.test(x)), 'one grader + F yes: 2 of 3 drops')
  t(itemVerdict(it, { ...ok, one_sided: true }, ok, { ...ok }).keep, 'one grader + F no: 1 of 3 keeps')
  t(itemVerdict(it, { ...ok, one_sided: true }, ok, { ...ok, one_sided: 'yes' }).drop.some(x => /tie/.test(x)), 'F malformed: tie -> drop')
  t(itemVerdict(it, { ...ok, one_sided: true }, ok, {}).drop.some(x => /tie/.test(x)), 'F row missing the field: tie -> drop')
  t(itemVerdict(it, { ...ok, one_sided: true }, { ...ok, one_sided: true }).drop.length === 1, 'both graders one_sided drops without F')
  t(itemVerdict({ correct_answer: '5', choices: ['2', '5', '9', '14'] }, { ...ok, one_sided: true }, { ...ok, one_sided: true }).keep, 'one_sided ignored on an interior key')
  t(itemVerdict(it, { ...ok, option_pair_tell: '14 = 2 x 7' }, { ...ok, option_pair_tell: '14 - 5' }).drop.length === 1, 'R7 by both drops')
  t(itemVerdict(it, { ...ok, option_pair_tell: '14 = 2 x 7' }, ok, { ...ok, option_pair_tell: null }).keep, 'R7 by one + F null keeps')
  t(itemVerdict(it, { ...ok, option_pair_tell: '14 = 2 x 7' }, ok, { ...ok, option_pair_tell: '2 and 14 by 7' }).drop.length === 1, 'R7 by one + F names a pair drops')
  t(itemVerdict(it, { ...ok, grade_fit: 'too_easy' }, ok).keep && !itemVerdict(it, { ...ok, grade_fit: 'too_easy' }, { ...ok, grade_fit: 'too_easy' }).keep, 'G1 needs both')
  t(itemVerdict(it, { ...ok, on_blueprint: false }, { ...ok, on_blueprint: false }).hold.length === 1, 'off-blueprint by both holds')
  const E = new Set(['MM2-O01'])
  t(itemVerdict(it, { ...ok, same_template_as: ['MM2-O01'] }, { ...ok, same_template_as: ['MM2-O01'] }, undefined, E).drop.length === 1, 'template of an earlier item by both drops')
  t(itemVerdict(it, { ...ok, same_template_as: ['MM2-O01'] }, ok, { ...ok, same_template_as: ['MM2-O01'] }, E).drop.length === 1 && itemVerdict(it, { ...ok, same_template_as: ['MM2-O01'] }, ok, { ...ok, same_template_as: [] }, E).keep, 'R11 one + F decides')
  t(itemVerdict(it, { ...ok, same_template_as: ['MM2-O09'] }, ok, undefined, E).keep, 'template of a LATER item is not R11')
  t(bankedDifficulty({ tier_assigned: 'low' }, { tier_assigned: 'mid' }) === 'easy' && bankedDifficulty({ tier_assigned: 'mid' }, { tier_assigned: 'high' }) === 'hard' && bankedDifficulty({ tier_assigned: 'below_grade' }, { tier_assigned: 'above_grade' }) === 'medium', 'banked difficulty mapping')
  // screen
  const sOk = { my_answer: '14', n_struck: 1, struck: ['2'], key_identifiable_free: false, plugback_routine: false, one_sided: false, single_bound_kills_all: false, option_pair_tell: null }
  t(screenFails(it, sOk).length === 0, 'screen: one strike passes')
  t(screenFails(it, { ...sOk, n_struck: 2 }).length === 1, 'screen: two strikes fail')
  t(screenFails(it, { ...sOk, my_answer: '9' }).some(x => x.startsWith('S-KEY')), 'screen: wrong answer flags')
  t(screenFails(it, { ...sOk, plugback_routine: 'no' })[0].startsWith('S-MALFORMED') && screenFails(it, undefined)[0].startsWith('S-MISSING'), 'screen: malformed / missing row never passes')
  t(screenFails({ correct_answer: '5', choices: ['2', '5', '9', '14'] }, { ...sOk, my_answer: '5', one_sided: true }).length === 0, 'screen: one_sided ignored on interior key')
  // bound screen
  const bsOk = BOUND_KINDS.map(k => ({ kind: k, bound: 'x', strikes: k === 'sign' ? ['2'] : [] }))
  const bit = { prompt: 'A tank holds 3 liters.', choices: ['2', '5', '9', '14'], correct_answer: '14', bound_screen: bsOk }
  t(boundScreen(bit).out.length === 0, `bound screen: one strike per bound passes (${boundScreen(bit).out.join('; ')})`)
  t(boundScreen({ ...bit, bound_screen: bsOk.map(b => b.kind === 'range' ? { ...b, strikes: ['2', '5'] } : b) }).out.length === 1, 'bound screen: a bound striking two distractors fails')
  t(boundScreen({ ...bit, bound_screen: bsOk.filter(b => b.kind !== 'parity') }).out.length === 1, 'bound screen: a missing kind fails')
  t(boundScreen({ ...bit, bound_screen: bsOk.map(b => b.kind === 'sign' ? { ...b, strikes: ['14'] } : b) }).out.length === 1, 'bound screen: striking the key fails')
  t(boundScreen({ ...bit, bound_screen: undefined }).out.length === 1, 'bound screen: missing field fails')
  t(boundScreen({ ...bit, prompt: 'A tank holds 7 liters.' }).soft.length === 1 && boundScreen(bit).soft.length === 0, 'PRINTED fires at 7 (2 and 5 beyond, key 14 above), silent at 3 (only 2 beyond)')
  t(boundScreen({ ...bit, prompt: 'A tank holds 1 liter.' }).soft.length === 0, 'PRINTED silent when fewer than two lie beyond')
  t(printedNumbers({ prompt: 'Mix 3/4 cup with 1,200 grams and 2.5 liters' }).includes(0.75) && printedNumbers({ prompt: '1,200' }).includes(1200), 'printed numbers parse fractions and thousands')
  // near-dup fold
  t(jac(bag('A pool holds 300 liters and drains 12 liters per minute'), bag('A pool holds 450 liters and drains 15 liters per minute')) === 1, 'near-dup folds digits')
  // extremity
  const ex = (nn, e) => Array.from({ length: nn }, (_, i) => ({ choices: ['2', '5', '9', '14'], correct_answer: i < e ? (i % 2 ? '14' : '2') : '5' }))
  t(keyExtremityVerdict(ex(10, 4)).status === 'pass' && keyExtremityVerdict(ex(10, 3)).status === 'fail' && keyExtremityVerdict(ex(9, 9)).status === 'no-measurement', 'extremity 4/10 pass, 3/10 fail, n=9 no measurement')
  // forms
  const fr = (o, nn, d, g) => [...Array(o).fill(FORM.areas[0]), ...Array(nn).fill(FORM.areas[1]), ...Array(d).fill(FORM.areas[2]), ...Array(g).fill(FORM.areas[3])].map(domain => ({ domain }))
  t(formsFor(fr(25, 20, 19, 40)).forms === 1 && formsFor(fr(25, 20, 20, 40)).forms === 2 && formsFor(fr(25, 20, 0, 40)).forms === 0, 'forms: thinnest area binds (19 -> 1, 20 -> 2, 0 -> 0)')
  // map fields
  const s = SLOTS.find(x => x.grade === 6 && x.area === 'oa')
  const good = { id: s.id, domain: s.domain, map_area: 'oa', grade_target: 6, tier: s.tier, rit_band: s.rit, difficulty: TIER_TO_DIFF[s.tier], ccss: '6.EE.B.7', choices: ['2', '5', '9', '14'], correct_answer: { S: '2', L: '14', I: '5' }[s.pos], explanation: 'x', solve: 'return 1', subskill: 'x', distractor_solve: { a: 1, b: 2, c: 3 }, grade_rationale: 'y'.repeat(45) }
  t(mapFields(good).length === 0, `well-formed MAP fields pass (${mapFields(good).join('; ')})`)
  t(mapFields({ ...good, ccss: '7.EE.B.4' }).length > 0, 'wrong-grade CCSS refused')
  t(mapFields({ ...good, ccss: '6.SP.B.5' }).length > 0, 'Statistics and Probability CCSS refused this round')
  t(mapFields({ ...good, choices: ['2 cm', '5', '9', '14'] }).length > 0, 'unit in an option refused')
  t(mapFields({ ...good, correct_answer: { S: '5', L: '5', I: '14' }[s.pos] }).some(x => x.includes('key position')), 'key off its slot position refused')
  t(mapFields({ ...good, id: 'MM2-D01' }).length > 0, 'no D slots this round')
  if (bad) { console.error(`SELFTEST FAILED ${bad}/${n}`); process.exit(2) }
  console.log(`selftest ${n}/${n} (slots 3 x 20; options-only +10.0 / +10.8, unanimity +15.0 / +17.5, ceiling 90.0 / 90.8; D1 15.0 / 16.25, 25.0 / 26.25; D2 -0.5 / +-0.75; D3 0.5 / 0; item rules incl. tie-break 2-of-3 and tie -> drop; screen; bound screen; PRINTED; extremity 4/10 / 3/10 / n=9; forms; MAP fields)`)
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
  if (cmd === 'screen-render') return cmdScreenRender(process.argv[3])
  if (cmd === 'screen-score') return cmdScreenScore(process.argv[3])
  if (cmd === 'freeze') return cmdFreeze()
  if (cmd === 'oo') return cmdOo()
  if (cmd === 'grade') return cmdGrade()
  if (cmd === 'stage') return cmdStage(process.argv[3], process.argv[4], process.argv[5])
  if (cmd === 'coldcheck') return cmdColdcheck()
  if (cmd === 'score') return cmdScore()
  if (cmd === 'tiebreak') return cmdTiebreak()
  if (cmd === 'build') return cmdBuild()
  if (cmd === 'insert') return cmdInsert(process.argv.includes('--commit'))
  if (cmd === 'forms') return cmdForms()
  die('usage: see the header of map-math-g58-v2.mjs')
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
  const v1 = v1Items(), cb = bag(it.prompt)
  let best = { j: 0 }; for (const x of v1) { const j = jac(cb, bag(x.prompt)); if (j > best.j) best = { j, id: x.id } }
  console.log(`  near-dup v1 (${v1.length} items): best ${best.id ?? '-'} j=${best.j.toFixed(2)}${best.j >= DUP_J ? '  FLAG (a v1 item re-skinned; write a new mechanism)' : ''}`)
  if (best.j >= DUP_J) bad = 1
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
  const keys = {}; for (const it of items) (keys[String(val(it.correct_answer))] ??= []).push(it.id)
  const rep = Object.entries(keys).filter(([, v]) => v.length > 1)
  for (const [k, v] of rep) console.log(`  cross-item: key value ${k} repeated on ${v.join(', ')}`)
  let wdup = 0
  for (let i = 0; i < items.length; i++) for (let k = i + 1; k < items.length; k++) { const j = jac(bag(items[i].prompt), bag(items[k].prompt)); if (j >= DUP_J) { wdup++; console.log(`  within-batch near-dup ${items[i].id} ~ ${items[k].id} j=${j.toFixed(2)}`) } }
  const kx = keyExtremityVerdict(items)
  console.log(`items ${items.length}; with a gating finding ${gating}; repeated key values ${rep.length}; within-batch near-dups ${wdup}; key extremity ${kx.status} - ${kx.reason}`)
  for (const L of Object.keys(AREAS)) { const a = items.filter(i => i.id.startsWith(`MM2-${L}`)); const v = keyExtremityVerdict(a); console.log(`  ${AREAS[L].key.padEnd(5)} n ${a.length}  extremity ${v.status} ${Number.isFinite(v.rate) ? f1(100 * v.rate) + '%' : ''}`) }
  const g = {}; for (const it of items) { const k = `g${it.grade_target} ${it.tier}`; g[k] = (g[k] ?? 0) + 1 }
  console.log(`  by grade x tier ${JSON.stringify(g)}`)
  return { gating, rep: rep.length, wdup }
}

function cmdAssemble() {
  const items = loadParts()
  console.log(`parts on disk ${items.length} of ${SLOTS.length}; missing ${SLOTS.filter(s => !items.find(i => i.id === s.id)).map(s => s.id).join(' ') || 'none'}`)
  writeFileSync(WORK + '/assembled.json', JSON.stringify(items, null, 1) + '\n')
  batchReport(items)
}

/* ---- the pre-freeze screen: cold, the graders' free-elimination fields */
const TIER_WORDS = { low: 'low (easier than typical for this grade: most students in the grade answer it correctly)', mid: 'mid (typical for this grade: about half of students in the grade answer it correctly)', high: 'high (harder than typical for this grade: only stronger students in the grade answer it correctly)' }
function coldBlock(it, opts) {
  return `\n---\n\n## ${it.id}\n\nArea: ${it.domain} | Target grade: ${it.grade_target} | Target tier: ${TIER_WORDS[it.tier]}\n\nQuestion: ${it.prompt}\n\n${opts.map((o, j) => `${'ABCD'[j]}. ${o}`).join('\n')}\n`
}
function cmdScreenRender(pass) {
  if (!['1', '2'].includes(pass)) die('screen-render <1|2>')
  const all = rd(WORK + '/assembled.json')
  let items
  if (pass === '1') items = shuffleWith(all, rng(20261085))
  else { const p1 = rd(WORK + '/screen-p1.json'); const ret = Object.keys(p1.fails); items = all.filter(i => ret.includes(i.id)); if (!items.length) die('no item was returned in pass 1') }
  const groups = pass === '1' ? [['p1-a', items.slice(0, Math.ceil(items.length / 2))], ['p1-b', items.slice(Math.ceil(items.length / 2))]] : [['p2-a', items]]
  const rand = rng(pass === '1' ? 20261086 : 20261087)
  for (const [name, part] of groups) {
    const dir = `${WORK}/screen/${name}`; mkdirSync(dir, { recursive: true })
    let md = `# Items for screening (${part.length})\n\nEach item: id, area, target grade and tier, the question, four options. The correct answer is NOT marked.\n`
    part.forEach((it, i) => { const L = 'ABCD'[i % 4], rest = shuffleWith(it.choices.map(String).filter(c => c !== String(it.correct_answer)), rand); let q = 0; md += coldBlock(it, [...'ABCD'].map(s => s === L ? String(it.correct_answer) : rest[q++])) })
    writeFileSync(`${dir}/screen.md`, md)
    console.log(`${dir}/screen.md  ${part.length} items  sha ${sha(dir + '/screen.md').slice(0, 16)}`)
  }
}
function cmdScreenScore(pass) {
  if (!['1', '2'].includes(pass)) die('screen-score <1|2>')
  const all = Object.fromEntries(rd(WORK + '/assembled.json').map(i => [i.id, i]))
  const names = pass === '1' ? ['p1-a', 'p1-b'] : ['p2-a']
  const rows = {}
  for (const nm of names) { const j = rd(`${WORK}/screen/${nm}/screen.json`); const md = readFileSync(`${WORK}/screen/${nm}/screen.md`, 'utf8'); for (const id of [...md.matchAll(/^## (MM2-[A-Z]\d\d)$/gm)].map(m => m[1])) rows[id] = j[id] ?? null }
  if (!Object.keys(rows).length) die('no screened ids')
  const fails = {}
  for (const [id, s] of Object.entries(rows)) { const f = screenFails(all[id], s); if (f.length) fails[id] = f }
  for (const [id, f] of Object.entries(fails)) console.log(`  ${id}  ${f.join(' | ')}`)
  console.log(`screen pass ${pass}: ${Object.keys(rows).length} screened, ${Object.keys(fails).length} fail`)
  writeFileSync(`${WORK}/screen-p${pass}.json`, JSON.stringify({ screened: Object.keys(rows).length, fails }, null, 1) + '\n')
  if (pass === '2') {
    const drops = existsSync(WORK + '/stage0-drops.json') ? rd(WORK + '/stage0-drops.json') : {}
    for (const [id, f] of Object.entries(fails)) drops[id] = `stage-0 drop: still fails the screen after its one return: ${f.join(' | ')}`
    writeFileSync(WORK + '/stage0-drops.json', JSON.stringify(drops, null, 1) + '\n')
    console.log(`stage0-drops.json now holds ${Object.keys(drops).length}`)
  }
}

function cmdFreeze() {
  const items = rd(WORK + '/assembled.json')
  if (!existsSync(WORK + '/screen-p1.json')) die('the screen has not run (screen-p1.json missing)')
  const p1 = rd(WORK + '/screen-p1.json')
  if (Object.keys(p1.fails).length && !existsSync(WORK + '/screen-p2.json')) die('pass-1 screen fails exist and pass 2 has not run')
  const drops = existsSync(WORK + '/stage0-drops.json') ? rd(WORK + '/stage0-drops.json') : {}
  const kept = items.filter(it => !drops[it.id])
  for (const L of Object.keys(AREAS)) { const n = kept.filter(i => i.id.startsWith(`MM2-${L}`)).length; if (n < BAR.areaFreezeMin) die(`area ${AREAS[L].key} keeps ${n} < ${BAR.areaFreezeMin}: the batch stops (stage 0)`, 1) }
  const r = batchReport(kept)
  if (r.gating) die(`${r.gating} frozen item(s) fail a gating check`, 1)
  const order = shuffleWith(kept.map(i => i.id), rng(20261081))
  const frozen = order.map(id => kept.find(i => i.id === id))
  writeFileSync(FROZEN, JSON.stringify(frozen, null, 1) + '\n')
  mkdirSync(R, { recursive: true })
  writeFileSync(R + 'stage0-drops.json', JSON.stringify(drops, null, 1) + '\n')
  for (const f of ['screen-p1.json', 'screen-p2.json']) if (existsSync(`${WORK}/${f}`)) copyFileSync(`${WORK}/${f}`, R + f)
  console.log(`FROZEN ${frozen.length} items -> ${FROZEN}\n  sha256 ${sha(FROZEN)}\n  dropped at stage 0: ${Object.keys(drops).join(' ') || 'none'}`)
}

/* ---- options-only: candidates vs a 1:1 matched live ISEE control (v1's rule) */
const STATS = /probab|median|mean\b|average|data|statistic|frequency|percentile|standard deviation|scatter|survey|sampl|histogram|range of|mode\b|expected value|chance/i
const GEOM = /triangle|circle|area|volume|perimeter|angle|polygon|coordinate|distance between|slope|cone|cylinder|sphere|rectang|square|cube|surface|radius|diameter|arc|chord|similar|congruen|trig|sine|cosine|tangent|parallelogram|trapezoid|hexagon|pythag/i
const NUMSYS = /prime|factor|divisib|multiple|digit|fraction|decimal|exponent|radical|root|integer|irrational|complex|scientific notation|remainder|gcd|lcm|reciprocal|absolute value|number line|place value/i
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
  const rand = rng(20261082), shuffle = a => shuffleWith(a.slice(), rand)
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

/* ---- with-source renders: halves h1 / h2 */
function cmdGrade() {
  const frozen = rd(FROZEN), h = Math.ceil(frozen.length / 2)
  mkdirSync(R, { recursive: true })
  for (const [hn, part] of [['h1', frozen.slice(0, h)], ['h2', frozen.slice(h)]]) {
    const rand = rng(hn === 'h1' ? 20261083 : 20261084)
    let md = `# Items for review (${part.length})\n\nEach item: id, area, target grade and target tier, the question, four options. The correct answer is NOT marked.\n`
    let kd = `# Items for review, KEYED (${part.length})\n\nThe same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.\n`
    const keyj = {}
    part.forEach((it, i) => {
      const L = ['A', 'B', 'C', 'D'][i % 4], rest = shuffleWith(it.choices.map(String).filter(c => c !== String(it.correct_answer)), rand)
      let q = 0; const opts = ['A', 'B', 'C', 'D'].map(s => s === L ? String(it.correct_answer) : rest[q++])
      keyj[it.id] = { letter: L, choices: opts }
      const head = coldBlock(it, opts)
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
    for (const id of Object.keys(s1).filter(k => k.startsWith('MM2-'))) {
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
  for (const area of ['all', 'oa', 'num', 'geo']) {
    const arm = kind => { const s = ids.filter(i => key[i].kind === kind && (area === 'all' || key[i].area === area)); let hits = 0, unan = 0; for (const i of s) { const h = sol.filter(m => String(m[i].pick).trim().toUpperCase() === key[i].letter).length; hits += h; if (h === 3) unan++ } return { n: s.length, picks: 3 * s.length, hits, unan } }
    const c = arm('candidate'), k = arm('live-control')
    res[area] = { cand: c, ctrl: k, ...ooVerdict(c, k) }
  }
  const dist = {}; for (const i of ids) dist[key[i].letter] = (dist[key[i].letter] ?? 0) + 1
  return { res, letterControl: pct(Math.max(...Object.values(dist)), ids.length) }
}

function loadF() {
  const p = `${WORK}/grade/f-tb/stage1.json`
  if (!existsSync(R + 'tb.key.json')) return null
  const key = rd(R + 'tb.key.json')
  if (!existsSync(p)) die('tie-break render exists but grader F has not written stage1.json')
  return { key, rows: rd(p) }
}

function cmdScore() {
  const frozen = rd(FROZEN)
  const out = { prereg: 'MAP-MATH-G58-V2.prereg.md', frozenSha: sha(FROZEN), n: frozen.length }
  const oo = scoreOo(); out.optionsOnly = oo
  console.log(`OPTIONS-ONLY (3 samples; letter control ${f1(oo.letterControl)}%)`)
  for (const [a, r] of Object.entries(oo.res)) console.log(`  ${a.padEnd(5)} cand ${r.cand.hits}/${r.cand.picks}  ctrl ${r.ctrl.hits}/${r.ctrl.picks}  ${r.status.toUpperCase()}  ${r.why}`)
  const G = {}; for (const g of ['d', 'e']) { G[g] = {}; for (const h of ['h1', 'h2']) { const { s2 } = loadGrader(g, h); for (const [id, row] of Object.entries(s2)) if (id.startsWith('MM2-')) G[g][id] = row } }
  const missing = frozen.filter(i => !G.d[i.id] || !G.e[i.id]).map(i => i.id); if (missing.length) die(`grader rows missing for ${missing.join(' ')}`)
  const diff = difficultyBars(frozen.map(it => ({ tier: it.tier, grade: it.grade_target, a: G.d[it.id], b: G.e[it.id] })))
  out.difficulty = diff
  console.log(`DIFFICULTY over ${diff.n} frozen (${diff.judgments} judgments): too_easy ${diff.tooEasy} = ${f1(diff.tooEasyPct)}% (bar <= ${BAR.tooEasy}), too_hard ${diff.tooHard} = ${f1(diff.tooHardPct)}% (bar <= ${BAR.tooHard}) D1 ${diff.D1 ? 'PASS' : 'FAIL'}; offset d ${diff.offA?.toFixed(2)} e ${diff.offB?.toFixed(2)} (bar +-${BAR.offset}) D2 ${diff.D2 ? 'PASS' : 'FAIL'}; tier spread d ${diff.spreadA?.toFixed(2)} e ${diff.spreadB?.toFixed(2)} (bar >= ${BAR.tierSpread}) D3 ${diff.D3 ? 'PASS' : 'FAIL'}`)
  const byArea = {}; for (const it of frozen) { const a = (byArea[it.map_area] ??= { easy: 0, hard: 0, n: 0 }); a.n++; for (const g of ['d', 'e']) { if (G[g][it.id].grade_fit === 'too_easy') a.easy++; if (G[g][it.id].grade_fit === 'too_hard') a.hard++ } }
  console.log(`  too_easy / too_hard by area: ${Object.entries(byArea).map(([a, v]) => `${a} ${v.easy}/${v.hard} of ${2 * v.n}`).join(', ')}`)
  const coldOn = frozen.reduce((s, it) => s + ['d', 'e'].filter(g => val(G[g][it.id].my_answer) === val(it.correct_answer) || String(G[g][it.id].my_answer).trim() === String(it.correct_answer)).length, 0)
  out.coldOnKey = coldOn
  const F = loadF()
  const items = {}, needs = []
  frozen.forEach((it, i) => {
    const earlier = new Set(frozen.slice(0, i).map(x => x.id))
    const inTb = F && F.key.items?.[it.id]
    const v = itemVerdict(it, G.d[it.id], G.e[it.id], inTb ? (F.rows[it.id] ?? {}) : undefined, earlier)
    items[it.id] = { ...v, difficulty: bankedDifficulty(G.d[it.id], G.e[it.id]) }
    // a flag on an item another rule already drops needs no tie-break
    if (v.need.length && !v.drop.length && !v.hold.length) needs.push({ id: it.id, codes: v.need, named: v.named })
    else if (v.need.length) items[it.id].need = []
    items[it.id].keep = !items[it.id].drop.length && !items[it.id].hold.length && !items[it.id].need.length
  })
  out.items = items
  if (needs.length) {
    if (F) die(`tie-break already ran but ${needs.length} item(s) still need it: ${needs.map(n => n.id).join(' ')}`)
    writeFileSync(WORK + '/tb-needs.json', JSON.stringify(needs, null, 1) + '\n')
    console.log(`TIE-BREAK NEEDED (${needs.length}): ${needs.map(n => `${n.id} [${n.codes.join(', ')}]`).join('; ')}\n  run: map-math-g58-v2.mjs tiebreak`)
    writeFileSync(R + 'stages.json', JSON.stringify({ ...out, verdict: 'INCOMPLETE' }, null, 1) + '\n'); process.exit(1)
  }
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

/* ---- tie-break render for grader F: the flagged items (and, for R11, the earlier items a grader named), cold */
function cmdTiebreak() {
  const needs = rd(WORK + '/tb-needs.json'); if (!needs.length) die('no tie-break needs')
  if (existsSync(R + 'tb.key.json')) die('tie-break render already exists; it is made once')
  const frozen = rd(FROZEN), keys = { ...rd(R + 'ws-h1.key.json'), ...rd(R + 'ws-h2.key.json') }
  const ids = new Set(needs.map(n => n.id)); for (const n of needs) if (n.codes.some(c => c.startsWith('R11'))) for (const x of n.named) ids.add(x)
  const part = frozen.filter(i => ids.has(i.id))
  let md = `# Items for review (${part.length})\n\nEach item: id, area, target grade and target tier, the question, four options. The correct answer is NOT marked.\n`
  for (const it of part) md += coldBlock(it, keys[it.id].choices)
  writeFileSync(R + 'tb.md', md)
  writeFileSync(R + 'tb.key.json', JSON.stringify({ items: Object.fromEntries(needs.map(n => [n.id, n.codes])), context: [...ids].filter(x => !needs.find(n => n.id === x)) }, null, 1) + '\n')
  const dir = `${WORK}/grade/f-tb`; mkdirSync(dir, { recursive: true }); copyFileSync(R + 'tb.md', dir + '/grade.md')
  console.log(`tie-break render ${part.length} items (${needs.length} flagged) -> ${R}tb.md, sha ${sha(R + 'tb.md').slice(0, 16)}; folder ${dir}`)
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
      graphic: null, passage: null, passageGroupId: null, blanks: null, correct_answers: null, acceptable_answers: null,
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
  const c0 = await db()
  const { count: liveMap, error: ce } = await c0.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('family', 'map').eq('verified', true).eq('archived', false)
  if (ce || typeof liveMap !== 'number') die(`cannot count live map rows: ${ce?.message}`)
  console.log(`live verified map rows: ${liveMap}${liveMap === 0 ? ' -> stem-duplicate check runs within the batch only' : ''}`)
  const g = gateBatch({ task: 'multiple_choice', family: 'map', section: 'math', itemFiles: [INSERTED], ...(liveMap === 0 ? { liveStems: [] } : {}) })
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
      method: 'map-math-g58-v2: claude-authored, sandbox key + distractor recompute, stage-0 mechanical checks + declared bound screen + cold pre-freeze screener, options-only vs matched live ISEE control (per area), two Claude graders cold then keyed incl. grade fit, one-grader flags decided 2-of-3 by a third cold grader',
      staged: true, release: 'NOT released. MAP is not a shipped family; a person releases (human sitting, decision rule fixed before the draw). Never verified=true from a script.',
      localId: id, map, solve, prereg: 'scripts/study-bank/MAP-MATH-G58-V2.prereg.md', contentSha: g.sha,
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

/* ---- forms projection: the staged v1 + v2 pool, per level (MAP-LAUNCH-PLAN §1: Math 40 = 10 per area; §3 levels) */
async function cmdForms() {
  const c = await db()
  const { data, error } = await c.from('study_item_bank').select('id,cohort,domain,difficulty,verified,verify_meta').eq('family', 'map').eq('section', 'math').eq('archived', false).in('cohort', ['map-math-g58-v1', COHORT])
  if (error) die(error.message)
  if (!data.length) die('no staged map/math rows read')
  const bad = data.filter(r => !Number.isFinite(+r.verify_meta?.map?.grade_target)); if (bad.length) die(`${bad.length} rows without verify_meta.map.grade_target`)
  console.log(`staged map/math rows read: ${data.length} (${['map-math-g58-v1', COHORT].map(k => `${k} ${data.filter(r => r.cohort === k).length}`).join(', ')}); verified=true among them: ${data.filter(r => r.verified).length}`)
  const levels = [['grade 5', [5]], ['grade 6', [6]], ['grade 7', [7]], ['grade 8', [8]], ['Lower (5-6)', [5, 6]], ['Middle (7-8)', [7, 8]], ['grades 5-8 pooled', [5, 6, 7, 8]]]
  const res = {}
  for (const [name, gs] of levels) {
    const rows = data.filter(r => gs.includes(+r.verify_meta.map.grade_target))
    const f = formsFor(rows); res[name] = f
    console.log(`  ${name.padEnd(18)} ${FORM.areas.map(a => `${a.split(' ')[0].slice(0, 4)} ${f.counts[a]}`).join('  ')}  -> ${f.forms} form(s) of 40 (thinnest area binds)`)
  }
  return res
}

// run last: main() reaches module-scope consts declared below the command table
if (isMain) await main()
