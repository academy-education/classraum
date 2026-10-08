#!/usr/bin/env node
// act-english-v9 mix search (pre-registration evidence, no DB access).
// Replays form-capacity.mjs's ACT English rule -- sequential greedy DFS over
// passages in group-id order, five whole passages per form, every domain count
// inside [ceil(min*50), floor(max*50)] = CSE 26-28 / PoW 15-16 / KoL 7-9 --
// over RANDOM passage orders, because group ids are UUID/slug-ordered and the
// real order is effectively arbitrary.
// Live drawable pool (read 2026-10-08, 39 verified passages; 5 staged v4
// passages are not drawable and are excluded): 15 x 4/4/2 (v1), 12 x 7/2/1 (v7),
// 6 x 5/3/2 + 6 x 6/3/1 (v8). Counts are [CSE, PoW, KoL].
//   node act-english-v9-mixsearch.mjs [R=1000] [chosen]   ('chosen' skips the full design sweep)
const R = Number(process.argv[2] ?? 1000)
const lo = [26, 15, 7], hi = [28, 16, 9]
const base = [...Array(15).fill([4, 4, 2]), ...Array(12).fill([7, 2, 1]), ...Array(6).fill([5, 3, 2]), ...Array(6).fill([6, 3, 1])]
function forms(pool) {
  pool = pool.slice(); let c = 0
  for (;;) {
    const pick = [], t = [0, 0, 0]
    const dfs = s => {
      if (pick.length === 5) return t.every((v, i) => v >= lo[i] && v <= hi[i])
      for (let i = s; i <= pool.length - (5 - pick.length); i++) {
        const p = pool[i]; if (p.some((v, k) => t[k] + v > hi[k])) continue
        p.forEach((v, k) => { t[k] += v }); pick.push(i)
        if (dfs(i + 1)) return true
        pick.pop(); p.forEach((v, k) => { t[k] -= v })
      }
      return false
    }
    if (!dfs(0)) break
    c++; const u = new Set(pick); pool = pool.filter((_, i) => !u.has(i))
  }
  return c
}
const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
// Self-check: the live pool alone must replay to form-capacity's 7 on every order.
const liveForms = new Set(Array.from({ length: 50 }, () => forms(shuf(base))))
if (liveForms.size !== 1 || !liveForms.has(7)) { console.error(`REFUSING: live pool replays to ${[...liveForms]} forms, form-capacity says 7`); process.exit(2) }
console.log(`live pool: 7 forms on 50/50 orders (matches form-capacity)`)
if (process.argv[3] !== 'chosen') for (const n of [12, 15]) for (let x = 0; x <= n; x++) {
  const d = [...Array(x).fill([5, 3, 2]), ...Array(n - x).fill([6, 3, 1])]
  const want = n === 12 ? 10 : 10
  const r = [0, 1, 2].map(L => { let ok = 0; for (let i = 0; i < R; i++) if (forms(shuf([...base, ...shuf(d).slice(L)])) >= want) ok++; return ok })
  console.log(`${n} new: ${String(x).padStart(2)} X(5/3/2) + ${String(n - x).padStart(2)} Y(6/3/1)  >=${want} forms: all ${r[0]}/${R}  lose1 ${r[1]}/${R}  lose2 ${r[2]}/${R}`)
}
// The chosen design (act-english-v9.PREREG.md): 10 X + 5 Y, forms reached when L passages are lost at the gate.
{
  const d = [...Array(10).fill([5, 3, 2]), ...Array(5).fill([6, 3, 1])]
  for (const L of [0, 1, 2, 3, 4, 5, 6]) {
    const h = {}; for (let i = 0; i < R; i++) { const f = forms(shuf([...base, ...shuf(d).slice(L)])); h[f] = (h[f] ?? 0) + 1 }
    console.log(`CHOSEN 10X+5Y, lose ${L}: forms histogram over ${R} orders ${JSON.stringify(h)}`)
  }
}
