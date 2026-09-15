#!/usr/bin/env node
/**
 * wic-control-draw.mjs — re-measure the Words in Context CONTROL IN ISOLATION.
 *
 * WHY. `sat-wic-v1` measured 46.9% against a matched live control of 44.4% --
 * indistinguishable, so the batch matches its bank. But that control
 * CONTRADICTS the recorded 12.5% / 33.3% for the SAME 20 items, and one
 * candidate explanation is mine: I interleaved those 20 live items with 32
 * fresh candidates of the same single-word format, which may have handed
 * solvers calibration the original run never gave them.
 *
 * So the contested number is the CONTROL, not the batch, and it is testable.
 * This renders the 20 live Words in Context items ALONE -- no candidates in the
 * file to calibrate against. If it comes back near 44%, the control is real and
 * the batch matches it. If it comes back near 12-33%, the batch at 46.9%
 * genuinely leaks.
 *
 * Twenty items is the ENTIRE live population of this subskill, so this is not a
 * sample and no larger one exists. It is also two shapes -- single-word options
 * and gloss options that spell out a definition -- and they are reported
 * separately, because 9 of the 20 are single-word and those are the only ones
 * matched to the candidate batch's render.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,item')
    .eq('family', 'sat').eq('section', 'reading_writing').eq('subskill', 'Words in Context')
    .eq('verified', true).eq('archived', false).order('id', { ascending: true }).range(f, f + 999)
  if (error) throw new Error(error.message)
  rows.push(...data)
  if (data.length < 1000) break
}
const items = rows.map(r => {
  const ch = r.item?.choices?.map(String)
  const key = String(r.item?.correct_answer ?? '')
  if (!Array.isArray(ch) || !ch.includes(key)) { console.error(`REFUSING: ${r.id} has no key among its choices`); process.exit(2) }
  return { id: r.id, choices: ch, key, shape: ch.some(c => c.trim().includes(' ')) ? 'gloss' : 'word' }
})
const byShape = {}
for (const i of items) byShape[i.shape] = (byShape[i.shape] ?? 0) + 1
console.log(`${items.length} live Words in Context items — the ENTIRE population of this subskill`)
console.log(`  by option shape: ${JSON.stringify(byShape)}`)
if (items.length < 15) { console.error('REFUSING: too few live items to carry a control'); process.exit(2) }

const widths = [...new Set(items.map(i => i.choices.length))]
if (widths.length !== 1) { console.error(`REFUSING: mixed widths ${widths}`); process.exit(2) }
const SLOT = ['A', 'B', 'C', 'D'].slice(0, widths[0])

let s = 20260916 >>> 0
const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

/* Flat deal. With one stratum there is nothing to deal flat WITHIN, but the
 * deal is still checked rather than assumed. */
const order = shuffle(items)
order.forEach((it, i) => { it._slot = SLOT[i % SLOT.length] })
const t = {}
for (const it of order) t[it._slot] = (t[it._slot] ?? 0) + 1
const bf = 100 * Math.max(...Object.values(t)) / order.length
console.log(`key deal ${JSON.stringify(t)} -> chance ${(100 / SLOT.length).toFixed(1)}%, best-fixed-letter ${bf.toFixed(1)}%`)
if (bf > 25 + 8) { console.error('REFUSING: the deal is lopsided enough to beat chance on letter alone'); process.exit(2) }

const blind = {}, key = {}
shuffle(order).forEach((it, i) => {
  const want = it._slot
  const ci = it.choices.indexOf(it.key)
  const rest = shuffle(it.choices.filter((_, j) => j !== ci))
  let r = 0
  const out = SLOT.map(sl => (sl === want ? it.choices[ci] : rest[r++]))
  const bid = `W-${String(i + 1).padStart(2, '0')}`
  blind[bid] = { options: Object.fromEntries(SLOT.map((sl, j) => [sl, out[j]])) }
  key[bid] = { letter: want, localId: it.id, shape: it.shape }
})
writeFileSync('scripts/study-bank/wic-control.blind.json', JSON.stringify(blind, null, 1) + '\n')
writeFileSync('scripts/study-bank/wic-control.key.json', JSON.stringify(key, null, 1) + '\n')
console.log(`wrote ${Object.keys(blind).length} items — NO candidates in this file`)
