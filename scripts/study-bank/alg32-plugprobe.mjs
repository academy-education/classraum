#!/usr/bin/env node
/**
 * alg32-plugprobe.mjs  render-plants <n> | score-plants <n> | status
 *                      | render <round> <all|ID,ID,...> | score <round> | --selftest
 *
 * The cold PLUG-BACK PROBE for sat-math-v32-alg (PREREG-MATH-ALG32-2026-10-23.md, rule 6). It is
 * alg31-plugprobe.mjs with the calibration fixed BEFORE any item exists (alg31 Result, lesson 2:
 * both fresh readers missed the positive plant alg26 D6, so the probe was INVALID twice and decided
 * nothing):
 *
 *   1. alg26 D6 is REMOVED from the positives (and is not a negative either). Its positive label
 *      rested on graders who had already solved it (D and F brute-forced it in stage 1); two of the
 *      three said the decision point was NOT bypassable by the check; the check they described ("2610
 *      decomposes as 2 vans + 7 buses") is a lattice search over bus counts - the forward solve's own
 *      work - and both cold readers independently called it a search. Its configuration (a `least`
 *      objective with the key the smallest option, confirmed by ATTAINABILITY at try 1) cannot occur
 *      under alg32's slots, where greatest / least sit only at try 3-4.
 *   2. algf27 D13 (`SM27F-D13`, "least whole minutes cycling", key 159 = rank 2, natural try 2)
 *      replaces it: an R6 majority drop in algf27 (REGISTER), flagged by ALL THREE graders at try 2,
 *      each describing the same check - convert the option to hours, compute the distance forward,
 *      compare it with the printed 53 - which is the brief's own definition of routine and needs no
 *      knowledge of the solution.
 *   3. the probe must PASS ON THE PLANTS ALONE before any author runs: `render-plants` / `score-plants`
 *      runs p1, p2, ... (fresh reader each, 13 plants, no batch item). The gate (`status`) is TWO
 *      CONSECUTIVE VALID plant-only runs within at most 4. Runs are numbered without gaps, a run cannot
 *      be rendered before the previous one is scored, and none is rendered after the gate passes, so
 *      an invalid run cannot be skipped or out-waited. `render` (the batch rounds) refuses until the
 *      gate has passed.
 *
 *   VALID (pre-registered, unchanged from alg31 except the last clause): all 5 positives FLAGGED (the
 *   key confirmed by a routine check at natural try 1-2), at most 4 of the 8 negatives flagged, and
 *   NO plant DISAGREE (a reader that confirms a wrong option on an item whose key is known is not
 *   measuring plug-back). Ceiling: the positive bar fires on one miss (it did, twice, in alg31); the
 *   negative bar fires at 5 of 8 (alg31's two readers flagged 1 of 8); DISAGREE fires on one.
 *
 *   render-plants <n>   PRIV/probe/p<n>/probe.json (13 plants, seeded order SEED_PROBE + 100 + n,
 *                       options ascending, prompt + options only); map at PRIV/probe/p<n>.map.json
 *   score-plants <n>    reads PRIV/probe/p<n>/out.json; logs p<n> to alg32.plugprobe.json
 *   status              prints every plant-only run and the gate; exit 0 passed, 1 not (yet), 2 none
 *   render <round> ...  every named batch item PLUS the 13 plants, as alg31 (seed SEED_PROBE + round)
 *   score <round>       FLAGGED / DISAGREE per batch item; the same validity bar on the plants
 * --dry <dir> (anywhere on the line) sends folders and log to <dir> (dry runs; the real log is alg32.plugprobe.json).
 * Exit 1 on an invalid probe, 2 on any input it cannot use (missing / empty / malformed out.json, a
 * map without every plant, an empty author file set).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { PRIV, COHORT, PREFIX, SEED_PROBE, naturalTry, rank, val } from './alg32-slots.mjs'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
const D = new URL('.', import.meta.url).pathname
/** --dry <dir> redirects the probe folders AND the log into <dir> (dry runs only; never pass it for a
 *  real run). A flag, not an env var: repo-hygiene requires every process.env read to be documented. */
