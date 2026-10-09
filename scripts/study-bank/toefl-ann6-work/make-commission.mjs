// Seeded commission for announcement-v6 (seed 20261009). Writes sets/COMMISSION.json.
import { writeFileSync } from 'node:fs'
let h = 20261009; const r = () => (h = (h * 1664525 + 1013904223) >>> 0) / 2 ** 32
const shuf = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const settings = ['Campus art gallery', 'Writing centre', 'Biology greenhouse', 'Student orientation team', 'Campus bicycle hub', 'Music practice rooms',
  'Student elections committee', 'Astronomy observatory', 'Language exchange club', 'IT help desk', 'Debate society', 'Campus recycling programme',
  "Campus farmers' market", 'Film society', 'Aquatics centre']
// 30 kind slots D8 P8 I7 R7, no set with the same kind twice; key-length ranks 8/7/8/7
let kinds
for (;;) { const k = shuf([...'DDDDDDDDPPPPPPPPIIIIIIIRRRRRRR']); let ok = true; for (let s = 0; s < 15; s++) if (k[2 * s] === k[2 * s + 1]) ok = false; if (ok) { kinds = k; break } }
const ranks = shuf([1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4])
// gridKey applies to kind D only; dealt 4 latest / 4 earlier over the 8 D items
// (conv-hard-v2's tell: the key was the last-mentioned pair on 17/17 grids)
const dGrid = shuf(['latest', 'latest', 'latest', 'latest', 'earlier', 'earlier', 'earlier', 'earlier'])
let gi = 0
const grid = [...Array(15)].map((_, s) => (kinds[2 * s] === 'D' || kinds[2 * s + 1] === 'D') ? dGrid[gi++] : 'n/a')
const out = settings.map((setting, s) => ({
  set: `AN6-${String(s + 1).padStart(2, '0')}`, setting, author: 'ABCDE'[Math.floor(s / 3)],
  q1: { kind: kinds[2 * s], keyLengthRank: ranks[2 * s] }, q2: { kind: kinds[2 * s + 1], keyLengthRank: ranks[2 * s + 1] }, gridKey: grid[s],
}))
writeFileSync(new URL('./sets/COMMISSION.json', import.meta.url), JSON.stringify(out, null, 1))
const cnt = a => a.reduce((m, x) => (m[x] = (m[x] ?? 0) + 1, m), {})
console.log('kinds', cnt(kinds), 'ranks', cnt(ranks), 'grid', cnt(grid))
for (const c of out) console.log(c.set, c.author, c.setting, c.q1.kind + c.q1.keyLengthRank, c.q2.kind + c.q2.keyLengthRank, c.gridKey)
