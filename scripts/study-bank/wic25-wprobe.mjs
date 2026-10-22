#!/usr/bin/env node
/**
 * wic25-wprobe.mjs — pre-freeze STEERING probe over EVERY world of sat-cs-wic-v25
 * (decides nothing at the gate). Replaces v24's options-only r1/r2 probes, which
 * measure nothing under the four-world method (every option is the key of some world).
 *
 *   render [--work <dir>] [--out <prefix>]   four renders r0..r3; render r holds world
 *        (r + itemIndex) mod 4 of EVERY item, so each render shows each item exactly
 *        once and no reader ever sees two worlds of one item (which would let them
 *        solve by cross-world elimination). Passage + options, no key; letters dealt
 *        flat within each render; ids P01..; seed 20262583.
 *        -> <prefix>-r<k>.blind.json / .key.json  (default sat-cs-wic-v25-wprobe)
 *   score  [--out <prefix>]   reads <prefix>-r<k>.probe.json for k = 0..3 (one FRESH
 *        reader per render, DPROBE-BRIEF.md fields).
 *
 * Steering bars (PREREG-WIC25): a world is NAMED for the single revision round if the
 * reader's pick misses its key, or it rates easy, or key_from_one_sentence is true, or
 * explicit_kills >= 2, or a second option is defensible. Per author it prints the
 * recovered-key rate over all 4 x N worlds, so a world that only its author can solve
 * is visible BEFORE selection. Selection is not computable until freeze (the seed
 * mixes the frozen sha), so revising here cannot favour the served world.
 * Refuses (exit 2) on missing/unreadable input, zero worlds, or an id mismatch.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
const args = process.argv.slice(2)
const cmd = args[0]
const argOf = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }
const D = 'scripts/study-bank'
const W = argOf('--work') ?? `${D}/sat-cs-wic-v25-work`
const PRE = argOf('--out') ?? `${D}/sat-cs-wic-v25-wprobe`
const L4 = ['A', 'B', 'C', 'D']
const rd = p => { if (!existsSync(p)) { console.error(`REFUSING: ${p} missing`); process.exit(2) } try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${p}: ${e.message}`); process.exit(2) } }
if (cmd === 'render') {
  const items = []
  for (const a of L4) { const dir = `${W}/${a}`; if (!existsSync(dir)) continue
    for (const f of readdirSync(dir).filter(f => /^WIC25[A-D]-\d\d\.json$/.test(f)).sort()) items.push({ ...rd(`${dir}/${f}`), author: a }) }
  if (!items.length) { console.error('REFUSING: no candidate files'); process.exit(2) }
  if (items.some(it => !Array.isArray(it.worlds) || it.worlds.length !== 4)) { console.error('REFUSING: an item lacks four worlds (run wic25-selfcheck first)'); process.exit(2) }
  const rand = rng(20262583)
  for (let r = 0; r < 4; r++) {
    const list = items.map((it, i) => { const k = (r + i) % 4; return { id: it.id, author: it.author, world: k, passage: it.worlds[k].passage, choices: it.choices, key: it.worlds[k].key } })
    const order = shuffleWith(shuffleWith(list, rand).map((x, i) => ({ ...x, want: L4[i % 4] })), rand)
    const blind = {}, key = {}
    order.forEach((x, i) => {
      const pid = `P${String(i + 1).padStart(2, '0')}`
      const rest = shuffleWith(x.choices.filter(c => c !== x.key), rand); let q = 0
      blind[pid] = { passage: x.passage, question: 'Which choice completes the text with the most logical and precise word or phrase?', options: Object.fromEntries(L4.map(l => [l, l === x.want ? x.key : rest[q++]])) }
      key[pid] = { letter: x.want, id: x.id, author: x.author, world: x.world }
    })
    if (new Set(Object.values(key).map(k => k.id)).size !== items.length) { console.error('REFUSING: a render shows an item twice'); process.exit(2) }
    writeFileSync(`${PRE}-r${r}.blind.json`, JSON.stringify(blind, null, 1) + '\n')
    writeFileSync(`${PRE}-r${r}.key.json`, JSON.stringify(key, null, 1) + '\n')
    console.log(`render r${r}: ${order.length} worlds (one per item) -> ${PRE}-r${r}.blind.json`)
  }
} else if (cmd === 'score') {
  const rows = []
  for (let r = 0; r < 4; r++) {
    const key = rd(`${PRE}-r${r}.key.json`), pr = rd(`${PRE}-r${r}.probe.json`)
    const ids = Object.keys(key)
    if (!ids.length) { console.error(`REFUSING: render r${r} has zero worlds`); process.exit(2) }
    const miss = ids.filter(i => !pr[i] || !L4.includes(String(pr[i].pick).toUpperCase()))
    if (miss.length) { console.error(`REFUSING: probe r${r} lacks a pick for ${miss.slice(0, 5).join(', ')}`); process.exit(2) }
    for (const i of ids) rows.push({ ...key[i], r, p: pr[i] })
  }
  const named = []
  const by = {}
  for (const x of rows) {
    const why = []
    if (String(x.p.pick).toUpperCase() !== x.letter) why.push('key not recovered')
    if (x.p.difficulty === 'easy') why.push('easy')
    if (x.p.key_from_one_sentence === true) why.push('one sentence')
    if (Number(x.p.explicit_kills) >= 2) why.push(`explicit kills ${x.p.explicit_kills}`)
    if (x.p.second_defensible) why.push('second defensible')
    if (why.length) named.push(`${x.id} w${x.world}: ${why.join(', ')}`)
    const b = (by[x.author] ??= { n: 0, ok: 0, hard: 0, easy: 0 })
    b.n++; if (String(x.p.pick).toUpperCase() === x.letter) b.ok++; if (x.p.difficulty === 'hard') b.hard++; if (x.p.difficulty === 'easy') b.easy++
  }
  for (const [a, b] of Object.entries(by)) console.log(`author ${a}: ${b.n} worlds, key recovered ${b.ok}/${b.n} (${(100 * b.ok / b.n).toFixed(1)}%), hard ${b.hard}, easy ${b.easy}`)
  console.log(`named for revision: ${named.length} of ${rows.length} worlds`)
  for (const x of named) console.log('  ' + x)
} else { console.error('usage: wic25-wprobe.mjs render|score [--work dir] [--out prefix]'); process.exit(2) }
