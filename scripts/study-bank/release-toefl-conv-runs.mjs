#!/usr/bin/env node
/**
 * release-toefl-conv-runs.mjs <cohort> [--apply]
 *
 * Apply toefl-conv-draft-1.RELEASE.PREREG.md's rule (also used by toefl-conv-draft-2 and, per lecture,
 * toefl-talk-draft-1) to every ANSWERED co-founder run over <cohort>:
 *   1. guard per run AND pooled: blind >= 50% of a run's items, or of all answered items, holds every
 *      not-yet-released set (nothing written)
 *   2. per set (conversation / lecture): every item "unique" -> all verified=true; ANY item flagged ->
 *      all archived=true (the assembler serves sets whole)
 *   3. sets with an unanswered item stay staged
 * Refuses on stale rows (content_sha != item_sha), non-human reviews, or already-decided rows. Dry run by default.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const COHORT = process.argv[2]; const APPLY = process.argv.includes('--apply')
const refuse = m => { console.error('REFUSING: ' + m); process.exit(2) }
if (!COHORT || COHORT.startsWith('--')) refuse('usage: release-toefl-conv-runs.mjs <cohort> [--apply]')
const env = Object.fromEntries(readFileSync(new URL('../../.env.local', import.meta.url), 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: items, error } = await db.from('study_item_bank').select('id,item,content_sha,verified,archived,verify_meta').eq('cohort', COHORT)
if (error || !items?.length) refuse(`no rows in ${COHORT}`)
const { data: rv, error: e2 } = await db.from('study_item_reviews').select('item_id,run_id,item_sha,blind_pick,key_slot,verdict,reviewer_kind').in('item_id', items.map(i => i.id))
if (e2) refuse(e2.message)
if (!rv?.length) refuse('no reviews yet')
if (rv.some(r => r.reviewer_kind !== 'human')) refuse('a non-human review is present')
const byId = new Map(items.map(i => [i.id, i]))
const answered = rv.filter(r => r.blind_pick && r.verdict)
const stale = answered.filter(r => byId.get(r.item_id).content_sha !== r.item_sha)
if (stale.length) refuse(`${stale.length} answered rows edited since the sitting`)
const runs = [...new Set(answered.map(r => r.run_id))].sort()
let held = false
for (const run of runs) { const a = answered.filter(r => r.run_id === run); const h = a.filter(r => r.blind_pick === r.key_slot).length; console.log(`run ${run}: blind ${h}/${a.length}`); if (h >= a.length / 2) held = true }
const ph = answered.filter(r => r.blind_pick === r.key_slot).length
console.log(`pooled blind ${ph}/${answered.length} = ${(100 * ph / answered.length).toFixed(1)}%`)
if (ph >= answered.length / 2) held = true
if (held) { console.log('GUARD FIRES: nothing released.'); process.exit(0) }
const revBy = new Map(answered.map(r => [r.item_id, r]))
const groups = new Map(); for (const it of items) { const g = it.item.passageGroupId; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(it) }
const plan = []
for (const [g, its] of groups) {
  if (its.some(i => i.verified || i.archived)) { if (its.every(i => i.verified || i.archived)) continue; refuse(`set ${g} partly decided`) }
  const rs = its.map(i => revBy.get(i.id))
  if (rs.some(r => !r)) continue // not fully answered: stays staged
  const flagged = rs.filter(r => r.verdict !== 'unique')
  plan.push({ g, ids: its.map(i => i.id), act: flagged.length ? 'archive' : 'release', why: flagged.length ? `${flagged.length} of ${its.length} flagged (${flagged.map(f => f.verdict).join(',')})` : `${its.length}/${its.length} Only defensible` })
}
const n = a => plan.filter(p => p.act === a).length
for (const p of plan) console.log(`  ${p.g.slice(0, 12)} ${p.act.toUpperCase()} (${p.why})`)
console.log(`plan: release ${n('release')} sets, archive ${n('archive')} sets`)
if (!APPLY) { console.log('DRY RUN: pass --apply to write.'); process.exit(0) }
for (const p of plan) for (const id of p.ids) {
  const r = byId.get(id); const rr = revBy.get(id)
  const meta = { ...(r.verify_meta ?? {}), human_sitting: rr.run_id, sitting_verdict: rr.verdict, released_at: new Date().toISOString().slice(0, 10), release_basis: `${COHORT} release prereg: pooled blind ${ph}/${answered.length} under the 50% guard; set ${p.why}` }
  const upd = p.act === 'release' ? { verified: true, verify_meta: meta } : { archived: true, verify_meta: meta }
  const { error: e3 } = await db.from('study_item_bank').update(upd).eq('id', id).eq('verified', false).eq('archived', false)
  if (e3) refuse(`write failed on ${id}: ${e3.message}`)
}
console.log(`written: released ${n('release')} sets, archived ${n('archive')} sets`)
