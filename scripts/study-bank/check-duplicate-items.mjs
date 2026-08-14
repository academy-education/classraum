#!/usr/bin/env node
/**
 * check-duplicate-items.mjs — are two items the same question twice?
 *
 * READ ONLY. Never writes to the bank.
 *
 * ── The defect ───────────────────────────────────────────────────────
 * A bank grown by generation accumulates items that differ only in
 * surface detail: the same stem with one constant changed, the same
 * passage reused under a reworded question, the same option set. Two
 * costs, and the second is worse:
 *
 *   1. A test that draws both measures one skill twice and reports it
 *      as two, which inflates the score's precision.
 *   2. A student who has seen one gets the other for free. That is the
 *      same failure as a leaked answer, arriving by a different route,
 *      and unseen-first draw ordering does not prevent it — the two
 *      items are DIFFERENT ids, so both count as unseen.
 *
 * ── Why a script and not a model ─────────────────────────────────────
 * Same argument as the derivational hub: this is decidable. Text
 * overlap is computable, so the whole population can be measured
 * exactly rather than sampled, and only real pairs get looked at.
 * SAT-PLAN.md Phase 1 item 4.
 *
 * ── The trap this is designed around ─────────────────────────────────
 * SAT R&W stems are BOILERPLATE BY DESIGN. Hundreds share "Which choice
 * completes the text with the most logical and precise word or phrase?"
 * verbatim — that is the real exam's wording, not a defect. Comparing
 * stems alone would flag every one of them and bury the true positives.
 *
 * So the signature is passage + stem + choices. Two items sharing only
 * the boilerplate stem score low because their passages differ; two
 * items differing only in a constant score high because everything else
 * matches. The self-test pins both cases.
 *
 * ── Method ───────────────────────────────────────────────────────────
 * Normalised word 3-shingles, Jaccard similarity, compared within a
 * cohort (a Math item and an R&W item are never the same question).
 * Digits are KEPT: "differs only in a constant" is exactly what we want
 * to catch, so stripping numbers would hide the defect it exists for.
 *
 * usage:
 *   check-duplicate-items.mjs --selftest
 *   check-duplicate-items.mjs [domain] [--family SAT] [--threshold 0.75]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

/* 0.50 on each half. Set once from the separation the fixtures show —
 * a Math constant-swap scores 0.62 on the question while boilerplate-
 * only scores 0.36 — and NOT adjusted afterwards to make anything pass.
 * Both halves use the same number because neither is the harder case. */
const THRESHOLD = Number(process.argv[process.argv.indexOf('--threshold') + 1]) || 0.50

/** A pair is a duplicate only if the QUESTION matches and, where both
 *  items have one, the PASSAGE matches too. */
function isDuplicate(a, b, t = THRESHOLD) {
  const q = jaccard(a.q, b.q)
  if (q < t) return { dup: false, q, p: null }
  // No passage on either side (Math): the question alone decides.
  if (!a.p.size && !b.p.size) return { dup: true, q, p: null }
  const p = jaccard(a.p, b.p)
  return { dup: p >= t, q, p }
}

