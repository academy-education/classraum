#!/usr/bin/env node
/**
 * release-map-reading-draft1-2026-10-20.mjs [--apply]
 *
 * Apply the release rule of map-reading-draft-1.REVIEW.PREREG.md + Amendment 1 (committed before the
 * run was drawn) to the co-founder's sitting map-draft1-cofounder-2026-10-20 (24 items, 6 passages x 4):
 *   1. batch guard: blind >= 12/24 -> release NOTHING
 *   2. per item: verdict "unique" (Only defensible) -> verified=true; anything else -> archived=true
 *   3. per passage: 2+ of a passage's items flagged -> archive the whole passage
 *   4. unanswered items stay staged
 * REFUSES rather than writes if any precondition is not exactly met. Dry run unless --apply.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const APPLY = process.argv.includes('--apply')
const RUN = 'map-draft1-cofounder-2026-10-20'
const refuse = m => { console.error('REFUSING: ' + m); process.exit(2) }

const { data: rv, error: e1 } = await db.from('study_item_reviews').select('item_id,item_sha,blind_pick,key_slot,verdict,reviewer_kind,note').eq('run_id', RUN)
if (e1) refuse(e1.message)
if (!rv || rv.length !== 24) refuse(`run should have 24 rows, has ${rv?.length ?? 0}`)
if (rv.some(r => r.reviewer_kind !== 'human')) refuse('run is not a human sitting')
const unanswered = rv.filter(r => !r.blind_pick || !r.verdict)
const { data: items, error: e2 } = await db.from('study_item_bank').select('id,cohort,family,section,passage_group_id,verified,archived,content_sha,verify_meta').in('id', rv.map(r => r.item_id))
if (e2) refuse(e2.message)
if (items.length !== 24) refuse(`found ${items.length} of the 24 bank rows`)
if (items.some(i => i.cohort !== 'map-reading-draft-1' || i.family !== 'map')) refuse('a row is outside cohort map-reading-draft-1 / family map')
if (items.some(i => i.verified || i.archived)) refuse('a row is already verified or archived')
const byId = new Map(items.map(i => [i.id, i]))
const stale = rv.filter(r => byId.get(r.item_id).content_sha !== r.item_sha)
if (stale.length) refuse(`${stale.length} rows edited since the sitting`)

// 1. batch guard
const hits = rv.filter(r => r.blind_pick && r.blind_pick === r.key_slot).length
console.log(`blind ${hits}/24 = ${(100 * hits / 24).toFixed(1)}% (guard: >= 12 holds the batch); unanswered ${unanswered.length}`)
if (hits >= 12) { console.log('BATCH GUARD FIRES: nothing released, batch held whole.'); process.exit(0) }

// 2-3. per item, per passage
const groups = {}
for (const r of rv) { const g = byId.get(r.item_id).passage_group_id ?? refuse(`row ${r.item_id} has no passage group`); (groups[g] ??= []).push(r) }
if (Object.keys(groups).length !== 6 || Object.values(groups).some(g => g.length !== 4)) refuse(`expected 6 passages x 4, got ${JSON.stringify(Object.fromEntries(Object.entries(groups).map(([g, a]) => [g, a.length])))}`)
const plan = []
for (const [g, rows] of Object.entries(groups)) {
  const flagged = rows.filter(r => r.verdict && r.verdict !== 'unique')
  const wholePassage = flagged.length >= 2
  for (const r of rows) {
    const act = !r.verdict ? 'stay' : wholePassage ? 'archive' : r.verdict === 'unique' ? 'release' : 'archive'
    plan.push({ id: r.item_id, g, verdict: r.verdict, act, why: wholePassage ? `passage has ${flagged.length} flagged` : r.verdict })
  }
  console.log(`passage ${g.slice(0, 8)}: ${rows.filter(r => r.verdict === 'unique').length} only-defensible, ${flagged.length} flagged -> ${wholePassage ? 'ARCHIVE WHOLE PASSAGE' : 'per item'}`)
}
const n = a => plan.filter(p => p.act === a).length
console.log(`plan: release ${n('release')}, archive ${n('archive')}, stay staged ${n('stay')}`)
if (!APPLY) { console.log('\nDRY RUN: pass --apply to write.'); process.exit(0) }

for (const p of plan) {
  if (p.act === 'stay') continue
  const r = byId.get(p.id)
  const meta = { ...(r.verify_meta ?? {}), human_sitting: RUN, sitting_verdict: p.verdict, released_at: '2026-10-20', release_basis: `map-reading-draft-1.REVIEW.PREREG.md Amendment 1: blind ${hits}/24 under the 12/24 guard; MAP not live, verified = ready for launch; ${p.why}` }
  const upd = p.act === 'release' ? { verified: true, verify_meta: meta } : { archived: true, verify_meta: meta }
  const { error } = await db.from('study_item_bank').update(upd).eq('id', p.id).eq('verified', false).eq('archived', false)
  if (error) refuse(`write failed on ${p.id}: ${error.message}`)
}
console.log(`written: released ${n('release')}, archived ${n('archive')}`)
