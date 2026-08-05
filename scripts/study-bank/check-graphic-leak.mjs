#!/usr/bin/env node
/**
 * check-graphic-leak.mjs — does a figure hand over its own answer?
 *
 * READ ONLY. Never writes to the bank.
 *
 * ── Why ──────────────────────────────────────────────────────────────
 * The blind attack withholds the passage and the audio. It does NOT
 * withhold the GRAPHIC, because a maths item without its figure is not
 * a harder item, it is an unanswerable one. So a figure that states the
 * answer in its own caption or axis labels is invisible to every gate
 * in this directory — the solver was shown it on purpose.
 *
 * QuestionGraphicView.tsx renders `graphic.caption` as a figcaption and
 * every `label` / `xLabel` / `yLabel` as SVG text, so anything in those
 * fields is on the student's screen. Nobody had looked at what is in
 * them.
 *
 * ── What it flags ────────────────────────────────────────────────────
 *   answer-in-figure-text     every number in the key appears in one
 *                             string the student can read. Fatal: read
 *                             the caption, skip the maths.
 *   figure-number-in-caption  the caption names a figure/item number —
 *                             a batch-position tell rather than a leak.
 *
 * And one printed but NOT asserted: the key is the only option whose
 * value the figure draws. A figure legitimately contains the values you
 * compute from, so that is suspicious rather than wrong — the same
 * distinction the elimination gate got wrong by treating "disliked" as
 * "confidently rejectable".
 *
 * ── --selftest, and why it exists ────────────────────────────────────
 * The first live run reported ZERO leaks across 164 graphics. A clean
 * bank and a broken checker are indistinguishable from that output, and
 * this repo has already published "0 problems" from a verifier reading
 * a truncated table. So --selftest drives the same detector over
 * fixtures whose answer is known and asserts it fires — and, just as
 * importantly, that it stays QUIET on a figure that merely plots the
 * key's own value, which every well-formed scatter plot does.
 *
 * usage:
 *   node check-graphic-leak.mjs --selftest     # no DB, proves it fires
 *   node check-graphic-leak.mjs [domain]       # sweep the live bank
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

/** Every string the student can SEE in the rendered figure. */
function visibleText(g) {
  const out = []
  const walk = (node, key) => {
    if (node == null) return
    if (typeof node === 'string') {
      // These are the keys QuestionGraphicView actually renders.
      if (['caption', 'label', 'xLabel', 'yLabel', 'title', 'note'].includes(key)) out.push(node)
      return
    }
    if (Array.isArray(node)) { for (const v of node) walk(v, key); return }
    if (typeof node === 'object') { for (const [k, v] of Object.entries(node)) walk(v, k) }
  }
  walk(g, null)
  return out
}

/** Every number the figure draws, wherever it sits in the structure. */
function visibleNumbers(g) {
  const out = []
  const walk = node => {
    if (typeof node === 'number' && Number.isFinite(node)) { out.push(node); return }
    if (Array.isArray(node)) { for (const v of node) walk(v); return }
    if (node && typeof node === 'object') { for (const v of Object.values(node)) walk(v) }
  }
  walk(g)
  return out
}

const numsIn = s => (String(s).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)

/** Standalone-token match, so "5" does not match "15" or "x5". */
const hasToken = (hay, needle) =>
  new RegExp(`(^|[^\\w.])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\w.]|$)`, 'i').test(hay)

const FIG_NUM = /\b(figure|fig\.?|item|question|q)\s*\d+/i

/** Scan ONE item. Extracted so --selftest can drive it without a DB. */
function scanItem(row, findings, suspicious) {
  const it = row.item
  const key = it.correct_answer
  if (typeof key !== 'string' || !key.trim()) return
  const choices = Array.isArray(it.choices) ? it.choices : []

  const texts = visibleText(it.graphic)
  const blob = texts.join('   ')
  const keyNums = numsIn(key)

  /*
   * The answer, in text the student can read.
   *
   * Matched on the key's NUMBERS rather than its prose: a key of "24
   * square units" and a caption reading "area = 24" are the same leak,
   * and a prose comparison misses it. ALL of the key's numbers must
   * appear in ONE string, so an axis that merely ticks past 24 does not
   * trip it.
   */
  if (keyNums.length) {
    for (const t of texts) {
      const hit = keyNums.filter(n => hasToken(t, String(n)))
      if (hit.length === keyNums.length) {
        findings.push({
          id: row.id, domain: row.domain,
          kind: 'answer-in-figure-text',
          detail: `key "${key}" — every number in it appears in figure text: "${t}"`,
        })
        break
      }
    }
  }

  // The answer is the ONLY option whose value the figure draws.
  const drawn = new Set(visibleNumbers(it.graphic).map(n => String(n)))
  if (drawn.size && choices.length === 4 && keyNums.length === 1) {
    const drawnFor = c => numsIn(c).some(n => drawn.has(String(n)))
    if (drawnFor(key) && choices.filter(c => c !== key).filter(drawnFor).length === 0) {
      suspicious.push({
        id: row.id, domain: row.domain,
        detail: `key "${key}" is the only option whose value the figure draws`,
      })
    }
  }

  if (FIG_NUM.test(blob)) {
    findings.push({
      id: row.id, domain: row.domain,
      kind: 'figure-number-in-caption',
      detail: (blob.match(FIG_NUM) ?? [''])[0],
    })
  }
}

