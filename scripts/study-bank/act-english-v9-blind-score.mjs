// Bar 3 (screen): per-domain blind score for act-en9 vs the 2026-09-12 matched live control.
// The act-en7 scorer, recovered verbatim from the v7 session; cohort names and file list changed only (v9: five author files a-e).
import { readFileSync, existsSync } from 'node:fs'
const D = '/Users/andylee/Downloads/saas/classraum/scripts/study-bank'
const N = 10
const dom = {}
for (const f of 'abcde') for (const it of JSON.parse(readFileSync(`${D}/act-english-v9-${f}.batch.json`, 'utf8'))) dom[it.id] = it.domain
const missing = [...Array(N).keys()].map(i => i + 1).filter(f => !existsSync(`${D}/act-en9-f${f}.solver-a.json`))
if (missing.length) { console.error(`REFUSING: solver output missing for f${missing.join(', f')}`); process.exit(2) }
const rows = []
for (let f = 1; f <= N; f++) {
  const key = JSON.parse(readFileSync(`${D}/act-en9-f${f}.key.json`, 'utf8'))
  const sol = JSON.parse(readFileSync(`${D}/act-en9-f${f}.solver-a.json`, 'utf8'))
  for (const [id, k] of Object.entries(key)) {
    const s = sol[id]
    if (!s?.pick) { console.error(`REFUSING: f${f} item ${id} has no pick`); process.exit(2) }
    if (!dom[k.localId]) { console.error(`REFUSING: ${k.localId} not in batch files`); process.exit(2) }
    rows.push({ f, domain: dom[k.localId], key: k.letter, pick: s.pick, basis: s.basis, localId: k.localId })
  }
}
const ctl = sub => { const c = {}; for (const r of sub) c[r.key] = (c[r.key] ?? 0) + 1; return 100 * Math.max(...Object.values(c)) / sub.length }
const LIVE = { 'Conventions of Standard English': [17, 25], 'Production of Writing': [14, 21], 'Knowledge of Language': [13, 14] }
console.log(`scorable ${rows.length} picks over ${N} sibling-free files (expected 150)`)
const line = (label, sub, live) => {
  const ok = sub.filter(r => r.pick === r.key).length, rate = 100 * ok / sub.length
  let s = `${label.padEnd(34)} ${ok}/${sub.length} = ${rate.toFixed(1)}%  control ${ctl(sub).toFixed(1)}%`
  if (live) { const lr = 100 * live[0] / live[1]; s += `  live ${live[0]}/${live[1]} = ${lr.toFixed(1)}%  diff ${(rate - lr >= 0 ? '+' : '') + (rate - lr).toFixed(1)}  ${rate - lr > 15 ? 'SCREEN FLAG (>+15)' : 'no flag'}${label.startsWith('Knowledge') ? ' [report-only: live leaves 7.1 headroom]' : ''}` }
  console.log(s)
}
for (const d of Object.keys(LIVE)) line(d, rows.filter(r => r.domain === d), LIVE[d])
line('POOLED', rows, null)
const conf = rows.filter(r => r.basis === 'confident'), guess = rows.filter(r => r.basis !== 'confident')
line('  declared confident', conf, null); line('  declared guess', guess, null)
for (let f = 1; f <= N; f++) line(`  file ${f}`, rows.filter(r => r.f === f), null)
