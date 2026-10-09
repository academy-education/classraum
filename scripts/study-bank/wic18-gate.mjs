#!/usr/bin/env node
/**
 * wic18-gate.mjs <frozen.batch.json> [--held id,id] [--dry]
 *
 * With-source stage for sat-cs-wic-v18, exactly as PREREG-WIC18-2026-10-09.md
 * stage 4 states it. Reads three graders:
 *   wic18.ws-<g>.phase1.json  cold: my_answer (letter of the stored order), exclusive,
 *                             second_defensible, n_struck, distractor_quality,
 *                             key_from_one_sentence, resolving_word_after_blank,
 *                             difficulty, above_ceiling[], antonym_pair, off_blueprint
 *   wic18.ws-<g>.json         phase 2 (key shown): key_ok, path_coherent, recommend_drop
 * Judgements are taken from PHASE 1 (made cold); phase 2 supplies only the three
 * key-aware fields. A cold miss counts as key_ok false.
 *
 * Stage bar: any grader cold-misses on more than 10% of items (4 of 40) -> FAIL,
 * exit 1, nothing written. Per item DROP: gate-verdict.mjs rules 1-6 (unchanged
 * semantics), key above ceiling per any grader, same distractor above ceiling per
 * >= 2, an antonym pair named by >= 2 graders, recommend_drop by any, panel-median
 * easy. HELD: majority off_blueprint or --held (dup-scan). Rule 8: majority
 * key_from_one_sentence caps the banked difficulty at medium.
 * Writes sat-cs-wic-v18.kept.batch.json, sat-cs-wic-v18.held.batch.json, wic18.qc.json,
 * wic18.gate.json (per-item verdicts). Refuses (exit 2) on missing ids/fields.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
const D = 'scripts/study-bank', TAG = 'wic18'
const args = process.argv.slice(2)
const batchPath = args.find(a => a.endsWith('.json'))
const hi = args.indexOf('--held'); const heldIn = new Set(hi >= 0 ? args[hi + 1].split(',').filter(Boolean) : [])
const dry = args.includes('--dry')
const rd = p => { if (!existsSync(p)) { console.error(`REFUSING: ${p} missing`); process.exit(2) } try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${p}: ${e.message}`); process.exit(2) } }
const unwrap = g => (g && g.items && !Array.isArray(g.items)) ? g.items : (g && Array.isArray(g.items) ? Object.fromEntries(g.items.map(r => [r.id, r])) : g)
if (!batchPath) { console.error('usage: wic18-gate.mjs <frozen.batch.json>'); process.exit(2) }
const batch = rd(batchPath)
const G = ['d', 'e', 'f']
const P1 = G.map(g => unwrap(rd(`${D}/${TAG}.ws-${g}.phase1.json`)))
const P2 = G.map(g => unwrap(rd(`${D}/${TAG}.ws-${g}.json`)))
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
const h = {}; for (const id of Object.keys(qc)) h[qc[id].difficulty] = (h[qc[id].difficulty] ?? 0) + 1
console.log(`\nkept ${kept.length} of ${batch.length}, held ${held.length}, dropped ${batch.length - kept.length - held.length}; banked difficulty ${JSON.stringify(h)}`)
if (!dry) {
  writeFileSync(`${D}/sat-cs-wic-v18.kept.batch.json`, JSON.stringify(kept, null, 2) + '\n')
  writeFileSync(`${D}/sat-cs-wic-v18.held.batch.json`, JSON.stringify(held, null, 2) + '\n')
  writeFileSync(`${D}/${TAG}.qc.json`, JSON.stringify(qc, null, 1) + '\n')
  writeFileSync(`${D}/${TAG}.gate.json`, JSON.stringify(out, null, 1) + '\n')
}
