#!/usr/bin/env node
/**
 * draw-next.mjs [--commit] [--ignore-open] [--old-rule]
 *
 * Draws the co-founder's NEXT release run from cofounder-queue.json, so a closed run is followed by the right
 * next one without anyone re-deciding the order. Dry run by default: prints the queue state and the exact
 * command it would run. With --commit it runs that command (draw-review-run.mjs for single items,
 * draw-toefl-conv-runs.mjs --commit for whole TOEFL sets). Both drawers refuse while a run is open, and so does
 * this script. It never releases anything; releasing stays a separate, reviewed step.
 *
 * An entry is satisfied when its cohort has no staged (verified=false, archived=false) row the reviewer has not
 * been served, or when the cohort already has `upTo` runs. The final run of a cohort may be short.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { entryRunId } from './autonomy-core.mjs'
const COMMIT = process.argv.includes('--commit')
const here = new URL('.', import.meta.url).pathname
const Q = JSON.parse(readFileSync(process.env.QUEUE_FILE || here + 'cofounder-queue.json', 'utf8')) // QUEUE_FILE: test queues
const refuse = m => { console.error('REFUSING: ' + m); process.exit(2) }
/* A manual draw the owner put first (2026-10-29: the agent-review pre-release audit) runs before anything in the
 * queue. draw-next prints its command and refuses to draw a queue run until Q.nextManualDraw is removed. */
if (Q.nextManualDraw && !process.argv.includes('--skip-manual')) {
  console.log(`NEXT DRAW IS MANUAL (${Q.nextManualDraw.runId}): ${Q.nextManualDraw.note}`)
  console.log(`  ${Q.nextManualDraw.command}`)
  console.log('  remove nextManualDraw from cofounder-queue.json once it is drawn; draw-next will not draw a queue run before then.')
  if (Q.thenManualDraw) console.log(`  after it closes, promote thenManualDraw (${Q.thenManualDraw.runId}) to nextManualDraw.`)
  process.exit(0)
}
/* LEVEL-AWARE MODE (Amendment 3, 2026-10-23): when autonomy-state.json exists (written by autonomy-state.mjs;
 * AUTONOMY_STATE_FILE overrides the path), runs are ordered by the five-test floor and shaped by each batch's trust
 * level — see draw-next-levels.mjs. With no state file, or with --old-rule, everything below runs unchanged. */
const STATE_FILE = process.env.AUTONOMY_STATE_FILE || here + 'autonomy-state.json'
if (existsSync(STATE_FILE) && !process.argv.includes('--old-rule')) {
  if (process.argv.includes('--ignore-open') && COMMIT) refuse('--ignore-open is for dry runs only')
  const { levelAwareDraw } = await import('./draw-next-levels.mjs')
  try { process.exit(await levelAwareDraw({ Q, stateFile: STATE_FILE, commit: COMMIT })) } catch (e) { if (e?.name === 'RefusalError') refuse(e.message); throw e }
}
const env = Object.fromEntries(readFileSync(here + '../../.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: open } = await db.from('study_item_reviews').select('run_id').eq('reviewer_id', Q.reviewer).is('blind_at', null).limit(1).maybeSingle()
// --ignore-open shows what would come next while a run is open; it is refused with --commit.
if (process.argv.includes('--ignore-open') && COMMIT) refuse('--ignore-open is for dry runs only')
if (open && !process.argv.includes('--ignore-open')) { console.log(`open run: ${open.run_id} — nothing to draw until it closes`); process.exit(0) }
if (open) console.log(`(open run ${open.run_id} ignored for this dry run)`)
const state = new Map()
// An entry with `group` (a passage_group_id) is a spot-check: it is satisfied once that one passage is served.
async function cohortState(cohort, group = null) {
  const sk = cohort + '|' + (group ?? '')
  if (state.has(sk)) return state.get(sk)
  let sel = db.from('study_item_bank').select('id,verified,archived').eq('cohort', cohort)
  if (group) sel = sel.eq('passage_group_id', group)
  const { data: rows, error } = await sel
  if (error) refuse(error.message)
  if (!rows?.length) refuse(`queue names cohort ${cohort}${group ? ' group ' + group : ''}, which has no rows`)
  const ids = rows.map(r => r.id); const rv = []
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error: e } = await db.from('study_item_reviews').select('item_id,run_id').eq('reviewer_id', Q.reviewer).in('item_id', ids.slice(i, i + 200))
    if (e) refuse(e.message); rv.push(...data)
  }
  const served = new Set(rv.map(r => r.item_id))
  const s = { rows: rows.length, waiting: rows.filter(r => !r.verified && !r.archived && !served.has(r.id)).length, runs: new Set(rv.map(r => r.run_id)).size }
  state.set(sk, s); return s
}
let next = null
for (const [i, e] of Q.queue.entries()) {
  const s = await cohortState(e.cohort, e.group)
  const done = s.waiting === 0 || (e.upTo != null && s.runs >= e.upTo)
  console.log(`${String(i + 1).padStart(2)} ${done ? 'done ' : 'NEXT '} ${(e.cohort + (e.group ? ' [' + e.group.split('-').pop() + ']' : '')).padEnd(24)} waiting ${String(s.waiting).padStart(3)} / ${s.rows}  runs so far ${s.runs}${e.upTo != null ? ` (entry stops at ${e.upTo})` : ''}`)
  if (!done && !next) next = { e, s }
  if (next) break
}
if (!next) { console.log('queue empty: every listed cohort has been fully served'); process.exit(0) }
const { e, s } = next
const date = new Date().toISOString().slice(0, 10)
// entryRunId marks a blind-only entry's id with '-blindonly-' (science, owner rule 2026-10-27): no reveal, no verdict
const runId = entryRunId(e, s.runs + 1, date)
let cmd, args, extra = {}
if (e.tool === 'item') {
  const size = Math.min(e.size, s.waiting)
  cmd = 'draw-review-run.mjs'; args = [e.domain, String(size), Q.reviewer, runId]; extra = { DRAW_COHORT: e.cohort, ...(e.family ? { DRAW_FAMILY: e.family } : {}), ...(e.group ? { DRAW_GROUP: e.group } : {}) }
} else if (e.tool === 'sets') {
  cmd = 'draw-toefl-conv-runs.mjs'; args = [e.cohort, runId, '--commit']
} else refuse(`unknown tool ${e.tool}`)
const shown = `${Object.entries(extra).map(([k, v]) => `${k}=${v}`).join(' ')} node scripts/study-bank/${cmd} ${args.map(a => /\s/.test(a) ? JSON.stringify(a) : a).join(' ')}`.trim()
console.log(`\nnext run: ${runId}\n  ${shown}`)
if (!COMMIT) { console.log('DRY RUN: pass --commit to draw it.'); process.exit(0) }
const r = spawnSync('node', [here + cmd, ...args], { cwd: here + '../..', env: { ...process.env, ...extra }, stdio: 'inherit' })
process.exit(r.status ?? 1)
