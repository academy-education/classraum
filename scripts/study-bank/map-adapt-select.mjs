#!/usr/bin/env node
/**
 * map-adapt-select.mjs   pick the SOURCE items for the MAP adaptation pilot
 *                        (MAP-ADAPT-PILOT-2026-10-07.prereg.md) and write
 *                        map-adapt/sources.json with their full live content.
 *
 * Every rule is fixed here, before any adaptation exists. Passages are named;
 * standalones are drawn from declared eligible pools by sha256 order of
 * "map-adapt-2026-10-07|<id>", first N taken. Refuses (exit 2) if a named
 * item is missing, archived or unverified, or if a pool is short.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const h = id => createHash('sha256').update('map-adapt-2026-10-07|' + id).digest('hex')
const pageAll = async (table, select, tune) => { const out = []; for (let f = 0; ; f += 1000) { const { data, error } = await tune(db.from(table).select(select)).range(f, f + 999); if (error) die(error.message); out.push(...data); if (data.length < 1000) break } return out }

// ---- passage groups: named (SSAT Reading s3; the passages that carry co-founder-sat items) ----
const PASSAGES = [
  { set: 'P1', gid: 'rw-RW3-S06', area: 'Literary Text', grade: 6, band: 'RIT 190-199', items: [
    ['911cedb4-37df-4442-ad15-0064be0f807d', 'Literary Text', 'Analyze Theme and Literary Elements; Summarize'],
    ['48240770-b1b0-4d3e-8536-06739a11544a', 'Literary Text', 'Analyze Theme and Literary Elements; Summarize'],
    ['22a23962-29a9-496f-8396-7b7d41dc5c50', 'Literary Text', 'Analyze Point of View, Features, and Structure'],
    ['22f51ea9-9119-4f29-80fe-a3a1435c0e14', 'Vocabulary', 'Vocabulary'] ] },
  { set: 'P2', gid: 'rw-RW3-S01', area: 'Literary Text', grade: 7, band: 'RIT 200-209', items: [
    ['5cf8a937-57bf-44be-b1b2-c9af8c3a0013', 'Literary Text', 'Analyze Theme and Literary Elements; Summarize'],
    ['e1f92e93-4ffe-48cd-99cc-11f8606f20ba', 'Literary Text', 'Analyze Theme and Literary Elements; Summarize'],
    ['9e1c6ea4-93fc-4b4a-85c5-6d2fd88d94fc', 'Literary Text', 'Analyze Point of View, Features, and Structure'],
    ['7cfb9796-ebd0-41e9-9ff4-6f1e413a528b', 'Vocabulary', 'Vocabulary'] ] },
  { set: 'P3', gid: 'rw-RW3-S02', area: 'Informational Text', grade: 8, band: 'RIT 210-219', items: [
    ['a1870fb0-9d47-4f71-b113-4279b8cbe0d2', 'Informational Text', 'Analyze Central Idea, Concepts, and Events; Summarize'],
    ['8c43dbc8-1d14-47bb-bc6d-214b5a88a8cc', 'Informational Text', 'Analyze Point of View, Purpose, Features, and Structure'],
    ['232a5a3b-a2bb-4ab6-adb7-070a8c38e508', 'Informational Text', 'Analyze Central Idea, Concepts, and Events; Summarize'],
    ['722470a4-e2ea-4885-b055-8523060a1207', 'Vocabulary', 'Vocabulary'] ] },
]
// ---- standalone pools: declared eligibility, then sha256 order ----
const GRADES = { wic: [[5, 'RIT 180-189'], [5, 'RIT 180-189'], [6, 'RIT 190-199'], [7, 'RIT 200-209']],
  trans: [[5, 'RIT 180-189'], [5, 'RIT 180-189'], [6, 'RIT 190-199'], [8, 'RIT 210-219']],
  coe: [[6, 'RIT 190-199'], [7, 'RIT 200-209'], [8, 'RIT 210-219'], [8, 'RIT 210-219']] }
// WIC: gated WIC cohorts; the KEY must be one common word a grade 5-8 student can be taught (the key is never changed)
const WIC_COHORTS = ['rw-v12-wic', 'rw-v14-wic', 'rw-v15-wic', 'rw-v16-wic']
const WIC_KEYS = new Set(['released', 'routes', 'subject', 'price', 'blame', 'obeyed', 'requires', 'invention', 'rising', 'invisible', 'noise', 'economical', 'protective', 'obligation'])
// transitions: eoi-v5/v6 medium; one key from each relation class
const TRANS_CLASSES = { contrast: ['However,', 'Even so,', 'Nevertheless,', 'On the other hand,', 'Instead,'], cause: ['As a result,', 'Therefore,', 'Thus,', 'Consequently,'], example: ['For example,', 'For instance,'], restate_or_time: ['In other words,', 'Meanwhile,'] }
// CoE: v2 Command of (Textual) Evidence, no graphic, sat by a human (fresh row, reviewer_kind human)

const ids = PASSAGES.flatMap(p => p.items.map(x => x[0]))
const { data: prow, error } = await db.from('study_item_bank').select('id,family,section,domain,subskill,difficulty,cohort,passage_group_id,verified,archived,item').in('id', ids)
if (error) die(error.message)
const out = []
for (const p of PASSAGES) for (const [id, area, strand] of p.items) {
  const r = prow.find(x => x.id === id); if (!r) die(`missing ${id}`)
  if (!r.verified || r.archived || r.passage_group_id !== p.gid) die(`${id} not live in ${p.gid}`)
  out.push({ source_id: id, family: r.family, section: r.section, cohort: r.cohort, subskill: r.subskill, difficulty: r.difficulty, set: p.set, passage_group_id: p.gid, map_area: area, map_strand: strand, grade_target: p.grade, target_band: p.band, item: r.item })
}
const sat = await pageAll('study_item_bank', 'id,family,section,domain,subskill,difficulty,cohort,item', q => q.eq('family', 'sat').eq('section', 'reading_writing').eq('verified', true).eq('archived', false))
const revs = await pageAll('study_item_reviews_fresh', 'item_id,reviewer_kind,blind_pick', q => q.eq('reviewer_kind', 'human'))
const humanSat = new Set(revs.filter(r => r.blind_pick).map(r => r.item_id))
const take = (pool, n, label) => { const s = pool.slice().sort((a, b) => h(a.id).localeCompare(h(b.id))); if (s.length < n) die(`${label} pool ${s.length} < ${n}`); console.log(`${label}: eligible ${pool.length}, taking ${n}`); return s.slice(0, n) }
const push = (r, area, strand, [g, b], tag) => out.push({ source_id: r.id, family: r.family, section: r.section, cohort: r.cohort, subskill: r.subskill, difficulty: r.difficulty, set: null, passage_group_id: null, map_area: area, map_strand: strand, grade_target: g, target_band: b, standalone: tag, item: r.item })

const wicPool = sat.filter(r => WIC_COHORTS.includes(r.cohort) && /words in context/i.test(r.subskill ?? '') && WIC_KEYS.has(String(r.item.correct_answer).trim().toLowerCase()))
take(wicPool, 4, 'WIC').forEach((r, i) => push(r, 'Vocabulary', 'Vocabulary', GRADES.wic[i], 'wic'))
const tr = sat.filter(r => ['eoi-v5', 'eoi-v6'].includes(r.cohort) && /^transitions$/i.test(r.subskill ?? '') && r.difficulty === 'medium')
Object.entries(TRANS_CLASSES).forEach(([cls, keys], i) => { const [r] = take(tr.filter(x => keys.includes(String(x.item.correct_answer).trim())), 1, `transitions/${cls}`); push(r, 'Writing: Write, Revise Texts for Purpose and Audience', 'Plan, Organize; Create Cohesion, Use Transitions', GRADES.trans[i], 'transition') })
const coePool = sat.filter(r => r.cohort === 'v2' && /^command of (textual )?evidence$/i.test(r.subskill ?? '') && !r.item.graphic && humanSat.has(r.id) && (r.item.passage ?? '').split(/\s+/).length >= 30)
take(coePool, 4, 'CoE').forEach((r, i) => push(r, 'Informational Text', 'Analyze Central Idea, Concepts, and Events; Summarize', GRADES.coe[i], 'coe'))

if (out.length !== 24 || new Set(out.map(x => x.source_id)).size !== 24) die(`expected 24 distinct sources, got ${out.length}`)
out.forEach((x, i) => { x.adapt_id = `MAPA-${String(i + 1).padStart(2, '0')}` })
writeFileSync('scripts/study-bank/map-adapt/sources.json', JSON.stringify(out, null, 1) + '\n')
const cnt = k => out.reduce((a, x) => ((a[x[k]] = (a[x[k]] ?? 0) + 1), a), {})
console.log(`wrote 24 sources; by area ${JSON.stringify(cnt('map_area'))}; by band ${JSON.stringify(cnt('target_band'))}; human-sat sources ${out.filter(x => humanSat.has(x.source_id)).length}`)
for (const x of out) console.log(`${x.adapt_id} ${x.source_id} ${x.family}/${x.cohort} ${x.subskill} -> ${x.map_strand} ${x.target_band}${humanSat.has(x.source_id) ? ' [human-sat]' : ''} key="${String(x.item.correct_answer).slice(0, 50)}"`)
