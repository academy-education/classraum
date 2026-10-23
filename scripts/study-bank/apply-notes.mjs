#!/usr/bin/env node
/**
 * apply-notes.mjs — turn new would-block notes into a fixture, a brief line and an
 * authoring rule (FEEDBACK-LOOP.md). Reads cofounder-notes.json (rebuild it first
 * with build-notes-ledger.mjs) and cofounder-loop-state.json. No database.
 *
 *   node scripts/study-bank/apply-notes.mjs --dry           print what would be added
 *   node scripts/study-bank/apply-notes.mjs --write         write COFOUNDER-BRIEF-v{N+1}.md (new file, never an
 *                                                           in-place edit), append to AUTHORING-RULES-FROM-NOTES.md,
 *                                                           update the state; then run the fixture run
 *   node scripts/study-bank/apply-notes.mjs --check-brief F exit 1 unless author brief F carries the current
 *                                                           AUTHORING-RULES-FROM-NOTES version marker
 *   --state FILE   use another state file (break-testing)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { planApply, TAXONOMY } from './cofounder-loop-lib.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const STATE = opt('--state', join(HERE, 'cofounder-loop-state.json'))
const RULES = join(HERE, 'AUTHORING-RULES-FROM-NOTES.md')
const die = (c, m) => { console.error(m); process.exit(c) }
const readJson = p => JSON.parse(readFileSync(p, 'utf8'))

const state = readJson(STATE)
const marker = v => `AUTHORING-RULES-FROM-NOTES v${v}`

if (args.includes('--check-brief')) {
  const f = opt('--check-brief')
  if (!f || !existsSync(f)) die(2, `--check-brief: file not found: ${f}`)
  const txt = readFileSync(f, 'utf8'), want = marker(state.authoring_rules_version)
  const found = [...txt.matchAll(/AUTHORING-RULES-FROM-NOTES v(\d+)/g)].map(m => Number(m[1]))
  if (found.includes(state.authoring_rules_version)) { console.log(`OK: ${f} carries ${want}`); process.exit(0) }
  die(1, `MISSING: ${f} does not carry "${want}"${found.length ? ` (it has v${found.join(', v')} — stale)` : ''}. Paste scripts/study-bank/AUTHORING-RULES-FROM-NOTES.md into the brief.`)
}

const ledgerFile = join(HERE, 'cofounder-notes.json')
if (!existsSync(ledgerFile)) die(2, 'REFUSED: cofounder-notes.json missing — run build-notes-ledger.mjs')
const ledger = readJson(ledgerFile).entries
if (!ledger?.length) die(2, 'REFUSED: ledger has no entries')
const briefPath = join(HERE, state.brief_file)
if (!existsSync(briefPath)) die(2, `REFUSED: current brief ${state.brief_file} not found`)
const briefText = readFileSync(briefPath, 'utf8')
const covered = new Set(Object.keys(TAXONOMY).filter(t => briefText.includes('`' + t + '`')))
const applied = new Set(state.applied ?? [])
const plan = planApply({ ledger, applied, briefVersion: state.brief_version, briefTypesCovered: covered })

console.log(`ledger: ${ledger.length} entries, ${ledger.filter(e => e.would_block).length} would-block; already applied: ${applied.size}`)
console.log(`current brief ${state.brief_version} (${state.brief_file}); validated for production: ${state.validated_version}${state.pending_fixture_run ? '; FIXTURE RUN PENDING for ' + state.brief_version : ''}`)
if (!plan.count) { console.log('\nnothing new: every would-block note is already reflected in the brief, the fixtures and the authoring rules.'); process.exit(0) }

console.log(`\n${plan.count} new would-block note(s) -> brief ${plan.nextVersion}, authoring rules v${state.authoring_rules_version + 1}\n`)
console.log('FIXTURES (rebuild with run-fixtures.mjs build):')
for (const f of plan.fixtures) console.log(`  ${f.skipped ? 'skip' : 'add '} ${String(f.id).slice(0, 22).padEnd(22)} ${f.skipped ?? `${f.defect_type} item ${f.item_id}`}`)
console.log(`\nBRIEF LINES for COFOUNDER-BRIEF-${plan.nextVersion}.md:`)
for (const b of plan.briefLines) console.log(`  [${b.kind}] ${b.defect_type}: "${b.quote.replace(/\s+/g, ' ').slice(0, 160)}" (${String(b.id).slice(0, 8)})`)
console.log(`\nAUTHORING RULES (append to AUTHORING-RULES-FROM-NOTES.md):`)
for (const r of plan.authoringRules) console.log(`  ${r.family ?? '?'} / ${r.defect_type}: ${TAXONOMY[r.defect_type]?.def ?? ''} [${String(r.id).slice(0, 8)}]`)
console.log(`\nthen: run-fixtures.mjs build && render COFOUNDER-BRIEF-${plan.nextVersion}.md and the validated brief, grade both, compare. The new version is not used for production grading until compare passes.`)

if (args.includes('--dry')) process.exit(0)
if (!args.includes('--write')) die(2, 'pass --dry to preview or --write to apply')

const nextFile = join(HERE, 'cofounder-grader', `COFOUNDER-BRIEF-${plan.nextVersion}.md`)
if (existsSync(nextFile)) die(2, `REFUSED: ${nextFile} already exists — a version is never overwritten`)
const today = new Date().toISOString().slice(0, 10)
const briefAdd = [
  '', `## Lines added from notes (${plan.nextVersion}, ${today})`, '',
  ...plan.briefLines.map(b => b.kind === 'new-check'
    ? `- **New check, \`${b.defect_type}\`:** ${TAXONOMY[b.defect_type].def} ${b.register ? 'Recorded' : 'His words'}: "${b.quote.replace(/\s+/g, ' ')}"`
    : `- Another example for \`${b.defect_type}\` (${b.register ? 'recorded' : 'his words'}): "${b.quote.replace(/\s+/g, ' ')}"`),
  '',
].join('\n')
const renamed = briefText.replace(/COFOUNDER-BRIEF-v\d+ \(/, `COFOUNDER-BRIEF-${plan.nextVersion} (`)
// added lines go before the Output section so graders read them as checks, not as an afterthought
const at = renamed.lastIndexOf('\n## Output')
writeFileSync(nextFile, at >= 0 ? renamed.slice(0, at) + briefAdd + renamed.slice(at) : renamed + briefAdd)
const nextRules = state.authoring_rules_version + 1
let rules = readFileSync(RULES, 'utf8').replace(marker(state.authoring_rules_version), marker(nextRules))
rules += `\n## Added ${today} (v${nextRules})\n\n` + plan.authoringRules.map(r =>
  `- **${r.defect_type}** (${r.family ?? '?'}): ${TAXONOMY[r.defect_type]?.def ?? ''} ${r.register ? 'Recorded' : 'He'}: "${r.note.replace(/\s+/g, ' ')}" [${String(r.id).slice(0, 8)}]`).join('\n') + '\n'
writeFileSync(RULES, rules)
writeFileSync(STATE, JSON.stringify({ ...state, brief_version: plan.nextVersion, brief_file: `cofounder-grader/COFOUNDER-BRIEF-${plan.nextVersion}.md`,
  pending_fixture_run: true, authoring_rules_version: nextRules, updated_at: today,
  applied: [...applied, ...plan.fixtures.map(f => f.id)].sort() }, null, 1) + '\n')
console.log(`\nwrote ${nextFile}\nappended to ${RULES} (now v${nextRules})\nupdated ${STATE}`)
