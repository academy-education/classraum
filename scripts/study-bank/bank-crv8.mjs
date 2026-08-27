/**
 * bank-crv8.mjs — ship of the cr-v8 Choose a Response cohort (run 2 of
 * the cr-v7 method; CRV8-PREREGISTERED.md, CRV8-RESULT.md).
 *
 * Same deliberate path as bank-crv7.mjs and NOT insert-listening: that
 * helper re-shuffles choices at insert, which would replace the
 * flat-dealt letters both blind attacks measured. Unlike cr-v7's ship,
 * there is NO archive step — cr-v7 stays live; cr-v8 adds to it.
 *
 *   node scripts/study-bank/bank-crv8.mjs insert
 *   node scripts/study-bank/bank-crv8.mjs verify
 */
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { gateBatch } from './gate.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ITEMS_FILE = join(HERE, 'crv8-items.json')
const COHORT = 'cr-v8'

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
if (items.length !== 46) { console.error(`expected 46 items, file has ${items.length}`); process.exit(1) }

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
        source: 'crv8', shipped: '2026-08-28', passage_needed: true,
        method: 'crv7-symmetric-worlds+seeded-key+blind-attack',
        localId: raw._crv7?.localId ?? null,
      },
    })
    if (error) { console.error(`ERR idx ${i}: ${error.message}`); process.exit(1) }
    seen.add(content_hash); inserted++
  }
  console.log(`inserted ${inserted}, dup-skipped ${dup}`)
  const { count } = await db.from('study_item_bank')
    .select('id', { count: 'exact', head: true })
    .eq('family', 'toefl').eq('task', 'choose_response').eq('archived', false)
  console.log(`live unarchived Choose a Response: ${count}`)
}

async function verify() {
  const picks = [3, 11, 22, 33, 44]
  const { data } = await db.from('study_item_bank').select('item').eq('cohort', COHORT)
  let ok = 0
  for (const i of picks) {
    const fileIt = bankItem(items[i])
    const hit = (data || []).find(r => r.item.passage === fileIt.passage)
    if (!hit) { console.error(`idx ${i}: no row matches passage`); continue }
    // Deep canonicalization — Postgres jsonb reorders NESTED object keys
    // too, so a top-level-only sort reports false mismatches.
    const canon = v => Array.isArray(v) ? v.map(canon)
      : v && typeof v === 'object' ? Object.keys(v).sort().reduce((a, k) => (a[k] = canon(v[k]), a), {})
      : v
    if (JSON.stringify(canon(hit.item)) === JSON.stringify(canon(fileIt))) ok++
    else console.error(`idx ${i}: row differs from file`)
  }
  console.log(`verify: ${ok}/${picks.length} sampled rows byte-identical (canonical JSON)`)
}

const cmd = process.argv[2]
if (cmd === 'insert') await insert()
else if (cmd === 'verify') await verify()
else { console.error('usage: bank-crv8.mjs insert|verify'); process.exit(1) }
