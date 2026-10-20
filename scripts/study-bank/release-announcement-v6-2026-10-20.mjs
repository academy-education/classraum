#!/usr/bin/env node
/**
 * release-announcement-v6-2026-10-20.mjs [--apply]
 *
 * Apply the release rule of PREREG-ANNOUNCEMENT-V6-2026-10-09.md (v5's rule, committed before the sitting)
 * to the co-founder's sitting announcement-v6-cofounder-2026-10-20:
 *   <= 8/20 blind correct -> verified=true on the cohort's staged items; >= 12 -> archive; 9-11 -> second reader.
 *   Any item marked other than "Only defensible" is archived regardless.
 * REFUSES rather than writes if any precondition is not exactly met. Dry run unless --apply.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const APPLY = process.argv.includes('--apply')
const RUN = 'announcement-v6-cofounder-2026-10-20', COHORT = 'announcement-v6'
const refuse = m => { console.error('REFUSING: ' + m); process.exit(2) }

const { data: rv, error: e1 } = await db.from('study_item_reviews').select('item_id,item_sha,blind_pick,key_slot,verdict,reviewer_kind').eq('run_id', RUN)
if (e1) refuse(e1.message)
if (!rv || rv.length !== 20) refuse(`run should have 20 rows, has ${rv?.length ?? 0}`)
if (rv.some(r => r.reviewer_kind !== 'human')) refuse('run is not a human sitting')
if (rv.some(r => !r.blind_pick || !r.verdict)) refuse('run has unanswered rows')
const { data: items, error: e2 } = await db.from('study_item_bank').select('id,verified,archived,content_sha,verify_meta').eq('cohort', COHORT)
if (e2) refuse(e2.message)
const staged = items.filter(i => !i.verified && !i.archived)
if (staged.length !== 28) refuse(`expected 28 staged ${COHORT} rows, found ${staged.length}`)
const byId = new Map(items.map(i => [i.id, i]))
if (rv.some(r => !byId.has(r.item_id))) refuse('a sat item is not in the cohort')
if (rv.some(r => byId.get(r.item_id).content_sha !== r.item_sha)) refuse('a sat item was edited since the sitting')

const hits = rv.filter(r => r.blind_pick === r.key_slot).length
console.log(`blind ${hits}/20 (rule: <= 8 release, >= 12 archive, 9-11 second reader)`)
if (hits >= 12) refuse('>= 12: the rule archives the cohort; not done by this script')
if (hits > 8) refuse('9-11: the rule calls for a second reader; nothing released')
const flagged = new Set(rv.filter(r => r.verdict !== 'unique').map(r => r.item_id))
const release = staged.filter(i => !flagged.has(i.id)), archive = staged.filter(i => flagged.has(i.id))
console.log(`plan: release ${release.length}, archive ${archive.length} (flagged by the reviewer)`)
if (!APPLY) { console.log('DRY RUN: pass --apply to write.'); process.exit(0) }
for (const i of staged) {
  const meta = { ...(i.verify_meta ?? {}), human_sitting: RUN, released_at: '2026-10-20', release_basis: `PREREG-ANNOUNCEMENT-V6-2026-10-09.md: blind ${hits}/20 (<= 8 releases)${flagged.has(i.id) ? '; archived: reviewer flagged' : ''}` }
  const upd = flagged.has(i.id) ? { archived: true, verify_meta: meta } : { verified: true, verify_meta: meta }
  const { error } = await db.from('study_item_bank').update(upd).eq('id', i.id).eq('verified', false).eq('archived', false)
  if (error) refuse(`write failed on ${i.id}: ${error.message}`)
}
console.log(`written: released ${release.length}, archived ${archive.length}`)
