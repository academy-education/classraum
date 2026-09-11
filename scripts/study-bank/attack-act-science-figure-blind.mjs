#!/usr/bin/env node
/**
 * attack-act-science-figure-blind.mjs — figure-blind attack on the 120
 * live ACT Science items, pre-registered in
 * ACT-SCIENCE-ATTACK-PREREG-2026-09-12.md.
 *
 * Render = stem + four options. Passage, figure and caption withheld.
 * Files are leakage-free: at most one item per passage group per file
 * (ACT-ATTACK-RESULT.md: interleaving one passage's items took ACT
 * English from 90% to 76%).
 *
 * Keys are dealt FLAT so a constant-letter solver scores exactly chance.
 *
 *   node scripts/study-bank/attack-act-science-figure-blind.mjs render
 *   node scripts/study-bank/attack-act-science-figure-blind.mjs score
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const DIR = 'scripts/study-bank'
const LETTERS = ['A', 'B', 'C', 'D']
const FILES = 6

let s = 20260912 >>> 0
const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

function db() {
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}

/* PostgREST caps at 1000 and an UNORDERED .range() in this repo once
 * returned 1000 rows with 165 duplicates. Always order, then verify. */
async function readAll(admin, section) {
  const PAGE = 500, rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin.from('study_item_bank')
      .select('id, section, domain, difficulty, passage_group_id, cohort, item')
      .eq('family', 'act').eq('section', section).eq('verified', true)
      .neq('archived', true)
      .order('id', { ascending: true }).range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }
  const uniq = new Set(rows.map(r => r.id)).size
  console.log(`${section}: ${rows.length} rows, ${uniq} distinct ids`)
  if (uniq !== rows.length) throw new Error('duplicate rows from the pager')
  return rows
}

function deal(list, tag, fileNo) {
  // flat letter deal: equal counts per letter, as near as n allows
  const slots = shuffle(list.map((_, i) => LETTERS[i % 4]))
  const blind = [], key = {}
  shuffle(list).forEach((r, i) => {
    const id = String(i + 1), it = r.item
    const keyIndex = it.choices.indexOf(it.correct_answer)
    if (keyIndex < 0) throw new Error(`${r.id}: key not among choices`)
    const rest = shuffle(it.choices.filter((_, ix) => ix !== keyIndex))
    const letter = slots[i]
    const opts = LETTERS.map(L => (L === letter ? it.choices[keyIndex] : rest.pop()))
    if (opts.some(o => o === undefined)) throw new Error(`${id}: unfilled slot`)
    blind.push({ id, question: String(it.prompt ?? ''), sourceWithheld: true,
      options: Object.fromEntries(opts.map((o, ix) => [LETTERS[ix], o])) })
    key[id] = { letter, itemId: r.id, group: r.passage_group_id, domain: r.domain,
      difficulty: r.difficulty, hasFigure: !!r.item.graphic,
      figureType: r.item.graphic?.type ?? null }
  })

  // Nothing from the withheld source may survive into the render.
  for (const b of blind) {
    if (Object.keys(b).sort().join() !== 'id,options,question,sourceWithheld')
      throw new Error('unexpected field in the render')
  }
  const rendered = JSON.stringify(blind)
  for (const r of list) {
    const p = String(r.item.passage ?? '')
    const probe = p.slice(0, 60)
    if (probe.length > 20 && rendered.includes(probe)) throw new Error(`${r.id}: passage leaked`)
    const cap = r.item.graphic?.caption
    if (cap && rendered.includes(String(cap))) throw new Error(`${r.id}: caption leaked`)
    if (r.item.explanation && rendered.includes(String(r.item.explanation))) throw new Error(`${r.id}: explanation leaked`)
  }
  if (/<svg|rowLabels|colLabels|"cells"/i.test(rendered)) throw new Error('figure data leaked')

  const bf = `${DIR}/${tag}-f${fileNo}.blind.json`, kf = `${DIR}/${tag}-f${fileNo}.key.json`
  if ((existsSync(bf) || existsSync(kf)) && !process.argv.includes('--force')) {
    console.error(`REFUSING TO OVERWRITE ${bf}`); process.exit(1)
  }
  writeFileSync(bf, JSON.stringify(blind, null, 1))
  writeFileSync(kf, JSON.stringify(key, null, 1))
  const counts = LETTERS.map(L => Object.values(key).filter(k => k.letter === L).length)
  const groups = new Set(list.map(r => r.passage_group_id)).size
  console.log(`  ${tag}-f${fileNo}: ${list.length} items from ${groups} passages (one each: ${groups === list.length})` +
    `  keys ${LETTERS.map((L, i) => `${L}:${counts[i]}`).join(' ')}` +
    `  flat-deal control ${(100 * Math.max(...counts) / list.length).toFixed(1)}%`)
  return key
}

