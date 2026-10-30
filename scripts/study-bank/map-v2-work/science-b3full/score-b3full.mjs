#!/usr/bin/env node
// MAP Science batch 3 FULL, stage 1 scorer.
// Applies drop rules 1-9 of scripts/study-bank/MAP-SCIENCE-B3-FULL.prereg.md to the six graders' keyed.json files,
// merges the rule-10 drops already decided in RULE10-MATCHES.md (parsed, never re-matched), and lists the
// single-grader rule-2 / rule-9 returns for fresh re-check graders. With --recheck it applies "a second hit -> drop".
//
//   node score-b3full.mjs [--root <repo>] [--out <decision.json>] [--recheck <dir with recheck-<area>.json>]
//
// Exits non-zero (2) on any missing, malformed or short input, on an unrecorded coordinator confirmation, on an
// unrecorded free-elimination kill count, or on a rule-10 line whose printed count disagrees with its id list.
//
// Binding interpretations (carried from batch 2's STAGE1-DECISION.json, written before any b3full grade was read):
//  - grader fields are free text: a value is NEGATIVE when it starts with none / n/a / no / ok (any case), so
//    "none: ...", "n/a (model)", "no" are negatives. "yes ..." on no_source_needed and "problem ..." on readability
//    are hits; key_correct is a hit only on "no".
//  - b1_stated_law is a hit only when the grader says the prior_free claim fails / the figure is decoration; a value
//    starting "holds" (incl. "holds weakly", "holds as stated") or saying "Not counted" is not a hit.
//  - rule 9 counts the SAME field from both graders. Different b-fields on one item are two single-grader hits.
//  - rule 9 b2_duplicate: both graders must name the same PAIR (from any item's entry, either direction); the
//    higher-grade item drops, same grade -> the higher slot number. Rules are applied independently and unioned.
//  - rule 6 needs EACH grader's free_elimination to kill 2+ distractors (kill counts recorded below, per value).
//  - rule 2 needs the SAME option letter from both graders.
//  - rules 1, 3, 5, 7 need coordinator confirmation: every flagged instance must have an entry in CONFIRM below.
//  - "weak" / "mild" / "partial" / "possible" values are hits (the grader raised the field) unless an OVERRIDE
//    below records why the value states the field's PASS condition.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const args = process.argv.slice(2)
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const ROOT = path.resolve(flag('--root', process.cwd()))
const SP = path.join(ROOT, 'scratchpad/map-science-b3full')
const WORK = path.join(ROOT, 'scripts/study-bank/map-v2-work/science-b3full')
const OUT = flag('--out', path.join(WORK, 'STAGE1-DECISION.json'))
const RECHECK = flag('--recheck', null)

const die = (m) => { console.error('FATAL: ' + m); process.exit(2) }
const AREAS = [
  { area: 'life', A: 'L', n: 75 },
  { area: 'phys', A: 'P', n: 75 },
  { area: 'earth', A: 'E', n: 80 },
]
const FIELDS = ['cold_pick', 'key_correct', 'second_defensible', 'fact_error', 'no_source_needed', 'recognised_real_data',
  'free_elimination', 'readability', 'grade_fit', 'b1_option_set', 'b1_qualifier', 'b1_absolute', 'b1_stated_law',
  'b1_name_property', 'b2_label_shape', 'b2_duplicate', 'b3_trend_parallel', 'b3_role_statement', 'b3_stem_echo',
  'b3_interp_cast', 'b3_bar_extreme', 'b3_claim_marker', 'b3p2_direction', 'b3p2_general_knowledge',
  'cross_item_pattern', 'note', 'id']
const BFIELDS = FIELDS.filter((f) => /^b(1|2|3|3p2)_/.test(f))

