#!/usr/bin/env node
/**
 * alg31-plugprobe.mjs render <round> <all|ID,ID,...> | score <round>
 *
 * The cold PLUG-BACK PROBE for sat-math-v31-alg (PREREG-MATH-ALG31-2026-10-23.md, rule 6). It is
 * mf30-plugprobe.mjs (A92 lesson 1: Algebra r6 drops 6 in mf29 -> 0 in mf30) with three changes:
 *   1. the plants come from THIS method's own history, sat-math-v26-alg: alg26 lost 5 of its 7 gate
 *      drops to plug-back (B5 B6 C6 C8 D6, each confirmed by a grader majority at natural try 1-2);
 *      those are the POSITIVES. The NEGATIVES are eight kept v26 items in mechanisms B-D whose key sits
 *      at natural try 1-2 and that NO grader flagged (B1 B7 C1 C4 D2 D3 D4 D7);
 *   2. the natural order comes from the item's `ask` (descending only on `greatest`), not from the
 *      mf28 DESC regex, which also fires on "at most" (it put v26 D6, a `least` item every grader
 *      confirmed at try 1, at try 4);
 *   3. paths: batch items from sat-math-v31-alg-{b,c,d}.batch.json; folders under PRIV (outside the repo).
 *
 *   render   writes PRIV/probe/r<round>/probe.json: every named batch item (all = every item in the
 *            three author files, so the selection is not a signal) PLUS the 13 plants, relabelled X01..
 *            in a seeded order (SEED_PROBE + round), options sorted ascending, only the prompt and
 *            options shown. The label -> id map goes to PRIV/probe/r<round>.map.json, OUTSIDE the
 *            probe's folder.
 *   score    reads PRIV/probe/r<round>/out.json. FLAGGED = the probe confirms the KEY by a routine
 *            check at try 1 or 2 of the natural order; DISAGREE = it confirms a non-key option.
 *            VALID only if all 5 positives are flagged AND at most 4 of the 8 negatives are. An
 *            invalid probe decides nothing (prereg: one fresh re-run; if still invalid, the strict
 *            fallback). Appends the round to scripts/study-bank/alg31.plugprobe.json.
 *            Exit 1 if invalid, 2 on bad input.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { PRIV, COHORT, PREFIX, SEED_PROBE, naturalTry, rank, val } from './alg31-slots.mjs'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
const D = new URL('.', import.meta.url).pathname
export const POS = ['SM26L-B5', 'SM26L-B6', 'SM26L-C6', 'SM26L-C8', 'SM26L-D6']
export const NEG = ['SM26L-B1', 'SM26L-B7', 'SM26L-C1', 'SM26L-C4', 'SM26L-D2', 'SM26L-D3', 'SM26L-D4', 'SM26L-D7']
const eq = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
const keyTry = (it, ask) => { const r = rank(it.choices.map(String), String(it.correct_answer)); return r == null ? null : naturalTry(ask, r) }

const [cmd, round, which] = process.argv.slice(2)
if (!['render', 'score'].includes(cmd) || !/^\d+$/.test(round ?? '') || (cmd === 'render' && !which)) { console.error('usage: alg31-plugprobe.mjs render <round> <all|ID,ID> | score <round>'); process.exit(2) }
const F = `${PRIV}/probe/r${round}`, MAP = `${PRIV}/probe/r${round}.map.json`
if (cmd === 'render') {
  const v26 = JSON.parse(readFileSync(`${D}sat-math-v26-alg.batch.json`, 'utf8')), meta26 = JSON.parse(readFileSync(`${D}sat-math-v26-alg.meta.json`, 'utf8'))
  const batch = []
  for (const a of 'bcd') { const p = `${D}${COHORT}-${a}.batch.json`; if (existsSync(p)) { const j = JSON.parse(readFileSync(p, 'utf8')); if (Array.isArray(j)) batch.push(...j) } }
  if (!batch.length) { console.error(`REFUSING: no items in ${COHORT}-{b,c,d}.batch.json`); process.exit(2) }
  const ids = which === 'all' ? batch.map(x => x.id) : which.split(',').map(s => s.startsWith(PREFIX) ? s : PREFIX + s)
  const items = ids.map(id => { const it = batch.find(x => x.id === id); if (!it) { console.error(`REFUSING: ${id} not in the author files`); process.exit(2) } if (!it.ask) { console.error(`REFUSING: ${id} has no ask`); process.exit(2) } return { it, ask: it.ask, kind: 'batch' } })
  for (const [list, kind] of [[POS, 'plant-pos'], [NEG, 'plant-neg']]) for (const id of list) { const it = v26.find(x => x.id === id); if (!it || !meta26[id]?.ask) { console.error(`REFUSING: plant ${id} missing`); process.exit(2) } items.push({ it, ask: meta26[id].ask, kind }) }
  for (const { it, ask, kind } of items) if (kind !== 'batch' && !(keyTry(it, ask) <= 2)) { console.error(`REFUSING: plant ${it.id} has its key at natural try ${keyTry(it, ask)}, not 1-2`); process.exit(2) }
  if (existsSync(F) && readdirSync(F).length) { console.error(`REFUSING: ${F} exists and is not empty`); process.exit(2) }
  mkdirSync(F, { recursive: true })
  const order = shuffleWith(items, rng(SEED_PROBE + Number(round)))
  const probe = [], map = {}
  order.forEach(({ it, ask, kind }, i) => {
    const label = `X${String(i + 1).padStart(2, '0')}`
    probe.push({ label, prompt: it.prompt, options_ascending: it.choices.map(String).sort((x, y) => val(x) - val(y)) })
    map[label] = { id: it.id, kind, ask, key: String(it.correct_answer), key_try: keyTry(it, ask), order: ask === 'greatest' ? 'descending' : 'ascending' }
  })
  writeFileSync(`${F}/probe.json`, JSON.stringify(probe, null, 1) + '\n'); writeFileSync(MAP, JSON.stringify(map, null, 1) + '\n')
  console.log(`round ${round}: ${items.filter(x => x.kind === 'batch').length} batch items + ${POS.length + NEG.length} plants -> ${F}/probe.json (map outside the folder)`)
} else {
  let map, out
  try { map = JSON.parse(readFileSync(MAP, 'utf8')); out = JSON.parse(readFileSync(`${F}/out.json`, 'utf8')) } catch (e) { console.error(`REFUSING: ${e.message}`); process.exit(2) }
  if (!Object.keys(map).length) { console.error('REFUSING: empty map'); process.exit(2) }
  const miss = Object.keys(map).filter(l => !out[l]); if (miss.length) { console.error(`REFUSING: out.json lacks ${miss.join(' ')}`); process.exit(2) }
  const res = {}
  for (const [l, m] of Object.entries(map)) {
    const o = out[l]; const conf = o.confirmed == null ? null : String(o.confirmed)
    const at = Number(o.confirmed_at); const routine = o.routine_confirm === true
    const isKey = conf != null && eq(val(conf), val(m.key))
    res[l] = { ...m, confirmed: conf, confirmed_at: Number.isFinite(at) ? at : null, routine, flagged: isKey && routine && at <= 2, disagree: conf != null && !isKey, note: String(o.note ?? '').slice(0, 300) }
  }
  const R = Object.values(res), by = k => R.filter(r => r.kind === k)
  const pos = by('plant-pos'), neg = by('plant-neg'), bat = by('batch')
  if (pos.length !== POS.length || neg.length !== NEG.length) { console.error('REFUSING: the map does not hold every plant'); process.exit(2) }
  const valid = pos.every(r => r.flagged) && neg.filter(r => r.flagged).length <= 4
  console.log(`plants: positives flagged ${pos.filter(r => r.flagged).length}/${POS.length} (${pos.map(r => `${r.id.slice(6)}${r.flagged ? '+' : '-'}`).join(' ')}); negatives flagged ${neg.filter(r => r.flagged).length}/${NEG.length} (bar <= 4)`)
  console.log(`probe ${valid ? 'VALID' : 'INVALID - decides nothing'}`)
  for (const r of bat.sort((a, b) => a.id.localeCompare(b.id))) console.log(`  ${r.id}  key try ${r.key_try} ${r.order}  ${r.flagged ? 'FLAGGED (key confirmed by a routine check at try ' + r.confirmed_at + ')' : r.disagree ? `DISAGREE (probe confirmed ${r.confirmed})` : 'clear'}${r.note ? '  | ' + r.note.slice(0, 140) : ''}`)
  const LOG = `${D}alg31.plugprobe.json`; const log = existsSync(LOG) ? JSON.parse(readFileSync(LOG, 'utf8')) : {}
  log[`r${round}`] = { valid, positives: pos.filter(r => r.flagged).length, negatives: neg.filter(r => r.flagged).length, items: Object.fromEntries(bat.map(r => [r.id, { key_try: r.key_try, order: r.order, flagged: r.flagged, disagree: r.disagree, confirmed: r.confirmed, confirmed_at: r.confirmed_at, routine: r.routine, note: r.note }])) }
  writeFileSync(LOG, JSON.stringify(log, null, 1) + '\n')
  console.log(`batch: ${bat.filter(r => r.flagged).length} flagged, ${bat.filter(r => r.disagree).length} disagree, of ${bat.length}; logged to alg31.plugprobe.json`)
  process.exit(valid ? 0 : 1)
}
