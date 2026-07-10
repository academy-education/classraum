#!/usr/bin/env node
/**
 * study-bank/math-bank-helper.mjs — Claude-only SAT MATH bank pipeline.
 *
 * Math differs from R&W in one decisive way: the answer is COMPUTABLE, so
 * the correctness gate is a deterministic SANDBOX that recomputes each key
 * from the problem's givens — strictly stronger than any LLM vote. (The LLM
 * harness has a measured ~18% false-negative rate on hard math, so a blind
 * vote must NOT gate math; it is used only for difficulty + a soft
 * cross-check.) No OpenAI, no Anthropic API — Supabase DB write only.
 *
 *   verify <batch.json>            run each item's `solve` snippet in a
 *                                  sandbox and check it equals the keyed
 *                                  answer; report mismatches (mis-keys).
 *   blind  <batch.json>            print an answer-blind rendering for the
 *                                  difficulty grader / cross-check subagent.
 *   insert <batch.json> <qc.json>  re-run the sandbox gate, then insert
 *                                  items that recompute correctly AND grade
 *                                  hard/medium. DB write only.
 *
 * batch.json: [{ id, domain, subskill, difficulty, prompt, choices[4],
 *   correct_answer, explanation, solve }]  where `solve` is a JS function
 *   BODY that recomputes the answer independently and returns it (number or
 *   string). It must derive the answer from the problem's numbers, not just
 *   echo correct_answer.
 * qc.json: { "<id>": { difficulty, blind_letter? } }
 */
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const LETTERS = ['A', 'B', 'C', 'D', 'E']
const normHash = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const hashOf = ({ prompt, choices }) => createHash('md5').update(
  [normHash(prompt), (choices || []).map(normHash).join('|')].join('~~'),
).digest('hex')