// ---- coordinator confirmations (rules 1, 3, 5, 7). Every flagged instance needs one. ----------------------------
// verdict: true = confirmed (drop), false = not confirmed (recorded). Reasoning written by the coordinator after
// recomputing / reading the item in scratchpad/map-science-b3full/<A>/items.json and src/components (renderer).
const CONFIRM = {
  // rule 3 fact_error
  'fact_error:MSB3-P5-14': [true, 'Rises 5/10/20/30 for 1-4 mirrors: 2->3 mirrors doubles the rise for +50% light. Light in grows at most linearly with mirrors and losses grow with temperature, so a real oven warms sublinearly (<4x). Superlinear data break the law for this device (B32).'],
  'fact_error:MSB3-P6-15': [true, 'The passage presents temperature rise DIVIDED by mass as the fair comparison for different masses. Under MS-PS3-4 energy = m*c*dT, so a mass correction multiplies; rise/gram = Q/(m^2 c) has no meaning and teaches the inverse of the standard. Data also need the 200 g sample to take ~33x the 20 g sample\'s energy (same c) on one plate in 2 min.'],
  'fact_error:MSB3-P7-08': [true, 'A fixed spring shares its energy so the launcher gets E*m/(m+M), concave in ball mass m: roll-back increments must shrink (at most ~4x for 4x mass). Table 4/9/15/22 grows 5,6,7 and gives 5.5x: breaks the real law for the device (B32).'],
  'fact_error:MSB3-E6-05': [true, 'C "It will stay in the sky through most June nights" is TRUE for a student in Canada north of the Arctic Circle (Nunavut, NWT, Yukon), where the key is then false (the Sun does not set). A model distractor must be false (brief); "most likely" does not make it false. Raised by both graders.'],
  'fact_error:MSB3-E7-06': [true, 'B "The valley will quickly fill with deep lake water" is a common real outcome: retreating valley glaciers often leave moraine-dammed / proglacial lakes and over-deepened basins. The option text does not carry the rationale\'s "all the melted ice", so it is not a false misconception. Raised by both graders.'],
  'fact_error:MSB3-E8-10': [true, 'B10: passage says tonnes recycled "in each three-month period of one year" (four periods) but the graph has five points at months 0,3,6,9,12, and the stem asks for "month 3". The passage contradicts its own figure.'],
  // rule 5 recognised_real_data
  'recognised_real_data:MSB3-L6-07': [false, 'Invented lizard (Sennick) and invented counts 4/24/36 of 100. The Anolis hurricane study measured limb and toepad dimensions, not these shares; a resemblance of topic, not a recognised dataset.'],
  'recognised_real_data:MSB3-L6-14': [false, 'Real species (stickleback) named, but percents 50/40/30/20/35/50/60/70/80 are invented and match no published series. Not a recognised dataset (the real-species naming is a brief-compliance note, not rule 5).'],
  'recognised_real_data:MSB3-L7-12': [false, 'Model item (invented: no): real knowledge is the construct, and g1 itself writes "model item, so real knowledge; noted". Rule 5 polices invented systems.'],
  'recognised_real_data:MSB3-L8-02': [false, 'Hump-shaped diversity under intermediate grazing is a general ecological pattern (intermediate disturbance), not a dataset; counts are invented.'],
  'recognised_real_data:MSB3-L8-11': [true, 'Two-point discrimination test with fingertip 3 / palm 10 / back of hand 25 / upper arm 40 mm: the canonical Weber experiment at its textbook values. Both graders recognised it.'],
  'recognised_real_data:MSB3-P5-10': [true, 'A car rolling from rest down a ramp, distance read each second, 0/2/8/18/32 = 2t^2 exactly: the canonical inclined-plane (Galileo ramp, odd-number rule) experiment, which the brief bans by name and which B32 recorded from pilot 2 (P5-02).'],
  'recognised_real_data:MSB3-P6-16': [true, 'Skydiver reaching ~54 m/s in about 12 s: the real belly-to-earth terminal speed curve.'],
  'recognised_real_data:MSB3-P7-07': [false, 'The table follows a = F/m, a LAW, not a published dataset; the defect is that the stem gives mass and pull (rules 4 and 9 b1_stated_law, both graders), not recognised data.'],
  'recognised_real_data:MSB3-E8-07': [true, '1010/900/800/710 hPa at 0-3000 m is the International Standard Atmosphere rounded (1013/899/795/701).'],
  // rule 7 readability
  'readability:MSB3-L6-14': [false, 'Renderer (QuestionGraphicView, line branch) draws a dot at every point; year 3 is the 4th dot, halfway between x ticks 2 and 4 as TICK allows, and its value 20 sits on a y tick (0/20/40/60/80). The batch-1 L8-16 defect was a bend whose x position decided the key; here the asked x is named and countable.'],
  'readability:MSB3-L8-09': [false, 'Same renderer reading: a dot per day; day 3 is the 4th dot and the maximum, value 60 = the top y tick (0/15/30/45/60). Countable, and the nearest distractor (44, day 2) is a full tick-band away.'],
}
// ---- value overrides: a value that states the field's PASS condition --------------------------------------------
const OVERRIDE = {
  'MSB3-P5-03:g2:b3p2_general_knowledge': [false, 'g2 writes "weak: ... favouring D; C still plausible": two plausible options is the field\'s pass condition (B24/B28 require two or more).'],
}
// ---- free_elimination kill counts, per (item, grader), read from each value -------------------------------------
const KILLS = {
  'MSB3-L5-13:g2': 1, 'MSB3-L5-18:g2': 1, 'MSB3-L5-19:g2': 1, 'MSB3-L6-06:g2': 2, 'MSB3-L7-11:g1': 2,
  'MSB3-L7-11:g2': 2, 'MSB3-L7-16:g1': 1, 'MSB3-L7-19:g2': 1,
  'MSB3-P5-05:g1': 2, 'MSB3-P5-12:g1': 3, 'MSB3-P5-12:g2': 1, 'MSB3-P5-18:g1': 3, 'MSB3-P6-05:g1': 3,
  'MSB3-P6-05:g2': 3, 'MSB3-P6-17:g1': 2, 'MSB3-P6-17:g2': 2, 'MSB3-P7-05:g1': 1, 'MSB3-P7-05:g2': 1,
  'MSB3-P7-12:g1': 3, 'MSB3-P7-12:g2': 3, 'MSB3-P7-13:g1': 2, 'MSB3-P7-16:g2': 3, 'MSB3-P8-12:g1': 3,
  'MSB3-P8-17:g2': 1, 'MSB3-P8-18:g1': 1, 'MSB3-P8-18:g2': 1,
  'MSB3-E5-02:g2': 3, 'MSB3-E5-04:g1': 2, 'MSB3-E5-10:g1': 2, 'MSB3-E5-10:g2': 2, 'MSB3-E5-14:g2': 2,
  'MSB3-E6-05:g2': 2, 'MSB3-E6-07:g2': 3, 'MSB3-E6-11:g1': 3, 'MSB3-E6-11:g2': 2, 'MSB3-E6-13:g2': 2,
  'MSB3-E6-18:g2': 3, 'MSB3-E7-04:g1': 2, 'MSB3-E7-05:g2': 2, 'MSB3-E7-10:g1': 1, 'MSB3-E7-10:g2': 1,
  'MSB3-E7-20:g2': 2, 'MSB3-E8-05:g2': 3, 'MSB3-E8-12:g1': 1, 'MSB3-E8-12:g2': 1, 'MSB3-E8-14:g1': 3,
  'MSB3-E8-20:g2': 2,
}
const KILL_NOTE = 'P4 "reversed pair X/Y" (earth-g2) marks the key as X or Y, killing the other two; "all three via P1" kills 3.'

