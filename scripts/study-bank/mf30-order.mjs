#!/usr/bin/env node
/**
 * mf30-order.mjs [--dry] — builds the FROZEN file for sat-math-v30-full
 * (PREREG-MF30-2026-10-10.md; mf29-order.mjs over thirteen author files) from the thirteen author files, in the order fixed by
 * seed 20261061 (mf30-slots.mjs ORDER, printed in the prereg before any item
 * existed). An id dropped before freeze leaves its place empty; the rest keep the
 * pre-registered order. Fields are kept as authored (adv24 froze with author
 * fields; they are stripped for every grader/solver render by mf30-strip.mjs).
 * Refuses (exit 2) on unreadable files, unknown or duplicate ids. Reports shared
 * key values and shared option values across items (merge-halves' checks).
 * --exclude ID[,ID] leaves pre-freeze drops out.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { ORDER, SPEC, LETTERS } from './mf30-slots.mjs'
const DIR = new URL('.', import.meta.url).pathname
const args = process.argv.slice(2)
const xi = args.indexOf('--exclude'); const EXC = new Set(xi >= 0 ? args[xi + 1].split(',').map(s => s.startsWith('SM30F-') ? s : 'SM30F-' + s) : [])
const items = []
for (const a of LETTERS) {
  const p = `${DIR}sat-math-v30-full-${a}.batch.json`
  let j; try { j = JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${p}: ${e.message}`); process.exit(2) }
  if (!Array.isArray(j) || !j.length || j.length > SPEC[a.toUpperCase()][0]) { console.error(`REFUSING: ${p} holds ${Array.isArray(j) ? j.length : 'no'} items`); process.exit(2) }
  items.push(...j)
}
const ids = items.map(x => x.id)
if (new Set(ids).size !== ids.length) { console.error('REFUSING: duplicate ids'); process.exit(2) }
for (const id of ids) if (!ORDER.includes(id)) { console.error(`REFUSING: ${id} is not a commissioned slot`); process.exit(2) }
for (const id of EXC) if (!ids.includes(id)) { console.error(`REFUSING: --exclude ${id} is not in the author files`); process.exit(2) }
const at = new Map(ORDER.map((id, i) => [id, i]))
const frozen = items.filter(x => !EXC.has(x.id)).sort((x, y) => at.get(x.id) - at.get(y.id))
const n = s => String(s).replace(/−/g, '-').trim()
const byKey = {}, byOpt = {}
for (const it of frozen) { (byKey[n(it.correct_answer)] ??= []).push(it.id); for (const c of it.choices) (byOpt[n(c)] ??= []).push(it.id) }
const sk = Object.entries(byKey).filter(([, v]) => v.length > 1), so = Object.entries(byOpt).filter(([, v]) => v.length > 1)
console.log(`frozen ${frozen.length} of ${items.length} authored (excluded ${[...EXC].join(' ') || 'none'})`)
console.log(`order: ${frozen.map(x => x.id.slice(6)).join(' ')}`)
console.log(`shared key values: ${sk.length ? sk.map(([k, v]) => `${k} [${v.join(' ')}]`).join('; ') : 'none'}`)
console.log(`shared option values (${so.length}): ${so.map(([k, v]) => `${k} [${v.map(x => x.slice(6)).join(' ')}]`).join('; ') || 'none'}`)
if (args.includes('--dry')) process.exit(0)
writeFileSync(`${DIR}sat-math-v30-full.batch.json`, JSON.stringify(frozen, null, 1) + '\n')
console.log(`wrote sat-math-v30-full.batch.json (${frozen.length})`)
