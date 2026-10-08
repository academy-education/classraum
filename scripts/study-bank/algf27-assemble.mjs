#!/usr/bin/env node
/** algf27-assemble.mjs <a|b|c|d> — the authors' liveness fallback (2026-10-08: three author runs
 *  stalled rewriting one growing file) wrote later items one per file to algf27-parts/. This folds
 *  sat-math-v27-algfull-<x>.batch.json plus algf27-parts/SM27F-<X>NN.json into the author file, in
 *  id order. A part REPLACES a same-id item in the file (returns are written as parts). Refuses on
 *  unreadable input or a part whose id does not match its filename. */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
const D = new URL('.', import.meta.url).pathname
const x = process.argv[2]; if (!/^[abcd]$/.test(x ?? '')) { console.error('usage: algf27-assemble.mjs <a|b|c|d>'); process.exit(2) }
const f = `${D}sat-math-v27-algfull-${x}.batch.json`
const base = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : []
const by = new Map(base.map(i => [i.id, i])); let parts = 0
for (const p of readdirSync(`${D}algf27-parts`).filter(p => p.startsWith(`SM27F-${x.toUpperCase()}`) && p.endsWith('.json'))) {
  const it = JSON.parse(readFileSync(`${D}algf27-parts/${p}`, 'utf8'))
  if (`${it.id}.json` !== p) { console.error(`REFUSING: ${p} holds id ${it.id}`); process.exit(2) }
  by.set(it.id, it); parts++
}
const out = [...by.values()].sort((a, b) => a.id.localeCompare(b.id))
writeFileSync(f, JSON.stringify(out, null, 1) + '\n')
console.log(`${x}: ${base.length} in file + ${parts} parts -> ${out.length} items (${out.map(i => i.id.slice(6)).join(' ')})`)
