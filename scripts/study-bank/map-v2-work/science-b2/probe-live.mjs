#!/usr/bin/env node
/**
 * probe-live.mjs: probes every batch-2 item against every live AND staged map/science row (READ ONLY), so batch 2
 * cannot re-author a topic or key that the pilot or batch 1 already holds. Run from the repo root.
 *
 *   node scripts/study-bank/map-v2-work/science-b2/probe-live.mjs --dump            # read the rows, write the snapshot
 *   node scripts/study-bank/map-v2-work/science-b2/probe-live.mjs <items.json ...>  # probe (reads the snapshot)
 *
 * --dump pages study_item_bank (family map, section science) with the server count asserted and writes
 * scratchpad/map-science-b2/live-map-science.json. The probe uses sci-check's xdupReason (words / key / form refuse;
 * stem prints REVIEW) on every same-area pair, plus LIVEKEY: the same term / trend / claim key as a live or staged
 * row of the same area. Exit 2 when the snapshot or an item file is missing or empty (never "0 duplicates" over
 * nothing), 1 when any pair refuses, 0 otherwise. Every REVIEW line is adjudicated in writing before packets.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { xdupReason } from '../science-pilot/sci-check.mjs'
import { norm } from '../science-pilot/sci-spec.mjs'

const SNAP = 'scratchpad/map-science-b2/live-map-science.json'
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const A = process.argv.slice(2)
if (A.includes('--dump')) {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { count, error: ce } = await db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('family', 'map').eq('section', 'science')
  if (ce) die(ce.message)
  const rows = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('study_item_bank').select('id,cohort,domain,subskill,difficulty,verified,archived,item,verify_meta').eq('family', 'map').eq('section', 'science').order('id').range(f, f + 999)
    if (error) die(error.message)
    rows.push(...data); if (data.length < 1000) break
  }
  if (!rows.length || rows.length !== count) die(`read ${rows.length} map/science rows, server count ${count}`)
  mkdirSync('scratchpad/map-science-b2', { recursive: true }); writeFileSync(SNAP, JSON.stringify(rows))
  console.log(`wrote ${SNAP}: ${rows.length} rows (server count ${count}; ${rows.filter(r => r.verified).length} live, ${rows.filter(r => !r.verified).length} staged)`)
  process.exit(0)
}
if (!existsSync(SNAP)) die(`no snapshot ${SNAP}; run --dump first`)
const rows = JSON.parse(readFileSync(SNAP, 'utf8'))
if (!rows.length) die('snapshot holds 0 rows')
const live = rows.map(r => ({ id: `${r.verified ? 'live' : 'staged'}:${r.verify_meta?.draft?.qid ?? r.id}`, area: r.domain, passage: r.item?.passage, prompt: r.item?.prompt, correct_answer: r.item?.correct_answer, choices: r.item?.choices, ngss_pe: r.verify_meta?.map?.ngss_pe, ask: r.verify_meta?.map?.ask, format: r.verify_meta?.map?.format }))
const files = A.filter(a => !a.startsWith('--'))
if (!files.length) die('usage: probe-live.mjs --dump | <items.json ...>')
const items = []
for (const f of files) { if (!existsSync(f)) die(`no such file ${f}`); const a = JSON.parse(readFileSync(f, 'utf8')); if (!Array.isArray(a) || !a.length) die(`${f}: empty`); items.push(...a.filter(i => !i.empty)) }
if (!items.length) die('zero written items')
let refuse = 0, review = 0, pairs = 0
for (const it of items) {
  for (const r of live) {
    if (r.area !== it.map_area) continue
    pairs++
    const x = xdupReason(it, r)
    if (x?.refuse) { refuse++; console.log(`REFUSE ${it.id} ~ ${r.id}: ${x.why}\n    b2:   ${String(it.prompt).slice(0, 110)} => ${it.correct_answer}\n    live: ${String(r.prompt).slice(0, 110)} => ${r.correct_answer}`) }
    else if (x) { review++; console.log(`REVIEW ${it.id} ~ ${r.id}: ${x.why}`) }
    if (['term', 'trend', 'claim'].includes(it.format) && norm(it.correct_answer) === norm(r.correct_answer)) { refuse++; console.log(`REFUSE LIVEKEY ${it.id} keys "${it.correct_answer}", as ${r.id} already does`) }
  }
}
console.log(`probe-live: ${items.length} items x ${rows.length} rows (${pairs} same-area pairs): ${refuse} refused, ${review} REVIEW`)
process.exit(refuse ? 1 : 0)
