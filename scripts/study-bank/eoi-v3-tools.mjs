#!/usr/bin/env node
/**
 * eoi-v3 stage tooling — pure file transforms, no DB.
 *
 *   node eoi-v3-tools.mjs preflight <items.json> <assignments.json>
 *   node eoi-v3-tools.mjs blind     <items.json> <run-id>     → writes <run-id>.blind.json + <run-id>.key.json
 *   node eoi-v3-tools.mjs score     <run-id> <solver.json...>
 *
 * The blind file carries stem+options ONLY (passage withheld — that is
 * the whole point), options re-lettered per item by an RNG seeded on the
 * run id, exactly the attack-cohort.mjs convention. The scorer computes
 * the control as the best FIXED letter over the actual key distribution,
 * refuses incomplete solver files, and flags identical pick-strings
 * (same-model solvers are one instrument sampled three times).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const DIR = 'scripts/study-bank'
const LETTERS = ['A', 'B', 'C', 'D']

function rng(seed) {
  let h = [...createHash('sha256').update(seed).digest()].slice(0, 4)
    .reduce((a, b) => (a << 8) | b, 0) >>> 0
  return () => {
    h ^= h << 13; h >>>= 0; h ^= h >> 17; h ^= h << 5; h >>>= 0
    return h / 0xffffffff
  }
}

const ABSOLUTES = /\b(all|every|always|never|only|must|cannot|none)\b/i
const HEDGES = /\b(some|may|might|often|can|suggest|appears?|roughly|about)\b/i

function preflight(items, assignments) {
  const problems = []
  for (const a of assignments) {
    const it = items.find(i => i.id === a.id)
    if (!it) { problems.push(`${a.id}: MISSING`); continue }
    if (it.subskill !== a.subskill) problems.push(`${a.id}: subskill ${it.subskill} != ${a.subskill}`)
    if (it.difficulty !== a.difficulty) problems.push(`${a.id}: difficulty ${it.difficulty} != ${a.difficulty}`)
    if (!Array.isArray(it.choices) || it.choices.length !== 4) { problems.push(`${a.id}: needs 4 choices`); continue }
    if (new Set(it.choices.map(c => c.trim())).size !== 4) problems.push(`${a.id}: duplicate choices`)
    if (!it.choices.includes(it.correct_answer)) problems.push(`${a.id}: correct_answer not among choices`)
    // key length rank: 1 = longest … 4 = shortest, by characters
    const sorted = [...it.choices].sort((x, y) => y.length - x.length)
    const rank = sorted.indexOf(it.correct_answer) + 1
    if (rank !== a.rank) problems.push(`${a.id}: key length rank ${rank} != assigned ${a.rank}`)
    // explanation must not name positions
    if (/\b(choice|option)\s+[A-E1-4]\b|\b(first|second|third|fourth)\s+(choice|option)\b|\([A-D]\)/i.test(it.explanation))
      problems.push(`${a.id}: explanation names an option by position`)
    // transitions passages carry exactly one blank
    if (it.subskill === 'Transitions' && (it.passage.match(/_{3,}/g) || []).length !== 1)
      problems.push(`${a.id}: transitions passage must contain exactly one blank`)
    if (it.subskill === 'Rhetorical Synthesis' && !/following notes:/.test(it.passage))
      problems.push(`${a.id}: RS passage missing notes frame`)
  }
  // absolutes: distractors carrying absolutes, batch-wide
  let absDistractors = 0, hedgedKeyOnly = 0, total = 0
  for (const it of items) {
    total++
    const ds = it.choices.filter(c => c !== it.correct_answer)
    if (ds.some(d => ABSOLUTES.test(d))) absDistractors++
    if (HEDGES.test(it.correct_answer) && !ds.some(d => HEDGES.test(d))) hedgedKeyOnly++
  }
  return { problems, stats: { absDistractorItems: absDistractors, hedgedKeyOnlyItems: hedgedKeyOnly, total } }
}

function buildBlind(items, runId) {
  const blind = [], key = {}
  for (const it of items) {
    const r = rng(runId + '|' + it.id)
    const order = [...it.choices]
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]
    }
    blind.push({ id: it.id, stem: it.prompt, options: Object.fromEntries(order.map((o, i) => [LETTERS[i], o])) })
    key[it.id] = LETTERS[order.indexOf(it.correct_answer)]
  }
  return { blind, key }
}

function score(runId, solverPaths) {
  const key = JSON.parse(readFileSync(`${DIR}/${runId}.key.json`, 'utf8'))
  const ids = Object.keys(key)
  const solvers = solverPaths.map(p => ({ name: p, answers: JSON.parse(readFileSync(p, 'utf8')) }))
  for (const s of solvers) {
    const missing = ids.filter(id => !s.answers[id] || !s.answers[id].pick)
    if (missing.length) {
      console.error(`NO VERDICT — ${s.name} missing ${missing.length} answers (${missing.join(',')})`)
      process.exit(1)
    }
  }
  // identical pick-strings = one instrument
  const strings = solvers.map(s => ids.map(id => s.answers[id].pick).join(''))
  if (new Set(strings).size === 1) {
    console.error('NO VERDICT — all solvers returned identical pick-strings (one instrument, not three)')
    process.exit(1)
  }
  // control: best fixed letter over the actual key distribution
  const control = Math.max(...LETTERS.map(L => ids.filter(id => key[id] === L).length)) / ids.length * 100
  const per = {}
  let totalCorrect = 0, totalTrials = 0
  for (const s of solvers) {
    let c = 0
    for (const id of ids) {
      const ok = s.answers[id].pick === key[id]
      if (ok) c++
      const sk = id.startsWith('T') ? 'Transitions' : 'Rhetorical Synthesis'
      per[sk] = per[sk] || { correct: 0, trials: 0 }
      per[sk].trials++; if (ok) per[sk].correct++
    }
    totalCorrect += c; totalTrials += ids.length
    console.log(`${s.name}: ${c}/${ids.length} (${(c / ids.length * 100).toFixed(1)}%)  picks=${ids.map(id => s.answers[id].pick).join('')}`)
  }
  const mean = totalCorrect / totalTrials * 100
  console.log(`\nmean ${mean.toFixed(1)}%  control ${control.toFixed(1)}%  margin ${(mean - control) >= 0 ? '+' : ''}${(mean - control).toFixed(1)}`)
  for (const [sk, v] of Object.entries(per)) {
    const m = v.correct / v.trials * 100
    console.log(`  ${sk}: ${v.correct}/${v.trials} = ${m.toFixed(1)}%  margin ${(m - control) >= 0 ? '+' : ''}${(m - control).toFixed(1)} (${v.trials} trials)`)
  }
  const margin = mean - control
  console.log(margin <= 25 ? '\nVERDICT: PASS (<= +25)' : margin >= 30 ? '\nVERDICT: DEAD (>= +30)' : '\nVERDICT: INCONCLUSIVE (25-30)')
}

const [cmd, a, b, ...rest] = process.argv.slice(2)
if (cmd === 'preflight') {
  const items = JSON.parse(readFileSync(a, 'utf8'))
  const assignments = JSON.parse(readFileSync(b, 'utf8'))
  const { problems, stats } = preflight(items, assignments)
  console.log(JSON.stringify(stats))
  if (problems.length) { problems.forEach(p => console.log('FAIL ' + p)); process.exit(1) }
  console.log('preflight OK')
} else if (cmd === 'blind') {
  const items = JSON.parse(readFileSync(a, 'utf8'))
  const { blind, key } = buildBlind(items, b)
  writeFileSync(`${DIR}/${b}.blind.json`, JSON.stringify(blind, null, 2))
  writeFileSync(`${DIR}/${b}.key.json`, JSON.stringify(key, null, 2))
  console.log(`wrote ${DIR}/${b}.blind.json (${blind.length} items) + key`)
} else if (cmd === 'score') {
  score(a, [b, ...rest])
} else {
  console.error('usage: preflight|blind|score')
  process.exit(1)
}