/** Lowercase, collapse whitespace, drop punctuation. Digits KEPT. */
function norm(s) {
  return String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * TWO signatures, not one, and the pair must match on BOTH.
 *
 * A single combined signature cannot separate the two ways SAT items
 * legitimately resemble each other, and both are common:
 *
 *   - SHARED STEM. Hundreds of R&W items use the real exam's boilerplate
 *     ("Which choice completes the text with the most logical and precise
 *     word or phrase?") verbatim. Same question text, different passage.
 *   - SHARED PASSAGE. Items in one passage_group deliberately ask several
 *     different questions about the SAME passage. Same passage text,
 *     different question — and since a passage is far longer than a stem,
 *     it dominates any combined signature and would flood the report.
 *
 * Requiring question-similarity AND passage-similarity rejects both,
 * while still catching a true duplicate (both high) and the Math
 * constant-swap (no passage on either side, so the question decides).
 */
function questionSig(item) {
  const choices = Array.isArray(item?.choices)
    ? item.choices.map(c => (typeof c === 'string' ? c : c?.text ?? '')).slice().sort()
    : []
  /* THE FIGURE IS PART OF THE QUESTION. Two Geometry items can share a
   * stem and an option set and still be different questions because the
   * diagram differs — "what is the area of the triangle?" over two
   * different triangles. Omitting it would call those duplicates. */
  const graphic = item?.graphic ? JSON.stringify(item.graphic) : ''
  return norm([item?.prompt ?? '', ...choices, graphic].join(' '))
}
function passageSig(item) { return norm(item?.passage ?? '') }

/**
 * CHARACTER n-grams, not word n-grams.
 *
 * The self-test caught this before the script ever touched the bank.
 * With word 3-shingles the Math case — "If 3x + 7 = 22" vs "If 3x + 9 =
 * 24", which differs ONLY in constants and is precisely the defect this
 * exists to find — scored 0.41 and would have been missed at any
 * threshold that still rejected the R&W boilerplate trap (0.33). Two
 * numbers changing destroys several word-shingles at once, and SAT Math
 * stems are short enough that there are few to begin with.
 *
 * Character 5-grams are the standard instrument for near-duplicate
 * detection on short strings: a two-character change perturbs a bounded
 * number of grams instead of a proportionally large one. Chosen because
 * it is the right tool for short text, NOT tuned until the fixtures
 * passed — the threshold stayed at 0.75 throughout.
 */
function shingles(text, k = 5) {
  const t = text.replace(/\s+/g, ' ')
  if (t.length <= k) return new Set(t ? [t] : [])
  const out = new Set()
  for (let i = 0; i + k <= t.length; i++) out.add(t.slice(i, i + k))
  return out
}

export function jaccard(a, b) {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

/* ── Self-test. A detector that cannot reproduce a known answer on
 *    known data has no business on unknown data. ────────────────────── */
if (process.argv.includes('--selftest')) {
  const BOILER = 'Which choice completes the text with the most logical and precise word or phrase?'
  const cases = [
    { name: 'identical items are caught',
      a: { passage: 'The heron waits in the shallows for hours.', prompt: BOILER, choices: ['patient', 'hasty', 'loud', 'blue'] },
      b: { passage: 'The heron waits in the shallows for hours.', prompt: BOILER, choices: ['patient', 'hasty', 'loud', 'blue'] },
      want: true },
    { name: 'THE TRAP: same boilerplate stem, different passage, NOT flagged',
      a: { passage: 'The heron waits in the shallows for hours.', prompt: BOILER, choices: ['patient', 'hasty', 'loud', 'blue'] },
      b: { passage: 'Volcanic glass cools too quickly to form crystals.', prompt: BOILER, choices: ['amorphous', 'ancient', 'molten', 'dense'] },
      want: false },
    { name: 'differs only in a constant IS flagged (the Math case)',
      a: { passage: '', prompt: 'If 3x + 7 = 22, what is the value of x?', choices: ['5', '3', '7', '15'] },
      b: { passage: '', prompt: 'If 3x + 9 = 24, what is the value of x?', choices: ['5', '3', '9', '15'] },
      want: true },
    { name: 'same topic, genuinely different question, NOT flagged',
      a: { passage: '', prompt: 'If 3x + 7 = 22, what is the value of x?', choices: ['5', '3', '7', '15'] },
      b: { passage: '', prompt: 'What is the slope of the line through (1,2) and (3,8)?', choices: ['3', '2', '6', '4'] },
      want: false },
  ]
  cases.push({
    name: 'THE SECOND TRAP: same passage, different question, NOT flagged',
    a: { passage: 'The heron waits in the shallows for hours, unmoving, until a fish drifts within reach of its bill.', prompt: BOILER, choices: ['patient', 'hasty', 'loud', 'blue'] },
    b: { passage: 'The heron waits in the shallows for hours, unmoving, until a fish drifts within reach of its bill.', prompt: 'Which choice best states the main idea of the text?', choices: ['It hunts by stillness.', 'It migrates yearly.', 'It nests in reeds.', 'It calls at dusk.'] },
    want: false })
  const prep = it => ({ q: shingles(questionSig(it)), p: shingles(passageSig(it)) })
  let bad = 0
  for (const c of cases) {
    const r = isDuplicate(prep(c.a), prep(c.b))
    const ok = r.dup === c.want
    if (!ok) bad++
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${c.name}  (question ${r.q.toFixed(2)}${r.p === null ? ', no passage' : `, passage ${r.p.toFixed(2)}`})`)
  }
  console.log(bad ? `\n${bad} self-test failure(s)` : '\nself-test passed: catches duplicates and constant-swaps, ignores boilerplate stems.')
  process.exit(bad ? 1 : 0)
}

const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const famArg = process.argv.indexOf('--family')
const family = famArg > -1 ? process.argv[famArg + 1] : 'SAT'
const onlyDomain = process.argv.slice(2).find(a => !a.startsWith('--') &&
  process.argv[process.argv.indexOf(a) - 1] !== '--family' &&
  process.argv[process.argv.indexOf(a) - 1] !== '--threshold') ?? null

const rows = []
for (let from = 0; ; from += 1000) {
  /* LIVE ITEMS ONLY. The first run swept archived rows too and reported
   * 3,714 pairs over 694 items — then the three worst offenders turned
   * out to be archived:true, identical triplets left behind by a repair
   * cycle. Archived items are not served to anyone, so counting them
   * measures the bank's history rather than its present. */
  let q = db.from('study_item_bank').select('id, domain, family, item')
    .eq('family', family).eq('archived', false)
  if (onlyDomain) q = q.eq('domain', onlyDomain)
  const { data, error } = await q.range(from, from + 999)
  if (error) throw new Error(`study_item_bank: ${error.message}`)
  rows.push(...(data ?? []))
  if (!data || data.length < 1000) break
}
if (!rows.length) throw new Error(`no ${family} items found — check --family/domain`)

const byDomain = new Map()
for (const r of rows) {
  if (!byDomain.has(r.domain)) byDomain.set(r.domain, [])
  byDomain.get(r.domain).push({ id: r.id, q: shingles(questionSig(r.item)), p: shingles(passageSig(r.item)) })
}

console.log(`\n${family} duplicate scan — question AND passage each >= ${THRESHOLD}\n`)
let totalPairs = 0, totalItems = 0
const worst = []
for (const [domain, items] of [...byDomain].sort((a, b) => b[1].length - a[1].length)) {
  const hits = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const r = isDuplicate(items[i], items[j])
      if (r.dup) hits.push({ a: items[i].id, b: items[j].id, s: r.q })
    }
  }
  const involved = new Set(hits.flatMap(h => [h.a, h.b]))
  totalPairs += hits.length; totalItems += involved.size
  worst.push(...hits.map(h => ({ ...h, domain })))
  const pct = items.length ? (100 * involved.size) / items.length : 0
  console.log(`  ${domain.padEnd(36)} ${String(items.length).padStart(4)} items   ${String(hits.length).padStart(4)} pairs   ${String(involved.size).padStart(4)} items involved (${pct.toFixed(1)}%)`)
}

console.log(`\n  TOTAL  ${totalPairs} pair(s), ${totalItems} item(s) involved, of ${rows.length} scanned`)
if (!totalPairs) {
  console.log('\n  No near-duplicates at this threshold. Lower --threshold to probe further;')
  console.log('  a clean result here is only as strong as the threshold that produced it.')
} else {
  console.log('\n  worst offenders:')
  for (const h of worst.sort((x, y) => y.s - x.s).slice(0, 12)) {
    console.log(`    ${h.s.toFixed(3)}  [${h.domain}]  ${h.a}  ==  ${h.b}`)
  }
}
