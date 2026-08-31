/**
 * check-key-rank-spread.mjs — the tell that a clean LETTER spread hides.
 *
 * Real SSAT and ISEE print numeric options in ASCENDING order. Our serve
 * path shuffles them, which costs that fidelity — and the obvious
 * improvement is to stop shuffling maths options.
 *
 * DO NOT DO THAT WITHOUT RUNNING THIS FIRST. With options printed
 * ascending, the option LETTER is the magnitude RANK, so the key-letter
 * spread and the key-rank spread stop being two checks and become one.
 * Any rank skew in the bank converts directly into a letter tell.
 *
 * Measured on isee-math-s4: the key sat at rank 1 (second-smallest) in
 * 40.5% of items against 25% expected. That cohort passed its blind
 * attack ONLY because the serve-time shuffle destroyed the order. The
 * next cohort (s5) was authored to flatten it and measures 9/11/13/9.
 *
 * IT IS A CONJUNCTION, AND BOTH HALVES MATTER. A rank skew only becomes
 * a letter tell where the options are actually PRINTED in order.
 * Measured 2026-08-31 across the live maths bank:
 *
 *     SSAT/ISEE cohorts   65-100% ascending (today's authored: 100%)
 *     sat/v2  (n=710)      8% ascending
 *
 * Every cohort is middle-heavy — sat/v2 puts 72% of keys in the middle
 * two ranks against 50% expected — but SAT is structurally immune
 * because its options are not sorted. The exposure is concentrated in
 * exactly the SSAT/ISEE cohorts, whose authors sort ascending because
 * the real tests do.
 *
 * So the shuffle is load-bearing SPECIFICALLY for SSAT/ISEE maths, and
 * the condition for retiring it is arithmetic: those cohorts must be
 * flat, not just the newest one. This script measures both halves.
 *
 *   node check-key-rank-spread.mjs --bank
 *   node check-key-rank-spread.mjs <items.json> ...
 *   node check-key-rank-spread.mjs --selftest
 *
 * Reports per family/section/cohort. Exits 1 if any group with n >= 20
 * deviates from uniform by more than BAR points on a single rank.
 */
import { readFileSync } from 'node:fs'

const BAR = 12   // percentage points above the uniform share

/** A comparable numeric VALUE, or null when the option is not one.
 *  Fractions count; algebraic expressions and prose do not. Getting this
 *  wrong over-condemns: on this project a leading-integer regex has
 *  turned "n(n + 1)" into 1, "36 pi" into 36 and "3/28" into 3, each
 *  time inventing a defect in a sound item. */
export function value(raw) {
  const s = String(raw ?? '').trim().toLowerCase().replace(/,/g, '')
  let m = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/)
  if (m) return +m[2] === 0 ? null : +m[1] / +m[2]
  const SAFE = /^(?:cm|mm|m|km|in|ft|yd|mi|g|kg|lb|oz|ml|l|s|sec|secs?|min|mins?|hrs?|hours?|days?|weeks?|months?|years?|degrees?|units?|items?|points?|dollars?|cents?)$/
  m = s.match(/^(-?\d+(?:\.\d+)?)\s*([a-z]*)$/)
  if (m && (m[2] === '' || SAFE.test(m[2]))) return +m[1]
  return null
}

export function rankOf(choices, key) {
  const vals = choices.map(value)
  if (vals.some(v => v === null)) return null
  const k = value(key)
  if (k === null) return null
  const sorted = [...vals].sort((a, b) => a - b)
  const idx = sorted.findIndex(v => Math.abs(v - k) < 1e-9)
  return idx < 0 ? null : idx
}

export function run(items) {
  const groups = {}
  for (const it of items) {
    const choices = it.choices ?? it.item?.choices
    const key = it.correct_answer ?? it.item?.correct_answer
    if (!Array.isArray(choices) || !key) continue
    const r = rankOf(choices, key)
    if (r === null) continue
    const g = it.group ?? 'batch'
    groups[g] = groups[g] ?? { n: 0, ranks: {}, width: choices.length, asc: 0 }
    groups[g].n++
    groups[g].ranks[r] = (groups[g].ranks[r] ?? 0) + 1
    const vs = choices.map(value)
    if (vs.every((v, i) => i === 0 || v >= vs[i - 1])) groups[g].asc++
  }
  const rows = []
  for (const [name, g] of Object.entries(groups)) {
    const uniform = 100 / g.width
    let worst = 0, worstRank = null
    for (let r = 0; r < g.width; r++) {
      const pct = 100 * (g.ranks[r] ?? 0) / g.n
      if (Math.abs(pct - uniform) > Math.abs(worst)) { worst = pct - uniform; worstRank = r }
    }
    rows.push({ name, n: g.n, width: g.width, ranks: g.ranks, worst, worstRank, uniform, ascPct: 100 * g.asc / g.n })
  }
  return rows.sort((a, b) => Math.abs(b.worst) - Math.abs(a.worst))
}

