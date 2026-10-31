#!/usr/bin/env node
// oo-score.mjs — REPORT-ONLY scorer for the prereg §5 attack. Exits 2 on any missing/short solver file.
//   node scripts/study-bank/itep-reading-v2-work/oo-score.mjs <dir>
import { readFileSync, existsSync } from 'node:fs'
const dir = process.argv[2]; const die = m => { console.error(`oo-score: ${m}`); process.exit(2) }
if (!dir) die('usage: oo-score.mjs <dir>')
const arm = { cand: { hit: 0, n: 0, unan: 0, units: 0, unanHit: 0 }, ctl: { hit: 0, n: 0, unan: 0, units: 0, unanHit: 0 } }
const perItem = []
for (let f = 1; f <= 4; f++) {
  const key = JSON.parse(readFileSync(`${dir}/oo-f${f}.key.json`, 'utf8'))
  const sol = ['a', 'b', 'c'].map(s => { const p = `${dir}/oo-f${f}.solver-${s}.json`; if (!existsSync(p)) die(`missing ${p}`); return JSON.parse(readFileSync(p, 'utf8')) })
  const letters = Object.values(key).map(k => k.letter); const line = Math.max(...'ABCD'.split('').map(L => letters.filter(x => x === L).length)) / letters.length
  console.log(`file ${f}: ${letters.length} items, best-fixed-letter line ${(100 * line).toFixed(1)}%`)
  for (const [n, k] of Object.entries(key)) {
    const picks = sol.map((s, i) => { const p = s[n]?.pick; if (!'ABCD'.includes(p || 'x')) die(`file ${f} solver ${'abc'[i]} item ${n}: pick ${p}`); return p })
    const a = arm[k.arm]; a.units++; for (const p of picks) { a.n++; if (p === k.letter) a.hit++ }
    if (new Set(picks).size === 1) { a.unan++; if (picks[0] === k.letter) a.unanHit++ }
    if (k.arm === 'cand') perItem.push([k.localId, picks.filter(p => p === k.letter).length])
  }
}
const pct = (x, n) => n ? (100 * x / n).toFixed(1) : 'n/a'
for (const [k, a] of Object.entries(arm)) console.log(`${k === 'cand' ? 'candidate' : 'control  '}: ${a.hit}/${a.n} = ${pct(a.hit, a.n)}% (${a.units} items x 3); unanimous ${a.unan}/${a.units}, unanimous on key ${a.unanHit}/${a.units}`)
const m = 100 * (arm.cand.hit / arm.cand.n - arm.ctl.hit / arm.ctl.n)
console.log(`margin candidate - control: ${m >= 0 ? '+' : ''}${m.toFixed(1)} points (REPORT-ONLY; +25 would be written up for the owner)`)
if (arm.ctl.hit / arm.ctl.n >= 0.75) console.log('control >= 75%: no headroom, uninformative')
console.log('candidate items solved by 3/3:', perItem.filter(([, h]) => h === 3).map(([i]) => i).join(' ') || 'none')
