#!/usr/bin/env node
/**
 * mf30-plugprobe.mjs render <round> <all|ID,ID,...> | score <round>
 *
 * The cold PLUG-BACK PROBE for sat-math-v30-full (PREREG-MF30-2026-10-10.md, A92 lesson 1). A92: six
 * Algebra plug-back drops, four of them smallest keys confirmed on the FIRST ascending try; the authors
 * declared five "not substitutable", printed a "(read) PLUG" line, and the coordinator's hand read passed
 * all four on the authors' argument. So the decision is taken away from the author AND the coordinator:
 * a fresh Claude agent that sees only stems and options (no key, no author fields) tries the options in
 * the natural order and says where a routine check confirms one.
 *
 *   render   writes <WORK>/probe/r<round>/probe.json: every Algebra item named (all = every item in the
 *            four Algebra author files sat-math-v30-full-{a,b,c,d}.batch.json) PLUS twelve PLANTS from
 *            sat-math-v29-full, relabelled X01.. in a seeded order (seed 20261066 + round), options sorted
 *            ascending, only prompt / graphic / options shown. Plants: the four A92 plug-back drops at
 *            ascending try 1 (B09 D04 A07 A04: POSITIVES), the two at try 4 (B08 A09: reported only), and
 *            six mf29 Algebra items with the key at try 1-2 that no grader flagged (B02 C03 B11 C10 C01 B06:
 *            NEGATIVES). The label -> id map goes to <WORK>/probe/r<round>.map.json, OUTSIDE the probe's folder.
 *   score    reads <WORK>/probe/r<round>/out.json. An item is FLAGGED when the probe confirms the KEY by a
 *            routine check at try 1 or 2 of its natural order; DISAGREE when it confirms a non-key option.
 *            VALID only if all 4 positives are flagged AND at most 3 of the 6 negatives are; an invalid
 *            probe decides nothing (prereg: one fresh re-run; if still invalid, the strict fallback).
 *            Appends the round to scripts/study-bank/mf30.plugprobe.json. Exit 1 if invalid, 2 on bad input.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { WORK } from './mf30-slots.mjs'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
import { val } from './key-extremity-breakdown.mjs'
const D = new URL('.', import.meta.url).pathname
const [cmd, round, which] = process.argv.slice(2)
if (!['render', 'score'].includes(cmd) || !/^\d+$/.test(round ?? '') || (cmd === 'render' && !which)) { console.error('usage: mf30-plugprobe.mjs render <round> <all|ID,ID> | score <round>'); process.exit(2) }
const F = `${WORK}/probe/r${round}`, MAP = `${WORK}/probe/r${round}.map.json`
const POS = ['SM29F-B09', 'SM29F-D04', 'SM29F-A07', 'SM29F-A04'], POS4 = ['SM29F-B08', 'SM29F-A09'], NEG = ['SM29F-B02', 'SM29F-C03', 'SM29F-B11', 'SM29F-C10', 'SM29F-C01', 'SM29F-B06']
const DESC = /\b(greatest|maximum|largest|most|highest)\b/i
const eq = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
if (cmd === 'render') {
  const b29 = JSON.parse(readFileSync(`${D}sat-math-v29-full.batch.json`, 'utf8'))
  const alg = []
  for (const a of 'abcd') { const p = `${D}sat-math-v30-full-${a}.batch.json`; if (existsSync(p)) alg.push(...JSON.parse(readFileSync(p, 'utf8'))) }
  const ids = which === 'all' ? alg.map(x => x.id) : which.split(',').map(s => s.startsWith('SM30F-') ? s : `SM30F-${s}`)
  const items = ids.map(id => { const it = alg.find(x => x.id === id); if (!it) { console.error(`REFUSING: ${id} not in the Algebra author files`); process.exit(2) } if (it.domain !== 'Algebra') { console.error(`REFUSING: ${id} is ${it.domain}`); process.exit(2) } return { it, kind: 'batch' } })
  if (!items.length) { console.error('REFUSING: no items'); process.exit(2) }
  for (const [list, kind] of [[POS, 'plant-pos'], [POS4, 'plant-pos-try4'], [NEG, 'plant-neg']]) for (const id of list) { const it = b29.find(x => x.id === id); if (!it) { console.error(`REFUSING: plant ${id} missing`); process.exit(2) } items.push({ it, kind }) }
  if (existsSync(F) && readdirSync(F).length) { console.error(`REFUSING: ${F} exists and is not empty`); process.exit(2) }
  mkdirSync(F, { recursive: true })
  const order = shuffleWith(items, rng(20261066 + Number(round)))
  const probe = [], map = {}
  order.forEach(({ it, kind }, i) => {
    const label = `X${String(i + 1).padStart(2, '0')}`
    const opts = it.choices.map(String).sort((x, y) => val(x) - val(y))
    probe.push({ label, prompt: it.prompt, ...(it.graphic ? { graphic: it.graphic } : {}), options_ascending: opts })
    const desc = DESC.test(String(it.prompt)); const nat = desc ? [...opts].reverse() : opts
    map[label] = { id: it.id, kind, key: String(it.correct_answer), key_try: nat.findIndex(o => eq(val(o), val(String(it.correct_answer)))) + 1, order: desc ? 'descending' : 'ascending' }
  })
  writeFileSync(`${F}/probe.json`, JSON.stringify(probe, null, 1) + '\n'); writeFileSync(MAP, JSON.stringify(map, null, 1) + '\n')
  console.log(`round ${round}: ${items.filter(x => x.kind === 'batch').length} batch items + 12 plants -> ${F}/probe.json (map outside the folder)`)
} else {
  let map, out
  try { map = JSON.parse(readFileSync(MAP, 'utf8')); out = JSON.parse(readFileSync(`${F}/out.json`, 'utf8')) } catch (e) { console.error(`REFUSING: ${e.message}`); process.exit(2) }
  const miss = Object.keys(map).filter(l => !out[l]); if (miss.length) { console.error(`REFUSING: out.json lacks ${miss.join(' ')}`); process.exit(2) }
  const res = {}
  for (const [l, m] of Object.entries(map)) {
    const o = out[l]; const conf = o.confirmed == null ? null : String(o.confirmed)
    const at = Number(o.confirmed_at); const routine = o.routine_confirm === true
    const isKey = conf != null && eq(val(conf), val(m.key))
    res[l] = { ...m, confirmed: conf, confirmed_at: Number.isFinite(at) ? at : null, routine, flagged: isKey && routine && at <= 2, disagree: conf != null && !isKey, note: String(o.note ?? '').slice(0, 300) }
  }
  const R = Object.values(res), by = k => R.filter(r => r.kind === k)
  const pos = by('plant-pos'), neg = by('plant-neg'), p4 = by('plant-pos-try4'), bat = by('batch')
  const valid = pos.every(r => r.flagged) && neg.filter(r => r.flagged).length <= 3
  console.log(`plants: positives flagged ${pos.filter(r => r.flagged).length}/4 (${pos.map(r => `${r.id.slice(6)}${r.flagged ? '+' : '-'}`).join(' ')}); try-4 drops flagged ${p4.filter(r => r.flagged).length}/2 (reported); negatives flagged ${neg.filter(r => r.flagged).length}/6 (bar <= 3)`)
  console.log(`probe ${valid ? 'VALID' : 'INVALID - decides nothing'}`)
  for (const r of bat.sort((a, b) => a.id.localeCompare(b.id))) console.log(`  ${r.id}  key try ${r.key_try} ${r.order}  ${r.flagged ? 'FLAGGED (key confirmed by a routine check at try ' + r.confirmed_at + ')' : r.disagree ? `DISAGREE (probe confirmed ${r.confirmed})` : 'clear'}${r.note ? '  | ' + r.note.slice(0, 140) : ''}`)
  const LOG = `${D}mf30.plugprobe.json`; const log = existsSync(LOG) ? JSON.parse(readFileSync(LOG, 'utf8')) : {}
  log[`r${round}`] = { valid, positives: pos.filter(r => r.flagged).length, try4: p4.filter(r => r.flagged).length, negatives: neg.filter(r => r.flagged).length, items: Object.fromEntries(bat.map(r => [r.id, { key_try: r.key_try, order: r.order, flagged: r.flagged, disagree: r.disagree, confirmed: r.confirmed, confirmed_at: r.confirmed_at, routine: r.routine, note: r.note }])) }
  writeFileSync(LOG, JSON.stringify(log, null, 1) + '\n')
  console.log(`batch: ${bat.filter(r => r.flagged).length} flagged, ${bat.filter(r => r.disagree).length} disagree, of ${bat.length}; logged to mf30.plugprobe.json`)
  process.exit(valid ? 0 : 1)
}
