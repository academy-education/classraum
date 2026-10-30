#!/usr/bin/env node
/**
 * release-verbal-audit-2026-10-31.mjs [--root <dir>] [--apply]
 *
 * Releases the staged SSAT Reading / SSAT Verbal / MAP Language / MAP Reading items that
 * agent-review-release.mjs would release for agentreview-audit-cofounder-2026-10-29, MINUS every unit the verbal
 * key-visible audit held (VERBAL-AUDIT-2026-10-31.prereg.md, scored by verbal-audit-score.mjs into FLAGGED.json).
 * A held passage set is held whole; a held standalone item holds itself. Run only after the owner says go.
 *
 * Refuses (exit 2, nothing written) when:
 *   - FLAGGED.json is missing, or was scored from a different MANIFEST (built_at), or scored a different count;
 *   - agent-review-select.mjs selectRelease(run) no longer puts every audited row in its release set, or its release
 *     set is no longer exactly the audited population;
 *   - any audited row has updated_at later than the manifest's built_at, or a content_sha that differs from the one
 *     recorded in the packet index at build (an edit after the audit makes the audit stale).
 * Writes only rows still verified=false AND archived=false. Dry run by default.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { client, rowsByIds, refuseAndExit } from './autonomy-io.mjs'
import { RefusalError } from './autonomy-core.mjs'
import { selectRelease } from './agent-review-select.mjs'

const REPO = resolve(new URL('.', import.meta.url).pathname, '../..')
const argv = process.argv.slice(2)
const ri = argv.indexOf('--root')
const APPLY = argv.includes('--apply')
const readJson = p => { if (!existsSync(p)) throw new RefusalError(`missing ${p}`); return JSON.parse(readFileSync(p, 'utf8')) }

try {
  if (ri >= 0 && !argv[ri + 1]) throw new RefusalError('--root needs a value')
  const AUD = resolve(ri >= 0 ? argv[ri + 1] : join(REPO, 'scratchpad/verbal-audit'))
  const M = readJson(join(AUD, 'MANIFEST.json'))
  const F = readJson(join(AUD, 'FLAGGED.json'))
  if (F.built_at !== M.built_at) throw new RefusalError(`FLAGGED.json was scored from the manifest built ${F.built_at}, not ${M.built_at}`)
  const items = M.packets.flatMap(p => readJson(join(AUD, p.packet, 'index.json')).items)
  if (items.length !== M.items || items.length !== M.population || F.scored_items !== M.items) throw new RefusalError(`read ${items.length} audited items; manifest items ${M.items}, population ${M.population}, scored ${F.scored_items}`)

  const db = client()
  const sel = await selectRelease(db, M.run)
  const selIds = new Set(sel.release.flatMap(c => c.ids))
  const notSel = items.filter(i => !selIds.has(i.row_id))
  if (notSel.length) throw new RefusalError(`${notSel.length} audited row(s) are no longer in ${M.run}'s release set, e.g. ${notSel[0].row_id}`)
  if (selIds.size !== items.length) throw new RefusalError(`${M.run} now releases ${selIds.size} rows; the audit covered ${items.length}. Rebuild the audit.`)

  const heldRows = new Set(F.heldPassages.flatMap(h => h.row_ids))
  for (const f of F.flagged) if (!heldRows.has(f.row_id)) throw new RefusalError(`flagged row ${f.row_id} is not inside a held unit`)
  const release = items.filter(i => !heldRows.has(i.row_id))
  const held = items.filter(i => heldRows.has(i.row_id))

  const rows = await rowsByIds(db, 'study_item_bank', 'id,cohort,verified,archived,updated_at,content_sha,verify_meta', items.map(i => i.row_id), 'audited rows')
  const byId = new Map(rows.map(r => [r.id, r]))
  const built = new Date(M.built_at)
  const stale = items.filter(i => { const r = byId.get(i.row_id); return new Date(r.updated_at) > built || (r.content_sha ?? null) !== (i.content_sha ?? null) })
  if (stale.length) throw new RefusalError(`${stale.length} audited row(s) edited after the audit was built (${M.built_at}), e.g. ${stale[0].row_id} (${stale[0].cohort} ${stale[0].id})`)
  const todo = release.map(i => byId.get(i.row_id)).filter(r => !r.verified && !r.archived)

  const by = {}
  for (const i of release) (by[i.cohort] ??= { release: 0, held: 0 }).release++
  for (const i of held) (by[i.cohort] ??= { release: 0, held: 0 }).held++
  for (const [c, v] of Object.entries(by).sort()) console.log(`  ${c.padEnd(26)} release ${String(v.release).padStart(3)}  held ${v.held}`)
  console.log(`audited ${items.length}; release ${release.length} (to write ${todo.length}); held ${held.length} in ${F.heldPassages.length} unit(s)`)
  if (!APPLY) { console.log('DRY RUN: pass --apply to write.'); process.exit(0) }

  const today = new Date().toISOString().slice(0, 10)
  let n = 0
  for (const r of todo) {
    const wasSat = (sel.sample[r.cohort] ?? []).includes(r.id)
    const meta = { ...(r.verify_meta ?? {}), agent_review: sel.basis, ...(wasSat ? { human_sitting: M.run } : {}), released_at: today, release_basis: `agent review (3 graders, A1) + audit run ${M.run} cohort sample clean + key-visible second-pass audit (VERBAL-AUDIT-2026-10-31, 2 graders, unit not held)` }
    const { error, count } = await db.from('study_item_bank').update({ verified: true, verify_meta: meta }, { count: 'exact' }).eq('id', r.id).eq('verified', false).eq('archived', false)
    if (error) throw new RefusalError(`${r.id}: ${error.message}`)
    n += count ?? 0
  }
  console.log(`released ${n} of ${todo.length}`)
} catch (e) { refuseAndExit(e) }
