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
import { selectRelease } from './agent-review-select.mjs'
import { RefusalError } from './autonomy-core.mjs'
import { client, refuseAndExit } from './autonomy-io.mjs'

const args = process.argv.slice(2)
const RUN = args.find(a => !a.startsWith('--'))
const APPLY = args.includes('--apply')
const WAVE2 = args.includes('--wave2')

try {
  // selection lives in agent-review-select.mjs so the verbal key-visible audit builds from the same code
  const db = client()
  const sel = await selectRelease(db, RUN, { wave2: WAVE2 })
  const { reviews, plan, sample, rowsById: byId, basis: BASIS } = sel
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
