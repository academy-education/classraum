#!/usr/bin/env node
/**
 * build-batch.mjs — writes the iTEP Listening v3 survivors (results/itep-listening-v3.json) as study_item_bank rows
 * in the staging shape (ITEP-SLATE-LISTENING-V3.prereg.md §6). File only, no database. Refuses unless the
 * pre-flight still passes on the frozen files, the score file exists and is not held, and every set is whole or
 * absent. passage = "Transcript: " + transcript, exactly what the packet graders read and the player voices.
 *   node scripts/study-bank/itep-listening-v3-work/build-batch.mjs      (from the repo root)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { itepHash } from '../itep-reading-v1-work/itep-hash.mjs'
const W = 'scripts/study-bank/itep-listening-v3-work'
const die = m => { console.error(`build-batch: ${m}`); process.exit(2) }
const FILES = 'ABCDEFGH'.split('').map(x => `${W}/items/${x}.json`)
const pf = spawnSync('node', [`${W}/itep-listening-check.mjs`, ...FILES, '--expect', '32', '--assigned', `${W}/ASSIGNED.json`, '--existing-names', `${W}/existing-names.json`, '--batch'], { encoding: 'utf8' })
if (pf.status !== 0) die(`pre-flight failed:\n${pf.stdout}${pf.stderr}`)
const SCORE = `${W}/results/itep-listening-v3.json`
if (!existsSync(SCORE)) die('no score file; run score.mjs first')
const score = JSON.parse(readFileSync(SCORE, 'utf8'))
if (score.hold) die('cohort held; nothing to write')
const cleared = new Set(score.cleared)
const PART = { 1: 'Part 1: Short Conversations', 2: 'Part 2: Conversation', 3: 'Part 3: Lecture' }
const BASE = Date.UTC(2026, 9, 31, 22, 0, 0) // after every v2 row (v2 BASE 21:00:00 + 91 s)
const rows = []
let seq = 0
for (const f of FILES) for (const s of JSON.parse(readFileSync(f, 'utf8')).sets) {
  const kept = s.items.filter(i => cleared.has(i.qid))
  if (!kept.length) continue
  if (kept.length !== s.items.length) die(`${s.set_id}: ${kept.length} of ${s.items.length} cleared; a set is whole or dropped`)
  const passage = `Transcript: ${s.transcript}`
  for (const it of s.items) {
    const item = {
      type: 'multiple_choice', blanks: null, graphic: null, prompt: it.prompt, passage,
      choices: it.choices, correct_answer: it.correct_answer, correct_answers: null, acceptable_answers: null,
      difficulty: it.difficulty, explanation: it.explanation,
      distractor_rationales: it.distractor_rationales.map(d => ({ choice: d.choice, reason: d.reason })),
    }
    rows.push({
      family: 'itep', section: 'listening', domain: PART[s.part], subskill: it.kind, topic_tag: it.kind,
      difficulty: it.difficulty, task: 'multiple_choice', item_type: 'multiple_choice',
      passage_group_id: s.part === 1 ? null : `itep-listening-v3-${s.set_id}`,
      created_at: new Date(BASE + 1000 * seq++).toISOString(),
      item, content_hash: itepHash(item), word_count: s.transcript.replace(/^[WM]: /gm, '').split(/\s+/).filter(Boolean).length,
      verified: false, archived: false, source: 'hand', cohort: 'itep-listening-v3',
      verify_meta: {
        method_id: 'itep-listening-v1-agent8+cfg-v1', brief: 'itep-slate-listening-v1 (frozen, no cut)',
        itep: { part: PART[s.part], set_id: s.set_id, setting: s.setting, speakers: s.speakers, title: s.title, kind: it.kind, why: it.why, why2: it.why2 ?? null },
        draft: { status: 'awaiting_release', qid: it.qid, qc: { gate: 'ITEP-SLATE-LISTENING-V3.prereg.md: pre-flight + probe + 3 graders (a/b plain, c adversarial) on COFOUNDER-BRIEF-v2, A1 rules', score_file: SCORE } },
      },
    })
  }
}
if (rows.length !== cleared.size) die(`wrote ${rows.length} rows but ${cleared.size} ids cleared`)
writeFileSync('scripts/study-bank/itep-listening-v3.batch.json', JSON.stringify(rows, null, 1) + '\n')
console.log(`wrote ${rows.length} rows`, rows.reduce((m, r) => ({ ...m, [r.domain]: (m[r.domain] || 0) + 1 }), {}))
