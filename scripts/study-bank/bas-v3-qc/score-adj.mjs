import { readFileSync, writeFileSync } from 'node:fs'
const pairs = JSON.parse(readFileSync('adjudication.key.json', 'utf8'))
const V = ['ja', 'jb', 'jc'].map(j => { try { return JSON.parse(readFileSync(`${j}/verdicts.json`, 'utf8')) } catch { console.error(`REFUSING: ${j}/verdicts.json unreadable`); process.exit(2) } })
const ok = new Set(['natural', 'acceptable', 'unacceptable'])
for (const [i, v] of V.entries()) for (const p of pairs) if (!ok.has(v[p.pid]?.X) || !ok.has(v[p.pid]?.Y)) { console.error(`REFUSING: judge ${'abc'[i]} incomplete on ${p.pid}`); process.exit(2) }
const killed = new Set(); const rows = []
for (const p of pairs) {
  const altSide = p.first === 'alt' ? 'X' : 'Y', keySide = altSide === 'X' ? 'Y' : 'X'
  const altR = V.map(v => v[p.pid][altSide]), keyR = V.map(v => v[p.pid][keySide])
  const accepted = altR.filter(r => r !== 'unacceptable').length
  if (accepted >= 1) killed.add(p.id)
  rows.push(`${p.pid} ${p.id} alt [${altR.join(',')}] key [${keyR.join(',')}] -> ${accepted >= 1 ? 'KILLS' : 'refuted'}`)
}
rows.forEach(r => console.log(r))
const items = JSON.parse(readFileSync('items.json', 'utf8'))
const kept = items.filter(it => !killed.has(it.id))
console.log(`killed ${killed.size}: ${[...killed].sort().join(' ')}; kept ${kept.length}/${items.length}; kill rate ${(100 * killed.size / items.length).toFixed(1)}% (re-register bar > 33.3%)`)
writeFileSync('kept.json', JSON.stringify(kept, null, 1))
