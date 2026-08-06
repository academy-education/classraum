#!/usr/bin/env node
/**
 * Measure the Build a Sentence pool before deciding what A12 is.
 *
 * The production gate counts items that share their first THREE chips
 * exactly, and reports 28 of 119 in 12 groups. That is an exact-match
 * measure, and exact-match measures have now failed twice in this
 * directory in the same way:
 *
 *   - the Email near-duplicate check compared 4-grams and scored two
 *     paraphrases at 4.2%
 *   - this gate reports "the data | collected during the survey | were
 *     analyzed" and "the data | collected during the experiment | were
 *     analyzed" as two SEPARATE groups
 *
 * Those two are one template with one word changed. So before treating
 * "28 of 119" as the size of A12, the pool gets measured three ways —
 * exact opening, syntactic skeleton, and whole-sentence similarity —
 * and the three numbers are printed side by side rather than one being
 * picked.
 *
 * READ ONLY. `--selftest` runs the functions over fixtures with known
 * answers, including the pair the gate splits.
 *
 * usage: node check-bas-templates.mjs [--selftest]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9\s|]/g, '').replace(/\s+/g, ' ').trim()

export function chipsOf(item) {
  return String(item.correct_answer ?? '').split('|').map(c => norm(c)).filter(Boolean)
}

/*
 * The skeleton: the sentence with its CONTENT words removed, keeping
 * only function words and structural markers. Two items built from one
 * template land on the same skeleton even when every noun differs.
 *
 * Deliberately crude. It is reported next to the exact count so a
 * reader can see how much of the collapse is real and how much is the
 * measure being blunt — not used on its own to condemn an item.
 */
const FUNCTION_WORDS = new Set(('the a an of to in on at by for with from that which who whom whose where when while '
  + 'was were is are be been being had has have having did does do not and or but if then than as so '
  + 'i you he she it we they her his their its my your our them him us me'
).split(' '))

export function skeleton(sentence) {
  return norm(sentence).split(' ').filter(Boolean)
    .map(w => FUNCTION_WORDS.has(w) ? w : '_')
    .join(' ')
}

export function jaccard(a, b) {
  const A = new Set(norm(a).split(' ').filter(w => w && !FUNCTION_WORDS.has(w)))
  const B = new Set(norm(b).split(' ').filter(w => w && !FUNCTION_WORDS.has(w)))
  if (!A.size || !B.size) return 0
  let hit = 0
  for (const w of A) if (B.has(w)) hit++
  return hit / (A.size + B.size - hit)
}

/* group by a key function, returning only the groups with >1 member */
export function collide(rows, keyOf) {
  const m = new Map()
  for (const r of rows) {
    const k = keyOf(r)
    if (!k) continue
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(r)
  }
  return [...m].filter(([, v]) => v.length > 1)
}

if (process.argv.includes('--selftest')) {
  const fail = []
  const survey = 'The data | collected during the survey | were analyzed | by the team'
  const experiment = 'The data | collected during the experiment | were analyzed | by the team'
  const unrelated = 'Having completed her degree | Maria | moved | to Berlin'

  // The exact-opening measure splits the pair — that is the premise.
  const open = s => chipsOf({ correct_answer: s }).slice(0, 3).join(' | ')
  if (open(survey) === open(experiment)) fail.push('fixture is wrong: the two openings should NOT match exactly')

  // The skeleton must join them.
  if (skeleton(survey) !== skeleton(experiment)) {
    fail.push(`skeleton split the pair: "${skeleton(survey)}" vs "${skeleton(experiment)}"`)
  }
  // And must NOT join an unrelated sentence.
  if (skeleton(survey) === skeleton(unrelated)) fail.push('skeleton collapsed two unrelated sentences')

  if (jaccard(survey, experiment) < 0.55) fail.push(`jaccard on the pair was ${jaccard(survey, experiment).toFixed(2)}, expected >= 0.55`)
  if (jaccard(survey, unrelated) > 0.10) fail.push(`jaccard on the unrelated pair was ${jaccard(survey, unrelated).toFixed(2)}, expected <= 0.10`)

  // collide() must find groups, and must not invent them.
  const g = collide([{ s: 'a' }, { s: 'a' }, { s: 'b' }], r => r.s)
  if (g.length !== 1 || g[0][1].length !== 2) fail.push('collide() did not group correctly')

  if (fail.length) { console.error('SELFTEST FAILED:'); fail.forEach(f => console.error('  ' + f)); process.exit(1) }
  console.log('selftest passed')
  console.log(`  exact opening splits the survey/experiment pair; skeleton joins it: "${skeleton(survey)}"`)
  process.exit(0)
}

