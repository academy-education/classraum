#!/usr/bin/env node
/**
 * wic28-gate.mjs <frozen.batch.json> [--held id,id] [--dry] [--dir <path>, break-tests only]
 *
 * sat-cs-wic-v28 (PREREG-WIC28-2026-10-23.md). Every verdict rule and bar is wic27-gate.mjs's. Added:
 *   - REFUSES (exit 2) an empty or non-array batch, duplicate batch ids, an item that is not four-choice
 *     with its key among the choices, a grader or solver file listing one id twice, and a phase-1 file
 *     whose sha256 is not the one recorded in wic28.ws-phase1.sha256 before the key was sent. The sha
 *     file is REQUIRED (ii23-gate only noted its absence).
 *   - Attrition when the stage-2 control is NOT MEASURED: v27's rule for stage 2 (control outside
 *     (line + 5, 90%] -> the batch continues only if M_cand <= +10) is applied to the kept set too:
 *     the bar becomes M_kept <= +10. v27 left this case unwritten; the v28 projection puts the control
 *     about 3 points above its floor (the pool now holds 77 four-world rows), so it can now happen.
 *   - Prints each grader's phase-2 `batch_note` (the cross-item question). Reported; decides nothing.
 *   - Prints the stage-2 control split into four-world cohorts (rw-v25..v29-cs-wic) and the rest. Reported;
 *     decides nothing.
 * v27's description follows, with its file names changed to v28's (the files this script reads and writes).
 *
 * wic28-gate.mjs <frozen.batch.json> [--held id,id] [--dry] [--dir <path>, break-tests only]
 *
 * With-source stage for sat-cs-wic-v27, exactly as PREREG-WIC27-2026-10-23.md
 * stage 4 states it (v26's gate, itself v25's with bars unchanged; 40 items, so the 10% cold-miss bar is 4). Reads three graders:
 *   wic28.ws-<g>.phase1.json  cold: my_answer (letter of the stored order), exclusive,
 *                             second_defensible, n_struck, distractor_quality,
 *                             key_from_one_sentence, resolving_word_after_blank,
 *                             difficulty, above_ceiling[], antonym_pair, off_blueprint
 *   wic28.ws-<g>.json         phase 2 (key shown): key_ok, path_coherent, recommend_drop
 * Judgements are taken from PHASE 1 (made cold); phase 2 supplies only the three
 * key-aware fields. A cold miss counts as key_ok false.
 *
 * Stage bar: any grader cold-misses on more than 10% of items (4 of 40) -> FAIL,
 * exit 1, nothing written. Per item DROP: gate-verdict.mjs rules 1-6 (unchanged
 * semantics), key above ceiling per any grader, same distractor above ceiling per
 * >= 2, an antonym pair named by >= 2 graders, recommend_drop by any, panel-median
 * easy. HELD: majority off_blueprint or --held (dup-scan). Rule 8: majority
 * key_from_one_sentence caps the banked difficulty at medium.
 * four-world: the batch is the SERVED world per item from wic28-select.mjs; the gate
 * refuses the worlds file. A dropped item is dropped WHOLE, never re-served from another
 * world. Stage 5 adds the ATTRITION check: options-only picks from stage 2
 * (wic28-oo.key.json + three wic28-oo.solver-*.json) re-scored on the KEPT candidate items
 * only: E_kept = M_kept - M_control <= +10, M = arm rate minus the arm's own best fixed
 * letter. Dropping can correlate with which word was served (a world keyed on an odd word
 * is harder to make exclusive), and that would rebuild the leak the method removed.
 * Without the stage-2 files the gate refuses (exit 2), never reports a pass.
 * Writes sat-cs-wic-v28.kept.batch.json, sat-cs-wic-v28.held.batch.json, wic28.qc.json,
 * wic28.gate.json (per-item verdicts). Refuses (exit 2) on missing ids/fields.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
const args = process.argv.slice(2)
const di = args.indexOf('--dir')  // break-tests only: read graders / solvers / worlds and write outputs elsewhere
const D = di >= 0 ? args[di + 1] : 'scripts/study-bank', TAG = 'wic28'
const batchPath = args.find((a, i) => a.endsWith('.json') && args[i - 1] !== '--dir')
const hi = args.indexOf('--held'); const heldIn = new Set(hi >= 0 ? args[hi + 1].split(',').filter(Boolean) : [])
const dry = args.includes('--dry')
const rd = p => { if (!existsSync(p)) { console.error(`REFUSING: ${p} missing`); process.exit(2) } try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${p}: ${e.message}`); process.exit(2) } }
// a file whose items are an ARRAY is keyed by id; an id listed twice would be silently collapsed, so it refuses
const unwrap = (g, label = 'file') => {
  if (g && Array.isArray(g.items)) {
    const ids = g.items.map(r => r?.id)
    const dup = ids.filter((x, i) => ids.indexOf(x) !== i)
    if (dup.length) { console.error(`REFUSING: ${label} lists ${dup.slice(0, 5).join(', ')} more than once`); process.exit(2) }
    return Object.fromEntries(g.items.map(r => [r.id, r]))
  }
  return (g && g.items) ? g.items : g
}
if (!batchPath) { console.error('usage: wic28-gate.mjs <frozen.batch.json>'); process.exit(2) }
const batch = rd(batchPath)
if (!Array.isArray(batch) || !batch.length) { console.error(`REFUSING: ${batchPath} is not a non-empty array`); process.exit(2) }
if (batch.some(it => 'worlds' in it || 'kills' in it)) { console.error('REFUSING: this is the worlds file; grade the served batch from wic28-select.mjs'); process.exit(2) }
{ const ids = batch.map(it => it?.id); const dup = ids.filter((x, i) => ids.indexOf(x) !== i); if (dup.length) { console.error(`REFUSING: duplicate ids in the batch: ${[...new Set(dup)].join(', ')}`); process.exit(2) } }
for (const it of batch) if (!it?.id || !Array.isArray(it.choices) || it.choices.length !== 4 || !it.choices.includes(it.correct_answer)) { console.error(`REFUSING: ${it?.id}: not a four-choice item whose key is among its choices`); process.exit(2) }
{ // REQUIRED: the phase-1 snapshots must be the ones whose sha256 was recorded before the key was sent
  const shaFile = `${D}/${TAG}.ws-phase1.sha256`
  if (!existsSync(shaFile)) { console.error(`REFUSING: ${shaFile} missing (record the three phase-1 sha256s before sending the key)`); process.exit(2) }
  const rec = Object.fromEntries(readFileSync(shaFile, 'utf8').trim().split('\n').filter(Boolean).map(l => { const [h, f] = l.trim().split(/\s+/); return [String(f ?? '').replace(/^.*\//, ''), h] }))
  for (const g of ['d', 'e', 'f']) {
    const f = `${TAG}.ws-${g}.phase1.json`
    if (!rec[f]) { console.error(`REFUSING: ${shaFile} does not list ${f}`); process.exit(2) }
    if (!existsSync(`${D}/${f}`)) { console.error(`REFUSING: ${D}/${f} missing`); process.exit(2) }
    const h = createHash('sha256').update(readFileSync(`${D}/${f}`)).digest('hex')
    if (h !== rec[f]) { console.error(`REFUSING: ${f} sha256 ${h.slice(0, 12)} != recorded ${String(rec[f]).slice(0, 12)} (phase 1 edited after the key?)`); process.exit(2) }
  }
}
const G = ['d', 'e', 'f']
const P1 = G.map(g => unwrap(rd(`${D}/${TAG}.ws-${g}.phase1.json`), `grader ${g} phase 1`))
const P2raw = G.map(g => rd(`${D}/${TAG}.ws-${g}.json`))
const P2 = P2raw.map((x, i) => unwrap(x, `grader ${G[i]} phase 2`))
const LET = ['A', 'B', 'C', 'D']
for (const [gi, g] of G.entries()) for (const it of batch) {
  if (!P1[gi][it.id]) { console.error(`REFUSING: grader ${g} phase 1 lacks ${it.id}`); process.exit(2) }
  if (!P2[gi][it.id]) { console.error(`REFUSING: grader ${g} phase 2 lacks ${it.id}`); process.exit(2) }
  const r = P1[gi][it.id]
  if (!LET.includes(String(r.my_answer).toUpperCase())) { console.error(`REFUSING: grader ${g} ${it.id} my_answer "${r.my_answer}" not a letter`); process.exit(2) }
  if (!['easy', 'medium', 'hard'].includes(r.difficulty)) { console.error(`REFUSING: grader ${g} ${it.id} difficulty "${r.difficulty}"`); process.exit(2) }
  if (typeof P2[gi][it.id].key_ok !== 'boolean') { console.error(`REFUSING: grader ${g} ${it.id} phase-2 key_ok not boolean`); process.exit(2) }
}
const keyLetter = it => LET[it.choices.indexOf(it.correct_answer)]
const median = xs => xs.slice().sort((a, b) => a - b)[1]
const RANK = { easy: 0, medium: 1, hard: 2 }, DN = ['easy', 'medium', 'hard']
const QR = { weak: 0, plausible: 1, strong: 2 }, QN = ['weak', 'plausible', 'strong']
const words = v => (Array.isArray(v) ? v : (v ? [v] : [])).map(x => String(x).toLowerCase().trim()).filter(Boolean)

const coldMiss = G.map((g, gi) => batch.filter(it => String(P1[gi][it.id].my_answer).toUpperCase() !== keyLetter(it)).map(it => it.id))
const maxMiss = Math.floor(batch.length * 0.10)
G.forEach((g, gi) => console.log(`grader ${g}: cold ${batch.length - coldMiss[gi].length}/${batch.length} on key${coldMiss[gi].length ? ` (miss ${coldMiss[gi].join(', ')})` : ''}`))
if (coldMiss.some(m => m.length > maxMiss)) { console.log(`STAGE FAIL: a grader cold-missed more than ${maxMiss} of ${batch.length}`); process.exit(1) }

const out = {}, kept = [], held = [], qc = {}
for (const it of batch) {
  const r1 = P1.map(p => p[it.id]), r2 = P2.map(p => p[it.id]), why = []
  const ch = it.choices.map(c => c.toLowerCase()), key = it.correct_answer.toLowerCase()
  const keyOk = G.map((_, i) => r2[i].key_ok === true && !coldMiss[i].includes(it.id))
  if (keyOk.some(x => !x)) why.push(`1 key disputed/cold miss by ${keyOk.filter(x => !x).length}/3`)
  const nonEx = r1.filter(r => r.exclusive === false); if (nonEx.length >= 2) why.push(`2 non-exclusive ${nonEx.length}/3`)
  if (r1.filter(r => r.distractor_quality === 'weak').length >= 2) why.push('3 distractors weak by majority')
  const struck = r1.map(r => Number(r.n_struck) || 0); if (median(struck) >= 2) why.push(`4 median struck ${median(struck)} [${struck}]`)
  const inco = r2.filter(r => r.path_coherent === false).length; if (inco) why.push(`5 path wrong per ${inco}`)
  const res = r1.filter(r => r.resolving_word_after_blank && String(r.resolving_word_after_blank).toLowerCase() !== 'null'); if (res.length >= 2) why.push(`6 resolving word ${res.map(r => r.resolving_word_after_blank).join('/')}`)
  const ac = r1.map(r => words(r.above_ceiling).filter(w => ch.includes(w)))
  if (ac.some(a => a.includes(key))) why.push(`key above ceiling per ${ac.filter(a => a.includes(key)).length}`)
  for (const d of ch.filter(c => c !== key)) { const n = ac.filter(a => a.includes(d)).length; if (n >= 2) why.push(`distractor "${d}" above ceiling per ${n}`) }
  const ap = r1.filter(r => { const w = words(r.antonym_pair); return w.length === 2 && w.every(x => ch.includes(x)) })
  if (ap.length >= 2) why.push(`antonym pair per ${ap.length}: ${ap.map(r => words(r.antonym_pair).join('/')).join(', ')}`)
  const rd2 = r2.filter(r => r.recommend_drop === true).length; if (rd2) why.push(`recommend_drop per ${rd2}`)
  let diff = DN[median(r1.map(r => RANK[r.difficulty]))]
  const kfos = r1.filter(r => r.key_from_one_sentence === true).length
  const capped = kfos >= 2 && diff === 'hard'
  if (capped) diff = 'medium'
  if (DN[median(r1.map(r => RANK[r.difficulty]))] === 'easy') why.push('panel median easy')
  const offB = r1.filter(r => r.off_blueprint === true).length
  let verdict = why.length ? 'DROP' : (offB >= 2 || heldIn.has(it.id)) ? 'HELD' : 'KEEP'
  out[it.id] = { verdict, why, difficulty: diff, rule8_capped: capped, grades: r1.map(r => r.difficulty), struck, kfos }
  console.log(`${verdict.padEnd(4)} ${it.id} [${r1.map(r => r.difficulty[0]).join('')}] -> ${diff}${capped ? ' (rule 8 cap)' : ''}  ${why.join(' | ')}${verdict === 'HELD' ? (offB >= 2 ? ' off-blueprint' : ' dup-scan') : ''}`)
  if (verdict === 'KEEP') {
    kept.push(it)
    qc[it.id] = { key_votes: keyOk.filter(Boolean).length, difficulty: diff, distractor_quality: QN[median(r1.map(r => QR[r.distractor_quality] ?? 1))], passage_needed: res.length < 2 }
  } else if (verdict === 'HELD') held.push(it)
}
// ---- stage 5 attrition check: stage-2 options-only picks re-scored on the kept candidates ----
const ook = rd(`${D}/${TAG}-oo.key.json`)
const sol = ['a', 'b', 'c'].map(x => unwrap(rd(`${D}/${TAG}-oo.solver-${x}.json`), `solver ${x}`))
const pickOf = r => String(r?.pick ?? r?.answer ?? r?.letter ?? '').toUpperCase()
const arm = ids => {
  if (!ids.length) return null
  const d = {}; for (const i of ids) d[ook[i].letter] = (d[ook[i].letter] ?? 0) + 1
  const line = Math.max(...Object.values(d)) / ids.length
  let hit = 0, tot = 0
  for (const s of sol) for (const i of ids) { const p = pickOf(s[i]); if (!LET.includes(p)) { console.error(`REFUSING: solver file lacks a pick for ${i}`); process.exit(2) } tot++; if (p === ook[i].letter) hit++ }
  return { n: ids.length, picks: tot, rate: hit / tot, line, M: 100 * (hit / tot - line) }
}
const keptIds = new Set(kept.map(it => it.id))
const candAll = Object.keys(ook).filter(i => ook[i].kind === 'candidate')
const missingCand = batch.filter(it => !candAll.some(i => ook[i].localId === it.id)).map(it => it.id)
if (missingCand.length) { console.error(`REFUSING: ${TAG}-oo.key.json lacks candidates ${missingCand.slice(0, 5).join(', ')} - wrong render for this batch`); process.exit(2) }
const ctlA = arm(Object.keys(ook).filter(i => ook[i].kind === 'live-control'))
const allA = arm(candAll)
const keptA = arm(candAll.filter(i => keptIds.has(ook[i].localId)))
if (!ctlA || !allA) { console.error('REFUSING: options-only key file has an empty arm'); process.exit(2) }
const fmt = a => `n=${a.n} picks=${a.picks} rate ${(100 * a.rate).toFixed(1)}% line ${(100 * a.line).toFixed(1)}% M ${a.M >= 0 ? '+' : ''}${a.M.toFixed(1)}`
// v28: the control is MEASURED only inside (line + 5, 90%], as stage 2 states; compared on 0.1-point rounding
const r1 = x => Math.round(x * 10) / 10
const ctlMeasured = r1(100 * ctlA.rate) > r1(100 * ctlA.line + 5) && r1(100 * ctlA.rate) <= 90
console.log(`\nstage 5 attrition (stage-2 picks): control ${fmt(ctlA)} [${ctlMeasured ? 'MEASURED' : 'NOT MEASURED: outside (line + 5, 90%]'}]; candidate all ${fmt(allA)} E ${(allA.M - ctlA.M).toFixed(1)}`)
let attritionFail = false
if (!keptA) console.log('  kept candidate arm: n=0 (nothing kept; no rate reported)')
else {
  const E = keptA.M - ctlA.M
  // v28: with the control NOT MEASURED, the kept arm is held to v27's stage-2 fallback, M <= +10 on its own
  const stat = ctlMeasured ? E : keptA.M
  console.log(`  kept candidate ${fmt(keptA)}  ${ctlMeasured ? `E_kept ${E >= 0 ? '+' : ''}${E.toFixed(1)}` : `control not measured, so M_kept ${keptA.M >= 0 ? '+' : ''}${keptA.M.toFixed(1)} is the statistic (E_kept would be ${E.toFixed(1)})`} (bar <= +10)${keptA.n < 8 ? '  [n < 8: too few to measure; the kept set is HELD, not passed]' : ''}`)
  // v26 fix, kept: compare on 0.1-point rounding. v25's raw `E > 10` failed an exact +10.0 (45.0% - 25.0% is
  // 20.000000000000004 in floating point), although the bar is <= +10. Found by the v26 boundary break-test.
  if (r1(stat) > 10 || keptA.n < 8) attritionFail = true
}
// v28: the control split into four-world cohorts (near chance by construction) and the rest. REPORTED, decides nothing:
// it shows how much of the control's headroom the four-world rows are taking (PREREG-WIC28, stage 2).
{ const ctlIds = Object.keys(ook).filter(i => ook[i].kind === 'live-control'), fw = i => /^rw-v2[5-9]-cs-wic$/.test(String(ook[i].cohort ?? ''))
  const a4 = arm(ctlIds.filter(fw)), aO = arm(ctlIds.filter(i => !fw(i)))
  console.log(`  control sub-read (reported only): four-world cohorts ${a4 ? fmt(a4) : 'n=0'}; other cohorts ${aO ? fmt(aO) : 'n=0'}`) }
// v28: the graders' cross-item answer, reported only
G.forEach((g, i) => console.log(`grader ${g} batch_note: ${P2raw[i]?.batch_note ? String(P2raw[i].batch_note) : '(none written)'}`))
// reported, not decided: where the kept keys sit in each item's declared rarity order (selection balanced this for all served items)
const wf = rd(`${D}/sat-cs-wic-v28.worlds.json`)
const ro = Object.fromEntries(wf.map(it => [it.id, it.rarity_order]))
const rr = [0, 0, 0, 0]; for (const it of kept) { const r = (ro[it.id] ?? []).indexOf(it.correct_answer); if (r < 0) { console.error(`REFUSING: ${it.id} key not in the worlds file's rarity_order`); process.exit(2) } rr[r]++ }
console.log(`  kept keys by declared rarity rank (1 = most common .. 4 = rarest): ${rr.join('/')} of ${kept.length}`)
if (attritionFail) console.log('STAGE 5 FAIL/NOT MEASURED: kept set HELD whole (attrition)')
const h = {}; for (const id of Object.keys(qc)) h[qc[id].difficulty] = (h[qc[id].difficulty] ?? 0) + 1
console.log(`\nkept ${kept.length} of ${batch.length}, held ${held.length}, dropped ${batch.length - kept.length - held.length}; banked difficulty ${JSON.stringify(h)}`)
if (!dry && !attritionFail) {
  writeFileSync(`${D}/sat-cs-wic-v28.kept.batch.json`, JSON.stringify(kept, null, 2) + '\n')
  writeFileSync(`${D}/sat-cs-wic-v28.held.batch.json`, JSON.stringify(held, null, 2) + '\n')
  writeFileSync(`${D}/${TAG}.qc.json`, JSON.stringify(qc, null, 1) + '\n')
  writeFileSync(`${D}/${TAG}.gate.json`, JSON.stringify(out, null, 1) + '\n')
}
if (attritionFail) process.exit(1)