// ---------------------------------------------------------------------------------------------------------------
const readJson = (p) => { if (!fs.existsSync(p)) die('missing ' + p); try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch (e) { die('malformed JSON ' + p + ': ' + e.message) } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const s = (v) => (v == null ? '' : String(v)).trim()
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
  if (field === 'b1_stated_law' && (/^holds\b/i.test(v) || /not counted/i.test(v))) return false
  return true
}
const shortId = (x) => x.replace(/^MSB3-/, '')
const idsIn = (v, A) => [...new Set((s(v).match(new RegExp(`(?:MSB3-)?${A}[5-8]-\\d{2}`, 'g')) || []).map((x) => 'MSB3-' + shortId(x)))]
const gradeSlot = (id) => { const m = id.match(/-[LPE]([5-8])-(\d{2})$/); return [+m[1], +m[2]] }
const dupTarget = (a, b) => { const [ga, sa] = gradeSlot(a), [gb, sb] = gradeSlot(b); return ga !== gb ? (ga > gb ? a : b) : (sa > sb ? a : b) }
const pairKey = (a, b) => [a, b].sort().join('|')

// ---- integrity -------------------------------------------------------------------------------------------------
const shaFile = path.join(SP, 'packets/cold-shas.txt')
if (!fs.existsSync(shaFile)) die('missing cold-shas.txt')
const shaLines = fs.readFileSync(shaFile, 'utf8').trim().split('\n')
const integrity = []
for (const { area } of AREAS) for (const g of [1, 2]) {
  const rel = `scratchpad/map-science-b3full/packets/${area}-g${g}/cold.json`
  const line = shaLines.find((l) => l.trim().endsWith(rel))
  if (!line) die('no cold-shas line for ' + rel)
  const want = line.trim().split(/\s+/).find((t) => /^[0-9a-f]{64}$/.test(t))
  const got = sha(path.join(ROOT, rel))
  if (want !== got) die(`cold hash mismatch ${rel}: ${got} != ${want}`)
  const hold = path.join(SP, `packets/hold/${area}-keyed.md`), gk = path.join(SP, `packets/${area}-g${g}/grader-keyed.md`)
  if (sha(hold) !== sha(gk)) die(`grader-keyed.md differs from hold for ${area}-g${g}`)
  integrity.push(`${area}-g${g} cold sha ok, keyed packet = hold`)
}