function split(rows, perGroup) {
  const groups = {}
  for (const r of rows) (groups[r.passage_group_id ?? r.id] ??= []).push(r)
  const files = Array.from({ length: FILES }, () => [])
  let dropped = 0
  for (const g of Object.values(groups)) {
    shuffle(g).forEach((r, j) => { if (j < Math.min(FILES, perGroup)) files[j].push(r); else dropped++ })
  }
  return { files, dropped, groups: Object.keys(groups).length }
}

async function render() {
  const admin = db()
  const sci = await readAll(admin, 'science')
  const rd = await readAll(admin, 'reading')
  for (const r of [...sci, ...rd]) {
    if (!Array.isArray(r.item.choices) || r.item.choices.length !== 4) throw new Error(`${r.id}: not 4 choices`)
  }
  console.log('\nBATCH  act science (all 120)')
  const a = split(sci, 6)
  console.log(`  ${sci.length} items in ${a.groups} passages -> ${FILES} files, ${a.dropped} not drawn`)
  a.files.forEach((f, i) => deal(f, 'act-sci-figblind-2026-09-12', i + 1))
  console.log('\nCONTROL  live act reading (what ships)')
  const b = split(rd, 6)
  console.log(`  ${rd.length} items in ${b.groups} passages -> ${FILES} files, ${b.dropped} not drawn`)
  b.files.forEach((f, i) => deal(f, 'act-read-ctl-2026-09-12', i + 1))
}

function scoreTag(tag) {
  const per = [], picks = {}
  let n = 0, right = 0, conf = 0, confRight = 0
  const keyCounts = { A: 0, B: 0, C: 0, D: 0 }
  const meta = {}
  for (let f = 1; f <= FILES; f++) {
    const key = JSON.parse(readFileSync(`${DIR}/${tag}-f${f}.key.json`, 'utf8'))
    const ids = Object.keys(key)
    for (const i of ids) keyCounts[key[i].letter]++
    const solvers = []
    for (const sv of ['a', 'b', 'c']) {
      const p = `${DIR}/${tag}-f${f}.solver-${sv}.json`
      if (!existsSync(p)) { console.error(`MISSING ${p}`); process.exit(1) }
      const ans = JSON.parse(readFileSync(p, 'utf8'))
      const missing = ids.filter(i => !ans[i]?.pick)
      if (missing.length) { console.error(`${p}: ${missing.length} unanswered of ${ids.length}`); process.exit(1) }
      solvers.push({ sv, ans })
      const str = ids.map(i => ans[i].pick).join('')
      ;(picks[`f${f}`] ??= []).push({ sv, str })
    }
    let fr = 0, fn = 0
    for (const i of ids) {
      const m = key[i]
      meta[m.itemId] = { hasFigure: m.hasFigure, figureType: m.figureType, domain: m.domain,
        difficulty: m.difficulty, group: m.group, n: 0, right: 0 }
      for (const { ans } of solvers) {
        const ok = ans[i].pick === m.letter
        n++; fn++; if (ok) { right++; fr++ }
        meta[m.itemId].n++; if (ok) meta[m.itemId].right++
        if (ans[i].basis === 'confident') { conf++; if (ok) confRight++ }
      }
    }
    per.push({ f, items: ids.length, n: fn, right: fr })
  }
  return { per, n, right, conf, confRight, keyCounts, picks, meta }
}

