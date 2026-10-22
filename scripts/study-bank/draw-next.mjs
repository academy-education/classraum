#!/usr/bin/env node
/**
 * draw-next.mjs [--commit]
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
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const COMMIT = process.argv.includes('--commit')
const here = new URL('.', import.meta.url).pathname
const Q = JSON.parse(readFileSync(process.env.QUEUE_FILE || here + 'cofounder-queue.json', 'utf8')) // QUEUE_FILE: test queues
const refuse = m => { console.error('REFUSING: ' + m); process.exit(2) }
const env = Object.fromEntries(readFileSync(here + '../../.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: open } = await db.from('study_item_reviews').select('run_id').eq('reviewer_id', Q.reviewer).is('blind_at', null).limit(1).maybeSingle()
// --ignore-open shows what would come next while a run is open; it is refused with --commit.
if (process.argv.includes('--ignore-open') && COMMIT) refuse('--ignore-open is for dry runs only')
if (open && !process.argv.includes('--ignore-open')) { console.log(`open run: ${open.run_id} — nothing to draw until it closes`); process.exit(0) }
if (open) console.log(`(open run ${open.run_id} ignored for this dry run)`)
const state = new Map()
async function cohortState(cohort) {
  if (state.has(cohort)) return state.get(cohort)
  const { data: rows, error } = await db.from('study_item_bank').select('id,verified,archived').eq('cohort', cohort)
  if (error) refuse(error.message)
  if (!rows?.length) refuse(`queue names cohort ${cohort}, which has no rows`)
  const ids = rows.map(r => r.id); const rv = []
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error: e } = await db.from('study_item_reviews').select('item_id,run_id').eq('reviewer_id', Q.reviewer).in('item_id', ids.slice(i, i + 200))
    if (e) refuse(e.message); rv.push(...data)
  }
  const served = new Set(rv.map(r => r.item_id))
  const s = { rows: rows.length, waiting: rows.filter(r => !r.verified && !r.archived && !served.has(r.id)).length, runs: new Set(rv.map(r => r.run_id)).size }
  state.set(cohort, s); return s
}
let next = null
for (const [i, e] of Q.queue.entries()) {
  const s = await cohortState(e.cohort)
  const done = s.waiting === 0 || (e.upTo != null && s.runs >= e.upTo)
  console.log(`${String(i + 1).padStart(2)} ${done ? 'done ' : 'NEXT '} ${e.cohort.padEnd(24)} waiting ${String(s.waiting).padStart(3)} / ${s.rows}  runs so far ${s.runs}${e.upTo != null ? ` (entry stops at ${e.upTo})` : ''}`)
  if (!done && !next) next = { e, s }
  if (next) break
}
if (!next) { console.log('queue empty: every listed cohort has been fully served'); process.exit(0) }
const { e, s } = next
const date = new Date().toISOString().slice(0, 10)
const runId = e.runId.replace('{n}', String(s.runs + 1)).replace('{date}', date)
let cmd, args, extra = {}
if (e.tool === 'item') {
  const size = Math.min(e.size, s.waiting)
  cmd = 'draw-review-run.mjs'; args = [e.domain, String(size), Q.reviewer, runId]; extra = { DRAW_COHORT: e.cohort, ...(e.family ? { DRAW_FAMILY: e.family } : {}) }
} else if (e.tool === 'sets') {
  cmd = 'draw-toefl-conv-runs.mjs'; args = [e.cohort, runId, '--commit']
} else refuse(`unknown tool ${e.tool}`)
const shown = `${Object.entries(extra).map(([k, v]) => `${k}=${v}`).join(' ')} node scripts/study-bank/${cmd} ${args.map(a => /\s/.test(a) ? JSON.stringify(a) : a).join(' ')}`.trim()
console.log(`\nnext run: ${runId}\n  ${shown}`)
if (!COMMIT) { console.log('DRY RUN: pass --commit to draw it.'); process.exit(0) }
const r = spawnSync('node', [here + cmd, ...args], { cwd: here + '../..', env: { ...process.env, ...extra }, stdio: 'inherit' })
process.exit(r.status ?? 1)
