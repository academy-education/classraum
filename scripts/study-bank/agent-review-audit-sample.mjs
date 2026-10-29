#!/usr/bin/env node
/**
 * agent-review-audit-sample.mjs — picks the pre-release audit sample for the SSAT/MAP agent review
 * (AGENT-REVIEW-SSAT-MAP.prereg.md, "Release after A1"). Read-only against the bank.
 *
 *   node scripts/study-bank/agent-review-audit-sample.mjs [--write] [--wave2]
 *
 * --wave2 samples agent-review/results-wave2 (AGENT-REVIEW-WAVE2.prereg.md) into audit-sample-wave2.json under its own
 * run id and seed.
 *
 * From every cohort with cleared items in agent-review/results/, it picks a seeded sample of CLEARED items the
 * co-founder has never been served: SSAT Reading 2 items from one passage per cohort, MAP Language 2 per cohort
 * (1 where the cohort cleared fewer than 20), every other cohort 1. Passage items are drawn from one passage so he
 * reads the passage once. Prints the composition and the exact draw command; --write saves
 * agent-review/audit-sample.json (the DRAW_IDS_FILE allowlist plus the plan). The seed is fixed, so a re-run picks
 * the same items unless the reviewer has since seen one.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
import { auditPlan, AUDIT_CAP, seedOf } from './agent-review-core.mjs'

const HERE = new URL('.', import.meta.url).pathname
const WAVE2 = process.argv.includes('--wave2')
const RESULTS = join(HERE, WAVE2 ? 'agent-review/results-wave2' : 'agent-review/results')
const OUT = join(HERE, WAVE2 ? 'agent-review/audit-sample-wave2.json' : 'agent-review/audit-sample.json')
const REVIEWER = '6ca6edaf-4044-4eed-84e0-137ebd79a81d'
const RUN_ID = WAVE2 ? 'agentreview-audit2-cofounder-2026-10-30' : 'agentreview-audit-cofounder-2026-10-29'
const SEED = WAVE2 ? 'agentreview-audit-wave2-2026-10-30' : 'agentreview-audit-2026-10-29'
const refuse = m => { console.error('REFUSING: ' + m); process.exit(2) }

const env = Object.fromEntries(readFileSync(join(HERE, '../../.env.local'), 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const cohorts = readdirSync(RESULTS).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(join(RESULTS, f), 'utf8')))
const cleared = cohorts.filter(c => c.cleared.length)
if (!cleared.length) refuse('no cohort has cleared items')
const ids = cleared.flatMap(c => c.cleared)

const rows = []
for (let i = 0; i < ids.length; i += 200) {
  const { data, error } = await db.from('study_item_bank').select('id, family, section, cohort, passage_group_id, verified, archived').in('id', ids.slice(i, i + 200))
  if (error) refuse(error.message)
  rows.push(...data)
}
if (rows.length !== ids.length) refuse(`read ${rows.length} of ${ids.length} cleared rows`)
if (rows.some(r => r.verified || r.archived)) refuse('a cleared row is already verified or archived; re-score before sampling')
const seen = new Set()
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_reviews').select('item_id').eq('reviewer_id', REVIEWER).range(f, f + 999)
  if (error) refuse(error.message)
  for (const r of data) seen.add(r.item_id)
  if (data.length < 1000) break
}

const byCohort = Object.groupBy(rows.filter(r => !seen.has(r.id)), r => r.cohort)
const plan = auditPlan(cleared.map(c => ({ cohort: c.cohort, cleared: c.cleared.length, family: byCohort[c.cohort]?.[0]?.family, section: byCohort[c.cohort]?.[0]?.section })))
const picked = []
for (const p of plan) {
  const pool = (byCohort[p.cohort] || []).sort((a, b) => a.id.localeCompare(b.id))
  const rand = rng(seedOf(`${SEED}|${p.cohort}`))
  let take
  if (pool.some(r => r.passage_group_id)) {
    const groups = Object.groupBy(pool, r => r.passage_group_id ?? `item:${r.id}`)
    const g = shuffleWith(Object.keys(groups).sort().filter(k => groups[k].length >= p.n), rand)[0]
    if (!g) refuse(`${p.cohort}: no unseen passage has ${p.n} cleared items`)
    take = shuffleWith([...groups[g]], rand).slice(0, p.n)
  } else take = shuffleWith([...pool], rand).slice(0, p.n)
  if (take.length < p.n) refuse(`${p.cohort}: ${take.length} unseen cleared items, need ${p.n}`)
  picked.push({ ...p, ids: take.map(r => r.id), group: take[0].passage_group_id ?? null })
}
const total = picked.reduce((s, p) => s + p.n, 0)
if (total > AUDIT_CAP) refuse(`sample is ${total}, over the cap of ${AUDIT_CAP}`)

const drawCohort = picked.map(p => `${p.cohort}:${p.n}`).join(',')
const command = `DRAW_IDS_FILE=scripts/study-bank/agent-review/${WAVE2 ? 'audit-sample-wave2' : 'audit-sample'}.ids.json DRAW_COHORT='${drawCohort}' node scripts/study-bank/draw-review-run.mjs '*' ${total} ${REVIEWER} ${RUN_ID}`
console.log(`audit sample: ${total} items over ${picked.length} cohorts (cap ${AUDIT_CAP}); reviewer has seen ${seen.size} items, all excluded`)
for (const p of picked) console.log(`  ${p.cohort.padEnd(30)} ${p.n}  of ${String(p.cleared).padStart(3)} cleared${p.group ? `  passage ${p.group}` : ''}`)
console.log(`\ndraw command (only once the open run has closed):\n  ${command}`)
if (process.argv.includes('--write')) {
  writeFileSync(OUT, JSON.stringify({ runId: RUN_ID, reviewer: REVIEWER, seed: SEED, total, command, cohorts: picked }, null, 1) + '\n')
  writeFileSync(OUT.replace(/\.json$/, '.ids.json'), JSON.stringify(picked.flatMap(p => p.ids), null, 1) + '\n')
  console.log(`wrote ${OUT} and its .ids.json`)
}
