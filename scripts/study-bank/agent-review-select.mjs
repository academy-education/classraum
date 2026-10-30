/**
 * agent-review-select.mjs — the selection half of agent-review-release.mjs, shared so that every consumer of
 * "what would this audit run release" (agent-review-release.mjs itself, verbal-audit-build.mjs,
 * release-verbal-audit-2026-10-31.mjs) runs the SAME code rather than re-deriving the population by cohort name.
 * Read-only. Throws RefusalError on any refusal agent-review-release.mjs makes.
 *
 * selectRelease(db, run, { wave2 }) -> {
 *   run, reviews, plan,                 // decideRelease output, cohort -> { release, defects, ids }
 *   sample,                             // cohort -> sampled ids
 *   rowsById,                           // Map id -> { id, verified, archived, verify_meta }
 *   release: [{ cohort, ids }],         // per RELEASE cohort, the ids still verified=false AND archived=false
 *   held: [{ cohort, ids, defects }],   // per HOLD cohort, every cleared id
 *   releaseCount, holdCount, basis,
 * }
 * releaseCount is the number agent-review-release.mjs prints as "release N".
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { decideRelease, ReviewError } from './agent-review-core.mjs'
import { RefusalError } from './autonomy-core.mjs'
import { pageExact, rowsByIds, here } from './autonomy-io.mjs'

export const NOTES = process.env.AUTONOMY_NOTES_FILE || here + 'cofounder-notes.json'

export async function selectRelease(db, run, { wave2 = false } = {}) {
  const SAMPLE = join(here, wave2 ? 'agent-review/audit-sample-wave2.json' : 'agent-review/audit-sample.json')
  const RESULTS = join(here, wave2 ? 'agent-review/results-wave2' : 'agent-review/results')
  const basis = wave2 ? 'AGENT-REVIEW-WAVE2' : 'AGENT-REVIEW-SSAT-MAP A1'
  if (!run) throw new RefusalError('usage: agent-review-release.mjs <audit run id> [--apply]')
  if (!run.includes('agentreview-audit')) throw new RefusalError(`"${run}" is not an agentreview-audit run`)
  const S = JSON.parse(readFileSync(SAMPLE, 'utf8'))
  if (S.runId !== run) throw new RefusalError(`${SAMPLE} is for ${S.runId}, not ${run}`)
  if (!existsSync(NOTES)) throw new RefusalError(`notes ledger ${NOTES} missing: a note cannot be read as harmless without it`)
  const raw = JSON.parse(readFileSync(NOTES, 'utf8'))
  const ledger = Array.isArray(raw) ? raw : raw.entries
  const cleared = Object.fromEntries(readdirSync(RESULTS).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(join(RESULTS, f), 'utf8'))).map(c => [c.cohort, c.cleared]))
  const sample = Object.fromEntries(S.cohorts.map(c => [c.cohort, c.ids]))

  const reviews = await pageExact(db, 'study_item_reviews', 'id,item_id,run_id,verdict,note,item_sha,reviewer_kind,blind_at', q => q.eq('run_id', run), `run ${run}`)
  let plan
  try { plan = decideRelease({ sample, cleared, reviews, ledger }) } catch (e) { if (e instanceof ReviewError) throw new RefusalError(e.message); throw e }
  const sat = await rowsByIds(db, 'study_item_bank', 'id,content_sha', reviews.map(r => r.item_id), 'sampled rows')
  const sha = new Map(sat.map(r => [r.id, r.content_sha]))
  const stale = reviews.filter(r => sha.get(r.item_id) !== r.item_sha)
  if (stale.length) throw new RefusalError(`${stale.length} sampled item(s) edited since the sitting`)

  const allIds = Object.values(plan).flatMap(p => p.ids)
  const rows = await rowsByIds(db, 'study_item_bank', 'id,verified,archived,verify_meta', allIds, 'cleared rows')
  const rowsById = new Map(rows.map(r => [r.id, r]))
  const release = [], held = []
  for (const [cohort, p] of Object.entries(plan)) {
    if (p.release) release.push({ cohort, ids: p.ids.filter(id => !rowsById.get(id).verified && !rowsById.get(id).archived) })
    else held.push({ cohort, ids: p.ids, defects: p.defects })
  }
  return {
    run, reviews, plan, sample, rowsById, release, held, basis,
    releaseCount: release.reduce((n, c) => n + c.ids.length, 0),
    holdCount: held.reduce((n, c) => n + c.ids.length, 0),
  }
}
