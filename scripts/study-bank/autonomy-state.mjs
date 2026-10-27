#!/usr/bin/env node
/**
 * autonomy-state.mjs — the trust-level tracker of Amendment 3 (COFOUNDER-GRADER-2026-10-22.PREREG.md,
 * AMENDMENT-3-TRUST-LEVELS.md). Read-only: no DB writes, no queue change.
 *
 * For every stratum (family/section/task) it prints the current method, the items he has reviewed under it, the
 * misses, the Clopper-Pearson 90% upper bound U, the level, and the next promotion bar with the clean items needed;
 * then writes autonomy-state.json (the input of draw-next.mjs's level-aware mode).
 *
 * It EXITS 2, writing nothing, when:
 *   - the notes ledger (cofounder-notes.json, or AUTONOMY_NOTES_FILE) is missing — it never falls back to verdicts
 *   - any note or flag of his is unclassified, or a ledger entry does not join to its review
 *   - any read is truncated (rows read != count:'exact') or a join comes back empty
 *   - a cohort has no method entry (autonomy-methods.json or verify_meta.method_id); 'unknown' is legal
 *   - the stale computation (item_sha != content_sha) disagrees with study_item_reviews_fresh
 * Stale rows with no defect are excluded and counted, never a pass; a stale row carrying a miss still counts.
 *
 *   node scripts/study-bank/autonomy-state.mjs [--json-only]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import {
  PARAMS, RefusalError, joinLedger, buildEvidence, methodKeyOf, stratumOf, stratumState, sectionOf, sectionDepth,
  floorRank, capFor, shapeFor,
} from './autonomy-core.mjs'
import { client, pageExact, rowsByIds, refuseAndExit, here } from './autonomy-io.mjs'

const NOTES = process.env.AUTONOMY_NOTES_FILE || here + 'cofounder-notes.json'
const OUT = process.env.AUTONOMY_STATE_FILE || here + 'autonomy-state.json'

try {
  if (!existsSync(NOTES)) throw new RefusalError(`notes ledger ${NOTES} does not exist. Promotion is not computed from verdicts alone (Amendment 3).`)
  const rawLedger = JSON.parse(readFileSync(NOTES, 'utf8'))
  const ledgerEntries = Array.isArray(rawLedger) ? rawLedger : rawLedger.entries
  if (!Array.isArray(ledgerEntries)) throw new RefusalError(`${NOTES}: expected an array or { entries: [...] }`)
  const Q = JSON.parse(readFileSync(here + 'cofounder-queue.json', 'utf8'))
  const M = JSON.parse(readFileSync(here + 'autonomy-methods.json', 'utf8'))
  const snapshot = JSON.parse(readFileSync(here + 'depth-snapshot.json', 'utf8'))
  const warnings = []

  // grader-brief drift: a changed brief file is a new method for the NEXT batch, which must declare it
  for (const [ver, files] of Object.entries(M.graderBriefs)) if (!ver.startsWith('_')) for (const [f, md5] of Object.entries(files)) {
    const now = createHash('md5').update(readFileSync(here + f)).digest('hex')
    if (now !== md5) warnings.push(`grader brief ${f} changed since ${ver} (${md5.slice(0, 8)} -> ${now.slice(0, 8)}): the next batch graded with it is a NEW method and must declare a new method_id`)
  }

  // the production grader named by the feedback loop must be a declared version, or new batches cannot say which they used
  if (existsSync(here + 'cofounder-loop-state.json')) {
    const loop = JSON.parse(readFileSync(here + 'cofounder-loop-state.json', 'utf8'))
    for (const f of loop.validated_files ?? []) {
      const now = createHash('md5').update(readFileSync(here + f)).digest('hex')
      const ver = Object.entries(M.graderBriefs).find(([v, fs]) => !v.startsWith('_') && fs[f] === now)?.[0]
      if (!ver) warnings.push(`production grader ${f} (${loop.validated_version}, md5 ${now.slice(0, 8)}) is not a declared grader version in autonomy-methods.json: declare it before staging a batch screened with it`)
    }
  }

  const db = client()
  const reviews = await pageExact(db, 'study_item_reviews', 'id,item_id,run_id,verdict,note,item_sha,reviewer_kind,blind_at,reviewed_at', q => q.eq('reviewer_id', Q.reviewer), 'his reviews')
  if (!reviews.length) throw new RefusalError('no reviews read for the reviewer (empty join)')
  const fresh = await pageExact(db, 'study_item_reviews_fresh', 'id', q => q.eq('reviewer_id', Q.reviewer), 'his fresh reviews')
  const freshIds = new Set(fresh.map(r => r.id))
  const reviewed = await rowsByIds(db, 'study_item_bank', 'id,family,section,task,cohort,content_sha,created_at,verify_meta', reviews.map(r => r.item_id), 'reviewed bank rows')
  const queueCohorts = [...new Set(Q.queue.map(e => e.cohort))]
  const queued = []
  for (const c of queueCohorts) {
    const rows = await pageExact(db, 'study_item_bank', 'id,family,section,task,cohort,content_sha,created_at,verify_meta,verified,archived,passage_group_id', q => q.eq('cohort', c), `cohort ${c}`)
    if (!rows.length) throw new RefusalError(`queue names cohort ${c}, which has no bank rows (empty join)`)
    queued.push(...rows)
  }

  // method per cohort (bank declaration must be uniform and agree with the table)
  const declared = new Map()
  for (const r of [...reviewed, ...queued]) {
    const d = r.verify_meta?.method_id ?? null
    const k = r.cohort
    if (!declared.has(k)) declared.set(k, new Set())
    declared.get(k).add(d)
  }
  const methodOfCohort = new Map()
  for (const [c, ds] of declared) {
    const vals = [...ds]
    if (vals.length > 1 && vals.some(v => v != null)) throw new RefusalError(`cohort ${c}: verify_meta.method_id is not uniform (${vals.map(String).join(', ')})`)
    methodOfCohort.set(c, methodKeyOf(c, M.cohorts, vals[0] ?? null))
  }
  const methodOf = c => { const m = methodOfCohort.get(c); if (!m) throw new RefusalError(`cohort ${c}: no method`); return m }

  // model_assisted rows are not sittings: their ledger entries (if any) are ignored, not joined
  const nonHuman = new Set(reviews.filter(r => r.reviewer_kind !== 'human').map(r => r.id))
  const { byReview, errors: ledgerErrors } = joinLedger(reviews.filter(r => r.reviewer_kind === 'human'), ledgerEntries.filter(e => !nonHuman.has(e.review_id)))
  if (ledgerErrors.length) throw new RefusalError(`${ledgerErrors.length} ledger problem(s):\n  ` + ledgerErrors.slice(0, 12).join('\n  ') + (ledgerErrors.length > 12 ? `\n  ... and ${ledgerErrors.length - 12} more` : ''))

  const items = new Map([...reviewed, ...queued].map(r => [r.id, r]))
  const screenKept = new Set(M.screenFlaggedKept.ids)
  const ev = buildEvidence({ reviews, items, ledger: byReview, methodOf, screenFlaggedKept: screenKept, freshIds })
  if (ev.errors.length) throw new RefusalError(`${ev.errors.length} evidence problem(s):\n  ` + ev.errors.slice(0, 12).join('\n  '))
  if (ev.counts.stale !== reviews.filter(r => r.reviewer_kind === 'human' && r.verdict != null && !freshIds.has(r.id)).length) throw new RefusalError('stale count disagrees with study_item_reviews_fresh')

  // strata and their method chains (authoring order = earliest created_at of the method's cohorts in the stratum)
  const firstSeen = new Map() // stratum -> method -> earliest created_at
  const cohortsOf = new Map() // stratum -> method -> Set(cohort)
  const note = (s, m, c, t) => {
    if (!firstSeen.has(s)) { firstSeen.set(s, new Map()); cohortsOf.set(s, new Map()) }
    const f = firstSeen.get(s); if (!f.has(m) || t < f.get(m)) f.set(m, t)
    const cs = cohortsOf.get(s); if (!cs.has(m)) cs.set(m, new Set()); cs.get(m).add(c)
  }
  const reviewedIds = new Set(reviews.filter(r => r.reviewer_kind === 'human' && r.verdict != null).map(r => r.item_id))
  for (const r of [...reviewed.filter(r => reviewedIds.has(r.id)), ...queued]) note(stratumOf(r.family, r.section, r.task), methodOf(r.cohort), r.cohort, r.created_at)

  const queuedStrata = new Set(queued.map(r => stratumOf(r.family, r.section, r.task)))
  const strata = []
  for (const [s, f] of firstSeen) {
    const order = [...f.entries()].sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : a[0].localeCompare(b[0]))).map(([m]) => m)
    const chain = order.map(m => ({ method: m, units: ev.units.get(s)?.get(m) ?? [] }))
    const st = stratumState(s, chain)
    const depth = sectionDepth(snapshot, sectionOf(s))
    strata.push({ ...st, depth, floorRank: floorRank(depth), inQueue: queuedStrata.has(s), chain: chain.map((c, i) => ({ method: c.method, cohorts: [...cohortsOf.get(s).get(c.method)].sort(), firstSeen: f.get(c.method), units: c.units.map(u => ({ key: u.key, at: u.at, cohorts: u.cohorts, k: u.items.length, missIdx: u.items.flatMap((it, j) => (it.miss ? [j] : [])) })), state: st.methods[i] })) })
  }
  strata.sort((a, b) => (b.inQueue - a.inQueue) || (a.floorRank - b.floorRank) || a.stratum.localeCompare(b.stratum))

  // ---- print
  const pct = u => (u >= 1 ? '  —  ' : (100 * u).toFixed(1).padStart(5) + '%')
  console.log(`autonomy-state ${new Date().toISOString()}  (Amendment 3: L0->L1 at U < ${100 * PARAMS.promote[0]}%, L1->L2 at U < ${100 * PARAMS.promote[1]}%, CP one-sided ${100 * PARAMS.conf}%, prior x${PARAMS.priorWeight} after a clean ${PARAMS.bridgeSize}-item bridge, cap L${PARAMS.maxLevel}, never-autonomous cap L${PARAMS.neverAutonomousCap})`)
  const c = ev.counts
  console.log(`reviews ${c.reviews} read (= count exact) | ${freshIds.size} fresh | model_assisted ${c.model_assisted} excluded | blind-only ${c.blind_only} excluded | unanswered ${c.unanswered} | stale ${c.stale}: ${c.stale_excluded} excluded (no defect), ${c.stale_miss_counted} counted as misses | screen-flagged-kept ${c.screen_kept_excluded} excluded | duplicates merged ${c.duplicate_merged}`)
  console.log(`evidence items ${c.evidence}, misses ${c.misses} (${c.verdict_misses} by verdict, ${c.note_misses} by note only) | ledger ${ledgerEntries.length} entries, ${byReview.size} joined | bank rows read: ${reviewed.length} reviewed, ${queued.length} in ${queueCohorts.length} queued cohorts`)
  console.log(`depth snapshot measured ${snapshot.measured}\n`)
  const H = `${'stratum'.padEnd(34)} ${'depth'.padStart(5)} ${'current method'.padEnd(42)} ${'n'.padStart(4)} ${'x'.padStart(3)} ${'U90'.padStart(6)} lvl cap bridge  next`
  console.log(H); console.log('-'.repeat(H.length + 18))
  for (const s of strata) {
    const cur = s.current
    const nx = cur.capped ? `capped at L${s.cap}` : `L${cur.next.to} at U < ${100 * cur.next.bar}%: ${cur.next.itemsNeeded == null ? 'unreachable' : cur.next.itemsNeeded === 0 ? 'the next clean run' : `${cur.next.itemsNeeded} clean item(s)`}`
    const nn = `${cur.nCur}${cur.w ? `+${(cur.w * cur.prior.n).toFixed(1)}` : ''}`
    console.log(`${(s.stratum + (s.inQueue ? '' : ' (not queued)')).padEnd(34)} ${String(s.depth ?? '?').padStart(5)} ${cur.method.slice(0, 42).padEnd(42)} ${nn.padStart(4)} ${String(cur.xCur).padStart(3)} ${pct(cur.U)}  L${cur.level}  L${s.cap} ${cur.bridge.padEnd(7)} ${nx}   [n=${cur.n} x=${cur.x}; next run: ${shapeFor(cur)}]`)
  }
  console.log('\nmethod chains of the queued strata (authoring order; n/x = that method\'s own items; level at the end of its evidence):')
  for (const s of strata.filter(s => s.inQueue)) {
    console.log(`  ${s.stratum}`)
    for (const c of s.chain) {
      const st = c.state
      const cs = c.cohorts.length > 3 ? `${c.cohorts[0]} .. ${c.cohorts[c.cohorts.length - 1]} (${c.cohorts.length})` : c.cohorts.join(', ')
      console.log(`    ${c.method.slice(0, 44).padEnd(44)} n ${String(st.nCur).padStart(3)} x ${String(st.xCur).padStart(2)}  L${st.level} bridge ${st.bridge.padEnd(7)} first batch: ${st.firstShape.padEnd(6)} ${cs}`)
    }
  }
  for (const w of warnings) console.log('WARNING: ' + w)

  const state = {
    generated_at: new Date().toISOString(), params: PARAMS, notes_file: NOTES.replace(here, ''), ledger_entries: ledgerEntries.length,
    latest_review_at: reviews.map(r => r.blind_at || r.reviewed_at).filter(Boolean).sort().pop(), counts: c, warnings,
    depth_measured: snapshot.measured,
    cohortMethod: Object.fromEntries([...methodOfCohort].sort()),
    strata: strata.map(s => ({ stratum: s.stratum, depth: s.depth, cap: s.cap, inQueue: s.inQueue, current: s.current, chain: s.chain })),
  }
  writeFileSync(OUT, JSON.stringify(state, null, 1) + '\n')
  console.log(`\nwrote ${OUT.replace(here, 'scripts/study-bank/')} (${strata.length} strata)`)
} catch (e) { refuseAndExit(e) }
