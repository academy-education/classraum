#!/usr/bin/env node
/**
 * study-bank/toefl-bank-helper.mjs — deterministic half of the Claude-only
 * TOEFL bank-scaling pipeline (Listening + Writing free-response). Does NO
 * model calls itself; authoring + QC are driven by Claude Code subagents
 * in-session. This script only renders blind batches and inserts passers.
 *
 * Commands:
 *   blind-listening <file...>            print answer-blind rendering of
 *                                        listening batches (keys stripped),
 *                                        one block per item, stable ids
 *                                        "<fileTag>#<idx>", for solver agents.
 *
 *   insert-listening <keep.json> <file...>
 *                                        keep.json = { "keep": ["<id>", ...] }
 *                                        — the ids a blind Claude grader
 *                                        confirmed (own answer == key, passage-
 *                                        dependent, 4 clean choices). Insert
 *                                        only kept items into study_item_bank.
 *
 *   insert-writing <flagged.json> <file...>
 *                                        flagged.json = { "archive": ["<id>"] }.
 *                                        Insert every writing item NOT flagged
 *                                        (free-response = no key, format-checked
 *                                        at author time + reviewer-flagged here).
 *
 * fileTag = basename without extension (e.g. "listening-01", "email-02").
 * All inserts: family='toefl', verified=true, source='hand' (Claude-authored),
 * cohort from BANK_COHORT env (default 'v3-claude'). Dedups on content_hash
 * against the existing TOEFL bank so re-runs are idempotent.
 */
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { basename, extname } from 'node:path'

const LETTERS = ['A', 'B', 'C', 'D']
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const tagOf = p => basename(p, extname(p))
const COHORT = process.env.BANK_COHORT || 'v3-claude'

// Listening dedup: transcript + prompt + choices. Writing dedup: the scenario
// passage (prompt is a fixed instruction string, so it doesn't discriminate).
const hashListening = it => createHash('md5')
  .update([norm(it.passage), norm(it.prompt), (it.choices || []).map(norm).join('|')].join('~~')).digest('hex')
const hashWriting = it => createHash('md5').update(norm(it.passage)).digest('hex')

function loadEnv() {
  const raw = readFileSync(process.cwd() + '/.env.local', 'utf8')
  return Object.fromEntries(raw.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
}
const admin = () => {
  const env = loadEnv()
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}

// Load files, tag each item with a stable id "<fileTag>#<idx>".
function loadTagged(files) {
  const out = []
  for (const f of files) {
    const tag = tagOf(f)
    const arr = JSON.parse(readFileSync(f, 'utf8'))
    arr.forEach((it, i) => out.push({ id: `${tag}#${i}`, it }))
  }
  return out
}

// Pull a short domain label from the leading "[Tag — Sub]" in the prompt/passage.
function labelFrom(text, fallback) {
  const m = (text || '').match(/^\s*\[([^\]—-]+)/)
  return (m ? m[1].trim() : fallback).slice(0, 60)
}

function listeningShapeOk(it) {
  return it.type === 'multiple_choice'
    && Array.isArray(it.choices) && it.choices.length === 4
    && it.choices.includes(it.correct_answer)
    && new Set(it.choices.map(c => String(c).trim())).size === 4
    && /^\s*transcript:/i.test(it.passage || '')
}

function renderBlindListening(tagged) {
  const out = []
  for (const { id, it } of tagged) {
    out.push(`### ${id}`)
    out.push(it.passage)                       // transcript kept; key stripped
    out.push(`Q: ${it.prompt}`)
    it.choices.forEach((c, i) => out.push(`  (${LETTERS[i]}) ${c}`))
    out.push('')
  }
  return out.join('\n')
}

async function insertListening(keepPath, files) {
  const keep = new Set((JSON.parse(readFileSync(keepPath, 'utf8')).keep) || [])
  const tagged = loadTagged(files)
  const db = admin()
  const { data: existing } = await db.from('study_item_bank').select('content_hash').eq('family', 'toefl').eq('section', 'listening')
  const seen = new Set((existing || []).map(r => r.content_hash))
  let inserted = 0, rejected = 0
  for (const { id, it } of tagged) {
    if (!listeningShapeOk(it)) { console.log(`SKIP ${id} — bad shape`); rejected++; continue }
    if (!keep.has(id)) { console.log(`REJECT ${id} — not confirmed by grader`); rejected++; continue }
    const content_hash = hashListening(it)
    if (seen.has(content_hash)) { console.log(`DUP ${id}`); continue }
    const domain = labelFrom(it.prompt, 'Listening')
    const { error } = await db.from('study_item_bank').insert({
      family: 'toefl', section: 'listening', domain, difficulty: it.difficulty || 'hard',
      item_type: 'multiple_choice', item: it, content_hash,
      word_count: it.passage ? it.passage.split(/\s+/).filter(Boolean).length : null,
      verified: true, archived: false, source: 'hand', cohort: COHORT,
      verify_meta: { method: 'claude-authored+claude-blind-grade', passage_needed: true },
    })
    if (error) { console.log(`ERR ${id}: ${error.message}`); continue }
    seen.add(content_hash); inserted++
  }
  console.log(`\nListening: inserted ${inserted}, rejected ${rejected}`)
}

async function insertWriting(flaggedPath, files) {
  const flagged = new Set((JSON.parse(readFileSync(flaggedPath, 'utf8')).archive) || [])
  const tagged = loadTagged(files)
  const db = admin()
  const { data: existing } = await db.from('study_item_bank').select('content_hash').eq('family', 'toefl').eq('section', 'writing')
  const seen = new Set((existing || []).map(r => r.content_hash))
  const DOMAIN = { writing_email: 'Email', writing_discussion: 'Academic Discussion' }
  let inserted = 0, skipped = 0
  for (const { id, it } of tagged) {
    if (!['writing_email', 'writing_discussion'].includes(it.type) || !it.passage) { console.log(`SKIP ${id} — bad shape`); skipped++; continue }
    if (flagged.has(id)) { console.log(`FLAGGED ${id} — archived by reviewer`); skipped++; continue }
    const content_hash = hashWriting(it)
    if (seen.has(content_hash)) { console.log(`DUP ${id}`); continue }
    const { error } = await db.from('study_item_bank').insert({
      family: 'toefl', section: 'writing', domain: DOMAIN[it.type], difficulty: it.difficulty || 'hard',
      item_type: it.type, item: it, content_hash,
      word_count: it.passage.split(/\s+/).filter(Boolean).length,
      verified: true, archived: false, source: 'hand', cohort: COHORT,
      verify_meta: { method: 'claude-authored+claude-reviewer', free_response: true },
    })
    if (error) { console.log(`ERR ${id}: ${error.message}`); continue }
    seen.add(content_hash); inserted++
  }
  console.log(`\nWriting: inserted ${inserted}, skipped ${skipped}`)
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2)
  if (cmd === 'blind-listening') { process.stdout.write(renderBlindListening(loadTagged(rest))); return }
  if (cmd === 'insert-listening') { await insertListening(rest[0], rest.slice(1)); return }
  if (cmd === 'insert-writing') { await insertWriting(rest[0], rest.slice(1)); return }
  console.error('usage:\n  toefl-bank-helper.mjs blind-listening <file...>\n  toefl-bank-helper.mjs insert-listening <votes.json> <file...>\n  toefl-bank-helper.mjs insert-writing <flagged.json> <file...>')
  process.exit(1)
}
main().catch(e => { console.error(e); process.exit(1) })
