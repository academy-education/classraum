#!/usr/bin/env node
/**
 * next-form.mjs [family/section ...]
 *
 * "What is the CHEAPEST set of items that buys one more complete form?"
 *
 * WHY THIS EXISTS. `form-capacity.mjs` correctly names the BINDING domain --
 * the thinnest one -- and that is what every authoring brief has been written
 * against. It does not say how far ahead the SECOND-thinnest domain is, and on
 * 2026-09-12 that cost a whole batch: ACT Math was capped at 7 forms by Algebra
 * with 60 items, so 28 Algebra items were commissioned, gated and inserted.
 * Algebra went 60 -> 88 and the form count stayed at 7, because Geometry sat at
 * 59 -- thinner by one item. Twenty-eight items bought zero forms. Six items
 * (5 Geometry, 1 Number and Quantity) buy one.
 *
 * The binding domain is the right answer to "what is short". It is the WRONG
 * answer to "what should we author", whenever the margin to the next domain is
 * smaller than the batch. Ask this script instead, and read the TOTAL, not the
 * first row.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

/* Quotas come from `blueprint-quotas.mjs`, the single shared table. They used
 * to be typed here from memory and were wrong three times in one day -- see
 * that file's header for all three and what each one cost. Two tools deriving
 * one fact from two tables was the defect; this import is the fix. */
import { QUOTAS, perForm, assertShares } from './blueprint-quotas.mjs'

const shareErrors = assertShares()
if (shareErrors.length) { for (const e of shareErrors) console.error('REFUSING: ' + e); process.exit(2) }
const PER_FORM = Object.fromEntries(Object.keys(QUOTAS).map(k => [k, perForm(k)]))

const want = process.argv.slice(2)
const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank')
    .select('id,family,section,domain')
    .eq('verified', true).eq('archived', false)
    .order('id', { ascending: true }).range(f, f + 999)
  if (error) throw new Error(error.message)
  rows.push(...data)
  if (data.length < 1000) break
}
const ids = new Set(rows.map(r => r.id))
if (ids.size !== rows.length) { console.error('REFUSING: paging slipped (' + ids.size + ' distinct of ' + rows.length + ')'); process.exit(2) }

for (const [key, quotas] of Object.entries(PER_FORM)) {
  if (want.length && !want.includes(key)) continue
  const [fam, sec] = key.split('/')
  const live = {}
  for (const r of rows) if (r.family === fam && r.section === sec) live[r.domain] = (live[r.domain] ?? 0) + 1

  const forms = Math.min(...Object.entries(quotas).map(([d, q]) => Math.floor((live[d] ?? 0) / q)))
  const target = forms + 1
  console.log('')
  console.log(key + ' — ' + forms + ' complete forms now')
  console.log('  domain                              live   /form   for form ' + target + '   deficit')
  console.log('  ' + '-'.repeat(70))
  let total = 0
  const plan = []
  for (const [d, q] of Object.entries(quotas).sort((a, b) => ((live[a[0]] ?? 0) / a[1]) - ((live[b[0]] ?? 0) / b[1]))) {
    const n = live[d] ?? 0
    const need = target * q
    const deficit = Math.max(0, need - n)
    total += deficit
    if (deficit) plan.push(d + ' +' + deficit)
    console.log('  ' + d.padEnd(36) + String(n).padStart(4) + String(q).padStart(8) + String(need).padStart(11) + String(deficit || '-').padStart(10))
  }
  console.log('  ' + '-'.repeat(70))
  console.log('  CHEAPEST NEXT FORM: ' + total + ' items' + (plan.length ? '  ->  ' + plan.join(', ') : ''))
  if (plan.length > 1) console.log('  NOTE: more than one domain is short. Authoring only the thinnest buys NOTHING.')
}
console.log('')
