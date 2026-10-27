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
 * BLIND-ONLY RUNS (run id contains '-blindonly-'; act/science and map/science, owner rule 2026-10-27) take a different
 * path, scienceRelease below: his verdicts play no part. A cohort is released on its with-source agent grading (the
 * cleared list and drop records named in science-release.json, joined on verify_meta's qid) once a blind-only run on
 * it is closed (every row has blind_at). The blind score is printed against its control; it holds the release only
 * where a prereg fixed a bar (science-release.json blindBar). Cohorts with a `blocker` refuse with what is missing.
 *
 * Dry run by default: prints the plan and the queue entries it would add. --apply writes the bank rows (only rows
 * still verified=false AND archived=false) and appends the queue entries to cofounder-queue.json.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import {
  RefusalError, joinLedger, isMiss, planBatchRelease, fullSittingEntry, shapeOfRun,
  isBlindOnlyRun, isBlindOnlySection, planScienceRelease, idsUnder,
} from './autonomy-core.mjs'
import { client, pageExact, rowsByIds, refuseAndExit, here } from './autonomy-io.mjs'

const args = process.argv.slice(2)
const RUN = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--shape')
const APPLY = args.includes('--apply')
const shapeArg = args.includes('--shape') ? args[args.indexOf('--shape') + 1] : null
const NOTES = process.env.AUTONOMY_NOTES_FILE || here + 'cofounder-notes.json'
const QUEUE = process.env.QUEUE_FILE || here + 'cofounder-queue.json'

try {
  if (!RUN) throw new RefusalError('usage: release-by-shape.mjs <runId> [--shape spot|bridge|pooled|full] [--apply]')
  if (isBlindOnlyRun(RUN)) { await scienceRelease(RUN); process.exit(0) }
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

  const sat = await rowsByIds(db, 'study_item_bank', 'id,cohort,family,section', rv.map(r => r.item_id), 'sat rows')
  const cohorts = [...new Set(sat.map(r => r.cohort))]
  // Owner rule 2026-10-27: his science VERDICTS are model-assisted, so a verdict run never releases or archives science.
  const sci = sat.find(r => isBlindOnlySection(`${r.family}/${r.section}`))
  if (sci) throw new RefusalError(`run ${RUN} holds ${sci.family}/${sci.section} items: science is released by the agent graders plus a closed BLIND-ONLY run (owner rule 2026-10-27), never by his verdicts`)
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

/** The science path (see the header). Dry unless --apply; writes only rows still verified=false AND archived=false. */
async function scienceRelease(runId) {
  const S = JSON.parse(readFileSync(here + 'science-release.json', 'utf8'))
  const db = client()
  const rv = await pageExact(db, 'study_item_reviews', 'id,item_id,run_id,item_sha,reviewer_kind,blind_at,blind_pick,key_slot,verdict', q => q.eq('run_id', runId), `run ${runId}`)
  if (!rv.length) throw new RefusalError(`run ${runId} has no rows`)
  const sat = await rowsByIds(db, 'study_item_bank', 'id,cohort,family,section,content_sha', rv.map(r => r.item_id), 'sat rows')
  const satBy = new Map(sat.map(r => [r.id, r]))
  const cohorts = [...new Set(sat.map(r => r.cohort))]
  for (const r of sat) if (!isBlindOnlySection(`${r.family}/${r.section}`)) throw new RefusalError(`blind-only run ${runId} holds ${r.family}/${r.section} item ${r.id}; only act/science and map/science release this way`)
  const qidOf = (cfg, row) => cfg.qid.split('.').reduce((o, k) => (o == null ? o : o[k]), row.verify_meta ?? {})
  const releasedCache = new Map()
  const isReleased = async c => {
    if (releasedCache.has(c)) return releasedCache.get(c)
    const rows = await pageExact(db, 'study_item_bank', 'id,verified,archived', q => q.eq('cohort', c), `cohort ${c}`)
    const ok = rows.length > 0 && rows.every(r => r.verified || r.archived) && rows.some(r => r.verified)
    releasedCache.set(c, ok); return ok
  }
  const stale = rv.filter(r => r.item_sha !== satBy.get(r.item_id).content_sha).length
  console.log(`${runId}: BLIND-ONLY run, ${rv.length} rows over ${cohorts.length} cohort(s); his verdicts are not read (owner rule 2026-10-27)`)
  const plans = []
  for (const c of cohorts) {
    const cfg = S.cohorts?.[c] ?? null
    let cleared = new Set(), dropped = new Set(), staged = []
    const released = new Map()
    if (cfg && !cfg.blocker) {
      for (const g of cfg.grades ?? []) if (!existsSync(here + g)) throw new RefusalError(`${c}: with-source grade file ${g} is missing`)
      const all = JSON.parse(readFileSync(here + cfg.cleared, 'utf8'))
      if (!Array.isArray(all)) throw new RefusalError(`${c}: ${cfg.cleared} is not a list of ids`)
      cleared = new Set(all.filter(q => !cfg.qidPrefix || q.startsWith(cfg.qidPrefix)))
      if (!cleared.size) throw new RefusalError(`${c}: ${cfg.cleared} clears no id${cfg.qidPrefix ? ` under ${cfg.qidPrefix}` : ''}`)
      for (const d of cfg.dropped ?? []) for (const q of idsUnder(JSON.parse(readFileSync(here + d.file, 'utf8')), d.keys)) dropped.add(q)
      staged = (await pageExact(db, 'study_item_bank', 'id,cohort,verified,archived,verify_meta', q => q.eq('cohort', c), `cohort ${c}`)).map(r => ({ id: r.id, verified: r.verified, archived: r.archived, qid: qidOf(cfg, r), verify_meta: r.verify_meta }))
      for (const a of cfg.after ?? []) released.set(a, await isReleased(a))
    }
    const runRows = rv.filter(r => satBy.get(r.item_id).cohort === c)
    const p = planScienceRelease({ cohort: c, cfg, staged, cleared, dropped, runRows, released })
    plans.push({ c, cfg, p, staged })
    const b = p.blind
    console.log(`  ${c.padEnd(24)} blind ${b.hits}/${b.n}${b.pct != null ? ` = ${b.pct.toFixed(1)}% vs control ${b.controlPct.toFixed(1)}% (${(b.pct - b.controlPct >= 0 ? '+' : '')}${(b.pct - b.controlPct).toFixed(1)})` : ''}  reviewer_kind ${JSON.stringify(p.kinds)}`)
    if (cfg?.blindBar) console.log(`    blind bar ${cfg.blindBar.maxPct}% (${cfg.blindBar.basis})`)
    else if (cfg && !cfg.blocker) console.log(`    no pre-registered blind bar: ${cfg.blindBarNote ?? 'reported only'}; his science blind picks are reported, not relied on, until the owner confirms they were unassisted`)
    for (const m of p.refusals) console.log(`    REFUSED: ${m}`)
    if (p.hold) console.log(`    HOLD: ${p.hold}`)
    if (!p.refusals.length && !p.hold) console.log(`    release ${p.release.length} staged row(s) (with-source cleared ${cleared.size}, dropped ${dropped.size})`)
  }
  if (stale) console.log(`  note: ${stale} blind row(s) were sat on an item edited since (reported; the blind score above includes them)`)
  const refused = plans.filter(x => x.p.refusals.length)
  if (refused.length) throw new RefusalError(`${refused.length} cohort(s) cannot be released by the science path; nothing written`)
  if (!APPLY) { console.log('DRY RUN: pass --apply to write.'); return }
  const today = new Date().toISOString().slice(0, 10)
  let n = 0
  for (const { c, p, staged } of plans) {
    if (p.hold) continue
    const b = p.blind
    const basis = `science rule 2026-10-27: with-source agent grading (science-release.json ${c}) + closed blind-only run ${runId}: blind ${b.hits}/${b.n} vs control ${b.controlPct?.toFixed(1)}%`
    for (const id of p.release) {
      const row = staged.find(r => r.id === id)
      const meta = { ...(row.verify_meta ?? {}), blind_only_run: runId, released_at: today, release_basis: basis }
      const { error } = await db.from('study_item_bank').update({ verified: true, verify_meta: meta }).eq('id', id).eq('verified', false).eq('archived', false)
      if (error) throw new RefusalError(`write failed on ${id}: ${error.message}`)
      n++
    }
  }
  console.log(`written: ${n} released`)
}

