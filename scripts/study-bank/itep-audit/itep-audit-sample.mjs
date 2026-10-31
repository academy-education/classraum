#!/usr/bin/env node
/**
 * itep-audit-sample.mjs — picks the co-founder's pre-release audit sample for iTEP SLATE. Read-only against the bank.
 *
 *   node scripts/study-bank/itep-audit/itep-audit-sample.mjs [--write]
 *
 * Modelled on agent-review-audit-sample.mjs (the SSAT/MAP audit). Population: every unarchived iTEP row in the
 * staged cohorts below (all verified=false; the gates' drops were never inserted, so every row is a gate survivor).
 * Only items the co-founder has never been served are eligible, and a passage is eligible only when ALL its items
 * are unseen and the set is complete (itemsPerGroup from ITEP_PART_QUOTAS), so he reads or hears each unit once.
 *
 * PLAN (fixed before sampling; the seed decides only WHICH items):
 *   Grammar 10   Part 1 completion  v1 1, v2 3, v3 1   Part 2 error identification  v1 1, v2 2, v3 2
 *   Reading 11   one Part 1 text (v1), one Part 2 passage x4 (v1), one Part 3 passage x6 (v2)
 *   Listening 12 one dialogue (v1), one dialogue (v2), one lecture x6 (v2), one conversation x4 (v3)
 * Every staged cohort is touched at least once. Ids are written in sitting order: cohort order as in DRAW_COHORT,
 * Part 1 before Part 2 within a cohort, passage items in authored (created_at) order — draw-review-run.mjs keeps the
 * ids file's order within each cohort.
 *
 * --write saves itep-audit/audit-sample.json (plan + command) and audit-sample.ids.json (the --ids-file allowlist).
 * The seed is fixed, so a re-run picks the same items unless the reviewer has since seen one.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { rng, shuffleWith } from '../seeded-shuffle.mjs'
import { seedOf } from '../agent-review-core.mjs'
import { isLabelledItem } from '../review-deal.mjs'

const HERE = new URL('.', import.meta.url).pathname
const REVIEWER = '6ca6edaf-4044-4eed-84e0-137ebd79a81d'
const RUN_ID = 'itep-audit-cofounder-2026-10-31'
const SEED = 'itep-audit-2026-10-31'
const refuse = m => { console.error('REFUSING: ' + m); process.exit(2) }

const P = {
  g1: 'Part 1: Sentence Completion', g2: 'Part 2: Error Identification',
  r1: 'Part 1: Short Text', r2: 'Part 2: Intermediate Passage', r3: 'Part 3: Advanced Passage',
  l1: 'Part 1: Short Conversations', l2: 'Part 2: Conversation', l3: 'Part 3: Lecture',
}
const PER_GROUP = { [P.r2]: 4, [P.r3]: 6, [P.l2]: 4, [P.l3]: 6 }
// [cohort, domain, units]; a unit is one item (standalone parts) or one whole passage (grouped parts). Sitting order.
const PLAN = [
  ['itep-grammar-v1', P.g1, 1], ['itep-grammar-v1', P.g2, 1],
  ['itep-grammar-v2', P.g1, 3], ['itep-grammar-v2', P.g2, 2],
  ['itep-grammar-v3', P.g1, 1], ['itep-grammar-v3', P.g2, 2],
  ['itep-reading-v1', P.r1, 1], ['itep-reading-v1', P.r2, 1],
  ['itep-reading-v2', P.r3, 1],
  ['itep-listening-v1', P.l1, 1],
  ['itep-listening-v2', P.l1, 1], ['itep-listening-v2', P.l3, 1],
  ['itep-listening-v3', P.l2, 1],
]

const env = Object.fromEntries(readFileSync(join(HERE, '../../../.env.local'), 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const cohorts = [...new Set(PLAN.map(p => p[0]))]
const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id, cohort, domain, family, verified, archived, passage_group_id, created_at, item')
    .in('cohort', cohorts).order('id').range(f, f + 999)
  if (error) refuse(error.message)
  rows.push(...data); if (data.length < 1000) break
}
for (const c of cohorts) if (!rows.some(r => r.cohort === c)) refuse(`cohort ${c} has no rows`)
if (rows.some(r => r.family !== 'itep')) refuse('a planned cohort holds a non-iTEP row')
const live = rows.filter(r => !r.archived)
if (live.some(r => r.verified)) refuse('a planned cohort already has verified rows; re-plan before sampling')
const seen = new Set()
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_reviews').select('item_id').eq('reviewer_id', REVIEWER).range(f, f + 999)
  if (error) refuse(error.message)
  for (const r of data) seen.add(r.item_id)
  if (data.length < 1000) break
}

const picked = []
for (const [cohort, domain, units] of PLAN) {
  const pool = live.filter(r => r.cohort === cohort && r.domain === domain)
  const rand = rng(seedOf(`${SEED}|${cohort}|${domain}`))
  const per = PER_GROUP[domain]
  let take, groups = []
  if (per) {
    const byGroup = Object.groupBy(pool, r => r.passage_group_id ?? `item:${r.id}`)
    const eligible = Object.keys(byGroup).sort().filter(g => !g.startsWith('item:') && byGroup[g].length === per && byGroup[g].every(r => !seen.has(r.id)))
    groups = shuffleWith(eligible, rand).slice(0, units)
    if (groups.length < units) refuse(`${cohort} ${domain}: ${eligible.length} complete unseen passages, need ${units}`)
    take = groups.flatMap(g => [...byGroup[g]].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)))
    if (take.some(r => new Set(byGroup[r.passage_group_id].map(x => x.item.passage)).size !== 1)) refuse(`${cohort}: a passage's items disagree on the passage text`)
  } else {
    const eligible = pool.filter(r => !seen.has(r.id)).sort((a, b) => a.id.localeCompare(b.id))
    take = shuffleWith(eligible, rand).slice(0, units)
    if (take.length < units) refuse(`${cohort} ${domain}: ${eligible.length} unseen, need ${units}`)
  }
  if (domain === P.g2 && !take.every(r => isLabelledItem(r.item))) refuse(`${cohort}: an error-identification pick lacks matching [A:]..[D:] segments`)
  if (domain.startsWith('Part') && cohort.includes('listening') && !take.every(r => /^\s*transcript\s*:/i.test(r.item.passage ?? ''))) refuse(`${cohort}: a listening pick has no "Transcript:" passage`)
  picked.push({ cohort, domain, n: take.length, poolUnseen: pool.filter(r => !seen.has(r.id)).length, pool: pool.length, groups, ids: take.map(r => r.id) })
}

const byCohort = new Map()
for (const p of picked) byCohort.set(p.cohort, (byCohort.get(p.cohort) ?? 0) + p.n)
const total = picked.reduce((s, p) => s + p.n, 0)
const ids = picked.flatMap(p => p.ids)
if (new Set(ids).size !== ids.length) refuse('duplicate id in the sample')
const drawCohort = [...byCohort].map(([c, n]) => `${c}:${n}`).join(',')
const command = `node scripts/study-bank/draw-review-run.mjs '*' ${total} ${REVIEWER} ${RUN_ID} --ids-file=scripts/study-bank/itep-audit/audit-sample.ids.json --cohort=${drawCohort}`
console.log(`iTEP audit sample: ${total} items over ${byCohort.size} cohorts; reviewer has seen ${seen.size} items, all excluded`)
for (const p of picked) console.log(`  ${p.cohort.padEnd(18)} ${p.domain.padEnd(30)} ${String(p.n).padStart(2)}  (pool ${p.pool}, unseen ${p.poolUnseen})${p.groups.length ? '  passage ' + p.groups.join(',') : ''}`)
console.log(`\ndraw command (repo root, only once the open run has closed):\n  ${command}`)
if (process.argv.includes('--write')) {
  writeFileSync(join(HERE, 'audit-sample.json'), JSON.stringify({ runId: RUN_ID, reviewer: REVIEWER, seed: SEED, total, command, units: picked }, null, 1) + '\n')
  writeFileSync(join(HERE, 'audit-sample.ids.json'), JSON.stringify(ids, null, 1) + '\n')
  console.log('wrote itep-audit/audit-sample.json and audit-sample.ids.json')
}
