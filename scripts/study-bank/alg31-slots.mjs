#!/usr/bin/env node
/**
 * alg31-slots.mjs [<batch-or-part.json ...>] — the commissioned slots for sat-math-v31-alg
 * (PREREG-MATH-ALG31-2026-10-23.md), fixed before any item exists.
 *
 *   no argument   prints the slot table, its totals and the cross-item rule hits the
 *                 prereg quotes (the prereg's table is regenerated from here)
 *   <file ...>    checks every item (an array file, or one part object) against its
 *                 slot: id is a commissioned slot, domain Algebra, difficulty hard, `mech`
 *                 the author's mechanism, `ask` the slot's ask, the key's VALUE RANK among
 *                 the four options (1 = smallest .. 4 = largest) the slot's rank.
 *                 Exit 1 on a mismatch, 2 if it cannot read its input or reads no item.
 *
 * Method: sat-math-v26-alg (PREREG-ALG26-2026-10-08.md, REGISTER A87), rerun on its three
 * mechanisms that carried 11 of its 13 hard items. Mechanism A (interval-bound, 2 of 7 kept
 * hard) is not commissioned. Slot rules (prereg rule 2):
 *   - greatest / least asks sit only at an INTERIOR rank (alg26: B5 greatest r4 and B6 least r1
 *     died to plug-back at natural try 1);
 *   - no greatest / least / value slot has its key at natural try 1 (ascending; descending
 *     only on a `greatest` ask);
 *   - best "ask -> rank" rule 9/24 = 37.5% on the six asks AND on the coarse four, the
 *     arithmetic minimum for these ask counts; best "mechanism -> rank" 8/24 = 33.3%.
 */
import { readFileSync } from 'node:fs'

export const PREFIX = 'SM31L-'
export const COHORT = 'sat-math-v31-alg'
export const TAG = 'alg31'
const D = new URL('.', import.meta.url).pathname
/** in-repo work folder: brief, parts, ideas, census (records that are committed) */
export const WORK = `${D}sat-math-alg31-work`
/** OUTSIDE the repo: the live dump and the probe / grader private folders (A90 lesson 2) */
export const PRIV = '/Users/andylee/Downloads/saas/classraum-alg31-private'
export const SEED_ORDER = 20261031
export const SEED_PROBE = 20261032

export const MECH = { B: 'degenerate-parameter', C: 'integer-count-condition', D: 'integer-optimum' }
export const ASKS = ['count', 'sum', 'difference', 'greatest', 'least', 'value']
export const COARSE = { count: 'range-size', difference: 'range-size', sum: 'sum', greatest: 'extreme', least: 'extreme', value: 'value' }
// slot -> [ask, key rank by value (1 smallest .. 4 largest)]
export const SLOTS = {
  B1: ['count', 1], B2: ['count', 4], B3: ['count', 2], B4: ['sum', 1], B5: ['sum', 4], B6: ['difference', 3], B7: ['greatest', 2], B8: ['value', 4],
  C1: ['count', 4], C2: ['count', 3], C3: ['sum', 1], C4: ['sum', 3], C5: ['difference', 1], C6: ['difference', 4], C7: ['difference', 2], C8: ['least', 3],
  D1: ['count', 1], D2: ['count', 2], D3: ['sum', 4], D4: ['difference', 1], D5: ['difference', 4], D6: ['greatest', 3], D7: ['least', 2], D8: ['value', 3],
}
/** natural plug-back order: descending only on a `greatest` ask (mf28-checks' DESC regex also
 *  fires on "at most", which counted alg26 D6, a `least` item, at try 4 when every grader
 *  confirmed it at try 1; the ask decides here, not a word in the stem) */
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
  return out
}

