#!/usr/bin/env node
/**
 * make-options-only.mjs <tag> <batch.json...>
 *
 * The math no-source attack. A maths STEM is the whole problem, so the
 * ordinary "hide the passage" attack withholds nothing. What can still leak
 * is the OPTION SET: a lone round number, a lone perfect square, the only
 * value with a decimal, the median of an arithmetic run. This render shows
 * the four bare values and nothing else, keys dealt flat so a constant-letter
 * solver scores exactly chance.
 *
 * Writes <tag>.blind.json and <tag>.key.json in the shape score-attack.mjs reads.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const [tag, ...files] = process.argv.slice(2)
if (!tag || !files.length) { console.error('usage: make-options-only.mjs <tag> <batch.json...>'); process.exit(1) }
const rnd = s => { let h = parseInt(createHash('md5').update(s).digest('hex').slice(0, 8), 16); return () => (h = (h * 1664525 + 1013904223) >>> 0) / 2 ** 32 }
const shuffle = (a, r) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const items = files.flatMap(f => JSON.parse(readFileSync(f, 'utf8')))
const order = shuffle(items, rnd(tag + ':order'))
const L = 'ABCD'
const deck = shuffle(Array.from({ length: order.length }, (_, i) => L[i % 4]), rnd(tag + ':deck'))
const blind = [], key = {}
order.forEach((it, i) => {
  const id = String(i + 1)
  const r = rnd(tag + ':' + it.id)
  const rest = shuffle(it.choices.filter(c => c !== it.correct_answer), r)
  const slot = L.indexOf(deck[i])
  const choices = []; let k = 0
  for (let j = 0; j < 4; j++) choices.push(j === slot ? it.correct_answer : rest[k++])
  blind.push({ id, question: 'Which of these four values is the answer? (the question itself is withheld)', options: Object.fromEntries(choices.map((c, x) => [L[x], c])) })
  key[id] = { letter: L[slot], localId: it.id, group: null }
})
writeFileSync(`scripts/study-bank/${tag}.blind.json`, JSON.stringify(blind, null, 2))
writeFileSync(`scripts/study-bank/${tag}.key.json`, JSON.stringify(key, null, 2))
const spread = {}; for (const v of Object.values(key)) spread[v.letter] = (spread[v.letter] ?? 0) + 1
console.log(`${tag}: ${blind.length} items, key slots`, spread)