const ARGV = process.argv.slice(2)
const di = ARGV.indexOf('--dry')
if (di >= 0 && !ARGV[di + 1]) { console.error('REFUSING: --dry needs a directory'); process.exit(2) }
const DRY = di >= 0 ? ARGV.splice(di, 2)[1] : null
const PROBE_ROOT = DRY ? `${DRY}/probe` : `${PRIV}/probe`
const LOG = DRY ? `${DRY}/alg32.plugprobe.json` : `${D}alg32.plugprobe.json`
export const POS = ['SM26L-B5', 'SM26L-B6', 'SM26L-C6', 'SM26L-C8', 'SM27F-D13']
export const NEG = ['SM26L-B1', 'SM26L-B7', 'SM26L-C1', 'SM26L-C4', 'SM26L-D2', 'SM26L-D3', 'SM26L-D4', 'SM26L-D7']
export const EXCLUDED = { 'SM26L-D6': 'positive label rests on post-solve graders; check is an attainability search; configuration impossible under alg32 slots (PREREG-MATH-ALG32 rule 6)' }
export const MAX_PLANT_RUNS = 4
const PLANT_SOURCES = { 'SM27F-D13': { file: 'algf27-h2.keyed.batch.json', ask: 'least' } }
const eq = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
const keyTry = (it, ask) => { const r = rank(it.choices.map(String), String(it.correct_answer)); return r == null ? null : naturalTry(ask, r) }
const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }

export function loadPlants() {
  const v26 = JSON.parse(readFileSync(`${D}sat-math-v26-alg.batch.json`, 'utf8')), meta26 = JSON.parse(readFileSync(`${D}sat-math-v26-alg.meta.json`, 'utf8'))
  const out = []
  for (const [list, kind] of [[POS, 'plant-pos'], [NEG, 'plant-neg']]) for (const id of list) {
    let it, ask
    if (PLANT_SOURCES[id]) { const j = JSON.parse(readFileSync(D + PLANT_SOURCES[id].file, 'utf8')); it = j.find(x => x.id === id); ask = PLANT_SOURCES[id].ask }
    else { it = v26.find(x => x.id === id); ask = meta26[id]?.ask }
    if (!it || !ask) throw new Error(`plant ${id} missing`)
    const t = keyTry(it, ask)
    if (!(t <= 2)) throw new Error(`plant ${id} has its key at natural try ${t}, not 1-2`)
    out.push({ it, ask, kind })
  }
  for (const id of Object.keys(EXCLUDED)) if (out.some(x => x.it.id === id)) throw new Error(`excluded plant ${id} is in a plant list`)
  return out
}

function renderTo(F, MAP, items, seed) {
  if (existsSync(F) && readdirSync(F).length) die(`${F} exists and is not empty (every run is a fresh reader in a fresh folder)`)
  mkdirSync(F, { recursive: true })
  const order = shuffleWith(items.slice(), rng(seed))
  const probe = [], map = {}
  order.forEach(({ it, ask, kind }, i) => {
    const label = `X${String(i + 1).padStart(2, '0')}`
    probe.push({ label, prompt: it.prompt, options_ascending: it.choices.map(String).sort((x, y) => val(x) - val(y)) })
    map[label] = { id: it.id, kind, ask, key: String(it.correct_answer), key_try: keyTry(it, ask), order: ask === 'greatest' ? 'descending' : 'ascending' }
  })
  writeFileSync(`${F}/probe.json`, JSON.stringify(probe, null, 1) + '\n'); writeFileSync(MAP, JSON.stringify(map, null, 1) + '\n')
}

