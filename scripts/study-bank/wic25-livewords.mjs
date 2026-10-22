#!/usr/bin/env node
/**
 * wic25-livewords.mjs — writes sat-cs-wic-v25.live-words.json: every option word of
 * every live (verified, unarchived) SAT R&W Words-in-Context row, plus the v17 held
 * WIC file, plus every option word of the frozen v18, v19, v20, v23 and v24 batch files.
 * v25 (PREREG-WIC25-2026-10-23.md) adds v24 (sha 39d943c2, HELD whole at stage 2, so
 * none of its 160 words is live and only the frozen file carries them).
 * Paged; refuses unless the paged length equals the exact count, and unless each
 * frozen v19/v20/v23/v24 file holds 40 items. Read-only.
 */
import { readFileSync, writeFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]))
const { createClient } = await import('@supabase/supabase-js')
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const base = () => db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('family', 'sat').eq('section', 'reading_writing').eq('verified', true).eq('archived', false)
const { count, error: ce } = await base(); if (ce) throw ce
const rows = []
for (let f = 0; ; f += 1000) { const { data, error } = await db.from('study_item_bank').select('id,cohort,subskill,item').eq('family', 'sat').eq('section', 'reading_writing').eq('verified', true).eq('archived', false).order('id').range(f, f + 999); if (error) throw error; rows.push(...data); if (data.length < 1000) break }
if (rows.length !== count) { console.error(`REFUSING: paged ${rows.length} vs count ${count}`); process.exit(2) }
const wic = rows.filter(r => /words in context/i.test(String(r.subskill ?? r.item?.subskill ?? '')))
if (!wic.length) { console.error('REFUSING: zero live WIC rows read'); process.exit(2) }
const keys = new Set(), opts = new Set()
for (const r of wic) { for (const c of r.item.choices ?? []) opts.add(String(c).toLowerCase().trim()); keys.add(String(r.item.correct_answer).toLowerCase().trim()) }
const rd = p => JSON.parse(readFileSync(p, 'utf8'))
for (const it of rd('scripts/study-bank/sat-wic-hard-v17.batch.json')) for (const c of it.choices) opts.add(String(c).toLowerCase())
for (const it of rd('scripts/study-bank/sat-cs-wic-v18.batch.json')) for (const c of it.choices) opts.add(String(c).toLowerCase())
const frozen = {}
for (const v of ['v19', 'v20', 'v23', 'v24']) {
  frozen[v] = rd(`scripts/study-bank/sat-cs-wic-${v}.batch.json`)
  if (!Array.isArray(frozen[v]) || frozen[v].length !== 40) { console.error(`REFUSING: frozen ${v} file holds ${frozen[v]?.length} items, not 40`); process.exit(2) }
  for (const it of frozen[v]) { for (const c of it.choices) opts.add(String(c).toLowerCase().trim()); keys.add(String(it.correct_answer).toLowerCase().trim()) }
}
const liveCoh = {}; for (const r of rows) if (['rw-v19-cs-wic', 'rw-v20-cs-wic', 'rw-v23-cs-wic', 'rw-v24-cs-wic'].includes(r.cohort)) liveCoh[r.cohort] = (liveCoh[r.cohort] ?? 0) + 1
writeFileSync('scripts/study-bank/sat-cs-wic-v25.live-words.json', JSON.stringify({ rows: rows.length, wicRows: wic.length, keys: [...keys].sort(), options: [...opts].sort() }, null, 1) + '\n')
const v24w = frozen.v24.flatMap(it => it.choices.map(c => String(c).toLowerCase().trim()))
console.log(`live R&W ${rows.length}, WIC ${wic.length}: ${keys.size} keys, ${opts.size} option words (incl. v17 held + v18/v19/v20/v23/v24 frozen); v24 words present ${v24w.filter(w => opts.has(w)).length}/${v24w.length}; live v19/v20/v23/v24 rows (v23, v24 expected absent) ${JSON.stringify(liveCoh)}`)
