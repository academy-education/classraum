#!/usr/bin/env node
/**
 * make-adv20-oo.mjs <candidate.batch.json> --tag NAME [--pool]
 *
 * Options-only render for sat-math-v20-adv with a COMPOSITION-MATCHED live
 * control. make-oo-render.mjs matches domain, width and one band; this batch is
 * commissioned MIXED (hard + medium) and ALL-NUMERIC, so the control must match
 * both: for each band, as many live items as there are candidates labelled
 * that band, and only option sets the key-extremity evaluator can read as
 * numbers (scoreItem, the same parse the gate uses). Advanced Math carries many
 * expression option sets; a control padded with them describes a different
 * regime from an all-numeric candidate.
 *
 * Pool: sat / math / Advanced Math, verified, not archived, 4 choices with the
 * key among them, cohort NOT in EXCLUDE (v2 carries the +-pair tell, A66/A68;
 * the session cohorts are excluded so a control is never this month's work).
 * Keys dealt round-robin per arm (flat), then interleaved with the shared
 * seeded shuffle and renumbered so nothing marks the arm. Writes
 * <tag>-oo.blind.json / <tag>-oo.key.json with `kind` per item for score-oo.
 *
 * --pool   print the eligible pool by band and exit (no files written).
 * Refuses (exit 2) on an empty/short pool, unreadable input, or a candidate
 * whose key is not among its choices. Run from the repo root.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
import { scoreItem } from './key-extremity-breakdown.mjs'

const EXCLUDE = new Set(['v2', 'sat-math-v17-adv', 'sat-math-v18-adv', 'sat-math-v18-alg', 'sat-math-v19-alg', 'sat-math-v20-adv'])
const args = process.argv.slice(2)
const path = args.find(a => !a.startsWith('--') && a.endsWith('.json'))
const ti = args.indexOf('--tag'); const tag = ti >= 0 ? args[ti + 1] : null
const poolOnly = args.includes('--pool')
if (!path || !existsSync(path) || (!tag && !poolOnly)) { console.error('usage: make-adv20-oo.mjs <batch.json> --tag NAME [--pool]'); process.exit(2) }
const batch = JSON.parse(readFileSync(path, 'utf8'))
if (!Array.isArray(batch) || !batch.length) { console.error('REFUSING: batch holds no items'); process.exit(2) }

const { createClient } = await import('@supabase/supabase-js')
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,cohort,difficulty,item')
    .eq('family', 'sat').eq('section', 'math').eq('domain', 'Advanced Math')
    .eq('verified', true).eq('archived', false).order('id', { ascending: true }).range(f, f + 999)
  if (error) throw new Error(error.message)
  rows.push(...data); if (data.length < 1000) break
}
if (!rows.length || new Set(rows.map(r => r.id)).size !== rows.length) { console.error('REFUSING: empty or slipped paging'); process.exit(2) }
const why = { width: 0, cohort: 0, nonnum: 0 }
const pool = { hard: [], medium: [], easy: [] }
for (const r of rows) {
  const ch = (r.item?.choices ?? []).map(String)
  if (ch.length !== 4 || !ch.includes(String(r.item?.correct_answer ?? ''))) { why.width++; continue }
  if (EXCLUDE.has(r.cohort)) { why.cohort++; continue }
  if (scoreItem(ch, String(r.item.correct_answer)).skip) { why.nonnum++; continue }
  ;(pool[r.difficulty] ??= []).push(r)
}
console.log(`live Advanced Math ${rows.length}: dropped ${why.width} width/key, ${why.cohort} excluded cohort, ${why.nonnum} non-numeric => eligible hard ${pool.hard.length}, medium ${pool.medium.length}, easy ${pool.easy.length}`)
if (poolOnly) process.exit(0)

const need = {}
for (const it of batch) {
  if (!['hard', 'medium'].includes(it.difficulty)) { console.error(`REFUSING: ${it.id} band '${it.difficulty}'`); process.exit(2) }
  if (!(it.choices ?? []).map(String).includes(String(it.correct_answer))) { console.error(`REFUSING: ${it.id} key not among choices`); process.exit(2) }
  need[it.difficulty] = (need[it.difficulty] ?? 0) + 1
}
const rand = rng(20261002)
const shuffle = a => shuffleWith(a.slice(), rand)
const control = []
for (const [band, n] of Object.entries(need)) {
  if (pool[band].length < n) { console.error(`REFUSING: need ${n} ${band}, ${pool[band].length} eligible`); process.exit(2) }
  control.push(...shuffle(pool[band]).slice(0, n))
}
const SLOT = ['A', 'B', 'C', 'D']
const entries = []
const deal = (choices, keyStr, i) => {
  const ch = choices.map(String); const ci = ch.indexOf(String(keyStr)); const want = SLOT[i % 4]
  const rest = shuffle(ch.filter((_, j) => j !== ci)); let r = 0
  return { want, options: Object.fromEntries(SLOT.map(sl => [sl, sl === want ? ch[ci] : rest[r++]])) }
}
batch.forEach((it, i) => { const d = deal(it.choices, it.correct_answer, i); entries.push({ blind: { options: d.options }, key: { letter: d.want, localId: it.id, domain: it.domain, difficulty: it.difficulty, kind: 'candidate' } }) })
control.forEach((r, i) => { const d = deal(r.item.choices, r.item.correct_answer, i); entries.push({ blind: { options: d.options }, key: { letter: d.want, localId: r.id, cohort: r.cohort, domain: 'Advanced Math', difficulty: r.difficulty, kind: 'live-control' } }) })
const order = shuffle(entries)
const blind = {}, key = {}
order.forEach((e, i) => { const id = `L${String(i + 1).padStart(2, '0')}`; blind[id] = e.blind; key[id] = e.key })
const bf = `scripts/study-bank/${tag}-oo.blind.json`, kf = `scripts/study-bank/${tag}-oo.key.json`
writeFileSync(bf, JSON.stringify(blind, null, 1) + '\n'); writeFileSync(kf, JSON.stringify(key, null, 1) + '\n')
for (const arm of ['candidate', 'live-control']) {
  const d = {}, b = {}; for (const k of Object.values(key)) if (k.kind === arm) { d[k.letter] = (d[k.letter] ?? 0) + 1; b[k.difficulty] = (b[k.difficulty] ?? 0) + 1 }
  console.log(`  ${arm.padEnd(13)} bands ${JSON.stringify(b)} deal ${JSON.stringify(d)}`)
}
console.log(`  control cohorts ${JSON.stringify(control.reduce((m, r) => (m[r.cohort] = (m[r.cohort] ?? 0) + 1, m), {}))}`)
console.log(`  blind sha ${createHash('sha256').update(readFileSync(bf)).digest('hex').slice(0, 16)}\n  wrote ${bf}\n  wrote ${kf}`)
