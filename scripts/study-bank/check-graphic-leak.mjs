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
 *   node check-graphic-leak.mjs <batch.json> [...]       # report on THOSE files
 *   node check-graphic-leak.mjs --live [--domain=X]      # sweep the live bank
 *   node check-graphic-leak.mjs --selftest               # no DB, proves it fires
 *
 * A22 (2026-10-02): the positional argument used to be a DOMAIN filter, so
 * a batch path was taken as a domain name, matched zero rows, and printed
 * "0 rows read ... nothing to check" with exit 0 — for every file. Now a
 * positional argument is a batch file, the domain filter is --domain=X and
 * live-only, zero graphics is exit 2 (not a pass), and a math batch's
 * top-level `svg`/`caption` is read the way math-bank-helper inserts it.
 *
 * KNOWN GAP, recorded rather than patched: for svg/rawsvg figures only
 * `caption` is scanned, not the <text> inside the markup. Tick labels live
 * there, so a naive scan would fire on every axis that ticks past the key.
 */
import { isMain, parseCheckerArgs, flagValue, loadBatchFile, loadLive, printDenominator, populationHeader, refuse } from './checker-input.mjs'

const USAGE = 'usage: check-graphic-leak.mjs <batch.json> [...] | --live [--domain=X] | --selftest'

/** The graphic an item renders; a math batch's top-level svg becomes rawsvg on insert. */
export function graphicOf(item) {
  if (item?.graphic) return item.graphic
  if (typeof item?.svg === 'string') return { type: 'rawsvg', svg: item.svg, caption: item.caption || null }
  return null
}

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

/*
 * A figure/item NUMBER in the caption — a position tell.
 *
 * Bare `q` was in this list on the first run and produced the sweep's
 * only "defect": a bar labelled "Q1", meaning Quarter 1, on a revenue
 * chart. A checker whose sole finding is a false positive is worse than
 * one that finds nothing, because it spends the reader's trust. `q` is
 * gone; "question" still matches, and so does "Fig. 3".
 */
const FIG_NUM = /\b(figure|fig\.|item|question)\s*\d+/i

/** Scan ONE item. Extracted so --selftest can drive it without a DB. */
export function scanItem(row, findings, suspicious) {
  const it = { ...row.item, graphic: graphicOf(row.item) }
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
export function selftest(verbose = false) {
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
    // Must stay QUIET: a quarter label on a revenue chart. This was the
    // live sweep's only finding until the bare `q` came out of FIG_NUM.
    ['quarter labels on a bar chart', null, {
      correct_answer: '500', choices: ['410', '460', '540', '500'],
      graphic: {
        type: 'bar', caption: 'Bar graph', xLabel: 'Quarter', yLabel: 'Revenue',
        bars: [{ label: 'Q1', value: 120 }, { label: 'Q2', value: 90 },
               { label: 'Q3', value: 150 }, { label: 'Q4', value: 140 }],
      },
    }],
    ['clean figure', null, {
      correct_answer: '24', choices: ['18', '20', '24', '30'],
      graphic: { type: 'bar', caption: 'Rainfall by month', bars: [{ label: 'Jan', value: 7 }] },
    }],
    // A math batch's top-level svg + caption must be read, not skipped.
    ['top-level svg caption states the key', 'answer-in-figure-text', {
      correct_answer: '42', choices: ['36', '40', '42', '48'],
      svg: '<svg viewBox="0 0 10 10"></svg>', caption: 'The perimeter is 42',
    }],
  ]
  let bad = 0
  for (const [name, expected, item] of cases) {
    const f = [], sus = []
    scanItem({ id: 'fixture', domain: 'test', item }, f, sus)
    const kinds = f.map(x => x.kind)
    const ok = expected === null ? kinds.length === 0 : kinds.includes(expected)
    if (!ok) bad++
    if (verbose || !ok) console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}  ->  [${kinds.join(', ') || 'none'}]`)
  }
  console.log(bad
    ? `${bad} self-test(s) FAILED — do not trust a clean sweep from this build.`
    : `selftest ${cases.length}/${cases.length} pass: fires on real leaks, quiet on well-formed figures.`)
  return bad
}

function report(label, rows) {
  const withGraphic = rows.filter(r => graphicOf(r.item))
  console.log(`\nFIGURE TEXT vs KEY`)
  console.log(`  ${label}`)
  printDenominator('items carrying a graphic', withGraphic.length, rows.length)

  const findings = []
  const suspicious = []
  for (const row of withGraphic) scanItem(row, findings, suspicious)

  const byKind = findings.reduce((m, f) => ((m[f.kind] = (m[f.kind] ?? 0) + 1), m), {})
  console.log('  DEFECTS')
  if (findings.length === 0) console.log('    none — run --selftest before believing this')
  for (const [k, n] of Object.entries(byKind)) console.log(`    ${k}: ${n}`)
  for (const f of findings.slice(0, 25)) {
    console.log(`\n    ${f.id}  [${f.domain}]  ${f.kind}`)
    console.log(`      ${f.detail}`)
  }
  if (findings.length > 25) console.log(`\n    … and ${findings.length - 25} more`)

  console.log(`\n  SUSPICIOUS, for a human to judge (${suspicious.length})`)
  for (const s of suspicious.slice(0, 15)) console.log(`    ${s.id}  [${s.domain}]  ${s.detail}`)
  if (suspicious.length > 15) console.log(`    … and ${suspicious.length - 15} more`)
  return findings.length
}

if (isMain(import.meta.url)) {
  const { mode, paths, flags } = parseCheckerArgs(process.argv, { name: 'check-graphic-leak.mjs', usage: USAGE, extraFlags: ['--domain'], liveOnly: ['--domain'] })
  const stBad = selftest(mode === 'selftest')
  if (mode === 'selftest') process.exit(stBad ? 1 : 0)
  if (stBad) refuse('detector self-test failed — not running')
  let defects = 0
  if (mode === 'live') {
    const onlyDomain = flagValue(flags, '--domain')
    /*
     * .range() pagination, NOT .limit(). PostgREST caps a response at 1000
     * rows and .limit() above that returns 1000 silently — a verifier here
     * already reported "0 problems" from a bank truncated that way, having
     * never loaded the rows carrying the defect.
     */
    const { rows } = await loadLive({
      select: 'id, domain, item',
      filter: q => { q = q.eq('archived', false); return onlyDomain ? q.eq('domain', onlyDomain) : q },
      label: onlyDomain ? `live domain "${onlyDomain}"` : 'live bank',
    })
    defects = report(populationHeader('live') + (onlyDomain ? `, domain=${onlyDomain}` : ''), rows)
  } else {
    for (const p of paths) defects += report(populationHeader('batch', p), loadBatchFile(p))
  }
  process.exit(defects ? 1 : 0)
}
