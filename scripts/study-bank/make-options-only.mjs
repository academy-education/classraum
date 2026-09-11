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

/*
 * WIDTH IS DERIVED FROM THE DATA — fixed 2026-09-11.
 *
 * This file hardcoded `const L = 'ABCD'` and looped `j < 4`. Handed a
 * FIVE-choice batch (SSAT is 5; ISEE, SAT and ACT are 4) it silently
 * dropped one distractor from every item and emitted a four-option render,
 * so the run measured a question nobody is ever asked, and the scorer's
 * 25.0% control described the render rather than the item, whose chance
 * line is 20.0%. Measured on ssat-verbal-s10 before the fix: 30 of 30
 * items rendered at width 4 from width-5 sources, one distractor lost each.
 *
 * The key was never lost, because the key is placed first — which is
 * exactly why this survived: every render looked well-formed, and nothing
 * downstream knew the source was wider. CLAUDE.md records the same shape
 * in math-bank-helper (a hardcoded 25% control on five-choice data) and
 * the same lesson: derive the control from the data, never a literal.
 *
 * A batch of mixed widths is REFUSED rather than rendered to the modal
 * width — a mixed file is an authoring error, and quietly normalising it
 * is how the defect above stayed invisible.
 */
const widths = [...new Set(order.map(it => it.choices.length))]
if (widths.length !== 1) {
  console.error(`REFUSING: mixed option counts in this batch (${widths.sort().join(', ')}). ` +
    `A render has one width; normalising to the modal one would measure a question no student is asked.`)
  process.exit(2)
}
const W = widths[0]
if (W < 2 || W > 6) { console.error(`REFUSING: option count ${W} is not a multiple-choice width.`); process.exit(2) }
const L = 'ABCDEF'.slice(0, W)
const deck = shuffle(Array.from({ length: order.length }, (_, i) => L[i % W]), rnd(tag + ':deck'))
const blind = [], key = {}
order.forEach((it, i) => {
  const id = String(i + 1)
  const r = rnd(tag + ':' + it.id)
  const rest = shuffle(it.choices.filter(c => c !== it.correct_answer), r)
  const slot = L.indexOf(deck[i])
  const choices = []; let k = 0
  for (let j = 0; j < W; j++) choices.push(j === slot ? it.correct_answer : rest[k++])
  // The placeholder said "these four values" on EVERY render, including the
  // five-choice SSAT ones, where it is simply false. Harmless so far - every
  // solver counted the options themselves and used the right control - but a
  // hardcoded width in a render is the exact family of defect this file's
  // header exists to record, and telling a solver the wrong option count is
  // not a thing to leave in because it happened not to bite.
  blind.push({ id, question: `Which of these ${choices.length} values is the answer? (the question itself is withheld)`, options: Object.fromEntries(choices.map((c, x) => [L[x], c])) })
  key[id] = { letter: L[slot], localId: it.id, group: null }
})
writeFileSync(`scripts/study-bank/${tag}.blind.json`, JSON.stringify(blind, null, 2))
writeFileSync(`scripts/study-bank/${tag}.key.json`, JSON.stringify(key, null, 2))
const spread = {}; for (const v of Object.values(key)) spread[v.letter] = (spread[v.letter] ?? 0) + 1
// Print the width and the control it implies, so the next reader scores
// against the right chance line instead of assuming 25%.
console.log(`${tag}: ${blind.length} items, ${W} choices each -> chance ${(100 / W).toFixed(1)}%, key slots`, spread)
const lost = order.filter(it => !blind.find(b => b.id)).length
for (const it of order) {
  if (it.choices.length !== W) { console.error(`BUG: ${it.id} has ${it.choices.length} choices, render is ${W}`); process.exit(2) }
}