/** pure scoring: map + out -> per-label results and the validity verdict. Throws on unusable input. */
export function scoreRun(map, out) {
  if (!map || typeof map !== 'object' || !Object.keys(map).length) throw new Error('empty map')
  if (!out || typeof out !== 'object' || Array.isArray(out)) throw new Error('out.json is not an object keyed by label')
  const miss = Object.keys(map).filter(l => !out[l]); if (miss.length) throw new Error(`out.json lacks ${miss.join(' ')}`)
  const res = {}
  for (const [l, m] of Object.entries(map)) {
    const o = out[l]
    if (typeof o.routine_confirm !== 'boolean') throw new Error(`${l}: routine_confirm is not a boolean`)
    if (o.confirmed != null && !Number.isFinite(Number(o.confirmed_at))) throw new Error(`${l}: confirmed without a numeric confirmed_at`)
    const conf = o.confirmed == null ? null : String(o.confirmed)
    if (conf != null && Number.isNaN(val(conf))) throw new Error(`${l}: confirmed "${conf}" is not an option value`)
    const at = conf == null ? null : Number(o.confirmed_at)
    const isKey = conf != null && eq(val(conf), val(m.key))
    res[l] = { ...m, confirmed: conf, confirmed_at: at, routine: o.routine_confirm, flagged: isKey && o.routine_confirm && at <= 2, disagree: conf != null && !isKey, note: String(o.note ?? '').slice(0, 300) }
  }
  const R = Object.values(res), by = k => R.filter(r => r.kind === k)
  const pos = by('plant-pos'), neg = by('plant-neg')
  if (pos.length !== POS.length || neg.length !== NEG.length) throw new Error('the map does not hold every plant')
  const posF = pos.filter(r => r.flagged).length, negF = neg.filter(r => r.flagged).length, plantDis = [...pos, ...neg].filter(r => r.disagree)
  const valid = posF === POS.length && negF <= 4 && plantDis.length === 0
  return { res, pos, neg, bat: by('batch'), posF, negF, plantDis, valid }
}

/** the gate over plant-only runs in order: two consecutive valid within MAX_PLANT_RUNS */
export function gate(runs) {
  for (let i = 1; i < runs.length && i < MAX_PLANT_RUNS; i++) if (runs[i - 1] && runs[i]) return { passed: true, at: i + 1, final: true }
  return { passed: false, at: null, final: runs.length >= MAX_PLANT_RUNS }
}

const readLog = () => existsSync(LOG) ? JSON.parse(readFileSync(LOG, 'utf8')) : {}
const plantRuns = log => { const r = []; for (let n = 1; log[`p${n}`]; n++) r.push(log[`p${n}`].valid === true); return r }

function report(s) {
  console.log(`plants: positives flagged ${s.posF}/${POS.length} (${s.pos.map(r => `${r.id.replace(/^SM2\dL-|^SM27F-/, '')}${r.flagged ? '+' : '-'}`).join(' ')}); negatives flagged ${s.negF}/${NEG.length} (bar <= 4); plant DISAGREE ${s.plantDis.length} (bar 0)${s.plantDis.length ? ': ' + s.plantDis.map(r => `${r.id} confirmed ${r.confirmed}`).join(', ') : ''}`)
  console.log(`probe ${s.valid ? 'VALID' : 'INVALID - decides nothing'}`)
}

