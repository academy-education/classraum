#!/usr/bin/env node
// MAP Science batch 4, stage 1 scorer. Modelled on science-b3full/score-b3full.mjs (same rules, same binding
// interpretations), for scripts/study-bank/MAP-SCIENCE-B4.prereg.md.
// Applies drop rules 1-9 to the six graders' keyed.json files, merges the rule-10 drops already decided in
// RULE10-MATCHES.md (parsed, never re-matched), and lists the single-grader rule-2 / rule-9 returns for fresh re-check
// graders. With --recheck it applies "a second hit -> drop".
//
//   node score-b4.mjs [--root <repo>] [--out <decision.json>] [--recheck <dir with recheck-<area>.json>]
//
// Exits non-zero (2) on any missing, malformed or short input, a cold pick changed between passes, an unrecorded
// coordinator confirmation, an unrecorded free-elimination kill count, a stale table entry, a numeric key that the
// coordinator's recomputation does not reproduce, or a rule-10 row whose printed count disagrees with its id list.
//
// Binding interpretations (batch 3 full's, unchanged, plus the b4 fields):
//  - grader fields are free text: a value is NEGATIVE when it starts with none / n/a / no / ok (any case).
//    "yes ..." on no_source_needed and "problem ..." on readability are hits; key_correct is a hit only on "no".
//  - b1_stated_law is a hit only when the grader says the prior_free claim fails / the figure is decoration; a value
//    starting "holds" or "prior_free holds" (incl. "holds narrowly", "holds only in part", "holds, weakly") or saying
//    "Not counted" is not a hit. "partly fails" / "fails" / "weak: ... does not hold" are hits.
//  - rule 9 counts the SAME field from both graders. Different b-fields on one item are two single-grader hits.
//  - rule 9 b2_duplicate and b4_cross_naming (prereg rule 9): both graders must name the same PAIR (from either
//    item's entry); the higher-grade item drops, same grade -> the higher slot number. Rules are applied
//    independently and unioned.
//  - rule 6 needs EACH grader's free_elimination to kill 2+ distractors (kill counts recorded below, per value;
//    "marks the pair, kills nothing alone" is 0).
//  - rule 2 needs the SAME option letter from both graders.
//  - rules 1, 3, 5, 7 need coordinator confirmation: every flagged instance must have an entry in CONFIRM below.
//  - prereg rule 9: "A b4_plausibility hit that is a fact error is also rule 3." Every b4_plausibility hit has a
//    PLAUS entry: true = it is a fact error (rule 3 drop); false = it is not (it stays a rule-9 hit: both graders ->
//    drop, one -> return). Fact error here means the data break a law for the device, the passage contradicts its
//    figure, or a model distractor is true in the world (B41); a number merely the wrong size is not.
//  - "weak" / "mild" / "partial" / "possible" values are hits unless an OVERRIDE records why the value states the
//    field's PASS condition.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const args = process.argv.slice(2)
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const ROOT = path.resolve(flag('--root', process.cwd()))
const SP = path.join(ROOT, 'scratchpad/map-science-b4')
const WORK = path.join(ROOT, 'scripts/study-bank/map-v2-work/science-b4')
const OUT = flag('--out', path.join(WORK, 'STAGE1-DECISION.json'))
const RECHECK = flag('--recheck', null)

const die = (m) => { console.error('FATAL: ' + m); process.exit(2) }
const AREAS = [
  { area: 'life', A: 'L', n: 75, r10: 'Life' },
  { area: 'phys', A: 'P', n: 95, r10: 'Physical' },
  { area: 'earth', A: 'E', n: 70, r10: 'Earth' },
]
const ITEM_SHA16 = { L: '13b2e9c6571ec121', P: '396e048136cff763', E: 'cc72e7e3a0d5d975' } // prereg Addendum S
const FIELDS = ['cold_pick', 'key_correct', 'second_defensible', 'fact_error', 'no_source_needed', 'recognised_real_data',
  'free_elimination', 'readability', 'grade_fit', 'b1_option_set', 'b1_qualifier', 'b1_absolute', 'b1_stated_law',
  'b1_name_property', 'b2_label_shape', 'b2_duplicate', 'b3_trend_parallel', 'b3_role_statement', 'b3_stem_echo',
  'b3_interp_cast', 'b3_bar_extreme', 'b3_claim_marker', 'b3p2_direction', 'b3p2_general_knowledge',
  'b4_one_sensible', 'b4_lamarck', 'b4_var_plan', 'b4_keyword', 'b4_cross_naming', 'b4_plausibility',
  'cross_item_pattern', 'note', 'id']
const BFIELDS = FIELDS.filter((f) => /^b(1|2|3|3p2|4)_/.test(f))
const PAIR_FIELDS = ['b2_duplicate', 'b4_cross_naming']

