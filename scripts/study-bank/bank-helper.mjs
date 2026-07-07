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
function accepts(qc, domain, subskill) {
  if (!qc) return { ok: false, why: 'no qc row' }
  const kv = Number(qc.key_votes)
  // Standard English Conventions carve-out: difficulty/distractor graders
  // systematically under-rate these (the options are punctuation marks, so
  // they always read as "easy/mechanical"), so those grades are not
  // meaningful here. A conventions item is sound iff it tests a real rule
  // with exactly one defensible answer — which UNANIMOUS blind agreement
  // (3/3) confirms. Author judgment guards against trivial rules upstream.
  if (domain === 'Standard English Conventions') {
    if (!(kv >= 3)) return { ok: false, why: `conventions needs unanimous key (got ${kv}/3)` }
    return { ok: true }
  }
  if (!(kv >= 2)) return { ok: false, why: `key_votes ${kv}<2 (contested/mis-keyed)` }
  if (!['hard', 'medium'].includes(qc.difficulty)) return { ok: false, why: `difficulty ${qc.difficulty}` }
  // Rhetorical Synthesis carve-out: by design its distractors are TRUE
  // statements drawn from the notes that fail the stated rhetorical goal,
  // so graders systematically score them "weak" even when they are good
  // traps. The distractor-quality lens doesn't fit this item type; gate on
  // difficulty (already checked, not easy) + key agreement instead.
  if (domain === 'Expression of Ideas' && subskill === 'Rhetorical Synthesis') {
    return { ok: true }
  }
  if (!['plausible', 'strong'].includes(qc.distractor_quality)) return { ok: false, why: `distractors ${qc.distractor_quality}` }
  if (qc.passage_needed !== true) return { ok: false, why: 'not passage-dependent' }
  return { ok: true }
}

function toItem(raw, difficulty) {
  return {
    passage: raw.passage || null, passageGroupId: null, prompt: raw.prompt,
    type: 'multiple_choice', choices: raw.choices, correct_answer: raw.correct_answer,
    correct_answers: null, acceptable_answers: null, difficulty,
    explanation: raw.explanation || '',
    distractor_rationales: raw.choices.filter(c => c !== raw.correct_answer).map(c => ({ choice: c, reason: '' })),
    blanks: null, graphic: null, domain: raw.domain, subskill: raw.subskill,
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
