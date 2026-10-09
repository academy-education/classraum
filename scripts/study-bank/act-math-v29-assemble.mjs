#!/usr/bin/env node
/**
 * act-math-v29-assemble.mjs [--selftest] <itemsDir> [--drop ID,ID..] [--unavail ID,ID..]
 *
 * act-math-v29 (ACT-MATH-V29-PREREGISTERED.md). Copied from act-math-v28-assemble.mjs;
 * only the slot table changed (10 arms, 116 core, 2 spares per arm: one extreme, one
 * interior). Authors write ONE JSON file per item (<itemsDir>/<id>.json, a single item
 * object). This script assembles them into the ten arm files (core only) and the
 * spares file, and applies the PRE-REGISTERED SPARE PROMOTION RULE mechanically,
 * before any projection is re-run:
 *
 *   A core item dropped before freeze is replaced by the spare in the SAME ARM
 *   whose key position (smallest / interior / largest by value, scored by
 *   key-extremity-breakdown) equals the dropped item's. If that spare is used or
 *   unavailable, the arm's lowest-numbered remaining spare of the same CLASS
 *   (extreme vs interior). If none, no promotion: the item is simply dropped.
 *   Drops are processed in id order. A spare is unavailable if it failed stage 0
 *   after the return (--unavail). A promoted spare keeps its own id.
 *
 * Writes scripts/study-bank/act-math-v29-<arm>.batch.json and act-math-v29.spares.json
 * (the spares NOT promoted), and prints every promotion. Refuses (exit 2) if a slot
 * file is missing, an id is duplicated, a file holds anything but one item with four
 * choices, or a core arm's count is wrong.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { scoreItem } from './key-extremity-breakdown.mjs'
import { pathToFileURL } from 'node:url'

const DIR = new URL('.', import.meta.url).pathname
// the pre-registered slot table: id -> [arm, domain, position]; spares carry spare:true
const P = { s: 'min', m: 'mid', l: 'max' }
const T = []
const slot = (arm, id, dom, p, spare = false) => T.push({ arm, id, dom, pos: P[p], spare })
const IES = 'Integrating Essential Skills', AL = 'Algebra', FN = 'Functions', GE = 'Geometry', SP = 'Statistics and Probability', NQ = 'Number and Quantity'
// [arm, letter, domain, first core number, positions (one char per core item), spares [[n, pos], ...]]
export const ARMS = [
  ['d1', 'I', IES, 1, 'slmslmslmslm', [[1, 's'], [2, 'm']]],
  ['d2', 'I', IES, 13, 'lsmlsmlsmlsm', [[3, 'l'], [4, 'm']]],
  ['a1', 'A', AL, 1, 'smlmslmsmlm', [[1, 'l'], [2, 'm']]],
  ['a2', 'A', AL, 12, 'lmsmlmsmlm', [[3, 's'], [4, 'm']]],
  ['f1', 'F', FN, 1, 'smlmsmlmsmlmm', [[1, 's'], [2, 'm']]],
  ['f2', 'F', FN, 14, 'lmsmlmsmlmsm', [[3, 'l'], [4, 'm']]],
  ['g1', 'G', GE, 1, 'smlmsmlms', [[1, 'l'], [2, 'm']]],
  ['g2', 'G', GE, 10, 'lmsmlmsmm', [[3, 's'], [4, 'm']]],
  ['s', 'S', SP, 1, 'smlmsmlmsmlmsm', [[1, 's'], [2, 'm']]],
  ['n', 'N', NQ, 1, 'lmsmlsmlmslmsm', [[1, 'l'], [2, 'm']]],
]
for (const [arm, L, dom, first, pos, spares] of ARMS) {
  ;[...pos].forEach((p, k) => slot(arm, `AM29${L}-${String(first + k).padStart(2, '0')}`, dom, p))
  for (const [n, p] of spares) slot(arm, `AM29${L}-X${n}`, dom, p, true)
}
export const SLOTS = T

export function position(it) {
  const s = scoreItem((it.choices || []).map(String), String(it.correct_answer))
  return s.skip ? null : s.keyMin ? 'min' : s.keyMax ? 'max' : 'mid'
}
const cls = p => (p === 'mid' ? 'interior' : 'extreme')
const num = id => Number(id.replace(/^.*X/, ''))

/** pure: core items per arm + spares, drop ids, unavailable spare ids -> { core, spares, log } */
export function promote(items, drop, unavail) {
  const byId = new Map(items.map(i => [i.id, i]))
  const core = {}, pool = {}
  for (const s of T) {
    const it = byId.get(s.id)
    if (s.spare) { if (it && !unavail.has(s.id)) (pool[s.arm] ||= []).push(it) } else (core[s.arm] ||= []).push(it)
  }
  for (const a of Object.keys(pool)) pool[a].sort((x, y) => num(x.id) - num(y.id))
  const log = []
  for (const id of [...drop].sort()) {
    const s = T.find(t => t.id === id && !t.spare)
    if (!s) { log.push(`REFUSE ${id}: not a core slot`); continue }
    const arm = core[s.arm], k = arm.findIndex(i => i.id === id)
    if (k < 0) { log.push(`REFUSE ${id}: not in the core`); continue }
    const p = position(arm[k]), sp = pool[s.arm] || []
    let j = sp.findIndex(x => position(x) === p)
    if (j < 0) j = sp.findIndex(x => cls(position(x)) === cls(p))
    if (j < 0) { arm.splice(k, 1); log.push(`${id} (${s.arm}, ${p}) DROPPED, no spare of class ${cls(p)} left`); continue }
    const [x] = sp.splice(j, 1)
    arm.splice(k, 1, x)
    log.push(`${id} (${s.arm}, ${p}) -> PROMOTE ${x.id} (${position(x)})`)
  }
  return { core, spares: Object.values(pool).flat(), log }
}

