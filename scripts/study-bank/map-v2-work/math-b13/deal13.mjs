#!/usr/bin/env node
/**
 * deal13.mjs <author> <n-mechanisms> [--topup] — MAP Math b13 key-rank deal (MAP-MATH-V2-B13.prereg.md §A4).
 * A deck of ranks 1,2,3,4 repeated (ceil(2n/4) times), shuffled with the author's seed, dealt two per mechanism in
 * order; if a mechanism's two ranks are equal, the second is swapped with the next later slot holding a different rank.
 * Writes scratchpad/map-v2-math-b13-work/<author>/deal.json ONCE (refuses to overwrite) and prints it.
 * --selftest: deal is balanced (every rank within 1 of n/2... of 2n/4), no mechanism gets equal ranks, deterministic.
 */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { rng, shuffleWith } from '../../seeded-shuffle.mjs'
const SEEDS = { 'N-a': 20262301, 'N-b': 20262302, 'O-a': 20262303, 'O-b': 20262304, 'G-a': 20262305, 'G-b': 20262306, 'D-a': 20262307, 'D-b': 20262308 }
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
export function deal(seed, n) {
  const slots = 2 * n, deck = []
  while (deck.length < slots) deck.push(1, 2, 3, 4)
  const d = shuffleWith(deck, rng(seed)).slice(0, slots)
  for (let i = 0; i < slots; i += 2) if (d[i] === d[i + 1]) { let j = i + 2; while (j < slots && d[j] === d[i]) j++; if (j < slots) [d[i + 1], d[j]] = [d[j], d[i + 1]]; else { let k = i - 1; while (k >= 0 && (d[k] === d[i] || d[k ^ 1] === d[i + 1] || d[k ^ 1] === d[i])) k--; if (k < 0) throw new Error('cannot separate'); [d[i + 1], d[k]] = [d[k], d[i + 1]] } }
  return Array.from({ length: n }, (_, m) => [d[2 * m], d[2 * m + 1]])
}
if (process.argv[2] === '--selftest') {
  let bad = 0
  for (const [a, s] of Object.entries(SEEDS)) for (const n of [6, 12, 13, 20]) {
    const x = deal(s, n), flat = x.flat(), c = [1, 2, 3, 4].map(r => flat.filter(v => v === r).length)
    if (x.some(([p, q]) => p === q)) { bad++; console.error(`${a} n=${n}: a mechanism got equal ranks`) }
    if (Math.max(...c) - Math.min(...c) > 2) { bad++; console.error(`${a} n=${n}: unbalanced ${c}`) }
    if (JSON.stringify(deal(s, n)) !== JSON.stringify(x)) { bad++; console.error(`${a}: not deterministic`) }
  }
  // break-test: a deal without the swap step must produce an equal pair for some seed/n
  const raw = (seed, n) => { const deck = []; while (deck.length < 2 * n) deck.push(1, 2, 3, 4); const d = shuffleWith(deck, rng(seed)).slice(0, 2 * n); return Array.from({ length: n }, (_, m) => [d[2 * m], d[2 * m + 1]]) }
  const caught = Object.values(SEEDS).some(s => [12, 13, 20].some(n => raw(s, n).some(([p, q]) => p === q)))
  if (!caught) { bad++; console.error('break-test: the unswapped deal never produced an equal pair; the equal-pair check is vacuous') }
  if (bad) die(`selftest ${bad} failure(s)`); console.log('deal13 selftest ok (8 seeds x 4 sizes; equal-pair check is live)'); process.exit(0)
}
const [author, nS] = process.argv.slice(2), top = process.argv.includes('--topup')
if (!SEEDS[author] || !(+nS >= 1)) die('usage: deal13.mjs <N-a|N-b|O-a|O-b|G-a|G-b|D-a|D-b> <n-mechanisms> [--topup]')
const seed = SEEDS[author] + (top ? 100 : 0), dir = `/Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-b13-work/${author}`
const out = `${dir}/deal${top ? '-topup' : ''}.json`
if (existsSync(out)) die(`${out} exists; the deal is made once`)
mkdirSync(dir, { recursive: true })
const d = deal(seed, +nS)
writeFileSync(out, JSON.stringify({ author, seed, n: +nS, deal: d.map(([a, b], i) => ({ mech_index: i + 1, a: a, b: b })) }, null, 1) + '\n')
console.log(`${author} seed ${seed}: ${d.map(([a, b], i) => `m${i + 1}:${a}/${b}`).join(' ')} -> ${out}`)