// ---- coordinator confirmations (rules 1, 3, 5, 7). Every flagged instance needs one. ----------------------------
// verdict: true = confirmed (drop), false = not confirmed (recorded). Written after reading each item in
// science-b4/items/<A>.json; numeric keys recomputed by recomputeKeys() below.
const CONFIRM = {
  // rule 3 fact_error
  'fact_error:MSB4-L6-04': [true, 'B10: the passage puts 40 larvae in each tub; Table 1 prints "Larvae at start" 4 in every row, beside 38/29/17/12 alive after five days. The passage contradicts its own figure, and the table as printed is impossible (more alive than started). Both graders.'],
  'fact_error:MSB4-P8-07': [true, 'Force sensors clipped between each team and its end of ONE rope read the tension at the two ends of a light rope, which are equal; a 65 N average imbalance over 10 s would give a ~1 kg rope ~65 m/s^2. The table breaks Newton\'s second law for this device (B32), and the keyed quantity (the rope\'s unbalanced force) is one the rope cannot carry.'],
  'fact_error:MSB4-E8-05': [false, '"Tonight the Moon lies directly between Earth and the Sun" is odd wording for a new Moon (it is up in daytime), but the alignment it states holds over that night and the spring-tide key is correct. Wording, not a fact error; g1 itself says it does not affect the key.'],
  // rule 5 recognised_real_data
  'recognised_real_data:MSB4-L6-15': [false, 'Mid-parent vs offspring height is Galton\'s design, but the lupine values (24..52 over 20..60) are invented and both graders say "shape, not his numbers". Parent-offspring resemblance is a general heredity pattern; b3 confirmed rule 5 only at canonical VALUES (L8-11, P5-10, E8-07).'],
  'recognised_real_data:MSB4-L8-09': [false, 'Oxygen-sag / recovery-zone shape below an outfall is a general pattern (g2: shape); the counts 14..4..15 are invented. Same reading as b3 L8-02.'],
  'recognised_real_data:MSB4-E6-06': [true, 'Real Kuiper-belt values relabelled: Arvo orbits in 248 years (Pluto\'s period) and Delmont is 2350 km wide with a 560-year orbit (Eris: ~2,330 km, ~557 yr). Two of four rows are real objects, as b3 E8-07 was the standard atmosphere rounded.'],
  'recognised_real_data:MSB4-E7-15': [true, 'The canonical classroom half-life simulation (dice with one marked face), and every row is the exact 5/6 expectation within one cube (199/167/138/116/96/81 vs 200/166.7/138.9/115.7/96.5/80.4); real dice scatter ~6 per shake (binomial SD at n=240), so the table is the law, not a run. Canonical experiment at its expected values, as b3 P5-10 (g1 b4_plausibility names the same).'],
  'recognised_real_data:MSB4-E8-07': [false, 'g2 itself: "generic, not a dataset"; the dissolved-oxygen sag shape is a pattern and the values are invented.'],
  // rule 7 readability
  'readability:MSB4-L6-04': [false, 'The renderer prints the table cells as authored (4, 4, 4, 4), so the student CAN read what the key needs (38 and 29). The defect is the passage/table contradiction, confirmed under rule 3, not a rendering problem.'],
}
// ---- b4_plausibility: is the hit a fact error (rule 3)? One entry per flagged item. ------------------------------
const PLAUS = {
  'MSB4-L5-05': [true, 'B41: distractor A "Each thin-furred rabbit will grow a thicker coat" is TRUE for real rabbits and hares, which grow a thicker winter coat each year; a model distractor must be false. Both graders. Same reading as b3 E6-05 / E7-06.'],
  'MSB4-L5-16': [false, '20 young per sow in one summer is high for guinea pigs (litters ~2-4, ~68-day gestation) but a size question, not a broken law; stays a rule-9 hit.'],
  'MSB4-L6-04': [true, 'Same defect as its fact_error (start 4 vs passage 40, more alive than started).'],
  'MSB4-L7-11': [false, '3.3 fledged per plover nest is at the high end; size, not a law.'],
  'MSB4-L7-14': [false, 'g2 itself: "plausible only at the edge"; strong selection, not a broken law.'],
  'MSB4-L8-06': [false, 'CO2 from 50 seeds about 30-60x high (both graders): wrong size, not a broken law; drops under rule 9 from both.'],
  'MSB4-L8-13': [false, '"breathing gills" is false as worded (embryos have pharyngeal arches, not gills that breathe); g2 raises defensibility, not a true distractor.'],
  'MSB4-P5-07': [false, 'Exact v = f*lambda columns at ~6-10 cm/s (both graders): an exact law table and too slow for 2-5 cm water, i.e. B40 size/law-table, not a contradiction; drops under rule 9 from both.'],
  'MSB4-P5-19': [false, 'Brightness falling nearly linearly over the tested lengths: a real bulb dims convexly, but over 10-80 cm the points (88..37) are not impossible; curvature, not a broken law.'],
  'MSB4-P6-01': [false, '4.8 g pull on a small foil ball is large; size, not a law.'],
  'MSB4-P6-09': [false, 'Evaporation sublinear in area (both say minor, not decision-relevant): size/shape, not a contradiction.'],
  'MSB4-P7-06': [false, 'Start-sliding forces of 12-60 N on a 2 kg block imply static friction coefficients ~0.6-3.1; high for rubber on a gym floor but a size question; stays a rule-9 hit.'],
  'MSB4-P7-19': [false, 'g1 itself: minor; linear fall of data rate over 0-200 m is not impossible.'],
  'MSB4-P7-24': [false, 'Exact Hooke ladder in a column the key does not use (g1); size/law-table, not a contradiction.'],
  'MSB4-P8-02': [false, 'Soup cooling 71 -> 52 C in 4 min is fast; size, not a law.'],
  'MSB4-P8-03': [false, 'g2 itself: mild; size.'],
  'MSB4-P8-07': [true, 'Same defect as its fact_error (unequal tensions at the two ends of one light rope).'],
  'MSB4-P8-12': [false, 'Exact t ~ sqrt(mass per metre) table (both graders): B40 law table, not a contradiction; drops under rule 9 from both.'],
  'MSB4-E5-15': [false, 'g2 itself: mild; two of four generators peaking in August is unexplained, not impossible.'],
  'MSB4-E6-03': [false, 'g2 itself: mild; room temperature is not stated, so the dew can be possible.'],
  'MSB4-E6-16': [false, 'g1 itself: within ~6% of sqrt(g d) with realistic scatter, "not exact"; not a fact error.'],
  'MSB4-E7-01': [false, 'Large effect size from one neighborhood\'s filters; size, not a law.'],
  'MSB4-E7-06': [false, 'Both: 5.5 days/decade earlier ice-out is "plausible but fast"; size, not a law; drops under rule 9 from both.'],
  'MSB4-E7-15': [false, 'Near-exact 5/6 table: decided as recognised canonical data under rule 5 (CONFIRM), not as a fact error.'],
}
// ---- value overrides: a value that states the field's PASS condition --------------------------------------------
const OVERRIDE = {
  'MSB4-P5-11:g1:b3_bar_extreme': [false, 'g1 writes "key is the last and smallest point; largest (200) offered; allowed": B20 allows the asked bar at an extreme.'],
  'MSB4-P5-18:g1:b3_bar_extreme': [false, 'g1 writes "key middle bar; tallest (41) and shortest (9) offered; ok": the pass condition.'],
  'MSB4-P7-12:g1:b3_bar_extreme': [false, 'g1 writes "all four options are tick labels, so no tick tell": the pass condition.'],
  'MSB4-P5-17:g1:b3p2_general_knowledge': [false, 'g1 writes "A and B die on general knowledge; D needs the data": the key and D both stay plausible, which is B24/B28\'s pass condition (two or more plausible).'],
  'MSB4-P5-17:g2:b3p2_general_knowledge': [false, 'g2 writes "leaving the key and D (4x), which only the data kill": two plausible options, the pass condition.'],
  'MSB4-E5-09:g1:b3p2_general_knowledge': [false, 'g1 writes "general knowledge leaves two rising options; data decide between them": the pass condition.'],
  'MSB4-E5-09:g2:b3p2_general_knowledge': [false, 'g2 writes "D (rose, then leveled off) is the only second plausible shape": two plausible options, the pass condition.'],
}
// ---- free_elimination kill counts, per (item, grader), read from each value -------------------------------------
const KILLS = {
  'MSB4-L5-11:g2': 2, 'MSB4-L6-09:g1': 1, 'MSB4-L6-09:g2': 1, 'MSB4-L6-11:g2': 1, 'MSB4-L7-03:g1': 1,
  'MSB4-L8-14:g1': 1, 'MSB4-L8-16:g1': 2, 'MSB4-L8-16:g2': 2,
  'MSB4-P5-03:g1': 2, 'MSB4-P5-05:g1': 0, 'MSB4-P5-13:g1': 2, 'MSB4-P5-17:g1': 1, 'MSB4-P5-23:g1': 1,
  'MSB4-P6-01:g2': 2, 'MSB4-P6-04:g1': 1, 'MSB4-P6-04:g2': 1, 'MSB4-P6-05:g1': 3, 'MSB4-P6-05:g2': 2,
  'MSB4-P6-15:g1': 3, 'MSB4-P6-15:g2': 3, 'MSB4-P6-17:g2': 1, 'MSB4-P6-21:g1': 0, 'MSB4-P7-09:g2': 2,
  'MSB4-P7-15:g2': 2, 'MSB4-P7-21:g1': 2, 'MSB4-P7-24:g2': 2, 'MSB4-P8-13:g1': 1, 'MSB4-P8-20:g1': 3,
  'MSB4-P8-21:g1': 0,
  'MSB4-E5-05:g2': 1, 'MSB4-E5-13:g2': 1, 'MSB4-E5-18:g2': 2, 'MSB4-E6-04:g2': 1, 'MSB4-E6-18:g1': 3,
  'MSB4-E7-17:g2': 2, 'MSB4-E8-10:g2': 1, 'MSB4-E8-17:g2': 1,
}
const KILL_NOTE = '"reversed pair" (L5-11 g2, L8-16, P5-13, P7-21) marks the key as one of two and kills the other two; L6-11 g2 "A and B contradict each other; D contradicts rich soil" kills D only (1); "mirror-reverses ... marks the pair, kills nothing alone" (P5-05, P6-21, P8-21 g1) is 0; E6-18 g1 "A survives as the only option covering both outcomes" kills 3.'

