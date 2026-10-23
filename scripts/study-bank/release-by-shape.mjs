#!/usr/bin/env node
/**
 * release-by-shape.mjs <runId> [--shape spot|bridge|pooled|full] [--apply]
 *
 * Applies the release rule of the run's SHAPE (Amendment 1 rules 1-4, extended by Amendment 3) to one CLOSED
 * co-founder run, batch by batch. The pure rule is autonomy-core planBatchRelease, pinned by
 * src/lib/study/__tests__/autonomy-core.test.ts:
 *   spot / bridge / pooled  every sampled item of a batch clean -> release the sampled items and every unsampled,
 *                           grader-cleared item of that batch; any miss -> archive verdict-flagged items, HOLD
 *                           note-blocked ones (owner decides), release nothing else, and the batch gets a full-sitting
 *                           queue entry. In a pooled run each batch is judged on its own 2-3 items.
 *   full                    per item: unique -> release, flagged -> archive, note-blocked -> hold; unanswered stay
 * A miss is his verdict OR a would_block ledger classification of his note (cofounder-notes.json); an unclassified
 * note refuses. Guards kept from the existing scripts: human rows only, every row answered, no stale row on an
 * undecided item, and, for full sittings only, the blind guard (>= 50% of a run of 6+ items holds everything;
 * Amendment 2). Spot, bridge and pooled runs have no blind guard (Amendment 1 rule 3).
 * The shape is read from the run id (-bridgeN-, -spotN-/-spot-, -pooled-, -fullN-/-release-) unless --shape is given.
 *
 * Dry run by default: prints the plan and the queue entries it would add. --apply writes the bank rows (only rows
 * still verified=false AND archived=false) and appends the queue entries to cofounder-queue.json.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { RefusalError, joinLedger, isMiss, planBatchRelease, fullSittingEntry, shapeOfRun } from './autonomy-core.mjs'
import { client, pageExact, rowsByIds, refuseAndExit, here } from './autonomy-io.mjs'

const args = process.argv.slice(2)
const RUN = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--shape')
const APPLY = args.includes('--apply')
const shapeArg = args.includes('--shape') ? args[args.indexOf('--shape') + 1] : null
const NOTES = process.env.AUTONOMY_NOTES_FILE || here + 'cofounder-notes.json'
const QUEUE = process.env.QUEUE_FILE || here + 'cofounder-queue.json'

try {
  if (!RUN) throw new RefusalError('usage: release-by-shape.mjs <runId> [--shape spot|bridge|pooled|full] [--apply]')
  const shape = shapeArg ?? shapeOfRun(RUN)
  if (!['spot', 'bridge', 'pooled', 'full'].includes(shape)) throw new RefusalError(`cannot tell the run shape of "${RUN}"; pass --shape`)
  if (!existsSync(NOTES)) throw new RefusalError(`notes ledger ${NOTES} missing: a note cannot be read as harmless without it`)
  const raw = JSON.parse(readFileSync(NOTES, 'utf8'))
  const ledger = Array.isArray(raw) ? raw : raw.entries
  const M = JSON.parse(readFileSync(here + 'autonomy-methods.json', 'utf8'))
  const Q = JSON.parse(readFileSync(QUEUE, 'utf8'))
  const db = client()

  const rv = await pageExact(db, 'study_item_reviews', 'id,item_id,run_id,verdict,note,item_sha,reviewer_kind,blind_at,blind_pick,key_slot', q => q.eq('run_id', RUN), `run ${RUN}`)
  if (!rv.length) throw new RefusalError(`run ${RUN} has no rows`)
  if (rv.some(r => r.reviewer_kind !== 'human')) throw new RefusalError('run is not a human sitting')
  if (rv.some(r => !r.blind_at || r.verdict == null)) throw new RefusalError(`${rv.filter(r => !r.blind_at || r.verdict == null).length} row(s) unanswered: the run is not closed`)
  const { byReview, errors } = joinLedger(rv, ledger.filter(e => e.review_id == null ? (e.linked_review_ids ?? []).some(id => rv.some(r => r.id === id)) : rv.some(r => r.id === e.review_id)))
  if (errors.length) throw new RefusalError(`${errors.length} ledger problem(s): ${errors.slice(0, 5).join('; ')}`)

  const sat = await rowsByIds(db, 'study_item_bank', 'id,cohort', rv.map(r => r.item_id), 'sat rows')
  const cohorts = [...new Set(sat.map(r => r.cohort))]
  if (shape !== 'pooled' && cohorts.length !== 1) throw new RefusalError(`a ${shape} run should cover one batch; it covers ${cohorts.join(', ')}`)
  const rows = []
  for (const c of cohorts) rows.push(...await pageExact(db, 'study_item_bank', 'id,cohort,verified,archived,content_sha,verify_meta', q => q.eq('cohort', c), `cohort ${c}`))
  const byId = new Map(rows.map(r => [r.id, r]))
  const stale = rv.filter(r => { const i = byId.get(r.item_id); return !i.verified && !i.archived && i.content_sha !== r.item_sha })
  if (stale.length) throw new RefusalError(`${stale.length} answered row(s) edited since the sitting`)

  const hits = rv.filter(r => r.blind_pick && r.blind_pick === r.key_slot).length
  console.log(`${RUN}: ${shape} run, ${rv.length} rows over ${cohorts.length} batch(es); blind ${hits}/${rv.length}`)
  // Amendment 1 rule 3: on a spot (and so a bridge or pooled run) the blind pick is recorded, never a guard — a 6-12
  // item sample is too small to mean anything. Full sittings keep the per-run guard of release-toefl-conv-runs.mjs.
  if (shape === 'full' && rv.length >= 6 && hits >= rv.length / 2) { console.log('BLIND GUARD FIRES (full sitting, >= 50% of a run of 6+): nothing released.'); process.exit(0) }

  const kept = new Set(M.screenFlaggedKept.ids)
  const plans = []
  for (const c of cohorts) {
    const batch = { cohort: c, items: rows.filter(r => r.cohort === c).map(r => ({ id: r.id, verified: r.verified, archived: r.archived, screenFlaggedKept: kept.has(r.id) })) }
    const sampled = rv.filter(r => byId.get(r.item_id).cohort === c).map(r => ({ item_id: r.item_id, verdict: r.verdict, miss: isMiss(r, byReview.get(r.id)) }))
    const p = planBatchRelease(batch, sampled, shape)
    const decided = new Set(rows.filter(r => r.verified || r.archived).map(r => r.id))
    const fresh = a => a.filter(id => !decided.has(id))
    plans.push({ ...p, release: fresh(p.release), archive: fresh(p.archive), hold: p.hold, alreadyDecided: [...p.release, ...p.archive].filter(id => decided.has(id)).length })
  }
  const newEntries = []
  for (const p of plans) {
    console.log(`  ${p.cohort.padEnd(24)} misses ${p.misses}  release ${p.release.length}  archive ${p.archive.length}  hold ${p.hold.length}  stay ${p.stay.length}${p.alreadyDecided ? `  (${p.alreadyDecided} already decided)` : ''}${p.toFullSitting ? '  -> FULL SITTING of the rest' : ''}`)
    if (p.toFullSitting && !Q.queue.some(e => e.cohort === p.cohort && e.route === 'full')) newEntries.push(fullSittingEntry(Q.queue.find(e => e.cohort === p.cohort), p.cohort))
  }
  for (const e of newEntries) console.log(`  queue entry to add: ${JSON.stringify(e)}`)
  if (!APPLY) { console.log('DRY RUN: pass --apply to write.'); process.exit(0) }

  const today = new Date().toISOString().slice(0, 10)
  for (const p of plans) {
    const basis = `Amendment 3 ${shape} run ${RUN}: blind ${hits}/${rv.length}; batch ${p.misses ? `${p.misses} miss(es)` : 'clean'}`
    for (const [ids, upd] of [[p.release, { verified: true }], [p.archive, { archived: true }]]) for (const id of ids) {
      const r = byId.get(id)
      const wasSat = rv.some(x => x.item_id === id)
      const meta = { ...(r.verify_meta ?? {}), ...(wasSat ? { human_sitting: RUN } : {}), released_at: today, release_basis: basis + (upd.archived ? '; archived: reviewer flagged' : wasSat ? '; sampled, only defensible' : '; unsampled, grader-cleared') }
      const { error } = await db.from('study_item_bank').update({ ...upd, verify_meta: meta }).eq('id', id).eq('verified', false).eq('archived', false)
      if (error) throw new RefusalError(`write failed on ${id}: ${error.message}`)
    }
  }
  if (newEntries.length) { Q.queue.push(...newEntries); writeFileSync(QUEUE, JSON.stringify(Q, null, 2) + '\n') }
  console.log(`written: ${plans.reduce((a, p) => a + p.release.length, 0)} released, ${plans.reduce((a, p) => a + p.archive.length, 0)} archived, ${plans.reduce((a, p) => a + p.hold.length, 0)} held; ${newEntries.length} queue entr(ies) added`)
} catch (e) { refuseAndExit(e) }
