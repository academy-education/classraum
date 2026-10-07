#!/usr/bin/env node
/**
 * map-adapt6-select.mjs   MAP pilot 6 (CoE-only adaptation) CANDIDATE sources.
 *                         MAP-ADAPT6-PILOT-2026-10-07.prereg.md.
 *
 * Pool: live verified SAT `v2` Command of Evidence / Command of Textual
 * Evidence, no graphic, prompt not about a table/graph/chart, passage >= 30
 * words, minus the four pilot-5 CoE sources (209f3763 = MAPA-22, guessable
 * before and after; 15755f7c, 2c67f590, a349f42f, already adapted and graded).
 * Priority: human-sat first, then the rest; each tier in sha256 order of
 * "map-adapt6-2026-10-07|<id>". The first 18 are candidates. The source
 * options-only screen (render/score `screen`) then removes any candidate
 * unanimous on its key 3/3, and the first 12 survivors in priority order
 * become sources.json. Writes map-adapt6/candidates.json. Refuses on a short pool.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const h = id => createHash('sha256').update('map-adapt6-2026-10-07|' + id).digest('hex')
const pageAll = async (table, select, tune) => { const out = []; for (let f = 0; ; f += 1000) { const { data, error } = await tune(db.from(table).select(select)).range(f, f + 999); if (error) die(error.message); out.push(...data); if (data.length < 1000) break } return out }

export const EXCLUDE = new Set(['209f3763-e2fb-464c-8692-5165dbd8e9ba', '15755f7c-9c1c-4344-88a5-d00438fb81b4', '2c67f590-8c5e-48a9-b078-57218f4e790e', 'a349f42f-f1e3-4b5a-b679-6ebfed79c786'])
const NCAND = 18

const sat = await pageAll('study_item_bank', 'id,family,section,subskill,difficulty,cohort,item', q => q.eq('family', 'sat').eq('section', 'reading_writing').eq('cohort', 'v2').eq('verified', true).eq('archived', false))
const revs = await pageAll('study_item_reviews_fresh', 'item_id,reviewer_kind,blind_pick', q => q.eq('reviewer_kind', 'human'))
const humanSat = new Set(revs.filter(r => r.blind_pick).map(r => r.item_id))
const pool = sat.filter(r => /^command of (textual )?evidence$/i.test(r.subskill ?? '') && !r.item.graphic && !/table|graph|chart/i.test(r.item.prompt ?? '') && (r.item.passage ?? '').split(/\s+/).length >= 30 && r.item.choices?.length === 4 && !EXCLUDE.has(r.id))
const tier = r => (humanSat.has(r.id) ? 0 : 1)
const ord = pool.slice().sort((a, b) => tier(a) - tier(b) || h(a.id).localeCompare(h(b.id)))
if (ord.length < NCAND) die(`pool ${ord.length} < ${NCAND}`)
const cand = ord.slice(0, NCAND).map((r, i) => ({ rank: i + 1, source_id: r.id, family: r.family, section: r.section, cohort: r.cohort, subskill: r.subskill, difficulty: r.difficulty, human_sat: humanSat.has(r.id), item: r.item }))
writeFileSync('scripts/study-bank/map-adapt6/candidates.json', JSON.stringify(cand, null, 1) + '\n')
console.log(`pool ${pool.length} (human-sat ${pool.filter(r => humanSat.has(r.id)).length}); wrote ${cand.length} candidates`)
for (const c of cand) console.log(`${String(c.rank).padStart(2)} ${c.source_id} ${c.difficulty}${c.human_sat ? ' [human-sat]' : ''} ${c.item.prompt.slice(0, 70)}`)
