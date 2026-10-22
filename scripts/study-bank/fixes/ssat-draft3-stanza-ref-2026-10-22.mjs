// ssat-reading-draft-3, poem item 7fd034ad: the prompt said "third stanza" but "loose and wandering lines" is in the
// FOURTH stanza (found 2026-10-22 by a location-reference scan of every staged and live passage item). The row is
// staged and has no review, so it is corrected before any sitting. original_item is kept as authored.
//   node scripts/study-bank/fixes/ssat-draft3-stanza-ref-2026-10-22.mjs [--apply]
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const ID = '7fd034ad-4093-430e-8e19-620e82e567db'
const OLD = 'As it is used in the third stanza, the word "lines" most nearly means'
const NEW = 'As it is used in the fourth stanza, the word "lines" most nearly means'
const norm = s => String(s ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
const hashOf = it => createHash('md5').update([norm(it.passage), norm(it.prompt), (it.choices || []).map(norm).join('|')].join('~~')).digest('hex')
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: row } = await db.from('study_item_bank').select('id,verified,archived,content_hash,verify_meta,item').eq('id', ID).single()
if (row.verified || row.archived) throw new Error('row is no longer staged')
const { count } = await db.from('study_item_reviews').select('id', { count: 'exact', head: true }).eq('item_id', ID)
if (count) throw new Error(`row has ${count} review(s); a pre-sitting fix is no longer allowed`)
if (row.item.prompt !== OLD) throw new Error('prompt is not the expected text')
const blocks = row.item.passage.split(/\n\s*\n/)
if (!blocks[3].includes('wandering lines') || blocks[2].includes('lines')) throw new Error('stanza check failed')
const item = { ...row.item, prompt: NEW }
const meta = { ...row.verify_meta, draft: { ...row.verify_meta.draft, author_fix: { at: '2026-10-22', what: 'stanza reference third -> fourth', before: OLD } } }
console.log('content_hash', row.content_hash, '->', hashOf(item))
// keep the batch file in step
const bp = 'scripts/study-bank/ssat-reading-draft-3.batch.json'
const batch = JSON.parse(readFileSync(bp, 'utf8'))
const br = batch.rows.find(r => r.item.prompt === OLD && r.item.passage === row.item.passage)
if (!br) throw new Error('batch row not found')
if (!APPLY) { console.log('DRY RUN ok'); process.exit(0) }
const { error } = await db.from('study_item_bank').update({ item, content_hash: hashOf(item), verify_meta: meta }).eq('id', ID).eq('verified', false)
if (error) throw error
br.item.prompt = NEW; br.content_hash = hashOf(item)
const txt = JSON.stringify(batch, null, 1) + '\n'; writeFileSync(bp, txt)
console.log('applied; new batch sha256', createHash('sha256').update(txt).digest('hex'))
