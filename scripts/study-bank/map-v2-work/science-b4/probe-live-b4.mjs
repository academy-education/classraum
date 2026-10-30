#!/usr/bin/env node
/**
 * probe-live-b4.mjs (MAP Science batch 4): probes every batch-4 item against every live AND staged map/science row
 * (snapshot scratchpad/map-science-b4/live-map-science.json from snapshot-live.mjs: 367 rows on 2026-10-31 = pilot 30,
 * v1 215, v3 122 incl. the 121 released from batch 3 full) AND every batch-2 (224), pilot-1 (24), pilot-2 (24) and
 * batch-3-full (230, survivors and drops alike) item. Run from the repo root.
 *
 *   node scripts/study-bank/map-v2-work/science-b4/probe-live-b4.mjs <items.json ...>
 *
 * Routes (same-area pairs unless noted):
 *   words / key / form   sci-check xdupReason                                              REFUSE
 *   stem                 same PE, >= 4 stem words shared                                    REVIEW
 *   LIVEKEY              the same term / trend / claim key as any reference row           REFUSE
 *   XKEY (any area)      a batch-4 TERM option named in a reference row's passage/prompt/graphic, or a reference
 *                        term item's option named in a batch-4 text, unless the option is in more than XKEY_MAX_DF
 *                        texts of the whole pool (ordinary vocabulary)                     REFUSE
 *   PEPAIR (in batch)    two batch-4 items on the same PE sharing >= 3 stem words (the b3-full same-PE-same-system
 *                        pairs XDUP-REVIEW missed)                                          REVIEW
 * Exit 2 when the snapshot or an item file is missing/empty or a reference set has the wrong count, 1 on any refusal,
 * 0 otherwise. Every REVIEW line is answered in science-b4/XDUP-REVIEW.md before packets.
 */
import { readFileSync, existsSync } from 'node:fs'
import { xdupReason, xkeyHit, XKEY_MAX_DF } from '../science-pilot/sci-check.mjs'
import { norm } from '../science-pilot/sci-spec.mjs'

