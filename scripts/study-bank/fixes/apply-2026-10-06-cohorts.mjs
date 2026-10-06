#!/usr/bin/env node
/**
 * apply-2026-10-06-cohorts.mjs [--write | --rollback]
 *
 * Relabels the `cohort` COLUMN ONLY on 146 rows that verbal-bank-helper
 * inserted under its default label (`${family}-verbal-v1`, used whenever
 * BANK_COHORT was not set). BANK-INTEGRITY-2026-10-04.md §4 / REGISTER §5.
 *
 *   ssat-verbal-v1  75 rows, inserted 2026-09-20 ~15h UTC  -> ssat-verbal-a7
 *   ssat-verbal-v1  58 rows, inserted 2026-09-21 ~07h UTC  -> ssat-verbal-s8ab
 *   isee-verbal-v1  13 rows, inserted 2026-09-21 ~07h UTC  -> isee-verbal-s14
 *
 * Evidence, all three must agree or the script refuses:
 *   1. ledger.json names the cohort: ssat-verbal-a7-kept-2026-09-21
 *      (cohort "ssat-verbal-a7"), ssat-verbal-s8ab-kept-2026-09-21
 *      ("ssat-verbal-s8ab"), isee-verbal-s14-kept-2026-09-21 ("isee-verbal-s14"),
 *      and the content sha of the kept file is the one the ledger recorded.
 *   2. every row's (prompt, correct_answer) is in that kept batch file, and the
 *      kept file's item count equals the number of rows (75 / 58 / 13).
 *   3. created_at sits inside the insert window, and the row carries the
 *      newer verify_meta schema (graded_difficulty) the 09-20/21 helper wrote;
 *      the 21 + 22 genuine v1 rows (2026-08-28) carry the older one.
 *
 * `cohort` is NOT an input to content_sha (migration 076: prompt, passage,
 * correct_answer, choices of `item`) or dedup_key (077: also `item` only), so
 * no review or attack goes stale. Asserted after the write: content_sha,
 * dedup_key and content_hash unchanged on every touched row, and the fresh
 * review/attack counts unchanged. No serving path reads `cohort` (admin and
 * /bank display only).
 *
 * Snapshot written on the first run (dry run included), never overwritten.
 * --write refuses if a planned row no longer has its snapshot cohort.
 * --rollback restores `cohort` from the snapshot.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const D = new URL('.', import.meta.url).pathname
const BANK = D + '../'
const SNAP = D + 'snapshot-2026-10-06-cohorts.json'
const WRITE = process.argv.includes('--write')
const ROLLBACK = process.argv.includes('--rollback')
const env = Object.fromEntries(readFileSync(D + '../../../.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const PLAN = [
  { from: 'ssat-verbal-v1', to: 'ssat-verbal-a7', kept: 'ssat-verbal-a7.kept.batch.json', ledger: 'ssat-verbal-a7-kept-2026-09-21', window: ['2026-09-20T14:00', '2026-09-20T17:00'], n: 75 },
  { from: 'ssat-verbal-v1', to: 'ssat-verbal-s8ab', kept: 'ssat-verbal-s8ab.kept.batch.json', ledger: 'ssat-verbal-s8ab-kept-2026-09-21', window: ['2026-09-21T06:00', '2026-09-21T09:00'], n: 58 },
  { from: 'isee-verbal-v1', to: 'isee-verbal-s14', kept: 'isee-verbal-s14.kept.batch.json', ledger: 'isee-verbal-s14-kept-2026-09-21', window: ['2026-09-21T06:00', '2026-09-21T09:00'], n: 13 },
]
const GENUINE_V1 = { 'ssat-verbal-v1': 21, 'isee-verbal-v1': 22 }

const norm = s => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
const sig = it => `${norm(it.prompt)}\u0001${norm(it.correct_answer)}`
const COLS = 'id,family,section,cohort,created_at,verify_meta,item,content_sha,dedup_key,content_hash,verified,archived'

async function rowsOf(cohort) {
  const { data, error } = await db.from('study_item_bank').select(COLS).eq('cohort', cohort).order('id')
  if (error) throw new Error(error.message)
  if (data.length >= 1000) throw new Error('page cap reached; page this read')
  return data
}

async function freshCounts(ids) {
  const c = async t => {
    let n = 0
    for (let i = 0; i < ids.length; i += 100) {
      const { data, error } = await db.from(t).select('id').in('item_id', ids.slice(i, i + 100))
      if (error) throw new Error(`${t}: ${error.message}`)
      n += data.length
    }
    return n
  }
  return { reviews: await c('study_item_reviews'), reviewsFresh: await c('study_item_reviews_fresh'),
    attacks: await c('study_item_attacks'), attacksFresh: await c('study_item_attacks_fresh') }
}

function buildPlan(byCohort) {
  const ledger = JSON.parse(readFileSync(BANK + 'ledger.json', 'utf8'))
  const out = []
  const claimed = new Set()
  for (const p of PLAN) {
    const L = (ledger.batches || []).find(b => b.id === p.ledger)
    if (!L || L.cohort !== p.to) throw new Error(`ledger ${p.ledger} missing or names cohort ${L?.cohort}, not ${p.to}`)
    const sha = createHash('sha256').update(readFileSync(BANK + p.kept)).digest('hex')
    if (sha !== L.contentSha) throw new Error(`${p.kept} sha ${sha.slice(0, 10)} != ledger ${L.contentSha.slice(0, 10)}`)
    const kept = JSON.parse(readFileSync(BANK + p.kept, 'utf8'))
    const items = Array.isArray(kept) ? kept : kept.items
    if (items.length !== p.n) throw new Error(`${p.kept} holds ${items.length}, expected ${p.n}`)
    const keptSigs = new Set(items.map(sig))
    const rows = byCohort[p.from].filter(r => r.created_at >= p.window[0] && r.created_at < p.window[1])
    if (rows.length !== p.n) throw new Error(`${p.from} in ${p.window.join('..')}: ${rows.length} rows, expected ${p.n}`)
    for (const r of rows) {
      if (!keptSigs.has(sig(r.item))) throw new Error(`${r.id} (${r.item.prompt}) not in ${p.kept}`)
      if (!('graded_difficulty' in (r.verify_meta || {}))) throw new Error(`${r.id} lacks the 09-20/21 verify_meta schema`)
      if (claimed.has(r.id)) throw new Error(`${r.id} claimed twice`)
      claimed.add(r.id)
      out.push({ id: r.id, from: p.from, to: p.to })
    }
    // every kept item is accounted for by exactly one row
    const rowSigs = new Set(rows.map(r => sig(r.item)))
    const missing = items.filter(it => !rowSigs.has(sig(it)))
    if (missing.length) throw new Error(`${missing.length} kept item(s) of ${p.kept} have no row`)
  }
  for (const [c, n] of Object.entries(GENUINE_V1)) {
    const left = byCohort[c].filter(r => !claimed.has(r.id))
    if (left.length !== n) throw new Error(`${c} would keep ${left.length} rows, expected ${n} genuine v1`)
    if (left.some(r => 'graded_difficulty' in (r.verify_meta || {}) || r.created_at >= '2026-09-01')) throw new Error(`${c}: a remaining row looks like a later batch`)
  }
  return out
}

const byCohort = {}
for (const c of ['ssat-verbal-v1', 'isee-verbal-v1', ...PLAN.map(p => p.to)]) byCohort[c] = await rowsOf(c)

if (ROLLBACK) {
  if (!existsSync(SNAP)) throw new Error('no snapshot')
  const snap = JSON.parse(readFileSync(SNAP, 'utf8'))
  let n = 0
  for (const s of snap.rows) {
    const { error, data } = await db.from('study_item_bank').update({ cohort: s.cohort }).eq('id', s.id).select('id')
    if (error) throw new Error(error.message)
    n += data.length
  }
  console.log(`ROLLED BACK cohort on ${n} of ${snap.rows.length} rows`)
  process.exit(0)
}

const already = PLAN.map(p => byCohort[p.to].length)
if (already.some(n => n) && !existsSync(SNAP)) throw new Error(`target cohorts already hold rows (${already.join('/')}) and there is no snapshot`)

if (!existsSync(SNAP)) {
  const plan = buildPlan(byCohort)
  const ids = new Set(plan.map(p => p.id))
  const rows = [...byCohort['ssat-verbal-v1'], ...byCohort['isee-verbal-v1']].filter(r => ids.has(r.id))
  writeFileSync(SNAP, JSON.stringify({ takenAt: new Date().toISOString(), plan, rows: rows.map(r => ({
    id: r.id, cohort: r.cohort, content_sha: r.content_sha, dedup_key: r.dedup_key, content_hash: r.content_hash,
    itemMd5: createHash('md5').update(JSON.stringify(r.item)).digest('hex'),
  })) }, null, 1))
  console.log(`snapshot written: ${SNAP} (${rows.length} rows)`)
}
const snap = JSON.parse(readFileSync(SNAP, 'utf8'))
const tally = {}
for (const p of snap.plan) tally[`${p.from} -> ${p.to}`] = (tally[`${p.from} -> ${p.to}`] ?? 0) + 1
console.log('plan:', tally, `total ${snap.plan.length}`)

if (!WRITE) {
  // dry run re-derives the plan and confirms it equals the snapshot's
  if (!already.some(n => n)) {
    const again = buildPlan(byCohort)
    if (JSON.stringify(again) !== JSON.stringify(snap.plan)) throw new Error('re-derived plan differs from snapshot plan')
    console.log('re-derived plan matches the snapshot')
  }
  console.log('DRY RUN — pass --write to apply')
  process.exit(0)
}

const ids = snap.plan.map(p => p.id)
const before = await freshCounts(ids)
let n = 0
for (const p of snap.plan) {
  const { data, error } = await db.from('study_item_bank').update({ cohort: p.to }).eq('id', p.id).eq('cohort', p.from).select('id')
  if (error) throw new Error(error.message)
  if (data.length !== 1) console.warn(`  ${p.id}: not updated (cohort no longer ${p.from})`)
  n += data.length
}
console.log(`updated cohort on ${n} of ${snap.plan.length}`)

// verify
const snapBy = new Map(snap.rows.map(r => [r.id, r]))
let bad = 0
for (let i = 0; i < ids.length; i += 100) {
  const { data, error } = await db.from('study_item_bank').select(COLS).in('id', ids.slice(i, i + 100))
  if (error) throw new Error(error.message)
  for (const r of data) {
    const s = snapBy.get(r.id), want = snap.plan.find(p => p.id === r.id).to
    if (r.cohort !== want) { bad++; console.error(`  ${r.id} cohort ${r.cohort}, want ${want}`) }
    if (r.content_sha !== s.content_sha || r.dedup_key !== s.dedup_key || r.content_hash !== s.content_hash) { bad++; console.error(`  ${r.id} hash moved`) }
    if (createHash('md5').update(JSON.stringify(r.item)).digest('hex') !== s.itemMd5) { bad++; console.error(`  ${r.id} item changed`) }
  }
}
const after = await freshCounts(ids)
if (JSON.stringify(before) !== JSON.stringify(after)) { bad++; console.error('evidence counts moved', before, after) }
console.log('evidence on touched rows (before = after):', after)
for (const c of ['ssat-verbal-v1', 'isee-verbal-v1', ...PLAN.map(p => p.to)]) console.log(`  ${c}: ${(await rowsOf(c)).length} rows`)
if (bad) { console.error(`${bad} verification failure(s)`); process.exit(1) }
console.log('verified: cohort only; content_sha, dedup_key, content_hash, item unchanged')
