#!/usr/bin/env node
/**
 * deal-vocab.mjs <V1.json> <V2.json> — deal MRV4 vocabulary key slots flat (seeded) and write V.merged.json
 * next to the first input (or OUT=...). Authors put the key first; this places it. Exits 2 on unreadable input.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join, basename } from 'node:path'
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const files = process.argv.slice(2)
if (!files.length) die('usage: deal-vocab.mjs <V1.json> [...]')
const items = files.flatMap(f => { if (!existsSync(f)) die(`missing ${f}`); const a = JSON.parse(readFileSync(f, 'utf8')); if (!Array.isArray(a)) die(`${f}: not an array`); return a })
if (!items.length) die('zero items read')
for (const it of items) if (!Array.isArray(it.choices) || it.choices.length !== 4 || !it.choices.includes(it.correct_answer)) die(`${it.id}: bad choices`)
let s0 = createHash('sha256').update('map-v2-vocab-b3-2026-10-31:' + files.map(f => basename(f)).join(',')).digest().readUInt32BE(0) || 1
const rnd = () => { s0 ^= s0 << 13; s0 >>>= 0; s0 ^= s0 >> 17; s0 ^= s0 << 5; s0 >>>= 0; return s0 / 4294967296 }
const sh = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
let slots
for (let t = 0; ; t++) { // no slot more than 3 times in a row
  slots = sh(Array.from({ length: items.length }, (_, i) => i % 4))
  if (!slots.some((x, i) => i >= 3 && slots[i - 1] === x && slots[i - 2] === x && slots[i - 3] === x)) break
  if (t > 200) die('slot rule unsatisfiable')
}
const out = items.map((it, i) => { const d = sh(it.choices.filter(c => c !== it.correct_answer)), sl = slots[i]; return { ...it, choices: [...d.slice(0, sl), it.correct_answer, ...d.slice(sl)], key_slot: 'ABCD'[sl] } })
const hist = {}; out.forEach(i => hist[i.key_slot] = (hist[i.key_slot] || 0) + 1)
const dest = process.env.OUT || join(dirname(files[0]), 'V.merged.json')
writeFileSync(dest, JSON.stringify(out, null, 1))
console.log(`dealt ${out.length} items -> ${dest}; key slots`, hist)