// ── self-test ────────────────────────────────────────────────────────
if (process.argv.includes('--selftest')) {
  const cases = [
    ['caption states the key', 'answer-in-figure-text', {
      correct_answer: '24', choices: ['18', '20', '24', '30'],
      graphic: { type: 'bar', caption: 'Total area = 24 square units', bars: [{ label: 'A', value: 7 }] },
    }],
    ['axis label states the key', 'answer-in-figure-text', {
      correct_answer: '150', choices: ['120', '150', '160', '200'],
      graphic: { type: 'bar', xLabel: 'peak at 150 units', bars: [{ label: 'x', value: 3 }] },
    }],
    ['multi-number key fully present in a caption', 'answer-in-figure-text', {
      correct_answer: '(3, 8)', choices: ['(3, 8)', '(4, 9)', '(2, 7)', '(5, 1)'],
      graphic: { type: 'scatter', caption: 'vertex at 3 across and 8 up' },
    }],
    ['figure number in caption', 'figure-number-in-caption', {
      correct_answer: '12', choices: ['10', '11', '12', '13'],
      graphic: { type: 'bar', caption: 'Figure 3 — monthly totals' },
    }],
    // Must stay QUIET: the figure plots the key's coordinates, which is
    // what a scatter plot is for. Flagging this would fire on every
    // well-formed graph and therefore mean nothing.
    ['figure merely plots the key\'s point', null, {
      correct_answer: '(3, 8)', choices: ['(3, 8)', '(4, 9)', '(2, 7)', '(5, 1)'],
      graphic: { type: 'scatter', xLabel: 'time (s)', yLabel: 'height (m)', points: [[3, 8]] },
    }],
    ['clean figure', null, {
      correct_answer: '24', choices: ['18', '20', '24', '30'],
      graphic: { type: 'bar', caption: 'Rainfall by month', bars: [{ label: 'Jan', value: 7 }] },
    }],
  ]
  let bad = 0
  for (const [name, expected, item] of cases) {
    const f = [], sus = []
    scanItem({ id: 'fixture', domain: 'test', item }, f, sus)
    const kinds = f.map(x => x.kind)
    const ok = expected === null ? kinds.length === 0 : kinds.includes(expected)
    if (!ok) bad++
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}  ->  [${kinds.join(', ') || 'none'}]`)
  }
  console.log(bad
    ? `\n${bad} self-test(s) FAILED — do not trust a clean sweep from this build.`
    : '\nself-test passed: fires on real leaks, quiet on well-formed figures.')
  process.exit(bad ? 1 : 0)
}

// ── live sweep ───────────────────────────────────────────────────────
const onlyDomain = process.argv[2] ?? null

const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } })

/*
 * .range() pagination, NOT .limit(). PostgREST caps a response at 1000
 * rows and .limit() above that returns 1000 silently — a verifier here
 * already reported "0 problems" from a bank truncated that way, having
 * never loaded the rows carrying the defect.
 */
const rows = []
for (let from = 0; ; from += 1000) {
  let q = db.from('study_item_bank').select('id, domain, item, archived')
    .order('id', { ascending: true }).range(from, from + 999)
  if (onlyDomain) q = q.eq('domain', onlyDomain)
  const { data, error } = await q
  if (error) { console.error('read failed:', error.message); process.exit(2) }
  if (!data?.length) break
  rows.push(...data)
  if (data.length < 1000) break
}

const live = rows.filter(r => !r.archived && r.item?.graphic)
console.log(`${rows.length} rows read, ${live.length} live items carry a graphic\n`)
if (live.length === 0) { console.log('nothing to check'); process.exit(0) }

const findings = []
const suspicious = []
for (const row of live) scanItem(row, findings, suspicious)

const byKind = findings.reduce((m, f) => ((m[f.kind] = (m[f.kind] ?? 0) + 1), m), {})
console.log('DEFECTS')
if (findings.length === 0) console.log('  none — run --selftest before believing this')
for (const [k, n] of Object.entries(byKind)) console.log(`  ${k}: ${n}`)
for (const f of findings.slice(0, 25)) {
  console.log(`\n  ${f.id}  [${f.domain}]  ${f.kind}`)
  console.log(`    ${f.detail}`)
}
if (findings.length > 25) console.log(`\n  … and ${findings.length - 25} more`)

console.log(`\nSUSPICIOUS, for a human to judge (${suspicious.length})`)
for (const s of suspicious.slice(0, 15)) {
  console.log(`  ${s.id}  [${s.domain}]  ${s.detail}`)
}
if (suspicious.length > 15) console.log(`  … and ${suspicious.length - 15} more`)

process.exit(findings.length ? 1 : 0)
