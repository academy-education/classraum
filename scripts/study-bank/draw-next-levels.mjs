/**
 * draw-next-levels.mjs — draw-next.mjs's level-aware mode (Amendment 3). Used only when autonomy-state.json exists
 * (or AUTONOMY_STATE_FILE points at one) and --old-rule is not passed.
 *
 *   order   strata whose section is under 5 live tests first, fewest first (depth-snapshot.json); then queue order
 *   shape   from the batch's METHOD state: bridge spot (first batch after a method change, whatever the level),
 *           L0 full sitting capped at 36, L1 a 12-item spot (fewest whole passages/sets reaching 12), L2 one pooled
 *           12-item run across up to 6 batches of the stratum's current method
 *   drawn   a batch that already has a run keeps the rule it was drawn under (Amendment 1's own transition rule)
 *   blind   act/science and map/science (owner rule 2026-10-27): one BLIND-ONLY pass over whole unserved passages,
 *           capped at 36, run id marked '-blindonly-' (no reveal, no verdict); never pooled, adds no level evidence
 *   held    a cohort whose every queue entry is at its `upTo` is skipped (until 2026-10-27 this mode ignored upTo)
 *
 * Dry by default: prints the next 10 runs and the items he would answer for the whole queue under this rule and
 * under the old one. Refuses if the state file is older than the latest review (re-run autonomy-state.mjs).
 */
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import {
  RefusalError, stratumOf, sectionOf, sectionDepth, simulateQueue, oldRuleItems, seededOrder, PARAMS,
  commandForRun, cohortHeld, isBlindOnlySection,
} from './autonomy-core.mjs'
import { client, pageExact, here } from './autonomy-io.mjs'

