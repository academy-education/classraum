#!/usr/bin/env node
/**
 * alg32-slots.mjs [<batch-or-part.json ...>] — the commissioned slots for sat-math-v32-alg
 * (PREREG-MATH-ALG32-2026-10-23.md), fixed before any item exists. alg32 reruns alg31
 * (PREREG-MATH-ALG31-2026-10-23.md), which STOPPED AT PRE-FLIGHT because its strict plug-back
 * fallback dropped every item at natural try 1-2, and its slot table PUT 11 keys there by design
 * (alg31 Result, lesson 1). The slot plan is rebuilt so that cannot recur:
 *
 *   - every slot whose key sits at natural plug-back try 1-2 asks an AGGREGATE (count / sum /
 *     difference over a set of k values, solutions, integers or plans), never a single object the
 *     stem's relations accept. Measured: alg26 graders flagged 0 of 9 aggregate-ask items at try
 *     1-2 (not one grader on any) against 5 of 8 greatest / least / value items there; both alg31
 *     cold readers called all 9 aggregate try-1-2 batch items non-substitutable;
 *   - greatest / least / value sit only at natural try 3-4, and greatest / least only at an interior
 *     rank (alg26: B5 greatest r4 and B6 least r1 died at try 1);
 *   - each slot fixes the SIDE of its bypass option (R10 by construction: alg31's 13 survivors had
 *     the degenerate-parameter bypass 0 above / 5 below);
 *   - each try-1-2 slot records WHAT its aggregate runs over (NONSUB), quoted in the prereg.
 *
 * Changes from alg31's table (three slots; every rank and every other ask unchanged):
 *   B7 greatest/r2 (try 3) -> sum/r2 (try 2)     B's greatest-solution class is alg26 B5's (plug-back)
 *   D6 greatest/r3 (try 2) -> greatest/r2 (try 3) a greatest objective at try 2 violates the new rule
 *   D7 least/r2 (try 2)    -> difference/r2 (try 2)
 *
 *   no argument   prints the slot table, its totals and the cross-item rule hits
 *   <file ...>    checks every item (an array file, or one part object) against its slot: id,
 *                 Algebra, hard, `mech`, `ask`, key VALUE RANK, bypass side. Exit 1 on a mismatch,
 *                 2 if it cannot read its input or reads no item.
 */
import { readFileSync } from 'node:fs'

export const PREFIX = 'SM32L-'
export const COHORT = 'sat-math-v32-alg'
export const TAG = 'alg32'
const D = new URL('.', import.meta.url).pathname
/** in-repo work folder: briefs, parts, ideas, census (records that are committed) */
export const WORK = `${D}sat-math-alg32-work`
/** OUTSIDE the repo: the live dump and the probe / grader private folders (A90 lesson 2) */
export const PRIV = '/Users/andylee/Downloads/saas/classraum-alg32-private'
export const SEED_ORDER = 20261041
export const SEED_PROBE = 20261042

export const MECH = { B: 'degenerate-parameter', C: 'integer-count-condition', D: 'integer-optimum' }
export const ASKS = ['count', 'sum', 'difference', 'greatest', 'least', 'value']
/** asks whose answer is an aggregate over a set: an option is a number of / total of / gap between
 *  objects, so no printed relation accepts it and plug-back has nothing to substitute */
