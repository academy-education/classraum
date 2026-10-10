#!/usr/bin/env node
/** mf30-assemble.mjs <a|b|c|d|p|q|r|g|h|j|t|u|v> — sat-math-v30-full (PREREG-MF30-2026-10-10.md). Authors write ONE
 *  small file per item to <WORK>/parts/SM30F-<X>NN.json (outside the repo) (A90 process lesson 1: runs rewriting one growing file
 *  stalled); this folds them into sat-math-v30-full-<x>.batch.json in id order. A part REPLACES a same-id item
 *  already in the file (returns are written as parts). Refuses on unreadable input, a part whose id does not
 *  match its filename, or a part for an id outside the author's slots. */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { slot, WORK, LETTERS } from './mf30-slots.mjs'
const D = new URL('.', import.meta.url).pathname
const x = process.argv[2]; if (!x || x.length !== 1 || !LETTERS.includes(x)) { console.error(`usage: mf30-assemble.mjs <one of ${LETTERS}>`); process.exit(2) }
const X = x.toUpperCase(), f = `${D}sat-math-v30-full-${x}.batch.json`
const base = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : []
const by = new Map(base.map(i => [i.id, i])); let parts = 0
for (const p of (existsSync(`${WORK}/parts`) ? readdirSync(`${WORK}/parts`) : []).filter(p => p.startsWith(`SM30F-${X}`) && p.endsWith('.json'))) {
  let it; try { it = JSON.parse(readFileSync(`${WORK}/parts/${p}`, 'utf8')) } catch (e) { console.error(`REFUSING: ${p} unreadable: ${e.message}`); process.exit(2) }
  if (`${it.id}.json` !== p) { console.error(`REFUSING: ${p} holds id ${it.id}`); process.exit(2) }
  if (!slot[it.id]) { console.error(`REFUSING: ${it.id} is not a commissioned slot`); process.exit(2) }
  by.set(it.id, it); parts++
}
const out = [...by.values()].sort((a, b) => a.id.localeCompare(b.id))
writeFileSync(f, JSON.stringify(out, null, 1) + '\n')
const want = Object.keys(slot).filter(id => id[6] === X)
console.log(`${x}: ${base.length} in file + ${parts} parts -> ${out.length} of ${want.length} slots (${out.map(i => i.id.slice(6)).join(' ')}); missing ${want.filter(id => !by.has(id)).map(i => i.slice(6)).join(' ') || 'none'}`)
