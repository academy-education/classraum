#!/usr/bin/env node
/**
 * probe-live.mjs (batch 3 FULL): probes every full-batch item against every live AND staged map/science row (snapshot
 * scratchpad/map-science-b3/live-map-science.json, 245 rows; re-counted against the server READ-ONLY on 2026-10-31 before
 * any item: 245, no id missing) AND every batch-2 item (224), every pilot-1 item (24) and every pilot-2 item (24). Uses
 * sci-check's xdupReason (words / key / form refuse; stem prints REVIEW) on every same-area pair, plus LIVEKEY: the same
 * term / trend / claim key as any of those rows. Run from the repo root.
 *
 *   node scripts/study-bank/map-v2-work/science-b3full/probe-live.mjs <items.json ...>
 *
 * Exit 2 when the snapshot or an item file is missing, empty, or a reference set has the wrong count (never "0
 * duplicates" over nothing), 1 when any pair refuses, 0 otherwise. Every REVIEW line is answered in XDUP-REVIEW.md.
 */
import { readFileSync, existsSync } from 'node:fs'
import { xdupReason } from '../science-pilot/sci-check.mjs'
import { norm } from '../science-pilot/sci-spec.mjs'

const SNAP = 'scratchpad/map-science-b3/live-map-science.json'
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const A = process.argv.slice(2)
if (!existsSync(SNAP)) die(`no snapshot ${SNAP}`)
const rows = JSON.parse(readFileSync(SNAP, 'utf8'))
if (rows.length !== 245) die(`snapshot holds ${rows.length} rows, expected 245`)
const ref = rows.map(r => ({ id: `${r.verified ? 'live' : 'staged'}:${r.verify_meta?.draft?.qid ?? r.id}`, area: r.domain, passage: r.item?.passage, prompt: r.item?.prompt, correct_answer: r.item?.correct_answer, choices: r.item?.choices, ngss_pe: r.verify_meta?.map?.ngss_pe, ask: r.verify_meta?.map?.ask, format: r.verify_meta?.map?.format }))
const add = (tag, f) => { if (!existsSync(f)) die(`missing ${f}`); let n = 0; for (const i of JSON.parse(readFileSync(f, 'utf8')).filter(i => !i.empty)) { n++; ref.push({ id: `${tag}:${i.id}`, area: i.map_area, passage: i.passage, prompt: i.prompt, correct_answer: i.correct_answer, choices: i.choices, ngss_pe: i.ngss_pe, ask: i.ask, format: i.format }) } return n }
let nb2 = 0, np1 = 0, np2 = 0
for (const c of ['L5', 'L6', 'L7', 'L8', 'P5', 'P6', 'P7', 'P8', 'E5', 'E6', 'E7', 'E8']) nb2 += add('b2', `scratchpad/map-science-b2/${c}/items.json`)
for (const c of ['L', 'P', 'E']) np1 += add('p1', `scratchpad/map-science-b3/${c}/items.json`)
for (const c of ['L', 'P', 'E']) np2 += add('p2', `scratchpad/map-science-b3p2/${c}/items.json`)
if (nb2 !== 224 || np1 !== 24 || np2 !== 24) die(`reference sets: batch 2 ${nb2}/224, pilot 1 ${np1}/24, pilot 2 ${np2}/24`)
const files = A.filter(a => !a.startsWith('--'))
if (!files.length) die('usage: probe-live.mjs <items.json ...>')
const items = []
for (const f of files) { if (!existsSync(f)) die(`no such file ${f}`); const a = JSON.parse(readFileSync(f, 'utf8')); if (!Array.isArray(a) || !a.length) die(`${f}: empty`); items.push(...a.filter(i => !i.empty)) }
if (!items.length) die('zero written items')
let refuse = 0, review = 0, pairs = 0
for (const it of items) {
  for (const r of ref) {
    if (r.area !== it.map_area) continue
    pairs++
    const x = xdupReason(it, r)
    if (x?.refuse) { refuse++; console.log(`REFUSE ${it.id} ~ ${r.id}: ${x.why}\n    new:  ${String(it.prompt).slice(0, 110)} => ${it.correct_answer}\n    ref:  ${String(r.prompt).slice(0, 110)} => ${r.correct_answer}`) }
    else if (x) { review++; console.log(`REVIEW ${it.id} ~ ${r.id}: ${x.why}`) }
    if (['term', 'trend', 'claim'].includes(it.format) && norm(it.correct_answer) === norm(r.correct_answer)) { refuse++; console.log(`REFUSE LIVEKEY ${it.id} keys "${it.correct_answer}", as ${r.id} already does`) }
  }
}
console.log(`probe-live: ${items.length} items x (${rows.length} live/staged + ${nb2} batch-2 + ${np1} pilot-1 + ${np2} pilot-2) (${pairs} same-area pairs): ${refuse} refused, ${review} REVIEW`)
process.exit(refuse ? 1 : 0)