export const NONSUB_ASKS = ['count', 'sum', 'difference']
export const COARSE = { count: 'range-size', difference: 'range-size', sum: 'sum', greatest: 'extreme', least: 'extreme', value: 'value' }
// slot -> [ask, key rank by value (1 smallest .. 4 largest), side of the bypass option vs the key]
export const SLOTS = {
  B1: ['count', 1, 'above'], B2: ['count', 4, 'below'], B3: ['count', 2, 'above'], B4: ['sum', 1, 'above'],
  B5: ['sum', 4, 'below'], B6: ['difference', 3, 'below'], B7: ['sum', 2, 'above'], B8: ['value', 4, 'below'],
  C1: ['count', 4, 'below'], C2: ['count', 3, 'above'], C3: ['sum', 1, 'above'], C4: ['sum', 3, 'below'],
  C5: ['difference', 1, 'above'], C6: ['difference', 4, 'below'], C7: ['difference', 2, 'above'], C8: ['least', 3, 'below'],
  D1: ['count', 1, 'above'], D2: ['count', 2, 'below'], D3: ['sum', 4, 'below'], D4: ['difference', 1, 'above'],
  D5: ['difference', 4, 'below'], D6: ['greatest', 2, 'above'], D7: ['difference', 2, 'above'], D8: ['value', 3, 'below'],
}
/** for every slot at natural try 1-2: what the aggregate runs over (why an option cannot be
 *  substituted). The part repeats it, in its own words, as plugback.aggregate_over. */
export const NONSUB = {
  B1: 'the number of k values (in a stated range) that give the stated solution type',
  B3: 'the number of k values, or of solutions, across the cases the degenerate k splits',
  B4: 'the sum of the k values (or of the solutions) over every case that qualifies',
  B7: 'the sum of two derived values (e.g. the degenerate k and the constant that makes it consistent)',
  C3: 'the sum of every integer k that meets the integer-count condition',
  C5: 'the greatest minus the least k that meets the integer-count condition',
  C7: 'the gap between the two boundary values of k (or of the attained endpoints) for the count condition',
  D1: 'the number of whole-number plans that are optimal (or feasible at a stated level)',
  D2: 'the number of whole-number plans meeting a stated condition on the objective',
  D4: 'a difference between two coordinates of the optimal plan, or between two optima',
  D7: 'a difference between the optimum and another plan\'s value, or between two coordinates',
}
/** natural plug-back order: descending only on a `greatest` ask (the ask decides, not a word in a
 *  condition such as "at most": REGISTER 2026-10-23, mf28 DESC) */
export const naturalTry = (ask, rank) => (ask === 'greatest' ? 5 - rank : rank)

export function val(s) {
  const t = String(s).trim()
  let m = t.match(/^(-?\d+(?:\.\d+)?)$/); if (m) return Number(m[1])
  m = t.match(/^(-?)(\d+)\s*\/\s*(\d+)$/); if (m) return (m[1] ? -1 : 1) * Number(m[2]) / Number(m[3])
  return NaN
}
export function rank(choices, key) {
  const v = choices.map(val), k = val(key)
  if (v.some(Number.isNaN) || Number.isNaN(k)) return null
  return 1 + v.filter(x => x < k - 1e-12).length
}
export const slotOf = id => String(id).replace(new RegExp('^' + PREFIX), '')

/** best "on group g pick rank r" rule over [group, rank] pairs */
export function bestRule(pairs) {
  const g = {}
  for (const [k, r] of pairs) (g[k] ??= [0, 0, 0, 0, 0])[r]++
  let hits = 0
  for (const c of Object.values(g)) hits += Math.max(...c)
  return { hits, groups: g }
}

export function slotProblems(x) {
  const out = []
  const s = slotOf(x.id), want = SLOTS[s]
  if (!want) return [`${x.id}: not a commissioned slot`]
  if (x.domain !== 'Algebra') out.push(`${x.id}: domain ${x.domain} (Algebra only)`)
  if (x.difficulty !== 'hard') out.push(`${x.id}: authored difficulty ${x.difficulty} (every slot is authored hard)`)
  if (x.mech !== MECH[s[0]]) out.push(`${x.id}: mech "${x.mech}" != "${MECH[s[0]]}"`)
  if (x.ask !== want[0]) out.push(`${x.id}: ask "${x.ask}" != slot ask "${want[0]}"`)
  const r = rank((x.choices || []).map(String), String(x.correct_answer))
  if (r !== want[1]) out.push(`${x.id}: key rank ${r} != slot rank ${want[1]}`)
  const b = x.bypass_option == null ? null : val(String(x.bypass_option)), k = val(String(x.correct_answer))
  if (b == null || Number.isNaN(b) || Number.isNaN(k)) out.push(`${x.id}: bypass_option missing or non-numeric`)
  else if ((b > k ? 'above' : 'below') !== want[2]) out.push(`${x.id}: bypass option ${x.bypass_option} is ${b > k ? 'above' : 'below'} the key; slot ${s} fixes it ${want[2]}`)
  return out
}

