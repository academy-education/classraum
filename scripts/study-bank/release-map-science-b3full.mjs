#!/usr/bin/env node
/**
 * release-map-science-b3full.mjs [--apply]
 *
 * Releases MAP Science batch 3 full (map-science-v3-life / -phys / -earth) on the two agent passes, under the owner's
 * standing science rule (2026-10-30, "GO on both"; release-science-audit-2026-10-30.mjs is the model):
 *   pass 1  stage-1 with-source graders, drop rules 1-10 (STAGE1-DECISION.json, RULE10-MATCHES.md)
 *   pass 2  key-visible audit, 2 auditors; MAP: `no_source` alone clears, any other flag holds (STAGE2-DECISION.json)
 * The population is exactly STAGED.json (written by stage-map-science-b3full.mjs after its verified=false read-back),
 * cross-checked against cleared.json. Refuses (exit 2, nothing written) if:
 *   - STAGED.json and cleared.json disagree, or any STAGE2 held id is in the population
 *   - a row is missing, moved cohort, or its content_hash differs from STAGED.json
 *   - a row's updated_at is later than its updated_at at staging (an edit after the audit makes the audit stale)
 *   - a row is archived
 * Rows already verified=true are reported and skipped. Dry run by default; --apply writes verified=true and then
 * reads every row back.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { client } from './autonomy-io.mjs'

const DIR = join(new URL('.', import.meta.url).pathname, 'map-v2-work/science-b3full')
const APPLY = process.argv.includes('--apply')
const refuse = (m) => { console.error('REFUSING: ' + m); process.exit(2) }
const rd = (f) => JSON.parse(readFileSync(join(DIR, f), 'utf8'))

const ST = rd('STAGED.json'), cleared = rd('cleared.json'), S2 = rd('STAGE2-DECISION.json')
const pop = ST.rows
if (pop.length !== cleared.length || pop.some((r) => !cleared.includes(r.qid))) refuse(`STAGED.json (${pop.length}) and cleared.json (${cleared.length}) disagree`)
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
// Coordinator hold, 2026-10-31: E5-02 is a DATA item whose table is exactly the inverse-square law (both stage-2
// auditors). The owner's "no_source alone clears" rule covers standalone knowledge items, not data items whose figure
// adds nothing, so it stays staged.
const COORD_HOLD = new Set(['MSB3-E5-02'])
const qidOf = new Map(pop.map((r) => [r.row_id, r.qid]))
if ([...COORD_HOLD].some((q) => !pop.some((r) => r.qid === q))) refuse('a coordinator-hold id is not in the population')
const todo = rows.filter((r) => !r.verified && !COORD_HOLD.has(qidOf.get(r.id)))
console.log(`coordinator hold: ${[...COORD_HOLD].join(', ')}`)
const by = {}; for (const r of rows) { by[r.cohort] ??= { release: 0, already: 0 }; r.verified ? by[r.cohort].already++ : by[r.cohort].release++ }
for (const [c, v] of Object.entries(by).sort()) console.log(`  ${c.padEnd(22)} to release ${String(v.release).padStart(3)}  already verified ${v.already}`)
console.log(`population ${rows.length}; to write ${todo.length}; held at stage 2 (not staged): ${S2.held.length}`)
if (!APPLY) { console.log('DRY RUN: pass --apply to write verified=true.'); process.exit(0) }

const today = new Date().toISOString().slice(0, 10)
let n = 0
for (const r of todo) {
  const meta = { ...(r.verify_meta ?? {}), released_at: today, release_basis: 'owner 2026-10-30 science rule: MAP-SCIENCE-B3-FULL stage 1 (with-source graders, rules 1-10) + stage 2 key-visible audit; no co-founder sitting' }
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
