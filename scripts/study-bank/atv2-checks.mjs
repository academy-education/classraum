#!/usr/bin/env node
/**
 * ATV2 pre-flight machine checks over atv2-items.json (files only).
 *
 *   node atv2-checks.mjs            run all checks
 *   node atv2-checks.mjs --fixture  BREAK-TEST: run the kill-quote checker
 *                                   against a built-in known-bad fixture and
 *                                   exit 0 only if the checker FAILS it.
 *
 * Checks (per ATV2-DESIGN.md):
 *   1. kill-quote anchoring: every distractor rationale quotes a >=3-word
 *      span present verbatim (normalized) in its lecture's transcript
 *   2. key letter spread exactly 6/6/6/6
 *   3. key length rank: no rank slot > 40% of keys
 *   4. hedge / absolute word balance, keys vs distractors
 *   5. sibling leakage: no shared content 3-gram between options of
 *      DIFFERENT pivots in the same lecture
 *   6. cross-lecture near-duplicate options (Jaccard >= 0.6)
 */
import { readFileSync } from 'node:fs'

const DIR = '/Users/andylee/Downloads/saas/classraum/scripts/study-bank'
const norm = (s) => s
  .replace(/[‘’ʼ]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/[–—]/g, '-')
  .replace(/\s+/g, ' ')
  .toLowerCase()
  .trim()

// extract quoted spans from a rationale (straight or curly, single or double)
function quotedSpans(reason) {
  const spans = []
  // double / curly-double quotes: straightforward
  const dq = /["“]([^"“”]+)["”]/g
  let m
  while ((m = dq.exec(reason)) !== null) spans.push(m[1])
  // curly single quotes: ’ doubles as apostrophe, so the CLOSING ’ must not
  // be followed by a letter (team’s stays inside the span)
  const cs = /‘((?:[^‘’]|’(?=[a-z]))+)’(?![a-z])/gi
  while ((m = cs.exec(reason)) !== null) spans.push(m[1])
  // straight single quotes: ' doubles as apostrophe too — opening ' must not
  // follow a letter, closing ' must not precede one
  const ss = /(?<![a-z])'((?:[^']|'(?=[a-z]))+)'(?![a-z])/gi
  while ((m = ss.exec(reason)) !== null) spans.push(m[1])
  return spans
}

function checkKillQuotes(rows, transcripts) {
  const failures = []
  for (const row of rows) {
    const t = norm(transcripts[row._meta.lecture])
    for (const r of row.item.distractor_rationales) {
      const spans = quotedSpans(r.reason)
      const ok = spans.some(s => s.trim().split(/\s+/).length >= 3 && t.includes(norm(s)))
      if (!ok) failures.push(`${row._meta.lecture}/${row._meta.pivot} distractor "${r.choice.slice(0, 40)}..." — no >=3-word verbatim span (spans found: ${spans.length})`)
    }
  }
  return failures
}

if (process.argv.includes('--fixture')) {
  // BREAK-TEST: known-bad fixture — quote is NOT in the transcript, plus a
  // curly-apostrophe variant that IS in it (must pass), plus a 2-word quote
  // (must fail even though present).
  const transcript = 'Transcript: The team’s cores showed a wetter phase, not a drier one, in the final decades.'
  const fixtureRows = [
    { _meta: { lecture: 'fx', pivot: 'q1' }, item: { distractor_rationales: [
      { choice: 'bad-quote', reason: 'The professor says "the fields were abandoned early" which rules this out.' },
    ] } },
    { _meta: { lecture: 'fx', pivot: 'q2' }, item: { distractor_rationales: [
      { choice: 'good-quote-curly', reason: "Killed by 'the team's cores showed a wetter phase' in the talk." },
    ] } },
    { _meta: { lecture: 'fx', pivot: 'q3' }, item: { distractor_rationales: [
      { choice: 'too-short', reason: 'The talk says "final decades" so this is wrong.' },
    ] } },
  ]
  const fails = checkKillQuotes(fixtureRows, { fx: transcript })
  const badCaught = fails.some(f => f.includes('bad-quote'))
  const shortCaught = fails.some(f => f.includes('too-short'))
  const goodPassed = !fails.some(f => f.includes('good-quote-curly'))
  if (badCaught && shortCaught && goodPassed) {
    console.log('BREAK-TEST PASSED: checker fails the bad + short quotes and passes the curly-apostrophe good quote')
    process.exit(0)
  }
  console.error('BREAK-TEST FAILED:', { badCaught, shortCaught, goodPassed, fails })
  process.exit(1)
}

const bank = JSON.parse(readFileSync(`${DIR}/atv2-items.json`, 'utf8'))
const rows = bank.rows
if (rows.length !== 24) { console.error(`FAIL: expected 24 rows, got ${rows.length}`); process.exit(1) }
let failed = false
const flunk = (msg) => { console.error('FAIL: ' + msg); failed = true }

// transcripts per lecture
const transcripts = {}
for (const row of rows) transcripts[row._meta.lecture] = row.item.passage

// 1. kill quotes
const kq = checkKillQuotes(rows, transcripts)
if (kq.length) kq.forEach(flunk)
else console.log(`kill quotes: 72/72 anchored (${rows.length} items x 3)`)

// 2. letter spread
const spread = {}
for (const row of rows) spread[row._meta.key_letter] = (spread[row._meta.key_letter] ?? 0) + 1
if (!['A', 'B', 'C', 'D'].every(l => spread[l] === 6)) flunk(`letter spread not flat: ${JSON.stringify(spread)}`)
else console.log('letter spread: 6/6/6/6')

