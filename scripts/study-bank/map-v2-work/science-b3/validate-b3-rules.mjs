#!/usr/bin/env node
/**
 * validate-b3-rules.mjs: points each batch-3 check at batch 2's 224 authored items, where the answer is already known:
 * both graders of each area named the item ids in their COLD pass (scratchpad/map-science-b2/STAGE1-DECISION.json,
 * areas.*.rule10.shared_patterns). A detector that cannot reproduce a known finding on known data has no business being
 * pointed at batch 3 (CLAUDE.md). Run from the repo root.
 *
 *   node scripts/study-bank/map-v2-work/science-b3/validate-b3-rules.mjs
 *
 * Known answers (grader-named, both graders):
 *   TRENDPAR   L5-14, L6-09, L7-10, L8-08            trend key alone carries "as/with ..."
 *   ROLESTATE  L5-15, L6-16, L7-02, L8-03, P5-03, P8-03, E5-12, E8-17   procedure states each role
 *   ECHO       L6-12, L6-17, L7-17                   definition-in-stem key echoes the defining word
 *   INTERP     L7-06, L8-01                          key the lone unprinted value (+ P8-01, Physical g1: lone mean)
 *   BARTOP     P5-07, P6-14, P7-01                   asked bar tallest / top tick (P8-02 named as the exception)
 *   CLAIMRAT+CLAIMBAL  Earth: E5-06, E5-14, E5-20, E7-05, E7-20, E8-05, E8-14 (g2's list); the pattern is cross-item, so
 *              the known answer is that CLAIMBAL fires for Earth and the union catches all seven
 *   VARTPL     P5-03~P8-03, E5-12~E8-17              shared passage template
 *   NAMEREUSE  "sy" in E8-02, E8-08, E8-11, E8-15
 *   ORDER      all three areas (Earth g1; coordinator recount 20/19/20 ascending)
 * Also prints every OTHER item each check fires on, so over-reach is visible. Exits 2 if the batch-2 files cannot be
 * read, 1 if any known item is missed, 0 otherwise.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkItem, checkBatch } from '../science-pilot/sci-check.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '../../../..')
const S = JSON.parse(readFileSync(join(HERE, '../science-b2/slots.json'), 'utf8')), SLOT = {}
for (const [c, v] of Object.entries(S)) if (!c.startsWith('_')) for (const r of v.rows) SLOT[r.id] = { ...r, area: v.area, author: c }
const items = []
for (const c of Object.keys(S).filter(k => !k.startsWith('_'))) {
  const f = join(ROOT, 'scratchpad/map-science-b2', c, 'items.json')
  if (!existsSync(f)) { console.error(`REFUSING: missing ${f}`); process.exit(2) }
  items.push(...JSON.parse(readFileSync(f, 'utf8')).filter(i => !i.empty))
}
if (items.length !== 224) { console.error(`REFUSING: read ${items.length} batch-2 items, expected 224`); process.exit(2) }
console.log(`read ${items.length} batch-2 items (scratchpad/map-science-b2/*/items.json)`)
const short = id => id.replace('MSB2-', '')
let miss = 0
const expect = (label, want, got, denom) => {
  const m = want.filter(x => !got.includes(x)), extra = got.filter(x => !want.includes(x))
  if (m.length) miss++
  console.log(`${m.length ? 'MISS' : 'ok  '} ${label}: known ${want.length}, caught ${want.length - m.length}${m.length ? ` (missed ${m.join(', ')})` : ''}; also fired on ${extra.length} of ${denom}${extra.length ? `: ${extra.join(', ')}` : ''}`)
}
const fmtOf = f => items.filter(i => SLOT[i.id].format === f)
const fires = (check, pool = items) => pool.filter(i => checkItem(i, SLOT[i.id], [], { rules: 'b3' }).some(p => p.startsWith(check))).map(i => short(i.id))
const pool = (f, ask) => items.filter(i => SLOT[i.id].format === f && (!ask || SLOT[i.id].ask === ask))
expect('TRENDPAR', ['L5-14', 'L6-09', 'L7-10', 'L8-08'], fires('TRENDPAR'), `${pool('trend').length} trend items`)
expect('ROLESTATE', ['L5-15', 'L6-16', 'L7-02', 'L8-03', 'P5-03', 'P8-03', 'E5-12', 'E8-17'], fires('ROLESTATE'), `${pool('variable').length} variable items`)
expect('ECHO', ['L6-12', 'L6-17', 'L7-17'], fires('ECHO'), `${pool('term').length + pool('claim').length} term+claim items`)
expect('INTERP', ['L7-06', 'L8-01', 'P8-01'], fires('INTERP'), `${pool('values', 'interpolate').length} interpolate items`)
expect('BARTOP', ['P5-07', 'P6-14', 'P7-01'], fires('BARTOP'), `${items.filter(i => SLOT[i.id].format === 'values' && SLOT[i.id].ask === 'read' && ['bar', 'line'].includes(i.graphic?.type)).length} bar/line read items`)
console.log(`   P8-02 (graders' named exception): ${fires('BARTOP', items.filter(i => short(i.id) === 'P8-02')).length ? 'FIRES' : 'passes'}`)
const B = checkBatch(items, SLOT, { rules: 'b3' })
const earthClaims = ['E5-06', 'E5-14', 'E5-20', 'E7-05', 'E7-20', 'E8-05', 'E8-14']
const cr = fires('CLAIMRAT')
console.log(`     CLAIMRAT per item fires on ${cr.length} of ${pool('claim').length} claim items: ${cr.join(', ')}`)
const balEarth = B.p.filter(p => p.includes('CLAIMBAL Earth'))
for (const l of B.info.filter(l => l.startsWith('CLAIMBAL'))) console.log(`     ${l}`)
expect('CLAIMRAT (per item) + CLAIMBAL (Earth batch)', earthClaims, balEarth.length ? earthClaims : earthClaims.filter(x => cr.includes(x)), `${pool('claim').length} claim items`)
console.log(`     CLAIMBAL refusals: ${B.p.filter(p => p.includes('CLAIMBAL')).map(p => p.replace('BATCH ', '')).join(' || ') || 'none'}`)
const vt = B.p.filter(p => p.includes('VARTPL')).map(p => { const m = p.match(/MSB2-(\w+-\d+) and MSB2-(\w+-\d+)/); return `${m[1]}~${m[2]}` })
expect('VARTPL', ['P5-03~P8-03', 'E5-12~E8-17'], vt, `${B.info.find(l => l.startsWith('VARTPL'))}`)
const nr = B.p.filter(p => p.includes('NAMEREUSE'))
const sy = nr.find(p => p.includes('"sy"'))
expect('NAMEREUSE ("sy")', ['E8-02', 'E8-08', 'E8-11', 'E8-15'], sy ? [...sy.matchAll(/MSB2-(\w+-\d+)/g)].map(m => m[1]) : [], 'batch')
console.log(`     NAMEREUSE fires on ${nr.length} name cores in all: ${nr.map(p => p.match(/"([^"]+)"/)[1]).join(', ')}`)
const ord = B.p.filter(p => p.includes('BATCH ORDER')).map(p => p.match(/ORDER ([A-Za-z ]+?):/)[1])
expect('ORDER (areas)', ['Life Science', 'Physical Science', 'Earth and Space Science'], [...new Set(ord)], '3 areas')
for (const l of B.info.filter(l => l.startsWith('ORDER'))) console.log(`     ${l}`)
console.log(miss ? `VALIDATION: ${miss} check(s) missed a known item` : 'VALIDATION OK: every b3 check reproduces its known batch-2 finding')
process.exit(miss ? 1 : 0)
