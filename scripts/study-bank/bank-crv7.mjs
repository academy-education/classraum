#!/usr/bin/env node
/**
 * bank-crv7.mjs — one-shot ship of the cr-v7 Choose a Response cohort
 * (2026-08-18, on Andy's explicit approval).
 *
 * Deliberately NOT routed through toefl-bank-helper's insert-listening:
 * that path re-shuffles choices at insert (seeded by content_hash). cr-v7's
 * letters were already dealt flat by the render's seeded RNG — 33/33/33/33,
 * control exactly 25.0% — and every blind-attack measurement is evidence
 * about THAT deal. Re-shuffling would replace measured text with unmeasured
 * text. The shuffle exists to protect against key-first authoring, which
 * cr-v7's construction makes impossible (no author ever knew the key).
 *
 * Still gated: refuses unless scripts/study-bank/ledger.json holds a passing
 * entry for the exact bytes of crv7-items.json (gate.mjs, same as every
 * other insert path).
 *
 * Commands:
 *   insert     bank the 132 (idempotent on content_hash)
 *   archive    archive the old live Choose a Response rows that are NOT
 *              cr-v7 (cr-v1 / cr-v2 / harvest-v1), then assert live
 *              unarchived CR count == 132
 *   verify     re-read 5 random cr-v7 rows and byte-compare the content
 *              fields against the file
 */
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { gateBatch } from './gate.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ITEMS_FILE = join(HERE, 'crv7-items.json')
const COHORT = 'cr-v7'

const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
// Same content_hash definition as toefl-bank-helper.mjs hashListening
// (definition C in CONTENT-HASH-FINDING.md) so cross-cohort dedup holds.
const stripStem = t => norm(String(t || '')
  .replace(/^\s*\[[^\]]*\]\s*/, '')
  .replace(/^\s*(according to|based on)\s+the\s+passage\s*,?\s*/i, ''))
const hashListening = it => createHash('md5')
  .update([norm(it.passage), stripStem(it.prompt),
           (it.choices || []).map(norm).sort().join('|')].join('~~')).digest('hex')

function loadEnv() {
  const raw = readFileSync(join(HERE, '../../.env.local'), 'utf8')
  return Object.fromEntries(raw.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
}
const env = loadEnv()
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const items = JSON.parse(readFileSync(ITEMS_FILE, 'utf8'))
if (items.length !== 132) { console.error(`expected 132 items, file has ${items.length}`); process.exit(1) }

// `item` as banked: the live JSON shape minus the _crv7 authoring metadata.
const bankItem = raw => {
  const { _crv7, ...it } = raw
  return it
}

async function insert() {
  const verdict = gateBatch({ task: 'choose_response', family: 'toefl', section: 'listening', itemFiles: [ITEMS_FILE] })
  if (!verdict.canInsert) {
    console.error(`REFUSED: ${verdict.reason} (sha ${verdict.sha.slice(0, 12)})`)
    process.exit(1)
  }
  console.log(`gate passed — ledger batch ${verdict.batch} at sha ${verdict.sha.slice(0, 12)}`)

  const { data: existing, error: exErr } = await db.from('study_item_bank')
    .select('content_hash').eq('family', 'toefl').in('section', ['reading', 'listening'])
    .limit(10000)
  if (exErr) throw exErr
  const seen = new Set((existing || []).map(r => r.content_hash))

  let inserted = 0, dup = 0
  for (const [i, raw] of items.entries()) {
    const it = bankItem(raw)
    if (it.listeningTask !== 'choose_response' || !it.choices?.includes(it.correct_answer)) {
      console.error(`bad shape at idx ${i}`); process.exit(1)
    }
    const content_hash = hashListening(it)
    if (seen.has(content_hash)) { console.log(`DUP idx ${i} (${raw._crv7?.localId})`); dup++; continue }
    const { error } = await db.from('study_item_bank').insert({
      family: 'toefl', section: 'listening', domain: 'Choose a Response',
      difficulty: it.difficulty || 'hard',
      item_type: 'multiple_choice', item: it, content_hash,
      topic_tag: 'choose_response', task: 'choose_response',
      word_count: it.passage ? it.passage.split(/\s+/).filter(Boolean).length : null,
      verified: true, archived: false, source: 'hand', cohort: COHORT,
      verify_meta: {
        source: 'crv7', shipped: '2026-08-18', passage_needed: true,
        method: 'crv7-symmetric-worlds+seeded-key+blind-attack',
        localId: raw._crv7?.localId ?? null,
      },
    })
    if (error) { console.error(`ERR idx ${i}: ${error.message}`); process.exit(1) }
    seen.add(content_hash); inserted++
  }
  console.log(`inserted ${inserted}, dup-skipped ${dup}`)
}

async function archive() {
  const { data: oldRows, error } = await db.from('study_item_bank')
    .select('id, cohort').eq('family', 'toefl').eq('task', 'choose_response')
    .eq('archived', false).neq('cohort', COHORT).limit(1000)
  if (error) throw error
  const tally = {}
  for (const r of oldRows) tally[r.cohort] = (tally[r.cohort] || 0) + 1
  console.log(`archiving ${oldRows.length} old live CR rows:`, tally)
  const { error: upErr } = await db.from('study_item_bank')
    .update({ archived: true })
    .eq('family', 'toefl').eq('task', 'choose_response')
    .eq('archived', false).neq('cohort', COHORT)
  if (upErr) throw upErr
  const { count } = await db.from('study_item_bank')
    .select('id', { count: 'exact', head: true })
    .eq('family', 'toefl').eq('task', 'choose_response')
    .eq('archived', false)
  console.log(`live unarchived CR after archive: ${count} (must be 132)`)
  if (count !== 132) { console.error('COUNT MISMATCH'); process.exit(1) }
}

async function verify() {
  const { data, error } = await db.from('study_item_bank')
    .select('id, item, cohort, verified, archived, verify_meta, domain, task, topic_tag')
    .eq('cohort', COHORT).limit(1000)
  if (error) throw error
  console.log(`cr-v7 rows in bank: ${data.length}`)
  const byLocal = new Map(items.map(r => [r._crv7.localId, bankItem(r)]))
  // jsonb does not preserve key order, so compare canonically (sorted keys,
  // arrays in place) — every content field must be byte-identical.
  const canon = v => Array.isArray(v) ? v.map(canon)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])]))
      : v
  const picks = [...data].sort(() => Math.random() - 0.5).slice(0, 5)
  let ok = 0
  for (const row of picks) {
    const want = byLocal.get(row.verify_meta?.localId)
    const match = want && JSON.stringify(canon(row.item)) === JSON.stringify(canon(want))
    console.log(`${row.verify_meta?.localId}: byte-match=${match} verified=${row.verified} archived=${row.archived} domain='${row.domain}' task=${row.task}`)
    if (match) ok++
  }
  if (ok !== picks.length) { console.error('BYTE MISMATCH'); process.exit(1) }
}

const cmd = process.argv[2]
if (cmd === 'insert') await insert()
else if (cmd === 'archive') await archive()
else if (cmd === 'verify') await verify()
else { console.error('usage: bank-crv7.mjs insert|archive|verify'); process.exit(1) }
