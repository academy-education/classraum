#!/usr/bin/env node
/**
 * act-math-v29-attack-draw.mjs <expectedCount> <batch.json...>
 *
 * Options-only attack render for act-math-v29 (copied from act-math-v28-attack-draw.mjs, itself from act-math-v27-attack-draw.mjs, itself from act-math-v26-attack-draw.mjs, itself from act-math-v25-attack-draw.mjs, itself from act-math-v24-attack-draw.mjs, itself from act-math-v23-attack-draw.mjs, itself from v20's; 1:1 by domain as v20; also writes the controls for check-key-arith-class.mjs and key-rank-position.mjs;
 * only the output names, the excluded cohorts and the seed differ) with a MATCHED LIVE CONTROL
 * interleaved into one file. Derived from v15attack-draw.mjs, with three
 * differences, each a lesson already recorded in REGISTER §5:
 *
 *   - the control is matched 1:1 BY DOMAIN across all six ACT Math domains the
 *     candidates use (v16 is a six-domain batch);
 *   - the shuffle is the shared mulberry32 (`seeded-shuffle.mjs`), not a local LCG;
 *   - the input count is asserted against the caller's expected count, so the
 *     render refuses rather than drawing over a half-written or wrong file.
 *
 * Keys are dealt flat WITHIN each arm (the v15 lesson: a deal flat only in
 * aggregate is not a control for a per-arm comparison). The blind file carries
 * nothing but option strings under opaque ids; arm, domain and source id live
 * only in the key file.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { rng, shuffleWith } from './seeded-shuffle.mjs'

const [expected, ...paths] = process.argv.slice(2)
if (!expected || !paths.length) { console.error('usage: act-math-v29-attack-draw.mjs <expectedCount> <batch.json...>'); process.exit(2) }
const batch = paths.flatMap(p => JSON.parse(readFileSync(p, 'utf8')))
if (batch.length !== Number(expected)) { console.error(`REFUSING: read ${batch.length} items, expected ${expected}`); process.exit(2) }
for (const p of paths) console.log(`input ${p} sha ${createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 16)}`)
if (new Set(batch.map(i => i.id)).size !== batch.length) { console.error('REFUSING: duplicate candidate ids'); process.exit(2) }

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const rand = rng(20261061)
const shuffle = a => shuffleWith(a.slice(), rand)

const items = batch.map(it => ({ id: it.id, choices: it.choices.map(String), key: String(it.correct_answer), kind: 'candidate', domain: it.domain }))
const want = {}
for (const it of items) want[it.domain] = (want[it.domain] ?? 0) + 1
console.log('candidate domain mix:', JSON.stringify(want))

const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,domain,cohort,item')
    .eq('family', 'act').eq('section', 'math').eq('verified', true).eq('archived', false)
    .order('id', { ascending: true }).range(f, f + 999)
  if (error) throw new Error(error.message)
  rows.push(...data)
  if (data.length < 1000) break
}
if (new Set(rows.map(r => r.id)).size !== rows.length) { console.error('REFUSING: paging slipped'); process.exit(2) }
console.log(`live act/math rows read: ${rows.length}`)

const EXCLUDE_COHORTS = new Set(['act-math-v16', 'act-math-v17', 'act-math-v18', 'act-math-v19', 'act-math-v20', 'act-math-v21', 'act-math-v22', 'act-math-v23', 'act-math-v24', 'act-math-v25', 'act-math-v26', 'act-math-v27', 'act-math-v28', 'act-math-v29'])
const usable = rows.filter(r => !EXCLUDE_COHORTS.has(r.cohort)
  && Array.isArray(r.item?.choices) && r.item.choices.length === 4
  && r.item.choices.map(String).includes(String(r.item?.correct_answer)))
if (usable.some(r => EXCLUDE_COHORTS.has(r.cohort))) { console.error('REFUSING: an excluded cohort survived the filter'); process.exit(2) }

for (const [dom, n] of Object.entries(want)) {
  const pool = shuffle(usable.filter(r => r.domain === dom))
  if (pool.length < n) { console.error(`REFUSING: only ${pool.length} live ${dom} items for a ${n} control`); process.exit(2) }
  for (const r of pool.slice(0, n)) items.push({ id: r.id, choices: r.item.choices.map(String), key: String(r.item.correct_answer), kind: 'live-control', domain: r.domain })
}
writeFileSync('scripts/study-bank/act-math-v29-attack.controls.json', JSON.stringify(items.filter(i => i.kind === 'live-control').map(i => ({ id: i.id, domain: i.domain, choices: i.choices, correct_answer: i.key, prompt: usable.find(r => r.id === i.id).item.prompt })), null, 1) + '\n')
const nC = items.filter(i => i.kind === 'candidate').length, nL = items.filter(i => i.kind === 'live-control').length
console.log(`${nC} candidates + ${nL} live controls (matched 1:1 by domain) = ${items.length}`)

const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length
const chars = k => mean(items.filter(i => i.kind === k).map(i => mean(i.choices.map(c => c.length))))
const cM = chars('candidate'), lM = chars('live-control')
console.log(`option-length means: candidate ${cM.toFixed(2)}, control ${lM.toFixed(2)}, gap ${Math.abs(cM - lM).toFixed(2)}`)
if (Math.abs(cM - lM) > 3) { console.error('REFUSING: strata sortable by option length'); process.exit(2) }

const SLOT = ['A', 'B', 'C', 'D']
const slotOf = new Map()
for (const kind of ['candidate', 'live-control']) {
  const arm = shuffle(items.filter(i => i.kind === kind))
  arm.forEach((it, i) => slotOf.set(it.id, SLOT[i % 4]))
  const t = {}
  for (const it of arm) t[slotOf.get(it.id)] = (t[slotOf.get(it.id)] ?? 0) + 1
  const bf = 100 * Math.max(...Object.values(t)) / arm.length
  console.log(`  ${kind.padEnd(14)} deal ${JSON.stringify(t)}  best-fixed WITHIN the arm ${bf.toFixed(1)}%`)
  if (bf > 31) { console.error(`REFUSING: ${kind} deal lopsided`); process.exit(2) }
}
const order = shuffle(items)
const blind = {}, key = {}
order.forEach((it, i) => {
  const want = slotOf.get(it.id)
  const ci = it.choices.indexOf(it.key)
  if (ci < 0) { console.error(`REFUSING: key absent on ${it.id}`); process.exit(2) }
  const rest = shuffle(it.choices.filter((_, j) => j !== ci))
  let r = 0
  const out = SLOT.map(sl => (sl === want ? it.choices[ci] : rest[r++]))
  const bid = `V-${String(i + 1).padStart(3, '0')}`
  blind[bid] = { options: Object.fromEntries(SLOT.map((sl, j) => [sl, out[j]])) }
  key[bid] = { letter: want, localId: it.id, kind: it.kind, domain: it.domain }
})
writeFileSync('scripts/study-bank/act-math-v29-attack.blind.json', JSON.stringify(blind, null, 1) + '\n')
writeFileSync('scripts/study-bank/act-math-v29-attack.key.json', JSON.stringify(key, null, 1) + '\n')
console.log(`wrote ${Object.keys(blind).length} items; blind sha ${createHash('sha256').update(readFileSync('scripts/study-bank/act-math-v29-attack.blind.json')).digest('hex').slice(0, 16)}`)
