#!/usr/bin/env node
/**
 * dedupe-cluster.mjs — collapse near-duplicate items to one per cluster.
 *
 * DRY RUN BY DEFAULT. Writes nothing without --apply.
 *
 * ── Why clustering, not pairs ────────────────────────────────────────
 * check-duplicate-items.mjs reports PAIRS: 895 of them over 308 items.
 * Archiving one side of every pair would be wrong twice over — it would
 * archive far too many (a group of four mutual near-copies produces six
 * pairs), and it would sometimes archive both members of a chain.
 *
 * The right unit is the connected component. Four items that are all
 * near-copies of each other are ONE question, and the bank should keep
 * one of them.
 *
 * ── Which survivor ───────────────────────────────────────────────────
 * Deliberately boring and deterministic, in this order:
 *
 *   1. Not archived (never resurrect a dead row over a live one)
 *   2. Has a graphic, if any member does — a Geometry item without its
 *      figure is the degraded copy
 *   3. Longer explanation — the wrong-answer explanation is what the
 *      student reads after; more of it is better
 *   4. Most recently updated
 *   5. id, so the result is stable across runs
 *
 * No model judges which item is "better". This is a mechanical choice
 * among items already established to be near-identical; a model here
 * would add cost and a source of drift for no gain.
 *
 * ── What --apply does ────────────────────────────────────────────────
 * Sets archived = true on the losers. It does NOT delete: archived rows
 * stay readable, stay out of every draw, and the decision is reversible
 * with one UPDATE. Given a scan earlier today mistook archived rows for
 * live ones, being able to walk this back matters more than tidiness.
 *
 * usage:
 *   dedupe-cluster.mjs [--family sat] [--threshold 0.5]     # dry run
 *   dedupe-cluster.mjs --family sat --apply
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const THRESHOLD = Number(process.argv[process.argv.indexOf('--threshold') + 1]) || 0.50
const APPLY = process.argv.includes('--apply')
const famArg = process.argv.indexOf('--family')
const family = famArg > -1 ? process.argv[famArg + 1] : 'sat'

const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const norm = s => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
function questionSig(item) {
  const choices = Array.isArray(item?.choices)
    ? item.choices.map(c => (typeof c === 'string' ? c : c?.text ?? '')).slice().sort() : []
  return norm([item?.prompt ?? '', ...choices, item?.graphic ? JSON.stringify(item.graphic) : ''].join(' '))
}
const passageSig = item => norm(item?.passage ?? '')
function shingles(text, k = 5) {
  const t = text.replace(/\s+/g, ' ')
  if (t.length <= k) return new Set(t ? [t] : [])
  const out = new Set()
  for (let i = 0; i + k <= t.length; i++) out.add(t.slice(i, i + k))
  return out
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}
/* ── The same-answer requirement, added 2026-08-14 ───────────────────
 * The first dry run proposed archiving 228 items. Reading the largest
 * cluster (32 items) showed the proposal was WRONG: they were
 * Pythagorean-triple problems that share almost all their prose and
 * have DIFFERENT answers. That is not duplication, it is the practice
 * variety the bank is supposed to have — a student who does five of
 * them does five different pieces of work.
 *
 * Scoring the 895 live pairs by whether the stored answer matches:
 *
 *     same answer        106 pairs   genuinely one question twice
 *     different answer   789 pairs   constants swapped on purpose
 *
 * So near-identical PROSE is necessary but nowhere near sufficient. A
 * pair only collapses if solving one tells you the answer to the other,
 * which requires the answer to be the same.
 *
 * This is deliberately conservative in the one direction that matters:
 * a missed duplicate costs a student a repeated question, an archived
 * variant costs the bank an item nobody can get back without a restore.
 */
function sameAnswer(a, b) {
  const key = it => {
    const raw = it?.correct_answer
    if (raw == null) return null
    // choices may be strings or {text}; compare the TEXT, never the
    // index — several cohorts store the key as a letter and the option
    // order is not stable across items.
    const ch = Array.isArray(it?.choices)
      ? it.choices.map(c => (typeof c === 'string' ? c : c?.text ?? '')) : []
    if (typeof raw === 'number') return norm(ch[raw] ?? '')
    const s = String(raw).trim()
    const asLetter = /^[A-Da-d]$/.test(s) ? ch['ABCD'.indexOf(s.toUpperCase())] : null
    return norm(asLetter ?? s)
  }
  const ka = key(a), kb = key(b)
  return ka != null && kb != null && ka !== '' && ka === kb
}

