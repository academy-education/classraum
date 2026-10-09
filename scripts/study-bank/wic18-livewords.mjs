#!/usr/bin/env node
/**
 * wic18-livewords.mjs — writes sat-cs-wic-v18.live-words.json: every option word of
 * every live (verified, unarchived) SAT R&W Words-in-Context row, plus the v17 held
 * WIC file. Paged; refuses unless the paged length equals the exact count.
 */
import { readFileSync, writeFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]))
const { createClient } = await import('@supabase/supabase-js')
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const q = () => db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('family', 'sat').eq('section', 'reading_writing').eq('verified', true).eq('archived', false)
const { count, error: ce } = await q(); if (ce) throw ce
const rows = []
for (let f = 0; ; f += 1000) { const { data, error } = await db.from('study_item_bank').select('id,subskill,item').eq('family', 'sat').eq('section', 'reading_writing').eq('verified', true).eq('archived', false).order('id').range(f, f + 999); if (error) throw error; rows.push(...data); if (data.length < 1000) break }
if (rows.length !== count) { console.error(`REFUSING: paged ${rows.length} vs count ${count}`); process.exit(2) }
const wic = rows.filter(r => /words in context/i.test(String(r.subskill ?? r.item?.subskill ?? '')))
const keys = new Set(), opts = new Set()
for (const r of wic) { for (const c of r.item.choices ?? []) opts.add(String(c).toLowerCase().trim()); keys.add(String(r.item.correct_answer).toLowerCase().trim()) }
const v17 = JSON.parse(readFileSync('scripts/study-bank/sat-wic-hard-v17.batch.json', 'utf8'))
for (const it of v17) for (const c of it.choices) opts.add(String(c).toLowerCase())
writeFileSync('scripts/study-bank/sat-cs-wic-v18.live-words.json', JSON.stringify({ rows: rows.length, wicRows: wic.length, keys: [...keys].sort(), options: [...opts].sort() }, null, 1) + '\n')
console.log(`live R&W ${rows.length}, WIC ${wic.length}: ${keys.size} keys, ${opts.size} option words (incl. v17 held 48)`)
