#!/usr/bin/env node
/**
 * release-science-audit-2026-10-30.mjs [--apply]
 *
 * Owner decision 2026-10-30 ("GO on both"): staged ACT and MAP Science is released on the two agent passes, with
 * no co-founder blind-only run: the original with-source gate (cleared lists) plus the key-visible second-pass
 * audit (SCIENCE-AUDIT-2026-10-30.prereg.md, scored by science-audit-score.mjs into FLAGGED.json).
 *   ACT:  every audited item outside a held passage.
 *   MAP:  every audited item except those with a flag other than `no_source`. MAP Science items are standalone
 *         knowledge items, so `no_source` alone is the construct, not a defect (owner, same decision).
 * The population is exactly the audited rows (packet index.json row_id). A row is written only if it is still
 * verified=false AND archived=false AND its updated_at is no later than the manifest's built_at; otherwise the
 * script refuses (an edit after the audit makes the audit stale). Dry run by default.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { client } from './autonomy-io.mjs'

const ROOT = new URL('../../', import.meta.url).pathname
const AUD = join(ROOT, 'scratchpad/science-audit')
const APPLY = process.argv.includes('--apply')
const refuse = m => { console.error('REFUSING: ' + m); process.exit(2) }

const M = JSON.parse(readFileSync(join(AUD, 'MANIFEST.json'), 'utf8'))
const F = JSON.parse(readFileSync(join(AUD, 'FLAGGED.json'), 'utf8'))
const items = M.packets.flatMap(p => JSON.parse(readFileSync(join(AUD, p.packet, 'index.json'), 'utf8')).items)
if (items.length !== M.items) refuse(`read ${items.length} audited items, manifest says ${M.items}`)

const heldAct = new Set(F.heldPassages.filter(h => h.cohort.startsWith('act-')).flatMap(h => h.items))
const heldMap = new Set(F.flagged.filter(f => f.cohort.startsWith('map-') && f.reasons.some(r => !/^\w+: no_source:/.test(r))).map(f => f.id))
const release = items.filter(i => i.cohort.startsWith('act-') ? !heldAct.has(i.id) : !heldMap.has(i.id))
const held = items.filter(i => !release.includes(i))

const db = client()
const rows = []
for (let k = 0; k < release.length; k += 200) {
  const { data, error } = await db.from('study_item_bank').select('id, cohort, verified, archived, updated_at, verify_meta').in('id', release.slice(k, k + 200).map(i => i.row_id))
  if (error) refuse(error.message)
  rows.push(...data)
}
if (rows.length !== release.length) refuse(`found ${rows.length} of ${release.length} rows`)
const built = new Date(M.built_at)
const stale = rows.filter(r => new Date(r.updated_at) > built)
if (stale.length) refuse(`${stale.length} rows edited after the audit was built (${M.built_at}), e.g. ${stale[0].id}`)
const todo = rows.filter(r => !r.verified && !r.archived)

const by = {}
for (const i of release) { by[i.cohort] ??= { release: 0, held: 0 }; by[i.cohort].release++ }
for (const i of held) { by[i.cohort] ??= { release: 0, held: 0 }; by[i.cohort].held++ }
for (const [c, v] of Object.entries(by).sort()) console.log(`  ${c.padEnd(24)} release ${String(v.release).padStart(3)}  held ${v.held}`)
console.log(`audited ${items.length}; release ${release.length} (to write ${todo.length}, already verified ${rows.length - todo.length - rows.filter(r => r.archived).length}, archived ${rows.filter(r => r.archived).length}); held ${held.length}`)
if (!APPLY) { console.log('DRY RUN: pass --apply to write.'); process.exit(0) }

const today = new Date().toISOString().slice(0, 10)
let n = 0
for (const r of todo) {
  const meta = { ...(r.verify_meta ?? {}), released_at: today, release_basis: 'owner 2026-10-30: with-source gate + key-visible second-pass audit (SCIENCE-AUDIT-2026-10-30); no co-founder sitting' }
  const { error, count } = await db.from('study_item_bank').update({ verified: true, verify_meta: meta }, { count: 'exact' }).eq('id', r.id).eq('verified', false).eq('archived', false)
  if (error) refuse(`${r.id}: ${error.message}`)
  n += count ?? 0
}
console.log(`released ${n} of ${todo.length}`)