function selftest() {
  let bad = 0
  const plants = loadPlants()
  const map = {}; plants.forEach(({ it, ask, kind }, i) => { map[`X${i + 1}`] = { id: it.id, kind, ask, key: String(it.correct_answer), key_try: keyTry(it, ask) } })
  const outFor = f => Object.fromEntries(Object.entries(map).map(([l, m]) => [l, f(m)]))
  const none = { confirmed: null, confirmed_at: null, routine_confirm: false }
  const flag = m => ({ confirmed: m.key, confirmed_at: m.key_try, routine_confirm: true })
  const ideal = outFor(m => m.kind === 'plant-pos' ? flag(m) : none)
  const cases = [
    ['ideal reader', ideal, true],
    ['flags nothing', outFor(() => none), false],
    ['flags everything', outFor(flag), false],
    ['misses D13 only', outFor(m => m.kind === 'plant-pos' && m.id !== 'SM27F-D13' ? flag(m) : none), false],
    ['4 negatives flagged (at the bar)', outFor((() => { let k = 0; return m => m.kind === 'plant-pos' || (m.kind === 'plant-neg' && k++ < 4) ? flag(m) : none })()), true],
    ['5 negatives flagged', outFor((() => { let k = 0; return m => m.kind === 'plant-pos' || (m.kind === 'plant-neg' && k++ < 5) ? flag(m) : none })()), false],
    ['one plant DISAGREE', outFor(m => m.kind === 'plant-pos' ? flag(m) : m.id === 'SM26L-D2' ? { confirmed: '139', confirmed_at: 4, routine_confirm: true } : none), false],
    ['key confirmed at try 3 is not a flag', outFor(m => m.kind === 'plant-pos' ? (m.id === 'SM26L-C8' ? { ...flag(m), confirmed_at: 3 } : flag(m)) : none), false],
  ]
  for (const [name, out, want] of cases) { const s = scoreRun(map, out); if (s.valid !== want) { bad++; console.error(`selftest ${name}: valid ${s.valid}, expected ${want}`) } }
  for (const [name, out] of [['missing row', (() => { const o = { ...ideal }; delete o.X1; return o })()], ['non-boolean routine', { ...ideal, X1: { confirmed: null, routine_confirm: 'yes' } }], ['array', []]]) {
    let threw = false; try { scoreRun(map, out) } catch { threw = true }
    if (!threw) { bad++; console.error(`selftest: ${name} did not refuse`) }
  }
  const g = (runs, passed) => { if (gate(runs).passed !== passed) { bad++; console.error(`selftest gate ${JSON.stringify(runs)}: expected ${passed}`) } }
  g([true, true], true); g([true, false, true, true], true); g([false, true, false, true], false); g([true, false, true, false], false); g([false, false, false], false); g([], false)
  g([false, false, false, true, true], false) // a fifth run cannot rescue the gate
  if (POS.includes('SM26L-D6') || NEG.includes('SM26L-D6')) { bad++; console.error('selftest: D6 still a plant') }
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log('selftest 19/19')
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  const [cmd, arg, which] = ARGV
  if (cmd === '--selftest') { selftest(); process.exit(0) }
  const cmds = ['render-plants', 'score-plants', 'status', 'render', 'score']
  if (!cmds.includes(cmd) || (cmd !== 'status' && !/^\d+$/.test(arg ?? '')) || (cmd === 'render' && !which)) { console.error('usage: alg32-plugprobe.mjs render-plants <n> | score-plants <n> | status | render <round> <all|ID,ID> | score <round> | --selftest'); process.exit(2) }
  selftest()
  const log = readLog(), runs = plantRuns(log), gt = gate(runs)
  if (cmd === 'status') {
    if (!runs.length) die('no plant-only run has been scored (render-plants 1, then score-plants 1)')
    runs.forEach((v, i) => console.log(`  p${i + 1}: ${v ? 'VALID' : 'INVALID'}  (positives ${log[`p${i + 1}`].positives}/5, negatives ${log[`p${i + 1}`].negatives}/8, plant disagree ${log[`p${i + 1}`].plant_disagree})`))
    console.log(gt.passed ? `GATE PASSED at p${gt.at} (two consecutive valid plant-only runs)` : gt.final ? `GATE FAILED: no two consecutive valid runs in ${MAX_PLANT_RUNS}; do not commit the prereg, do not author (rule 6)` : `gate not yet passed (${runs.length} of at most ${MAX_PLANT_RUNS} runs)`)
    process.exit(gt.passed ? 0 : 1)
  }
  const plantMode = cmd.endsWith('-plants'), n = Number(arg)
  const F = `${PROBE_ROOT}/${plantMode ? 'p' : 'r'}${n}`, MAP = `${F}.map.json`
  if (DRY) console.log(`DRY RUN: folders and log under ${DRY}`)
  if (cmd === 'render-plants') {
    if (gt.passed) die(`the plant gate already passed at p${gt.at}; no further plant-only run is rendered`)
    if (n !== runs.length + 1) die(`next plant-only run is p${runs.length + 1} (runs are numbered without gaps and each is scored before the next is rendered)`)
    if (n > MAX_PLANT_RUNS) die(`at most ${MAX_PLANT_RUNS} plant-only runs are pre-registered`)
    let plants; try { plants = loadPlants() } catch (e) { die(e.message) }
    renderTo(F, MAP, plants, SEED_PROBE + 100 + n)
    console.log(`plant-only run p${n}: ${plants.length} plants (${POS.length} positive, ${NEG.length} negative), no batch item -> ${F}/probe.json (map outside the folder)`)
  } else if (cmd === 'render') {
    if (!gt.passed) die('the plant-only gate has not passed (alg32-plugprobe.mjs status); no batch round is rendered before it')
    const batch = []
    for (const a of 'bcd') { const p = `${D}${COHORT}-${a}.batch.json`; if (existsSync(p)) { const j = JSON.parse(readFileSync(p, 'utf8')); if (Array.isArray(j)) batch.push(...j) } }
    if (!batch.length) die(`no items in ${COHORT}-{b,c,d}.batch.json`)
    const ids = which === 'all' ? batch.map(x => x.id) : which.split(',').map(s => s.startsWith(PREFIX) ? s : PREFIX + s)
    const items = ids.map(id => { const it = batch.find(x => x.id === id); if (!it) die(`${id} not in the author files`); if (!it.ask) die(`${id} has no ask`); return { it, ask: it.ask, kind: 'batch' } })
    let plants; try { plants = loadPlants() } catch (e) { die(e.message) }
    renderTo(F, MAP, [...items, ...plants], SEED_PROBE + n)
    console.log(`round ${n}: ${items.length} batch items + ${plants.length} plants -> ${F}/probe.json (map outside the folder)`)
  } else {
    let map, out
    try { map = JSON.parse(readFileSync(MAP, 'utf8')); out = JSON.parse(readFileSync(`${F}/out.json`, 'utf8')) } catch (e) { die(e.message) }
    let s; try { s = scoreRun(map, out) } catch (e) { die(e.message) }
    if (plantMode && s.bat.length) die(`p${n} holds batch items; a plant-only run holds plants only`)
    if (!plantMode && !s.bat.length) die(`round ${n} holds no batch item`)
    const key = `${plantMode ? 'p' : 'r'}${n}`
    if (log[key]) die(`${key} is already logged; a run is scored once`)
    report(s)
    const plantRows = Object.fromEntries([...s.pos, ...s.neg].map(r => [r.id, { kind: r.kind, key_try: r.key_try, flagged: r.flagged, disagree: r.disagree, confirmed: r.confirmed, confirmed_at: r.confirmed_at, routine: r.routine, note: r.note }]))
    const entry = { valid: s.valid, positives: s.posF, negatives: s.negF, plant_disagree: s.plantDis.length, plants: plantRows }
    if (!plantMode) {
      for (const r of s.bat.sort((a, b) => a.id.localeCompare(b.id))) console.log(`  ${r.id}  key try ${r.key_try} ${r.order}  ${r.flagged ? 'FLAGGED (key confirmed by a routine check at try ' + r.confirmed_at + ')' : r.disagree ? `DISAGREE (probe confirmed ${r.confirmed})` : 'clear'}${r.note ? '  | ' + r.note.slice(0, 140) : ''}`)
      entry.items = Object.fromEntries(s.bat.map(r => [r.id, { key_try: r.key_try, order: r.order, flagged: r.flagged, disagree: r.disagree, confirmed: r.confirmed, confirmed_at: r.confirmed_at, routine: r.routine, note: r.note }]))
      console.log(`batch: ${s.bat.filter(r => r.flagged).length} flagged, ${s.bat.filter(r => r.disagree).length} disagree, of ${s.bat.length}`)
    }
    log[key] = entry; writeFileSync(LOG, JSON.stringify(log, null, 1) + '\n')
    if (plantMode) { const g2 = gate(plantRuns(log)); console.log(g2.passed ? `GATE PASSED at p${g2.at}` : g2.final ? `GATE FAILED after ${MAX_PLANT_RUNS} runs` : `gate not yet passed (next: render-plants ${plantRuns(log).length + 1})`) }
    console.log(`logged ${key} to alg32.plugprobe.json`)
    process.exit(s.valid ? 0 : 1)
  }
}
