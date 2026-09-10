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
const SOLVER_DIR = process.env.SOLVER_DIR ?? 'scripts/study-bank'
const solvers = ['a', 'b', 'c'].map(s => JSON.parse(readFileSync(`${SOLVER_DIR}/${TAG}.solver-${s}.json`, 'utf8')))

/* A solver file that does not carry the fields the gates read makes those
 * gates inert, and an inert gate reads exactly like a passing one.
 *
 * Found on 2026-09-11: the solvers for sat-sec-hard-v8 were briefed to report
 * `resolves_after_blank` and never wrote `passage_needed`. The gate below is
 * `maj(votes.map(v => String(v.passage_needed !== false)))`, and
 * `undefined !== false` is true — so every item passed a check that had no
 * input, on all three solvers, silently. That is the CLAUDE.md corollary: a
 * check that cannot read its input must not return a verdict.
 *
 * So the required fields are asserted up front, per item per solver, and a
 * missing one exits 2 rather than defaulting. `passage_needed` is exempt for
 * Standard English Conventions — a SEC item's source IS its sentence, so
 * there is nothing to withhold — and required everywhere else. */
const REQUIRED = ['pick', 'second_defensible', 'difficulty', 'distractor_quality']
{
  const missing = []
  for (const it of items) {
    const sec = it.domain === 'Standard English Conventions'
    for (const [i, sv] of solvers.entries()) {
      const v = sv[it.id]
      if (!v) { missing.push(`${it.id}: solver ${'abc'[i]} has no entry`); continue }
      for (const f of REQUIRED) if (!(f in v)) missing.push(`${it.id}: solver ${'abc'[i]} missing '${f}'`)
      if (!sec && !('passage_needed' in v)) missing.push(`${it.id}: solver ${'abc'[i]} missing 'passage_needed' (required outside SEC)`)
      if (sec && !('resolves_after_blank' in v)) missing.push(`${it.id}: solver ${'abc'[i]} missing 'resolves_after_blank' (required for SEC)`)
    }
  }
  if (missing.length) {
    console.error(`REFUSING TO SCORE: ${missing.length} missing field(s). A gate with no input is not a pass.`)
    for (const m of missing.slice(0, 20)) console.error('  ' + m)
    if (missing.length > 20) console.error(`  ... and ${missing.length - 20} more`)
    process.exit(2)
  }
}
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
  // Solvers report passage_needed per item; a hardcoded `true` here was a
  // check that could not fail. Majority vote, and a majority of "no" drops
  // the item: an R&W item answerable without its passage is not an R&W item.
  const passage_needed = maj(votes.map(v => String(v.passage_needed !== false))) === 'true'
  const why = []
  if (key_votes < 2) why.push(`key_votes ${key_votes} (picks ${votes.map(v => v.pick).join('')}, key ${keyLetter})`)
  if (flagged.length) why.push(`second defensible: ${flagged.join(' | ')}`)
  if (difficulty === 'easy') why.push('majority easy')
  if (distractor_quality === 'weak') why.push('majority weak distractors')
  if (!passage_needed) why.push('majority say answerable without the passage')
  // The SEC brief forbids a resolving word within ~4 words after the blank.
  // A majority saying it is there is a defect, not a note.
  const resolves = maj(votes.map(v => String(v.resolves_after_blank === true))) === 'true'
  if (resolves) why.push('majority say a word just after the blank resolves it')
  if (DROP.has(it.id)) why.push('near-duplicate stem of a sibling item')
  const ok = why.length === 0
  if (ok) pass++
  qc[it.id] = { key_votes: ok ? key_votes : 0, difficulty, distractor_quality, passage_needed, resolves_after_blank: resolves }
  reasons[it.id] = { ok, key_votes, picks: votes.map(v => v.pick).join(''), difficulty, distractor_quality, passage_needed, resolves_after_blank: resolves, why }
}
writeFileSync(`scripts/study-bank/${TAG}.qc.json`, JSON.stringify(qc, null, 1))
writeFileSync(`scripts/study-bank/${TAG}.qc-reasons.json`, JSON.stringify(reasons, null, 1))
console.log(`${pass}/${items.length} pass`)
for (const [id, r] of Object.entries(reasons)) if (!r.ok) console.log('  drop', id, '-', r.why.join('; '))
const d = {}; for (const [id, r] of Object.entries(reasons)) if (r.ok) d[r.difficulty] = (d[r.difficulty] ?? 0) + 1
console.log('passers by difficulty:', d)
