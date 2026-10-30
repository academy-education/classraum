// v12 mix search: the v9 replay of form-capacity's greedy draw (act-english-v9-mixsearch.mjs),
// base updated to live 38 (15x4/4/2, 11x7/2/1, 6x5/3/2, 6x6/3/1) + staged v11 kept (4X 3Y) + v10 kept (2X 2Y).
const R = 400, lo = [26, 15, 7], hi = [28, 16, 9]
const X = [5, 3, 2], Y = [6, 3, 1]
const base = [...Array(15).fill([4, 4, 2]), ...Array(11).fill([7, 2, 1]), ...Array(6 + 4 + 2).fill(X), ...Array(6 + 3 + 2).fill(Y)]
function forms(pool) { pool = pool.slice(); let c = 0
  for (;;) { const pick = [], t = [0, 0, 0]
    const dfs = s => { if (pick.length === 5) return t.every((v, i) => v >= lo[i] && v <= hi[i])
      for (let i = s; i <= pool.length - (5 - pick.length); i++) { const p = pool[i]; if (p.some((v, k) => t[k] + v > hi[k])) continue
        p.forEach((v, k) => { t[k] += v }); pick.push(i); if (dfs(i + 1)) return true; pick.pop(); p.forEach((v, k) => { t[k] -= v }) } return false }
    if (!dfs(0)) break; c++; const u = new Set(pick); pool = pool.filter((_, i) => !u.has(i)) } return c }
const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
for (let x = 0; x <= 10; x++) { const d = [...Array(x).fill(X), ...Array(10 - x).fill(Y)]
  const r = [0, 1, 2, 3].map(L => { let ok = 0; for (let i = 0; i < R; i++) if (forms(shuf([...base, ...shuf(d).slice(L)])) >= 10) ok++; return ok })
  console.log(`${x}X+${10 - x}Y  >=10 forms: all ${r[0]}/${R} lose1 ${r[1]}/${R} lose2 ${r[2]}/${R} lose3 ${r[3]}/${R}`) }
