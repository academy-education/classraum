#!/usr/bin/env node
/**
 * A12 — Build a Sentence repeats itself.
 *
 * The register sized this as "28 of 119, plus 1 exact duplicate pair",
 * from the production gate's count of items sharing their first THREE
 * chips exactly. That measure is wrong in both directions, and
 * check-bas-templates.mjs shows how:
 *
 *   exact whole sentence      0 items    (the "exact duplicate pair"
 *                                         was already archived by 077)
 *   first three chips        27 in 12    (what the gate reports)
 *   family at Jaccard 0.60   18 in  8
 *   family at Jaccard 0.50   32 in 10    (largest family: 6)
 *
 * The gate splits "the data | collected during the SURVEY | were
 * analyzed" from "the data | collected during the EXPERIMENT | were
 * analyzed" into two separate groups, and misses entirely that six
 * different items are all "the results were analyzed by the research
 * team using advanced software". Same failure as the Email n-gram
 * check: an exact measure cannot see a paraphrase.
 *
 * ── What is repaired, and what is deliberately NOT ────────────────────
 *
 * ARCHIVE at >= 0.60 only. At that distance the two items are one
 * sentence reworded — "after lengthy discussion last Friday" against
 * "after lengthy debate last week" — and a student who assembles one
 * has assembled the other.
 *
 * The 0.50 band is left alone, because it contains pairs that are
 * genuinely worth having:
 *
 *   the STUDENTS who had studied diligently were praised by the PRINCIPAL
 *   the PROFESSOR who had studied diligently was praised by the STUDENTS
 *
 * That is a minimal pair on who-does-what to whom, which is exactly
 * what this task type is for. Archiving it would cost a good item to
 * satisfy a number. The band is recorded in the register instead.
 *
 * NOTHING IS RE-AUTHORED HERE. CLAUDE.md's SAT Math finding is the
 * reason: "the rewrite itself would have been the risk, since every
 * touched item is a chance to introduce a new tell." Thinning a
 * redundant family introduces nothing; commissioning 32 replacements
 * to one brief is how the last three cross-item tells got made.
 *
 * usage: node apply-a12-fix.mjs [--dry]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const DRY = process.argv.includes('--dry')
const THRESHOLD = 0.60
const DRAW_NEEDS = 10          // arrange_words per Writing test, from assemble.ts
const MIN_POOL_MULTIPLE = 5    // refuse to thin below 5x the draw
const MIN_PER_DIFFICULTY = 15

const FUNCTION_WORDS = new Set(('the a an of to in on at by for with from that which who whom whose where when while '
  + 'was were is are be been being had has have having did does do not and or but if then than as so '
  + 'i you he she it we they her his their its my your our them him us me'
).split(' '))

const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9\s|]/g, '').replace(/\s+/g, ' ').trim()
const sentence = item => norm(item.correct_answer).replace(/\s*\|\s*/g, ' ')
const chipCount = item => String(item.correct_answer ?? '').split('|').filter(s => s.trim()).length

export function jaccard(a, b) {
  const A = new Set(norm(a).split(' ').filter(w => w && !FUNCTION_WORDS.has(w)))
  const B = new Set(norm(b).split(' ').filter(w => w && !FUNCTION_WORDS.has(w)))
  if (!A.size || !B.size) return 0
  let hit = 0
  for (const w of A) if (B.has(w)) hit++
  return hit / (A.size + B.size - hit)
}

/* Connected components — A~B and B~C puts all three in one family. */
export function families(rows, thresh) {
  const p = rows.map((_, i) => i)
  const find = i => (p[i] === i ? i : (p[i] = find(p[i])))
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      if (jaccard(sentence(rows[i].item), sentence(rows[j].item)) >= thresh) p[find(i)] = find(j)
    }
  }
  const m = new Map()
  rows.forEach((r, i) => {
    const k = find(i)
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(r)
  })
  return [...m.values()]
}

/*
 * Which member of a family survives.
 *
 * Scarcest difficulty FIRST, and that ordering is load bearing. The
 * obvious rule — keep the item with the most chips — silently strips
 * the easy end of the pool, because longer sentences were authored
 * harder. Run on this bank it removes 5 of 25 easy items and 0 of 39
 * hard ones. Preferring the scarcest difficulty present in the family
 * keeps the mix intact; chip count and then id only break ties.
 */
export function pickSurvivor(family, rarity) {
  return [...family].sort((a, b) =>
    (rarity.get(a.item.difficulty) ?? 99) - (rarity.get(b.item.difficulty) ?? 99)
    || chipCount(b.item) - chipCount(a.item)
    || a.id.localeCompare(b.id))[0]
}