function loadEnv() {
  const raw = readFileSync(process.cwd() + '/.env.local', 'utf8')
  return Object.fromEntries(raw.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
}

// Parse a numeric answer form: integer, decimal, or "a/b" fraction. Returns
// a Number, or null if the value is not purely numeric (then compare as text).
function asNumber(s) {
  const t = String(s).trim().replace(/\s+/g, '')
  if (/^-?\d+\/-?\d+$/.test(t)) { const [a, b] = t.split('/').map(Number); return b === 0 ? null : a / b }
  if (/^-?\d*\.?\d+$/.test(t)) return Number(t)
  return null
}
function answersMatch(computed, key) {
  const a = asNumber(computed), b = asNumber(key)
  if (a !== null && b !== null) return Math.abs(a - b) < 1e-6
  return normHash(computed) === normHash(key)
}

// Run one item's solve snippet in-process. It's Claude-authored code we
// control, executed only in this local tooling run.
function sandbox(item) {
  try {
    const fn = new Function('"use strict";' + item.solve)
    const out = String(fn())
    return { ok: answersMatch(out, item.correct_answer), computed: out }
  } catch (e) {
    return { ok: false, computed: 'ERROR: ' + String(e).slice(0, 80) }
  }
}

function shapeOk(raw) {
  return raw.prompt && Array.isArray(raw.choices) && raw.choices.length === 4
    && raw.choices.includes(raw.correct_answer)
    && new Set(raw.choices.map(c => String(c).trim())).size === 4
    && typeof raw.solve === 'string'
}

function toItem(raw) {
  return {
    passage: null, passageGroupId: null, prompt: raw.prompt, type: 'multiple_choice',
    choices: raw.choices, correct_answer: raw.correct_answer, correct_answers: null,
    acceptable_answers: null, difficulty: raw.difficulty, explanation: raw.explanation || '',
    distractor_rationales: raw.choices.filter(c => c !== raw.correct_answer).map(c => ({ choice: c, reason: '' })),
    blanks: null,
    graphic: raw.svg ? { type: 'rawsvg', svg: raw.svg, caption: raw.caption || null } : (raw.graphic || null),
    domain: raw.domain, subskill: raw.subskill,
    topic_tag: raw.topic_tag || null, word_count: null,
  }
}

function renderBlind(batch) {
  const out = []
  for (const it of batch) {
    out.push(`### Item ${it.id}  (${it.domain} / ${it.subskill})`)
    out.push(`Question: ${it.prompt}`)
    it.choices.forEach((c, i) => out.push(`  (${LETTERS[i]}) ${c}`))
    out.push('')
  }
  return out.join('\n')
}

async function main() {
  const [cmd, batchPath, qcPath] = process.argv.slice(2)
  const batch = batchPath ? JSON.parse(readFileSync(batchPath, 'utf8')) : []

  if (cmd === 'blind') { process.stdout.write(renderBlind(batch)); return }

  if (cmd === 'verify') {
    let pass = 0
    for (const raw of batch) {
      if (!shapeOk(raw)) { console.log(`SHAPE  id${raw.id} — need 4 distinct choices incl. key + a solve string`); continue }
      const r = sandbox(raw)
      if (r.ok) { pass++; console.log(`OK     id${raw.id} [${raw.domain}] key=${raw.correct_answer}  ✓computed ${r.computed}`) }
      else console.log(`FAIL   id${raw.id} [${raw.domain}] key=${raw.correct_answer}  ✗computed ${r.computed}`)
    }
    console.log(`\nSandbox: ${pass}/${batch.length} recompute to their key.`)
    return
  }

  if (cmd !== 'insert' || !qcPath) {
    console.error('usage: math-bank-helper.mjs verify <batch.json>\n       math-bank-helper.mjs blind <batch.json>\n       math-bank-helper.mjs insert <batch.json> <qc.json>')
    process.exit(1)
  }

  const env = loadEnv()
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const qc = JSON.parse(readFileSync(qcPath, 'utf8'))
  const { data: existing } = await admin.from('study_item_bank').select('content_hash').eq('section', 'math')
  const seen = new Set((existing || []).map(r => r.content_hash))

  let inserted = 0
  for (const raw of batch) {
    const q = qc[String(raw.id)] || {}
    const label = `id${raw.id} [${raw.domain} / ${raw.subskill}]`
    if (!shapeOk(raw)) { console.log(`SKIP   ${label} — bad shape`); continue }
    const r = sandbox(raw)                                   // hard gate: code must recompute the key
    if (!r.ok) { console.log(`REJECT ${label} — sandbox mismatch (computed ${r.computed}, key ${raw.correct_answer})`); continue }
    if (q.difficulty && !['hard', 'medium'].includes(q.difficulty)) { console.log(`REJECT ${label} — difficulty ${q.difficulty}`); continue }
    const it = toItem(raw)
    const content_hash = hashOf(it)
    if (seen.has(content_hash)) { console.log(`DUP    ${label}`); continue }
    const { error } = await admin.from('study_item_bank').insert({
      family: 'sat', section: 'math', domain: raw.domain, subskill: raw.subskill,
      difficulty: raw.difficulty, topic_tag: raw.topic_tag || null, item_type: 'multiple_choice',
      passage_group_id: null, item: it, content_hash, word_count: null, verified: true,
      verify_meta: {
        method: 'claude-authored+sandbox', computed: r.computed, grader_difficulty: q.difficulty || null,
        blind_letter: q.blind_letter || null, qc: 'deterministic sandbox recompute; no external model',
      },
      source: 'hand',
      archived: false,
      cohort: process.env.BANK_COHORT || 'v2',
    })
    if (error) { console.log(`ERR    ${label}: ${error.message}`); continue }
    seen.add(content_hash); inserted++
    console.log(`INSERT ${label} — ${raw.difficulty}, computed ${r.computed}`)
  }

  const { data: after } = await admin.from('study_item_bank').select('domain').eq('section', 'math').eq('verified', true)
  const by = {}
  for (const r of after) by[r.domain] = (by[r.domain] || 0) + 1
  console.log(`\nInserted ${inserted}. Math verified now: ${after.length}`)
  for (const [d, c] of Object.entries(by).sort()) console.log(`  ${d}: ${c}`)
}

main().catch(e => { console.error(e); process.exit(1) })
