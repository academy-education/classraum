#!/usr/bin/env node
/**
 * A5 says "pool is 35 texts, too few". Measure it before authoring.
 *
 * CLAUDE.md: "measure the population before believing the backlog" —
 * the SAT Math hub entry said CONFIRMED bank-wide at 64.4% and was
 * actually 8% outside one cohort, and acting on it would have rewritten
 * ~690 sound items.
 *
 * The stated fix for A5 is to author new Daily Life items, and that is
 * the expensive, historically-failed path: the 2026-07-28 repair batch
 * scored 95% with the passages DELETED and was discarded rather than
 * banked. So before commissioning anything, three cheaper questions:
 *
 *   1. How thin is 35 really? Repetition depends on the draw, not on
 *      the pool size alone.
 *   2. Are any of the 68 single-question texts actually SHARING a
 *      passage, i.e. already a 2-question set that was mis-grouped?
 *      passageGroupId has been re-keyed by content before (task 194),
 *      so this failure has precedent here.
 *   3. Are any single-question texts near-duplicates of each other,
 *      which would mean a merge deepens the pool at zero authoring
 *      risk — the A12 move.
 *
 * READ ONLY. `--selftest` covers the grouping helpers.
 *
 * usage: node check-daily-life-pool.mjs [--selftest]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

export function passageKey(item) { return norm(item.passage) }

const STOP = new Set(('the a an of to in on at by for with from that which who and or but if is are was were be been '
  + 'this these those it its as not you your we our they their he she her his i my me'
).split(' '))

export function jaccard(a, b) {
  const A = new Set(norm(a).split(' ').filter(w => w && !STOP.has(w)))
  const B = new Set(norm(b).split(' ').filter(w => w && !STOP.has(w)))
  if (!A.size || !B.size) return 0
  let hit = 0
  for (const w of A) if (B.has(w)) hit++
  return hit / (A.size + B.size - hit)
}

/*
 * WRONG MODEL, KEPT DELIBERATELY. See formsBeforeRecycle below.
 *
 * This is the memoryless case: each form draws at random with no
 * knowledge of what the student has already seen. It gives 79.2% at
 * two forms on a pool of 32 and it is NOT what this app does —
 * assemble.ts ranks unseen-first via `orderGroups` against the
 * study_item_exposures ledger, and BOTH full-test draw paths record
 * into it (assemble.ts:1263 and :1355).
 *
 * It stays because the difference between the two numbers is the whole
 * finding: the alarming version was the first thing measured here and
 * would have justified an authoring programme that the real draw makes
 * unnecessary until form 7.
 */
export function repeatChanceMemoryless(pool, sets, tests) {
  const drawn = sets * tests
  if (drawn > pool) return 1
  let p = 1
  for (let i = 0; i < drawn; i++) p *= (pool - i) / pool
  return 1 - p
}

/*
 * What actually happens. Unseen sets are served first, so a student
 * sees NO repeat until the pool is exhausted; only then does recycling
 * begin, oldest-exposure first.
 */
export function formsBeforeRecycle(pool, setsPerForm) {
  return Math.floor(pool / setsPerForm)
}

if (process.argv.includes('--selftest')) {
  const fail = []
  if (passageKey({ passage: 'The Library!  Closes at 6pm.' }) !== passageKey({ passage: 'the library closes at 6pm' })) {
    fail.push('passageKey did not fold punctuation and case')
  }
  if (passageKey({ passage: 'a' }) === passageKey({ passage: 'b' })) fail.push('passageKey collapsed different texts')
  if (jaccard('the pool closes at six for maintenance', 'the pool closes at six for repairs') < 0.5) fail.push('jaccard too low on a near-duplicate')
  if (jaccard('the pool closes at six', 'lecture moved to hall b') > 0.1) fail.push('jaccard too high on unrelated texts')
  // Drawing MORE than the pool is certain. Drawing exactly the pool is
  // 1 - pool!/pool^pool = 0.9996 at pool 10, NOT 1 — the first fixture
  // here asserted exact 1 and was wrong about the maths, not about the
  // function.
  if (repeatChanceMemoryless(10, 5, 3) !== 1) fail.push('over-drawing the pool should be a certain repeat')
  if (!(repeatChanceMemoryless(10, 5, 2) > 0.99)) fail.push('drawing exactly the pool should be near-certain')
  if (repeatChanceMemoryless(35, 1, 1) !== 0) fail.push('a single draw cannot repeat')
  const p = repeatChanceMemoryless(35, 5, 2)
  if (!(p > 0.5 && p < 1)) fail.push(`repeatChanceMemoryless(35,5,2) = ${p.toFixed(3)}, expected strictly between 0.5 and 1`)
  if (fail.length) { console.error('SELFTEST FAILED:'); fail.forEach(f => console.error('  ' + f)); process.exit(1) }
  console.log('selftest passed')
  process.exit(0)
}

