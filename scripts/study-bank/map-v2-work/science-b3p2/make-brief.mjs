#!/usr/bin/env node
/**
 * make-brief.mjs (batch 3 pilot 2): builds the two batch-2 briefs from ONE source, so they cannot drift apart:
 *   BRIEF.md         authors: BRIEF-body.md + the slot tables (key letters and ranks) + AUTHORING-RULES-FROM-NOTES.md
 *   BRIEF-grader.md  graders: BRIEF-body.md + AUTHORING-RULES-FROM-NOTES.md, and NO slot tables
 *
 *   node scripts/study-bank/map-v2-work/science-b2/make-brief.mjs [--check]
 *
 * The A1 fix (pilot amendment, 2026-10-27): the pilot's first two graders were told to read the author brief, whose
 * slot tables list every key letter, so their 36/36 agreement proved nothing. This script REFUSES (exit 1) to write a
 * grader copy that contains any slot id of this batch, a "| key letter |" table column, or any table row of the slot tables.
 * --check exits 1 if either file on disk differs from what it would write.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const body = readFileSync(join(HERE, 'BRIEF-body.md'), 'utf8')
const rules = readFileSync(join(HERE, '../../AUTHORING-RULES-FROM-NOTES.md'), 'utf8')
const S = JSON.parse(readFileSync(join(HERE, 'slots.json'), 'utf8'))
const codes = Object.keys(S).filter(k => !k.startsWith('_'))

const tables = codes.map(c => {
  const v = S[c]
  return [`### Author ${c}: ${v.area}, grade ${v.grade} (${v.rows.length} slots)`, '',
    '| slot | grade | tier | RIT target | DCI | kind | stimulus | format | ask | pos | key letter | key rank | invented |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...v.rows.map(r => `| ${r.id} | ${r.g} | ${r.tier} | ${r.rit_band} | ${r.dci} | ${r.kind} | ${r.stimulus} | ${r.format} | ${r.ask} | ${r.pos ?? ''} | ${r.key} | ${r.rank} | ${r.invent ? 'yes' : 'no'} |`), ''].join('\n')
}).join('\n')

const pasted = `\n## Pasted: AUTHORING-RULES-FROM-NOTES.md (binding; reading-specific rules apply where they fit)\n\n${rules}`
const author = `${body}\n## Slot tables (seeded; also in slots.json)\n\n${tables}${pasted}`
const grader = `${body}\n## Slot tables: NOT IN THE GRADER COPY\n\nThey carry every key letter and key rank (pilot amendment A1). Grade from the packets only.\n${pasted}`

const leaks = []
const ids = codes.flatMap(c => S[c].rows.map(r => r.id))
for (const id of ids) if (grader.includes(id)) { leaks.push(`slot id ${id}`); break }
if (/\|\s*key letter\s*\|/i.test(grader)) leaks.push('a "key letter" table column')
if (/^\| MSB3[PQ]?-/m.test(grader)) leaks.push('a slot table row')
if (leaks.length) { console.error(`REFUSING: grader copy would leak ${leaks.join(', ')}`); process.exit(1) }

const out = { 'BRIEF.md': author, 'BRIEF-grader.md': grader }
if (process.argv.includes('--check')) {
  const bad = Object.entries(out).filter(([f, t]) => !existsSync(join(HERE, f)) || readFileSync(join(HERE, f), 'utf8') !== t).map(([f]) => f)
  if (bad.length) { console.error(`stale: ${bad.join(', ')} (run make-brief.mjs)`); process.exit(1) }
  console.log('BRIEF.md and BRIEF-grader.md reproduce; grader copy carries no slot table'); process.exit(0)
}
for (const [f, t] of Object.entries(out)) writeFileSync(join(HERE, f), t)
console.log(`wrote BRIEF.md (${author.split('\n').length} lines, ${ids.length} slot rows) and BRIEF-grader.md (${grader.split('\n').length} lines, 0 slot rows)`)
