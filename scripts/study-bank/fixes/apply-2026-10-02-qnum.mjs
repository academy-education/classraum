#!/usr/bin/env node
/**
 * apply-2026-10-02-qnum.mjs [--write | --rollback]
 *
 * Register A74 follow-up: item text that names a question by POSITION
 * ("Question 10 asks about the preceding passage as a whole") names the wrong
 * question on any drawn form, because every assembler reorders items.
 *
 * 1. SCAN. Pages the whole non-archived bank (verified AND staged), asserts
 *    loaded rows == the exact count, and runs the SAME detector the insert
 *    gate uses (../question-number-refs.mjs) over every string in `item`
 *    except SVG. Prints hits by family / cohort / verified.
 * 2. PLAN. The hand-checked hit list is pinned below (EXPECTED). The script
 *    refuses if the scan finds a hit not in it, or an expected id is no
 *    longer hit — a pinned list that disagrees with the data is not a plan.
 *    Each edit is one substitution in `prompt`: /^Question \d+ asks/ ->
 *    "This question asks". Key, choices, passage, explanation untouched
 *    (asserted).
 * 3. The snapshot (full rows) is written on the first run, dry run included,
 *    and never overwritten. --write refuses if a live row no longer matches
 *    the snapshot, updates `item`,
 *    re-reads every row and re-scans it.
 *    --rollback: restores `item` from the snapshot.
 *
 * content_sha / dedup_key are GENERATED from `item` (migrations 076/077), so
 * the edit changes content_sha: every review, attack and sweep verdict bound
 * to the old text goes STALE. That is expected and correct — the prompt the
 * reviewer saw is no longer the prompt. The counts are printed below.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { scanValue } from '../question-number-refs.mjs'

const D = new URL('.', import.meta.url).pathname
const SNAP = D + 'snapshot-2026-10-02-qnum.json'
const WRITE = process.argv.includes('--write')
const ROLLBACK = process.argv.includes('--rollback')
const env = Object.fromEntries(readFileSync(D + '../../../.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// Hand-checked 2026-10-02: all 12 hits are the ACT English whole-essay stem
// "Question N asks about the preceding passage as a whole." No other hit in
// 7,357 rows. (Legitimate near-misses — "the third item", Q1/Q3 quartiles,
// "which of the following questions?", SVG hex colours — are excluded by the
// detector itself; see its header.)
const EXPECTED = [
  '1510dd4e-48ef-4ffe-b18a-fd816521bc6a', '4833bf0e-c087-4a0d-aed3-97dd9e0573bd',
  '4dcf790c-8f2d-4ba7-af3d-75373aa5467a', '4e0e4b65-9365-4d4b-9d31-16bffcfd36e9',
  '59c7a865-d2cb-4926-bfb5-dd0ca37d5d2a', '739778fa-e9d5-42e9-b63a-b9c240a46b9b',
  '8fa17bfb-3bcf-49d0-b468-31c439cbf701', '97f5555b-44fa-41c1-a3a1-2e1656b0b4a3',
  'd5cedb22-d73d-45e2-9a6a-6c685a808a09', 'f11cedad-4d00-41ba-8c1e-ab98db2ad56f', // act-english-v1, verified
  '3f042b44-b288-4b69-9b2c-28f90c1da334', 'c8707bfc-d7fd-430c-ac75-be6526759e61', // act-english-v4, staged
]
const STEM = /^Question \d+ asks /

async function pageAll(table, select, tune = q => q) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await tune(db.from(table).select(select)).order('id').range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

async function rowsById(ids) {
  const { data, error } = await db.from('study_item_bank').select('*').in('id', ids)
  if (error) throw new Error(error.message)
  if (data.length !== ids.length) throw new Error(`expected ${ids.length} rows, got ${data.length}`)
  return Object.fromEntries(data.map(r => [r.id, r]))
}

async function bindings(ids) {
  const c = async (t) => {
    const { data, error } = await db.from(t).select('id,item_id').in('item_id', ids)
    if (error) throw new Error(`${t}: ${error.message}`); return data.length
  }
  return {
    reviews: await c('study_item_reviews'), reviewsFresh: await c('study_item_reviews_fresh'),
    attacks: await c('study_item_attacks'), attacksFresh: await c('study_item_attacks_fresh'),
    sweepVerdicts: await c('study_item_sweep_verdicts'),
  }
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

if (ROLLBACK) {
  const snap = JSON.parse(readFileSync(SNAP, 'utf8'))
  for (const r of snap) {
    const { error } = await db.from('study_item_bank').update({ item: r.item }).eq('id', r.id)
    if (error) throw new Error(`${r.id}: ${error.message}`)
  }
  const back = await rowsById(snap.map(r => r.id))
  const bad = snap.filter(r => !same(back[r.id].item, r.item))
  console.log(`rolled back ${snap.length} rows from ${SNAP}; ${bad.length} mismatched after re-read`)
  process.exit(bad.length ? 1 : 0)
}

// ── 1. SCAN ──
const { count, error: cErr } = await db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('archived', false)
if (cErr) throw new Error(cErr.message)
const rows = await pageAll('study_item_bank', 'id,family,section,cohort,verified,item', q => q.eq('archived', false))
if (rows.length !== count || new Set(rows.map(r => r.id)).size !== count) {
  console.error(`REFUSING: loaded ${rows.length} rows (${new Set(rows.map(r => r.id)).size} distinct) but the live count is ${count}`); process.exit(2)
}
let strings = 0
const hitRows = []
for (const r of rows) {
  const s = scanValue(r.item, 'item'); strings += s.strings
  if (s.hits.length) hitRows.push({ ...r, hits: s.hits })
}
console.log(`scanned ${rows.length} of ${count} non-archived rows (${strings} strings): ${hitRows.length} row(s) with a question-number reference`)
const tally = {}
for (const r of hitRows) { const k = `${r.family}/${r.cohort} ${r.verified ? 'verified' : 'staged'}`; tally[k] = (tally[k] || 0) + 1 }
for (const [k, n] of Object.entries(tally).sort()) console.log(`  ${String(n).padStart(3)}  ${k}`)
for (const r of hitRows) for (const h of r.hits) console.log(`    ${r.id.slice(0, 8)} ${h.path}: "${h.match}"`)

// ── 2. PLAN ──
const hitIds = new Set(hitRows.map(r => r.id))
const unexpected = [...hitIds].filter(id => !EXPECTED.includes(id))
const missing = EXPECTED.filter(id => !hitIds.has(id))
const alreadyFixed = []
if (missing.length) {
  // a missing id is fine only if it already carries the planned text (re-run after --write)
  const cur = await rowsById(missing)
  for (const id of missing) if (/^This question asks /.test(cur[id].item.prompt)) alreadyFixed.push(id)
}
const reallyMissing = missing.filter(id => !alreadyFixed.includes(id))
if (unexpected.length || reallyMissing.length) {
  console.error(`REFUSING: scan disagrees with the hand-checked list — unexpected ${unexpected.join(', ') || 'none'}; missing ${reallyMissing.join(', ') || 'none'}`); process.exit(2)
}
if (alreadyFixed.length) console.log(`already fixed: ${alreadyFixed.length}`)

const live = await rowsById(EXPECTED)
const plan = []
for (const id of EXPECTED) {
  const from = live[id].item
  if (alreadyFixed.includes(id)) continue
  if (!STEM.test(from.prompt)) throw new Error(`${id}: prompt does not start with "Question N asks": ${from.prompt.slice(0, 60)}`)
  const to = { ...from, prompt: from.prompt.replace(STEM, 'This question asks ') }
  for (const k of Object.keys(from)) if (k !== 'prompt' && !same(from[k], to[k])) throw new Error(`${id}: ${k} changed`)
  if (scanValue(to, 'item').hits.length) throw new Error(`${id}: planned text still has a reference`)
  plan.push({ id, from, to })
  console.log(`  ${id.slice(0, 8)} ${live[id].cohort}  "${from.prompt.slice(0, 40)}…" -> "${to.prompt.slice(0, 40)}…"`)
}

const before = await bindings(EXPECTED)
console.log(`bound to these ${EXPECTED.length} rows: reviews ${before.reviews} (fresh ${before.reviewsFresh}), attacks ${before.attacks} (fresh ${before.attacksFresh}), sweep verdicts ${before.sweepVerdicts}`)
console.log(`→ the edit makes the ${before.reviewsFresh} fresh review(s) and ${before.attacksFresh} fresh attack(s) STALE (migration 076/077). Expected: they judged the old prompt.`)

// Snapshot BEFORE anything else, dry run included, and never overwrite it.
if (!existsSync(SNAP)) {
  if (alreadyFixed.length) { console.error('REFUSING: no snapshot but some rows are already fixed; the pre-edit text is not recoverable from live'); process.exit(2) }
  writeFileSync(SNAP, JSON.stringify(EXPECTED.map(id => live[id]), null, 1) + '\n')
  console.log(`snapshot written: ${SNAP} (${EXPECTED.length} full rows)`)
}

if (!WRITE) { console.log(`\nDRY RUN — ${plan.length} row(s) would change. Re-run with --write.`); process.exit(0) }

// ── 3. WRITE ──
const snap = Object.fromEntries(JSON.parse(readFileSync(SNAP, 'utf8')).map(r => [r.id, r]))
for (const p of plan) {
  if (!snap[p.id] || !same(snap[p.id].item, p.from)) { console.error(`REFUSING: ${p.id} live row no longer matches the snapshot`); process.exit(2) }
}
for (const p of plan) {
  const { error } = await db.from('study_item_bank').update({ item: p.to }).eq('id', p.id)
  if (error) throw new Error(`${p.id}: ${error.message}`)
}
const after = await rowsById(EXPECTED)
let bad = 0
for (const id of EXPECTED) {
  const exp = { ...snap[id].item, prompt: snap[id].item.prompt.replace(STEM, 'This question asks ') }
  if (!same(after[id].item, exp)) { console.error(`MISMATCH after write: ${id}`); bad++ }
  if (scanValue(after[id].item, 'item').hits.length) { console.error(`STILL HIT after write: ${id}`); bad++ }
  if (after[id].content_sha === snap[id].content_sha) { console.error(`content_sha unchanged: ${id}`); bad++ }
}
const post = await bindings(EXPECTED)
console.log(`wrote ${plan.length}; re-read ${EXPECTED.length}: ${bad} problem(s). Now fresh: reviews ${post.reviewsFresh}/${post.reviews}, attacks ${post.attacksFresh}/${post.attacks}`)
process.exit(bad ? 1 : 0)
