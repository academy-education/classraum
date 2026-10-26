#!/usr/bin/env node
/**
 * math-check.mjs <author-file.json> — per-item author check for map-v2 Math batch 1. Run from the repo root:
 *   node scripts/study-bank/map-v2-work/math/math-check.mjs <file>
 *
 * The map-math-g58-v5 part check made general (v5 is the batch that passed), with its slot table replaced by
 * slots.json and its rules split by evidence:
 *   ALL AREAS, refusing: sandbox key + every distractor recomputed (math-bank-helper.mjs verify); slot fields
 *     (grade, tier, rit_band, difficulty, key position by VALUE S/L/I); grade CCSS code and domain; plain-number
 *     options; LONE (no option alone by sign or size); bound_screen (no declared bound strikes two distractors);
 *     three distinct named misconceptions; and the imported mf27-mf30 construction checks (option pairs, error
 *     directions, derived pairs and sums, plug-back order, far distractor, key-print, structure words, solved
 *     intermediates) that v3 and v5 ran.
 *   REAL AND COMPLEX NUMBER SYSTEMS, also refusing: FORM (every option in the key's surface form, exact final
 *     digit) and SLIP (at most one computational slip): the two rules that moved Number Systems from +19.4 (v3)
 *     to +1.8 (v4) and to a pass (v5). In the other areas they print as (read) lines: v3 Operations (+3.6) and
 *     Geometry (+0.0) passed options-only without them, and v5 left 18 of 44 slots empty under them.
 *   Near-duplicate vs live ISEE and SSAT maths (check-math-near-dup.mjs) and vs every earlier MAP maths item.
 * Exits 2 on unreadable input, 1 if any item fails, 0 only when every item prints PART OK.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { val, scoreItem } from '../../key-extremity-breakdown.mjs'
import { pairRun, directions } from '../../algf27-checks.mjs'
import { dpair, plug } from '../../mf28-checks.mjs'
import { dsum, far } from '../../mf29-checks.mjs'
import { keyprint, struct, inter } from '../../mf30-checks.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '../../../..'), SB = join(ROOT, 'scripts/study-bank')
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
// Batch 2 (2026-10-24): --slots <slots.json> --prior <prior-math.json> --families isee,ssat,map. All three default
// to batch 1's values, so `math-check.mjs <file>` behaves exactly as it did for batch 1.
const ARGS = process.argv.slice(2)
const opt = (n, d) => { const i = ARGS.indexOf(n); if (i < 0) return d; if (!ARGS[i + 1] || ARGS[i + 1].startsWith('--')) die(`${n} needs a value`); return ARGS[i + 1] }
const OPTS = ['--slots', '--prior', '--families']
const file = ARGS.find((a, i) => !a.startsWith('--') && !OPTS.includes(ARGS[i - 1]))
const SLOTS_PATH = opt('--slots', join(HERE, 'slots.json'))
const PRIOR_PATH = opt('--prior', null)
const FAMILIES = opt('--families', 'isee,ssat').split(',').filter(Boolean)
if (!FAMILIES.length || FAMILIES.some(f => !['isee', 'ssat', 'map', 'sat', 'act'].includes(f))) die(`--families: unknown family in '${FAMILIES.join(',')}'`)
if (!file || !existsSync(file)) die(`no such file: ${file}`)
if (!existsSync(SLOTS_PATH)) die(`no such slots file: ${SLOTS_PATH}`)
let items; try { items = JSON.parse(readFileSync(file, 'utf8')) } catch (e) { die('unparseable JSON: ' + e.message) }
if (!Array.isArray(items) || !items.length) die('expected a non-empty JSON array')
const SL = JSON.parse(readFileSync(SLOTS_PATH, 'utf8'))
if (!Object.values(SL).length || Object.values(SL).some(v => !Array.isArray(v?.rows) || !v.rows.length || typeof v.area !== 'string')) die(`${SLOTS_PATH}: every author needs an area and a non-empty rows array`)
const SLOT = Object.fromEntries(Object.entries(SL).flatMap(([a, v]) => v.rows.map(r => [r.id, { ...r, author: a, domain: v.area }])))
const RIT = { 5: { low: 'RIT 190-199', mid: 'RIT 200-209', high: 'RIT 210-219' }, 6: { low: 'RIT 200-209', mid: 'RIT 210-219', high: 'RIT 220-229' }, 7: { low: 'RIT 200-209', mid: 'RIT 210-219', high: 'RIT 220-229' }, 8: { low: 'RIT 210-219', mid: 'RIT 220-229', high: 'RIT 230-239' } }
const DIFF = { low: 'easy', mid: 'medium', high: 'hard' }
const AREA25 = { 'Operations and Algebraic Thinking': 'Operations and Algebraic Thinking', 'Real and Complex Number Systems': 'Number and Operations', Geometry: 'Geometry', 'Statistics and Probability': 'Measurement and Data' }
const CCSS = {
  'Operations and Algebraic Thinking': { 5: ['OA'], 6: ['RP', 'EE'], 7: ['RP', 'EE'], 8: ['EE', 'F'] },
  'Real and Complex Number Systems': { 5: ['NBT', 'NF'], 6: ['NS'], 7: ['NS'], 8: ['NS', 'EE'] },
  Geometry: { 5: ['G', 'MD'], 6: ['G'], 7: ['G'], 8: ['G'] },
  'Statistics and Probability': { 5: ['MD'], 6: ['SP'], 7: ['SP'], 8: ['SP'] },
}
const PLAIN = /^-?(\d+(\.\d+)?|\d+\/\d+|\d+ \d+\/\d+)$/
const BOUND_KINDS = ['sign', 'magnitude', 'parity', 'units_digit', 'range']

function lone(it) {
  const out = [], vs = it.choices.map(c => [String(c), val(String(c))])
  if (vs.some(([, v]) => !Number.isFinite(v))) return ['LONE unscorable option']
  const sg = v => (v > 0 ? 1 : v < 0 ? -1 : 0), lg = v => Math.log10(Math.abs(v))
  for (const [c, v] of vs) {
    const others = vs.filter(([d]) => d !== c).map(([, w]) => w)
    if (sg(v) !== 0 && others.every(w => sg(w) === -sg(v))) out.push(`LONE '${c}' is the only option of its sign`)
    if (v === 0 || others.some(w => w === 0)) continue
    const ol = others.map(lg), spread = Math.max(...ol) - Math.min(...ol), gap = Math.min(...ol.map(x => Math.abs(x - lg(v))))
    if (gap >= Math.log10(2) && gap > 2 * spread) out.push(`LONE '${c}' sits alone in size`)
  }
  return out
}
/**
 * Batch 3 (2026-10-26), refusing, only for slot rows with `rank`. b2 Geometry was held on options-only (+11.1): the
 * solvers' picks went to the SECOND-SMALLEST option 39 of 54 times, and 6 of 18 candidate keys sat there (controls 2
 * of 18); every candidate hit was a middle pick. Interior keys must therefore be pinned to rank 2 or 3 by the slot.
 * RANK: the key's ascending rank among the four values (1 = smallest .. 4 = largest) equals the slot's.
 * HUB: no option is linked to two or more others by a ratio in {2, 3, 4, 1.5, 10} (either way); the key is linked
 *   to none; the key is not the midpoint of two other options (the "value the others derive from"). On the b2
 *   controls a ratio-hub key drew hits; no b2 candidate key was one, so HUB guards the next tell, RANK the found one.
 */