export async function levelAwareDraw({ Q, stateFile, commit }) {
  const state = JSON.parse(readFileSync(stateFile, 'utf8'))
  const snapshot = JSON.parse(readFileSync(here + 'depth-snapshot.json', 'utf8'))
  const db = client()

  const reviews = await pageExact(db, 'study_item_reviews', 'id,item_id,run_id,blind_at,reviewed_at', q => q.eq('reviewer_id', Q.reviewer), 'his reviews')
  const latest = reviews.map(r => r.blind_at || r.reviewed_at).filter(Boolean).sort().pop()
  if (reviews.length !== state.counts.reviews || (latest && latest > state.latest_review_at)) throw new RefusalError(`autonomy-state.json (${state.generated_at}) is older than the review table (${reviews.length} rows vs ${state.counts.reviews}; latest ${latest}). Re-run autonomy-state.mjs.`)
  const open = reviews.find(r => !r.blind_at)
  if (open && !process.argv.includes('--ignore-open')) { console.log(`open run: ${open.run_id} — nothing to draw until it closes`); return 0 }
  if (open) console.log(`(open run ${open.run_id} ignored for this dry run)`)
  const servedBy = new Map(); for (const r of reviews) { if (!servedBy.has(r.item_id)) servedBy.set(r.item_id, new Set()); servedBy.get(r.item_id).add(r.run_id) }

  // one batch per cohort, in first-queue-appearance order
  const entriesBy = new Map()
  for (const e of Q.queue) { if (!entriesBy.has(e.cohort)) entriesBy.set(e.cohort, []); entriesBy.get(e.cohort).push(e) }
  const batches = []
  let oldTotal = 0
  const oldRuns = []
  for (const [idx, [cohort, entries]] of [...entriesBy].entries()) {
    const rows = await pageExact(db, 'study_item_bank', 'id,family,section,task,verified,archived,passage_group_id,pgid:item->>passageGroupId', q => q.eq('cohort', cohort), `cohort ${cohort}`)
    if (!rows.length) throw new RefusalError(`queue names cohort ${cohort}, which has no rows`)
    const strata = new Set(rows.map(r => stratumOf(r.family, r.section, r.task)))
    if (strata.size !== 1) throw new RefusalError(`cohort ${cohort} spans strata ${[...strata].join(', ')}`)
    const stratum = [...strata][0]
    const method = state.cohortMethod[cohort]
    if (!method) throw new RefusalError(`autonomy-state.json has no method for ${cohort}`)
    const tool = entries[0].tool
    const runsOf = rs => new Set(rs.flatMap(r => [...(servedBy.get(r.id) ?? [])])).size
    const waitingRows = rows.filter(r => !r.verified && !r.archived && !servedBy.has(r.id))
    // old rule, entry by entry, as draw-next.mjs would walk them (state per cohort|group, consumed as it goes)
    const oldState = new Map()
    let old = { runs: 0, items: 0 }
    for (const e of entries) {
      const k = cohort + '|' + (e.group ?? '')
      if (!oldState.has(k)) { const rs = e.group ? rows.filter(r => r.passage_group_id === e.group) : rows; oldState.set(k, { waiting: rs.filter(r => !r.verified && !r.archived && !servedBy.has(r.id)).length, runs: runsOf(rs) }) }
      const s = oldState.get(k)
      const o = oldRuleItems(e, s)
      s.waiting -= o.items; s.runs += o.runs
      old = { runs: old.runs + o.runs, items: old.items + o.items }
      if (o.items) oldRuns.push({ cohort, items: o.items, runs: o.runs })
    }
    oldTotal += old.items
    // whole groups still fully waiting, the queue's pre-chosen spot passage first, then a seeded order
    const gid = r => (tool === 'sets' ? r.pgid : r.passage_group_id)
    const gm = new Map()
    for (const r of rows.filter(r => !r.verified && !r.archived)) { const g = gid(r); if (!g) continue; if (!gm.has(g)) gm.set(g, { all: 0, waiting: 0 }); gm.get(g).all++; if (!servedBy.has(r.id)) gm.get(g).waiting++ }
    const whole = [...gm].filter(([, v]) => v.waiting === v.all && v.all > 0).map(([id, v]) => ({ id, size: v.all }))
    const pre = entries.find(e => e.group)?.group
    const order = seededOrder(whole.map(g => g.id).filter(g => g !== pre), `autonomy-spot:${cohort}`)
    const groups = [...(pre && whole.some(g => g.id === pre) ? [pre] : []), ...order].map(id => whole.find(g => g.id === id))
    /* Blind-only sections (act/science, map/science) are never "already drawn": each run is one blind pass over
     * whole passages nobody has served yet, so an earlier run (e.g. a verdict run from before the 2026-10-27 rule)
     * only removes its items from the pool. `held`: every queue entry of the cohort is at its upTo. */
    const blindOnly = isBlindOnlySection(stratum)
    batches.push({ idx, cohort, stratum, method, tool, entry: entries[0], family: entries[0].family ?? rows[0].family, waiting: waitingRows.length, groups, drawn: !blindOnly && runsOf(rows) > 0, held: cohortHeld(entries, runsOf(rows)), old, runsSoFar: runsOf(rows) })
  }

  const strataChains = new Map(state.strata.map(s => [s.stratum, s.chain.map(c => ({ method: c.method, units: c.units }))]))
  for (const b of batches) if (!strataChains.has(b.stratum)) throw new RefusalError(`autonomy-state.json has no stratum ${b.stratum}`)
  const depth = new Map(); for (const b of batches) { const sec = sectionOf(b.stratum); depth.set(sec, sectionDepth(snapshot, sec)) }
  const sim = simulateQueue({ strata: strataChains, batches, depth, prioritySections: Q.prioritySections ?? [] })

  const date = new Date().toISOString().slice(0, 10)
  const runCount = new Map(batches.map(b => [b.cohort, b.runsSoFar]))
  const commandFor = run => commandForRun(run, { batches, runCount, reviewer: Q.reviewer, date })

  console.log(`level-aware queue (Amendment 3; state ${state.generated_at}; depth snapshot ${snapshot.measured})`)
  const floorList = [...depth].filter(([, d]) => d != null && d < PARAMS.floor).sort((a, b) => a[1] - b[1]).map(([s, d]) => `${s} ${d}`)
  if (Q.prioritySections?.length) console.log(`owner priority (cofounder-queue.json prioritySections): ${Q.prioritySections.join(', ')}`)
  console.log(`floor priority (under ${PARAMS.floor} live tests): ${floorList.join(', ') || 'none'}\n`)
  const SHOW = process.argv.includes('--all') ? sim.runs.length : 10
  console.log(`next ${SHOW} runs (simulated as clean; a flag re-plans):`)
  const cmds = []
  for (const [i, r] of sim.runs.slice(0, SHOW).entries()) {
    const cmd = commandFor(r); cmds.push(cmd)
    const what = r.batches.map(x => `${x.cohort} ${x.items}${x.groups?.length ? ` [${x.groups.map(g => g.split(/[-:]/).pop().slice(0, 8)).join(',')}]` : ''}`).join(' + ')
    console.log(`${String(i + 1).padStart(2)}. ${(r.blindOnly ? 'blind' : r.shape).padEnd(8)} ${String(r.items).padStart(3)} items  ${r.stratum.padEnd(32)} ${r.level != null ? `L${r.level}` : '  '}  ${what}`)
    console.log(`      ${cmd}`)
  }
  if (sim.held.length) console.log(`held (every queue entry at its upTo): ${sim.held.join(', ')}`)
  const byShape = {}; for (const r of sim.runs) { const k = r.blindOnly ? 'blind-only' : r.shape; byShape[k] = (byShape[k] ?? 0) + r.items }
  console.log(`\nwhole current queue: ${sim.total} items in ${sim.runs.length} runs under Amendment 3 (${Object.entries(byShape).map(([k, v]) => `${k} ${v}`).join(', ')})`)
  console.log(`                     ${oldTotal} items in ${oldRuns.reduce((a, r) => a + r.runs, 0)} runs under the current rule (Amendment 1 queue entries, no flags)`)
  console.log('both assume every run comes back clean; each flag adds a full sitting of that batch under either rule.')
  if (!commit) { console.log('DRY RUN: pass --commit to draw run 1.'); return 0 }
  if (open) throw new RefusalError('--ignore-open is for dry runs only')
  const first = sim.runs[0]
  if (!first || first.shape === 'old-rule') throw new RefusalError('run 1 is an already-drawn batch: use draw-next.mjs --old-rule --commit')
  console.log(`drawing run 1: ${cmds[0]}`)
  const m = cmds[0].match(/^((?:[A-Z_]+=\S+\s)*)node scripts\/study-bank\/(\S+)\s(.*)$/)
  if (!m) throw new RefusalError('could not parse the command')
  const env = Object.fromEntries((m[1].trim() ? m[1].trim().split(/\s+/) : []).map(kv => [kv.slice(0, kv.indexOf('=')), kv.slice(kv.indexOf('=') + 1)]))
  const args = m[3].match(/'[^']*'|"[^"]*"|\S+/g).map(a => a.replace(/^['"]|['"]$/g, ''))
  const r = spawnSync('node', [here + m[2], ...args], { cwd: here + '../..', env: { ...process.env, ...env }, stdio: 'inherit' })
  return r.status ?? 1
}
