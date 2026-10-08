#!/usr/bin/env node
/** algf26-slots.mjs <batch.json> — every item's authored difficulty and key position by
 *  value must equal the slot fixed in PREREG-ALGF26-2026-10-08.md before authoring.
 *  Exits 1 on any mismatch, 2 on unreadable input or an unknown id. */
import { readFileSync } from 'node:fs'
import { scoreItem } from './key-extremity-breakdown.mjs'
const T = `A01 M/L A02 H/I A03 H/S A04 M/I A05 E/L A06 M/I A07 M/S A08 M/S A09 M/I A10 M/I A11 M/S A12 M/L A13 M/L
B01 H/S B02 M/L B03 M/L B04 M/S B05 M/I B06 M/I B07 M/I B08 M/L B09 M/I B10 M/I B11 M/S B12 H/L B13 M/S
C01 M/S C02 H/I C03 M/L C04 M/S C05 M/L C06 M/L C07 M/I C08 E/I C09 H/L C10 M/I C11 M/S C12 M/I C13 M/I
D01 M/I D02 M/L D03 H/S D04 M/S D05 M/I D06 M/I D07 M/L D08 M/S D09 H/I D10 M/I D11 M/I D12 M/S D13 M/L`
const slot = {}; const toks = T.split(/\s+/)
for (let i = 0; i < toks.length; i += 2) { const [d, k] = toks[i + 1].split('/'); slot['SM26F-' + toks[i]] = { d: { E: 'easy', M: 'medium', H: 'hard' }[d], k } }
if (Object.keys(slot).length !== 52) { console.error('REFUSING: slot table is not 52'); process.exit(2) }
let items; try { items = JSON.parse(readFileSync(process.argv[2], 'utf8')) } catch { console.error('REFUSING: unreadable'); process.exit(2) }
if (!Array.isArray(items) || !items.length) { console.error('REFUSING: no items'); process.exit(2) }
let bad = 0
for (const it of items) {
  const s = slot[it.id]; if (!s) { console.error(`REFUSING: unknown id ${it.id}`); process.exit(2) }
  const sc = scoreItem(it.choices.map(String), String(it.correct_answer))
  const k = sc.skip ? 'non-numeric' : sc.keyMin ? 'S' : sc.keyMax ? 'L' : 'I'
  const ok = k === s.k && it.difficulty === s.d
  if (!ok) { bad++; console.log(`SLOT MISMATCH ${it.id}: assigned ${s.d}/${s.k}, got ${it.difficulty}/${k}`) }
}
console.log(`slots: ${items.length - bad} of ${items.length} match the pre-registered table`)
process.exit(bad ? 1 : 0)