// ---------------------------------------------------------------------------------------------------------------
const readJson = (p) => { if (!fs.existsSync(p)) die('missing ' + p); try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch (e) { die('malformed JSON ' + p + ': ' + e.message) } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const s = (v) => (v == null ? '' : Array.isArray(v) ? v.join(' | ') : String(v)).trim()
const NEG = /^(none|n\/?a|no|ok)\b/i

function isHit(field, v, id, g) {
  const o = OVERRIDE[`${id}:${g}:${field}`]
  if (o) return o[0]
  v = s(v)
  if (/^pending$/i.test(v)) die(`${id} ${g} ${field} still "pending" in keyed.json`)
  if (field === 'key_correct') { if (!/^(yes|no|unsure)\b/i.test(v)) die(`${id} ${g} key_correct unreadable: ${v}`); return /^no\b/i.test(v) }
  if (field === 'no_source_needed') return /^yes\b/i.test(v)
  if (field === 'readability') return /^problem\b/i.test(v)
  if (v === '' || NEG.test(v)) return false
  if (field === 'b1_stated_law' && (/^(prior_free\s+)?holds\b/i.test(v) || /not counted/i.test(v))) return false
  return true
}
const shortId = (x) => x.replace(/^MSB4-/, '')
const idsIn = (v, A) => [...new Set((s(v).match(new RegExp(`(?:MSB4-)?${A}[5-8]-\\d{2}`, 'g')) || []).map((x) => 'MSB4-' + shortId(x)))]
const gradeSlot = (id) => { const m = id.match(/-[LPE]([5-8])-(\d{2})$/); return [+m[1], +m[2]] }
const pairTarget = (a, b) => { const [ga, sa] = gradeSlot(a), [gb, sb] = gradeSlot(b); return ga !== gb ? (ga > gb ? a : b) : (sa > sb ? a : b) }
const pairKey = (a, b) => [a, b].sort().join('|')

// ---- rule 1 recomputation (coordinator): numeric keys reproduced from the figure --------------------------------
// read: the key's number is a value in the figure; interpolate: the key is the midpoint of the two bracketing rows
// named in the explanation (recomputed from the explanation's own equation); any "a op b = c" in an explanation is
// evaluated. Every key also agrees with all six graders' cold picks (checked below).
function recomputeKeys(items) {
  const bad = []
  let eqs = 0, reads = 0
  for (const it of items) {
    const x = s(it.explanation).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/(\d),(\d{3})/g, '$1$2')
    const re = /((?:\(?\s*-?\d+(?:\.\d+)?\s*\)?\s*[-+*/]\s*)+\(?\s*-?\d+(?:\.\d+)?\s*\)?)\s*=\s*(-?\d+(?:\.\d+)?)/g
    let m
    while ((m = re.exec(x))) {
      eqs++
      let v; try { v = Function('return (' + m[1] + ')')() } catch { bad.push(`${it.id}: unparsable "${m[0]}"`); continue }
      if (Math.abs(v - +m[2]) > 0.051 * Math.max(1, Math.abs(v) / 10)) bad.push(`${it.id}: "${m[0]}" evaluates to ${v}`)
    }
    if (it.format === 'values' && it.ask === 'read') {
      const g = it.graphic || {}
      const vals = [...(g.cells || []).flat(), ...(g.bars || []).map((b) => b.value), ...(g.points || []).flat(), ...(g.series || []).flatMap((q) => q.points.flat())].map(Number)
      reads++
      if (!vals.includes(parseFloat(it.correct_answer))) bad.push(`${it.id}: read key ${it.correct_answer} is not a value in the figure`)
    }
  }
  return { bad, eqs, reads }
}

