#!/usr/bin/env node
/**
 * study-bank/bank-helper.mjs — the deterministic half of the Claude-only
 * SAT Reading & Writing bank pipeline. Does NO model calls itself; the
 * authoring and QC (blind solves + difficulty grading) are driven by
 * Claude Code subagents in-session (see RUNBOOK.md). This script only:
 *
 *   blind  <batch.json>            print an answer-blind rendering of a
 *                                  keyed batch, for pasting into the
 *                                  blind-solver subagents (keys stripped).
 *
 *   insert <batch.json> <qc.json>  apply the calibrated acceptance rule to
 *                                  the QC results, then insert the passers
 *                                  into study_item_bank (verified). DB write
 *                                  only — no external model, no OpenAI,
 *                                  no Anthropic API. Uses the Supabase
 *                                  service-role key from .env.local.
 *
 * Acceptance rule (calibrated 2026-07-07 — see memory sat-rw-bank-qc):
 *   key_votes >= 2                       (>=2 of 3 blind solvers hit the key)
 *   AND difficulty in {hard, medium}     (grader vs anchors; "easy" is out)
 *   AND distractor_quality in {plausible, strong}
 *   AND (passage_needed OR domain == 'Standard English Conventions')
 * The grader's difficulty *number* is unreliable in the absolute, so it is
 * anchored against known-hard / known-easy exemplars in the subagent prompt.
 *
 * batch.json: [{ id, domain, subskill, passage?, prompt, choices[4],
 *               correct_answer, explanation }]
 * qc.json:    { "<id>": { key_votes, difficulty, distractor_quality,
 *               passage_needed } }
 */
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const LETTERS = ['A', 'B', 'C', 'D', 'E']
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
// Dedup over the item's actual content: passage + prompt + choices.
const hashOf = ({ passage, prompt, choices }) => createHash('md5').update(
  [norm(passage), norm(prompt), (choices || []).map(norm).join('|')].join('~~'),
).digest('hex')

/*
 * INSERT-TIME SHUFFLE: DELETED 2026-08-09, deliberately not wired.
 *
 * A `shuffleInPlace` lived here, was never called, and its own comment
 * plus the adjacent REJECT message both claimed it ran. Two options were
 * on the table — wire it, or remove it. Removed, on evidence:
 *
 *   1. Choice order is randomised at DRAW time, seeded per session, on
 *      every path that serves an item (shuffleDrawnChoices, assemble.ts
 *      496/926/1344/1438). A student never sees stored order, so an
 *      insert-time shuffle changes nothing they experience.
 *   2. Wiring it would COST QC coverage. Migration 078's self-test pins
 *      that content_sha changes on a reshuffle, and attack measurements
 *      are bound to content_sha (077). Reordering at insert would
 *      invalidate measurements to buy a property the draw already
 *      guarantees.
 *   3. Measured before deciding: SAT v2 key position is 30/27/23/20 over
 *      1,571 items — nowhere near the 45% gate. Authors complied by hand,
 *      so nothing is being papered over.
 *
 * assemble.ts already argues the general case: enforcing this at N write
 * sites and zero read sites means any future writer reintroduces the
 * defect silently. The draw is the read site. This is that decision,
 * recorded rather than left as dead code.
 */