function selftest() {
  const mk = (n, rankFn, width = 4) => Array.from({ length: n }, (_, i) => {
    const vals = Array.from({ length: width }, (_, j) => (j + 1) * 10)
    return { group: 'g', choices: vals.map(String), correct_answer: String(vals[rankFn(i)]) }
  })
  // a bank piled on rank 1 must be caught
  const skew = run(mk(40, () => 1))
  if (Math.abs(skew[0].worst) < BAR) { console.error('SELFTEST FAIL: an all-rank-1 bank was not flagged', skew[0]); process.exit(1) }
  // a flat bank must not be
  const flat = run(mk(40, i => i % 4))
  if (Math.abs(flat[0].worst) > BAR) { console.error('SELFTEST FAIL: a flat bank was flagged', flat[0]); process.exit(1) }
  // fractions must be ranked by VALUE, not by numerator
  const fr = run([{ group: 'g', choices: ['1/4', '5/12', '2/3', '3/4'], correct_answer: '3/4' }])
  if (fr[0].ranks[3] !== 1) { console.error('SELFTEST FAIL: 3/4 is the largest of those four', fr[0].ranks); process.exit(1) }
  // non-numeric option sets must be SKIPPED, never guessed at
  const prose = run([{ group: 'g', choices: ['n squared', 'n(n + 1)', '3n', 'n + 2'], correct_answer: '3n' }])
  if (prose.length) { console.error('SELFTEST FAIL: algebraic options were ranked', prose); process.exit(1) }
  console.log('selftest OK — catches a rank pile-up, passes a flat bank, ranks fractions by value, skips algebraic options')
}

/*
 * Only run the CLI when invoked directly. Without this guard, importing
 * `rankOf` or `value` from another script executes the whole main body —
 * which it did once, printing "0 items" and calling process.exit(0)
 * before the importing script produced any output. A module with side
 * effects on import is a trap for the next caller.
 */
const RUN_DIRECTLY = import.meta.url === `file://${process.argv[1]}`
const args = process.argv.slice(2)
if (!RUN_DIRECTLY) { /* imported for its helpers; do nothing */ }
else if (args[0] === '--selftest') { selftest(); process.exit(0) }
else {

let items
if (args[0] === '--bank') {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  items = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank')
      .select('family, section, cohort, item').eq('archived', false).eq('verified', true)
      .in('section', ['math']).range(from, from + 999)
    if (error) throw new Error(error.message)
    items.push(...(data ?? []).map(r => ({ group: `${r.family}/${r.cohort}`, ...r.item })))
    if (!data || data.length < 1000) break
  }
} else {
  items = args.flatMap(f => JSON.parse(readFileSync(f, 'utf8')).map(x => ({ group: f.split('/').pop(), ...x })))
}

const rows = run(items)
console.log(`${rows.reduce((a, r) => a + r.n, 0)} items with all-numeric option sets\n`)
let failed = false
for (const r of rows) {
  const dist = Array.from({ length: r.width }, (_, i) => `${(100 * (r.ranks[i] ?? 0) / r.n).toFixed(0)}%`).join(' ')
  /* Only a skewed AND sorted cohort is exposed. A skewed cohort whose
     options are unsorted cannot turn rank into letter. */
  const skewed = r.n >= 20 && Math.abs(r.worst) > BAR
  const sorted = r.ascPct >= 60
  const flag = skewed && sorted
  if (flag) failed = true
  const tag = flag ? '   EXPOSED' : skewed ? '   skewed but unsorted' : ''
  console.log(`  ${r.name.padEnd(28)} n=${String(r.n).padStart(3)}  ranks ${dist}  worst ${r.worst >= 0 ? '+' : ''}${r.worst.toFixed(1)}  asc ${r.ascPct.toFixed(0)}%${tag}`)
}
console.log(failed
  ? `\nFAIL — a cohort is both rank-skewed and printed in order, so its option LETTER is its magnitude RANK. The serve-time shuffle is the only thing hiding it; do NOT preserve ascending order for these until they are flat.`
  : `\nNo cohort is both skewed and sorted.`)
process.exit(failed ? 1 : 0)
}
