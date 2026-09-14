#!/usr/bin/env node
/**
 * Options-only attack render for act-math-v15-mix, with a MATCHED LIVE CONTROL
 * interleaved into the same file.
 *
 * The control is drawn from the SAME THREE DOMAINS in the same proportions the
 * batch uses (Geometry 7, Integrating Essential Skills 7, Functions 4), because
 * a control pooled over all six ACT Math domains would compare the batch to a
 * different mix than it belongs to.
 *
 * TWO RENDER CHECKS RUN BEFORE ANY SOLVER, both earned this week:
 *   - option-length means per stratum. The Words in Context render had a 7.33
 *     character gap and its strata were sortable; this refuses over 3.
 *   - SIBLING/ADJACENCY is not an issue here (ACT Math items are independent,
 *     not passage-drawn) but the ACT Reading run was contaminated by handing
 *     one solver several files drawn from the same groups, so this renders ONE
 *     file and says so rather than leaving the assignment implicit.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const batch = JSON.parse(readFileSync('scripts/study-bank/act-math-v15-mix.batch.json', 'utf8'))
if (batch.length !== 24) { console.error(`REFUSING: batch holds ${batch.length}, expected 24`); process.exit(2) }
const items = batch.map(it => ({ id: it.id, choices: it.choices.map(String), key: String(it.correct_answer), kind: 'candidate', domain: it.domain }))

const want = {}
for (const it of items) want[it.domain] = (want[it.domain] ?? 0) + 1
console.log('candidate domain mix:', JSON.stringify(want))

const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,domain,cohort,item')
    .eq('family', 'act').eq('section', 'math').eq('verified', true).eq('archived', false)
    .in('domain', Object.keys(want)).order('id', { ascending: true }).range(f, f + 999)
  if (error) throw new Error(error.message)
  rows.push(...data)
  if (data.length < 1000) break
}
if (new Set(rows.map(r => r.id)).size !== rows.length) { console.error('REFUSING: paging slipped'); process.exit(2) }

let s = 20260915 >>> 0
const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

/* EXCLUDE THE COHORTS THIS AUTHOR ALREADY BANKED. `act-math-v13-ies` went live
 * yesterday from the same author working to the same brief, so drawing it into
 * the control puts their work on both sides of the comparison and drags the
 * control toward the candidate.
 *
 * The first version of this file carried that intent as a COMMENT and did not
 * implement it -- and one v13 item duly landed in the control. "A comment
 * asserting an invariant is not evidence the invariant holds": the fix is the
 * filter below plus the assertion after it, not a better comment. */
/* Every cohort this author has already banked is excluded, not just the most
 * recent. v13, v14 and v14r all went live from the same author on the same
 * brief within three days; drawing any of them into the control puts their work
 * on both sides of the comparison. The v14 render carried this as a COMMENT
 * naming one cohort and implemented none of it, and one item duly leaked in. */
const EXCLUDE_COHORTS = new Set(['act-math-v13-ies', 'act-math-v14-mix', 'act-math-v14r'])
const usable = rows.filter(r => {
  const ch = r.item?.choices
  if (EXCLUDE_COHORTS.has(r.cohort)) return false
  return Array.isArray(ch) && ch.length === 4 && ch.map(String).includes(String(r.item?.correct_answer))
})
if (usable.some(r => EXCLUDE_COHORTS.has(r.cohort))) { console.error('REFUSING: an excluded cohort survived the filter'); process.exit(2) }
const RATIO = 2                                   // two control items per candidate
for (const [dom, n] of Object.entries(want)) {
  const pool = shuffle(usable.filter(r => r.domain === dom))
  if (pool.length < n * RATIO) { console.error(`REFUSING: only ${pool.length} live ${dom} items for a ${n * RATIO} control`); process.exit(2) }
  for (const r of pool.slice(0, n * RATIO)) {
    items.push({ id: r.id, choices: r.item.choices.map(String), key: String(r.item.correct_answer), kind: 'live-control', domain: r.domain })
  }
}
const nC = items.filter(i => i.kind === 'candidate').length
const nL = items.filter(i => i.kind === 'live-control').length
console.log(`${nC} candidates + ${nL} live controls (same three domains, same proportions) = ${items.length}`)

const widths = [...new Set(items.map(i => i.choices.length))]
if (widths.length !== 1) { console.error(`REFUSING: mixed widths ${widths}`); process.exit(2) }
const SLOT = ['A', 'B', 'C', 'D']
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length
const chars = k => mean(items.filter(i => i.kind === k).map(i => mean(i.choices.map(c => c.length))))
const cM = chars('candidate'), lM = chars('live-control')
console.log(`option-length means: candidate ${cM.toFixed(2)}, control ${lM.toFixed(2)}, gap ${Math.abs(cM - lM).toFixed(2)}`)
if (Math.abs(cM - lM) > 3) { console.error('REFUSING: strata sortable by option length -- the Words in Context render defect repeating'); process.exit(2) }

const order = shuffle(items)
const slotOf = new Map()
order.forEach((it, i) => slotOf.set(it.id, SLOT[i % 4]))
const tally = {}
for (const v of slotOf.values()) tally[v] = (tally[v] ?? 0) + 1
console.log(`global deal ${JSON.stringify(tally)} -> best-fixed-letter control ${(100 * Math.max(...Object.values(tally)) / order.length).toFixed(1)}%`)

const blind = {}, key = {}
order.forEach((it, i) => {
  const wantSlot = slotOf.get(it.id)
  const ci = it.choices.indexOf(it.key)
  if (ci < 0) { console.error(`REFUSING: key absent on ${it.id}`); process.exit(2) }
  const rest = shuffle(it.choices.filter((_, j) => j !== ci))
  let r = 0
  const out = SLOT.map(sl => (sl === wantSlot ? it.choices[ci] : rest[r++]))
  const bid = `V-${String(i + 1).padStart(2, '0')}`
  blind[bid] = { options: Object.fromEntries(SLOT.map((sl, j) => [sl, out[j]])) }
  key[bid] = { letter: wantSlot, localId: it.id, kind: it.kind, domain: it.domain }
})
writeFileSync('scripts/study-bank/v15-attack.blind.json', JSON.stringify(blind, null, 1) + '\n')
writeFileSync('scripts/study-bank/v15-attack.key.json', JSON.stringify(key, null, 1) + '\n')
console.log(`wrote ${Object.keys(blind).length} items; candidate and control indistinguishable`)
console.log('\nSOLVER ASSIGNMENT: ONE file, all three solvers read it. ACT Math items are')
console.log('independent (not passage-drawn), so there is no cross-item leak to split on --')
console.log('unlike ACT Reading, where one file per solver is mandatory.')
