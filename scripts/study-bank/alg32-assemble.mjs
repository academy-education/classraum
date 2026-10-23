#!/usr/bin/env node
/**
 * alg32-assemble.mjs <b|c|d> — folds an author's part files (WORK/parts/SM32L-<X><n>.json, one item
 * object each; A90 process lesson: long single-file runs stalled, one file per item made authoring
 * resumable) into scripts/study-bank/sat-math-v32-alg-<x>.batch.json, in slot order.
 * PREREG-MATH-ALG32-2026-10-23.md. Refuses (exit 2): no parts, an unparseable part, a part whose id
 * does not match its file name or is not one of the author's commissioned slots.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { WORK, SLOTS, PREFIX, COHORT } from './alg32-slots.mjs'
const D = new URL('.', import.meta.url).pathname
const a = String(process.argv[2] ?? '').toLowerCase()
if (!/^[bcd]$/.test(a)) { console.error('usage: alg32-assemble.mjs <b|c|d>'); process.exit(2) }
const X = a.toUpperCase(), dir = `${WORK}/parts`
const files = existsSync(dir) ? readdirSync(dir).filter(f => new RegExp(`^${PREFIX}${X}\\d\\.json$`).test(f)) : []
if (!files.length) { console.error(`REFUSING: no ${PREFIX}${X}*.json parts in ${dir}`); process.exit(2) }
const items = []
for (const f of files) {
  let it; try { it = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) } catch (e) { console.error(`REFUSING: ${f}: ${e.message}`); process.exit(2) }
  if (!it || Array.isArray(it) || `${it.id}.json` !== f) { console.error(`REFUSING: ${f} is not one item whose id matches the file name`); process.exit(2) }
  if (!SLOTS[String(it.id).replace(PREFIX, '')]) { console.error(`REFUSING: ${it.id} is not a commissioned slot`); process.exit(2) }
  items.push(it)
}
items.sort((x, y) => Number(x.id.slice(-1)) - Number(y.id.slice(-1)))
const out = `${D}${COHORT}-${a}.batch.json`
writeFileSync(out, JSON.stringify(items, null, 1) + '\n')
console.log(`${items.length} part(s) -> ${out}: ${items.map(x => x.id.replace(PREFIX, '')).join(' ')}`)
