// shingle.mjs <batch.json> [--plant]: word-3-shingle Jaccard of every candidate stem against every live maths row
// (all families, ./dump) and within the batch; prints pairs >= 0.35 for a hand read. --plant adds a copied live ISEE
// stem as a break-test and exits 2 if the scan does not report it. Exits 2 on an empty batch or a short dump.
import { readFileSync } from 'node:fs'
const D = new URL('.', import.meta.url).pathname
const live = JSON.parse(readFileSync(D + 'dump/live-maths.json', 'utf8'))
const B = JSON.parse(readFileSync(process.argv[2], 'utf8'))
if (!B.length || live.length < 4000) { console.error('REFUSING: batch ' + B.length + ', live ' + live.length); process.exit(2) }
const plant = process.argv.includes('--plant') ? live.filter(r => r.family === 'isee')[123] : null
const cands = [...B.map(b => ({ id: b.id, p: b.prompt })), ...(plant ? [{ id: 'PLANT', p: plant.prompt.replace(/\d+/g, m => String(+m + 1)) }] : [])]
const sh = s => { const w = String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean); const S = new Set(); for (let i = 0; i + 2 < w.length; i++) S.add(w[i] + ' ' + w[i + 1] + ' ' + w[i + 2]); return S }
const jac = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n / (a.size + b.size - n || 1) }
const L = live.map(r => ({ id: r.id.slice(0, 8), fam: r.family, s: sh(r.prompt), p: r.prompt }))
const C = cands.map(c => ({ ...c, s: sh(c.p) }))
let hits = 0, plantHit = false
for (const c of C) {
  for (const l of L) { const j = jac(c.s, l.s); if (j >= 0.35) { hits++; if (c.id === 'PLANT') plantHit = true; console.log(`${c.id} ~ live ${l.fam} ${l.id} J=${j.toFixed(2)} | ${l.p.slice(0, 120).replace(/\s+/g, ' ')}`) } }
  for (const d of C) if (d.id > c.id) { const j = jac(c.s, d.s); if (j >= 0.35) { hits++; console.log(`${c.id} ~ batch ${d.id} J=${j.toFixed(2)}`) } }
}
console.log(`${B.length} candidates x ${live.length} live + within: ${hits} pair(s) >= 0.35` + (plant ? `; plant ${plantHit ? 'CAUGHT' : 'MISSED'}` : ''))
if (plant && !plantHit) process.exit(2)
