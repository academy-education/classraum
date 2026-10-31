#!/usr/bin/env node
// SSAT Reading v2: the d19-22 build-rows.mjs with --draft N (CLI flag). Writes scripts/study-bank/ssat-reading-draft-N.batch.json
// from scratchpad/ssat-draftN-work/merged.json and prints its sha256 (the freeze). Run from anywhere.
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const i = process.argv.indexOf('--draft'); const DRAFT = i >= 0 ? process.argv[i + 1] : die('--draft N required')
const m = JSON.parse(readFileSync(join(ROOT, `scratchpad/ssat-draft${DRAFT}-work/merged.json`), 'utf8'))
if (!m.items?.length || !m.items.every(x => x.qid.startsWith(`D${DRAFT}-`))) die('merged.json is not this draft')
const norm = s => String(s ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
const hashOf = ({ passage, prompt, choices }) => createHash('md5').update([norm(passage), norm(prompt), (choices || []).map(norm).join('|')].join('~~')).digest('hex')
const L = 'ABCDE', COHORT = `ssat-reading-draft-${DRAFT}`
const rows = m.items.map(it => {
  const passageGroupId = `draft${DRAFT}-${it.passage_id}`
  const item = {
    type: 'multiple_choice', blanks: null, prompt: it.prompt, choices: it.choices, graphic: null, passage: it.passage,
    difficulty: it.difficulty, explanation: it.explanation, correct_answer: it.correct_answer, passageGroupId,
    correct_answers: null, acceptable_answers: null,
    distractor_rationales: it.distractor_rationales.map(d => ({ choice: d.choice, reason: d.reason })),
  }
  if (L[item.choices.indexOf(item.correct_answer)] !== it.key_slot) die(`${it.qid} key slot drift`)
  return {
    family: 'ssat', section: 'reading', domain: 'Reading Comprehension', subskill: it.kind, difficulty: it.difficulty, topic_tag: it.kind,
    item_type: 'multiple_choice', task: 'multiple_choice', passage_group_id: passageGroupId, item, content_hash: hashOf(item),
    word_count: it.passage.split(/\s+/).filter(Boolean).length, verified: false, archived: false, source: 'hand', cohort: COHORT,
    verify_meta: { draft: { status: 'awaiting_edit', qid: it.qid, method_id: 'ssat-rd-v2-agent', qc: { note: 'Written 2026-10-31 by a Claude author agent to briefs/ssat-reading-v2.md (sha c6559149) with a per-item drawn shape plan (SSAT-READING-V2.prereg.md). Mechanical checks only at staging; gate = agent review (A1) + key-visible audit.' }, original_item: item } },
  }
})
if (rows.length !== 36) die(`rows ${rows.length}`)
if (new Set(rows.map(r => r.content_hash)).size !== rows.length) die('duplicate hash within batch')
const txt = JSON.stringify({ cohort: COHORT, created: '2026-10-31', sets: m.sets, rows }, null, 1) + '\n'
writeFileSync(join(ROOT, `scripts/study-bank/ssat-reading-draft-${DRAFT}.batch.json`), txt)
console.log(COHORT, rows.length, 'rows; sha256', createHash('sha256').update(txt).digest('hex'))
