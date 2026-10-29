#!/usr/bin/env node
/**
 * agent-review-release.mjs <audit run id> [--apply] [--wave2]
 *
 * Releases the SSAT/MAP agent-review survivors cohort by cohort, on Daniel's audit sample
 * (AGENT-REVIEW-SSAT-MAP.prereg.md, "Release after A1"). The pure rule is agent-review-core decideRelease, pinned by
 * src/lib/study/__tests__/agent-review-score.test.ts:
 *   every sampled item of a cohort unique, no would_block note   -> release that cohort's cleared items (verified=true)
 *   any alternative / broken verdict or would_block note          -> hold the cohort's cleared items, listed
 * Refuses while the run has an unanswered row, when a note is not yet in the notes ledger (cofounder-notes.json, or
 * AUTONOMY_NOTES_FILE), when the run is not the sample in agent-review/audit-sample.json, or when a sampled item was
 * edited since the sitting. Cohorts not in the sample are never released here.
 *
 * Dry run by default. --apply writes only rows still verified=false AND archived=false.
 * --wave2 reads agent-review/results-wave2 and audit-sample-wave2.json (AGENT-REVIEW-WAVE2.prereg.md) instead.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { decideRelease, ReviewError } from './agent-review-core.mjs'
import { RefusalError } from './autonomy-core.mjs'
import { client, pageExact, rowsByIds, refuseAndExit, here } from './autonomy-io.mjs'

const args = process.argv.slice(2)
const RUN = args.find(a => !a.startsWith('--'))
const APPLY = args.includes('--apply')
const NOTES = process.env.AUTONOMY_NOTES_FILE || here + 'cofounder-notes.json'
const WAVE2 = args.includes('--wave2')
const SAMPLE = join(here, WAVE2 ? 'agent-review/audit-sample-wave2.json' : 'agent-review/audit-sample.json')
const RESULTS = join(here, WAVE2 ? 'agent-review/results-wave2' : 'agent-review/results')
const BASIS = WAVE2 ? 'AGENT-REVIEW-WAVE2' : 'AGENT-REVIEW-SSAT-MAP A1'

try {
  if (!RUN) throw new RefusalError('usage: agent-review-release.mjs <audit run id> [--apply]')
  if (!RUN.includes('agentreview-audit')) throw new RefusalError(`"${RUN}" is not an agentreview-audit run`)
  const S = JSON.parse(readFileSync(SAMPLE, 'utf8'))
  if (S.runId !== RUN) throw new RefusalError(`${SAMPLE} is for ${S.runId}, not ${RUN}`)
  if (!existsSync(NOTES)) throw new RefusalError(`notes ledger ${NOTES} missing: a note cannot be read as harmless without it`)
  const raw = JSON.parse(readFileSync(NOTES, 'utf8'))
  const ledger = Array.isArray(raw) ? raw : raw.entries
  const cleared = Object.fromEntries(readdirSync(RESULTS).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(join(RESULTS, f), 'utf8'))).map(c => [c.cohort, c.cleared]))
  const sample = Object.fromEntries(S.cohorts.map(c => [c.cohort, c.ids]))

  const db = client()
  const reviews = await pageExact(db, 'study_item_reviews', 'id,item_id,run_id,verdict,note,item_sha,reviewer_kind,blind_at', q => q.eq('run_id', RUN), `run ${RUN}`)
  let plan
  try { plan = decideRelease({ sample, cleared, reviews, ledger }) } catch (e) { if (e instanceof ReviewError) throw new RefusalError(e.message); throw e }
  const sat = await rowsByIds(db, 'study_item_bank', 'id,content_sha', reviews.map(r => r.item_id), 'sampled rows')
  const sha = new Map(sat.map(r => [r.id, r.content_sha]))
  const stale = reviews.filter(r => sha.get(r.item_id) !== r.item_sha)
  if (stale.length) throw new RefusalError(`${stale.length} sampled item(s) edited since the sitting`)

  const allIds = Object.values(plan).flatMap(p => p.ids)
  const rows = await rowsByIds(db, 'study_item_bank', 'id,verified,archived,verify_meta', allIds, 'cleared rows')
  const byId = new Map(rows.map(r => [r.id, r]))
  let rel = 0, held = 0
  console.log(`${RUN}: ${reviews.length} rows over ${Object.keys(plan).length} cohorts`)
  for (const [cohort, p] of Object.entries(plan)) {
    const todo = p.ids.filter(id => !byId.get(id).verified && !byId.get(id).archived)
    if (p.release) rel += todo.length; else held += p.ids.length
    console.log(`  ${cohort.padEnd(30)} ${p.release ? `RELEASE ${todo.length} of ${p.ids.length} cleared` : `HOLD ${p.ids.length} cleared: ${p.defects.join('; ')}`}`)
  }
  console.log(`release ${rel}, hold ${held}`)
  for (const [cohort, p] of Object.entries(plan)) if (!p.release) console.log(`  held ids (${cohort}): ${p.ids.join(',')}`)
  if (!APPLY) { console.log('DRY RUN: pass --apply to write.'); process.exit(0) }

  const today = new Date().toISOString().slice(0, 10)
  let written = 0
  for (const [cohort, p] of Object.entries(plan)) if (p.release) for (const id of p.ids) {
    const r = byId.get(id)
    if (r.verified || r.archived) continue
    const wasSat = sample[cohort].includes(id)
    const meta = { ...(r.verify_meta ?? {}), agent_review: BASIS, ...(wasSat ? { human_sitting: RUN } : {}), released_at: today, release_basis: `agent review (3 graders, A1) + audit run ${RUN}: cohort sample clean${wasSat ? '; sampled, only defensible' : '; unsampled, agent-cleared'}` }
    const { error } = await db.from('study_item_bank').update({ verified: true, verify_meta: meta }).eq('id', id).eq('verified', false).eq('archived', false)
    if (error) throw new RefusalError(`write failed on ${id}: ${error.message}`)
    written++
  }
  console.log(`written: ${written} released`)
} catch (e) { refuseAndExit(e) }
