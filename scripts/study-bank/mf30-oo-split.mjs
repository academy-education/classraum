#!/usr/bin/env node
/** mf30-oo-split.mjs <mf30alg|mf30adv|mf30geo|mf30psda> — reported, not gated (PREREG-MF30-2026-10-10.md; algf27-oo-split.mjs with the tag
 *  as an argument): options-only hit rate split by key position (extreme vs interior by value) per arm, over the
 *  three samples. Reads <tag>-oo.{blind,key}.json and <tag>-oo.solver-{a,b,c}.json; refuses on a missing file or an unscorable option set. */
import { readFileSync } from 'node:fs'
import { scoreItem } from './key-extremity-breakdown.mjs'
const D = new URL('.', import.meta.url).pathname
const rd = f => { try { return JSON.parse(readFileSync(D + f, 'utf8')) } catch { console.error(`REFUSING: ${f}`); process.exit(2) } }
const T = process.argv[2]; if (!/^mf30(alg|adv|geo|psda)$/.test(T ?? '')) { console.error('usage: mf30-oo-split.mjs <mf30alg|mf30adv|mf30geo|mf30psda>'); process.exit(2) }
const blind = rd(`${T}-oo.blind.json`), key = rd(`${T}-oo.key.json`), S = ['a', 'b', 'c'].map(s => rd(`${T}-oo.solver-${s}.json`))
const t = {}
for (const [id, k] of Object.entries(key)) {
  const o = blind[id].options; const sc = scoreItem(Object.values(o), o[k.letter]); if (sc.skip) { console.error(`REFUSING: ${id} ${sc.skip}`); process.exit(2) }
  const pos = sc.keyMin || sc.keyMax ? 'extreme' : 'interior'; const c = (t[`${k.kind} ${pos}`] ??= [0, 0])
  for (const s of S) { c[1]++; if (s[id].pick === k.letter) c[0]++ }
}
for (const [k, [h, n]] of Object.entries(t).sort()) console.log(`  ${k.padEnd(22)} ${h}/${n} = ${(100 * h / n).toFixed(1)}%`)
