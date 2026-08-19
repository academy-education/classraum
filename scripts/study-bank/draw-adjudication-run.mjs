#!/usr/bin/env node
/**
 * Draw an ADJUDICATION run over an explicit list of item ids.
 *
 * draw-review-run.mjs samples a cohort at random and refuses anything the
 * reviewer has seen — correct for measuring a bank, wrong here. This run
 * asks a human to settle a specific question on specific items: the
 * calibrated exclusivity screen flagged them as having a defensible
 * second answer, and the screen names the right option only ~40% of the
 * time, so it screens and the human adjudicates.
 *
 * Same shuffle and flat key deal as the sampling script, so the panel
 * behaves identically and shown_order still decodes his letters.
 *
 * usage: draw-adjudication-run.mjs <reviewerId> <runId> <id,id,...>
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const [reviewerId, runId, idsArg] = process.argv.slice(2)
if (!reviewerId || !runId || !idsArg) {
  console.error('usage: draw-adjudication-run.mjs <reviewerId> <runId> <id,id,...>')
  process.exit(1)
}
const ids = idsArg.split(',').map(s => s.trim()).filter(Boolean)
const L = ['A', 'B', 'C', 'D']

const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// Same guard as the sampling script: never strand a half-finished run.
const { data: open } = await db.from('study_item_reviews')
  .select('run_id').eq('reviewer_id', reviewerId).is('blind_at', null).limit(1).maybeSingle()
if (open) { console.error(`REFUSING: "${open.run_id}" is still open for this reviewer.`); process.exit(1) }

// Refuse duplicates: re-serving an item this reviewer already judged
// measures his memory, not the item.
const seen = new Set()
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_reviews')
    .select('item_id').eq('reviewer_id', reviewerId).range(f, f + 999)
  if (error) { console.error('could not read prior reviews:', error.message); process.exit(1) }
  for (const r of data ?? []) seen.add(r.item_id)
  if (!data || data.length < 1000) break
}
const repeats = ids.filter(id => seen.has(id))
if (repeats.length) {
  console.error(`REFUSING: ${repeats.length} of ${ids.length} already reviewed by this reviewer:`)
  repeats.forEach(r => console.error('  ' + r))
  process.exit(1)
}

const { data: items, error: fetchErr } = await db.from('study_item_bank').select('id, item').in('id', ids)
if (fetchErr) { console.error(fetchErr.message); process.exit(1) }
if (items.length !== ids.length) {
  console.error(`asked for ${ids.length} items, found ${items.length}`); process.exit(1)
}

const rand = Math.random
const sh = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

const sample = sh(items)
const slots = sh(sample.map((_, i) => L[i % 4]))

const rows = sample.map((r, i) => {
  const ki = r.item.choices.indexOf(r.item.correct_answer)
  if (ki < 0) throw new Error(`item ${r.id}: correct_answer not among choices`)
  const others = sh([0, 1, 2, 3].filter(x => x !== ki))
  const keyAt = L.indexOf(slots[i])
  const shown = []
  for (let s = 0; s < 4; s++) shown.push(s === keyAt ? ki : others.pop())
  if (new Set(shown).size !== 4) throw new Error(`item ${r.id}: duplicate slot`)
  if (shown[keyAt] !== ki) throw new Error(`item ${r.id}: key misplaced`)
  return { item_id: r.id, run_id: runId, reviewer_id: reviewerId, shown_order: shown, key_slot: slots[i] }
})

const { error } = await db.from('study_item_reviews').insert(rows)
if (error) { console.error('insert failed:', error.message, error.code ?? ''); process.exit(1) }

const counts = L.map(x => rows.filter(r => r.key_slot === x).length)
console.log(`drawn ${rows.length} items into adjudication run "${runId}"`)
console.log(`key letters ${L.map((x, i) => `${x}:${counts[i]}`).join(' ')}  ->  control ${(100 * Math.max(...counts) / rows.length).toFixed(1)}%`)
