#!/usr/bin/env node
/** algf27-oo-split.mjs — reported, not gated (PREREG-ALGF27): options-only hit rate split by key
 *  position (extreme vs interior by value) per arm, over the three samples. Reads algf27-oo.{blind,key}.json
 *  and algf27-oo.solver-{a,b,c}.json; refuses on a missing file or an unscorable option set. */
import { readFileSync } from 'node:fs'
import { scoreItem } from './key-extremity-breakdown.mjs'
const D = new URL('.', import.meta.url).pathname
const rd = f => { try { return JSON.parse(readFileSync(D + f, 'utf8')) } catch { console.error(`REFUSING: ${f}`); process.exit(2) } }
const blind = rd('algf27-oo.blind.json'), key = rd('algf27-oo.key.json'), S = ['a', 'b', 'c'].map(s => rd(`algf27-oo.solver-${s}.json`))
const t = {}
for (const [id, k] of Object.entries(key)) {
  const o = blind[id].options; const sc = scoreItem(Object.values(o), o[k.letter]); if (sc.skip) { console.error(`REFUSING: ${id} ${sc.skip}`); process.exit(2) }
  const pos = sc.keyMin || sc.keyMax ? 'extreme' : 'interior'; const c = (t[`${k.kind} ${pos}`] ??= [0, 0])
  for (const s of S) { c[1]++; if (s[id].pick === k.letter) c[0]++ }
}
for (const [k, [h, n]] of Object.entries(t).sort()) console.log(`  ${k.padEnd(22)} ${h}/${n} = ${(100 * h / n).toFixed(1)}%`)
