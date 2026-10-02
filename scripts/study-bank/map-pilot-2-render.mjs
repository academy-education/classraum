#!/usr/bin/env node
/**
 * map-pilot-2-render.mjs oo    options-only render for MAP pilot batch 2
 * map-pilot-2-render.mjs ws    with-source render (key unmarked)
 *
 * Bars: MAP-PILOT-2-2026-10-02.prereg.md.
 *
 * oo: 24 candidates (arms by item.stratum: comprehension 6, vocab 3, usage 3,
 *     mechanics 12) + control V (batch 1's 12 ISEE easy verbal items, the SAME
 *     file) + control R (8 live ISEE Reading main-idea easy items, one per
 *     passage, drawn by seed). Items are interleaved by seed. Keys are dealt
 *     flat PER ARM in a seeded random order, NOT make-oo-render's i % 4
 *     round-robin, which is a period-4 key cycle by construction. The whole
 *     sequence must pass E8 (map-pilot-2-checks periodicity); if a seed fails,
 *     the next seed is tried and the count of seeds tried is printed. That is
 *     deal construction, done before any solver exists.
 * ws: the 24 candidates in seeded order, options reshuffled with a flat 6/6/6/6
 *     key deal, E8-checked the same way.
 *
 * Only option strings cross into the blind file; ids are renumbered L01...
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
import { periodicity } from './map-pilot-2-checks.mjs'

const D = 'scripts/study-bank/'
const SL = ['A', 'B', 'C', 'D']
const rd = p => JSON.parse(readFileSync(D + p, 'utf8'))
const cand = [...rd('map-pilot-2-rlu.batch.json'), ...rd('map-pilot-2-mech.batch.json')]
if (cand.length !== 24) { console.error(`REFUSING: expected 24 candidates, read ${cand.length}`); process.exit(2) }
const want = { comprehension: 6, vocab: 3, usage: 3, mechanics: 12 }
for (const [s, n] of Object.entries(want)) {
  const got = cand.filter(i => i.stratum === s).length
  if (got !== n) { console.error(`REFUSING: stratum ${s} has ${got}, prereg fixes ${n}`); process.exit(2) }
}
for (const it of cand) if (it.choices?.length !== 4 || !it.choices.map(String).includes(String(it.correct_answer))) { console.error(`REFUSING: ${it.id} malformed`); process.exit(2) }

function place(it, letter, r) {
  const ch = it.choices.map(String), k = ch.indexOf(String(it.correct_answer))
  const rest = shuffleWith(ch.filter((_, j) => j !== k), r)
  let q = 0
  return Object.fromEntries(SL.map(s => [s, s === letter ? ch[k] : rest[q++]]))
}
const flatLetters = (n, r) => shuffleWith(Array.from({ length: n }, (_, i) => SL[i % 4]), r)

const mode = process.argv[2]
if (mode === 'oo') {
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const { createClient } = await import('@supabase/supabase-js')
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const rows = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('study_item_bank').select('id,subskill,difficulty,cohort,item')
      .eq('family', 'isee').eq('section', 'reading').eq('difficulty', 'easy').eq('subskill', 'main-idea')
      .eq('verified', true).eq('archived', false).order('id', { ascending: true }).range(f, f + 999)
    if (error) throw new Error(error.message)
    rows.push(...data); if (data.length < 1000) break
  }
  if (new Set(rows.map(r => r.id)).size !== rows.length) { console.error('REFUSING: paging slipped'); process.exit(2) }
  const elig = rows.filter(r => Array.isArray(r.item?.choices) && r.item.choices.length === 4 && r.item.choices.map(String).includes(String(r.item.correct_answer)))
  const byPassage = new Map()
  for (const r of shuffleWith(elig.slice(), rng(202610022))) { const p = String(r.item.passage ?? r.id).slice(0, 80); if (!byPassage.has(p)) byPassage.set(p, r) }
  console.log(`control R pool: ${rows.length} live ISEE reading main-idea easy, ${elig.length} four-choice with key, ${byPassage.size} distinct passages`)
  if (byPassage.size < 8) { console.error('REFUSING: fewer than 8 distinct-passage control R items'); process.exit(2) }
  const ctlR = [...byPassage.values()].slice(0, 8).map(r => ({ id: r.id, family: 'isee', subskill: r.subskill, cohort: r.cohort, arm: 'controlR', prompt: r.item.prompt, choices: r.item.choices.map(String), correct_answer: String(r.item.correct_answer) }))
  writeFileSync(D + 'map-pilot-2-control-r.batch.json', JSON.stringify(ctlR, null, 1) + '\n')
  const ctlV = rd('map-pilot-control.batch.json').map(x => ({ ...x, arm: 'controlV' }))
  if (ctlV.length !== 12) { console.error('REFUSING: control V must be batch 1\'s 12'); process.exit(2) }
  const all = [...cand.map(x => ({ ...x, arm: x.stratum })), ...ctlV, ...ctlR]
  let seed = 20261003, tries = 0, order, letters
  for (;;) {
    tries++
    const r = rng(seed++)
    order = shuffleWith(all.slice(), r)
    const q = {}; for (const a of new Set(all.map(x => x.arm))) q[a] = flatLetters(all.filter(x => x.arm === a).length, r)
    letters = order.map(x => q[x.arm].pop())
    if (!periodicity(letters.join('')).fail) { order.r = r; break }
    if (tries > 500) { console.error('REFUSING: no E8-clean deal in 500 seeds'); process.exit(2) }
  }
  const blind = {}, key = {}
  order.forEach((it, i) => {
    const bid = `L${String(i + 1).padStart(2, '0')}`
    blind[bid] = { options: place(it, letters[i], order.r) }
    key[bid] = { letter: letters[i], localId: it.id, arm: it.arm }
  })
  writeFileSync(D + 'map-pilot-2-oo.blind.json', JSON.stringify(blind, null, 1) + '\n')
  writeFileSync(D + 'map-pilot-2-oo.key.json', JSON.stringify(key, null, 1) + '\n')
  console.log(`oo render: ${order.length} items, seeds tried ${tries}; E8 on the blind sequence ${letters.join('')}`)
  const deal = {}; Object.values(key).forEach(k => { (deal[k.arm] ??= {})[k.letter] = (deal[k.arm][k.letter] ?? 0) + 1 })
  for (const [a, d] of Object.entries(deal)) { const n = Object.values(d).reduce((x, y) => x + y, 0); console.log(`  arm ${a.padEnd(13)} n=${String(n).padStart(2)} deal ${JSON.stringify(d)} best-fixed-letter ${(100 * Math.max(...Object.values(d)) / n).toFixed(1)}%`) }
} else if (mode === 'ws') {
  let seed = 20261004, tries = 0, order, letters, r
  for (;;) {
    tries++; r = rng(seed++)
    order = shuffleWith(cand.slice(), r)
    letters = flatLetters(24, r)
    if (!periodicity(letters.join('')).fail) break
    if (tries > 500) { console.error('REFUSING: no E8-clean deal'); process.exit(2) }
  }
  const key = {}, md = [`# Items for review (24)\n\nEach item: strand, stated grade target and target band, passage (if any), question, four options. The correct answer is NOT marked.\n`]
  order.forEach((it, i) => {
    const n = i + 1, opts = place(it, letters[i], r)
    key[n] = { letter: letters[i], localId: it.id, stratum: it.stratum, target_band: it.target_band }
    md.push(`---\n\n## Item ${n}\n\nStrand: ${it.map_strand} | Grade target: ${it.grade_target} | Target band: ${it.target_band}${it.stratum === 'usage' && /Parts of Speech|Phrases/.test(it.map_strand) ? ' | GRAMMAR ITEM: report dimensions_varied' : ''}\n`)
    if (it.passage) md.push(`Passage:\n\n${it.passage}\n`)
    md.push(`Question: ${it.prompt}\n`)
    md.push(SL.map(s => `${s}. ${opts[s]}`).join('\n') + '\n')
  })
  writeFileSync(D + 'map-pilot-2.ws.md', md.join('\n'))
  writeFileSync(D + 'map-pilot-2.ws.key.json', JSON.stringify(key, null, 1) + '\n')
  console.log(`ws render: 24 items, seeds tried ${tries}; key sequence ${letters.join('')}`)
} else { console.error('usage: map-pilot-2-render.mjs oo|ws'); process.exit(2) }
