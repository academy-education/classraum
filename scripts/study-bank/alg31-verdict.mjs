#!/usr/bin/env node
/**
 * alg31-verdict.mjs <frozen.batch.json> <grader-d.json> <grader-e.json> <grader-f.json> [--write]
 *
 * Applies PREREG-MATH-ALG31-2026-10-23.md's per-item bars to three with-source grader files (stage 2,
 * each row carrying its stage-1 fields unchanged; alg31-coldcheck.mjs proves that). alg26-verdict.mjs
 * with the field names of the mf30 grader brief and the mf30 confirm-by-hand signals. Written before
 * any grader runs.
 *
 * DROP (any one): 1 key disputed (key_ok false by any) | 2 not exclusive by majority | 3 distractors
 *   weak by majority | 4 median n_struck >= 2, or the KEY in any grader's `struck` | 6 a majority report
 *   routine plug-back reaching the key in <= 2 tries | 7 a majority name an EARLIER id (frozen order,
 *   seed 20261031) as one template, a pair counted if either row names the other | EXT-1 drop_recommend
 *   by any.
 * CONFIRM BY HAND (from any one grader; listed, decided in alg31.confirm.json as true = drop, false =
 *   read and rejected, each with a reason): r4key key_identifiable_free | r5 path_coherent false |
 *   r7pair option_pair_tell | r8 one_sided on an extreme key | r9 interior_tell / arith_tell |
 *   r10 single_bound_kills_all on an extreme key | r11 a one-grader template or a live_duplicate note.
 * HOLD: off-blueprint by majority. Difficulty: three-grader PANEL MEDIAN of difficulty_final (else
 *   difficulty); easy -> REJECT-EASY (held, never relabelled).
 *
 * --write  refuses unless every CONFIRM on an otherwise-kept item has a decision in alg31.confirm.json;
 *          then writes sat-math-v31-alg.kept.batch.json (KEEP fields only, banked difficulty = panel
 *          median), .held.batch.json and .dropped.json, and prints the KEPT-SET BAND (key at an extreme
 *          40.0-60.0% at n >= 10; under 10 = no measurement, nothing inserted) - it never edits, moves
 *          or re-labels an item to pass it.
 * Writes alg31.verdict.json. Refuses (exit 2) on an empty batch, a grader file missing an item, or a
 * frozen file that is not the sat-math-v31-alg batch.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { scoreItem } from './key-extremity-breakdown.mjs'
import { keyExtremityVerdict } from './key-extremity-gate.mjs'
import { COHORT } from './alg31-slots.mjs'

const D = new URL('.', import.meta.url).pathname
const args = process.argv.slice(2), write = args.includes('--write')
const [bp, ...gp] = args.filter(a => !a.startsWith('--'))
if (!bp || gp.length !== 3) { console.error('usage: alg31-verdict.mjs <frozen.batch.json> <g-d.json> <g-e.json> <g-f.json> [--write]'); process.exit(2) }
if (!bp.endsWith(`${COHORT}.batch.json`)) { console.error(`REFUSING: pass ${COHORT}.batch.json (the frozen file), got ${bp}`); process.exit(2) }
let items, G
try { items = JSON.parse(readFileSync(bp, 'utf8')); G = gp.map(p => JSON.parse(readFileSync(p, 'utf8'))) } catch (e) { console.error(`REFUSING: ${e.message}`); process.exit(2) }
if (!Array.isArray(items) || !items.length) { console.error('REFUSING: empty batch'); process.exit(2) }
for (const [i, g] of G.entries()) for (const it of items) if (!g[it.id]) { console.error(`REFUSING: ${gp[i]} has no row for ${it.id}`); process.exit(2) }
const val = s => { const t = String(s).trim(); const m = t.match(/^(-?)(\d+)\s*\/\s*(\d+)$/); return m ? (m[1] ? -1 : 1) * m[2] / m[3] : Number(t) }
const same = (a, b) => Math.abs(val(a) - val(b)) < 1e-9
const order = new Map(items.map((x, i) => [x.id, i]))
const RANK = { easy: 0, medium: 1, hard: 2 }
const filled = v => v != null && v !== false && !(typeof v === 'string' && !v.trim())
const out = {}
for (const it of items) {
  const R = G.map(g => g[it.id])
  const sc = scoreItem(it.choices.map(String), String(it.correct_answer)), extreme = !sc.skip && (sc.keyMin || sc.keyMax)
  const why = [], confirm = []
  if (R.some(r => r.key_ok === false)) why.push(`rule1 key disputed (${R.filter(r => r.key_ok === false).length}/3)`)
  if (R.filter(r => r.exclusive === false).length >= 2) why.push('rule2 not exclusive by majority')
  if (R.filter(r => r.distractors_weak === true).length >= 2) why.push('rule3 distractors weak by majority')
  const ns = R.map(r => Number(r.n_struck) || 0).sort((a, b) => a - b)
  if (ns[1] >= 2) why.push(`rule4 median struck ${ns[1]}`)
  if (R.some(r => (r.struck || []).map(String).some(s => same(s, it.correct_answer)))) why.push('rule4 key struck')
  if (R.filter(r => r.plugback_routine === true && r.plugback_tries != null && r.plugback_tries <= 2).length >= 2) why.push('rule6 plug-back <= 2 by majority')
  const earlier = {}, anyTemplate = {}
  for (const [gi, g] of G.entries()) for (const t of order.keys()) {
    if (t === it.id) continue
    const named = (g[it.id].same_template_as || []).includes(t) || (g[t].same_template_as || []).includes(it.id)
    if (!named) continue
    anyTemplate[t] = (anyTemplate[t] || '') + 'DEF'[gi]
    if (order.get(t) < order.get(it.id)) earlier[t] = (earlier[t] || 0) + 1
  }
  for (const [t, n] of Object.entries(earlier)) if (n >= 2) why.push(`rule7 template of ${t} (${n}/3)`)
  if (R.some(r => r.drop_recommend === true)) why.push(`EXT-1 drop_recommend by ${R.map((r, i) => r.drop_recommend ? 'DEF'[i] : '').join('')}`)
  const by = f => R.map((r, i) => f(r) ? 'DEF'[i] : '').join('')
  const c = (code, f, cond = true) => { const w = by(f); if (cond && w) confirm.push(`${code} by ${w}`) }
  c('r4key key_identifiable_free', r => r.key_identifiable_free === true)
  c('r5 path incoherent', r => r.path_coherent === false)
  c('r7pair option_pair_tell', r => filled(r.option_pair_tell))
  c('r8 one_sided', r => r.one_sided === true, extreme)
  c('r9 interior/arith tell', r => r.interior_tell === true || filled(r.arith_tell))
  c('r10 single_bound_kills_all', r => r.single_bound_kills_all === true, extreme)
  c('r11 live_duplicate', r => filled(r.live_duplicate))
  for (const [t, w] of Object.entries(anyTemplate)) if (w.length === 1 && order.get(t) < order.get(it.id)) confirm.push(`r11 one-grader template of ${t} by ${w}`)
  const offBp = R.filter(r => r.on_blueprint === false).length
  const diffs = R.map(r => r.difficulty_final ?? r.difficulty)
  if (diffs.some(d => !(d in RANK))) { console.error(`REFUSING: ${it.id} has a difficulty outside easy/medium/hard (${diffs.join(',')})`); process.exit(2) }
  const difficulty = Object.keys(RANK).find(k => RANK[k] === diffs.map(d => RANK[d]).sort((a, b) => a - b)[1])
  const status = why.length ? 'DROP' : offBp >= 2 ? 'HOLD' : difficulty === 'easy' ? 'REJECT-EASY' : 'KEEP'
  out[it.id] = { status, difficulty, difficulties: diffs, extreme, key_votes: R.filter(r => same(r.my_answer, it.correct_answer)).length, n_struck_median: ns[1],
    struck: R.map(r => r.struck || []), plugback: R.map(r => r.plugback_tries ?? null), off_blueprint_votes: offBp, why, confirm }
  console.log(`${it.id.padEnd(10)} ${status.padEnd(11)} ${difficulty.padEnd(6)} [${diffs.join(',')}] key ${out[it.id].key_votes}/3 struck~${ns[1]}${why.length ? '  ' + why.join('; ') : ''}${confirm.length ? '  CONFIRM: ' + confirm.join('; ') : ''}`)
}
const V = Object.values(out)
console.log(`\nKEEP ${V.filter(v => v.status === 'KEEP').length} of ${items.length} (hard ${V.filter(v => v.status === 'KEEP' && v.difficulty === 'hard').length}, medium ${V.filter(v => v.status === 'KEEP' && v.difficulty === 'medium').length}) before confirms; DROP ${V.filter(v => v.status === 'DROP').length}; HOLD ${V.filter(v => v.status === 'HOLD').length}; REJECT-EASY ${V.filter(v => v.status === 'REJECT-EASY').length}`)
writeFileSync(`${D}alg31.verdict.json`, JSON.stringify(out, null, 1) + '\n')
if (!write) process.exit(0)

const CF = `${D}alg31.confirm.json`
const conf = existsSync(CF) ? JSON.parse(readFileSync(CF, 'utf8')) : {}
const pending = items.filter(it => out[it.id].status === 'KEEP' && out[it.id].confirm.length && !(conf[it.id] && typeof conf[it.id].drop === 'boolean' && String(conf[it.id].why ?? '').trim()))
if (pending.length) { console.error(`REFUSING --write: CONFIRM undecided on ${pending.map(x => x.id).join(', ')} (alg31.confirm.json: {"<id>": {"drop": true|false, "why": "..."}})`); process.exit(2) }
for (const it of items) if (out[it.id].status === 'KEEP' && conf[it.id]?.drop === true) { out[it.id].status = 'DROP'; out[it.id].why.push(`confirmed by hand: ${conf[it.id].why}`) }
const KEEPF = ['domain', 'difficulty', 'id', 'subskill', 'prompt', 'choices', 'correct_answer', 'explanation', 'mechanism', 'solve', 'distractor_solve']
const strip = x => Object.fromEntries(KEEPF.filter(k => k in x).map(k => [k, k === 'difficulty' ? out[x.id].difficulty : x[k]]))
const kept = items.filter(x => out[x.id].status === 'KEEP').map(strip)
const held = items.filter(x => ['HOLD', 'REJECT-EASY'].includes(out[x.id].status)).map(x => ({ ...strip(x), held_reason: out[x.id].status }))
const dropped = items.filter(x => out[x.id].status === 'DROP').map(x => ({ id: x.id, why: out[x.id].why }))
const g = keyExtremityVerdict(kept)
const band = g.n >= 10 && g.rate >= 0.40 - 1e-9 && g.rate <= 0.60 + 1e-9
console.log(`kept ${kept.length} (hard ${kept.filter(x => x.difficulty === 'hard').length}); key at an extreme ${g.ext}/${g.n}${g.n ? ` = ${(100 * g.rate).toFixed(1)}%` : ''}; key-extremity-gate ${g.status}`)
writeFileSync(`${D}${COHORT}.dropped.json`, JSON.stringify(dropped, null, 1) + '\n')
if (g.n < 10 || !band) {
  writeFileSync(`${D}${COHORT}.held.batch.json`, JSON.stringify([...held, ...kept.map(x => ({ ...x, held_reason: g.n < 10 ? 'kept set under 10: no measurement' : 'kept-set band failed' }))], null, 1) + '\n')
  console.log(`KEPT-SET BAND ${g.n < 10 ? 'NOT MEASURED (n < 10)' : 'FAIL (outside 40.0-60.0%)'}: nothing is inserted; the whole kept set is HELD in ${COHORT}.held.batch.json`)
  process.exit(1)
}
writeFileSync(`${D}${COHORT}.kept.batch.json`, JSON.stringify(kept, null, 1) + '\n')
if (held.length) writeFileSync(`${D}${COHORT}.held.batch.json`, JSON.stringify(held, null, 1) + '\n')
console.log(`KEPT-SET BAND PASS: wrote ${COHORT}.kept.batch.json (${kept.length})${held.length ? `, .held.batch.json (${held.length})` : ''}, .dropped.json (${dropped.length})`)
