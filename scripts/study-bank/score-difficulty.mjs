#!/usr/bin/env node
/**
 * score-difficulty.mjs <tag> <batch.json>
 *
 * Reconcile a blind difficulty panel against the AUTHOR's own labels.
 *
 * WHY THIS IS A SEPARATE INSTRUMENT. `difficulty-policy.mjs` judges "the
 * GRADER's label, never the author's -- the author's claim is the thing being
 * tested", and `act-math-v13-ies` was inserted with no panel at all: its qc
 * file carried the author's own labels. That was recorded at the time as
 * provisional rather than glossed, and this closes it. On the two batches
 * before it, independent graders moved 5-8 of 28 items.
 *
 * Refuses a partial panel. Prints the denominator before any rate, and reports
 * the MAJORITY only where one exists -- three graders can split 1/1/1, and a
 * three-way split is an absence of consensus, not a medium.
 */
import { readFileSync, existsSync } from 'node:fs'

const D = 'scripts/study-bank'
const [tag, batchPath] = process.argv.slice(2)
if (!tag || !batchPath) { console.error('usage: score-difficulty.mjs <tag> <batch.json>'); process.exit(2) }
const NAMES = ['a', 'b', 'c']
const missing = NAMES.filter(n => !existsSync(`${D}/${tag}.grader-${n}.json`))
if (missing.length) { console.error(`REFUSING: grader file(s) missing: ${missing.join(', ')}. A partial panel is not a panel.`); process.exit(2) }
const graders = Object.fromEntries(NAMES.map(n => [n, JSON.parse(readFileSync(`${D}/${tag}.grader-${n}.json`, 'utf8'))]))
const batch = JSON.parse(readFileSync(batchPath, 'utf8'))
if (!batch.length) { console.error(`REFUSING: ${batchPath} holds no items`); process.exit(2) }

const ORDER = ['easy', 'medium', 'hard']
const rank = d => ORDER.indexOf(d)
const rows = []
for (const it of batch) {
  const votes = NAMES.map(n => graders[n][it.id]?.difficulty)
  if (votes.some(v => !ORDER.includes(v))) { console.error(`REFUSING: grader gap or bad label on ${it.id}: ${JSON.stringify(votes)}`); process.exit(2) }
  const tally = {}
  for (const v of votes) tally[v] = (tally[v] ?? 0) + 1
  const top = Math.max(...Object.values(tally))
  const winners = Object.keys(tally).filter(k => tally[k] === top)
  rows.push({ id: it.id, author: it.difficulty, votes, majority: top >= 2 ? winners[0] : null, tally })
}
console.log(`items ${rows.length}   graders ${NAMES.length}   votes ${rows.length * NAMES.length}\n`)

const hist = set => { const h = { easy: 0, medium: 0, hard: 0 }; for (const x of set) if (x) h[x]++; return h }
console.log('  author   ', JSON.stringify(hist(rows.map(r => r.author))))
for (const n of NAMES) console.log(`  grader ${n} `, JSON.stringify(hist(rows.map(r => graders[n][r.id].difficulty))))
console.log('  MAJORITY ', JSON.stringify(hist(rows.map(r => r.majority))), ` (no majority on ${rows.filter(r => !r.majority).length})`)

const agree = rows.filter(r => r.majority === r.author).length
const withMaj = rows.filter(r => r.majority).length
console.log(`\n  author matches the majority on ${agree} of ${withMaj} items with a majority = ${withMaj ? (100 * agree / withMaj).toFixed(1) : '--'}%`)

const moved = rows.filter(r => r.majority && r.majority !== r.author)
console.log(`\n  ITEMS THE PANEL MOVES: ${moved.length}`)
for (const r of moved) {
  const dir = rank(r.majority) > rank(r.author) ? 'HARDER' : 'EASIER'
  console.log(`    ${r.id.padEnd(11)} author ${r.author.padEnd(7)} -> panel ${r.majority.padEnd(7)} (${dir})  votes ${r.votes.join('/')}`)
}
const split = rows.filter(r => !r.majority)
if (split.length) {
  console.log(`\n  NO CONSENSUS (three-way split — this is an absence of a grade, not a medium):`)
  for (const r of split) console.log(`    ${r.id.padEnd(11)} author ${r.author.padEnd(7)}  votes ${r.votes.join('/')}`)
}
/* Direction matters more than the count: a panel that reads everything harder
 * and a panel that disagrees at random have the same disagreement rate. */
const harder = moved.filter(r => rank(r.majority) > rank(r.author)).length
console.log(`\n  direction: ${harder} harder, ${moved.length - harder} easier`)
console.log(moved.length === 0
  ? '  -> the author\'s labels hold.'
  : harder === moved.length ? '  -> the panel reads the batch UNIFORMLY HARDER than authored.'
  : harder === 0 ? '  -> the panel reads the batch UNIFORMLY EASIER than authored.'
  : '  -> disagreement is mixed in direction, which is noise rather than a calibration offset.')
