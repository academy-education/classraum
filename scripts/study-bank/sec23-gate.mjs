#!/usr/bin/env node
/**
 * sec23-gate.mjs <frozen batch.json> [--dir D] [--sha F] [--held id,id] [--dry]
 *
 * COPIED from sec22-gate.mjs (v22) with ids and paths changed to v23 and nothing
 * else: the rule is unchanged (PREREG-SEC23 "Bars"). Replay-tested on v22 data.
 *
 * The per-item with-source verdict of PREREG-SEC23-2026-10-23.md (Bars, "Per-item
 * drop" and "Conservative extensions"), written per Amendment 1 note 6 BEFORE any
 * grader ran. It produces the otherwise-KEPT set that sec23-template-cover.mjs
 * takes as --kept. It does not apply the template cover itself.
 *
 * INPUTS (all in --dir, default: this script's directory)
 *   sec23.ws-<g>.phase1.json   g = d, e, f. The PHASE-1 SNAPSHOT (cold, no key in
 *                              existence): a byte copy of the grader file taken
 *                              when its sha256 was recorded. Every judgement
 *                              below is read from HERE.
 *   sec23.ws-<g>.json          the same file after phase 2. Only the key-aware
 *                              fields are read from here: key, key_ok, cold_miss,
 *                              path_coherent, recommend_drop, drop_reason.
 *   sec23.ws-phase1.sha256     sha256sum-style list (override with --sha). Each
 *                              phase-1 snapshot's sha256 must appear in it, or
 *                              the run is refused: an unverified snapshot is not
 *                              a phase-1 snapshot.
 *   Rows may sit at the top level, under .items (object keyed by id), or under
 *   .items as an array of rows with `id` (the shapes gate-verdict.mjs reads).
 *
 * PHASE-1 FIELDS REQUIRED for every batch id in every snapshot (refused if absent):
 *   my_answer (A-D), exclusive (bool), n_struck (0-3), distractor_quality
 *   (weak|plausible|strong), difficulty (easy|medium|hard), off_blueprint (bool),
 *   matches_open_mark (bool), resolving_word_after_blank (key present; null = none),
 *   and the file-level summary.near_duplicates (or top-level near_duplicates),
 *   which sec23-template-cover.mjs needs.
 * PHASE-2 FIELDS REQUIRED: key (A-D, and it must equal the frozen key letter, or
 *   that grader's key_ok judged a different key and is unreadable), key_ok,
 *   path_coherent, recommend_drop (bools). cold_miss is recomputed from the
 *   snapshot's my_answer, never trusted; a disagreement is printed.
 * Extra ids in any file, or a missing id, refuse (exit 2).
 *
 * PHASE-1 FIELDS CHANGED IN PHASE 2 are listed per grader. The snapshot is used
 * regardless (prereg: "a grader that changed a phase-1 field has its phase-1
 * snapshot used").
 *
 * VERDICTS (prereg wording; "majority" = 2 of 3)
 *   DROP  1  key disputed by any grader: key_ok false, or a cold miss (snapshot
 *            my_answer != frozen key letter)
 *         2  not exclusive by majority
 *         3  distractors weak by majority
 *         4  median n_struck >= 2
 *         5  path_coherent false per any grader
 *         6  a grader-majority resolving word within four words after the blank
 *         7  a grader majority marks matches_open_mark: true
 *         R  recommend_drop true per any grader
 *         E  panel-median easy (median of the three snapshot difficulties)
 *   HELD  (only if not dropped) off_blueprint by majority, or the id is in --held
 *         (the sec-near-dup.mjs hold under Amendment 2: passage Jaccard >= 0.20
 *         or an identical option string set)
 *   KEEP  otherwise. These are the "otherwise KEPT" items of the template rule.
 * doubled_word is printed, never decides (the pre-flight drop is the decidable one).
 *
 * OUTPUT (skipped with --dry)
 *   sat-sec-hard-v23.otherwise-kept.json  JSON array of KEEP ids -> --kept
 *   sec23.gate.json                       per-item verdict, reasons, panel difficulty
 * EXIT 0 computed; 2 refused.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const args = process.argv.slice(2)
const opt = { dir: dirname(fileURLToPath(import.meta.url)), held: '' }
let batchPath = null
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--dry') opt.dry = true
  else if (['--dir', '--sha', '--held'].includes(a)) { const v = args[++i]; if (v === undefined) die(`${a} needs a value`); opt[a.slice(2)] = v }
  else if (a.startsWith('--')) die(`unknown flag ${a}`)
  else if (batchPath) die(`one batch file only (got ${batchPath} and ${a})`)
  else batchPath = a
}
if (!batchPath) { console.error('usage: sec23-gate.mjs <frozen batch.json> [--dir D] [--sha F] [--held id,id] [--dry]'); process.exit(2) }
const D = opt.dir
const shaPath = opt.sha ?? join(D, 'sec23.ws-phase1.sha256')
const raw = f => { if (!existsSync(f)) die(`${f} missing`); return readFileSync(f) }
const json = f => { try { return JSON.parse(raw(f).toString('utf8')) } catch (e) { die(`cannot parse ${f}: ${e.message}`) } }
const sha = b => createHash('sha256').update(b).digest('hex')

const batch = json(batchPath)
if (!Array.isArray(batch) || !batch.length) die(`${batchPath} is not a non-empty array`)
const LET = ['A', 'B', 'C', 'D']
const keyLetter = {}
for (const it of batch) {
  const i = (it.choices ?? []).indexOf(it.correct_answer)
  if (!it.id || it.choices?.length !== 4 || i < 0) die(`${it.id ?? '(no id)'}: not a four-choice item whose key is among its choices`)
  keyLetter[it.id] = LET[i]
}
const ids = batch.map(it => it.id)
if (new Set(ids).size !== ids.length) die('duplicate ids in the batch')
const heldIn = new Set(opt.held.split(',').filter(Boolean))
for (const h of heldIn) if (!keyLetter[h]) die(`--held id ${h} is not in the batch`)

const unwrap = (g, name) => {
  if (g && g.items && typeof g.items === 'object' && !Array.isArray(g.items)) return g.items
  if (g && Array.isArray(g.items)) { if (!g.items.every(r => r && r.id)) die(`${name}: .items array has a row without id`); return Object.fromEntries(g.items.map(r => [r.id, r])) }
  const { summary, grader, phase2_note, near_duplicates, ...rest } = g ?? {}
  return rest
}
const G = ['d', 'e', 'f']
const known = new Set(raw(shaPath).toString('utf8').split('\n').map(l => l.trim().split(/\s+/)[0]).filter(h => /^[0-9a-f]{64}$/.test(h)))
if (!known.size) die(`${shaPath} lists no sha256 values`)

const P1 = [], P2 = []
for (const g of G) {
  const f1 = join(D, `sec23.ws-${g}.phase1.json`), f2 = join(D, `sec23.ws-${g}.json`)
  const b1 = raw(f1)
  if (!known.has(sha(b1))) die(`${f1} sha256 ${sha(b1).slice(0, 12)}... is not in ${shaPath}: not the phase-1 snapshot`)
  const j1 = json(f1), j2 = json(f2)
  const nd = j1?.summary?.near_duplicates ?? j1?.near_duplicates
  if (!Array.isArray(nd)) die(`${f1} has no near_duplicates array (summary.near_duplicates): the template cover cannot run on it`)
  for (const [f, j, arr] of [[f1, j1, P1], [f2, j2, P2]]) {
    const rows = unwrap(j, f)
    const got = Object.keys(rows).sort(), want = ids.slice().sort()
    const missing = want.filter(x => !rows[x]), extra = got.filter(x => !keyLetter[x])
    if (missing.length) die(`${f} lacks ${missing.length} batch id(s): ${missing.join(', ')}`)
    if (extra.length) die(`${f} carries ${extra.length} id(s) not in the batch: ${extra.join(', ')}`)
    arr.push(rows)
  }
}

const bool = v => typeof v === 'boolean'
const P1F = ['my_answer', 'exclusive', 'second_defensible', 'convention', 'resolving_word_after_blank', 'n_struck', 'matches_open_mark', 'doubled_word', 'distractor_quality', 'difficulty', 'off_blueprint', 'note']
for (const [gi, g] of G.entries()) for (const id of ids) {
  const r = P1[gi][id], q = P2[gi][id], at = `grader ${g} ${id}`
  if (!LET.includes(String(r.my_answer).toUpperCase())) die(`${at}: phase-1 my_answer "${r.my_answer}" is not A-D`)
  if (!bool(r.exclusive)) die(`${at}: phase-1 exclusive missing/not boolean`)
  if (!Number.isInteger(Number(r.n_struck)) || r.n_struck === null || r.n_struck === '' || Number(r.n_struck) < 0 || Number(r.n_struck) > 3) die(`${at}: phase-1 n_struck "${r.n_struck}" is not 0-3`)
  if (!['weak', 'plausible', 'strong'].includes(r.distractor_quality)) die(`${at}: phase-1 distractor_quality "${r.distractor_quality}"`)
  if (!['easy', 'medium', 'hard'].includes(r.difficulty)) die(`${at}: phase-1 difficulty "${r.difficulty}"`)
  if (!bool(r.off_blueprint)) die(`${at}: phase-1 off_blueprint missing/not boolean`)
  if (!bool(r.matches_open_mark)) die(`${at}: phase-1 matches_open_mark missing/not boolean`)
  if (!('resolving_word_after_blank' in r)) die(`${at}: phase-1 resolving_word_after_blank absent (null means none; absent is unreadable)`)
  if (!LET.includes(String(q.key).toUpperCase())) die(`${at}: phase-2 key "${q.key}" is not A-D`)
  if (String(q.key).toUpperCase() !== keyLetter[id]) die(`${at}: phase-2 key ${q.key} != frozen key ${keyLetter[id]}; that grader's key_ok judged another key`)
  for (const k of ['key_ok', 'path_coherent', 'recommend_drop']) if (!bool(q[k])) die(`${at}: phase-2 ${k} missing/not boolean`)
}

// Phase-1 fields changed during phase 2 (snapshot used regardless).
for (const [gi, g] of G.entries()) {
  const ch = []
  for (const id of ids) for (const k of P1F) if (k in P1[gi][id] && JSON.stringify(P1[gi][id][k]) !== JSON.stringify(P2[gi][id][k])) ch.push(`${id}.${k}`)
  console.log(`grader ${g}: phase-1 fields changed in phase 2: ${ch.length}${ch.length ? ` (${ch.slice(0, 12).join(', ')}${ch.length > 12 ? ', ...' : ''}) - snapshot used` : ''}`)
}

const RANK = { easy: 0, medium: 1, hard: 2 }, DN = ['easy', 'medium', 'hard']
const median3 = xs => xs.slice().sort((a, b) => a - b)[1]
const isRes = v => v !== null && v !== undefined && v !== false && String(v).trim() !== '' && String(v).toLowerCase() !== 'null'
const out = {}, keep = []
const tally = { KEEP: 0, DROP: 0, HELD: 0 }
for (const id of ids) {
  const r1 = P1.map(p => p[id]), r2 = P2.map(p => p[id]), why = []
  const cold = r1.map(r => String(r.my_answer).toUpperCase() !== keyLetter[id])
  r2.forEach((q, i) => { if (bool(q.cold_miss) && q.cold_miss !== cold[i]) console.log(`note: grader ${G[i]} ${id} wrote cold_miss ${q.cold_miss}, recomputed ${cold[i]} (recomputed used)`) })
  const disputed = G.filter((_, i) => r2[i].key_ok === false || cold[i])
  if (disputed.length) why.push(`1 key disputed/cold miss by ${disputed.join('')}`)
  const nonEx = r1.filter(r => r.exclusive === false).length; if (nonEx >= 2) why.push(`2 non-exclusive ${nonEx}/3`)
  const weak = r1.filter(r => r.distractor_quality === 'weak').length; if (weak >= 2) why.push(`3 distractors weak ${weak}/3`)
  const struck = r1.map(r => Number(r.n_struck)); if (median3(struck) >= 2) why.push(`4 median struck ${median3(struck)} [${struck}]`)
  const inco = G.filter((_, i) => r2[i].path_coherent === false); if (inco.length) why.push(`5 path wrong per ${inco.join('')}`)
  const res = r1.filter(r => isRes(r.resolving_word_after_blank)); if (res.length >= 2) why.push(`6 resolving word ${res.length}/3 (${res.map(r => r.resolving_word_after_blank).join(' / ')})`)
  const om = r1.filter(r => r.matches_open_mark === true).length; if (om >= 2) why.push(`7 matches open mark ${om}/3`)
  const rec = G.filter((_, i) => r2[i].recommend_drop === true); if (rec.length) why.push(`R recommend_drop per ${rec.join('')}`)
  const diff = DN[median3(r1.map(r => RANK[r.difficulty]))]
  if (diff === 'easy') why.push('E panel median easy')
  const offB = r1.filter(r => r.off_blueprint === true).length
  const verdict = why.length ? 'DROP' : (offB >= 2 || heldIn.has(id)) ? 'HELD' : 'KEEP'
  const heldWhy = verdict === 'HELD' ? [offB >= 2 ? `off-blueprint ${offB}/3` : null, heldIn.has(id) ? 'near-dup hold' : null].filter(Boolean) : []
  tally[verdict]++
  const dw = r1.filter(r => r.doubled_word === true).length
  out[id] = { verdict, why: [...why, ...heldWhy], panel_difficulty: diff, grades: r1.map(r => r.difficulty), struck, key_votes: 3 - disputed.length, doubled_word_flags: dw }
  console.log(`${verdict} ${id} [${r1.map(r => r.difficulty[0]).join('')}] -> ${diff}  keys ${3 - disputed.length}/3${dw ? `  (doubled_word flagged by ${dw}, recorded)` : ''}  ${[...why, ...heldWhy].join(' | ')}`)
  if (verdict === 'KEEP') keep.push(id)
}
const h = {}; for (const id of keep) h[out[id].panel_difficulty] = (h[out[id].panel_difficulty] ?? 0) + 1
console.log(`\notherwise kept ${tally.KEEP} of ${ids.length} (${JSON.stringify(h)}), held ${tally.HELD}, dropped ${tally.DROP}`)
if (opt.dry) console.log('--dry: nothing written')
else {
  writeFileSync(join(D, 'sat-sec-hard-v23.otherwise-kept.json'), JSON.stringify(keep, null, 1) + '\n')
  writeFileSync(join(D, 'sec23.gate.json'), JSON.stringify(out, null, 1) + '\n')
  console.log(`wrote ${join(D, 'sat-sec-hard-v23.otherwise-kept.json')} and ${join(D, 'sec23.gate.json')}`)
}
