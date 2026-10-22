#!/usr/bin/env node
/**
 * wic26-livewords.mjs — writes sat-cs-wic-v26.live-words.json: every option word of
 * every live (verified, unarchived) SAT R&W Words-in-Context row, plus the v17 held
 * WIC file, plus every option word of the frozen v18, v19, v20, v23 and v24 batch files,
 * plus EVERY option word of the frozen v25 worlds file (PREREG-WIC26-2026-10-23.md).
 *
 * v25 is read from sat-cs-wic-v25.worlds.json (sha c7794cc7, 32 items), not from its
 * served or kept batch: the four choices of a four-world item are the same in every
 * world, so the worlds file carries all 128 words, kept AND dropped, served AND
 * unserved. 21 v25 items are live (rw-v25-cs-wic), the other 11 only exist in that file.
 *
 * Paged; refuses (exit 2) unless the paged length equals the exact count, unless each
 * frozen v19/v20/v23/v24 file holds 40 items, and unless the v25 worlds file holds 32
 * items with sha c7794cc7 and four worlds each. Read-only.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const rd = p => { if (!existsSync(p)) { console.error(`REFUSING: ${p} missing`); process.exit(2) } try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${p}: ${e.message}`); process.exit(2) } }
// frozen files first: they need no database, so a broken file refuses before any read
const frozen = {}
for (const v of ['v19', 'v20', 'v23', 'v24']) {
  frozen[v] = rd(`${D}/sat-cs-wic-${v}.batch.json`)
  if (!Array.isArray(frozen[v]) || frozen[v].length !== 40) { console.error(`REFUSING: frozen ${v} file holds ${frozen[v]?.length} items, not 40`); process.exit(2) }
}
const V25 = `${D}/sat-cs-wic-v25.worlds.json`
const v25 = rd(V25)
const v25sha = existsSync(V25) ? createHash('sha256').update(readFileSync(V25)).digest('hex') : ''
if (!Array.isArray(v25) || v25.length !== 32 || !v25sha.startsWith('c7794cc7') || v25.some(it => !Array.isArray(it.worlds) || it.worlds.length !== 4 || (it.choices ?? []).length !== 4)) {
  console.error(`REFUSING: ${V25} is not the frozen v25 worlds file (items ${v25?.length}, sha ${v25sha.slice(0, 8)}; want 32 items x 4 worlds, sha c7794cc7)`); process.exit(2)
}
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]))
const { createClient } = await import('@supabase/supabase-js')
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { count, error: ce } = await db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('family', 'sat').eq('section', 'reading_writing').eq('verified', true).eq('archived', false)
if (ce) throw ce
const rows = []
for (let f = 0; ; f += 1000) { const { data, error } = await db.from('study_item_bank').select('id,cohort,subskill,item').eq('family', 'sat').eq('section', 'reading_writing').eq('verified', true).eq('archived', false).order('id').range(f, f + 999); if (error) throw error; rows.push(...data); if (data.length < 1000) break }
if (!count || rows.length !== count) { console.error(`REFUSING: paged ${rows.length} vs count ${count}`); process.exit(2) }
const wic = rows.filter(r => /words in context/i.test(String(r.subskill ?? r.item?.subskill ?? '')))
if (!wic.length) { console.error('REFUSING: zero live WIC rows read'); process.exit(2) }
const keys = new Set(), opts = new Set()
for (const r of wic) { for (const c of r.item.choices ?? []) opts.add(String(c).toLowerCase().trim()); keys.add(String(r.item.correct_answer).toLowerCase().trim()) }
for (const it of rd(`${D}/sat-wic-hard-v17.batch.json`)) for (const c of it.choices) opts.add(String(c).toLowerCase())
for (const it of rd(`${D}/sat-cs-wic-v18.batch.json`)) for (const c of it.choices) opts.add(String(c).toLowerCase())
for (const v of Object.keys(frozen)) for (const it of frozen[v]) { for (const c of it.choices) opts.add(String(c).toLowerCase().trim()); keys.add(String(it.correct_answer).toLowerCase().trim()) }
// v25: all four choices of every item (each is the key of one world)
for (const it of v25) for (const c of it.choices) { const w = String(c).toLowerCase().trim(); opts.add(w); keys.add(w) }
const liveCoh = {}; for (const r of rows) if (['rw-v19-cs-wic', 'rw-v20-cs-wic', 'rw-v23-cs-wic', 'rw-v24-cs-wic', 'rw-v25-cs-wic'].includes(r.cohort)) liveCoh[r.cohort] = (liveCoh[r.cohort] ?? 0) + 1
writeFileSync(`${D}/sat-cs-wic-v26.live-words.json`, JSON.stringify({ rows: rows.length, wicRows: wic.length, keys: [...keys].sort(), options: [...opts].sort() }, null, 1) + '\n')
const v25w = v25.flatMap(it => it.choices.map(c => String(c).toLowerCase().trim()))
const v24w = frozen.v24.flatMap(it => it.choices.map(c => String(c).toLowerCase().trim()))
console.log(`live R&W ${rows.length}, WIC ${wic.length}: ${keys.size} keys, ${opts.size} option words (incl. v17 held + v18/v19/v20/v23/v24 frozen + v25 worlds); v24 words present ${v24w.filter(w => opts.has(w)).length}/${v24w.length}; v25 words present ${v25w.filter(w => opts.has(w)).length}/${v25w.length}; live v19..v25 rows (v23, v24 expected absent; v25 expected 21) ${JSON.stringify(liveCoh)}`)
