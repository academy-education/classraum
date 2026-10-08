#!/usr/bin/env node
/** algf27-coldcheck.mjs — every stage-2 grader row must carry its stage-1 (cold) fields unchanged,
 *  and the stage-1 file must be older than the stage-2 file. Exit 1 on any change, 2 on a missing file. */
import { readFileSync, statSync, existsSync } from 'node:fs'
const D = new URL('.', import.meta.url).pathname; let bad = 0, n = 0
for (const g of 'def') for (const h of process.argv.slice(2).length ? process.argv.slice(2) : ['h1', 'h2']) {
  const p1 = `${D}algf27.ws-${g}-${h}.stage1.json`, p2 = `${D}algf27.ws-${g}-${h}.json`
  if (!existsSync(p1) || !existsSync(p2)) { console.error(`REFUSING: ${g}-${h} missing`); process.exit(2) }
  const a = JSON.parse(readFileSync(p1)), b = JSON.parse(readFileSync(p2))
  if (statSync(p1).mtimeMs > statSync(p2).mtimeMs) { bad++; console.log(`${g}-${h}: stage1 newer than stage2`) }
  for (const [id, r] of Object.entries(a)) { if (!id.startsWith('SM27F')) continue; n++
    if (!b[id]) { bad++; console.log(`${g}-${h} ${id}: missing in stage 2`); continue }
    for (const [k, v] of Object.entries(r)) if (JSON.stringify(b[id][k]) !== JSON.stringify(v)) { bad++; console.log(`${g}-${h} ${id}.${k} changed after the keyed file opened`) } }
  console.log(`${g}-${h}: ${Object.keys(a).filter(k => k.startsWith('SM27F')).length} cold rows, render ${a._render_sha}`)
}
console.log(`${n} cold rows checked, ${bad} problems`); process.exit(bad ? 1 : 0)
