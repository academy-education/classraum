#!/usr/bin/env node
/**
 * Stage MAP Science batch 4 (verified=false) as three area cohorts: map-science-v4-life / -phys / -earth
 * (MAP-SCIENCE-B4.prereg.md, stages 3-4). Modelled on stage-map-science-b3full.mjs (same row shape, same content
 * hash over passage + prompt + choices + graphic via stage-map-science-pilot.mjs toRow), with the b4 checker rules.
 * Writes NOTHING verified=true: release is a separate script (release-map-science-b4.mjs).
 *
 *   node scripts/study-bank/stage-map-science-b4.mjs [--apply]
 *
 * Inputs (fixed): map-v2-work/science-b4/items/{L,P,E}.json (the six authors' 240 items, Addendum S
 * fingerprints), map-v2-work/science-b4/cleared.json (stage-2 survivors, from stage2-decide-b4.mjs), slots.json and EXCLUSIONS-science.txt of the same folder.
 * Refuses (exit 1/2, nothing written): a missing autonomy-methods entry; an items file whose sha256 differs from
 * the Addendum S fingerprint; any cleared item sci-check (b4, per item) refuses; a cleared id that
 * STAGE1-DECISION.json does not list as a survivor or STAGE2-DECISION.json holds; an EMPTY or unknown cleared id; a duplicate
 * content hash in the batch or already in the bank; any of the three cohorts already holding rows.
 * After --apply: re-reads every inserted row by id, refuses unless every one is verified=false, and writes
 * map-v2-work/science-b4/STAGED.json (row ids, qids, content hashes, staged_at) for the release script.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkItem, loadExclusions } from './map-v2-work/science-pilot/sci-check.mjs'
import { toRow as pilotRow } from './stage-map-science-pilot.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const DIR = join(HERE, 'map-v2-work/science-b4')
export const METHOD_ID = 'map-sci-b4-6authors+2graders+audit'
export const COHORT_OF = { 'Life Science': 'map-science-v4-life', 'Physical Science': 'map-science-v4-phys', 'Earth and Space Science': 'map-science-v4-earth' }
const FINGERPRINT = { L: '13b2e9c6571ec121', P: '396e048136cff763', E: 'cc72e7e3a0d5d975' } // prereg Addendum S
const die = (m, c = 1) => { console.error('REFUSING: ' + m); process.exit(c) }

export function toRow(it) {
  const r = pilotRow(it)
  r.cohort = COHORT_OF[it.map_area]
  r.verify_meta.method_id = METHOD_ID
  r.verify_meta.map.option_roles = it.option_roles ?? null
  r.verify_meta.draft.qc.note = 'MAP Science batch 4: six parallel Claude authors on seeded slots (map-v2-work/science-b4/BRIEF.md, brief version b4), sci-check --rules b4 + probe-live-b4 + XDUP-REVIEW; stage 1 two fresh with-source graders, drop rules 1-10 per MAP-SCIENCE-B4.prereg.md (rule 10 A1 threshold, RULE10-MATCHES.md), single-grader returns re-checked fresh (STAGE1-DECISION.json, score-b4.mjs); stage 2 key-visible audit (SCIENCE-AUDIT-BRIEF.md, 2 auditors; STAGE2-DECISION.json). Release on the two agent passes (owner rule 2026-10-30); never queued for the co-founder.'
  r.verify_meta.draft.authored.prior_free = it.prior_free ?? null
  r.verify_meta.map.key_category = it.key_category ?? null
  return r
}

const A = process.argv.slice(2)
const methods = JSON.parse(readFileSync(join(HERE, 'autonomy-methods.json'), 'utf8')).cohorts
for (const c of Object.values(COHORT_OF)) if (methods?.[c]?.method_id !== METHOD_ID) die(`autonomy-methods.json has no ${c} entry with method_id ${METHOD_ID}`)
const raw = []
for (const L of ['L', 'P', 'E']) {
  const f = join(DIR, `items/${L}.json`); if (!existsSync(f)) die('missing ' + f, 2)
  const buf = readFileSync(f), h = createHash('sha256').update(buf).digest('hex').slice(0, 16)
  if (h !== FINGERPRINT[L]) die(`${f}: sha256 ${h} is not the Addendum S fingerprint ${FINGERPRINT[L]}`, 2)
  raw.push(...JSON.parse(buf))
}
if (raw.length !== 240) die(`want 240 authored items, got ${raw.length}`, 2)
const cleared = JSON.parse(readFileSync(join(DIR, 'cleared.json'), 'utf8'))
if (!Array.isArray(cleared) || !cleared.length) die('cleared.json empty', 2)
if (new Set(cleared).size !== cleared.length) die('cleared.json repeats an id', 2)
const S1 = JSON.parse(readFileSync(join(DIR, 'STAGE1-DECISION.json'), 'utf8')), S2 = JSON.parse(readFileSync(join(DIR, 'STAGE2-DECISION.json'), 'utf8'))
const s1ok = new Set(Object.values(S1.areas).flatMap((a) => { if (!Array.isArray(a.recheck_results)) die('STAGE1-DECISION.json has no applied re-check', 2); return a.survivor_ids }))
const s2held = new Set(S2.held.map((h) => h.id))
const notS1 = cleared.filter((id) => !s1ok.has(id)); if (notS1.length) die('cleared ids that did not survive stage 1: ' + notS1.join(', '), 2)
const heldC = cleared.filter((id) => s2held.has(id)); if (heldC.length) die('cleared ids held at stage 2: ' + heldC.join(', '), 2)
if (JSON.stringify(S2.cleared) !== JSON.stringify(cleared)) die('cleared.json differs from STAGE2-DECISION.json cleared', 2)
const byId = new Map(raw.map((it) => [it.id, it]))
const stray = cleared.filter((id) => !byId.has(id)); if (stray.length) die('cleared ids not in the items: ' + stray.join(', '))
const S = JSON.parse(readFileSync(join(DIR, 'slots.json'), 'utf8')), slots = {}
for (const [c, v] of Object.entries(S)) if (!c.startsWith('_')) for (const r of v.rows) slots[r.id] = { ...r, area: v.area, author: c }
const ex = loadExclusions(join(DIR, 'EXCLUSIONS-science.txt'))
const problems = []
for (const id of cleared) {
  const it = byId.get(id)
  if (it.empty) { problems.push(`${id}: EMPTY`); continue }
  const pr = checkItem(it, slots[id], ex, { rules: 'b4' }); if (pr.length) problems.push(`${id}: ${pr.join('; ')}`)
}
if (problems.length) die(`sci-check refuses ${problems.length}:\n  ${problems.join('\n  ')}`)
const rows = cleared.map((id) => toRow(byId.get(id)))
if (rows.some((r) => r.verified !== false || !r.cohort)) die('row shape: every row must be verified=false with a cohort')
const hs = rows.map((r) => r.content_hash); if (new Set(hs).size !== hs.length) die('duplicate content hash inside the batch')

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const { createClient } = await import('@supabase/supabase-js')
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: clash, error: e1 } = await db.from('study_item_bank').select('id,cohort').in('content_hash', hs)
if (e1) die(e1.message)
if (clash.length) die(`${clash.length} rows already in the bank with these hashes (e.g. cohort ${clash[0].cohort})`)
for (const c of Object.values(COHORT_OF)) {
  const { count, error } = await db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('cohort', c)
  if (error) die(error.message); if (count) die(`${c} already holds ${count} rows`)
}
const by = {}; for (const r of rows) by[r.cohort] = (by[r.cohort] ?? 0) + 1
console.log(`authored 240; cleared ${cleared.length}; rows ${rows.length} ${JSON.stringify(by)}`)
if (!A.includes('--apply')) { console.log('dry run; pass --apply to insert (verified=false)'); process.exit(0) }

const { data: ins, error: e2 } = await db.from('study_item_bank').insert(rows).select('id, cohort, verified, archived, content_hash, verify_meta')
if (e2) die(e2.message)
if (ins.length !== rows.length) die(`inserted ${ins.length} of ${rows.length}`)
// read verified back from the server, by id, not from the insert echo
const back = []
for (let k = 0; k < ins.length; k += 100) {
  const { data, error } = await db.from('study_item_bank').select('id, cohort, verified, archived, content_hash, updated_at, verify_meta').in('id', ins.slice(k, k + 100).map((r) => r.id))
  if (error) die(error.message); back.push(...data)
}
const vTrue = back.filter((r) => r.verified !== false)
console.log(`read back ${back.length} of ${rows.length}: verified=false ${back.length - vTrue.length}, verified=true ${vTrue.length}`)
if (back.length !== rows.length || vTrue.length) die('READ-BACK FAILED: fix by hand before anything else (set verified=false)')
for (const [c, n] of Object.entries(by)) {
  const { count, error } = await db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('cohort', c).eq('verified', false)
  if (error) die(error.message); if (count !== n) die(`${c}: expected ${n} staged rows, found ${count}`)
  console.log(`${c}: ${count} staged verified=false`)
}
const staged_at = new Date().toISOString()
writeFileSync(join(DIR, 'STAGED.json'), JSON.stringify({ staged_at, method_id: METHOD_ID, rows: back.map((r) => ({ row_id: r.id, cohort: r.cohort, qid: r.verify_meta?.draft?.qid, content_hash: r.content_hash, updated_at: r.updated_at })).sort((a, b) => a.qid.localeCompare(b.qid)) }, null, 1) + '\n')
console.log('wrote map-v2-work/science-b4/STAGED.json')
