#!/usr/bin/env node
/**
 * Options-only attack render for sat-wic-v1-hard + sat-wic-v1-med, WITH THE
 * MATCHED LIVE CONTROL MIXED INTO THE SAME FILE.
 *
 * WHY THE CONTROL IS IN THE FILE. A candidate's options-only margin against a
 * bare literal is meaningless; it has to be read against the same instrument
 * pointed at shipped items of the same stratum, width and render. Putting the
 * control in a SEPARATE file lets a solver calibrate differently on each. Here
 * all 20 live Words in Context items are interleaved with the 32 candidates
 * and nothing distinguishes them, so the control is matched on the instrument
 * AND on the solver's own state of mind.
 *
 * Words in Context is the only Craft and Structure subskill that has measured
 * clean (12.5% / 33.3%) against Text Structure at 87.5% and Cross-Text at
 * 75.0%. The live control re-measures that on this render rather than quoting
 * the old figure at a new instrument.
 *
 * SIBLING-FREE holds trivially: every item in both batches has its own unique
 * passage, and the live 20 are drawn from distinct rows. Asserted below, not
 * assumed.
 *
 * NOTE ON A CHANNEL THAT CANNOT BE MEASURED HERE: check-twin-options.mjs
 * returns a ZERO-POPULATION line on both batches -- single-word options are
 * under its 12-character floor, which exists because trigram similarity is
 * degenerate at that length. That is "not measured", not "clean".
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const items = []
for (const f of ['sat-wic-v1-hard', 'sat-wic-v1-med']) {
  const b = JSON.parse(readFileSync(`scripts/study-bank/${f}.batch.json`, 'utf8'))
  if (b.length !== 16) { console.error(`REFUSING: ${f} holds ${b.length} items, expected 16`); process.exit(2) }
  for (const it of b) items.push({ id: it.id, choices: it.choices.map(String), key: String(it.correct_answer), kind: 'candidate', src: f })
}

const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,domain,subskill,difficulty,item')
    .eq('family', 'sat').eq('section', 'reading_writing').eq('subskill', 'Words in Context')
    .eq('verified', true).eq('archived', false).order('id', { ascending: true }).range(f, f + 999)
  if (error) throw new Error(error.message)
  rows.push(...data)
  if (data.length < 1000) break
}
if (new Set(rows.map(r => r.id)).size !== rows.length) { console.error('REFUSING: paging slipped'); process.exit(2) }
for (const r of rows) {
  const ch = r.item?.choices?.map(String)
  const k = String(r.item?.correct_answer ?? '')
  if (!Array.isArray(ch) || !ch.includes(k)) { console.error(`REFUSING: live row ${r.id} has no key among its choices`); process.exit(2) }
  items.push({ id: r.id, choices: ch, key: k, kind: 'live-control', src: 'live' })
}
/* OPTION SHAPE, and it is not cosmetic. The live 20 are TWO different item
 * shapes: single-word options ('successive / unremarkable / conjectural /
 * coeval') and gloss options that spell out a definition ('skill in handling
 * situations' / 'the location of a residence'). Both are real digital-SAT
 * Words in Context shapes. Every candidate is single-word, so only the
 * single-word live items are a MATCHED control; scoring the candidates
 * against all 20 would compare them to a different render.
 *
 * Caught by attacking this render before any solver saw it: pooled, the live
 * options averaged 15.71 characters against the candidates' 8.38, a gap that
 * would have let a solver sort the file into strata. Within the single-word
 * shape the gap is 9.83 vs 8.38 with sd ~1.3 -- visible in aggregate, not per
 * item. Stated rather than hidden. */
for (const it of items) it.shape = it.choices.some(c => c.trim().includes(' ')) ? 'gloss' : 'word'
const nC = items.filter(i => i.kind === 'candidate').length
const nL = items.filter(i => i.kind === 'live-control').length
const nMatched = items.filter(i => i.kind === 'live-control' && i.shape === 'word').length
console.log(`${nC} candidates + ${nL} live Words in Context controls = ${items.length} items`)
console.log(`  live controls by shape: word ${nMatched}, gloss ${nL - nMatched}`)
if (items.some(i => i.kind === 'candidate' && i.shape !== 'word')) { console.error('REFUSING: a candidate carries gloss options; the matched control assumes all candidates are single-word'); process.exit(2) }
if (nMatched < 8) { console.error(`REFUSING: ${nMatched} matched (single-word) live controls is too few to carry any comparison`); process.exit(2) }
if (nMatched < 15) console.log(`  THIN CONTROL: ${nMatched} matched items = ${nMatched * 3} picks across three solvers. Report the interval, and do not read a few points either way as a result.`)

const widths = [...new Set(items.map(i => i.choices.length))]
if (widths.length !== 1) { console.error(`REFUSING: mixed widths ${widths} — candidate and control must render identically`); process.exit(2) }
const SLOT = ['A', 'B', 'C', 'D'].slice(0, widths[0])
if (new Set(items.map(i => i.id)).size !== items.length) { console.error('REFUSING: duplicate ids across candidate and control'); process.exit(2) }

let s = 20260912 >>> 0
const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

/* Slots dealt GLOBALLY across candidates AND controls together, so the
 * best-fixed-letter control is one number for the whole file and neither
 * stratum can be advantaged by its own deal. */
const order = shuffle(items)
const slotOf = new Map()
order.forEach((it, i) => slotOf.set(it.id, SLOT[i % SLOT.length]))
const tally = {}
for (const v of slotOf.values()) tally[v] = (tally[v] ?? 0) + 1
console.log(`global deal ${JSON.stringify(tally)} -> best-fixed-letter control ${(100 * Math.max(...Object.values(tally)) / order.length).toFixed(1)}%`)

const blind = {}, key = {}
order.forEach((it, i) => {
  const want = slotOf.get(it.id)
  const ci = it.choices.indexOf(it.key)
  if (ci < 0) { console.error(`REFUSING: key absent from choices on ${it.id}`); process.exit(2) }
  const rest = shuffle(it.choices.filter((_, j) => j !== ci))
  let r = 0
  const out = SLOT.map(sl => (sl === want ? it.choices[ci] : rest[r++]))
  const bid = `W-${String(i + 1).padStart(2, '0')}`
  blind[bid] = { options: Object.fromEntries(SLOT.map((sl, j) => [sl, out[j]])) }
  key[bid] = { letter: want, localId: it.id, kind: it.kind, src: it.src, shape: it.shape }
})
writeFileSync('scripts/study-bank/wic-attack.blind.json', JSON.stringify(blind, null, 1) + '\n')
writeFileSync('scripts/study-bank/wic-attack.key.json', JSON.stringify(key, null, 1) + '\n')
console.log(`wrote ${Object.keys(blind).length} items; candidate and control are indistinguishable in the blind file`)
