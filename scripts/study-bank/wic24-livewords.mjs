#!/usr/bin/env node
/**
 * wic24-livewords.mjs — writes sat-cs-wic-v24.live-words.json: every option word of
 * every live (verified, unarchived) SAT R&W Words-in-Context row, plus the v17 held
 * WIC file, plus every option word of the frozen v18, v19, v20 and v23 batch files (v24;
 * v23 was HELD whole at stage 2, so none of its 160 words is live and only the frozen
 * file carries them).
 * Paged; refuses unless the paged length equals the exact count. Read-only.
 */
import { readFileSync, writeFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]))
const { createClient } = await import('@supabase/supabase-js')
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const q = () => db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('family', 'sat').eq('section', 'reading_writing').eq('verified', true).eq('archived', false)
const { count, error: ce } = await q(); if (ce) throw ce
const rows = []
for (let f = 0; ; f += 1000) { const { data, error } = await db.from('study_item_bank').select('id,cohort,subskill,item').eq('family', 'sat').eq('section', 'reading_writing').eq('verified', true).eq('archived', false).order('id').range(f, f + 999); if (error) throw error; rows.push(...data); if (data.length < 1000) break }
if (rows.length !== count) { console.error(`REFUSING: paged ${rows.length} vs count ${count}`); process.exit(2) }
const wic = rows.filter(r => /words in context/i.test(String(r.subskill ?? r.item?.subskill ?? '')))
const keys = new Set(), opts = new Set()
for (const r of wic) { for (const c of r.item.choices ?? []) opts.add(String(c).toLowerCase().trim()); keys.add(String(r.item.correct_answer).toLowerCase().trim()) }
const v17 = JSON.parse(readFileSync('scripts/study-bank/sat-wic-hard-v17.batch.json', 'utf8'))
for (const it of v17) for (const c of it.choices) opts.add(String(c).toLowerCase())
// v19: every option word of the frozen v18 file too (kept and dropped), so no v18 word comes back
const v18 = JSON.parse(readFileSync('scripts/study-bank/sat-cs-wic-v18.batch.json', 'utf8'))
for (const it of v18) for (const c of it.choices) opts.add(String(c).toLowerCase())
// v20: every option word of the frozen v19 file too
const v19 = JSON.parse(readFileSync('scripts/study-bank/sat-cs-wic-v19.batch.json', 'utf8'))
for (const it of v19) for (const c of it.choices) opts.add(String(c).toLowerCase())
// v23: every option word (key and distractors, kept and dropped) of the frozen v20 file too.
// v19 and v20 kept rows are live, so the DB pull above already holds them; the frozen files
// add the dropped items' words. Keys of both frozen files also go into keys.
const v20 = JSON.parse(readFileSync('scripts/study-bank/sat-cs-wic-v20.batch.json', 'utf8'))
for (const it of v20) for (const c of it.choices) opts.add(String(c).toLowerCase())
// v24: every option word of the frozen v23 file (held whole at stage 2; nothing inserted).
const v23 = JSON.parse(readFileSync('scripts/study-bank/sat-cs-wic-v23.batch.json', 'utf8'))
for (const it of v23) for (const c of it.choices) opts.add(String(c).toLowerCase())
for (const it of [...v19, ...v20, ...v23]) keys.add(String(it.correct_answer).toLowerCase().trim())
if (v19.length !== 40 || v20.length !== 40 || v23.length !== 40) { console.error(`REFUSING: frozen v19/v20/v23 files hold ${v19.length}/${v20.length}/${v23.length} items, not 40/40/40`); process.exit(2) }
const liveCoh = {}; for (const r of rows) if (['rw-v19-cs-wic', 'rw-v20-cs-wic', 'rw-v23-cs-wic'].includes(r.cohort)) liveCoh[r.cohort] = (liveCoh[r.cohort] ?? 0) + 1
writeFileSync('scripts/study-bank/sat-cs-wic-v24.live-words.json', JSON.stringify({ rows: rows.length, wicRows: wic.length, keys: [...keys].sort(), options: [...opts].sort() }, null, 1) + '\n')
console.log(`live R&W ${rows.length}, WIC ${wic.length}: ${keys.size} keys, ${opts.size} option words (incl. v17 held 48 + v18/v19/v20/v23 frozen); live v19/v20/v23 rows (v23 expected absent) ${JSON.stringify(liveCoh)}`)
