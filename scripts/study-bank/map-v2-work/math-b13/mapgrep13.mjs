#!/usr/bin/env node
// mapgrep13.mjs "<re>&<re>..." [width] — the R11 probe for MAP Math b13 (MAP-MATH-V2-B13.prereg.md): every EARLIER MAP
// maths item. = b12's mapgrep12 corpus (dump-b10 MAP prior + live MAP rows + b9, n789, b10 drafts/assembled/returns/
// dropped, b11 candidates) PLUS n11 (assembled, post-return) and the 39 b12 stage-A candidates, PLUS every MAP row in
// dump-b13's live+staged pull. Exit 2 if any source is missing or short.
import { readFileSync, existsSync } from 'node:fs'
const SP = '/Users/andylee/Downloads/saas/classraum/scratchpad/'
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const J = (p, min) => { if (!existsSync(SP + p)) die('missing ' + p); const j = JSON.parse(readFileSync(SP + p, 'utf8')); if (j.length < min) die(`${p} holds ${j.length}`); return j }
const { CORPUS: base } = await import(SP + 'map-v2-math-b12-work/tools/mapgrep12.mjs')
if (!Array.isArray(base) || base.length < 1200) die('mapgrep12 corpus short')
const extra = []
for (const x of J('map-math-v2-n11-work/assembled.json', 7)) extra.push({ ...x, src: 'n11 assembled' })
for (const x of J('map-math-v2-n11-work/assembled.post-return.json', 5)) extra.push({ ...x, src: 'n11 post-return' })
for (const x of J('map-v2-math-b12-work/candidates.json', 39)) extra.push({ ...x, src: 'b12 candidate' })
for (const x of J('map-v2-math-work/dump-b13/live-maths.json', 4000).filter(r => r.family === 'map')) extra.push({ ...x, src: (x.verified ? 'LIVE ' : 'STAGED ') + x.cohort })
const all = [...base, ...extra]
export const CORPUS = all
if (import.meta.url === `file://${process.argv[1]}`) {
  if (!process.argv[2]) die('no query')
  const terms = process.argv[2].split('&').map(t => new RegExp(t.trim(), 'i'))
  const seen = new Set(), H = []
  for (const x of all) { const p = String(x.prompt).replace(/\s+/g, ' '); if (!terms.every(t => t.test(p))) continue; if (seen.has(p)) continue; seen.add(p); H.push(`${x.id} [${x.src}] ${p.slice(0, +process.argv[3] || 260)} | key ${x.correct_answer}`) }
  console.log(`"${process.argv[2]}": ${H.length} distinct over ${all.length} MAP rows`); for (const h of H.slice(0, 20)) console.log('  ' + h)
}
