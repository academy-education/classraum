#!/usr/bin/env node
/**
 * wic27-livewords.mjs — writes sat-cs-wic-v27.live-words.json: every option word of
 * every live (verified, unarchived) SAT R&W Words-in-Context row, plus the v17 held
 * WIC file, plus every option word of the frozen v18, v19, v20, v23 and v24 batch files,
 * plus EVERY option word of the frozen v25 AND v26 worlds files (PREREG-WIC27-2026-10-23.md).
 *
 * v25 and v26 are read from their worlds files, not from their served or kept batches:
 * the four choices of a four-world item are the same in every world, so a worlds file
 * carries all of them, kept AND dropped, served AND unserved.
 *   v25: sat-cs-wic-v25.worlds.json, sha c7794cc7, 32 items (21 live as rw-v25-cs-wic)
 *   v26: sat-cs-wic-v26.worlds.json, sha 003443a6, 40 items (22 live as rw-v26-cs-wic)
 * v23 and v24 were single-world batches whose batch files hold all four choices of all
 * 40 items each (neither is live).
 *
 * Paged; refuses (exit 2) unless the paged length equals the exact count, unless each
 * frozen v19/v20/v23/v24 file holds 40 items, and unless each worlds file holds its
 * item count with its recorded sha and four worlds each. Read-only on the database.
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
const WORLDS = { v25: { n: 32, sha: 'c7794cc7' }, v26: { n: 40, sha: '003443a6' } }
const worlds = {}
for (const [v, { n, sha }] of Object.entries(WORLDS)) {
  const p = `${D}/sat-cs-wic-${v}.worlds.json`
  const w = rd(p)
  const s = createHash('sha256').update(readFileSync(p)).digest('hex')
  if (!Array.isArray(w) || w.length !== n || !s.startsWith(sha) || w.some(it => !Array.isArray(it.worlds) || it.worlds.length !== 4 || (it.choices ?? []).length !== 4)) {
    console.error(`REFUSING: ${p} is not the frozen ${v} worlds file (items ${w?.length}, sha ${s.slice(0, 8)}; want ${n} items x 4 worlds, sha ${sha})`); process.exit(2)
  }
  worlds[v] = w
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
// v25, v26: all four choices of every item (each is the key of one world)
for (const v of Object.keys(worlds)) for (const it of worlds[v]) for (const c of it.choices) { const w = String(c).toLowerCase().trim(); opts.add(w); keys.add(w) }
const COH = ['rw-v19-cs-wic', 'rw-v20-cs-wic', 'rw-v23-cs-wic', 'rw-v24-cs-wic', 'rw-v25-cs-wic', 'rw-v26-cs-wic']
const liveCoh = {}; for (const r of rows) if (COH.includes(r.cohort)) liveCoh[r.cohort] = (liveCoh[r.cohort] ?? 0) + 1
writeFileSync(`${D}/sat-cs-wic-v27.live-words.json`, JSON.stringify({ rows: rows.length, wicRows: wic.length, keys: [...keys].sort(), options: [...opts].sort() }, null, 1) + '\n')
const present = list => `${list.filter(w => opts.has(w)).length}/${list.length}`
const wordsOf = items => items.flatMap(it => it.choices.map(c => String(c).toLowerCase().trim()))
console.log(`live R&W ${rows.length}, WIC ${wic.length}: ${keys.size} keys, ${opts.size} option words (incl. v17 held + v18/v19/v20/v23/v24 frozen + v25/v26 worlds); v23 words present ${present(wordsOf(frozen.v23))}; v24 ${present(wordsOf(frozen.v24))}; v25 ${present(wordsOf(worlds.v25))}; v26 ${present(wordsOf(worlds.v26))}; live v19..v26 rows (v23, v24 expected absent; v25 21, v26 22) ${JSON.stringify(liveCoh)}`)
