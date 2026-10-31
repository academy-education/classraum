#!/usr/bin/env node
/**
 * build-batch.mjs — writes the iTEP Reading v2 survivors (results/itep-reading-v2.json) as study_item_bank rows in
 * the staging shape (prereg §6). File only, no database. Refuses unless the pre-flight still passes on the frozen
 * files, the score file exists and is not held, and every cleared id is authored. Passage sets are written whole
 * or not at all (the scorer already drops a set with any dropped item; this re-checks it).
 *   node scripts/study-bank/itep-reading-v2-work/build-batch.mjs      (from the repo root)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { itepHash } from '../itep-reading-v1-work/itep-hash.mjs'
const W = 'scripts/study-bank/itep-reading-v2-work'
const die = m => { console.error(`build-batch: ${m}`); process.exit(2) }
const FILES = 'ABCDEFGH'.split('').map(x => `${W}/items/${x}.json`)
const pf = spawnSync('node', [`${W}/itep-reading-check.mjs`, ...FILES, '--expect', '152', '--assigned', `${W}/ASSIGNED.json`, '--existing-names', `${W}/existing-names.json`, '--batch'], { encoding: 'utf8' })
if (pf.status !== 0) die(`pre-flight failed:\n${pf.stdout}${pf.stderr}`)
const SCORE = `${W}/results/itep-reading-v2.json`
if (!existsSync(SCORE)) die('no score file; run score.mjs first')
const score = JSON.parse(readFileSync(SCORE, 'utf8'))
if (score.hold) die('cohort held; nothing to write')
const cleared = new Set(score.cleared)
const PART = { 1: 'Part 1: Short Text', 2: 'Part 2: Intermediate Passage', 3: 'Part 3: Advanced Passage' }
const BASE = Date.UTC(2026, 9, 31, 18, 0, 0)
const rows = []
let seq = 0
for (const f of FILES) for (const s of JSON.parse(readFileSync(f, 'utf8')).sets) {
  const kept = s.items.filter(i => cleared.has(i.qid))
  if (!kept.length) continue
  if (kept.length !== s.items.length) die(`${s.set_id}: ${kept.length} of ${s.items.length} cleared; a set is whole or dropped`)
  for (const it of s.items) {
    const item = {
      type: 'multiple_choice', blanks: null, graphic: null, prompt: it.prompt, passage: s.passage,
      choices: it.choices, correct_answer: it.correct_answer, correct_answers: null, acceptable_answers: null,
      difficulty: it.difficulty, explanation: it.explanation,
      distractor_rationales: it.distractor_rationales.map(d => ({ choice: d.choice, reason: d.reason })),
    }
    rows.push({
      family: 'itep', section: 'reading', domain: PART[s.part], subskill: it.kind, topic_tag: it.kind,
      difficulty: it.difficulty, task: 'multiple_choice', item_type: 'multiple_choice',
      passage_group_id: s.part === 1 ? null : `itep-reading-v2-${s.set_id}`,
      created_at: new Date(BASE + 1000 * seq++).toISOString(),
      item, content_hash: itepHash(item), word_count: s.passage.split(/\s+/).filter(Boolean).length,
      verified: false, archived: false, source: 'hand', cohort: 'itep-reading-v2',
      verify_meta: {
        method_id: 'itep-reading-v2-agent8+cfg-v2',
        itep: { part: PART[s.part], set_id: s.set_id, genre: s.genre, title: s.title, kind: it.kind, why: it.why, why2: it.why2 ?? null },
        draft: { status: 'awaiting_release', qid: it.qid, qc: { gate: 'ITEP-SLATE-READING-V2.prereg.md: pre-flight + 3 graders (a/b plain, c adversarial) on COFOUNDER-BRIEF-v2, A1 rules', score_file: SCORE } },
      },
    })
  }
}
if (rows.length !== cleared.size) die(`wrote ${rows.length} rows but ${cleared.size} ids cleared`)
writeFileSync('scripts/study-bank/itep-reading-v2.batch.json', JSON.stringify(rows, null, 1) + '\n')
console.log(`wrote ${rows.length} rows`, rows.reduce((m, r) => ({ ...m, [r.domain]: (m[r.domain] || 0) + 1 }), {}))