function isDup(a, b, t = THRESHOLD) {
  if (jaccard(a.q, b.q) < t) return false
  if (!a.p.size && !b.p.size) return sameAnswer(a.item, b.item)
  if (jaccard(a.p, b.p) < t) return false
  return sameAnswer(a.item, b.item)
}

const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from('study_item_bank')
    .select('id, domain, item, updated_at, archived')
    .eq('family', family).eq('archived', false).range(from, from + 999)
  if (error) throw new Error(`study_item_bank: ${error.message}`)
  rows.push(...(data ?? []))
  if (!data || data.length < 1000) break
}
if (!rows.length) throw new Error(`no live ${family} items`)

/* Union-find. A cluster is a connected component, so a chain A~B~C
 * collapses to one survivor even when A and C are not similar to each
 * other — they are still the same question by transitivity of "near
 * copy", and keeping A and C would keep two versions of it. */
const parent = new Map(rows.map(r => [r.id, r.id]))
const find = x => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x) } return x }
const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb) }

const byDomain = new Map()
for (const r of rows) {
  if (!byDomain.has(r.domain)) byDomain.set(r.domain, [])
  byDomain.get(r.domain).push({ ...r, q: shingles(questionSig(r.item)), p: shingles(passageSig(r.item)) })
}
for (const items of byDomain.values()) {
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++)
      if (isDup(items[i], items[j])) union(items[i].id, items[j].id)
}

const clusters = new Map()
for (const r of rows) {
  const root = find(r.id)
  if (!clusters.has(root)) clusters.set(root, [])
  clusters.get(root).push(r)
}
const multi = [...clusters.values()].filter(c => c.length > 1)

const score = r => [
  r.archived ? 1 : 0,
  r.item?.graphic ? 0 : 1,
  -(String(r.item?.explanation ?? '').length),
  -(Date.parse(r.updated_at) || 0),
  r.id,
]
function pickSurvivor(cluster) {
  return [...cluster].sort((a, b) => {
    const sa = score(a), sb = score(b)
    for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sa[i] < sb[i] ? -1 : 1
    return 0
  })[0]
}

const losers = []
const perDomain = new Map()
for (const c of multi) {
  const keep = pickSurvivor(c)
  for (const r of c) if (r.id !== keep.id) {
    losers.push(r)
    perDomain.set(r.domain, (perDomain.get(r.domain) ?? 0) + 1)
  }
}

console.log(`\n${family} dedupe — ${APPLY ? 'APPLYING' : 'DRY RUN'}, threshold ${THRESHOLD}\n`)
console.log(`  live items          ${rows.length}`)
console.log(`  clusters of 2+      ${multi.length}`)
console.log(`  items involved      ${multi.reduce((n, c) => n + c.length, 0)}`)
console.log(`  survivors kept      ${multi.length}`)
console.log(`  TO ARCHIVE          ${losers.length}   (${((100 * losers.length) / rows.length).toFixed(1)}% of live)`)
console.log(`  bank after          ${rows.length - losers.length}\n`)
console.log('  per cohort:')
for (const [d, n] of [...perDomain].sort((a, b) => b[1] - a[1])) {
  const total = byDomain.get(d)?.length ?? 0
  console.log(`    ${d.padEnd(36)} archive ${String(n).padStart(3)} of ${String(total).padStart(4)}  (${((100 * n) / total).toFixed(1)}%)`)
}
const sizes = multi.map(c => c.length).sort((a, b) => b - a)
console.log(`\n  largest clusters: ${sizes.slice(0, 8).join(', ')}`)

if (!APPLY) {
  console.log('\n  DRY RUN — nothing written. Re-run with --apply to archive the losers.')
  process.exit(0)
}

let done = 0
for (let i = 0; i < losers.length; i += 100) {
  const ids = losers.slice(i, i + 100).map(r => r.id)
  const { error } = await db.from('study_item_bank').update({ archived: true }).in('id', ids)
  if (error) throw new Error(`archive failed at ${i}: ${error.message}`)
  done += ids.length
}
console.log(`\n  archived ${done} item(s).`)
const { count } = await db.from('study_item_bank')
  .select('id', { count: 'exact', head: true }).eq('family', family).eq('archived', false)
console.log(`  live ${family} items now: ${count}  (expected ${rows.length - losers.length})`)
if (count !== rows.length - losers.length) console.log('  *** COUNT MISMATCH — investigate before trusting this ***')
