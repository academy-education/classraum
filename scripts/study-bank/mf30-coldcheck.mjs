#!/usr/bin/env node
/** mf30-coldcheck.mjs [h1 h2 h3] — sat-math-v30-full (PREREG-MF30-2026-10-10.md). For each grader-third:
 *  (1) the grader's private <WORK>/grade/<g>-<h>/stage1.json still hashes to the sha recorded at snap time;
 *  (2) the snapshot mf30.ws-<g>-<h>.stage1.json hashes to it too;
 *  (3) every stage-2 row (mf30.ws-<g>-<h>.json) carries every snapshot field unchanged;
 *  (4) the snapshot was taken before the keyed files were released.
 *  Exit 1 on any problem, 2 on a missing file or an unsnapped third. */
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { WORK } from './mf30-slots.mjs'
const D = new URL('.', import.meta.url).pathname; let bad = 0, n = 0
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const cs = existsSync(`${D}mf30.coldshas.json`) ? JSON.parse(readFileSync(`${D}mf30.coldshas.json`, 'utf8')) : null
if (!cs) { console.error('REFUSING: mf30.coldshas.json missing'); process.exit(2) }
for (const g of 'def') for (const h of process.argv.slice(2).length ? process.argv.slice(2) : ['h1', 'h2', 'h3']) {
  const rec = cs[`${g}-${h}`]; if (!rec) { console.error(`REFUSING: ${g}-${h} never snapped`); process.exit(2) }
  const own = `${WORK}/grade/${g}-${h}/stage1.json`, snap = `${D}mf30.ws-${g}-${h}.stage1.json`, p2 = `${D}mf30.ws-${g}-${h}.json`
  for (const p of [own, snap, p2]) if (!existsSync(p)) { console.error(`REFUSING: ${p} missing`); process.exit(2) }
  if (sha(own) !== rec.sha) { bad++; console.log(`${g}-${h}: the grader's stage1.json CHANGED after the snapshot`) }
  if (sha(snap) !== rec.sha) { bad++; console.log(`${g}-${h}: snapshot does not match its recorded sha`) }
  if (!(rec.at <= rec.released)) { bad++; console.log(`${g}-${h}: keyed files released before the snapshot`) }
  const a = JSON.parse(readFileSync(snap)), b = JSON.parse(readFileSync(p2))
  let rows = 0
  for (const [id, r] of Object.entries(a)) { if (!id.startsWith('SM30F')) continue; n++; rows++
    if (!b[id]) { bad++; console.log(`${g}-${h} ${id}: missing in stage 2`); continue }
    for (const [k, v] of Object.entries(r)) if (JSON.stringify(b[id][k]) !== JSON.stringify(v)) { bad++; console.log(`${g}-${h} ${id}.${k} changed after the keyed file opened`) } }
  console.log(`${g}-${h}: ${rows} cold rows, render ${a._render_sha}, snapped ${rec.at}`)
}
console.log(`${n} cold rows checked, ${bad} problems`); process.exit(bad ? 1 : 0)