// ---- integrity -------------------------------------------------------------------------------------------------
const shaFile = path.join(SP, 'packets/cold-shas.txt')
if (!fs.existsSync(shaFile)) die('missing cold-shas.txt')
const shaLines = fs.readFileSync(shaFile, 'utf8').trim().split('\n')
const integrity = []
for (const { area } of AREAS) for (const g of [1, 2]) {
  const rel = `${area}-g${g}/cold.json`
  const line = shaLines.find((l) => l.trim().endsWith(' ' + rel))
  if (!line) die('no cold-shas line for ' + rel)
  const want = line.trim().split(/\s+/).find((t) => /^[0-9a-f]{64}$/.test(t))
  const got = sha(path.join(SP, 'packets', rel))
  if (want !== got) die(`cold hash mismatch ${rel}: ${got} != ${want}`)
  const hold = path.join(SP, `packets/hold/${area}-keyed.md`), gk = path.join(SP, `packets/${area}-g${g}/grader-keyed.md`)
  if (sha(hold) !== sha(gk)) die(`grader-keyed.md differs from hold for ${area}-g${g}`)
  integrity.push(`${area}-g${g} cold sha ok, keyed packet = hold`)
}
for (const { A } of AREAS) {
  const h = sha(path.join(WORK, `items/${A}.json`)).slice(0, 16)
  if (h !== ITEM_SHA16[A]) die(`items/${A}.json sha ${h} is not the Addendum S fingerprint ${ITEM_SHA16[A]}`)
  integrity.push(`items/${A}.json sha ok (${h})`)
}

