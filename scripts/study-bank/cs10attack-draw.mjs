#!/usr/bin/env node
/**
 * Options-only attack render for sat-cs-v10, with a MATCHED LIVE CONTROL.
 *
 * WHY THIS RUN EXISTS WHEN THE AUTHOR ALREADY RAN FOUR. Their self-attack is
 * real work and its RESULT stands as a change: 81% on the first draft down to
 * 31% after three rebuilds, same render throughout, so the improvement is
 * theirs. Two things it cannot settle, both structural:
 *
 *   1. IT NEVER RE-DEALT THE KEY. Checked: 18 of 18 items in their blind file
 *      preserve the authored option order AND the authored key position. Any
 *      positional habit of the author's therefore survived into every round.
 *      They flagged the symptom without diagnosing it -- CS10-06 and CS10-18
 *      were picked 4/4 by every solver ACROSS A REWRITE THAT REVERSED WHAT THE
 *      KEY SAYS, which is what position looks like, not content.
 *   2. IT HAD NO CONTROL. Their 31% is against a literal 25% and against
 *      baselines quoted from the brief. A17's rule is that a matched live
 *      control is not optional and is not a formality: it is the only thing
 *      separating "this batch leaks" from "this instrument saturates on this
 *      family", and it has given both answers on different families.
 *
 * So: keys re-dealt flat WITHIN each stratum, and 36 live Craft and Structure
 * items drawn from the SAME TWO SUBSKILLS in the same proportions.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const batch = JSON.parse(readFileSync('scripts/study-bank/sat-cs-v10.batch.json', 'utf8'))
if (batch.length !== 18) { console.error(`REFUSING: batch holds ${batch.length}, expected 18`); process.exit(2) }
const items = batch.map(it => ({ id: it.id, choices: it.choices.map(String), key: String(it.correct_answer), kind: 'candidate', sub: it.subskill }))

const want = {}
for (const i of items) want[i.sub] = (want[i.sub] ?? 0) + 1
console.log('candidate subskill mix:', JSON.stringify(want))

const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,subskill,item')
    .eq('family', 'sat').eq('section', 'reading_writing').eq('domain', 'Craft and Structure')
    .eq('verified', true).eq('archived', false).order('id', { ascending: true }).range(f, f + 999)
  if (error) throw new Error(error.message)
  rows.push(...data)
  if (data.length < 1000) break
}
if (new Set(rows.map(r => r.id)).size !== rows.length) { console.error('REFUSING: paging slipped'); process.exit(2) }

let s = 20260915 >>> 0
const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

const RATIO = 2
for (const [sub, n] of Object.entries(want)) {
  const pool = shuffle(rows.filter(r => {
    const ch = r.item?.choices
    return r.subskill === sub && Array.isArray(ch) && ch.length === 4 && ch.map(String).includes(String(r.item?.correct_answer))
  }))
  if (pool.length < n * RATIO) { console.error(`REFUSING: only ${pool.length} live "${sub}" items for a ${n * RATIO} control`); process.exit(2) }
  for (const r of pool.slice(0, n * RATIO)) {
    items.push({ id: r.id, choices: r.item.choices.map(String), key: String(r.item.correct_answer), kind: 'live-control', sub })
  }
}
const nC = items.filter(i => i.kind === 'candidate').length
const nL = items.filter(i => i.kind === 'live-control').length
console.log(`${nC} candidates + ${nL} live controls (same two subskills, same proportions) = ${items.length}`)

const widths = [...new Set(items.map(i => i.choices.length))]
if (widths.length !== 1) { console.error(`REFUSING: mixed widths ${widths}`); process.exit(2) }
const SLOT = ['A', 'B', 'C', 'D']
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length
const chars = k => mean(items.filter(i => i.kind === k).map(i => mean(i.choices.map(c => c.length))))
const cM = chars('candidate'), lM = chars('live-control')
console.log(`option-length means: candidate ${cM.toFixed(1)}, control ${lM.toFixed(1)}, gap ${Math.abs(cM - lM).toFixed(1)}`)
if (Math.abs(cM - lM) > 12) { console.error('REFUSING: strata sortable by option length'); process.exit(2) }

/* FLAT WITHIN EACH STRATUM. A global deal is flat only in aggregate; the v15
 * run came out A18/B18/C18/D18 overall and A4/B8/C5/D7 inside the arm that
 * mattered. And the key is RE-DEALT, which the author's own render never did. */
const order = []
for (const kind of ['candidate', 'live-control']) {
  const arm = shuffle(items.filter(i => i.kind === kind))
  arm.forEach((it, i) => { it._slot = SLOT[i % 4] })
  order.push(...arm)
}
const slotOf = new Map(order.map(it => [it.id, it._slot]))
for (const kind of ['candidate', 'live-control']) {
  const arm = order.filter(i => i.kind === kind)
  const t = {}
  for (const it of arm) t[slotOf.get(it.id)] = (t[slotOf.get(it.id)] ?? 0) + 1
  const bf = 100 * Math.max(...Object.values(t)) / arm.length
  console.log(`  ${kind.padEnd(14)} deal ${JSON.stringify(t)}  best-fixed WITHIN the stratum ${bf.toFixed(1)}%`)
  if (bf > 31) { console.error(`REFUSING: ${kind} deal is lopsided`); process.exit(2) }
}

const blind = {}, key = {}
let moved = 0
shuffle(order).forEach((it, i) => {
  const wantSlot = slotOf.get(it.id)
  const ci = it.choices.indexOf(it.key)
  if (ci < 0) { console.error(`REFUSING: key absent on ${it.id}`); process.exit(2) }
  if (SLOT[ci] !== wantSlot) moved++
  const rest = shuffle(it.choices.filter((_, j) => j !== ci))
  let r = 0
  const out = SLOT.map(sl => (sl === wantSlot ? it.choices[ci] : rest[r++]))
  const bid = `S-${String(i + 1).padStart(2, '0')}`
  blind[bid] = { options: Object.fromEntries(SLOT.map((sl, j) => [sl, out[j]])) }
  key[bid] = { letter: wantSlot, localId: it.id, kind: it.kind, sub: it.sub }
})
writeFileSync('scripts/study-bank/cs10-attack.blind.json', JSON.stringify(blind, null, 1) + '\n')
writeFileSync('scripts/study-bank/cs10-attack.key.json', JSON.stringify(key, null, 1) + '\n')
console.log(`\nwrote ${Object.keys(blind).length} items; the key MOVED off its authored slot on ${moved} of ${order.length}`)