/* ── self-test ─────────────────────────────────────────────────────── */
if (process.argv.includes('--selftest')) {
  const fail = []
  const it = (id, s, difficulty) => ({ id, item: { correct_answer: s, difficulty } })
  const rows = [
    it('a', 'The proposal | that included several amendments | was approved | by the committee | after lengthy discussion | last Friday', 'medium'),
    it('b', 'The proposal | that included several amendments | was approved | by the committee | after lengthy debate | last week', 'medium'),
    it('c', 'The museum | which was designed | by a renowned architect | attracts thousands of visitors', 'easy'),
  ]
  const f = families(rows, THRESHOLD).filter(g => g.length > 1)
  if (f.length !== 1 || f[0].length !== 2) fail.push(`expected one family of 2, got ${JSON.stringify(f.map(g => g.length))}`)
  if (f[0] && f[0].some(r => r.id === 'c')) fail.push('an unrelated sentence was pulled into the family')

  // Transitivity: A~B, B~C, A!~C must still be ONE family.
  const chain = [
    it('x', 'The results | were analyzed | by the research team | using advanced software', 'medium'),
    it('y', 'The results | were analyzed | by the research team | using advanced tools', 'medium'),
    it('z', 'The results | were analyzed | by the research team | with advanced tools', 'medium'),
  ]
  if (families(chain, THRESHOLD).filter(g => g.length > 1)[0]?.length !== 3) fail.push('transitive family did not merge')

  // The survivor rule must prefer the scarce difficulty, not the long sentence.
  const rarity = new Map([['easy', 0], ['hard', 1], ['medium', 2]])
  const pick = pickSurvivor([
    it('long', 'a | b | c | d | e | f | g', 'medium'),
    it('short', 'a | b | c', 'easy'),
  ], rarity)
  if (pick.id !== 'short') fail.push('survivor rule kept the long medium item over the scarce easy one')
  // ...and chip count still breaks a tie WITHIN one difficulty.
  const tie = pickSurvivor([it('s', 'a | b | c', 'easy'), it('l', 'a | b | c | d | e', 'easy')], rarity)
  if (tie.id !== 'l') fail.push('chip count did not break the within-difficulty tie')

  if (fail.length) { console.error('SELFTEST FAILED:'); fail.forEach(f => console.error('  ' + f)); process.exit(1) }
  console.log('selftest passed')
  process.exit(0)
}

/* ── live ──────────────────────────────────────────────────────────── */
const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } })

const all = []
for (let f = 0; ; f += 1000) {
  const { data } = await db.from('study_item_bank').select('id, item, verify_meta, archived').order('id').range(f, f + 999)
  if (!data?.length) break
  all.push(...data)
  if (data.length < 1000) break
}
const bas = all.filter(r => r.item?.type === 'arrange_words' && !r.archived)

const counts = new Map()
for (const r of bas) counts.set(r.item.difficulty, (counts.get(r.item.difficulty) ?? 0) + 1)
// rarity: 0 = scarcest difficulty in the pool
const rarity = new Map([...counts].sort((a, b) => a[1] - b[1]).map(([k], i) => [k, i]))

const groups = families(bas, THRESHOLD).filter(g => g.length > 1)
const problems = []
const doomed = []

for (const g of groups) {
  const keep = pickSurvivor(g, rarity)
  if (!keep) { problems.push('a family produced no survivor'); continue }
  for (const r of g) if (r.id !== keep.id) doomed.push({ row: r, keep })
}

const survivors = bas.length - doomed.length
if (survivors < DRAW_NEEDS * MIN_POOL_MULTIPLE) {
  problems.push(`pool would fall to ${survivors}, below ${DRAW_NEEDS * MIN_POOL_MULTIPLE} (${MIN_POOL_MULTIPLE}x a draw of ${DRAW_NEEDS})`)
}
const after = new Map(counts)
for (const d of doomed) after.set(d.row.item.difficulty, after.get(d.row.item.difficulty) - 1)
for (const [k, n] of after) {
  if (n < MIN_PER_DIFFICULTY) problems.push(`difficulty "${k}" would fall to ${n}, below ${MIN_PER_DIFFICULTY}`)
}
// No family may lose every member, and no survivor may itself be doomed.
const doomedIds = new Set(doomed.map(d => d.row.id))
for (const g of groups) {
  if (g.every(r => doomedIds.has(r.id))) problems.push('a family would lose every member')
}
for (const d of doomed) {
  if (doomedIds.has(d.keep.id)) problems.push(`${d.row.id.slice(0, 8)}: its survivor ${d.keep.id.slice(0, 8)} is itself being archived`)
}

if (problems.length) {
  console.error(`ABORTED — ${problems.length} problem(s), nothing written:`)
  problems.forEach(p => console.error('  ' + p))
  process.exit(1)
}

console.log(`Build a Sentence: ${bas.length} live`)
console.log(`families at Jaccard >= ${THRESHOLD}: ${groups.length}, covering ${groups.reduce((n, g) => n + g.length, 0)} items`)
console.log(`difficulty rarity order (scarcest first): ${[...rarity].map(([k]) => k).join(' < ')}\n`)
for (const g of groups) {
  const keep = pickSurvivor(g, rarity)
  console.log(`  family of ${g.length}`)
  for (const r of g) {
    console.log(`    ${r.id === keep.id ? 'KEEP   ' : 'archive'}  ${r.id.slice(0, 8)}  [${r.item.difficulty}, ${chipCount(r.item)} chips]  ${sentence(r.item).slice(0, 78)}`)
  }
}
console.log(`\nafter: ${survivors} live, ${[...after].map(([k, n]) => `${k} ${n}`).join(', ')}`)
if (DRY) { console.log('\nDRY RUN — nothing written'); process.exit(0) }

let ok = 0
for (const d of doomed) {
  const meta = d.row.verify_meta ?? {}
  const { error } = await db.from('study_item_bank').update({
    archived: true,
    verify_meta: {
      ...meta,
      archived_reason: `A12: same sentence family as ${d.keep.id} (content-word Jaccard >= ${THRESHOLD}); reversible`,
      a12_archived_at: new Date().toISOString(),
      a12_survivor: d.keep.id,
    },
  }).eq('id', d.row.id)
  if (error) { console.error('ERR ' + d.row.id + ': ' + error.message); process.exit(1) }
  ok++
}
console.log(`\narchived ${ok}`)