const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } })

const all = []
for (let f = 0; ; f += 1000) {
  const { data } = await db.from('study_item_bank').select('id, item, item_type, archived').order('id').range(f, f + 999)
  if (!data?.length) break
  all.push(...data)
  if (data.length < 1000) break
}
const dl = all.filter(r => !r.archived && r.item_type === 'multiple_choice' && r.item?.readingTask === 'daily_life')
console.log(`Daily Life: ${dl.length} live items\n`)

/* ── 1. sets as the DRAW sees them (by passageGroupId) ─────────────── */
const byGroup = new Map()
for (const r of dl) {
  const g = r.item.passageGroupId ?? `__ungrouped_${r.id}`
  if (!byGroup.has(g)) byGroup.set(g, [])
  byGroup.get(g).push(r)
}
const sizes = new Map()
for (const [, v] of byGroup) sizes.set(v.length, (sizes.get(v.length) ?? 0) + 1)
console.log('SETS BY passageGroupId (what the draw uses)')
for (const [n, c] of [...sizes].sort((a, b) => a[0] - b[0])) {
  console.log(`  ${String(c).padStart(3)} texts carry ${n} question${n > 1 ? 's' : ''}`)
}
const drawable = [...byGroup.values()].filter(v => v.length >= 2)
console.log(`  drawable (2+ questions): ${drawable.length} sets, ${drawable.reduce((n, v) => n + v.length, 0)} items`)

/* ── 2. the question that could deepen the pool for free ──────────── */
console.log('\nDO ANY SINGLES SHARE A PASSAGE? (grouped by exact passage text)')
const singles = [...byGroup.values()].filter(v => v.length === 1).map(v => v[0])
const byText = new Map()
for (const r of singles) {
  const k = passageKey(r.item)
  if (!k) continue
  if (!byText.has(k)) byText.set(k, [])
  byText.get(k).push(r)
}
const mergeable = [...byText.values()].filter(v => v.length > 1)
if (!mergeable.length) console.log('  none — every single-question text is a distinct passage')
for (const v of mergeable) {
  console.log(`  x${v.length}  ${v[0].item.passage.replace(/\s+/g, ' ').slice(0, 90)}`)
  for (const r of v) console.log(`        ${r.id.slice(0, 8)}  ${String(r.item.prompt).replace(/\s+/g, ' ').slice(0, 76)}`)
}

console.log('\nNEAR-DUPLICATE SINGLE-QUESTION PASSAGES (Jaccard >= 0.60)')
const near = []
for (let i = 0; i < singles.length; i++) {
  for (let j = i + 1; j < singles.length; j++) {
    const s = jaccard(singles[i].item.passage, singles[j].item.passage)
    if (s >= 0.6 && passageKey(singles[i].item) !== passageKey(singles[j].item)) near.push([s, singles[i], singles[j]])
  }
}
near.sort((a, b) => b[0] - a[0])
if (!near.length) console.log('  none at >= 0.60')
for (const [s, a, b] of near.slice(0, 15)) {
  console.log(`  ${s.toFixed(2)}  ${a.id.slice(0, 8)} ${a.item.passage.replace(/\s+/g, ' ').slice(0, 84)}`)
  console.log(`        ${b.id.slice(0, 8)} ${b.item.passage.replace(/\s+/g, ' ').slice(0, 84)}`)
}

/* ── 3. how thin is thin ──────────────────────────────────────────── */
const pool = drawable.length
const SETS_PER_FORM = 5   // blueprint draws 10 daily_life items, all sets are 2

console.log('\nHOW OFTEN A STUDENT MEETS THE SAME SET TWICE')
console.log(`  pool ${pool} sets, ${SETS_PER_FORM} sets per form\n`)
console.log(`  ACTUAL (assemble.ts ranks unseen-first per student, and both`)
console.log(`  full-test paths write study_item_exposures):`)
console.log(`    no repeat at all until form ${formsBeforeRecycle(pool, SETS_PER_FORM) + 1}`)
console.log(`    doubling the pool to ${pool * 2} would push that to form ${formsBeforeRecycle(pool * 2, SETS_PER_FORM) + 1}`)
console.log(`\n  MEMORYLESS (what a pool-size-only argument implies — NOT this app):`)
for (const tests of [2, 3, 4]) {
  console.log(`    ${tests} forms: ${(100 * repeatChanceMemoryless(pool, SETS_PER_FORM, tests)).toFixed(1)}%`)
}
console.log('\n  The gap between those two blocks is the finding. Sizing this')
console.log('  work off the pool alone overstates it by five forms.')
