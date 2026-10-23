#!/usr/bin/env node
/** alg32-coldcheck.mjs — sat-math-v32-alg (PREREG-MATH-ALG32-2026-10-23.md; mf30-coldcheck.mjs for one render
 *  and three graders d e f). For each grader:
 *  (1) the grader's private <PRIV>/grade/<g>/stage1.json still hashes to the sha recorded at snap time;
 *  (2) the snapshot alg32.ws-<g>.stage1.json hashes to it too;
 *  (3) every stage-2 row (alg32.ws-<g>.json) carries every snapshot field unchanged;
 *  (4) the snapshot was taken before the keyed files were released.
 *  Exit 1 on any problem, 2 on a missing file or an unsnapped third. */
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { PRIV, PREFIX } from './alg32-slots.mjs'
const D = new URL('.', import.meta.url).pathname; let bad = 0, n = 0
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const cs = existsSync(`${D}alg32.coldshas.json`) ? JSON.parse(readFileSync(`${D}alg32.coldshas.json`, 'utf8')) : null
if (!cs) { console.error('REFUSING: alg32.coldshas.json missing'); process.exit(2) }
for (const g of 'def') {
  const rec = cs[g]; if (!rec) { console.error(`REFUSING: grader ${g} never snapped`); process.exit(2) }
  const own = `${PRIV}/grade/${g}/stage1.json`, snap = `${D}alg32.ws-${g}.stage1.json`, p2 = `${D}alg32.ws-${g}.json`
  for (const p of [own, snap, p2]) if (!existsSync(p)) { console.error(`REFUSING: ${p} missing`); process.exit(2) }
  if (sha(own) !== rec.sha) { bad++; console.log(`${g}: the grader's stage1.json CHANGED after the snapshot`) }
  if (sha(snap) !== rec.sha) { bad++; console.log(`${g}: snapshot does not match its recorded sha`) }
  if (!(rec.at <= rec.released)) { bad++; console.log(`${g}: keyed files released before the snapshot`) }
  const a = JSON.parse(readFileSync(snap)), b = JSON.parse(readFileSync(p2))
  let rows = 0
  for (const [id, r] of Object.entries(a)) { if (!id.startsWith(PREFIX)) continue; n++; rows++
    if (!b[id]) { bad++; console.log(`${g} ${id}: missing in stage 2`); continue }
    for (const [k, v] of Object.entries(r)) if (JSON.stringify(b[id][k]) !== JSON.stringify(v)) { bad++; console.log(`${g} ${id}.${k} changed after the keyed file opened`) } }
  console.log(`${g}: ${rows} cold rows, render ${a._render_sha}, snapped ${rec.at}`)
}
if (!n) { console.error('REFUSING: 0 cold rows read'); process.exit(2) }
console.log(`${n} cold rows checked, ${bad} problems`); process.exit(bad ? 1 : 0)
