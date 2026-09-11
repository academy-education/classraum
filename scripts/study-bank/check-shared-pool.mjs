/*
 * Do two LIVE items share an identical option pool?
 *
 * Two control solvers, reading 30 shipped ISEE verbal items with the stems
 * withheld, independently reported the same two pairs sharing a pool. It is
 * decidable, so measure the whole population rather than the sample it was
 * noticed in (CLAUDE.md: when a defect can be checked exactly, check the
 * whole population, and do that before believing any number attached to it).
 *
 * Why it matters: a student who meets both items knows their keys differ,
 * because one option cannot answer two different stems. That is information
 * no single-item review can see.
 *
 * Pools compare as SORTED SETS. Draw-time shuffling makes option order
 * unreachable (AUTHORING-BRIEF 2b), so comparing ordered lists would miss
 * exactly the pairs that matter.
 */
import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await db
    .from('study_item_bank')
    .select('id,family,section,item,cohort')
    .eq('verified', true).eq('archived', false)
    .order('id').range(from, from + 999)
  if (error) throw new Error(error.message)
  rows.push(...(data || []))
  if (!data || data.length < 1000) break
}

const mc = rows.filter(r => Array.isArray(r.item?.choices) && r.item.choices.length >= 2)
if (!mc.length) {
  console.error('REFUSING: zero multiple-choice rows loaded. A rate over an empty population is not a measurement.')
  process.exit(2)
}
console.log(`rows ${rows.length}, multiple-choice with a choices array ${mc.length}`)

const pools = new Map()
for (const r of mc) {
  const k = r.family + '|' + r.section + '|' + [...r.item.choices].map(String).sort().join(String.fromCharCode(31))
  if (!pools.has(k)) pools.set(k, [])
  pools.get(k).push(r)
}
const dup = [...pools.values()].filter(v => v.length > 1)
const affected = dup.reduce((a, v) => a + v.length, 0)

console.log('')
console.log('IDENTICAL option pools (same family+section, same SET of choices):')
console.log(`  pools shared by more than one item : ${dup.length}`)
console.log(`  items involved                     : ${affected} of ${mc.length} = ${(100 * affected / mc.length).toFixed(2)}%`)
const bySec = {}
for (const v of dup) { const k = v[0].family + '/' + v[0].section; bySec[k] = (bySec[k] ?? 0) + v.length }
console.log(`  by section                         : ${JSON.stringify(bySec)}`)

// The load-bearing split. Same pool AND same key is a near-duplicate item,
// which the content hash already guards. Same pool with DIFFERENT keys is the
// exploitable shape: meeting both tells you neither key is the other's.
let sameKey = 0, diffKey = 0
const examples = []
for (const v of dup) {
  const keys = new Set(v.map(r => String(r.item.correct_answer)))
  if (keys.size === 1) sameKey += v.length
  else {
    diffKey += v.length
    if (examples.length < 8) examples.push(v.map(r => `${r.cohort}#${r.id} key=${JSON.stringify(r.item.correct_answer)}`).join('   vs   '))
  }
}
console.log('')
console.log(`  of those items: same key ${sameKey} (near-duplicates), DIFFERENT key ${diffKey} (the exploitable shape)`)

/*
 * SPLIT PROSE FROM NUMERIC BEFORE REPORTING A DEFECT RATE.
 *
 * A maths pool of {4, 5, 6, 7} collides with another item's by pure
 * coincidence, constantly, and means nothing: the options are short and drawn
 * from a tiny alphabet. A pool of four prose definitions does not collide by
 * accident - if two items share it, one author built both from one list.
 *
 * Reporting a single rate over both mixes a real authoring defect with
 * arithmetic coincidence and inflates it roughly twofold. The same error as
 * the conditional-rate-vs-population-rate mistake already in the register.
 */
const isProse = pool => pool.some(c => String(c).trim().length > 12)
let proseItems = 0, numericItems = 0, prosePools = 0
const proseEx = []
for (const v of dup) {
  const keys = new Set(v.map(r => String(r.item.correct_answer)))
  if (keys.size === 1) continue
  if (isProse(v[0].item.choices)) {
    proseItems += v.length; prosePools++
    if (proseEx.length < 5) proseEx.push(`${v.length} items share one pool: ${v[0].cohort} - ` +
      v.map(r => JSON.stringify(String(r.item.correct_answer)).slice(0, 42)).join(' / '))
  } else numericItems += v.length
}
console.log('')
console.log('  THE SPLIT THAT DECIDES WHETHER THIS IS A DEFECT:')
console.log(`    prose options (collision is not coincidence) : ${proseItems} items across ${prosePools} pools  <- REAL`)
console.log(`    short/numeric options (collides by chance)   : ${numericItems} items  <- mostly coincidence, not a finding`)
if (proseEx.length) { console.log(''); for (const e of proseEx) console.log('      ' + e) }
if (examples.length) {
  console.log('')
  console.log('  examples of the exploitable shape:')
  for (const e of examples) console.log('    ' + e)
}

/* Self-test: run with --selftest to confirm the grouping key does what the
 * comment claims, on data whose answer is known. A checker that cannot
 * reproduce a known number on known data has no business on unknown data. */
if (process.argv.includes('--selftest')) {
  const key = ch => [...ch].map(String).sort().join(String.fromCharCode(31))
  const t = []
  t.push(['reordered pools collide', key(['a', 'b', 'c']) === key(['c', 'a', 'b'])])
  t.push(['different pools do not', key(['a', 'b', 'c']) !== key(['a', 'b', 'd'])])
  t.push(['a separator collision is not possible with US',
    key(['ab', 'c']) !== key(['a', 'bc'])])
  t.push(['numeric and string forms of one value collide (they render alike)',
    key([1, 2]) === key(['1', '2'])])
  let bad = 0
  for (const [n, ok] of t) { console.log(`${ok ? 'ok   ' : 'FAIL '} ${n}`); if (!ok) bad++ }
  console.log(bad ? 'SELF-TEST FAILED' : 'self-test passed.')
  process.exit(bad ? 1 : 0)
}