// ---- rule 10 (parsed, not re-matched) ----------------------------------------------------------------------------
const r10path = path.join(WORK, 'RULE10-MATCHES.md')
if (!fs.existsSync(r10path)) die('missing RULE10-MATCHES.md')
const r10 = { Life: [], Physical: [], Earth: [] }
const r10rows = { Life: 0, Physical: 0, Earth: 0 }
{
  let cur = null
  for (const line of fs.readFileSync(r10path, 'utf8').split('\n')) {
    const h = line.match(/^## (Life|Physical|Earth)\s*$/); if (h) { cur = h[1]; continue }
    if (/^## /.test(line)) { cur = null; continue }
    if (!cur || !line.startsWith('|') || /^\|\s*(property|---)/.test(line)) continue
    const c = line.split('|').slice(1, -1).map((x) => x.trim())
    if (c.length !== 6) die(`RULE10 row has ${c.length} cells: ${line}`)
    const [prop, , , match, inter, verdict] = c
    r10rows[cur]++
    if (/^no\b/i.test(match)) { if (inter !== '-' || verdict !== '-') die(`RULE10 unmatched row carries a verdict: ${line}`); continue }
    if (!/^yes\b/i.test(match)) die(`RULE10 match cell unreadable: ${line}`)
    const ids = inter.split(/\s+/).filter(Boolean)
    if (ids.some((x) => !/^[LPE][5-8]-\d{2}$/.test(x))) die(`RULE10 id list unreadable: ${line}`)
    const d = verdict.match(/^\*\*drop (\d+)\*\*/), r = verdict.match(/^recorded \((\d+)\)/)
    if (!d && !r) die(`RULE10 verdict unreadable: ${line}`)
    const n = +(d || r)[1]
    if (ids.length !== n) die(`RULE10 count mismatch (${ids.length} ids vs ${n}): ${line}`)
    if (!!d !== (n >= 3)) die(`RULE10 verdict disagrees with the 10a threshold: ${line}`)
    if (d) r10[cur].push({ pattern: prop, ids: ids.map((x) => 'MSB4-' + x) })
  }
  for (const k of Object.keys(r10rows)) if (!r10rows[k]) die(`RULE10: no rows parsed for ${k}`)
}

// ---- load, validate, score ---------------------------------------------------------------------------------------
const decision = { generated: new Date().toISOString().slice(0, 10), prereg: 'scripts/study-bank/MAP-SCIENCE-B4.prereg.md', integrity, kill_note: KILL_NOTE, rule1_recompute: {}, areas: {} }
const usedConfirm = new Set(), usedKills = new Set(), usedOverride = new Set(), usedPlaus = new Set()

for (const { area, A, n, r10: r10name } of AREAS) {
  const items = readJson(path.join(WORK, `items/${A}.json`))
  if (!Array.isArray(items) || items.length !== n) die(`items/${A}.json: want ${n} items, got ${items?.length}`)
  const kind = Object.fromEntries(items.map((x) => [x.id, x.kind]))
  const keyLetter = Object.fromEntries(items.map((x) => [x.id, 'ABCD'[x.choices.indexOf(x.correct_answer)]]))
  const ids = items.map((x) => x.id)
  const rc1 = recomputeKeys(items)
  if (rc1.bad.length) die(`rule 1 recomputation fails on ${area}:\n  ${rc1.bad.join('\n  ')}`)
  decision.rule1_recompute[area] = `${rc1.eqs} explanation equations evaluated, ${rc1.reads} read keys found in their figures, 0 mismatches`
  const G = {}, cold = {}
  for (const g of ['g1', 'g2']) {
    const arr = readJson(path.join(SP, `packets/${area}-${g}/keyed.json`))
    if (!Array.isArray(arr) || arr.length !== n) die(`${area}-${g}/keyed.json: want ${n} objects, got ${arr?.length}`)
    const carr = readJson(path.join(SP, `packets/${area}-${g}/cold.json`))
    if (!Array.isArray(carr) || carr.length !== n) die(`${area}-${g}/cold.json: want ${n} objects, got ${carr?.length}`)
    G[g] = {}; cold[g] = Object.fromEntries(carr.map((o) => [o.id, o]))
    for (const o of arr) {
      for (const f of FIELDS) if (!(f in o)) die(`${area}-${g} ${o.id}: missing field ${f}`)
      if (G[g][o.id]) die(`${area}-${g}: duplicate id ${o.id}`)
      if (!kind[o.id]) die(`${area}-${g}: unknown id ${o.id}`)
      G[g][o.id] = o
    }
    for (const id of ids) {
      if (!G[g][id]) die(`${area}-${g}: no object for ${id}`)
      if (!cold[g][id]) die(`${area}-${g}: no cold object for ${id}`)
      if (s(cold[g][id].cold_pick) !== s(G[g][id].cold_pick)) die(`${area}-${g} ${id}: cold_pick changed between passes (${cold[g][id].cold_pick} -> ${G[g][id].cold_pick})`)
    }
  }
  const coldAgree = ['g1', 'g2'].map((g) => ids.filter((id) => s(G[g][id].cold_pick).toUpperCase().startsWith(keyLetter[id])).length)
  const drops = {}
  const addDrop = (id, rule, why) => { (drops[id] ||= []).push(`${rule}: ${why}`) }
  const returns = [], recorded = [], confirmations = []
  const hit = (id, g, f) => { const k = `${id}:${g}:${f}`; if (OVERRIDE[k]) usedOverride.add(k); return isHit(f, G[g][id][f], id, g) }
  const val = (id, g, f) => s(G[g][id][f])
  const confirm = (rule, field, id, g) => {
    const k = `${field}:${id}`; const c = CONFIRM[k]
    if (!c) die(`rule ${rule}: ${field} flagged on ${id} (${g.join('+')}) has no coordinator confirmation in CONFIRM`)
    usedConfirm.add(k); confirmations.push({ id, rule, field, graders: g, confirmed: c[0], reasoning: c[1] }); return c[0]
  }
  const counts = { key_correct_no: 0, second_defensible: 0, fact_error: 0, no_source_yes_data: 0, rrd: 0, free_elim: 0, readability: 0, b4_plausibility: 0 }

  for (const id of ids) {
    const both = (f) => ['g1', 'g2'].filter((g) => hit(id, g, f))
    // rule 1
    const k1 = both('key_correct'); counts.key_correct_no += k1.length
    if (k1.length && confirm(1, 'key_correct', id, k1)) addDrop(id, 'rule 1', 'key_correct no, confirmed')
    // rule 2
    const sd = both('second_defensible'); counts.second_defensible += sd.length
    const letter = (g) => (val(id, g, 'second_defensible').match(/^(?:weak\s+|possible:?\s+)?\(?([A-D])\b/i) || [])[1]?.toUpperCase()
    for (const g of sd) if (!letter(g)) die(`${id} ${g} second_defensible names no option letter: ${val(id, g, 'second_defensible')}`)
    if (sd.length === 2 && letter('g1') === letter('g2')) addDrop(id, 'rule 2', `second_defensible ${letter('g1')} from both`)
    else for (const g of sd) returns.push({ id, rule: 2, grader: g, field: 'second_defensible', value: val(id, g, 'second_defensible') })
    // rule 3 (fact_error, and b4_plausibility hits that are fact errors)
    const fe = both('fact_error'); counts.fact_error += fe.length
    if (fe.length && confirm(3, 'fact_error', id, fe)) addDrop(id, 'rule 3', 'fact_error confirmed')
    const pl = both('b4_plausibility'); counts.b4_plausibility += pl.length
    if (pl.length) {
      const c = PLAUS[id]; if (!c) die(`b4_plausibility on ${id} (${pl.join('+')}) has no PLAUS entry`)
      usedPlaus.add(id); confirmations.push({ id, rule: 3, field: 'b4_plausibility', graders: pl, confirmed: c[0], reasoning: c[1] })
      if (c[0] && !(drops[id] || []).some((r) => r.startsWith('rule 3'))) addDrop(id, 'rule 3', 'b4_plausibility hit is a fact error, confirmed')
    }
    // rule 4
    const ns = both('no_source_needed')
    if (ns.length && kind[id] !== 'model') {
      counts.no_source_yes_data += ns.length
      if (ns.length === 2) addDrop(id, 'rule 4', `no_source_needed yes from both (${kind[id]} item)`)
      else recorded.push({ id, rule: 4, note: `no_source_needed yes from ${ns[0]} only (figure-covered attack not run): recorded` })
    }
    // rule 5
    const rd = both('recognised_real_data'); counts.rrd += rd.length
    if (rd.length && confirm(5, 'recognised_real_data', id, rd)) addDrop(id, 'rule 5', 'recognised_real_data confirmed')
    // rule 6
    const fl = both('free_elimination'); counts.free_elim += fl.length
    const kills = {}
    for (const g of fl) { const k = `${id}:${g}`; if (!(k in KILLS)) die(`free_elimination on ${k} has no recorded kill count: ${val(id, g, 'free_elimination')}`); usedKills.add(k); kills[g] = KILLS[k] }
    if (fl.length === 2 && kills.g1 >= 2 && kills.g2 >= 2) addDrop(id, 'rule 6', `free_elimination from both kills ${kills.g1}/${kills.g2}`)
    else if (fl.length) recorded.push({ id, rule: 6, note: `free_elimination ${fl.map((g) => `${g} kills ${kills[g]}`).join(', ')}: recorded` })
    // rule 7
    const rb = both('readability'); counts.readability += rb.length
    if (rb.length && confirm(7, 'readability', id, rb)) addDrop(id, 'rule 7', 'readability problem confirmed against the renderer')
    // rule 9 (non-pair fields)
    for (const f of BFIELDS.filter((f) => !PAIR_FIELDS.includes(f))) {
      const h = both(f)
      if (h.length === 2) addDrop(id, 'rule 9', `${f} from both`)
      else if (h.length === 1) returns.push({ id, rule: 9, grader: h[0], field: f, value: val(id, h[0], f) })
    }
  }
  // rule 9 pair fields (b2_duplicate, b4_cross_naming)
  const pairBoth = [], pairSingle = []
  for (const f of PAIR_FIELDS) {
    const pairs = {}
    for (const id of ids) for (const g of ['g1', 'g2']) {
      if (!hit(id, g, f)) continue
      const named = idsIn(val(id, g, f), A).filter((x) => x !== id)
      if (!named.length) die(`${id} ${g} ${f} names no item id: ${val(id, g, f)}`)
      for (const o of named) {
        if (!kind[o]) die(`${id} ${g} ${f} names unknown id ${o}`)
        const k = pairKey(id, o); (pairs[k] ||= { g: new Set(), quotes: [] }).g.add(g); pairs[k].quotes.push(`${g}@${shortId(id)}: ${val(id, g, f)}`)
      }
    }
    for (const [k, p] of Object.entries(pairs)) {
      const [a, b] = k.split('|'); const t = pairTarget(a, b)
      if (p.g.size === 2) { addDrop(t, 'rule 9', `${f} pair ${shortId(a)}/${shortId(b)} named by both; ${shortId(t)} is the higher grade (or same grade, higher slot)`); pairBoth.push({ field: f, pair: [a, b], drop: t }) }
      else pairSingle.push({ field: f, pair: [a, b], target: t, grader: [...p.g][0], quotes: p.quotes })
    }
  }
  // rule 10 merge
  for (const { pattern, ids: pids } of r10[r10name]) for (const id of pids) { if (!kind[id]) die('RULE10 names unknown id ' + id); addDrop(id, 'rule 10a', pattern) }

  // returns: only on items surviving everything above
  const alive = (id) => !drops[id]
  const liveReturns = returns.filter((r) => alive(r.id))
  for (const r of returns.filter((r) => !alive(r.id))) recorded.push({ id: r.id, rule: r.rule, note: `single-grader ${r.field} (${r.grader}): item already dropped, no return` })
  for (const d of pairSingle) {
    if (!alive(d.target)) { recorded.push({ id: d.target, rule: 9, note: `single-grader ${d.field} ${d.pair.map(shortId).join('/')}: target ${shortId(d.target)} already dropped, no return` }); continue }
    liveReturns.push({ id: d.target, rule: 9, grader: d.grader, field: d.field, value: d.quotes.join(' || '), pair: d.pair })
  }
  // second hit -> drop
  const secondHits = []
  const rk = (x) => `${x.id}|${x.field}|${(x.items || x.pair || [x.id]).slice().sort().join('+')}`
  if (RECHECK) {
    const rp = path.join(path.resolve(RECHECK), `recheck-${area}.json`)
    const rc = readJson(rp)
    if (!Array.isArray(rc)) die(rp + ' is not an array')
    for (const r of liveReturns) {
      const m = rc.filter((x) => rk(x) === rk(r))
      if (m.length !== 1) die(`${rp}: ${m.length} re-check answers for ${r.id} ${r.field} (want 1)`)
      const a = m[0]
      if (!/^(yes|no)$/i.test(s(a.hit))) die(`${rp}: ${r.id} ${r.field} hit must be yes/no, got ${a.hit}`)
      if (!s(a.reason)) die(`${rp}: ${r.id} ${r.field} has no reason`)
      if (r.field === 'second_defensible' && /^yes$/i.test(s(a.hit))) {
        const L1 = (r.value.match(/^(?:weak\s+|possible:?\s+)?\(?([A-D])\b/i) || [])[1]?.toUpperCase(); const L2 = s(a.option).toUpperCase()
        if (!L2) die(`${rp}: ${r.id} second_defensible yes without option`)
        if (L1 !== L2) { secondHits.push({ ...r, recheck: a, counted: false, why: `re-check names ${L2}, first grader named ${L1}` }); continue }
      }
      const yes = /^yes$/i.test(s(a.hit)); secondHits.push({ ...r, recheck: a, counted: yes })
      if (yes) addDrop(r.id, `rule ${r.rule} (second hit)`, `${r.field}: ${r.grader} + fresh re-check: ${s(a.reason).slice(0, 220)}`)
    }
    const extra = rc.filter((x) => !liveReturns.some((r) => rk(r) === rk(x)))
    if (extra.length) die(`${rp}: answers for items/fields not returned: ${extra.map((x) => x.id + ' ' + x.field).join(', ')}`)
  }
  const dropped = ids.filter((id) => drops[id])
  const byRule = (re) => ids.filter((id) => (drops[id] || []).some((r) => re.test(r)))
  const r19 = byRule(/^rule [1-9]\b(?! \(second)/)
  const r10ids = byRule(/^rule 10a/)
  const afterR110 = ids.filter((id) => !r19.includes(id) && !r10ids.includes(id))
  decision.areas[area] = {
    authored: n,
    denominators: { items_json: items.length, g1_keyed: Object.keys(G.g1).length, g2_keyed: Object.keys(G.g2).length, g1_cold_on_key: coldAgree[0], g2_cold_on_key: coldAgree[1] },
    flag_counts: counts,
    rule10_drops: r10ids.length,
    rule1_9_drops: r19.length,
    rule1_9_only: r19.filter((id) => !r10ids.includes(id)).length,
    after_rules_1_10: afterR110.length,
    returns_open: liveReturns.length,
    second_hit_drops: RECHECK ? byRule(/second hit/).length : null,
    dropped: dropped.length,
    survivors: ids.filter(alive).length,
    survivor_ids: ids.filter(alive),
    drops: Object.fromEntries(dropped.map((id) => [id, drops[id]])),
    pairs_both: pairBoth,
    returns: liveReturns,
    recheck_results: RECHECK ? secondHits : undefined,
    recorded,
    confirmations,
  }
}
for (const k of Object.keys(CONFIRM)) if (!usedConfirm.has(k)) die('CONFIRM entry never used (stale): ' + k)
for (const k of Object.keys(PLAUS)) if (!usedPlaus.has(k)) die('PLAUS entry never used (stale): ' + k)
for (const k of Object.keys(KILLS)) if (!usedKills.has(k)) die('KILLS entry never used (stale): ' + k)
for (const k of Object.keys(OVERRIDE)) if (!usedOverride.has(k)) die('OVERRIDE entry never used (stale): ' + k)

fs.writeFileSync(OUT, JSON.stringify(decision, null, 1) + '\n')
console.log(integrity.join('\n'))
for (const [a, d] of Object.entries(decision.areas)) {
  const dn = d.denominators
  console.log(`\n${a}: authored ${d.authored} (items ${dn.items_json}, g1 ${dn.g1_keyed}, g2 ${dn.g2_keyed}; cold picks on key ${dn.g1_cold_on_key}/${dn.items_json} and ${dn.g2_cold_on_key}/${dn.items_json})`)
  console.log(`  rule 1 recompute: ${decision.rule1_recompute[a]}`)
  console.log(`  rule 10a drops ${d.rule10_drops}; rules 1-9 drops ${d.rule1_9_drops} (${d.rule1_9_only} not also rule 10); after rules 1-10: ${d.after_rules_1_10}${RECHECK ? `; second-hit drops ${d.second_hit_drops}` : ''}`)
  console.log(`  dropped ${d.dropped} of ${d.authored}; survivors ${d.survivors}; returns ${d.returns.length}${RECHECK ? ' (applied)' : ' (open)'}`)
  console.log(`  rules 1-9 drop rate ${(100 * d.rule1_9_drops / d.authored).toFixed(1)}% (F4 bar 25%)`)
}
console.log('\nwrote ' + path.relative(ROOT, OUT))
