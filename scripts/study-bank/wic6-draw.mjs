#!/usr/bin/env node
/**
 * wic6-draw.mjs — options-only attack render for sat-wic-v6, with the matched
 * live control interleaved into the SAME file.
 *
 * WHY OPTIONS-ONLY IS THE RIGHT INSTRUMENT HERE, unlike on numeric maths.
 * The corollary recorded today says an options-only render cannot see a free
 * elimination that needs the stem. On Words in Context the stem is the same
 * generic sentence on every item ("Which choice completes the text with the
 * most logical and precise word or phrase?") and carries no information, so
 * withholding it costs nothing. What DOES carry the free eliminations is the
 * PASSAGE FRAME ("not X but ___"), and that is the with-source half's job.
 * Both halves run; neither is reported as the verdict on its own.
 *
 * THE CONTROL IS SHAPE-MATCHED AND NOT SELF-REFERENTIAL.
 *   shape   Live WIC is two different renders: `word` (single-word options)
 *           and `gloss` (options that spell out a definition, averaging about
 *           twice the characters). v6 is entirely single-word, and the gloss
 *           family is the one measured at +42.9 blind, so including it would
 *           raise the control and flatter the candidate. Only shape=word.
 *   cohort  rw-v12-wic and rw-v14-wic were inserted by THIS session. Scoring a
 *           candidate against items I shipped days ago makes the control a
 *           measurement of my own recent authoring, not of the bank. Excluded.
 *
 * That leaves 9 control items — 27 picks across three solvers, a 95% interval
 * of roughly +/-17 points. This run can refute a large leak and cannot resolve
 * a small one. It is the entire non-self-referential single-word population;
 * no larger control exists. Stated rather than worked around.
 *
 * Option order comes from seeded-shuffle.mjs (mulberry32), never a local LCG —
 * see A44. The key deal is printed so a lopsided deal is visible BEFORE any
 * solver runs, rather than discovered afterwards and re-rolled, which would be
 * choosing a result.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { rng, shuffleWith } from './seeded-shuffle.mjs'

const D = 'scripts/study-bank'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const MINE = new Set(['rw-v12-wic', 'rw-v14-wic'])   // inserted by this session
const items = []

const cand = JSON.parse(readFileSync(`${D}/sat-wic-v6.batch.json`, 'utf8'))
if (cand.length !== 12) { console.error(`REFUSING: candidate holds ${cand.length}, expected 12`); process.exit(2) }
for (const it of cand) {
  const ch = it.choices.map(String), k = String(it.correct_answer)
  if (!ch.includes(k)) { console.error(`REFUSING: ${it.id} key not among its choices`); process.exit(2) }
  if (ch.some(c => c.trim().includes(' '))) { console.error(`REFUSING: ${it.id} is gloss-shaped; control is word-shaped`); process.exit(2) }
  items.push({ id: it.id, choices: ch, key: k, kind: 'candidate', shape: 'word' })
}

const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,cohort,item')
    .eq('family', 'sat').eq('section', 'reading_writing').eq('subskill', 'Words in Context')
    .eq('verified', true).eq('archived', false).order('id', { ascending: true }).range(f, f + 999)
  if (error) throw new Error(error.message)
  rows.push(...data); if (data.length < 1000) break
}
if (new Set(rows.map(r => r.id)).size !== rows.length) { console.error('REFUSING: paging slipped'); process.exit(2) }
let excludedShape = 0, excludedMine = 0
for (const r of rows) {
  const ch = r.item?.choices?.map(String), k = String(r.item?.correct_answer ?? '')
  if (!Array.isArray(ch) || !ch.includes(k)) { console.error(`REFUSING: live ${r.id} has no key among its choices`); process.exit(2) }
  if (ch.some(c => c.trim().includes(' '))) { excludedShape++; continue }
  if (MINE.has(r.cohort)) { excludedMine++; continue }
  items.push({ id: r.id, choices: ch, key: k, kind: 'live-control', shape: 'word' })
}
const nCtl = items.filter(i => i.kind === 'live-control').length
console.log(`live WIC rows ${rows.length} | excluded gloss-shaped ${excludedShape} | excluded this session's cohorts ${excludedMine}`)
console.log(`control n=${nCtl}  candidate n=${cand.length}`)
if (nCtl < 6) { console.error(`REFUSING: control is ${nCtl} items — too thin to be a control`); process.exit(2) }

const rand = rng(20260924)
shuffleWith(items, rand)
const L = ['A', 'B', 'C', 'D']
const out = [], key = {}
const deal = { candidate: {}, 'live-control': {} }
/* KEY SLOTS ARE DEALT FLAT BY CONSTRUCTION, NOT BY LUCK.
 * A free shuffle here dealt the candidate C:5 D:4 and the control A:4 B:3 C:2
 * D:0 — best-fixed-letter controls of 41.7% and 44.4%, so a solver who picks
 * one letter throughout scores near the band we are trying to measure. The
 * recorded rule is that re-rolling seeds until the deal looks fair is choosing
 * a result, so the fix is not a better seed: it is to assign the key slot by a
 * fixed round-robin within each arm BEFORE any solver runs, and shuffle only
 * the three distractors around it. 12 candidates deal 3/3/3/3 and 9 controls
 * deal 3/2/2/2, which is the flattest either n admits. */
const turn = { candidate: 0, 'live-control': 0 }
for (const [n, it] of items.entries()) {
  const want = L[turn[it.kind]++ % 4]
  const rest = it.choices.filter(c => c !== it.key)
  shuffleWith(rest, rand)
  const ch = []
  for (const l of L) ch.push(l === want ? it.key : rest.pop())
  const slot = L[ch.indexOf(it.key)]
  if (slot !== want) { console.error('REFUSING: key slot placement failed'); process.exit(2) }
  deal[it.kind][slot] = (deal[it.kind][slot] ?? 0) + 1
  out.push({ n: n + 1, question: 'One word has been removed from a passage you cannot see. Which of these four words was it?', options: Object.fromEntries(ch.map((c, i) => [L[i], c])) })
  /* THE SCHEMA IS score-wic.mjs's, NOT A FRESH ONE. The first version of this
   * wrote {id, kind, key_slot}; the scorer reads {letter, localId, kind, src,
   * shape} and, finding no `letter`, scored every pick wrong and printed a
   * tidy "0.0%, best-fixed-letter 100.0%". A new render must speak the
   * scorer's schema or the scorer must refuse it — both now hold. */
  key[n + 1] = { letter: slot, localId: it.id, kind: it.kind, src: it.kind === 'candidate' ? 'sat-wic-v6' : 'live', shape: it.shape }
}
writeFileSync(`${D}/wic6-oo.blind.json`, JSON.stringify(out, null, 1))
writeFileSync(`${D}/wic6-oo.key.json`, JSON.stringify(key, null, 1))
// The control a solver gets for free is the BEST FIXED LETTER on each arm,
// derived from the deal actually dealt — never the literal 25%.
for (const kind of ['candidate', 'live-control']) {
  const d = deal[kind], n = Object.values(d).reduce((a, b) => a + b, 0)
  const best = Math.max(...L.map(l => d[l] ?? 0))
  console.log(`${kind.padEnd(13)} deal ${L.map(l => `${l}:${d[l] ?? 0}`).join(' ')}  ->  best-fixed-letter control ${(100 * best / n).toFixed(1)}%`)
}
console.log(`wrote ${D}/wic6-oo.blind.json (${out.length} items)`)
