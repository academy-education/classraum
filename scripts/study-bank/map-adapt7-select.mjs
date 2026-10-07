#!/usr/bin/env node
/**
 * map-adapt7-select.mjs   MAP pilot 7 sources (MAP-ADAPT7-PILOT-2026-10-07.prereg.md).
 *
 * Takes pilot 6's candidate list (map-adapt6/candidates.json, ordered by a rule
 * fixed BEFORE pilot 6's screen ran: human-sat first, then sha256) and keeps
 * ranks 1-12 IN THAT ORDER, ignoring the screen result (report-only from this
 * run on). Re-checks each is still live and verified with unchanged content.
 * Bands alternate grade 7 (RIT 200-209) / grade 8 (RIT 210-219).
 * Writes map-adapt7/sources.json. Refuses on any drift.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const P5 = new Set(['15755f7c-9c1c-4344-88a5-d00438fb81b4', '209f3763-e2fb-464c-8692-5165dbd8e9ba', '2c67f590-8c5e-48a9-b078-57218f4e790e', 'a349f42f-f1e3-4b5a-b679-6ebfed79c786'])
const cand = JSON.parse(readFileSync('scripts/study-bank/map-adapt6/candidates.json', 'utf8')).sort((a, b) => a.rank - b.rank)
if (cand.length !== 18) die('pilot 6 candidate list changed')
const take = cand.filter(c => !P5.has(c.source_id)).slice(0, 12)
const { data, error } = await db.from('study_item_bank').select('id,verified,archived,item').in('id', take.map(c => c.source_id))
if (error) die(error.message)
const out = take.map((c, i) => {
  const r = data.find(x => x.id === c.source_id)
  if (!r || !r.verified || r.archived || JSON.stringify(r.item) !== JSON.stringify(c.item)) die(`${c.source_id} not live/verified or content changed`)
  return { adapt_id: `MAPA7-${String(i + 1).padStart(2, '0')}`, source_id: c.source_id, family: c.family, section: c.section, cohort: c.cohort, subskill: c.subskill, difficulty: c.difficulty, human_sat: c.human_sat, pilot6_rank: c.rank, set: null, passage_group_id: null, standalone: 'coe', map_area: 'Informational Text', map_strand: 'Analyze Central Idea, Concepts, and Events; Summarize', grade_target: i % 2 ? 8 : 7, target_band: i % 2 ? 'RIT 210-219' : 'RIT 200-209', item: c.item }
})
writeFileSync('scripts/study-bank/map-adapt7/sources.json', JSON.stringify(out, null, 1) + '\n')
console.log(`wrote ${out.length} sources (human-sat ${out.filter(x => x.human_sat).length})`)
for (const x of out) console.log(`${x.adapt_id} ${x.source_id} rank ${x.pilot6_rank}${x.human_sat ? ' [human-sat]' : ''} ${x.target_band}`)