const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } })

const all = []
for (let f = 0; ; f += 1000) {
  const { data } = await db.from('study_item_bank').select('id, item, archived, difficulty').order('id').range(f, f + 999)
  if (!data?.length) break
  all.push(...data)
  if (data.length < 1000) break
}
const bas = all.filter(r => r.item?.type === 'arrange_words' && !r.archived)
console.log(`Build a Sentence: ${bas.length} live items\n`)

const key = r => norm(r.item.correct_answer).replace(/\s*\|\s*/g, ' ')

const measures = [
  ['exact whole sentence', r => key(r)],
  ['first three chips (what the gate counts)', r => chipsOf(r.item).slice(0, 3).join(' | ')],
  ['syntactic skeleton', r => skeleton(key(r))],
]
console.log('COLLISIONS, three ways')
for (const [label, fn] of measures) {
  const g = collide(bas, fn)
  const items = g.reduce((n, [, v]) => n + v.length, 0)
  console.log(`  ${String(items).padStart(3)} items in ${String(g.length).padStart(2)} groups  ${label}`)
}

console.log('\nSKELETON GROUPS (the measure the gate does not have)')
const sk = collide(bas, r => skeleton(key(r))).sort((a, b) => b[1].length - a[1].length)
for (const [k, v] of sk) {
  console.log(`  x${v.length}  ${k}`)
  for (const r of v) console.log(`        ${r.id.slice(0, 8)}  ${key(r)}`)
}

console.log('\nHIGH-SIMILARITY PAIRS NOT CAUGHT BY ANY EXACT MEASURE')
const seen = new Set(sk.flatMap(([, v]) => v.map(r => r.id)))
const pairs = []
for (let i = 0; i < bas.length; i++) {
  for (let j = i + 1; j < bas.length; j++) {
    const s = jaccard(key(bas[i]), key(bas[j]))
    if (s >= 0.5 && !(seen.has(bas[i].id) && seen.has(bas[j].id))) pairs.push([s, bas[i], bas[j]])
  }
}
pairs.sort((a, b) => b[0] - a[0])
if (!pairs.length) console.log('  none at >= 0.50')
for (const [s, a, b] of pairs.slice(0, 20)) {
  console.log(`  ${s.toFixed(2)}  ${a.id.slice(0, 8)} ${key(a)}`)
  console.log(`        ${b.id.slice(0, 8)} ${key(b)}`)
}

/*
 * Pairs undercount. If A is close to B and B is close to C, a student
 * who has met A has partial cover of C too, so the thing to report is
 * the CONNECTED COMPONENT — the family — not the pair. This is where
 * the gate's "28 of 119" and the truth diverge most.
 */
console.log('\nFAMILIES (connected components at each threshold)')
function families(rows, thresh) {
  const parent = rows.map((_, i) => i)
  const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      if (jaccard(key(rows[i]), key(rows[j])) >= thresh) parent[find(i)] = find(j)
    }
  }
  const m = new Map()
  rows.forEach((r, i) => {
    const root = find(i)
    if (!m.has(root)) m.set(root, [])
    m.get(root).push(r)
  })
  return [...m.values()]
}
for (const t of [0.7, 0.6, 0.5, 0.4]) {
  const f = families(bas, t)
  const multi = f.filter(g => g.length > 1)
  const covered = multi.reduce((n, g) => n + g.length, 0)
  console.log(`  >=${t.toFixed(2)}  ${String(f.length).padStart(3)} families  |  ${String(covered).padStart(3)} of ${bas.length} items sit in a family of 2+  (largest ${Math.max(...f.map(g => g.length))})`)
}
console.log('\n  families at 0.50, largest first:')
for (const g of families(bas, 0.5).filter(g => g.length > 1).sort((a, b) => b.length - a.length)) {
  console.log(`    x${g.length}`)
  for (const r of g) console.log(`        ${r.id.slice(0, 8)}  ${key(r)}`)
}

console.log('\nPOOL SHAPE')
const diff = new Map()
for (const r of bas) diff.set(r.item.difficulty, (diff.get(r.item.difficulty) ?? 0) + 1)
console.log('  difficulty: ' + [...diff].map(([k, v]) => `${k} ${v}`).join(', '))
const lens = bas.map(r => chipsOf(r.item).length)
console.log('  chips per item: ' + JSON.stringify(lens.reduce((a, n) => { a[n] = (a[n] || 0) + 1; return a }, {})))
const distinctSkeletons = new Set(bas.map(r => skeleton(key(r)))).size
console.log(`  distinct skeletons: ${distinctSkeletons} across ${bas.length} items`)
