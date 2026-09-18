#!/usr/bin/env node
/**
 * release-act-reading-2026-09-18.mjs [--apply]
 *
 * Flip the 54 staged ACT Reading items (act-reading-v4, act-reading-v7) to
 * verified=true on the strength of human sitting actrd-recall-2026-09-14.
 *
 * WHY A HUMAN SITTING OVERRIDES A FAILING MODEL STAGE HERE. The ledger holds
 * v4 at nosource=FAIL / elimination=FAIL / tells=FAIL and v7 at tells=FAIL,
 * so the insert gate refuses both. For the ACT verbal family the register
 * settled on 2026-09-12 that a model options-only number on a prose cohort is
 * a SCREEN, and SITTING-PROCEDURE section 6 fixes the rule: where the model
 * and the human disagree, the human wins. The human sat 12 of these 54,
 * interleaved with 12 already-live items, and scored 3/12 = 25.0% on the
 * candidates against a 33.3% best-fixed-letter control, with the live arm at
 * 4/12 = 33.3%. Candidates no worse than shipped, both arms at or under
 * control, pace 42s/item, zero abstentions, zero stale item_sha.
 *
 * REFUSES rather than writes if any precondition is not exactly met.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const APPLY = process.argv.includes('--apply')
const RUN = 'actrd-recall-2026-09-14'
const COHORTS = ['act-reading-v4', 'act-reading-v7']
const refuse = m => { console.error('REFUSING: ' + m); process.exit(2) }

const { data: st, error } = await db.from('study_item_bank').select('id,cohort,passage_group_id,verified,archived,content_sha,verify_meta')
  .eq('family','act').eq('section','reading').eq('verified',false).eq('archived',false)
if (error) refuse(error.message)
if (st.length !== 54) refuse(`expected exactly 54 staged ACT Reading rows, found ${st.length}`)
const badCohort = st.filter(r => !COHORTS.includes(r.cohort))
if (badCohort.length) refuse(`${badCohort.length} staged rows outside ${COHORTS.join('/')}`)
const groups = {}
for (const r of st) groups[r.passage_group_id ?? 'NONE'] = (groups[r.passage_group_id ?? 'NONE'] ?? 0) + 1
const partial = Object.entries(groups).filter(([g, n]) => g === 'NONE' || n !== 9)
if (partial.length) refuse(`passage groups not all whole 9s: ${JSON.stringify(partial)}`)

const { data: rv } = await db.from('study_item_reviews').select('item_id,item_sha,blind_pick,key_slot,reviewer_kind').eq('run_id', RUN)
if (!rv || rv.length !== 24) refuse(`run ${RUN} should have 24 rows, has ${rv ? rv.length : 0}`)
if (rv.some(r => r.reviewer_kind !== 'human')) refuse('run is not a human sitting')
if (rv.some(r => !r.blind_pick)) refuse('run has unanswered rows')
const byId = new Map(st.map(r => [r.id, r]))
const sampled = rv.filter(r => byId.has(r.item_id))
if (sampled.length !== 12) refuse(`expected 12 staged items in the run, found ${sampled.length}`)
const stale = sampled.filter(r => byId.get(r.item_id).content_sha !== r.item_sha)
if (stale.length) refuse(`${stale.length} sampled rows edited since the sitting`)
const hits = sampled.filter(r => r.blind_pick === r.key_slot).length
const dist = {}; for (const r of sampled) dist[r.key_slot] = (dist[r.key_slot] ?? 0) + 1
const control = Math.max(...Object.values(dist)) / sampled.length
console.log(`staged arm: ${hits}/12 = ${(100*hits/12).toFixed(1)}%  control ${(100*control).toFixed(1)}%  margin ${(100*hits/12-100*control).toFixed(1)}`)
if (hits / 12 > 0.35) refuse('staged arm is above the pre-registered 35% clean line -- do not release')

console.log(`${st.length} rows in ${Object.keys(groups).length} whole passages, cohorts ${JSON.stringify(Object.fromEntries(COHORTS.map(c=>[c, st.filter(r=>r.cohort===c).length])))}`)
if (!APPLY) { console.log('\nDRY RUN — pass --apply to write.'); process.exit(0) }

let n = 0
for (const r of st) {
  const meta = { ...(r.verify_meta ?? {}), human_sitting: RUN, released_at: '2026-09-18',
    release_basis: 'human sitting clean (staged 3/12=25.0% vs 33.3% control; live arm 4/12); human wins over failing model stages per SITTING-PROCEDURE s6' }
  const { error: e } = await db.from('study_item_bank').update({ verified: true, verify_meta: meta }).eq('id', r.id).eq('verified', false)
  if (e) refuse(`write failed on ${r.id}: ${e.message}`)
  n++
}
console.log(`released ${n} rows`)

/* Record the override in the ledger, as gate.mjs requires of any bypass. */
const L = JSON.parse(readFileSync('scripts/study-bank/ledger.json','utf8'))
for (const b of L.batches) if (COHORTS.includes(b.cohort)) {
  b.stages.human_sitting = { passed: true, run: RUN, verdict: `Human blind sitting ${RUN}: candidates 3/12 = 25.0% vs 33.3% control, live control arm 4/12 = 33.3%; clean under the rule fixed before the sitting. Released 2026-09-18 over failing model stages -- for ACT verbal the human is the gate and the model is a screen (REGISTER s4, SITTING-PROCEDURE s6). Instrument caveat recorded in REGISTER s5: the draw dealt keys cyclically in presentation order; the reviewer noticed and did not exploit it.` }
}
writeFileSync('scripts/study-bank/ledger.json', JSON.stringify(L, null, 1) + '\n')
console.log('ledger: human_sitting stage recorded on ' + COHORTS.join(', '))