function table() {
  const ids = Object.keys(SLOTS)
  for (const a of Object.keys(MECH)) console.log(`  ${a} (${MECH[a]}): ` + ids.filter(s => s[0] === a).map(s => `${s} ${SLOTS[s][0]}/r${SLOTS[s][1]} (try ${naturalTry(...SLOTS[s])})`).join('  '))
  const pos = [0, 0, 0, 0, 0]; for (const s of ids) pos[SLOTS[s][1]]++
  const askN = {}; for (const s of ids) askN[SLOTS[s][0]] = (askN[SLOTS[s][0]] || 0) + 1
  const fine = bestRule(ids.map(s => [SLOTS[s][0], SLOTS[s][1]]))
  const coarse = bestRule(ids.map(s => [COARSE[SLOTS[s][0]], SLOTS[s][1]]))
  const mech = bestRule(ids.map(s => [s[0], SLOTS[s][1]]))
  const probe = ids.filter(s => naturalTry(...SLOTS[s]) <= 2)
  console.log(`  ${ids.length} slots; rank 1/2/3/4 = ${pos.slice(1).join('/')}; key at an extreme ${pos[1] + pos[4]}/${ids.length} = ${(100 * (pos[1] + pos[4]) / ids.length).toFixed(1)}%`)
  console.log(`  asks ${JSON.stringify(askN)}`)
  console.log(`  best ask->rank ${fine.hits}/${ids.length} = ${(100 * fine.hits / ids.length).toFixed(1)}%; coarse ${coarse.hits}/${ids.length} = ${(100 * coarse.hits / ids.length).toFixed(1)}%; mechanism->rank ${mech.hits}/${ids.length} = ${(100 * mech.hits / ids.length).toFixed(1)}%`)
  console.log(`  key at natural try 1-2 (cold plug-back probe decides): ${probe.length} - ${probe.join(' ')}`)
  return { pos, fine, coarse, mech, ids }
}

function selftest() {
  let bad = 0
  const ids = Object.keys(SLOTS)
  if (ids.length !== 24) { bad++; console.error('selftest: 24 slots expected') }
  for (const s of ids) {
    const [ask, r] = SLOTS[s]
    if (!ASKS.includes(ask)) { bad++; console.error(`selftest ${s}: ask ${ask}`) }
    if ((ask === 'greatest' || ask === 'least') && (r === 1 || r === 4)) { bad++; console.error(`selftest ${s}: ${ask} at an extreme rank`) }
    if (['greatest', 'least', 'value'].includes(ask) && naturalTry(ask, r) === 1) { bad++; console.error(`selftest ${s}: ${ask} at natural try 1`) }
  }
  const pairs = ids.map(s => [SLOTS[s][0], SLOTS[s][1]])
  if (bestRule(pairs).hits !== 9 || bestRule(ids.map(s => [COARSE[SLOTS[s][0]], SLOTS[s][1]])).hits !== 9 || bestRule(ids.map(s => [s[0], SLOTS[s][1]])).hits !== 8) { bad++; console.error('selftest: rule hits are not 9 / 9 / 8') }
  const pos = [0, 0, 0, 0, 0]; for (const s of ids) pos[SLOTS[s][1]]++
  if (pos[1] + pos[4] !== 13) { bad++; console.error('selftest: 13 extreme slots expected') }
  const good = { id: PREFIX + 'B1', domain: 'Algebra', difficulty: 'hard', mech: MECH.B, ask: 'count', choices: ['3', '5', '8', '12'], correct_answer: '3' }
  if (slotProblems(good).length) { bad++; console.error('selftest: a good item refused', slotProblems(good)) }
  if (!slotProblems({ ...good, correct_answer: '12' }).length) { bad++; console.error('selftest: wrong rank passed') }
  if (!slotProblems({ ...good, difficulty: 'medium' }).length) { bad++; console.error('selftest: medium passed') }
  if (!slotProblems({ ...good, id: PREFIX + 'A1' }).length) { bad++; console.error('selftest: uncommissioned slot passed') }
  if (naturalTry('greatest', 4) !== 1 || naturalTry('least', 1) !== 1 || naturalTry('count', 3) !== 3) { bad++; console.error('selftest: naturalTry') }
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log('selftest 10/10')
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