// ---- rule 10 (parsed, not re-matched) ----------------------------------------------------------------------------
const r10path = path.join(WORK, 'RULE10-MATCHES.md')
if (!fs.existsSync(r10path)) die('missing RULE10-MATCHES.md')
const r10 = { life: [], phys: [], earth: [] }
{
  let cur = null
  for (const line of fs.readFileSync(r10path, 'utf8').split('\n')) {
    const h = line.match(/^- \*\*(Life|Physical|Earth):\*\*/); if (h) { cur = { Life: 'life', Physical: 'phys', Earth: 'earth' }[h[1]]; continue }
    const m = line.match(/^\s+- (.+?) ∩ = (.+?) \((\d+)\): (\*\*drop\*\*|recorded)/)
    if (m && cur) {
      const ids = m[2].trim().split(/\s+/).map((x) => 'MSB3-' + x)
      if (ids.length !== +m[3]) die(`RULE10 count mismatch: ${line}`)
      if ((m[4] === '**drop**') !== (ids.length >= 3)) die(`RULE10 verdict disagrees with 10a threshold: ${line}`)
      if (m[4] === '**drop**') r10[cur].push({ pattern: m[1], ids })
    }
  }
}

// ---- load, validate, score ---------------------------------------------------------------------------------------
const decision = { generated: new Date().toISOString().slice(0, 10), prereg: 'scripts/study-bank/MAP-SCIENCE-B3-FULL.prereg.md', integrity, kill_note: KILL_NOTE, areas: {} }
const usedConfirm = new Set(), usedKills = new Set(), usedOverride = new Set()
let recheck = null
if (RECHECK) recheck = {}

