#!/usr/bin/env node
/**
 * release-map-science-b4.mjs [--apply]
 *
 * Releases MAP Science batch 4 (map-science-v4-life / -phys / -earth) on the two agent passes, under the owner's
 * standing science rule (2026-10-30, "GO on both"; release-map-science-b3full.mjs is the model):
 *   pass 1  stage-1 with-source graders, drop rules 1-10 (STAGE1-DECISION.json from score-b4.mjs, RULE10-MATCHES.md)
 *   pass 2  key-visible audit, 2 auditors; MAP: `no_source` alone clears a model item, holds a data/investigation item; any
 *          other flag holds (STAGE2-DECISION.json, stage2-decide-b4.mjs)
 * The population is exactly STAGED.json (written by stage-map-science-b4.mjs after its verified=false read-back),
 * cross-checked against cleared.json and STAGE2-DECISION.json. Refuses (exit 2, nothing written) if:
 *   - STAGED.json and cleared.json (or STAGE2-DECISION.json's cleared list) disagree, or any STAGE2 held id is in the
 *     population, or a row's cohort is not one of the three v4 cohorts
 *   - a row is missing, moved cohort, or its content_hash differs from STAGED.json
 *   - a row's updated_at is later than its updated_at at staging (an edit after the audit makes the audit stale)
 *   - a row is archived
 * Rows already verified=true are reported and skipped. Dry run by default; --apply writes verified=true and then
 * reads every row back.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { client } from './autonomy-io.mjs'

const DIR = join(new URL('.', import.meta.url).pathname, 'map-v2-work/science-b4')
const APPLY = process.argv.includes('--apply')
const refuse = (m) => { console.error('REFUSING: ' + m); process.exit(2) }
const rd = (f) => JSON.parse(readFileSync(join(DIR, f), 'utf8'))

const ST = rd('STAGED.json'), cleared = rd('cleared.json'), S2 = rd('STAGE2-DECISION.json')
const pop = ST.rows
if (pop.length !== cleared.length || pop.some((r) => !cleared.includes(r.qid))) refuse(`STAGED.json (${pop.length}) and cleared.json (${cleared.length}) disagree`)
if (JSON.stringify(S2.cleared) !== JSON.stringify(cleared)) refuse('cleared.json differs from STAGE2-DECISION.json cleared')
const COHORTS = new Set(['map-science-v4-life', 'map-science-v4-phys', 'map-science-v4-earth'])
if (pop.some((r) => !COHORTS.has(r.cohort))) refuse('STAGED.json carries a row outside the v4 cohorts')
const heldIds = new Set(S2.held.map((h) => h.id))
const bad = pop.filter((r) => heldIds.has(r.qid)); if (bad.length) refuse(`stage-2 held ids in the population: ${bad.map((r) => r.qid).join(', ')}`)

const db = client()
const rows = []
for (let k = 0; k < pop.length; k += 100) {
  const { data, error } = await db.from('study_item_bank').select('id, cohort, verified, archived, content_hash, updated_at, verify_meta').in('id', pop.slice(k, k + 100).map((r) => r.row_id))
  if (error) refuse(error.message); rows.push(...data)
}
if (rows.length !== pop.length) refuse(`found ${rows.length} of ${pop.length} rows`)
const want = new Map(pop.map((r) => [r.row_id, r]))
for (const r of rows) {
  const w = want.get(r.id)
  if (r.cohort !== w.cohort || r.content_hash !== w.content_hash || r.verify_meta?.draft?.qid !== w.qid) refuse(`${w.qid} (${r.id}): cohort/hash/qid differs from STAGED.json`)
  if (new Date(r.updated_at) > new Date(w.updated_at)) refuse(`${w.qid} (${r.id}) edited after staging (${r.updated_at} > ${w.updated_at}): the audit is stale`)
  if (r.archived) refuse(`${w.qid} (${r.id}) is archived`)
}
// Coordinator hold: none. b3 full's E5-02 practice (no_source on a DATA item holds) is applied at stage 2 by
// stage2-decide-b4.mjs, so those items (P5-17, P7-21, E5-09) were never staged. Add a qid here to hold a staged row.
// Coordinator holds 2026-10-31: E8-05 says "tonight" for a new Moon (not visible at night); L7-09 "multiplied evenly" also reads as a constant growth rate (317, not 330); L5-09 keyed "stayed the same" over points that zigzag 35-38.
const COORD_HOLD = new Set(['MSB4-E8-05', 'MSB4-L7-09', 'MSB4-L5-09'])
const qidOf = new Map(pop.map((r) => [r.row_id, r.qid]))
if ([...COORD_HOLD].some((q) => !pop.some((r) => r.qid === q))) refuse('a coordinator-hold id is not in the population')
const todo = rows.filter((r) => !r.verified && !COORD_HOLD.has(qidOf.get(r.id)))
console.log(`coordinator hold: ${[...COORD_HOLD].join(', ') || 'none'}`)
const by = {}; for (const r of rows) { by[r.cohort] ??= { release: 0, already: 0 }; r.verified ? by[r.cohort].already++ : by[r.cohort].release++ }
for (const [c, v] of Object.entries(by).sort()) console.log(`  ${c.padEnd(22)} to release ${String(v.release).padStart(3)}  already verified ${v.already}`)
console.log(`population ${rows.length}; to write ${todo.length}; held at stage 2 (not staged): ${S2.held.length}`)
if (!APPLY) { console.log('DRY RUN: pass --apply to write verified=true.'); process.exit(0) }

const today = new Date().toISOString().slice(0, 10)
let n = 0
for (const r of todo) {
  const meta = { ...(r.verify_meta ?? {}), released_at: today, release_basis: 'owner 2026-10-30 science rule: MAP-SCIENCE-B4 stage 1 (with-source graders, rules 1-10, fresh re-checks) + stage 2 key-visible audit; no co-founder sitting' }
  const { error, count } = await db.from('study_item_bank').update({ verified: true, verify_meta: meta }, { count: 'exact' }).eq('id', r.id).eq('verified', false).eq('archived', false)
  if (error) refuse(`${r.id}: ${error.message}`)
  n += count ?? 0
}
const after = []
for (let k = 0; k < pop.length; k += 100) {
  const { data, error } = await db.from('study_item_bank').select('id, verified').in('id', pop.slice(k, k + 100).map((r) => r.row_id))
  if (error) refuse(error.message); after.push(...data)
}
console.log(`released ${n} of ${todo.length}; read back verified=true ${after.filter((r) => r.verified).length} of ${pop.length}`)