const HUB_RATIOS = [2, 3, 4, 1.5, 10]
function rankHub(it, rank) {
  const out = [], key = String(it.correct_answer), vs = it.choices.map(c => [String(c), val(String(c))])
  if (vs.some(([, v]) => !Number.isFinite(v))) return ['RANK unscorable option']
  const kv = val(key), r = 1 + vs.filter(([, v]) => v < kv).length
  if (r !== rank) out.push(`RANK key is rank ${r} of 4 ascending, slot rank ${rank} (1 smallest .. 4 largest)`)
  const near = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
  const linked = (a, b) => a !== 0 && b !== 0 && HUB_RATIOS.some(q => near(b / a, q) || near(a / b, q))
  for (const [c, v] of vs) {
    const deg = vs.filter(([d, w]) => d !== c && linked(v, w)).map(([d]) => d)
    if (deg.length >= 2) out.push(`HUB '${c}' is x2/x3/x4/x1.5/x10 of ${deg.join(', ')} (a hub; rebuild)`)
    else if (c === key && deg.length === 1) out.push(`HUB the key is x2/x3/x4/x1.5/x10 of '${deg[0]}' (the key may not sit in a ratio pair)`)
  }
  for (let i = 0; i < vs.length; i++) for (let k = i + 1; k < vs.length; k++) {
    const [a, x] = vs[i], [b, y] = vs[k]
    if (a !== key && b !== key && near((x + y) / 2, kv)) out.push(`HUB key is the midpoint of '${a}' and '${b}'`)
  }
  return out
}
const lastClass = d => (d === '0' ? 'zero' : d === '5' ? 'five' : '2468'.includes(d) ? 'even' : 'odd')
function formOf(c) {
  const t = String(c).trim(), fr = t.match(/^-?(?:(\d+) )?(\d+)\/(\d+)$/)
  if (fr) { const n = +fr[2], d = +fr[3], g = (a, b) => (b ? g(b, a % b) : a); return { kind: 'frac', den: d / g(n, d) } }
  const m = t.match(/^-?(\d+)(?:\.(\d+))?$/)
  return m ? { kind: 'dec', places: (m[2] ?? '').length, last: lastClass(t.slice(-1)), digits: t.replace(/[^0-9]/g, '').length } : { kind: 'other' }
}
function form(it) {
  const out = [], key = String(it.correct_answer), k = formOf(key)
  if (k.kind === 'other') return out
  for (const c of it.choices.map(String).filter(x => x !== key)) {
    const f = formOf(c)
    if (f.kind !== k.kind) { out.push(`FORM '${c}' is a ${f.kind}, the key a ${k.kind}`); continue }
    if (k.kind === 'frac' && f.den !== k.den) out.push(`FORM '${c}' denominator ${f.den}, key ${k.den} (lowest terms)`)
    if (k.kind === 'dec' && f.places !== k.places) out.push(`FORM '${c}' has ${f.places} decimal places, the key ${k.places}`)
    else if (k.kind === 'dec' && f.last !== k.last) out.push(`FORM '${c}' last-digit class ${f.last}, key ${k.last}`)
    else if (k.kind === 'dec' && k.digits >= 2 && c.slice(-1) !== key.slice(-1)) out.push(`FORM '${c}' ends in ${c.slice(-1)}, the key in ${key.slice(-1)}`)
  }
  return out
}
function slips(it) {
  const out = [], dm = it.distractor_meta ?? {}, key = String(it.correct_answer)
  let n = 0; const mis = []
  for (const d of it.choices.map(String).filter(c => c !== key)) {
    const m = dm[d]
    if (!m || typeof m.slip !== 'boolean') { out.push(`META '${d}': distractor_meta.slip (true/false) missing`); continue }
    if (m.slip) n++
    if (typeof m.misconception !== 'string' || m.misconception.trim().length < 8) out.push(`META '${d}': misconception missing`)
    else mis.push(m.misconception.trim().toLowerCase())
  }
  return { n, out, dupMis: mis.length === 3 && new Set(mis).size < 3 }
}
function bounds(it) {
  const out = [], key = String(it.correct_answer), ch = it.choices.map(String), dis = ch.filter(c => c !== key)
  if (!Array.isArray(it.bound_screen)) return ['BOUND-SCREEN missing (one entry per kind: sign, magnitude, parity, units_digit, range)']
  const kinds = new Set(it.bound_screen.map(b => b?.kind))
  for (const k of BOUND_KINDS) if (!kinds.has(k)) out.push(`BOUND-SCREEN no '${k}' entry`)
  for (const b of it.bound_screen) {
    if (!Array.isArray(b?.strikes)) { out.push(`BOUND-SCREEN ${b?.kind}: strikes must be an array`); continue }
    if (b.strikes.map(String).includes(key)) out.push(`BOUND-SCREEN ${b.kind}: a valid bound cannot strike the key`)
    const nd = new Set(b.strikes.map(String).filter(x => dis.includes(x))).size
    if (nd > 1) out.push(`BOUND-SCREEN ${b.kind} strikes ${nd} distractors (at most one)`)
  }
  return out
}
const priorMap = (() => { const p = JSON.parse(readFileSync(PRIOR_PATH ?? join(ROOT, 'scratchpad/map-v2-math-work/dump/prior-math.json'), 'utf8')); if (p.length < 1000) die('prior dump too small'); return p.filter(x => /map-math|DB map/.test(x.file ?? '')) })()
const bag = s => new Set(String(s ?? '').toLowerCase().replace(/\d+(\.\d+)?/g, '#').match(/[a-z#]+/g) ?? [])
const jac = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i || 1) }

const tmp = join(ROOT, 'scratchpad/map-v2-math-work/tmp'); mkdirSync(tmp, { recursive: true })
const one = join(tmp, `check-${process.pid}.json`)
let failed = 0
for (const it of items) {
  const bad = [], read = []
  const s = SLOT[it.id]
  if (!s) { console.log(`${it.id}  PART FAIL\n    - not a slot in ${SLOTS_PATH}`); failed++; continue }
  if (it.domain !== s.domain) bad.push(`domain must be "${s.domain}"`)
  if (it.grade_target !== s.g) bad.push(`grade_target ${it.grade_target}, slot ${s.g}`)
  if (it.tier !== s.tier) bad.push(`tier ${it.tier}, slot ${s.tier}`)
  if (it.difficulty !== DIFF[s.tier]) bad.push(`difficulty must be "${DIFF[s.tier]}" for tier ${s.tier}`)
  if (it.rit_band !== RIT[s.g][s.tier]) bad.push(`rit_band must be "${RIT[s.g][s.tier]}"`)
  if (s.g === 5 && it.area_25 !== AREA25[s.domain] && !(s.domain === 'Geometry' && /^5\.MD/.test(it.ccss ?? '') && it.area_25 === 'Measurement and Data')) bad.push(`area_25 must be "${AREA25[s.domain]}" at grade 5 (Geometry 5.MD.C items: "Measurement and Data")`)
  if (s.g !== 5 && it.area_25 != null) bad.push('area_25 is for grade-5 items only')
  const cc = String(it.ccss ?? ''), dom = cc.split('.')[1]
  if (!new RegExp(`^${s.g}\\.`).test(cc) || !CCSS[s.domain][s.g].includes(dom)) bad.push(`ccss "${cc}" must be grade ${s.g}, domain ${CCSS[s.domain][s.g].join('/')}`)
  if (s.domain === 'Operations and Algebraic Thinking' && /^8\.EE\.A/.test(cc)) bad.push('8.EE.A (exponents, roots, scientific notation) belongs to Number Systems')
  if (s.domain === 'Real and Complex Number Systems' && s.g === 8 && dom === 'EE' && !/^8\.EE\.A/.test(cc)) bad.push('Number Systems at grade 8 takes 8.NS or 8.EE.A only')
  if (s.domain === 'Geometry' && s.g === 5 && dom === 'MD' && !/^5\.MD\.C/.test(cc)) bad.push('grade-5 Geometry takes 5.G or 5.MD.C only')
  if (!Array.isArray(it.choices) || it.choices.length !== 4 || new Set(it.choices.map(String)).size !== 4) { console.log(`${it.id}  PART FAIL\n    - 4 distinct choices`); failed++; continue }
  for (const c of it.choices) if (!PLAIN.test(String(c))) bad.push(`option '${c}' is not a plain number (units go in the stem)`)
  if (!it.choices.map(String).includes(String(it.correct_answer))) bad.push('correct_answer not among the choices')
  if (it.graphic && s.domain !== 'Statistics and Probability') bad.push('no graphic outside Statistics and Probability (describe it in words)')
  if (/[−]/.test(JSON.stringify([it.prompt, it.choices]))) bad.push('U+2212 minus; use ASCII -')
  for (const f of ['explanation', 'solve', 'subskill', 'prompt', 'grade_rationale']) if (typeof it[f] !== 'string' || !it[f].trim()) bad.push(`${f} missing`)
  const sc = scoreItem(it.choices.map(String), String(it.correct_answer))
  const kp = sc.skip ? null : sc.keyMin ? 'S' : sc.keyMax ? 'L' : 'I'
  if (kp !== s.pos) bad.push(`key position by value is ${kp}, slot ${s.pos} (S smallest, L largest, I interior)`)
  if (s.rank != null) bad.push(...rankHub(it, s.rank))   // batch 3+: only slot rows that carry `rank`
  if ((s.pos === 'S' || s.pos === 'L') && (!it.far_distractor || !it.counter_error)) bad.push('S/L slot: far_distractor and counter_error required')
  bad.push(...lone(it), ...bounds(it))
  const sl = slips(it); bad.push(...sl.out); if (sl.dupMis) bad.push('two distractors name the same misconception')
  const isN = s.domain === 'Real and Complex Number Systems'
  const fo = form(it)
  if (isN) { bad.push(...fo); if (sl.n > 1) bad.push(`SLIP ${sl.n} computational slips (at most one in Number Systems)`) }
  else { read.push(...fo.map(x => x + ' (advisory outside Number Systems)')); if (sl.n > 1) read.push(`${sl.n} computational slips; one is safer`) }
  for (const chk of [pairRun, directions, dpair, dsum, plug, far, keyprint, struct, inter]) {
    let r; try { r = chk(it) } catch (e) { bad.push(`${chk.name}: ${e.message}`); continue }
    if (r && r.scored === false) { read.push(`${chk.name}: unscored`); continue }
    for (const x of r?.out ?? []) bad.push(x)
    for (const x of r?.soft ?? []) read.push(x)
  }
  // earlier MAP items
  const b = bag(it.prompt); let best = { j: 0 }
  for (const x of priorMap) { const j = jac(b, bag(x.prompt)); if (j > best.j) best = { j, id: x.id, f: x.file } }
  if (best.j >= 0.6) bad.push(`near-duplicate of earlier MAP item ${best.id} (${best.f}, j=${best.j.toFixed(2)}): write a new mechanism`)
  else if (best.j >= 0.45) read.push(`closest earlier MAP item ${best.id} j=${best.j.toFixed(2)}: read it and confirm the chain of steps differs`)
  // sandbox and live near-dup
  writeFileSync(one, JSON.stringify([it]))
  const v = spawnSync('node', [join(SB, 'math-bank-helper.mjs'), 'verify', one], { cwd: ROOT, encoding: 'utf8' })
  const vl = v.stdout.split('\n').filter(l => /^(FAIL|SHAPE)|DISTRACTOR|Distractors:/.test(l))
  if (v.status !== 0 || !/Sandbox: 1\/1/.test(v.stdout)) bad.push('sandbox: ' + (vl.join(' | ') || (v.stderr || v.stdout).slice(0, 300)))
  else if (/Distractors: NOT CHECKED|partial coverage|mismatch\./.test(v.stdout) && !/0 item\(s\) with a mismatch/.test(v.stdout)) bad.push('distractor_solve: ' + vl.join(' | '))
  for (const fam of FAMILIES) {
    const nd = spawnSync('node', [join(SB, 'check-math-near-dup.mjs'), one, '--family', fam], { cwd: ROOT, encoding: 'utf8' })
    const fl = (nd.stdout + nd.stderr).split('\n').filter(l => /FLAG|REFUS/.test(l))
    if (nd.status !== 0 || fl.length) bad.push(`near-dup ${fam}: ${fl.join(' | ').slice(0, 300) || 'exit ' + nd.status}`)
  }
  console.log(`${it.id}  PART ${bad.length ? 'FAIL' : 'OK'}`)
  for (const x of bad) console.log('    - ' + x)
  for (const x of read) console.log('    (read) ' + x)
  if (bad.length) failed++
}
const ids = items.map(i => i.id), keys = items.map(i => String(val(String(i.correct_answer))))
if (new Set(ids).size !== ids.length) { console.log('duplicate ids in the file'); failed++ }
const rep = keys.filter((k, i) => keys.indexOf(k) !== i); if (rep.length) console.log(`(read) key values repeated within your file: ${[...new Set(rep)].join(', ')}`)
console.log(`\n${items.length} items read; ${items.length - failed} PART OK; ${failed} failing`)
process.exit(failed ? 1 : 0)
