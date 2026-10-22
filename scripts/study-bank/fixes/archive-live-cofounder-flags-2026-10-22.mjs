// Archive the 18 LIVE items the co-founder flagged "alternative" or "broken" in a human sitting, whose content is
// unchanged since his review (fresh). They stayed live because those older sittings released by a batch-level blind
// score, not per item. Owner, 2026-10-22: "Yes" (to archiving all 18). Reversible: archived, not deleted.
//   node scripts/study-bank/fixes/archive-live-cofounder-flags-2026-10-22.mjs [--apply]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const refuse = m => { console.error('REFUSING: ' + m); process.exit(2) }
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const rv = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_reviews').select('id,item_id,item_sha,verdict,run_id,note').eq('reviewer_kind', 'human').in('verdict', ['alternative', 'broken']).order('id').range(f, f + 999)
  if (error) refuse(error.message); rv.push(...data); if (data.length < 1000) break
}
const { data: items, error } = await db.from('study_item_bank').select('id,cohort,verified,archived,content_sha,verify_meta').in('id', [...new Set(rv.map(r => r.item_id))])
if (error) refuse(error.message)
const by = Object.fromEntries(items.map(i => [i.id, i]))
const live = rv.filter(r => by[r.item_id] && by[r.item_id].verified && !by[r.item_id].archived && by[r.item_id].content_sha === r.item_sha)
const ids = [...new Set(live.map(r => r.item_id))]
console.log(`human flags ${rv.length}; live, unchanged since the flag: ${ids.length}`)
for (const r of live) console.log(`  ${by[r.item_id].cohort.padEnd(16)} ${r.item_id.slice(0, 8)} ${r.verdict.padEnd(11)} ${r.run_id}`)
if (ids.length !== 18) refuse(`expected 18 (the set the owner approved), found ${ids.length}`)
const snap = 'scripts/study-bank/fixes/snapshot-archive-live-cofounder-flags-2026-10-22.json'
if (!APPLY) { console.log('DRY RUN ok'); process.exit(0) }
writeFileSync(snap, JSON.stringify(items.filter(i => ids.includes(i.id)), null, 1) + '\n')
for (const id of ids) {
  const r = live.find(x => x.item_id === id)
  const meta = { ...(by[id].verify_meta ?? {}), archived_at: '2026-10-22', archive_basis: `co-founder flagged "${r.verdict}" in ${r.run_id} ("${(r.note ?? '').slice(0, 160)}"); live because that sitting released by batch blind score; owner approved archiving 2026-10-22` }
  const { error: e } = await db.from('study_item_bank').update({ archived: true, verify_meta: meta }).eq('id', id).eq('verified', true).eq('archived', false)
  if (e) refuse(`${id}: ${e.message}`)
}
console.log(`archived ${ids.length}; snapshot ${snap}`)
