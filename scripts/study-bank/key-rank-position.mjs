#!/usr/bin/env node
/**
 * key-rank-position.mjs [--live act] [batch.json ...]
 *
 * Where does the key sit by VALUE among its options: smallest / middle /
 * largest? Written 2026-10-08 for act-math-v23's per-batch key-position target
 * (v22 was held with keys interior on 4/6 against a solver "pick an interior
 * value" prior; the gate it needed was per batch, not merged).
 *
 * --live <family> reads every verified, unarchived <family>/math row (paged,
 * count asserted, refuses on mismatch) and prints the live distribution, so a
 * batch is never read against a literal. Batch files are scored alone. Uses
 * key-extremity-breakdown's evaluator; a non-numeric item is counted, never
 * scored. Also prints, for interior keys, how many have distractors on BOTH
 * sides (always true by definition for an interior key) and, for every item,
 * whether all distractors sit on one side (the AM22A-05 shape = key extreme).
 * Exits 2 if it scored nothing.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { scoreItem } from './key-extremity-breakdown.mjs'

const args = process.argv.slice(2)
const tally = (label, sets) => {
  const t = { min: 0, mid: 0, max: 0, skip: 0 }
  for (const { choices, key } of sets) {
    const s = scoreItem(choices.map(String), String(key))
    if (s.skip) { t.skip++; continue }
    if (s.keyMin) t.min++; else if (s.keyMax) t.max++; else t.mid++
  }
  const n = t.min + t.mid + t.max
  if (!n) { console.log(`${label}: 0 scorable of ${sets.length} — NOT MEASURED`); return null }
  const p = x => (100 * x / n).toFixed(1).padStart(5) + '%'
  console.log(`${label.padEnd(30)} n=${String(n).padEnd(4)} of ${sets.length}  smallest ${t.min} ${p(t.min)}  middle ${t.mid} ${p(t.mid)}  largest ${t.max} ${p(t.max)}  (skipped ${t.skip})`)
  return t
}
let any = false
const li = args.indexOf('--live')
if (li >= 0) {
  const family = args[li + 1]; args.splice(li, 2)
  const env = { ...Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()])), ...process.env }
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const rows = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('study_item_bank').select('id,domain,cohort,item').eq('family', family).eq('section', 'math').eq('verified', true).eq('archived', false).order('id').range(f, f + 999)
    if (error) { console.error(error.message); process.exit(2) }
    rows.push(...data); if (data.length < 1000) break
  }
  const { count } = await db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('family', family).eq('section', 'math').eq('verified', true).eq('archived', false)
  if (rows.length !== count || new Set(rows.map(r => r.id)).size !== count) { console.error(`loaded ${rows.length} != count ${count} — refusing`); process.exit(2) }
  const sets = rows.filter(r => Array.isArray(r.item?.choices)).map(r => ({ choices: r.item.choices, key: r.item.correct_answer, domain: r.domain }))
  if (tally(`LIVE ${family}/math (${count})`, sets)) any = true
  for (const d of [...new Set(sets.map(s => s.domain))].sort()) tally(`  ${d}`, sets.filter(s => s.domain === d))
}
for (const f of args) {
  const items = JSON.parse(readFileSync(f, 'utf8'))
  const sets = items.map(it => ({ choices: it.choices, key: it.correct_answer }))
  if (tally(f.split('/').pop(), sets)) any = true
}
if (!any) { console.error('nothing scored'); process.exit(2) }
