#!/usr/bin/env node
/**
 * act-math-v28-assemble.mjs [--selftest] <itemsDir> [--drop ID,ID..] [--unavail ID,ID..]
 *
 * act-math-v28 (ACT-MATH-V28-PREREGISTERED.md). Authors write ONE JSON file per
 * item (<itemsDir>/<id>.json, a single item object). This script assembles them
 * into the four arm files (core only) and the spares file, and applies the
 * PRE-REGISTERED SPARE PROMOTION RULE mechanically, before any projection is
 * re-run:
 *
 *   A core item dropped before freeze is replaced by the spare in the SAME ARM
 *   whose key position (smallest / interior / largest by value, scored by
 *   key-extremity-breakdown) equals the dropped item's. If that spare is used or
 *   unavailable, the arm's lowest-numbered remaining spare of the same CLASS
 *   (extreme vs interior). If none, no promotion: the item is simply dropped.
 *   Drops are processed in id order. A spare is unavailable if it failed stage 0
 *   after the return (--unavail). A promoted spare keeps its own id.
 *
 * Writes scripts/study-bank/act-math-v28-{d1,d2,b,c}.batch.json and
 * act-math-v28.spares.json (the spares NOT promoted), and prints every promotion.
 * Refuses (exit 2) if a slot file is missing, an id is duplicated, a file holds
 * anything but one item with four choices, or a core arm's count is wrong.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { scoreItem } from './key-extremity-breakdown.mjs'

const DIR = new URL('.', import.meta.url).pathname
// the pre-registered slot table: id -> [arm, domain, position]; spares carry spare:true
const P = { s: 'min', m: 'mid', l: 'max' }
const T = []
const slot = (arm, id, dom, p, spare = false) => T.push({ arm, id, dom, pos: P[p], spare })
const IES = 'Integrating Essential Skills'
for (const [arm, base, xs] of [['d1', 1, [1, 2, 3]], ['d2', 12, [4, 5, 6]]]) {
  const pos = ['s', 'l', 'm', 's', 'l', 'm', 's', 'l', 'm', 's', 'l']
  for (let k = 0; k < 11; k++) slot(arm, `AM28I-${String(base + k).padStart(2, '0')}`, IES, pos[k])
  slot(arm, `AM28I-X${xs[0]}`, IES, 's', true); slot(arm, `AM28I-X${xs[1]}`, IES, 'm', true); slot(arm, `AM28I-X${xs[2]}`, IES, 'l', true)
}
const SP = 'Statistics and Probability', FN = 'Functions', GE = 'Geometry', NQ = 'Number and Quantity'
;[['S-01', SP, 's'], ['S-02', SP, 'm'], ['S-03', SP, 'l'], ['F-01', FN, 's'], ['F-02', FN, 'm'],
  ['S-04', SP, 'm'], ['S-05', SP, 's'], ['F-03', FN, 'm'], ['F-04', FN, 'l'], ['F-05', FN, 'm'],
  ['S-06', SP, 'm'], ['S-07', SP, 'l'], ['S-08', SP, 'm'], ['F-06', FN, 's'], ['F-07', FN, 'm']].forEach(([i, d, p]) => slot('b', 'AM28' + i, d, p))
slot('b', 'AM28S-X1', SP, 's', true); slot('b', 'AM28F-X2', FN, 'm', true); slot('b', 'AM28S-X3', SP, 'l', true)
;[['G-01', GE, 's'], ['G-02', GE, 'm'], ['G-03', GE, 'l'], ['N-01', NQ, 'm'], ['G-04', GE, 'm'],
  ['G-05', GE, 'l'], ['G-06', GE, 's'], ['N-02', NQ, 's'], ['G-07', GE, 'm'],
  ['G-08', GE, 'm'], ['G-09', GE, 'l'], ['N-03', NQ, 'l'], ['N-04', NQ, 'm']].forEach(([i, d, p]) => slot('c', 'AM28' + i, d, p))
slot('c', 'AM28G-X1', GE, 's', true); slot('c', 'AM28G-X2', GE, 'm', true); slot('c', 'AM28N-X3', NQ, 'l', true)
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
  // counts per arm
  const want = { d1: [11, 3], d2: [11, 3], b: [15, 3], c: [13, 3] }
  for (const [a, [n, x]] of Object.entries(want)) { const c = T.filter(t => t.arm === a); if (c.filter(t => !t.spare).length !== n || c.filter(t => t.spare).length !== x) { bad++; console.error('count', a) } }
  const core = T.filter(t => !t.spare), cnt = p => core.filter(t => t.pos === p).length
  if (cnt('min') !== 15 || cnt('mid') !== 20 || cnt('max') !== 15) { bad++; console.error('positions', cnt('min'), cnt('mid'), cnt('max')) }
  const ies = core.filter(t => t.dom === IES)
  if (ies.length !== 22 || ies.filter(t => t.pos === 'mid').length !== 6) { bad++; console.error('IES 16/6') }
  // exact-position promotion
  let r = promote(items, new Set(['AM28I-02']), new Set())
  if (!r.log[0].includes('PROMOTE AM28I-X3')) { bad++; console.error(r.log) }
  // same class when exact is gone: two IES max drops in D1 -> X3 then X1 (min, same class)
  r = promote(items, new Set(['AM28I-02', 'AM28I-05']), new Set())
  if (!r.log[1].includes('PROMOTE AM28I-X1')) { bad++; console.error(r.log) }
  // interior drop with its spare unavailable -> no promotion (never an extreme spare for an interior slot)
  r = promote(items, new Set(['AM28I-03']), new Set(['AM28I-X2']))
  if (!r.log[0].includes('DROPPED')) { bad++; console.error(r.log) }
  if (r.core.d1.length !== 10) { bad++; console.error('core after drop', r.core.d1.length) }
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log('selftest 7/7')
}

const args = process.argv.slice(2)
selftest()
if (args.includes('--selftest')) process.exit(0)
const dir = args.find(a => !a.startsWith('--') && !/^AM28/.test(a))
const opt = k => { const i = args.indexOf(k); return new Set(i >= 0 && args[i + 1] ? args[i + 1].split(',').filter(Boolean) : []) }
if (!dir) { console.error('usage: act-math-v28-assemble.mjs <itemsDir> [--drop IDS] [--unavail IDS]'); process.exit(2) }
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
for (const a of ['d1', 'd2', 'b', 'c']) writeFileSync(DIR + `act-math-v28-${a}.batch.json`, JSON.stringify(r.core[a], null, 1) + '\n')
writeFileSync(DIR + 'act-math-v28.spares.json', JSON.stringify(r.spares, null, 1) + '\n')
console.log(`core d1 ${r.core.d1.length} d2 ${r.core.d2.length} b ${r.core.b.length} c ${r.core.c.length}; spares left ${r.spares.length}`)