function loadEnv() {
  const raw = readFileSync(process.cwd() + '/.env.local', 'utf8')
  return Object.fromEntries(raw.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
}

function renderBlind(batch) {
  const out = []
  for (const it of batch) {
    out.push(`### Item ${it.id}  (${it.domain} / ${it.subskill})`)
    if (it.passage) out.push(`Passage: ${it.passage}`)
    out.push(`Question: ${it.prompt}`)
    it.choices.forEach((c, i) => out.push(`  (${LETTERS[i]}) ${c}`))
    out.push('')
  }
  return out.join('\n')
}

// The single source of truth for what gets into the bank.
// An explanation may NOT point at an option by position.
//
// Both helpers shuffle choices at insert (that is what killed the
// key-in-slot-A tell), and the explanation is authored against the
// PRE-shuffle order. So "Choice 2 echoes 'wall'" ends up naming a
// different option than the one it describes. Verified against source on
// 2026-07-30: 245 of 342 items traceable to an authored file had their
// choices reordered, and 72 of those carry a positional reference — the
// wrong-answer explanation a student reads points at the wrong option.
//
// The fix cannot be "shuffle less". It is to write explanations that
// survive reordering: quote the option ("the option that offers a
// refund"), never number it.
// SCOPED DELIBERATELY. The first version was /\b(choice|option)\s+(\d|[a-d]\b)|...|\([A-D]\)/i
// and it was wrong twice on SAT Math, where 192 items were flagged and only
// 43 were real:
//   - "Choice 7 comes from 2g = 6x - 4" names the option whose VALUE is 7.
//     A four-option item has no seventh choice, so a number above 4 is
//     always a value reference and survives a shuffle intact.
//   - f(g(a)) and sin(A) matched \([A-D]\), and the /i flag matched the
//     lowercase (a) too.
// Both would have sent authors to rewrite prose that was never broken.
// Two rules with DIFFERENT casing needs, which is why this is not one regex.
// "Choice 2" must match case-insensitively; "(A)" must NOT match "(a)",
// because f(g(a)) is function notation. Folding them into one /i pattern is
// what produced 149 false positives on SAT Math.
const POSITIONAL_WORD = /\b(choice|option)\s+([1-4]|[a-d])\b|\b(first|second|third|fourth)\s+(choice|option)\b/i
const POSITIONAL_PAREN = /(^|[^A-Za-z0-9_])\([A-D]\)/
const namesAPosition = (s) => POSITIONAL_WORD.test(s) || POSITIONAL_PAREN.test(s)
function explanationIsOrderSafe(it) {
  return !namesAPosition(String(it.explanation || ''))
}

import { accepts } from './accepts.mjs'


function toItem(raw, difficulty) {
  return {
    passage: raw.passage || null, passageGroupId: null, prompt: raw.prompt,
    type: 'multiple_choice', choices: raw.choices, correct_answer: raw.correct_answer,
    correct_answers: null, acceptable_answers: null, difficulty,
    explanation: raw.explanation || '',
    distractor_rationales: raw.choices.filter(c => c !== raw.correct_answer).map(c => ({ choice: c, reason: '' })),
    blanks: null, graphic: raw.graphic || null, domain: raw.domain, subskill: raw.subskill,
    topic_tag: raw.topic_tag || null,
    word_count: raw.passage ? raw.passage.split(/\s+/).filter(Boolean).length : null,
  }
}

function shapeOk(raw) {
  // Distinctness is checked on trimmed EXACT strings, not the dedup norm():
  // Conventions choices often differ only by punctuation (water; / water, /
  // water), which norm() would wrongly collapse into duplicates.
  return raw.prompt && Array.isArray(raw.choices) && raw.choices.length === 4
    && raw.choices.includes(raw.correct_answer)
    && new Set(raw.choices.map(c => String(c).trim())).size === 4
}

async function main() {
  const [cmd, batchPath, qcPath] = process.argv.slice(2)
  if (cmd === 'blind') {
    const batch = JSON.parse(readFileSync(batchPath, 'utf8'))
    process.stdout.write(renderBlind(batch))
    return
  }
  if (cmd !== 'insert' || !batchPath || !qcPath) {
    console.error('usage: bank-helper.mjs blind <batch.json>\n       bank-helper.mjs insert <batch.json> <qc.json>')
    process.exit(1)
  }

  const env = loadEnv()
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const batch = JSON.parse(readFileSync(batchPath, 'utf8'))
  const qc = JSON.parse(readFileSync(qcPath, 'utf8'))

  const { data: existing } = await admin.from('study_item_bank').select('content_hash').eq('section', 'reading_writing')
  const seen = new Set((existing || []).map(r => r.content_hash))

  let inserted = 0
  for (const raw of batch) {
    const q = qc[String(raw.id)]
    const label = `id${raw.id} [${raw.domain} / ${raw.subskill}]`
    if (!shapeOk(raw)) { console.log(`SKIP ${label} — bad shape (need 4 distinct choices incl. key)`); continue }
    if (!explanationIsOrderSafe(raw)) {
      /*
       * This branch threw a ReferenceError until 2026-08-06 — `id` is not
       * in scope (the variable is `label`) and `rejected` was never
       * declared. Under a module's implicit strict mode that killed the
       * whole insert run instead of skipping one item, which is how it
       * survived: the check has evidently never fired on a real batch.
       *
       * The old message also claimed "choices are shuffled at insert".
       * They are not, and deliberately are not: SAT items are banked in
       * authored order and shuffled at DRAW time instead (see the note
       * at the top of this file).
       */
      console.log(`REJECT ${label} — explanation names an option by position; quote the option instead of numbering it`)
      continue
    }
    const verdict = accepts(q, raw.domain, raw.subskill)
    if (!verdict.ok) { console.log(`REJECT ${label} — ${verdict.why}`); continue }
    const it = toItem(raw, q.difficulty)
    const content_hash = hashOf(it)
    if (seen.has(content_hash)) { console.log(`DUP  ${label}`); continue }
    const { error } = await admin.from('study_item_bank').insert({
      family: 'sat', section: 'reading_writing', domain: raw.domain, subskill: raw.subskill,
      difficulty: q.difficulty, topic_tag: raw.topic_tag || null, item_type: 'multiple_choice',
      passage_group_id: null, item: it, content_hash, word_count: it.word_count, verified: true,
      verify_meta: {
        method: 'claude-authored+claude-qc', single_defensible: true, key_votes: q.key_votes,
        grader_difficulty: q.difficulty, distractor_quality: q.distractor_quality,
        qc: 'blind Claude solvers + anchored Claude grader; no external model',
      },
      source: 'hand',
      archived: false,
      cohort: process.env.BANK_COHORT || 'v2',
    })
    if (error) { console.log(`ERR  ${label}: ${error.message}`); continue }
    seen.add(content_hash); inserted++
    console.log(`INSERT ${label} — ${q.difficulty}, key ${q.key_votes}/3`)
  }

  const { data: after } = await admin.from('study_item_bank').select('domain').eq('section', 'reading_writing').eq('verified', true)
  const by = {}
  for (const r of after) by[r.domain] = (by[r.domain] || 0) + 1
  console.log(`\nInserted ${inserted}. R&W verified now: ${after.length}`)
  for (const [d, c] of Object.entries(by).sort()) console.log(`  ${d}: ${c}`)
}

main().catch(e => { console.error(e); process.exit(1) })
