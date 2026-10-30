#!/usr/bin/env node
/**
 * validate-b2-rules.mjs: points the batch-2 checks at batch 1's 240 authored items, where the answer is already known
 * (REGISTER 2026-10-27 B1-A2, and the 2026-10-30 key-visible audit). A detector that cannot reproduce a known finding
 * on known data has no business being pointed at batch 2 (CLAUDE.md).
 *
 *   node scripts/study-bank/map-v2-work/science-b2/validate-b2-rules.mjs
 *
 * Known answers:
 *   XDUP     the 12 cross-grade duplicate pairs both graders named (B1-A2 item 1); the one-grader pair L7-15/L8-18 is reported
 *   LSHAPE   E6-01, E6-02, E6-11, E6-16 (B1-A2 item 2)
 *   INVENTED E6-07, E6-08, E6-10 (B1-A2 item 4)
 *   MISC     L6-06, L8-06, L8-14 carry BOTH stock families (B1-A2 item 3); the cap is per author, so it must fire in L6 and L8
 *   TICK     L8-16 (audit: kink between x ticks)
 * Exits 2 if the batch-1 files cannot be read, 1 if any known item is missed.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkItem, checkBatch, xdupScore, xdupReason, XDUP_MIN } from '../science-pilot/sci-check.mjs'

const HERE = dirname(fileURLToPath(import.meta.url)), B1 = join(HERE, '../science-b1')
const S = JSON.parse(readFileSync(join(B1, 'slots.json'), 'utf8')), SLOT = {}
for (const [c, v] of Object.entries(S)) if (!c.startsWith('_')) for (const r of v.rows) SLOT[r.id] = { ...r, area: v.area, author: c }
const items = []
for (const c of Object.keys(S).filter(k => !k.startsWith('_'))) {
  const f = join(B1, 'items', `${c}.json`)
  if (!existsSync(f)) { console.error(`REFUSING: missing ${f}`); process.exit(2) }
  items.push(...JSON.parse(readFileSync(f, 'utf8')).filter(i => !i.empty))
}
if (items.length < 200) { console.error(`REFUSING: read only ${items.length} batch-1 items`); process.exit(2) }
console.log(`read ${items.length} batch-1 items`)
let miss = 0
const expect = (label, want, got) => {
  const m = want.filter(x => !got.includes(x)), extra = got.filter(x => !want.includes(x))
  if (m.length) miss++
  console.log(`${m.length ? 'MISS' : 'ok  '} ${label}: known ${want.length}, caught ${want.length - m.length}${m.length ? ` (missed ${m.join(', ')})` : ''}; also fired on ${extra.length}${extra.length ? `: ${extra.join(', ')}` : ''}`)
}
const fires = (check, rules = 'b2') => items.filter(i => checkItem(i, SLOT[i.id], [], { rules }).some(p => p.startsWith(check))).map(i => i.id.replace('MSB1-', ''))
expect('LSHAPE', ['E6-01', 'E6-02', 'E6-11', 'E6-16'], fires('LSHAPE'))
{
  const orig = join(HERE, '../../../../scratchpad/map-science-b1/E6/items.json')
  if (!existsSync(orig)) { console.error(`REFUSING: INVENTED needs the E6 author's original file ${orig}`); process.exit(2) }
  const o = JSON.parse(readFileSync(orig, 'utf8')).filter(i => !i.empty)
  expect('INVENTED (E6 author original)', ['E6-07', 'E6-08', 'E6-10'], o.filter(i => checkItem(i, SLOT[i.id], [], { rules: 'b2' }).some(p => p.startsWith('INVENTED'))).map(i => i.id.replace('MSB1-', '')))
  console.log(`   on the corrected items/ files INVENTED fires on: ${fires('INVENTED').join(', ') || 'none'} (P5-07 "Students invented four codes" is a known over-reach: rename costs nothing)`)
}
expect('TICK', ['L8-16'], fires('TICK'))
const bt = checkBatch(items, SLOT, { rules: 'b2' }).p
const misc = bt.filter(p => p.includes('MISC')).map(p => p.match(/author (\w+)/)[1])
expect('MISC (authors)', ['L6', 'L8'], [...new Set(misc)])
const known = [['L7-02', 'L8-08'], ['L7-11', 'L8-04'], ['L7-19', 'L8-12'], ['L6-14', 'L7-14'], ['P6-20', 'P7-06'], ['P7-20', 'P8-13'], ['P6-14', 'P8-14'], ['P7-19', 'P8-12'], ['E6-06', 'E7-06'], ['E6-19', 'E7-13'], ['E7-13', 'E8-02'], ['E6-19', 'E8-02'], ['E6-08', 'E8-16']]
const pairs = bt.filter(p => p.includes('XDUP')).map(p => { const m = p.match(/MSB1-(\w+-\d+) and MSB1-(\w+-\d+)/); return `${m[1]}~${m[2]}` })
const binfo = checkBatch(items, SLOT, { rules: 'b2' }).info
const review = binfo.filter(l => l.startsWith('XDUP-REVIEW')).map(l => { const m = l.match(/MSB1-(\w+-\d+) ~ MSB1-(\w+-\d+)/); return `${m[1]}~${m[2]}` })
expect('XDUP refusing routes (words | key | form) + REVIEW (stem)', known.map(k => k.join('~')), [...pairs, ...review])
console.log(`   refusing routes alone: ${known.filter(k => pairs.includes(k.join('~'))).length} of ${known.length} named pairs, ${pairs.filter(x => !known.some(k => k.join('~') === x)).length} other pairs refused; REVIEW lines ${review.length}`)
const byId = Object.fromEntries(items.map(i => [i.id.replace('MSB1-', ''), i]))
for (const [a, b] of known) { const r = xdupReason(byId[a], byId[b]); console.log(`   known ${a}~${b}: ${r ? `${r.refuse ? 'REFUSE' : 'REVIEW'} ${r.why}` : 'NOT CAUGHT'}`) }
console.log(miss ? `VALIDATION: ${miss} check(s) missed a known item` : 'VALIDATION OK: every b2 check reproduces its known batch-1 finding')
process.exit(miss ? 1 : 0)
