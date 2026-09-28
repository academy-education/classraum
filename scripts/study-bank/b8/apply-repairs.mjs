#!/usr/bin/env node
/**
 * apply-repairs.mjs [--write]
 *
 * Applies the B8 sign-pair repairs to the live bank: for each item that
 * check-repairs.mjs prints as `ok`, replace the negated-key distractor with
 * the repaired value, update the explanation (and the matching
 * distractor_rationales entry when present), and leave everything else —
 * including choice ORDER, so a shuffled draw is unaffected — untouched.
 *
 * Dry run by default: prints what would change. `--write`:
 *   1. snapshots every touched row's `item` into b8/snapshot-<date>.json
 *      (the rollback: apply-repairs.mjs --rollback <file>), and
 *   2. updates study_item_bank.item for those ids, one row at a time,
 *      re-reading the row first and refusing if its choices no longer match
 *      what the repair was computed against.
 * Also writes b8/repaired.batch.json (batch-shaped) for the options-only
 * attack against a non-v2 control.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
const D = new URL('.', import.meta.url).pathname
const WRITE = process.argv.includes('--write')
const ROLLBACK = process.argv.indexOf('--rollback') >= 0 ? process.argv[process.argv.indexOf('--rollback') + 1] : null
const env = Object.fromEntries(readFileSync(D + '../../../.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

if (ROLLBACK) {
  const snap = JSON.parse(readFileSync(ROLLBACK, 'utf8'))
  let n = 0
  for (const row of snap) { const { error } = await db.from('study_item_bank').update({ item: row.item }).eq('id', row.id); if (error) throw new Error(`${row.id}: ${error.message}`); n++ }
  console.log(`rolled back ${n} rows from ${ROLLBACK}`); process.exit(0)
}

// The checker is the gate: only ids it prints as ok are applied.
// The checker exits 1 whenever any item FAILs; its stdout is still the report.
let reportText = ''
try { reportText = execFileSync('node', [D + 'check-repairs.mjs'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).toString() }
catch (e) { reportText = String(e.stdout ?? ''); if (!reportText) throw e }
const report = reportText.split('\n')
const okIds = new Set(report.filter(l => l.startsWith('ok   ')).map(l => l.slice(5, 13)))
const items = JSON.parse(readFileSync(D + 'sign-pair-items.json', 'utf8'))
const repairs = new Map()
for (const f of ['repair-1.json', 'repair-1b.json', 'repair-2.json', 'repair-3.json', 'repair-4.json', 'repair-5-fix.json']) if (existsSync(D + f)) for (const r of JSON.parse(readFileSync(D + f, 'utf8'))) repairs.set(r.id, r)

const plan = []
for (const it of items) {
  if (!okIds.has(it.id.slice(0, 8))) continue
  const r = repairs.get(it.id); if (!r) continue
  plan.push({ id: it.id, old: r.old, new: r.new, explanation: r.explanation ?? null, rationale: r.rationale ?? null })
}
console.log(`checker ok: ${okIds.size}; planned updates: ${plan.length}${WRITE ? '' : '  (dry run — pass --write)'}`)

const snapshot = [], batch = []
let updated = 0, refused = 0
for (const p of plan) {
  const { data: row, error } = await db.from('study_item_bank').select('id, domain, difficulty, item').eq('id', p.id).single()
  if (error || !row) { console.log(`refuse ${p.id.slice(0, 8)}: cannot read row`); refused++; continue }
  const item = row.item
  const idx = item.choices.findIndex(c => String(c) === String(p.old))
  if (idx < 0) { console.log(`refuse ${p.id.slice(0, 8)}: '${p.old}' no longer among ${JSON.stringify(item.choices)}`); refused++; continue }
  const next = { ...item, choices: item.choices.map((c, i) => i === idx ? String(p.new) : c) }
  if (p.explanation) next.explanation = p.explanation
  if (next.distractor_rationales && typeof next.distractor_rationales === 'object' && !Array.isArray(next.distractor_rationales) && p.old in next.distractor_rationales) {
    const dr = { ...next.distractor_rationales }; delete dr[p.old]; if (p.rationale) dr[String(p.new)] = p.rationale; next.distractor_rationales = dr
  }
  batch.push({ id: p.id, domain: row.domain, difficulty: row.difficulty, prompt: next.prompt, passage: next.passage ?? null, choices: next.choices, correct_answer: next.correct_answer, explanation: next.explanation })
  if (!WRITE) { console.log(`would  ${p.id.slice(0, 8)}: ${p.old} -> ${p.new}   ${JSON.stringify(next.choices)}`); continue }
  snapshot.push({ id: p.id, item })
  const { error: upErr } = await db.from('study_item_bank').update({ item: next }).eq('id', p.id)
  if (upErr) { console.log(`FAILED ${p.id.slice(0, 8)}: ${upErr.message}`); refused++; continue }
  updated++
}
writeFileSync(D + 'repaired.batch.json', JSON.stringify(batch, null, 1))
if (WRITE) {
  const snapPath = D + `snapshot-${new Date().toISOString().slice(0, 10)}.json`
  writeFileSync(snapPath, JSON.stringify(snapshot, null, 1))
  console.log(`updated ${updated}, refused ${refused}; snapshot ${snapPath} (${snapshot.length} rows)`)
} else console.log(`dry run: ${plan.length - refused} applicable, ${refused} refused; wrote repaired.batch.json (${batch.length})`)
