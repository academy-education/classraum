#!/usr/bin/env node
/**
 * attack-figure-blind.mjs — the gate that did not exist for 132 items.
 *
 * ── Why this is a different attack ───────────────────────────────────
 * bank-targets.ts moved all 848 maths items to NOT_APPLICABLE because
 * the standard attack keeps the STEM, and a maths stem is the whole
 * problem — handing a solver the stem hands it everything, so "100%
 * blind" measured whether the solver could do algebra.
 *
 * But 132 of those maths items carry a FIGURE, and for those there IS
 * a withheld source: the graphic. That caveat has sat in
 * MATHS_WITH_GRAPHIC since 2026-08-04 saying the gate "does not exist
 * yet". This is it.
 *
 * ── Read the number the OTHER way round ──────────────────────────────
 * For the verbal attack, a high blind score is the defect: the item
 * leaks its answer through the options.
 *
 * Here a high score means something different and equally bad: the
 * figure is DECORATIVE. If a solver can do the problem with the figure
 * removed, then either the stem restates everything the figure shows,
 * or the figure was never load-bearing. Either way a student who
 * cannot read a diagram is not being tested on reading a diagram, and
 * the item does not measure what the SAT says it measures.
 *
 * A LOW score here is the healthy result — the opposite of every other
 * gate in this directory. That inversion is exactly the kind of thing
 * that gets misread six months from now, so the scorer prints the
 * interpretation in words rather than leaving a bare percentage.
 *
 * The control still matters: a solver can guess a letter without doing
 * anything, so the floor is the best fixed-slot strategy, not zero.
 *
 * usage:
 *   attack-figure-blind.mjs sample [n]
 *   attack-figure-blind.mjs score
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const TAG = 'figure-blind-2026-08-05'
const LETTERS = ['A', 'B', 'C', 'D']
const base = new URL(`./${TAG}`, import.meta.url).pathname
const MATHS = ['Algebra', 'Advanced Math', 'Geometry and Trigonometry', 'Problem-Solving and Data Analysis']

const SEED = 20260805
function rng(s) {
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const rand = rng(SEED)
const shuffled = a => { a = [...a]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a }

function loadEnv() {
  const raw = readFileSync(process.cwd() + '/.env.local', 'utf8')
  return Object.fromEntries(raw.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
}

async function sample(n) {
  const env = loadEnv()
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } })

  // Paginated. `.limit()` does not lift PostgREST's 1000-row cap — that
  // cost a wrong number in attack-generated.mjs earlier today.
  const PAGE = 1000
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from('study_item_bank')
      .select('id, domain, item')
      .in('domain', MATHS)
      .neq('archived', true)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }

  const withFigure = rows.filter(r => r.item?.graphic && typeof r.item.graphic === 'object')
  const usable = []
  for (const r of withFigure) {
    const it = r.item
    if (!Array.isArray(it.choices) || it.choices.length !== 4) continue
    if (typeof it.correct_answer !== 'string') continue
    const keyIndex = it.choices.indexOf(it.correct_answer)
    if (keyIndex < 0) continue
    usable.push({
      id: r.id, domain: r.domain, stem: String(it.prompt ?? ''),
      choices: it.choices, keyIndex,
      figureType: it.graphic.type ?? null,
      // Kept only for the report — never rendered to a solver.
      caption: it.graphic.caption ?? null,
    })
  }

  console.log(`maths items read: ${rows.length}`)
  console.log(`carrying a figure: ${withFigure.length}`)
  console.log(`usable (4 options, locatable key): ${usable.length}`)
  const byType = {}
  for (const u of usable) byType[u.figureType ?? '(none)'] = (byType[u.figureType ?? '(none)'] ?? 0) + 1
  console.log(`figure types: ${Object.entries(byType).map(([k, v]) => `${k}:${v}`).join('  ')}`)
  if (usable.length < n) throw new Error(`only ${usable.length} usable, asked for ${n}`)

  const picked = shuffled(usable).slice(0, n)
  const slots = shuffled(picked.map((_, i) => LETTERS[i % 4]))

  const blind = [], key = {}
  picked.forEach((it, i) => {
    const id = String(i + 1)
    const letter = slots[i]
    const rest = shuffled(it.choices.filter((_, ix) => ix !== it.keyIndex))
    const opts = LETTERS.map(L => (L === letter ? it.choices[it.keyIndex] : rest.pop()))
    if (opts.some(o => o === undefined)) throw new Error(`item ${id}: unfilled slot`)
    blind.push({
      id,
      question: it.stem,
      // The figure is named but NOT described. A solver must know a
      // figure existed — otherwise it would read the stem as complete
      // and the test would be about something else — but must get
      // nothing from it. The caption is withheld too: captions here run
      // to "Scatterplot of study hours vs score, best-fit line shown",
      // which is most of the information.
      figureWithheld: true,
      options: Object.fromEntries(opts.map((o, ix) => [LETTERS[ix], o])),
    })
    key[id] = { letter, domain: it.domain, figureType: it.figureType, itemId: it.id }
  })

  const outs = ['.blind.json', '.key.json'].map(x => base + x)
  if (outs.some(existsSync) && !process.argv.includes('--force')) {
    console.error('REFUSING TO OVERWRITE an existing render.')
    process.exit(1)
  }
  writeFileSync(outs[0], JSON.stringify(blind, null, 2))
  writeFileSync(outs[1], JSON.stringify(key, null, 2))

  const counts = LETTERS.map(L => Object.values(key).filter(k => k.letter === L).length)
  console.log(`\nitems ${blind.length}  key letters ${LETTERS.map((L, i) => `${L}:${counts[i]}`).join(' ')}`)
  console.log(`best fixed-letter control = ${(100 * Math.max(...counts) / blind.length).toFixed(1)}%`)

  // Nothing describing the figure may survive into the render.
  const rendered = JSON.stringify(blind).toLowerCase()
  const bad = ['svg', 'rowlabels', 'collabels', 'bestfit', 'caption']
    .filter(w => rendered.includes(w))
  if (bad.length) throw new Error(`figure data leaked into the render: ${bad.join(', ')}`)
  console.log('no figure data in the render: confirmed')
}

function score() {
  const key = JSON.parse(readFileSync(base + '.key.json', 'utf8'))
  const ids = Object.keys(key)
  const counts = LETTERS.map(L => ids.filter(i => key[i].letter === L).length)
  const control = 100 * Math.max(...counts) / ids.length

  const rows = []
  for (const s of ['a', 'b', 'c']) {
    const f = `${base}.solver-${s}.json`
    if (!existsSync(f)) continue
    const ans = JSON.parse(readFileSync(f, 'utf8'))
    const got = ids.filter(i => (ans[i]?.answer ?? ans[i]) === key[i].letter).length
    rows.push({ s, got, pct: 100 * got / ids.length })
  }
  if (!rows.length) { console.error('no solver files found'); process.exit(1) }
  for (const r of rows) console.log(`solver ${r.s}  ${r.got}/${ids.length} = ${r.pct.toFixed(1)}%`)

  const mean = rows.reduce((a, r) => a + r.pct, 0) / rows.length
  const margin = mean - control
  console.log(`\nMEAN ${mean.toFixed(1)}%   control ${control.toFixed(1)}%   margin ${margin > 0 ? '+' : ''}${margin.toFixed(1)}pts`)

  /*
   * The interpretation, in words, because this gate reads BACKWARDS
   * from every other one in this directory and a bare percentage will
   * be misread.
   */
  console.log('\nREAD THIS THE OTHER WAY ROUND:')
  console.log('  a HIGH score means the figure is DECORATIVE — the item is solvable without it.')
  console.log('  a LOW score (at control) is the HEALTHY result — the figure is load-bearing.')
  if (margin >= 25) {
    console.log(`\n=> FAIL. +${margin.toFixed(1)}pts without the figure. These items do not test`)
    console.log('   figure reading; the stem carries the problem and the graphic is illustration.')
  } else if (margin >= 10) {
    console.log(`\n=> MIXED. +${margin.toFixed(1)}pts. Some figures are redundant. Worth reading the`)
    console.log('   per-item answers to see which.')
  } else {
    console.log(`\n=> PASS. +${margin.toFixed(1)}pts over control — the figure is doing the work.`)
  }

  const byType = {}
  for (const i of ids) {
    const t = key[i].figureType ?? '(none)'
    byType[t] = byType[t] ?? { n: 0, right: 0 }
    byType[t].n++
    for (const s of ['a', 'b', 'c']) {
      const f = `${base}.solver-${s}.json`
      if (!existsSync(f)) continue
      const ans = JSON.parse(readFileSync(f, 'utf8'))
      if ((ans[i]?.answer ?? ans[i]) === key[i].letter) byType[t].right += 1 / rows.length
    }
  }
  console.log('\nby figure type (a table that restates its data in the stem is the likely offender):')
  for (const [t, v] of Object.entries(byType)) {
    console.log(`  ${t.padEnd(14)} ${v.n} items, ${(100 * v.right / v.n).toFixed(0)}% solved blind`)
  }
}

const cmd = process.argv[2]
if (cmd === 'sample') await sample(Number(process.argv[3]) || 24)
else if (cmd === 'score') score()
else { console.error('usage: attack-figure-blind.mjs sample [n] | score'); process.exit(1) }
