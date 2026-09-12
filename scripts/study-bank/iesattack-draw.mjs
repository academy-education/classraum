#!/usr/bin/env node
/**
 * Options-only attack render for act-math-v13-ies, with a MATCHED LIVE CONTROL
 * interleaved into the same file.
 *
 * The control is live verified ACT Math items from the SAME DOMAIN
 * (Integrating Essential Skills), because a candidate's options-only margin
 * against a bare literal is meaningless. Mixing them into one file matches the
 * instrument AND the solver's state of mind.
 *
 * THE SHAPE CHECK THAT KILLED THE LAST RENDER IS RUN HERE BEFORE ANY SOLVER.
 * On the Words in Context render the live options averaged 15.71 characters
 * against the candidates' 8.38 and the strata were sortable. Both sides here
 * are numeric, so the check should pass -- but it is asserted, not assumed,
 * and the script prints the two means so the claim is visible.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const items = []
const batch = JSON.parse(readFileSync('scripts/study-bank/act-math-v13-ies.batch.json', 'utf8'))
if (batch.length !== 12) { console.error(`REFUSING: batch holds ${batch.length}, expected 12`); process.exit(2) }
for (const it of batch) items.push({ id: it.id, choices: it.choices.map(String), key: String(it.correct_answer), kind: 'candidate' })

const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,item')
    .eq('family', 'act').eq('section', 'math').eq('domain', 'Integrating Essential Skills')
    .eq('verified', true).eq('archived', false).order('id', { ascending: true }).range(f, f + 999)
  if (error) throw new Error(error.message)
  rows.push(...data)
  if (data.length < 1000) break
}
if (new Set(rows.map(r => r.id)).size !== rows.length) { console.error('REFUSING: paging slipped'); process.exit(2) }

/* Take a deterministic sample of the live domain, sized to the candidates so
 * neither stratum dominates the pooled deal. */
let s = 20260912 >>> 0
const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

const usable = rows.filter(r => {
  const ch = r.item?.choices
  return Array.isArray(ch) && ch.length === 4 && ch.map(String).includes(String(r.item?.correct_answer))
})
for (const r of shuffle(usable).slice(0, 24)) {
  items.push({ id: r.id, choices: r.item.choices.map(String), key: String(r.item.correct_answer), kind: 'live-control' })
}
const nC = items.filter(i => i.kind === 'candidate').length
const nL = items.filter(i => i.kind === 'live-control').length
console.log(`${nC} candidates + ${nL} live Integrating Essential Skills controls (of ${usable.length} four-choice live items in the domain) = ${items.length}`)
if (nL < 15) { console.error(`REFUSING: ${nL} controls is too thin to carry the comparison`); process.exit(2) }

const widths = [...new Set(items.map(i => i.choices.length))]
if (widths.length !== 1) { console.error(`REFUSING: mixed widths ${widths}`); process.exit(2) }
const SLOT = ['A', 'B', 'C', 'D']

const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length
const chars = k => mean(items.filter(i => i.kind === k).map(i => mean(i.choices.map(c => c.length))))
const cM = chars('candidate'), lM = chars('live-control')
console.log(`option-length means: candidate ${cM.toFixed(2)} chars, live control ${lM.toFixed(2)} chars, gap ${Math.abs(cM - lM).toFixed(2)}`)
if (Math.abs(cM - lM) > 3) { console.error('REFUSING: the strata are sortable by option length; this is the Words in Context render defect repeating'); process.exit(2) }

const order = shuffle(items)
const slotOf = new Map()
order.forEach((it, i) => slotOf.set(it.id, SLOT[i % 4]))
const tally = {}
for (const v of slotOf.values()) tally[v] = (tally[v] ?? 0) + 1
console.log(`global deal ${JSON.stringify(tally)} -> best-fixed-letter control ${(100 * Math.max(...Object.values(tally)) / order.length).toFixed(1)}%`)

const blind = {}, key = {}
order.forEach((it, i) => {
  const want = slotOf.get(it.id)
  const ci = it.choices.indexOf(it.key)
  if (ci < 0) { console.error(`REFUSING: key absent on ${it.id}`); process.exit(2) }
  const rest = shuffle(it.choices.filter((_, j) => j !== ci))
  let r = 0
  const out = SLOT.map(sl => (sl === want ? it.choices[ci] : rest[r++]))
  const bid = `I-${String(i + 1).padStart(2, '0')}`
  blind[bid] = { options: Object.fromEntries(SLOT.map((sl, j) => [sl, out[j]])) }
  key[bid] = { letter: want, localId: it.id, kind: it.kind }
})
writeFileSync('scripts/study-bank/ies-attack.blind.json', JSON.stringify(blind, null, 1) + '\n')
writeFileSync('scripts/study-bank/ies-attack.key.json', JSON.stringify(key, null, 1) + '\n')
console.log(`wrote ${Object.keys(blind).length} items, candidate and control indistinguishable`)
