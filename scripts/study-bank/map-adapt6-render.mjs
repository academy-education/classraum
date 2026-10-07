#!/usr/bin/env node
/**
 * map-adapt6-render.mjs screen     source options-only screen: the 18 candidates + control R (8), one file
 * map-adapt6-render.mjs fidelity   map-adapt6/fidelity.input.json (source + adapted, keys marked)
 * map-adapt6-render.mjs oo         3 split files a side (adapted / source), 4 candidates each + controls R and V
 * map-adapt6-render.mjs ws         with-source render, adapted items, key unmarked
 * map-adapt6-render.mjs nat        naturalness: the adapted passages + batch 2's 6 control passages
 *
 * MAP-ADAPT6-PILOT-2026-10-07.prereg.md. Deal: per file, flat across all
 * candidates (and per control arm) from a random offset, whole sequence E8-clean.
 * Every file in a stage gets its own three fresh samples. Refuses (exit 2) on a
 * missing file or a population the prereg does not fix.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
import { periodicity } from './map-pilot-2-checks.mjs'

const D = 'scripts/study-bank/', O = D + 'map-adapt6/'
const L4 = ['A', 'B', 'C', 'D']
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const rd = p => { if (!existsSync(D + p)) die(`missing ${p}`); return JSON.parse(readFileSync(D + p, 'utf8')) }
const flat = (n, r) => { const off = Math.floor(r() * 4); return shuffleWith(Array.from({ length: n }, (_, i) => L4[(i + off) % 4]), r) }
function place(choices, key, letter, r) {
  const ch = choices.map(String), k = ch.indexOf(String(key))
  if (ch.length !== 4 || k < 0) die(`malformed item (key "${String(key).slice(0, 40)}")`)
  const rest = shuffleWith(ch.filter((_, j) => j !== k), r); let q = 0
  return Object.fromEntries(L4.map(s => [s, s === letter ? ch[k] : rest[q++]]))
}
const controls = () => {
  const R = rd('map-pilot-2-control-r.batch.json'), V = rd('map-pilot-control.batch.json')
  if (R.length !== 8 || V.length !== 12) die('controls must be batch 2\'s 8 R and 12 V')
  return { R: R.map(x => ({ uid: x.id, arm: 'controlR', choices: x.choices, key: x.correct_answer })), V: V.map(x => ({ uid: x.id, arm: 'controlV', choices: x.choices, key: x.correct_answer })) }
}
function ooFile(items, seed0, name) {
  let seed = seed0, tries = 0, order, letters, r
  const grp = x => (x.arm.startsWith('control') ? x.arm : 'cand')
  for (;;) {
    tries++; r = rng(seed++)
    order = shuffleWith(items.slice(), r)
    const q = {}; for (const g of new Set(items.map(grp))) q[g] = flat(items.filter(x => grp(x) === g).length, r)
    letters = order.map(x => q[grp(x)].pop())
    if (!periodicity(letters.join('')).fail) break
    if (tries > 500) die('no E8-clean deal in 500 seeds')
  }
  const blind = {}, key = {}
  order.forEach((x, i) => { const b = `L${String(i + 1).padStart(2, '0')}`; blind[b] = { options: place(x.choices, x.key, letters[i], r) }; key[b] = { letter: letters[i], width: 4, localId: x.uid, arm: x.arm, ...(x.pair ? { pair: x.pair } : {}) } })
  writeFileSync(O + `${name}.blind.json`, JSON.stringify(blind, null, 1) + '\n')
  writeFileSync(O + `${name}.key.json`, JSON.stringify(key, null, 1) + '\n')
  const cand = Object.values(key).filter(k => !k.arm.startsWith('control')).map(k => k.letter).join('')
  console.log(`${name}: ${order.length} items, seeds tried ${tries}; candidate keys ${cand}`)
}
function load() {
  const sources = rd('map-adapt6/sources.json'), batch = rd('map-adapt6/batch.json')
  for (const it of batch) { const s = sources.find(x => x.adapt_id === it.id); if (!s || s.source_id !== it.source_id) die(`${it.id} has no matching source`) }
  return { sources, batch }
}

const mode = process.argv[2]
if (mode === 'screen') {
  const cand = rd('map-adapt6/candidates.json')
  if (cand.length !== 18) die(`candidates ${cand.length} != 18`)
  ooFile([...cand.map(c => ({ uid: c.source_id, arm: 'candidate', choices: c.item.choices, key: c.item.correct_answer })), ...controls().R], 20261021, 'screen')
} else if (mode === 'fidelity') {
  const { sources, batch } = load()
  writeFileSync(O + 'fidelity.input.json', JSON.stringify(batch.map(it => { const s = sources.find(x => x.adapt_id === it.id); return { id: it.id, source: { passage: s.item.passage, prompt: s.item.prompt, choices: s.item.choices, key: s.item.correct_answer }, adapted: { target: `${it.target_band} (grade ${it.grade_target})`, passage: it.passage, prompt: it.prompt, choices: it.choices, key: it.correct_answer, dropped_source_option: null } } }), null, 1) + '\n')
  console.log(`fidelity input: ${batch.length} pairs`)
} else if (mode === 'oo') {
  const { sources, batch } = load()
  if (batch.length < 11) die(`batch has ${batch.length}; stage 0 requires >= 11`)
  const { R, V } = controls(), K = 3
  const ids = shuffleWith(batch.map(x => x.id).sort(), rng(20261022))
  for (let f = 0; f < K; f++) {
    const mine = new Set(ids.filter((_, i) => i % K === f))
    ooFile([...batch.filter(x => mine.has(x.id)).map(it => ({ uid: it.id, arm: 'comprehension', pair: it.id, choices: it.choices, key: it.correct_answer })), ...R, ...V], 20261023 + f, `oo-adapted-f${f + 1}`)
    ooFile([...sources.filter(s => mine.has(s.adapt_id)).map(s => ({ uid: `src:${s.source_id}`, arm: 'comprehension', pair: s.adapt_id, choices: s.item.choices, key: s.item.correct_answer })), ...R, ...V], 20261123 + f, `oo-source-f${f + 1}`)
  }
} else if (mode === 'ws') {
  const { batch } = load()
  let seed = 20261024, tries = 0, order, letters, r
  for (;;) { tries++; r = rng(seed++); order = shuffleWith(batch.slice(), r); letters = flat(order.length, r); if (!periodicity(letters.join('')).fail) break; if (tries > 500) die('no E8-clean deal') }
  const key = {}, md = [`# Items for review (${order.length})\n\nEach item: strand, stated grade target and target band, passage, question, four options. The correct answer is NOT marked.\n`]
  order.forEach((it, i) => {
    const n = i + 1, opts = place(it.choices, it.correct_answer, letters[i], r)
    key[n] = { letter: letters[i], localId: it.id, stratum: it.stratum, target_band: it.target_band }
    md.push(`---\n\n## Item ${n}\n\nStrand: ${it.map_area} - ${it.map_strand} | Grade target: ${it.grade_target} | Target band: ${it.target_band}\n\nPassage:\n\n${it.passage}\n\nQuestion: ${it.prompt}\n\n${L4.map(s => `${s}. ${opts[s]}`).join('\n')}\n`)
  })
  writeFileSync(O + 'ws.md', md.join('\n')); writeFileSync(O + 'ws.key.json', JSON.stringify(key, null, 1) + '\n')
  console.log(`ws render: ${order.length} items, seeds tried ${tries}; key sequence ${letters.join('')}`)
} else if (mode === 'nat') {
  const { batch } = load()
  const ctl = rd('map-pilot-2-rlu.batch.json').filter(x => x.stratum === 'comprehension' && x.passage)
  if (ctl.length !== 6) die(`naturalness control: expected batch 2's 6 comprehension passages, got ${ctl.length}`)
  const all = shuffleWith([...batch.map(x => ({ src: x.id, passage: x.passage })), ...ctl.map(x => ({ src: `ctl:${x.id}`, passage: x.passage }))], rng(20261025))
  const nkey = {}
  writeFileSync(O + 'naturalness.json', JSON.stringify(all.map((x, i) => { nkey[`N${i + 1}`] = x.src; return { id: `N${i + 1}`, passage: x.passage } }), null, 1) + '\n')
  writeFileSync(O + 'naturalness.key.json', JSON.stringify(nkey, null, 1) + '\n')
  console.log(`naturalness: ${all.length} passages (${batch.length} candidate, 6 control)`)
} else die('usage: map-adapt6-render.mjs screen|fidelity|oo|ws|nat')
