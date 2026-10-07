#!/usr/bin/env node
/**
 * map-adapt-render.mjs fidelity   map-adapt/fidelity.input.json (source + adapted pairs, keys marked)
 * map-adapt-render.mjs oo         TWO options-only files: oo-adapted.blind.json and oo-source.blind.json
 * map-adapt-render.mjs ws         with-source render (key unmarked), adapted items only
 * map-adapt-render.mjs nat        naturalness: the 3 adapted passages + batch 2's 6 control passages
 *
 * Bars: MAP-ADAPT-PILOT-2026-10-07.prereg.md. Batch 2-3's deal: keys dealt flat
 * PER ARM (and per choice width) in a seeded order; the whole sequence must pass
 * E8; next seed on failure. Only option strings cross into a blind file. The
 * two options-only files carry the SAME controls (batch 2's 8 ISEE main-idea
 * items as R, batches 1-2's 12 ISEE easy verbal items as V) under different
 * seeds, so the two solver populations can be compared on identical items.
 * Refuses (exit 2) on a missing file or a population the prereg does not fix.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
import { periodicity } from './map-pilot-2-checks.mjs'
import { stratumOf } from './map-adapt-checks.mjs'

const D = 'scripts/study-bank/', O = D + 'map-adapt/'
const L5 = ['A', 'B', 'C', 'D', 'E']
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const rd = p => { if (!existsSync(D + p)) die(`missing ${p}`); return JSON.parse(readFileSync(D + p, 'utf8')) }
const WANT = { comprehension: 13, vocab: 7, writing: 4 }

function load() {
  const sources = rd('map-adapt/sources.json'), batch = rd('map-adapt/batch.json')
  if (sources.length !== 24) die(`sources.json ${sources.length} != 24`)
  for (const it of batch) {
    const s = sources.find(x => x.adapt_id === it.id); if (!s || s.source_id !== it.source_id) die(`${it.id} has no matching source`)
    if (it.choices?.length !== 4 || !it.choices.map(String).includes(String(it.correct_answer))) die(`${it.id} malformed`)
  }
  return { sources, batch }
}
function place(choices, key, letter, r) {
  const ch = choices.map(String), k = ch.indexOf(String(key)), L = L5.slice(0, ch.length)
  const rest = shuffleWith(ch.filter((_, j) => j !== k), r)
  let q = 0
  return Object.fromEntries(L.map(s => [s, s === letter ? ch[k] : rest[q++]]))
}
const flat = (n, w, r) => shuffleWith(Array.from({ length: n }, (_, i) => L5[i % w]), r)

function ooFile(items, seed0, name) {
  // items: {uid, arm, pair, choices, key}
  let seed = seed0, tries = 0, order, letters, r
  for (;;) {
    tries++; r = rng(seed++)
    order = shuffleWith(items.slice(), r)
    const q = {}
    for (const x of items) { const g = `${x.arm}|${x.choices.length}`; q[g] ??= null }
    for (const g of Object.keys(q)) { const [a, w] = g.split('|'); q[g] = flat(items.filter(x => x.arm === a && x.choices.length === +w).length, +w, r) }
    letters = order.map(x => q[`${x.arm}|${x.choices.length}`].pop())
    if (!periodicity(letters.join('')).fail) break
    if (tries > 500) die('no E8-clean deal in 500 seeds')
  }
  const blind = {}, key = {}
  order.forEach((x, i) => {
    const bid = `L${String(i + 1).padStart(2, '0')}`
    blind[bid] = { options: place(x.choices, x.key, letters[i], r) }
    key[bid] = { letter: letters[i], width: x.choices.length, localId: x.uid, arm: x.arm, ...(x.pair ? { pair: x.pair } : {}) }
  })
  writeFileSync(O + `${name}.blind.json`, JSON.stringify(blind, null, 1) + '\n')
  writeFileSync(O + `${name}.key.json`, JSON.stringify(key, null, 1) + '\n')
  const deal = {}; Object.values(key).forEach(k => { const a = (deal[k.arm] ??= {}); a[k.letter] = (a[k.letter] ?? 0) + 1 })
  console.log(`${name}: ${order.length} items, seeds tried ${tries}; key sequence ${letters.join('')}`)
  for (const [a, d] of Object.entries(deal)) console.log(`   ${a.padEnd(13)} deal ${JSON.stringify(d)}`)
}

const mode = process.argv[2]
if (mode === 'fidelity') {
  const { sources, batch } = load()
  const pairs = batch.map(it => { const s = sources.find(x => x.adapt_id === it.id); return {
    id: it.id,
    source: { passage: s.item.passage, prompt: s.item.prompt, choices: s.item.choices, key: s.item.correct_answer },
    adapted: { target: `${it.target_band} (grade ${it.grade_target})`, passage: it.passage, prompt: it.prompt, choices: it.choices, key: it.correct_answer, dropped_source_option: it.dropped_distractor ?? null },
  } })
  writeFileSync(O + 'fidelity.input.json', JSON.stringify(pairs, null, 1) + '\n')
  console.log(`fidelity input: ${pairs.length} pairs`)
} else if (mode === 'oo') {
  const { sources, batch } = load()
  if (batch.length < 22) die(`batch has ${batch.length} items; stage 0 requires >= 22 survivors`)
  for (const [s, n] of Object.entries(WANT)) { const g = batch.filter(i => i.stratum === s).length; if (g > n || g < n - 2) die(`stratum ${s} has ${g}, prereg fixes ${n}`) }
  const srcKept = sources.filter(s => batch.some(b => b.id === s.adapt_id))   // a dropped item's source is not rendered either: P is paired
  const ctlR = rd('map-pilot-2-control-r.batch.json'), ctlV = rd('map-pilot-control.batch.json')
  if (ctlR.length !== 8 || ctlV.length !== 12) die('controls must be batch 2\'s 8 R and 12 V')
  const ctl = [...ctlR.map(x => ({ uid: x.id, arm: 'controlR', choices: x.choices, key: x.correct_answer })), ...ctlV.map(x => ({ uid: x.id, arm: 'controlV', choices: x.choices, key: x.correct_answer }))]
  ooFile([...batch.map(it => ({ uid: it.id, arm: it.stratum, pair: it.id, choices: it.choices, key: it.correct_answer })), ...ctl], 20261007, 'oo-adapted')
  ooFile([...srcKept.map(s => ({ uid: `src:${s.source_id}`, arm: stratumOf(s), pair: s.adapt_id, choices: s.item.choices, key: s.item.correct_answer })), ...ctl], 20261107, 'oo-source')
} else if (mode === 'ws') {
  const { batch } = load()
  const sets = [...new Set(batch.filter(x => x.set_id).map(x => x.set_id))]
  const units = [...batch.filter(x => !x.set_id).map(x => [x]), ...sets.map(g => batch.filter(x => x.set_id === g))]
  let seed = 20261008, tries = 0, order, letters, r
  for (;;) {
    tries++; r = rng(seed++)
    order = shuffleWith(units.slice(), r).flat()
    letters = flat(order.length, 4, r)
    if (!periodicity(letters.join('')).fail) break
    if (tries > 500) die('no E8-clean deal')
  }
  const key = {}, md = [`# Items for review (${order.length})\n\nEach item: strand, stated grade target and target band, passage (if any), question, four options. Items that share a passage are listed together after it. The correct answer is NOT marked.\n`]
  let last = null
  order.forEach((it, i) => {
    const n = i + 1, opts = place(it.choices, it.correct_answer, letters[i], r)
    key[n] = { letter: letters[i], localId: it.id, stratum: it.stratum, target_band: it.target_band, ...(it.set_id ? { group: it.set_id } : {}) }
    if (it.set_id && it.set_id !== last) md.push(`---\n\n## Passage for items ${n}-${n + batch.filter(x => x.set_id === it.set_id).length - 1}\n\nStrand: ${it.map_area} | Grade target: ${it.grade_target} | Target band: ${it.target_band}\n\n${it.passage}\n`)
    md.push(`---\n\n## Item ${n}\n\nStrand: ${it.map_area} - ${it.map_strand} | Grade target: ${it.grade_target} | Target band: ${it.target_band}\n`)
    if (!it.set_id) md.push(`Passage:\n\n${it.passage}\n`)
    md.push(`Question: ${it.prompt}\n`)
    md.push(['A', 'B', 'C', 'D'].map(s => `${s}. ${opts[s]}`).join('\n') + '\n')
    last = it.set_id ?? null
  })
  writeFileSync(O + 'ws.md', md.join('\n'))
  writeFileSync(O + 'ws.key.json', JSON.stringify(key, null, 1) + '\n')
  console.log(`ws render: ${order.length} items, seeds tried ${tries}; key sequence ${letters.join('')}`)
} else if (mode === 'nat') {
  const { batch } = load()
  const sets = ['P1', 'P2', 'P3'].map(g => batch.find(x => x.set_id === g)).filter(Boolean)
  if (sets.length !== 3) die(`need the 3 adapted passages, found ${sets.length}`)
  const ctl = rd('map-pilot-2-rlu.batch.json').filter(x => x.stratum === 'comprehension' && x.passage)
  if (ctl.length !== 6) die(`naturalness control: expected batch 2's 6 comprehension passages, got ${ctl.length}`)
  const all = shuffleWith([...sets.map(x => ({ src: x.set_id, passage: x.passage })), ...ctl.map(x => ({ src: `ctl:${x.id}`, passage: x.passage }))], rng(20261009))
  const nkey = {}
  writeFileSync(O + 'naturalness.json', JSON.stringify(all.map((x, i) => { nkey[`N${i + 1}`] = x.src; return { id: `N${i + 1}`, passage: x.passage } }), null, 1) + '\n')
  writeFileSync(O + 'naturalness.key.json', JSON.stringify(nkey, null, 1) + '\n')
  console.log(`naturalness: ${all.length} passages (3 candidate, 6 control)`)
} else die('usage: map-adapt-render.mjs fidelity|oo|ws|nat')