export function tableStats(slots = SLOTS) {
  const ids = Object.keys(slots)
  const pos = [0, 0, 0, 0, 0]; for (const s of ids) pos[slots[s][1]]++
  const askN = {}; for (const s of ids) askN[slots[s][0]] = (askN[slots[s][0]] || 0) + 1
  const fine = bestRule(ids.map(s => [slots[s][0], slots[s][1]]))
  const coarse = bestRule(ids.map(s => [COARSE[slots[s][0]], slots[s][1]]))
  const mech = bestRule(ids.map(s => [s[0], slots[s][1]]))
  const early = ids.filter(s => naturalTry(slots[s][0], slots[s][1]) <= 2)
  const side = {}; for (const s of ids) { const m = (side[s[0]] ??= { above: 0, below: 0 }); m[slots[s][2]]++ }
  return { ids, pos, askN, fine, coarse, mech, early, side }
}

function table() {
  const t = tableStats()
  for (const a of Object.keys(MECH)) console.log(`  ${a} (${MECH[a]}): ` + t.ids.filter(s => s[0] === a).map(s => `${s} ${SLOTS[s][0]}/r${SLOTS[s][1]} (try ${naturalTry(SLOTS[s][0], SLOTS[s][1])}, bypass ${SLOTS[s][2]})`).join('  '))
  console.log(`  ${t.ids.length} slots; rank 1/2/3/4 = ${t.pos.slice(1).join('/')}; key at an extreme ${t.pos[1] + t.pos[4]}/${t.ids.length} = ${(100 * (t.pos[1] + t.pos[4]) / t.ids.length).toFixed(1)}%`)
  console.log(`  asks ${JSON.stringify(t.askN)}`)
  console.log(`  best ask->rank ${t.fine.hits}/${t.ids.length} = ${(100 * t.fine.hits / t.ids.length).toFixed(1)}%; coarse ${t.coarse.hits}/${t.ids.length} = ${(100 * t.coarse.hits / t.ids.length).toFixed(1)}%; mechanism->rank ${t.mech.hits}/${t.ids.length} = ${(100 * t.mech.hits / t.ids.length).toFixed(1)}%`)
  console.log(`  planned bypass side per mechanism: ${Object.entries(t.side).map(([m, s]) => `${m} above ${s.above} / below ${s.below}`).join('; ')}`)
  console.log(`  key at natural try 1-2: ${t.early.length} - ${t.early.join(' ')}; every one an aggregate ask:`)
  for (const s of t.early) console.log(`    ${s} ${SLOTS[s][0]}/r${SLOTS[s][1]}: ${NONSUB[s]}`)
  return t
}