const SNAP = 'scratchpad/map-science-b4/live-map-science.json', WANT_SNAP = 367
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
if (!existsSync(SNAP)) die(`no snapshot ${SNAP} (run snapshot-live.mjs)`)
const rows = JSON.parse(readFileSync(SNAP, 'utf8'))
if (rows.length !== WANT_SNAP) die(`snapshot holds ${rows.length} rows, expected ${WANT_SNAP}`)
const gtext = g => !g ? '' : [g.caption, g.xLabel, g.yLabel, ...(g.rowLabels ?? []), ...(g.colLabels ?? []), ...((g.cells ?? []).flat()), ...((g.bars ?? []).map(b => b?.label))].filter(x => x != null).join(' ')
const ref = rows.map(r => ({ id: `${r.verified ? 'live' : 'staged'}:${r.verify_meta?.draft?.qid ?? r.id}`, area: r.domain, passage: r.item?.passage, prompt: r.item?.prompt, graphic: r.item?.graphic, correct_answer: r.item?.correct_answer, choices: r.item?.choices, ngss_pe: r.verify_meta?.map?.ngss_pe, ask: r.verify_meta?.map?.ask, format: r.verify_meta?.map?.format }))
const add = (tag, f) => { if (!existsSync(f)) die(`missing ${f}`); let n = 0; for (const i of JSON.parse(readFileSync(f, 'utf8')).filter(i => !i.empty)) { n++; ref.push({ id: `${tag}:${i.id}`, area: i.map_area, passage: i.passage, prompt: i.prompt, graphic: i.graphic, correct_answer: i.correct_answer, choices: i.choices, ngss_pe: i.ngss_pe, ask: i.ask, format: i.format }) } return n }
let nb2 = 0, np1 = 0, np2 = 0, nb3 = 0
for (const c of ['L5', 'L6', 'L7', 'L8', 'P5', 'P6', 'P7', 'P8', 'E5', 'E6', 'E7', 'E8']) nb2 += add('b2', `scratchpad/map-science-b2/${c}/items.json`)
for (const c of ['L', 'P', 'E']) np1 += add('p1', `scratchpad/map-science-b3/${c}/items.json`)
for (const c of ['L', 'P', 'E']) np2 += add('p2', `scratchpad/map-science-b3p2/${c}/items.json`)
for (const c of ['L', 'P', 'E']) nb3 += add('b3f', `scripts/study-bank/map-v2-work/science-b3full/items/${c}.json`)
if (nb2 !== 224 || np1 !== 24 || np2 !== 24 || nb3 !== 230) die(`reference sets: b2 ${nb2}/224, p1 ${np1}/24, p2 ${np2}/24, b3full ${nb3}/230`)
const files = process.argv.slice(2).filter(a => !a.startsWith('--'))
if (!files.length) die('usage: probe-live-b4.mjs <items.json ...>')
const items = []
for (const f of files) { if (!existsSync(f)) die(`no such file ${f}`); const a = JSON.parse(readFileSync(f, 'utf8')); if (!Array.isArray(a) || !a.length) die(`${f}: empty`); items.push(...a.filter(i => !i.empty)) }
if (!items.length) die('zero written items')
const T = x => ` ${norm(`${x.passage ?? ''} ${x.prompt ?? ''} ${gtext(x.graphic)}`)} `
const pool = [...ref, ...items].map(x => ({ id: x.id, t: T(x) }))
const df = opt => pool.filter(o => xkeyHit(opt, o.t)).length
let refuse = 0, review = 0, pairs = 0
for (const it of items) {
  const myT = T(it)
  for (const r of ref) {
    if (r.area === it.map_area) {
      pairs++
      const x = xdupReason(it, r)
      if (x?.refuse) { refuse++; console.log(`REFUSE ${it.id} ~ ${r.id}: ${x.why}\n    new:  ${String(it.prompt).slice(0, 110)} => ${it.correct_answer}\n    ref:  ${String(r.prompt).slice(0, 110)} => ${r.correct_answer}`) }
      else if (x) { review++; console.log(`REVIEW ${it.id} ~ ${r.id}: ${x.why}`) }
      if (['term', 'trend', 'claim'].includes(it.format) && norm(it.correct_answer) === norm(r.correct_answer)) { refuse++; console.log(`REFUSE LIVEKEY ${it.id} keys "${it.correct_answer}", as ${r.id} already does`) }
    }
    if (it.format === 'term') for (const c of it.choices) if (xkeyHit(c, T(r)) && df(c) <= XKEY_MAX_DF) { refuse++; console.log(`REFUSE XKEY ${r.id}'s text names "${c}", a term option of ${it.id}${c === it.correct_answer ? ' (its KEY)' : ''}`) }
    if (r.format === 'term' && Array.isArray(r.choices)) for (const c of r.choices) if (xkeyHit(c, myT) && df(c) <= XKEY_MAX_DF) { refuse++; console.log(`REFUSE XKEY ${it.id}'s text names "${c}", a term option of ${r.id}${c === r.correct_answer ? ' (its KEY)' : ''}`) }
  }
}
let pe = 0
const PSTOP = new Set('which what that with from they their this were each into than then when have will would most likely best explains what does shows table figure graph students student based data them there these those after before about while where also only some more much many such very used using class group'.split(' '))
const stemT = i => new Set(norm(`${i.passage ?? ''} ${i.prompt ?? ''}`).split(' ').filter(w => w.length >= 4 && !/^\d/.test(w) && !PSTOP.has(w)))
for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) {
  const A = items[a], B = items[b]
  if (!A.ngss_pe || A.ngss_pe !== B.ngss_pe) continue
  const sa = stemT(A), sh = [...stemT(B)].filter(w => sa.has(w))
  if (sh.length >= 3 && !xdupReason(A, B)) { pe++; review++; console.log(`REVIEW PEPAIR ${A.id} ~ ${B.id}: same PE ${A.ngss_pe}, ${sh.length} stem words shared (${sh.slice(0, 8).join(' ')})`) }
}
console.log(`probe-live-b4: ${items.length} items x (${rows.length} live/staged + ${nb2} b2 + ${np1} p1 + ${np2} p2 + ${nb3} b3full) (${pairs} same-area pairs): ${refuse} refused, ${review} REVIEW (${pe} PEPAIR)`)
process.exit(refuse ? 1 : 0)
