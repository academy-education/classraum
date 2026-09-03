#!/usr/bin/env node
// Aggregate three blind solver files for the SEC hard batches into the
// qc.json bank-helper.mjs expects. Rule: key_votes = solvers on the key;
// difficulty/distractor_quality = majority; any second_defensible flag or a
// listed drop id => excluded (recorded in the qc as key_votes 0 so the
// helper rejects it, plus a reasons file for the register).
import { readFileSync, writeFileSync } from 'node:fs'
// BATCHES = comma-separated batch files; TAG = prefix of the solver files
// (<TAG>.solver-a/b/c.json) and of the qc outputs. Defaults reproduce v1.
const TAG = process.env.TAG ?? 'sat-sec-hard-v1'
const files = (process.env.BATCHES ?? 'scripts/study-bank/sat-sec-hard-v1a.batch.json,scripts/study-bank/sat-sec-hard-v1b.batch.json').split(',')
const items = files.flatMap(f => JSON.parse(readFileSync(f, 'utf8')))
const solvers = ['a', 'b', 'c'].map(s => JSON.parse(readFileSync(`scripts/study-bank/${TAG}.solver-${s}.json`, 'utf8')))
const DROP = new Set((process.env.DROP ?? '').split(',').filter(Boolean))   // near-duplicate stems etc.
const maj = arr => { const c = {}; for (const v of arr) c[v] = (c[v] ?? 0) + 1; return Object.entries(c).sort((x, y) => y[1] - x[1])[0][0] }
const qc = {}, reasons = {}
let pass = 0
for (const it of items) {
  const keyLetter = 'ABCD'[it.choices.indexOf(it.correct_answer)]
  const votes = solvers.map(s => s[it.id]).filter(Boolean)
  const key_votes = votes.filter(v => v.pick === keyLetter).length
  const flagged = votes.filter(v => v.second_defensible).map((v, i) => v.note)
  const difficulty = maj(votes.map(v => v.difficulty))
  const distractor_quality = maj(votes.map(v => v.distractor_quality))
  const why = []
  if (key_votes < 2) why.push(`key_votes ${key_votes} (picks ${votes.map(v => v.pick).join('')}, key ${keyLetter})`)
  if (flagged.length) why.push(`second defensible: ${flagged.join(' | ')}`)
  if (difficulty === 'easy') why.push('majority easy')
  if (distractor_quality === 'weak') why.push('majority weak distractors')
  if (DROP.has(it.id)) why.push('near-duplicate stem of a sibling item')
  const ok = why.length === 0
  if (ok) pass++
  qc[it.id] = { key_votes: ok ? key_votes : 0, difficulty, distractor_quality, passage_needed: true }
  reasons[it.id] = { ok, key_votes, picks: votes.map(v => v.pick).join(''), difficulty, distractor_quality, why }
}
writeFileSync(`scripts/study-bank/${TAG}.qc.json`, JSON.stringify(qc, null, 1))
writeFileSync(`scripts/study-bank/${TAG}.qc-reasons.json`, JSON.stringify(reasons, null, 1))
console.log(`${pass}/${items.length} pass`)
for (const [id, r] of Object.entries(reasons)) if (!r.ok) console.log('  drop', id, '-', r.why.join('; '))
const d = {}; for (const [id, r] of Object.entries(reasons)) if (r.ok) d[r.difficulty] = (d[r.difficulty] ?? 0) + 1
console.log('passers by difficulty:', d)
