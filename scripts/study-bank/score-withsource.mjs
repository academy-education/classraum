#!/usr/bin/env node
/**
 * score-withsource.mjs <tag> — score with-source grader files against the
 * authored key, and report exclusivity flags.
 *
 * Refuses (exit 2) rather than printing a number when it cannot read its
 * input or when a grader file does not cover every item in the key.
 */
import { readFileSync, existsSync } from 'node:fs'
const tag = process.argv[2]
if (!tag) { console.error('usage: score-withsource.mjs <tag>'); process.exit(2) }
const keyPath = `${tag}.withsource-key.json`
if (!existsSync(keyPath)) { console.error(`REFUSING: no ${keyPath}`); process.exit(2) }
const key = JSON.parse(readFileSync(keyPath, 'utf8'))
const ids = Object.keys(key)
const graders = ['a', 'b', 'c'].filter(g => existsSync(`${tag}.grader-${g}.json`))
if (!graders.length) { console.error(`REFUSING: no ${tag}.grader-*.json`); process.exit(2) }

const votes = Object.fromEntries(ids.map(i => [i, 0]))
const flags = Object.fromEntries(ids.map(i => [i, []]))
const fields = {}
for (const g of graders) {
  const r = JSON.parse(readFileSync(`${tag}.grader-${g}.json`, 'utf8'))
  const missing = ids.filter(i => !r[i])
  if (missing.length) { console.error(`REFUSING: grader-${g} missing ${missing.length} of ${ids.length} ids: ${missing.slice(0,5).join(',')}`); process.exit(2) }
  const extra = Object.keys(r).filter(i => !key[i])
  if (extra.length) { console.error(`REFUSING: grader-${g} has ${extra.length} ids not in the key: ${extra.slice(0,5).join(',')}`); process.exit(2) }
  let hit = 0
  for (const i of ids) {
    const row = r[i]
    if (!/^[A-E]$/.test(String(row.pick))) { console.error(`REFUSING: grader-${g} ${i} pick=${row.pick}`); process.exit(2) }
    if (row.pick === key[i]) { votes[i]++; hit++ } else flags[i].push(`${g}:picked ${row.pick} not ${key[i]}`)
    if (row.second_defensible) flags[i].push(`${g}:2nd=${row.second_defensible}`)
    if (row.passage_needed === false) flags[i].push(`${g}:passage NOT needed`)
    if (row.figure_needed === false) flags[i].push(`${g}:figure NOT needed`)
    if (row.resolved_after_blank === true) flags[i].push(`${g}:resolved after blank`)
    ;(fields[i] ||= []).push(row)
  }
  console.log(`grader-${g}: ${hit}/${ids.length} on key (${(hit / ids.length * 100).toFixed(1)}%)`)
}
const maj = a => { const c = {}; for (const v of a) c[v] = (c[v] || 0) + 1; return Object.entries(c).sort((x, y) => y[1] - x[1])[0][0] }
console.log(`\nitems ${ids.length}, graders ${graders.length}`)
const byVotes = {}
for (const i of ids) byVotes[votes[i]] = (byVotes[votes[i]] || 0) + 1
console.log('key votes histogram:', JSON.stringify(byVotes))
const diffHist = {}, dqHist = {}
for (const i of ids) {
  diffHist[maj(fields[i].map(r => r.difficulty))] = (diffHist[maj(fields[i].map(r => r.difficulty))] || 0) + 1
  dqHist[maj(fields[i].map(r => r.distractor_quality))] = (dqHist[maj(fields[i].map(r => r.distractor_quality))] || 0) + 1
}
console.log('majority difficulty:', JSON.stringify(diffHist))
console.log('majority distractor_quality:', JSON.stringify(dqHist))
console.log('\nFLAGGED ITEMS')
let n = 0
for (const i of ids) if (flags[i].length) { console.log(`  ${i}  votes ${votes[i]}/${graders.length}  ${flags[i].join(' | ')}`); n++ }
if (!n) console.log('  (none)')