function score() {
  const out = {}
  for (const [label, tag] of [['BATCH  ACT Science', 'act-sci-figblind-2026-09-12'],
                              ['CONTROL  live ACT Reading', 'act-read-ctl-2026-09-12']]) {
    const r = scoreTag(tag); out[tag] = r
    const tot = Object.values(r.keyCounts).reduce((a, b) => a + b, 0)
    const flat = 100 * Math.max(...Object.values(r.keyCounts)) / tot
    console.log(`\n=== ${label} (${tag})`)
    console.log(`  key spread ${JSON.stringify(r.keyCounts)} over ${tot} items -> flat-deal control ${flat.toFixed(1)}%`)
    for (const p of r.per) console.log(`  f${p.f}: ${p.items} items, ${p.right}/${p.n} = ${(100 * p.right / p.n).toFixed(1)}%`)
    console.log(`  POOLED ${r.right}/${r.n} = ${(100 * r.right / r.n).toFixed(1)}%`)
    console.log(`  confident subset ${r.confRight}/${r.conf} = ${r.conf ? (100 * r.confRight / r.conf).toFixed(1) : 'n/a'}%   (${(100 * r.conf / r.n).toFixed(0)}% of picks marked confident)`)
    for (const [f, list] of Object.entries(r.picks)) {
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++)
        if (list[i].str === list[j].str) console.log(`  !! NO VERDICT TRIGGER: ${f} solvers ${list[i].sv}/${list[j].sv} identical pick-strings`)
    }
  }
  const B = out['act-sci-figblind-2026-09-12'], C = out['act-read-ctl-2026-09-12']
  const b = 100 * B.right / B.n, c = 100 * C.right / C.n
  console.log(`\nΔ = ${(b - c > 0 ? '+' : '')}${(b - c).toFixed(1)} pts  (batch ${b.toFixed(1)}% − control ${c.toFixed(1)}%)`)
  console.log(b - c <= 5 ? '=> PASS band' : b - c < 10 ? '=> SECOND READ band' : '=> FAIL band')

  // pre-registered secondary: figure-bearing vs figure-less, inside the batch
  const agg = (pred) => { let n = 0, r = 0
    for (const m of Object.values(B.meta)) if (pred(m)) { n += m.n; r += m.right }
    return { n, r, pct: n ? 100 * r / n : NaN } }
  const fig = agg(m => m.hasFigure), nofig = agg(m => !m.hasFigure)
  console.log(`\nSECONDARY (pre-registered): figure-bearing ${fig.r}/${fig.n} = ${fig.pct.toFixed(1)}%   figure-less ${nofig.r}/${nofig.n} = ${nofig.pct.toFixed(1)}%   Δ ${(fig.pct - nofig.pct).toFixed(1)}`)
  for (const t of ['bar', 'table', 'svg']) { const x = agg(m => m.figureType === t)
    console.log(`  ${t.padEnd(6)} ${Object.values(B.meta).filter(m => m.figureType === t).length} items  ${x.r}/${x.n} = ${x.pct.toFixed(1)}%`) }
  console.log('\nby domain:')
  for (const d of new Set(Object.values(B.meta).map(m => m.domain))) { const x = agg(m => m.domain === d)
    console.log(`  ${x.pct.toFixed(1)}%  (${x.r}/${x.n})  ${d}`) }
  console.log('\nby difficulty:')
  for (const d of ['easy', 'medium', 'hard']) { const x = agg(m => m.difficulty === d)
    console.log(`  ${d.padEnd(7)} ${x.pct.toFixed(1)}%  (${x.r}/${x.n})`) }
  const dist = { 0: 0, 1: 0, 2: 0, 3: 0 }
  for (const m of Object.values(B.meta)) dist[m.right]++
  console.log(`\nper-item: solved by 3 solvers ${dist[3]}, by 2 ${dist[2]}, by 1 ${dist[1]}, by none ${dist[0]}  (of ${Object.keys(B.meta).length} items)`)
  writeFileSync(`${DIR}/act-sci-figblind-2026-09-12.peritem.json`, JSON.stringify(B.meta, null, 1))
}

const cmd = process.argv[2]
if (cmd === 'render') await render()
else if (cmd === 'score') score()
else { console.error('usage: render | score'); process.exit(1) }
