// Pre-sitting drops from the AI pre-screen (owner, 2026-10-22: use the grader as a pre-screen; flagged items are fixed
// or dropped before the co-founder sees them). Three cr-v11 Choose a Response items where the grader named a second
// natural reply and the author agreed on reading. Staged, never reviewed; archived (not deleted).
//   node scripts/study-bank/fixes/prescreen-drop-crv11-2026-10-22.mjs [--apply]
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const DROP = {
  '81b3d787': 'loaner bike: "Perfect, I\'ll ride it home this afternoon." is also a natural acceptance',
  'cc05e909': 'two swipes: "That\'s annoying. Where else can I eat dinner?" is also a natural reaction',
  'da5dd00c': 'library use only: "Could you request one from another library?" is also a natural reply',
}
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: rows } = await db.from('study_item_bank').select('id,cohort,verified,archived,verify_meta').eq('cohort', 'cr-v11').eq('archived', false)
const hit = rows.filter(r => Object.keys(DROP).some(p => r.id.startsWith(p)))
if (hit.length !== 3 || hit.some(r => r.verified)) throw new Error(`expected 3 staged rows, got ${hit.length}`)
const { count } = await db.from('study_item_reviews').select('id', { count: 'exact', head: true }).in('item_id', hit.map(r => r.id))
if (count) throw new Error('a row has a review; a pre-sitting drop is no longer allowed')
if (!APPLY) { console.log('DRY RUN ok: 3 rows'); process.exit(0) }
for (const r of hit) {
  const why = DROP[Object.keys(DROP).find(p => r.id.startsWith(p))]
  const { error } = await db.from('study_item_bank').update({ archived: true, verify_meta: { ...r.verify_meta, archived_at: '2026-10-22', archive_basis: `AI pre-screen flag, author agreed: ${why}` } }).eq('id', r.id).eq('verified', false)
  if (error) throw error
}
console.log('archived 3 cr-v11 rows before any sitting')