function selftest() {
  let bad = 0
  const mk = (id, p) => ({ id, choices: ['1', '2', '3', '4'], correct_answer: p === 'min' ? '1' : p === 'max' ? '4' : '2' })
  const items = T.map(s => mk(s.id, s.pos))
  const want = { d1: 12, d2: 12, a1: 11, a2: 10, f1: 13, f2: 12, g1: 9, g2: 9, s: 14, n: 14 }
  for (const [a, n] of Object.entries(want)) { const c = T.filter(t => t.arm === a); if (c.filter(t => !t.spare).length !== n || c.filter(t => t.spare).length !== 2) { bad++; console.error('count', a) } }
  const core = T.filter(t => !t.spare), cnt = p => core.filter(t => t.pos === p).length
  if (core.length !== 116 || cnt('min') !== 32 || cnt('mid') !== 53 || cnt('max') !== 31) { bad++; console.error('positions', core.length, cnt('min'), cnt('mid'), cnt('max')) }
  if (new Set(T.map(t => t.id)).size !== T.length) { bad++; console.error('dup ids') }
  // per domain (core): extreme / interior
  const want2 = { 'Integrating Essential Skills': [16, 8], Algebra: [11, 10], Functions: [12, 13], Geometry: [9, 9], 'Statistics and Probability': [7, 7], 'Number and Quantity': [8, 6] }
  for (const [d, [e, i]] of Object.entries(want2)) { const c = core.filter(t => t.dom === d); if (c.filter(t => t.pos !== 'mid').length !== e || c.filter(t => t.pos === 'mid').length !== i) { bad++; console.error('domain split', d) } }
  // every arm's spares: one extreme, one interior
  for (const a of Object.keys(want)) { const x = T.filter(t => t.arm === a && t.spare); if (x.filter(t => t.pos === 'mid').length !== 1) { bad++; console.error('spare classes', a) } }
  // exact-position promotion: AM29I-01 (d1, s) -> AM29I-X1 (s)
  let r = promote(items, new Set(['AM29I-01']), new Set())
  if (!r.log[0].includes('PROMOTE AM29I-X1')) { bad++; console.error(r.log) }
  // same class when the exact position is absent: AM29I-02 (d1, l) -> X1 (s, extreme)
  r = promote(items, new Set(['AM29I-02']), new Set())
  if (!r.log[0].includes('PROMOTE AM29I-X1')) { bad++; console.error(r.log) }
  // interior drop takes the interior spare even though the extreme spare is lower-numbered: AM29I-03 (m) -> X2, not X1
  r = promote(items, new Set(['AM29I-03']), new Set())
  if (!r.log[0].includes('PROMOTE AM29I-X2')) { bad++; console.error(r.log) }
  // NOTE: with exactly one spare per class per arm, the exact-position branch and the same-class branch pick the
  // same spare in every case; the exact-position branch is kept from v28 and cannot change an outcome here.
  // interior drop with its spare unavailable -> no promotion (never an extreme spare for an interior slot)
  r = promote(items, new Set(['AM29I-03']), new Set(['AM29I-X2']))
  if (!r.log[0].includes('DROPPED') || r.core.d1.length !== 11) { bad++; console.error(r.log) }
  // spares never cross arms: two extreme drops in d1 -> X1 then DROPPED (d2's X3 is not used)
  r = promote(items, new Set(['AM29I-01', 'AM29I-02']), new Set())
  if (!r.log[1].includes('DROPPED')) { bad++; console.error(r.log) }
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log('selftest 10/10')
}

// CLI only when run directly (the slot table is imported by the mock / projection tooling)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
const args = process.argv.slice(2)
selftest()
if (args.includes('--selftest')) process.exit(0)
const dir = args.find(a => !a.startsWith('--') && !/^AM29/.test(a))
const opt = k => { const i = args.indexOf(k); return new Set(i >= 0 && args[i + 1] ? args[i + 1].split(',').filter(Boolean) : []) }
if (!dir) { console.error('usage: act-math-v29-assemble.mjs <itemsDir> [--drop IDS] [--unavail IDS]'); process.exit(2) }
const items = []
for (const s of T) {
  const f = `${dir}/${s.id}.json`
  if (!existsSync(f)) { if (s.spare) { console.error(`note: spare ${s.id} missing (unavailable)`); continue } console.error(`REFUSING: ${f} missing`); process.exit(2) }
  const it = JSON.parse(readFileSync(f, 'utf8'))
  if (Array.isArray(it) || it.id !== s.id || !Array.isArray(it.choices) || it.choices.length !== 4 || it.domain !== s.dom) { console.error(`REFUSING: ${f} is not one four-choice ${s.dom} item with id ${s.id}`); process.exit(2) }
  const p = position(it)
  if (p !== s.pos) console.log(`POSITION MISMATCH ${s.id}: slot ${s.pos}, authored ${p}`)
  items.push(it)
}
const r = promote(items, opt('--drop'), opt('--unavail'))
for (const l of r.log) console.log(l)
if (r.log.some(l => l.startsWith('REFUSE'))) process.exit(2)
for (const [a] of ARMS) writeFileSync(DIR + `act-math-v29-${a}.batch.json`, JSON.stringify(r.core[a], null, 1) + '\n')
writeFileSync(DIR + 'act-math-v29.spares.json', JSON.stringify(r.spares, null, 1) + '\n')
console.log(`core ${ARMS.map(([a]) => a + ' ' + r.core[a].length).join(', ')}; spares left ${r.spares.length}`)
}
