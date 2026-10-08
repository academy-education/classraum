#!/usr/bin/env node
/**
 * isee-verbal-s20-selfcheck.mjs <author.batch.json>
 *
 * The author's own stem-covered self-check from isee-verbal-s20.prereg.md
 * (rules 2 and 4). Per item the author records, with only the four options
 * visible:
 *   polarity      { word: '+' | '-' | '0' } for all four options
 *   antonym_pairs []   option pairs that are antonyms / near-opposites (must be empty)
 *   selfcheck     { antonym_pole, odd_one_out, most_specific } — a FORCED pick (a word
 *                 among the choices) for each heuristic
 * and this script checks:
 *   - rule 1 (as declared): antonym_pairs empty
 *   - rule 2: no three options share a polarity the key lacks
 *   - rule 4: per heuristic, items where the forced pick is the key / items <= 35%
 * plus, reported only, the file's key strictly-longest / strictly-shortest share
 * and authored difficulty mix.
 *
 * Exits 1 on any breach, 2 if it cannot read its input (missing fields are a
 * refusal, not a pass: a check that cannot read its input must not return a number).
 */
import { readFileSync, existsSync } from 'node:fs'
const path = process.argv[2]
if (!path || !existsSync(path)) { console.error(`REFUSING: ${path} does not exist`); process.exit(2) }
const b = JSON.parse(readFileSync(path, 'utf8'))
if (!Array.isArray(b) || !b.length) { console.error(`REFUSING: ${path} holds no items`); process.exit(2) }
const H = ['antonym_pole', 'odd_one_out', 'most_specific']
const hits = Object.fromEntries(H.map(h => [h, 0]))
const problems = []
let longest = 0, shortest = 0
for (const it of b) {
  const ch = it.choices ?? [], key = it.correct_answer
  const pol = it.polarity, sc = it.selfcheck
  if (!pol || ch.some(c => !['+', '-', '0'].includes(pol[c]))) { console.error(`REFUSING: ${it.id} polarity missing or not +/-/0 for every choice`); process.exit(2) }
  if (!sc || H.some(h => !ch.includes(sc[h]))) { console.error(`REFUSING: ${it.id} selfcheck must name a choice for ${H.join(', ')}`); process.exit(2) }
  if (!Array.isArray(it.antonym_pairs)) { console.error(`REFUSING: ${it.id} antonym_pairs missing (record [] when none)`); process.exit(2) }
  if (it.antonym_pairs.length) problems.push(`${it.id}: RULE 1 antonym pair(s) declared ${JSON.stringify(it.antonym_pairs)}`)
  const count = {}; for (const c of ch) count[pol[c]] = (count[pol[c]] ?? 0) + 1
  for (const [v, n] of Object.entries(count)) if (v !== pol[key] && n >= 3) problems.push(`${it.id}: RULE 2 ${n} options share polarity '${v}' the key '${key}' (${pol[key]}) lacks`)
  for (const h of H) if (sc[h] === key) hits[h]++
  const L = ch.map(c => c.length), k = key.length
  if (L.filter(x => x >= k).length === 1) longest++
  if (L.filter(x => x <= k).length === 1) shortest++
}
const n = b.length, pct = x => (100 * x / n).toFixed(1)
console.log(`${path}: ${n} items`)
for (const h of H) {
  const ok = hits[h] / n <= 0.35
  if (!ok) problems.push(`RULE 4 ${h} hits the key on ${hits[h]}/${n} = ${pct(hits[h])}% (bar <= 35%)`)
  console.log(`  ${h.padEnd(14)} forced pick = key ${hits[h]}/${n} = ${pct(hits[h])}%  ${ok ? 'ok' : 'OVER'}`)
}
const diff = {}; for (const it of b) diff[it.difficulty] = (diff[it.difficulty] ?? 0) + 1
console.log(`  key strictly longest ${longest}/${n} = ${pct(longest)}%, strictly shortest ${shortest}/${n} = ${pct(shortest)}% (batch band 15-35%, reported here)`)
console.log(`  authored difficulty ${JSON.stringify(diff)}`)
if (problems.length) { for (const p of problems) console.log(`  ${p}`); console.log(`  ${problems.length} problem(s)`); process.exit(1) }
console.log('  0 problems')
