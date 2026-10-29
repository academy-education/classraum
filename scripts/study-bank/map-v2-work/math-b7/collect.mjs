// read-only: batch-5's 285-entry earlier-N-chains.json + batch-5's own Number Systems items + any MAP Number Systems
// DB row not matched by a file entry -> map-v2-work/math-b7/earlier-N-chains.json (batch 6 wrote no Number Systems items)
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
const R = '/Users/andylee/Downloads/saas/classraum/'
const j = p => JSON.parse(readFileSync(R + p, 'utf8'))
const arr = x => Array.isArray(x) ? x : (x.items ?? Object.values(x))
const norm = s => String(s ?? '').replace(/\s+/g, ' ').trim()
const isN = i => i?.domain === 'Real and Complex Number Systems' || i?.map_area === 'num' || /^(MMG|MM\d|MV2|MB\d|MM5P?)-N/.test(i?.id ?? '')
const chainOf = i => Array.isArray(i.mechanism) && i.mechanism.length ? i.mechanism.map(norm).join(' -> ')
  : (typeof i.mechanism === 'string' && i.mechanism.trim() ? norm(i.mechanism) : (i.solve ? 'solve: ' + norm(i.solve).slice(0, 200) : null))
const base = j('scripts/study-bank/map-v2-work/math-b5/earlier-N-chains.json')
if (base.length !== 285) { console.error(`REFUSING: batch-5 list has ${base.length} entries, expected 285`); process.exit(2) }
const env = Object.fromEntries(readFileSync(R + '.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,cohort,verified,archived,item,verify_meta').eq('family', 'map').eq('section', 'math').eq('domain', 'Real and Complex Number Systems').order('id').range(f, f + 999)
  if (error) throw error; rows.push(...data); if (data.length < 1000) break
}
const { count } = await db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('family', 'map').eq('section', 'math').eq('domain', 'Real and Complex Number Systems')
if (count !== rows.length) { console.error('REFUSING: truncated DB read'); process.exit(2) }
const dbBy = new Map(rows.map(r => [norm(r.item?.prompt).slice(0, 120), r]))
const dbStat = p => { const r = dbBy.get(norm(p).slice(0, 120)); return r ? (r.archived ? 'archived' : r.verified ? 'LIVE' : 'staged') : null }
const out = new Map(base.map(e => [e.id + '|' + norm(e.prompt).slice(0, 120), { ...e, status: dbStat(e.prompt) ?? e.status }]))
const add = e => { const k = e.id + '|' + norm(e.prompt).slice(0, 120); if (!out.has(k)) out.set(k, e) }
let b5n = 0
for (const f of ['scratchpad/map-math-v2-b5-work/assembled.post-return.json', 'scratchpad/map-math-v2-b5-work/assembled.json']) {
  if (!existsSync(R + f)) continue
  for (const i of arr(j(f))) if (isN(i)) { b5n++; add({ id: i.id, batch: 'b5' + (f.includes('post') ? '' : ' first-written'), status: dbStat(i.prompt) ?? 'file only (never banked)', grade: i.grade_target ?? null, chain: chainOf(i) ?? '(no mechanism field; read the prompt)', prompt: norm(i.prompt), key: String(i.correct_answer) }) }
}
const seen = new Set([...out.values()].map(e => norm(e.prompt).slice(0, 120)))
let dbOnly = 0
for (const r of rows) { const p = norm(r.item?.prompt); if (seen.has(p.slice(0, 120))) continue; dbOnly++
  add({ id: r.verify_meta?.localId ?? r.id, batch: 'DB ' + r.cohort, status: r.archived ? 'archived' : r.verified ? 'LIVE' : 'staged', grade: r.verify_meta?.map?.grade_target ?? null, chain: chainOf({ mechanism: r.item?.mechanism, solve: r.verify_meta?.solve }) ?? '(no mechanism field; read the prompt)', prompt: p, key: String(r.item?.correct_answer) }) }
const list = [...out.values()]
writeFileSync(R + 'scripts/study-bank/map-v2-work/math-b7/earlier-N-chains.json', JSON.stringify(list, null, 1) + '\n')
console.log('entries', list.length, '(batch-5 list 285, batch-5 N item versions read', b5n, ', DB-only rows', dbOnly + ')')
console.log('DB N rows', rows.length, 'live', rows.filter(r => r.verified && !r.archived).length, 'staged', rows.filter(r => !r.verified && !r.archived).length)