// 3. key length rank
const rankCount = [0, 0, 0, 0]
for (const row of rows) {
  const lens = row.item.choices.map(c => c.length)
  const keyLen = row.item.correct_answer.length
  const rank = lens.filter(l => l > keyLen).length // 0 = key longest
  rankCount[rank]++
}
console.log(`key length rank (longest..shortest): ${rankCount.join('/')}`)
if (rankCount.some(c => c > 24 * 0.4)) flunk('a length-rank slot exceeds 40% of keys')

// 4. hedge / absolute balance
const HEDGES = ['may ', 'might ', 'probably', 'perhaps', 'somewhat', 'largely', 'mostly', 'mainly', 'tends ', 'suggests', 'appears']
const ABSOLUTES = ['only ', 'never ', ' all ', 'entirely', 'always', 'nothing ', 'every ', 'completely']
const rate = (opts, list) => opts.filter(o => list.some(w => (' ' + o.toLowerCase() + ' ').includes(w))).length / opts.length
const keys = rows.map(r => r.item.correct_answer)
const dists = rows.flatMap(r => r.item.choices.filter(c => c !== r.item.correct_answer))
const hK = rate(keys, HEDGES), hD = rate(dists, HEDGES), aK = rate(keys, ABSOLUTES), aD = rate(dists, ABSOLUTES)
console.log(`hedge rate keys ${(hK * 100).toFixed(1)}% vs distractors ${(hD * 100).toFixed(1)}%; absolutes ${(aK * 100).toFixed(1)}% vs ${(aD * 100).toFixed(1)}%`)
if (Math.abs(hK - hD) > 0.25 || Math.abs(aK - aD) > 0.25) flunk('hedge/absolute imbalance beyond 25 points')

// 5. sibling 3-gram leakage (options of different pivots, same lecture)
const STOP = new Set(['the', 'and', 'that', 'was', 'were', 'with', 'from', 'for', 'its', 'his', 'her', 'has', 'had', 'have', 'not', 'but', 'into', 'than', 'they', 'their', 'this', 'which', 'been', 'because', 'rather', 'instead', 'about', 'when', 'while', 'professor', 'says', 'more', 'most'])
const grams = (s) => {
  const w = norm(s).replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean)
  const out = []
  for (let i = 0; i + 2 < w.length; i++) {
    const g = w.slice(i, i + 3)
    if (g.every(x => STOP.has(x))) continue
    out.push(g.join(' '))
  }
  return out
}
// Waivers: adjudicated hits, each with its reason on the record. Option text
// is frozen post-selection, so a benign hit is waived here (visibly), never
// edited away. The blind attack remains the gate on whether it matters.
const WAIVED = [
  { lec: 'atv2-p2', gram: 'at the time', why: 'contentless temporal idiom (misread AT THE TIME / justified AT THE TIME); no content word shared' },
  { lec: 'atv2-p5', gram: 'the shift was', why: 'topic noun phrase, present in both stems; load-bearing predicates differ (complete-before-borrowing vs finished-by-1811), and neither option confirms the other pivot\'s key' },
  { lec: 'atv2-p5', gram: 'shift was already', why: 'same single overlap as above — the shared 4-gram "the shift was already" (complete WHEN BORROWED vs finished A CENTURY AGO); one adjudication, two 3-gram shadows' },
]
const byLecture = {}
for (const row of rows) (byLecture[row._meta.lecture] ??= []).push(row)
let leaks = 0
for (const lec in byLecture) {
  const rs = byLecture[lec]
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
    for (const oi of rs[i].item.choices) for (const oj of rs[j].item.choices) {
      const gi = new Set(grams(oi))
      const shared = grams(oj).filter(g => gi.has(g))
      for (const g of shared) {
        const w = WAIVED.find(x => x.lec === lec && x.gram === g)
        if (w) { console.log(`sibling 3-gram WAIVED ${lec} ${rs[i]._meta.pivot}x${rs[j]._meta.pivot}: "${g}" — ${w.why}`) }
        else { flunk(`sibling 3-gram ${lec} ${rs[i]._meta.pivot}x${rs[j]._meta.pivot}: "${g}"`); leaks++ }
      }
    }
  }
}
if (!leaks) console.log('sibling 3-gram leakage: none beyond waived')

// 6. cross-lecture near-duplicates
const tok = (s) => new Set(norm(s).replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(w => w.length > 2))
const allOpts = rows.flatMap(r => r.item.choices.map(c => ({ lec: r._meta.lecture, c })))
let dups = 0
for (let i = 0; i < allOpts.length; i++) for (let j = i + 1; j < allOpts.length; j++) {
  if (allOpts[i].lec === allOpts[j].lec) continue
  const a = tok(allOpts[i].c), b = tok(allOpts[j].c)
  const inter = [...a].filter(x => b.has(x)).length
  const jac = inter / (a.size + b.size - inter)
  if (jac >= 0.6) { flunk(`cross-lecture near-dup (J=${jac.toFixed(2)}): "${allOpts[i].c.slice(0, 40)}" ~ "${allOpts[j].c.slice(0, 40)}"`); dups++ }
}
if (!dups) console.log('cross-lecture near-duplicates: none')

process.exit(failed ? 1 : 0)