function selftest() {
  let bad = 0
  const fail = m => { bad++; console.error('selftest: ' + m) }
  const t = tableStats()
  if (t.ids.length !== 24) fail('24 slots expected')
  for (const s of t.ids) {
    const [ask, r, side] = SLOTS[s]
    if (!ASKS.includes(ask)) fail(`${s}: ask ${ask}`)
    if ((ask === 'greatest' || ask === 'least') && (r === 1 || r === 4)) fail(`${s}: ${ask} at an extreme rank`)
    if (naturalTry(ask, r) <= 2 && !NONSUB_ASKS.includes(ask)) fail(`${s}: ${ask} at natural try ${naturalTry(ask, r)} (only count / sum / difference may sit at try 1-2)`)
    if (naturalTry(ask, r) <= 2 && !(NONSUB[s] && NONSUB[s].length >= 20)) fail(`${s}: no NONSUB record for a try-1-2 slot`)
    if (naturalTry(ask, r) > 2 && NONSUB[s]) fail(`${s}: NONSUB record on a try-3/4 slot`)
    if (r === 1 && side !== 'above') fail(`${s}: rank 1 bypass must be above`)
    if (r === 4 && side !== 'below') fail(`${s}: rank 4 bypass must be below`)
  }
  // the three cross-item rule hits the prereg quotes, and the 13-extreme projection constraint
  if (t.fine.hits !== 9 || t.coarse.hits !== 8 || t.mech.hits !== 9) fail(`rule hits ${t.fine.hits}/${t.coarse.hits}/${t.mech.hits}, expected 9/8/9`)
  if (t.pos[1] + t.pos[4] !== 13) fail('13 extreme slots expected')
  for (const [m, s] of Object.entries(t.side)) if (s.above < 3 || s.below < 3) fail(`planned bypass ${m} ${s.above}/${s.below}: each side must be >= 3 of 8`)
  if (t.early.length !== 11) fail(`11 try-1-2 slots expected, got ${t.early.length}`)
  // break: alg31's original D6 / D7 (greatest r3, least r2 at try 2) must be refused by the rule above
  const alg31 = { ...SLOTS, D6: ['greatest', 3, 'above'], D7: ['least', 2, 'above'] }
  if (!Object.keys(alg31).some(s => naturalTry(alg31[s][0], alg31[s][1]) <= 2 && !NONSUB_ASKS.includes(alg31[s][0]))) fail('alg31 table not caught by the try-1-2 rule')
  const good = { id: PREFIX + 'B1', domain: 'Algebra', difficulty: 'hard', mech: MECH.B, ask: 'count', choices: ['3', '5', '8', '12'], correct_answer: '3', bypass_option: '8' }
  if (slotProblems(good).length) fail('a good item refused ' + JSON.stringify(slotProblems(good)))
  if (!slotProblems({ ...good, correct_answer: '12' }).length) fail('wrong rank passed')
  if (!slotProblems({ ...good, difficulty: 'medium' }).length) fail('medium passed')
  if (!slotProblems({ ...good, id: PREFIX + 'A1' }).length) fail('uncommissioned slot passed')
  const d6 = { id: PREFIX + 'D6', domain: 'Algebra', difficulty: 'hard', mech: MECH.D, ask: 'greatest', choices: ['60', '64', '71', '75'], correct_answer: '64', bypass_option: '60' }
  if (!slotProblems(d6).some(p => p.includes('bypass option'))) fail('a bypass on the wrong side passed')
  if (slotProblems({ ...d6, bypass_option: '75' }).length) fail('a bypass on the planned side refused')
  if (naturalTry('greatest', 4) !== 1 || naturalTry('least', 1) !== 1 || naturalTry('count', 3) !== 3) fail('naturalTry')
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log('selftest 12/12')
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  selftest()
  const paths = process.argv.slice(2).filter(a => !a.startsWith('--'))
  if (!paths.length) { table(); process.exit(0) }
  let items = []
  try {
    for (const p of paths) {
      const j = JSON.parse(readFileSync(p, 'utf8'))
      const arr = Array.isArray(j) ? j : (j && typeof j === 'object' && j.id ? [j] : [])
      if (!arr.length) throw new Error(`${p} holds no items`)
      items.push(...arr)
    }
  } catch (e) { console.error(`REFUSING: ${e.message}`); process.exit(2) }
  const probs = items.flatMap(slotProblems)
  for (const p of probs) console.log('  SLOT ' + p)
  console.log(`${items.length} item(s): ${probs.length ? `SLOT FAIL (${probs.length})` : 'SLOT OK'}`)
  process.exit(probs.length ? 1 : 0)
}
