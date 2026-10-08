#!/usr/bin/env node
/**
 * sync-rw-item-domain-2026-10-09.mjs [--write | --rollback]   (dry run by default)
 *
 * On LIVE sat/reading_writing rows, makes the jsonb copies `item.domain` and
 * `item.difficulty` equal the row columns `domain` and `difficulty`.
 * Measured 2026-10-09: 120 domain + 70 difficulty disagreements, 182 rows
 * (8 carry both), all cohort `v2`.
 *
 * WHY THE ROW IS RIGHT. The 2026-09-12 R&W refiling moved the column and left
 * the copy. Every mismatched domain is a subskill that belongs to the ROW's
 * domain (Inferences / Command of Evidence: row I&I, copy C&S; Text Structure
 * and Purpose / Cross-Text Connections: row C&S, copy I&I). assembleFromBank
 * groups by the row; readBankItem already serves the row difficulty
 * (resolveBankDifficulty) but still serves the COPY as Question.domain.
 *
 * WHAT READS THE COPY (grep of src/, 2026-10-09). Nothing a student or
 * teacher sees: camp reports/dashboards, the /bank browser and the admin QC
 * pages all read the row column, and no results screen or analytics groups
 * on Question.domain (section-breakdown.ts groups on prompt prefixes / type).
 * The copy reaches the client inside the served Question and the stored test
 * payload, unread. Scripts read it — verify-sat-hard-route.ts did until
 * 2026-10-09, which is how "form 9 is short in I&I" was printed.
 *
 * Neither field is an input to content_sha (076: prompt, passage,
 * correct_answer, choices) or dedup_key (077/078), so no review, attack or
 * sweep verdict goes stale. --write asserts both hashes unchanged per row.
 *
 * Out of scope, reported only: 35 live R&W rows whose jsonb `subskill`
 * differs from the column (none overlap the domain set); jsonb difficulty
 * elsewhere (sync-item-difficulty-2026-10-06.mjs covers it bank-wide); the
 * 28 TOEFL harvest-v1 reading rows with a domain mismatch (for TOEFL the
 * column and the task tag mean different things — bank-qc.ts familyForTask).
 *
 * Modes, as apply-2026-10-04-integrity.mjs:
 *   (none)      dry run. Writes the snapshot on the FIRST run only (full row
 *               fields it touches), never overwrites it, changes no row.
 *   --write     refuses unless every planned row still matches the snapshot;
 *               updates `item` with guards on the row columns; checks hashes.
 *   --rollback  restores `item` from the snapshot, refusing rows changed since.
 *
 * NOT RUN with --write. Owner decision.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const D = new URL('.', import.meta.url).pathname
const SNAP = D + 'snapshot-2026-10-09-rw-item-domain.json'
const WRITE = process.argv.includes('--write')
const ROLLBACK = process.argv.includes('--rollback')
if (WRITE && ROLLBACK) { console.error('REFUSING: --write and --rollback together'); process.exit(2) }
const env = Object.fromEntries(readFileSync(D + '../../../.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const BANDS = new Set(['easy', 'medium', 'hard'])
const RW_DOMAINS = new Set(['Craft and Structure', 'Information and Ideas', 'Standard English Conventions', 'Expression of Ideas'])
const COLS = 'id,cohort,domain,subskill,difficulty,item,content_sha,dedup_key'
const scope = q => q.eq('family', 'sat').eq('section', 'reading_writing').eq('verified', true).eq('archived', false)

async function readLive() {
  const { count, error: ce } = await scope(db.from('study_item_bank').select('id', { count: 'exact', head: true }))
  if (ce) throw new Error(ce.message)
  const rows = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await scope(db.from('study_item_bank').select(COLS)).order('id').range(f, f + 999)
    if (error) throw new Error(error.message)
    rows.push(...data)
    if (data.length < 1000) break
  }
  if (!count || rows.length !== count || new Set(rows.map(r => r.id)).size !== count) {
    throw new Error(`REFUSING: read ${rows.length} rows, count exact ${count} — not a measurement`)
  }
  return rows
}

function planFor(r) {
  const it = r.item ?? {}
  const set = {}
  if ('domain' in it && it.domain !== r.domain) {
    if (!RW_DOMAINS.has(r.domain)) throw new Error(`${r.id}: row domain ${r.domain} is not an R&W domain`)
    set.domain = { from: it.domain, to: r.domain }
  }
  if ('difficulty' in it && it.difficulty !== r.difficulty) {
    if (!BANDS.has(r.difficulty)) throw new Error(`${r.id}: row difficulty ${r.difficulty} is not a band`)
    set.difficulty = { from: it.difficulty, to: r.difficulty }
  }
  return Object.keys(set).length ? set : null
}

const live = await readLive()
const plan = live.flatMap(r => { const s = planFor(r); return s ? [{ r, s }] : [] })
const tally = (list, key) => { const t = {}; for (const x of list) { const k = key(x); t[k] = (t[k] ?? 0) + 1 } return Object.entries(t).sort((a, b) => b[1] - a[1]) }
const print = (title, entries) => { console.log(`\n${title}`); for (const [k, n] of entries) console.log(`  ${String(n).padStart(5)}  ${k}`) }
const dom = plan.filter(p => p.s.domain), dif = plan.filter(p => p.s.difficulty)

console.log(`live sat/reading_writing: ${live.length} rows (count exact)`)
console.log(`rows to change: ${plan.length}   item.domain ${dom.length}   item.difficulty ${dif.length}   both ${plan.filter(p => p.s.domain && p.s.difficulty).length}`)
print('item.domain (copy -> row), by subskill', tally(dom, p => `${p.s.domain.from} -> ${p.s.domain.to}  [${p.r.subskill}, ${p.r.difficulty}]`))
print('item.difficulty (copy -> row), by row domain', tally(dif, p => `${p.r.domain}: ${p.s.difficulty.from} -> ${p.s.difficulty.to}`))
print('by cohort', tally(plan, p => p.r.cohort ?? '(null)'))
const sub = live.filter(r => r.item && 'subskill' in r.item && r.item.subskill !== r.subskill)
console.log(`\nnot touched: ${sub.length} live rows with item.subskill != column subskill (${sub.filter(r => planFor(r)?.domain).length} overlap the domain set)`)

// Evidence bound to these rows. The hashes do not read domain/difficulty, so
// "fresh now" must equal "fresh after"; printed so the claim is checkable.
async function bound(table, ids) {
  const out = []
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db.from(table).select('item_id,item_sha').in('item_id', ids.slice(i, i + 200))
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...data)
  }
  return out
}
const ids = plan.map(p => p.r.id)
const shaOf = new Map(plan.map(p => [p.r.id, p.r.content_sha]))
for (const t of ['study_item_reviews', 'study_item_attacks', 'study_item_sweep_verdicts']) {
  const b = await bound(t, ids)
  console.log(`${t}: ${b.length} rows on these items, ${b.filter(x => x.item_sha === shaOf.get(x.item_id)).length} fresh (content_sha unaffected by this sync)`)
}

if (ROLLBACK) {
  if (!existsSync(SNAP)) throw new Error('REFUSING: no snapshot')
  const snap = JSON.parse(readFileSync(SNAP, 'utf8')).rows
  let n = 0, skipped = 0
  for (const s of snap) {
    const { data: cur, error } = await db.from('study_item_bank').select('item').eq('id', s.id).single()
    if (error) throw new Error(error.message)
    const expect = { ...s.item }
    for (const [k, v] of Object.entries(s.set)) expect[k] = v.to
    if (!same(cur.item, expect)) { skipped++; console.warn(`  ${s.id}: item changed since --write, left alone`); continue }
    const { error: e2 } = await db.from('study_item_bank').update({ item: s.item }).eq('id', s.id)
    if (e2) throw new Error(e2.message)
    n++
  }
  console.log(`\nROLLED BACK ${n} of ${snap.length} rows from ${SNAP}${skipped ? `; ${skipped} skipped` : ''}`)
  process.exit(skipped ? 1 : 0)
}

if (!existsSync(SNAP)) {
  writeFileSync(SNAP, JSON.stringify({ takenAt: new Date().toISOString(), rows: plan.map(p => ({
    id: p.r.id, cohort: p.r.cohort, domain: p.r.domain, difficulty: p.r.difficulty,
    content_sha: p.r.content_sha, dedup_key: p.r.dedup_key, set: p.s, item: p.r.item,
  })) }, null, 1) + '\n')
  console.log(`\nsnapshot written: ${SNAP} (${plan.length} rows)`)
}

if (!WRITE) { console.log(`\nDRY RUN — ${plan.length} row(s) would change, nothing written to the bank. (--write not authorised as of 2026-10-09.)`); process.exit(0) }

// ── WRITE ──
const snap = new Map(JSON.parse(readFileSync(SNAP, 'utf8')).rows.map(s => [s.id, s]))
const drift = plan.filter(p => !snap.has(p.r.id) || !same(snap.get(p.r.id).item, p.r.item))
  .concat([...snap.keys()].filter(id => !plan.some(p => p.r.id === id)).map(id => ({ r: { id } })))
if (drift.length) { console.error(`REFUSING: ${drift.length} row(s) differ from the snapshot (e.g. ${drift[0].r.id}); move the snapshot aside and re-run the dry run`); process.exit(1) }
let n = 0, bad = 0, missed = 0
for (const { r, s } of plan) {
  const item = { ...r.item }
  for (const [k, v] of Object.entries(s)) item[k] = v.to
  const { data, error } = await db.from('study_item_bank').update({ item })
    .eq('id', r.id).eq('domain', r.domain).eq('difficulty', r.difficulty)
    .select('content_sha,dedup_key')
  if (error) throw new Error(error.message)
  if (data.length !== 1) { missed++; console.warn(`  ${r.id}: not updated (row column changed)`); continue }
  if (data[0].content_sha !== r.content_sha || data[0].dedup_key !== r.dedup_key) { bad++; console.error(`  ${r.id}: hash moved`) }
  n++
}
console.log(`\nupdated ${n} of ${plan.length}${missed ? `, ${missed} skipped` : ''}`)
if (bad || missed) { console.error(`${bad} hash change(s), ${missed} skipped — run --rollback`); process.exit(1) }
