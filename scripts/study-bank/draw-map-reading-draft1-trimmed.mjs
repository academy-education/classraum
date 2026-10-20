#!/usr/bin/env node
/**
 * draw-map-reading-draft1-trimmed.mjs <run id>
 *
 * map-reading-draft-1.REVIEW.PREREG.md Amendment 1 (2026-10-19, before any draw): draw all 48 with the
 * pre-registered command, then BEFORE the reviewer opens it delete the run's rows for passages P03 P04 P05
 * P08 P10 P11 and confirm 24 rows remain, 4 per kept passage (P01 P02 P06 P07 P09 P12). Print the control
 * (best fixed-slot score on the 24). If it is above 9/24, delete the run and redraw (at most 3 draws).
 * Refuses to delete any row already opened (blind_at set).
 */
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const RUN = process.argv[2]; if (!RUN) { console.error('usage: <run id>'); process.exit(2) }
const REVIEWER = '6ca6edaf-4044-4eed-84e0-137ebd79a81d'
const DROP = ['P03', 'P04', 'P05', 'P08', 'P10', 'P11'].map(p => `map-draft1-M1-${p}`), KEEP = ['P01', 'P02', 'P06', 'P07', 'P09', 'P12'].map(p => `map-draft1-M1-${p}`)
const refuse = m => { console.error('REFUSING: ' + m); process.exit(2) }

for (let attempt = 1; attempt <= 3; attempt++) {
  execFileSync('node', ['scripts/study-bank/draw-review-run.mjs', 'Informational Text:18,Literary Text:18,Vocabulary:12', '0', REVIEWER, RUN], { stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, DRAW_FAMILY: 'map', DRAW_COHORT: 'map-reading-draft-1' } })
  const { data: rows, error } = await db.from('study_item_reviews').select('id,item_id,key_slot,blind_at').eq('run_id', RUN)
  if (error) refuse(error.message)
  if (rows.length !== 48) refuse(`draw made ${rows.length} rows, expected 48`)
  const { data: items } = await db.from('study_item_bank').select('id,passage_group_id').in('id', rows.map(r => r.item_id))
  const pg = new Map(items.map(i => [i.id, i.passage_group_id]))
  const drop = rows.filter(r => DROP.includes(pg.get(r.item_id)))
  if (drop.some(r => r.blind_at)) refuse('a row to be trimmed has already been opened')
  const { error: e2 } = await db.from('study_item_reviews').delete().in('id', drop.map(r => r.id)).is('blind_at', null)
  if (e2) refuse(e2.message)
  const { data: left } = await db.from('study_item_reviews').select('item_id,key_slot').eq('run_id', RUN)
  const per = Object.fromEntries(KEEP.map(k => [k, left.filter(r => pg.get(r.item_id) === k).length]))
  if (left.length !== 24 || Object.values(per).some(n => n !== 4)) refuse(`after trim: ${left.length} rows, per passage ${JSON.stringify(per)}`)
  const slots = {}; for (const r of left) slots[r.key_slot] = (slots[r.key_slot] ?? 0) + 1
  const control = Math.max(...Object.values(slots))
  console.log(`draw ${attempt}: 24 rows, 4 per kept passage; key slots ${JSON.stringify(slots)} -> control ${control}/24 = ${(100 * control / 24).toFixed(1)}%`)
  if (control <= 9) { console.log(`run ${RUN} ready (guard: blind >= 12/24 holds the batch)`); process.exit(0) }
  await db.from('study_item_reviews').delete().eq('run_id', RUN).is('blind_at', null)
  console.log('control above 9/24: run deleted, redrawing')
}
refuse('three draws all had a control above 9/24; stopping')
