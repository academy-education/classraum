#!/usr/bin/env node
/**
 * Three cohorts inserted on 2026-09-01 carry `verify_meta.grader_difficulty`
 * holding the AUTHOR'S OWN label, not an independent grade.
 *
 * I built their qc.json as `{ difficulty: it.difficulty }` — copying the
 * authoring agent's self-report into a field whose name claims a second
 * opinion. All 125 rows have grader_difficulty identical to difficulty,
 * which is the tell: an independent grader disagrees sometimes.
 *
 * This is the same defect as `it.difficulty || 'hard'` that I spent the
 * hour before this condemning — a stored value asserting a measurement
 * nobody made — introduced by me, the same day, while fixing the other
 * one.
 *
 * The label is not deleted: the author's difficulty is a real (weak)
 * signal and the items are sandbox-verified. It is RENAMED to what it
 * actually is, so a future difficulty audit does not count these as
 * already graded and skip them.
 *
 *   node fix-author-reported-difficulty.mjs [--apply]
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env=Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const APPLY=process.argv.includes('--apply')
const COHORTS=['isee-math-s6','isee-math-s7','ssat-math-s6']

const { data, error } = await db.from('study_item_bank')
  .select('id,difficulty,verify_meta').in('cohort', COHORTS)
if (error) throw new Error(error.message)

const targets = (data ?? []).filter(r => r.verify_meta?.grader_difficulty !== undefined)
const disagree = targets.filter(r => r.verify_meta.grader_difficulty !== r.difficulty)
console.log(`${data.length} rows, ${targets.length} carry grader_difficulty, ${disagree.length} disagree with the stored label`)
if (disagree.length) {
  console.log('SOME DISAGREE — this may be a real grade after all. Stopping so it is not destroyed.')
  process.exit(1)
}
if (!APPLY) { console.log('DRY RUN — pass --apply to write'); process.exit(0) }

let n = 0
for (const r of targets) {
  const vm = { ...r.verify_meta }
  vm.author_reported_difficulty = vm.grader_difficulty
  delete vm.grader_difficulty
  vm.difficulty_ungraded = true
  vm.difficulty_note = 'The author\'s own label, not an independent grade. Renamed 2026-09-01: the qc.json fed to the inserter echoed the authoring agent\'s difficulty into a field named grader_difficulty, so all 125 rows agreed with themselves by construction.'
  const { error: e } = await db.from('study_item_bank').update({ verify_meta: vm }).eq('id', r.id)
  if (e) { console.error('ERR', r.id, e.message); process.exit(1) }
  n++
}
const { data: after } = await db.from('study_item_bank').select('verify_meta').in('cohort', COHORTS)
const stillClaiming = (after ?? []).filter(r => r.verify_meta?.grader_difficulty !== undefined).length
const flagged = (after ?? []).filter(r => r.verify_meta?.difficulty_ungraded).length
console.log(`updated ${n}; verified: ${stillClaiming} still claim a grade, ${flagged} now flagged ungraded`)
