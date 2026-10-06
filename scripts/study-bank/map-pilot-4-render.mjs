#!/usr/bin/env node
/**
 * map-pilot-4-render.mjs oo   options-only render, MAP pilot batch 4 (Language Usage only)
 * map-pilot-4-render.mjs ws   with-source render (key unmarked)
 *
 * Bars: MAP-PILOT-4-2026-10-06.prereg.md. A copy of map-pilot-3-render.mjs with
 * the comprehension strand removed (batch 4 has none) and new seeds. Batch 2's deal construction
 * (map-pilot-2-render.mjs): keys dealt flat PER ARM in a seeded order, the whole
 * sequence must pass E8, next seed on failure, seeds tried printed. Only option
 * strings cross into the blind file.
 *
 * Inputs: map-pilot-4-lu.batch.json (24), control R = batch 2's 8 live ISEE
 * main-idea items (the same file), control V = batches 1-3's 12 ISEE easy verbal items.
 * Outputs in map-pilot-4/: oo.blind.json + oo.key.json, ws.md + ws.key.json.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
import { periodicity } from './map-pilot-2-checks.mjs'

const D = 'scripts/study-bank/', O = D + 'map-pilot-4/'
const SL = ['A', 'B', 'C', 'D']
const rd = p => { if (!existsSync(D + p)) { console.error(`REFUSING: missing ${p}`); process.exit(2) } return JSON.parse(readFileSync(D + p, 'utf8')) }
const lu = rd('map-pilot-4-lu.batch.json')
const want = { mechanics: 10, vocab: 6, usage: 8 }
if (lu.length !== 24) { console.error(`REFUSING: strand 1 has ${lu.length} items, prereg fixes 24`); process.exit(2) }
for (const [s, n] of Object.entries(want)) { const got = lu.filter(i => i.stratum === s).length; if (got !== n) { console.error(`REFUSING: stratum ${s} has ${got}, prereg fixes ${n}`); process.exit(2) } }
const cand = [...lu]
for (const it of cand) if (it.choices?.length !== 4 || !it.choices.map(String).includes(String(it.correct_answer))) { console.error(`REFUSING: ${it.id} malformed`); process.exit(2) }

function place(it, letter, r) {
  const ch = it.choices.map(String), k = ch.indexOf(String(it.correct_answer))
  const rest = shuffleWith(ch.filter((_, j) => j !== k), r)
  let q = 0
  return Object.fromEntries(SL.map(s => [s, s === letter ? ch[k] : rest[q++]]))
}
const flatLetters = (n, r) => shuffleWith(Array.from({ length: n }, (_, i) => SL[i % 4]), r)
const choiceIdx = (it, opts) => Object.fromEntries(SL.map(s => [s, it.choices.map(String).indexOf(opts[s])]))

const mode = process.argv[2]
if (mode === 'oo') {
  const ctlR = rd('map-pilot-2-control-r.batch.json').map(x => ({ ...x, arm: 'controlR' }))
  const ctlV = rd('map-pilot-control.batch.json').map(x => ({ ...x, arm: 'controlV' }))
  if (ctlR.length !== 8 || ctlV.length !== 12) { console.error('REFUSING: controls must be batch 2\'s 8 R and 12 V'); process.exit(2) }
  const all = [...cand.map(x => ({ ...x, arm: x.stratum })), ...ctlV, ...ctlR]
  let seed = 20261406, tries = 0, order, letters, r
  for (;;) {
    tries++; r = rng(seed++)
    order = shuffleWith(all.slice(), r)
    const q = {}; for (const a of new Set(all.map(x => x.arm))) q[a] = flatLetters(all.filter(x => x.arm === a).length, r)
    letters = order.map(x => q[x.arm].pop())
    if (!periodicity(letters.join('')).fail) break
    if (tries > 500) { console.error('REFUSING: no E8-clean deal in 500 seeds'); process.exit(2) }
  }
  const blind = {}, key = {}
  order.forEach((it, i) => {
    const bid = `L${String(i + 1).padStart(2, '0')}`, opts = place(it, letters[i], r)
    blind[bid] = { options: opts }
    key[bid] = { letter: letters[i], localId: it.id, arm: it.arm, ...(it.set_id ? { group: it.set_id, choiceIdx: choiceIdx(it, opts) } : {}) }
  })
  writeFileSync(O + 'oo.blind.json', JSON.stringify(blind, null, 1) + '\n')
  writeFileSync(O + 'oo.key.json', JSON.stringify(key, null, 1) + '\n')
  console.log(`oo render: ${order.length} items, seeds tried ${tries}; E8 on the blind sequence ${letters.join('')}`)
  const deal = {}; Object.values(key).forEach(k => { (deal[k.arm] ??= {})[k.letter] = (deal[k.arm][k.letter] ?? 0) + 1 })
  for (const [a, d] of Object.entries(deal)) { const n = Object.values(d).reduce((x, y) => x + y, 0); console.log(`  arm ${a.padEnd(13)} n=${String(n).padStart(2)} deal ${JSON.stringify(d)} best-fixed-letter ${(100 * Math.max(...Object.values(d)) / n).toFixed(1)}%`) }
} else if (mode === 'ws') {
  const units = lu.map(x => [x])
  let seed = 20261407, tries = 0, order, letters, r
  for (;;) {
    tries++; r = rng(seed++)
    order = shuffleWith(units.slice(), r).flat()
    letters = flatLetters(order.length, r)
    if (!periodicity(letters.join('')).fail) break
    if (tries > 500) { console.error('REFUSING: no E8-clean deal'); process.exit(2) }
  }
  const key = {}, md = [`# Items for review (${order.length})\n\nEach item: strand, stated grade target and target band, passage (if any), question, four options. The correct answer is NOT marked.\n`]
  let lastSet = null
  order.forEach((it, i) => {
    const n = i + 1, opts = place(it, letters[i], r)
    key[n] = { letter: letters[i], localId: it.id, stratum: it.stratum, target_band: it.target_band, ...(it.set_id ? { group: it.set_id } : {}) }
    md.push(`---\n\n## Item ${n}\n\nStrand: ${it.set_id ? `${it.map_area} (${it.kind})` : it.map_strand} | Grade target: ${it.grade_target} | Target band: ${it.target_band}${it.stratum === 'usage' && /Parts of Speech|Phrases/.test(it.map_strand) ? ' | GRAMMAR ITEM: report dimensions_varied' : ''}\n`)
    if (it.passage && !it.set_id) md.push(`Passage:\n\n${it.passage}\n`)
    md.push(`Question: ${it.prompt}\n`)
    md.push(SL.map(s => `${s}. ${opts[s]}`).join('\n') + '\n')
    lastSet = it.set_id ?? null
  })
  writeFileSync(O + 'ws.md', md.join('\n'))
  writeFileSync(O + 'ws.key.json', JSON.stringify(key, null, 1) + '\n')
  console.log(`ws render: ${order.length} items, seeds tried ${tries}; key sequence ${letters.join('')}`)
} else { console.error('usage: map-pilot-4-render.mjs oo|ws'); process.exit(2) }
