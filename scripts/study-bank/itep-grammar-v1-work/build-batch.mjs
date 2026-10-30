#!/usr/bin/env node
/**
 * build-batch.mjs — writes the iTEP Grammar v1 survivors as study_item_bank rows in the staging shape
 * (stage-map-language-v4.mjs: verified=false, one cohort, content hash over passage+prompt+choices).
 * Writes a file only; touches no database. Refuses unless the score file exists and every cleared id is
 * an authored item that still passes the pre-flight.
 *
 *   node scripts/study-bank/itep-grammar-v1-work/build-batch.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const die = m => { console.error(`build-batch: ${m}`); process.exit(2) }
const FILES = ['author-a.json', 'author-b.json', 'author-c.json'].map(f => join(HERE, 'items', f))
const SCORE = join(HERE, 'results/itep-grammar-v1.score.json')
const OUT = join(HERE, '../itep-grammar-v1.batch.json')
const COHORT = 'itep-grammar-v1'
const METHOD = 'itep-grammar-v1-agent3+cfg-v2-cold'

const pf = spawnSync('node', [join(HERE, 'itep-grammar-check.mjs'), ...FILES, '--expect', '24'], { encoding: 'utf8' })
if (pf.status !== 0) die(`pre-flight failed:\n${pf.stdout}${pf.stderr}`)
if (!existsSync(SCORE)) die('no score file; run score.mjs first')
const score = JSON.parse(readFileSync(SCORE, 'utf8'))
if (score.hold) die('batch is held; nothing to write')
const items = FILES.flatMap(f => JSON.parse(readFileSync(f, 'utf8')))
const byId = new Map(items.map(i => [i.id, i]))

const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const hashOf = ({ passage, prompt, choices }) => createHash('md5')
  .update([norm(passage), norm(prompt), (choices || []).map(norm).join('|')].join('~~')).digest('hex')

const rows = score.cleared.map(id => {
  const it = byId.get(id)
  if (!it) die(`cleared id ${id} is not an authored item`)
  const p2 = it.part.startsWith('Part 2')
  const item = {
    type: 'multiple_choice', blanks: null, graphic: null, prompt: it.prompt, passage: it.passage,
    choices: it.choices, correct_answer: it.correct_answer, correct_answers: null, acceptable_answers: null,
    difficulty: it.difficulty, explanation: it.explanation,
    distractor_rationales: Object.entries(it.distractor_rationales || {}).map(([choice, why]) => ({ choice, why })),
  }
  const sentence = p2 ? it.passage.replace(/\[[A-D]:\s?([^\]]*)\]/g, '$1') : it.passage
  return {
    family: 'itep', section: 'grammar', domain: it.part, subskill: it.category, topic_tag: it.category,
    difficulty: it.difficulty, task: 'multiple_choice',
    // Part 2 must NOT be reshuffled at draw time: the [A:]..[D:] labels in the sentence name the choices in order.
    item_type: p2 ? 'error_identification' : 'multiple_choice',
    passage_group_id: null, item, content_hash: hashOf(item),
    word_count: sentence.split(/\s+/).filter(Boolean).length,
    verified: false, archived: false, source: 'hand', cohort: COHORT,
    verify_meta: {
      method_id: METHOD,
      itep: { part: it.part, cefr: it.cefr, category: it.category, varied_dimension: it.varied_dimension, ordered_choices: p2, authored_key_slot: it.key_slot, authored_key_len_rank: it.key_len_rank },
      draft: {
        status: 'awaiting_release', qid: it.id,
        qc: { gate: 'ITEP-SLATE-GRAMMAR-V1.prereg.md: pre-flight + 3 graders cold-then-keyed on COFOUNDER-BRIEF-v2, A1 rules', score_file: 'scripts/study-bank/itep-grammar-v1-work/results/itep-grammar-v1.score.json' },
        authored: { student_error: it.student_error || null },
      },
    },
  }
})
const hashes = rows.map(r => r.content_hash)
if (new Set(hashes).size !== hashes.length) die('duplicate content hash inside the batch')
writeFileSync(OUT, JSON.stringify(rows, null, 1) + '\n')
const per = rows.reduce((m, r) => ({ ...m, [r.domain]: (m[r.domain] || 0) + 1 }), {})
console.log(`wrote ${rows.length} rows (of ${items.length} authored, ${score.cleared.length} cleared) to ${OUT}`, per)
