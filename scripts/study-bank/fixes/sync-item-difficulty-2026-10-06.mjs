#!/usr/bin/env node
/**
 * sync-item-difficulty-2026-10-06.mjs [--write | --rollback]   (dry run by default)
 *
 * Makes the jsonb copy `item.difficulty` equal the row column `difficulty`
 * on every study_item_bank row where they disagree.
 *
 * WHY THE ROW COLUMN IS THE SOURCE OF TRUTH. Every draw decision reads it:
 * the practice filter (`.in('difficulty', …)`), the SAT module-2 band
 * (rankByBand), the TOEFL module-2 band tiers and ramp. Regrades wrote it
 * (TOEFL-DIFFICULTY-LABEL.md, scripts/classify-toefl-tasks.ts) and left the
 * copy at the inserter's default, so the 1,450 disagreements of 2026-10-04
 * (BANK-INTEGRITY-2026-10-04.md) are stale copies. Branch `bank-hygiene`
 * makes readBankItem serve the row column (resolveBankDifficulty), so after
 * it ships the copy is read only as a fallback for a null column. This sync
 * is hygiene for scripts and dumps that still read the copy — not needed for
 * serving once the branch is deployed.
 *
 * `difficulty` is not an input to content_sha (076: prompt, passage,
 * correct_answer, choices) or dedup_key (077), so no review or attack goes
 * stale; --write asserts both hashes unchanged.
 *
 * Owner instruction 2026-10-06: dry run only. --write exists, is snapshot-
 * first, and has NOT been run.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const D = new URL('.', import.meta.url).pathname
const SNAP = D + 'snapshot-2026-10-06-item-difficulty.json'
const WRITE = process.argv.includes('--write')
const ROLLBACK = process.argv.includes('--rollback')
const env = Object.fromEntries(readFileSync(D + '../../../.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const BANDS = new Set(['easy', 'medium', 'hard'])

async function readAll() {
  const { count, error: ce } = await db.from('study_item_bank').select('id', { count: 'exact', head: true })
  if (ce) throw new Error(ce.message)
  const rows = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('study_item_bank')
      .select('id,family,section,cohort,verified,archived,difficulty,item,content_sha,dedup_key').order('id').range(f, f + 999)
    if (error) throw new Error(error.message)
    rows.push(...data)
    if (data.length < 1000) break
  }
  if (rows.length !== count || new Set(rows.map(r => r.id)).size !== count) throw new Error(`read ${rows.length}, count ${count}`)
  return rows
}

const rows = await readAll()
const state = r => r.archived ? 'archived' : r.verified ? 'live' : 'staged'
const plan = [], unfixable = []
for (const r of rows) {
  const row = r.difficulty, copy = r.item?.difficulty
  if (row === copy) continue
  if (!BANDS.has(row)) { unfixable.push({ id: r.id, row, copy, state: state(r) }); continue }
  plan.push({ id: r.id, family: r.family, section: r.section, cohort: r.cohort, state: state(r), from: copy ?? null, to: row })
}

const tally = (list, key) => { const t = {}; for (const p of list) { const k = key(p); t[k] = (t[k] ?? 0) + 1 } return Object.entries(t).sort((a, b) => b[1] - a[1]) }
const print = (title, entries) => { console.log(`\n${title}`); for (const [k, n] of entries) console.log(`  ${String(n).padStart(5)}  ${k}`) }

console.log(`population: ${rows.length} rows (count exact) — ${rows.filter(r => state(r) === 'live').length} live, ${rows.filter(r => state(r) === 'staged').length} staged, ${rows.filter(r => state(r) === 'archived').length} archived`)
console.log(`row column ≠ item.difficulty: ${plan.length + unfixable.length}  (syncable ${plan.length}, row column not a band: ${unfixable.length})`)
for (const s of ['live', 'staged', 'archived']) {
  const sub = plan.filter(p => p.state === s)
  if (!sub.length) continue
  print(`${s.toUpperCase()} — ${sub.length} rows, by direction (item copy -> row column)`, tally(sub, p => `item ${p.from ?? '(none)'} -> row ${p.to}`))
}
const live = plan.filter(p => p.state === 'live')
print('LIVE by family/section', tally(live, p => `${p.family}/${p.section}`))
print('LIVE by family/section and direction', tally(live, p => `${p.family}/${p.section}: ${p.from ?? '(none)'} -> ${p.to}`))
print('LIVE by cohort (top 15)', tally(live, p => p.cohort ?? '(null)').slice(0, 15))
if (unfixable.length) print('row column not a band (left alone; readBankItem falls back to the copy)', tally(unfixable, u => `${u.state}: row ${u.row} / item ${u.copy}`))

if (ROLLBACK) {
  if (!existsSync(SNAP)) throw new Error('no snapshot')
  const snap = JSON.parse(readFileSync(SNAP, 'utf8'))
  let n = 0
  for (const s of snap.rows) {
    const { data: cur, error } = await db.from('study_item_bank').select('item').eq('id', s.id).single()
    if (error) throw new Error(error.message)
    const item = { ...cur.item }
    if (s.from === null) delete item.difficulty; else item.difficulty = s.from
    const { error: e2 } = await db.from('study_item_bank').update({ item }).eq('id', s.id)
    if (e2) throw new Error(e2.message)
    n++
  }
  console.log(`\nROLLED BACK item.difficulty on ${n} rows`)
  process.exit(0)
}

if (!WRITE) { console.log('\nDRY RUN — nothing written. (--write is snapshot-first; not authorised as of 2026-10-06.)'); process.exit(0) }

if (existsSync(SNAP)) throw new Error(`snapshot ${SNAP} exists; refusing to overwrite it`)
writeFileSync(SNAP, JSON.stringify({ takenAt: new Date().toISOString(), rows: plan.map(p => ({ id: p.id, from: p.from, to: p.to })) }, null, 1))
const byId = new Map(rows.map(r => [r.id, r]))
let n = 0, bad = 0
for (const p of plan) {
  const r = byId.get(p.id)
  const item = { ...r.item, difficulty: p.to }
  const { data, error } = await db.from('study_item_bank').update({ item }).eq('id', p.id).eq('difficulty', p.to)
    .select('content_sha,dedup_key')
  if (error) throw new Error(error.message)
  if (data.length !== 1) { console.warn(`  ${p.id}: not updated (row column changed)`); continue }
  if (data[0].content_sha !== r.content_sha || data[0].dedup_key !== r.dedup_key) { bad++; console.error(`  ${p.id}: hash moved`) }
  n++
}
console.log(`\nupdated ${n} of ${plan.length}`)
if (bad) { console.error(`${bad} hash change(s)`); process.exit(1) }