for (const { area, A, n } of AREAS) {
  const items = readJson(path.join(SP, `${A}/items.json`))
  if (!Array.isArray(items) || items.length !== n) die(`${A}/items.json: want ${n} items, got ${items?.length}`)
  const kind = Object.fromEntries(items.map((x) => [x.id, x.kind]))
  const ids = items.map((x) => x.id)
  const G = {}
  for (const g of ['g1', 'g2']) {
    const arr = readJson(path.join(SP, `packets/${area}-${g}/keyed.json`))
    if (!Array.isArray(arr) || arr.length !== n) die(`${area}-${g}/keyed.json: want ${n} objects, got ${arr?.length}`)
    G[g] = {}
    for (const o of arr) {
      for (const f of FIELDS) if (!(f in o)) die(`${area}-${g} ${o.id}: missing field ${f}`)
      if (G[g][o.id]) die(`${area}-${g}: duplicate id ${o.id}`)
      G[g][o.id] = o
    }
    for (const id of ids) if (!G[g][id]) die(`${area}-${g}: no object for ${id}`)
  }
  const drops = {} // id -> [reasons]
  const addDrop = (id, rule, why) => { (drops[id] ||= []).push(`${rule}: ${why}`) }
  const returns = [], recorded = [], confirmations = []
  const hit = (id, g, f) => { const k = `${id}:${g}:${f}`; if (OVERRIDE[k]) usedOverride.add(k); return isHit(f, G[g][id][f], id, g) }
  const val = (id, g, f) => s(G[g][id][f])
  const confirm = (rule, field, id, g) => {
    const k = `${field}:${id}`; const c = CONFIRM[k]
    if (!c) die(`rule ${rule}: ${field} flagged on ${id} (${g.join('+')}) has no coordinator confirmation in CONFIRM`)
    usedConfirm.add(k); confirmations.push({ id, rule, field, graders: g, confirmed: c[0], reasoning: c[1] }); return c[0]
  }
  const counts = { key_correct_no: 0, second_defensible: 0, fact_error: 0, no_source_yes_data: 0, rrd: 0, free_elim: 0, readability: 0 }

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
    // rule 3
    const fe = both('fact_error'); counts.fact_error += fe.length
    if (fe.length && confirm(3, 'fact_error', id, fe)) addDrop(id, 'rule 3', 'fact_error confirmed')
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
    // rule 9 (non-duplicate fields)
    for (const f of BFIELDS.filter((f) => f !== 'b2_duplicate')) {
      const h = both(f)
      if (h.length === 2) addDrop(id, 'rule 9', `${f} from both`)
      else if (h.length === 1) returns.push({ id, rule: 9, grader: h[0], field: f, value: val(id, h[0], f) })
    }
  }
  // rule 9 b2_duplicate: pairs
  const pairs = {} // key -> {a,b,g:Set,quotes}
  for (const id of ids) for (const g of ['g1', 'g2']) {
    if (!hit(id, g, 'b2_duplicate')) continue
    const named = idsIn(val(id, g, 'b2_duplicate'), A).filter((x) => x !== id)
    if (!named.length) die(`${id} ${g} b2_duplicate names no item id: ${val(id, g, 'b2_duplicate')}`)
    for (const o of named) {
      if (!kind[o]) die(`${id} ${g} b2_duplicate names unknown id ${o}`)
      const k = pairKey(id, o); (pairs[k] ||= { a: id, b: o, g: new Set(), quotes: [] }).g.add(g); pairs[k].quotes.push(`${g}@${shortId(id)}: ${val(id, g, 'b2_duplicate')}`)
    }
  }
  const dupBoth = [], dupSingle = []
  for (const [k, p] of Object.entries(pairs)) {
    const [a, b] = k.split('|'); const t = dupTarget(a, b)
    if (p.g.size === 2) { addDrop(t, 'rule 9', `b2_duplicate pair ${shortId(a)}/${shortId(b)} named by both; ${shortId(t)} is the higher grade (or same grade, higher slot)`); dupBoth.push({ pair: [a, b], drop: t }) }
    else dupSingle.push({ pair: [a, b], target: t, grader: [...p.g][0], quotes: p.quotes })
  }
  // rule 10 merge
  for (const { pattern, ids: pids } of r10[area]) for (const id of pids) { if (!kind[id]) die('RULE10 names unknown id ' + id); addDrop(id, 'rule 10a', pattern) }

  // returns: only on items surviving everything above
  const alive = (id) => !drops[id]
  const liveReturns = returns.filter((r) => alive(r.id))
  for (const d of dupSingle) {
    if (!alive(d.target)) { recorded.push({ id: d.target, rule: 9, note: `single-grader b2_duplicate ${d.pair.map(shortId).join('/')}: target ${shortId(d.target)} already dropped, no return` }); continue }
    liveReturns.push({ id: d.target, rule: 9, grader: d.grader, field: 'b2_duplicate', value: d.quotes.join(' || '), pair: d.pair })
  }
  // second hit -> drop
  const secondHits = []
  if (recheck) {
    const rp = path.join(path.resolve(RECHECK), `recheck-${area}.json`)
    const rc = readJson(rp)
    if (!Array.isArray(rc)) die(rp + ' is not an array')
    for (const r of liveReturns) {
      const rk = (x) => `${x.id}|${x.field}|${(x.items || x.pair || [x.id]).slice().sort().join('+')}`
      const m = rc.find((x) => rk(x) === rk(r))
      if (!m) die(`${rp}: no re-check answer for ${r.id} ${r.field}`)
      if (!/^(yes|no)$/i.test(s(m.hit))) die(`${rp}: ${r.id} ${r.field} hit must be yes/no, got ${m.hit}`)
      if (r.field === 'second_defensible' && /^yes$/i.test(s(m.hit))) {
        const L1 = (r.value.match(/^(?:weak\s+)?\(?([A-D])\b/i) || [])[1]?.toUpperCase(); const L2 = s(m.option).toUpperCase()
        if (!L2) die(`${rp}: ${r.id} second_defensible yes without option`)
        if (L1 !== L2) { secondHits.push({ ...r, recheck: m, counted: false, why: `re-check names ${L2}, first grader named ${L1}` }); continue }
      }
      const yes = /^yes$/i.test(s(m.hit)); secondHits.push({ ...r, recheck: m, counted: yes })
      if (yes) addDrop(r.id, `rule ${r.rule} (second hit)`, `${r.field}: ${r.grader} + fresh re-check: ${s(m.reason).slice(0, 200)}`)
    }
    const rk2 = (x) => `${x.id}|${x.field}|${(x.items || x.pair || [x.id]).slice().sort().join('+')}`
    const extra = rc.filter((x) => !liveReturns.some((r) => rk2(r) === rk2(x)))
    if (extra.length) die(`${rp}: answers for items/fields not returned: ${extra.map((x) => x.id + ' ' + x.field).join(', ')}`)
  }
  const dropped = ids.filter((id) => drops[id])
  const byRule = (re) => ids.filter((id) => (drops[id] || []).some((r) => re.test(r)))
  const r19 = byRule(/^rule [1-9]\b(?! \(second)/)
  const r10ids = byRule(/^rule 10a/)
  decision.areas[area] = {
    authored: n,
    denominators: { items_json: items.length, g1_keyed: Object.keys(G.g1).length, g2_keyed: Object.keys(G.g2).length },
    flag_counts: counts,
    rule10_drops: r10ids.length,
    rule1_9_drops: r19.length,
    rule1_9_only: r19.filter((id) => !r10ids.includes(id)).length,
    second_hit_drops: recheck ? byRule(/second hit/).length : null,
    dropped: dropped.length,
    survivors: ids.filter(alive).length,
    survivor_ids: ids.filter(alive),
    drops: Object.fromEntries(dropped.map((id) => [id, drops[id]])),
    duplicate_pairs_both: dupBoth,
    returns: liveReturns,
    recheck_results: recheck ? secondHits : undefined,
    recorded,
    confirmations,
  }
}
for (const k of Object.keys(CONFIRM)) if (!usedConfirm.has(k)) die('CONFIRM entry never used (stale): ' + k)
for (const k of Object.keys(KILLS)) if (!usedKills.has(k)) die('KILLS entry never used (stale): ' + k)
for (const k of Object.keys(OVERRIDE)) if (!usedOverride.has(k)) die('OVERRIDE entry never used (stale): ' + k)

fs.writeFileSync(OUT, JSON.stringify(decision, null, 1) + '\n')
console.log(integrity.join('\n'))
for (const [a, d] of Object.entries(decision.areas)) {
  console.log(`\n${a}: authored ${d.authored} (items ${d.denominators.items_json}, g1 ${d.denominators.g1_keyed}, g2 ${d.denominators.g2_keyed})`)
  console.log(`  rule 10a drops ${d.rule10_drops}; rules 1-9 drops ${d.rule1_9_drops} (${d.rule1_9_only} not also rule 10)${recheck ? `; second-hit drops ${d.second_hit_drops}` : ''}`)
  console.log(`  dropped ${d.dropped} of ${d.authored}; survivors ${d.survivors}; open returns ${d.returns.length}${recheck ? ' (applied)' : ''}`)
  console.log(`  rules 1-9 drop rate ${(100 * d.rule1_9_drops / d.authored).toFixed(1)}% (F4 bar 15%)`)
}
console.log('\nwrote ' + path.relative(ROOT, OUT))
