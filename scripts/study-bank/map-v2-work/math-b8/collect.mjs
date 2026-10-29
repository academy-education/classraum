// read-only: batch-7's 294-entry earlier-N-chains.json + batch-7's own Number Systems items (MB7-N7-01 written,
// MB7-N6-01 written then dropped) + batch-7's 40 checked mechanisms (D01-D40, with the checker's verdict) + batch-7's
// 38 probe-dropped drafts + any MAP Number Systems DB row not matched by a file entry -> math-b8/earlier-N-chains.json.
// Batch-7 mechanisms and drafts are included as "earlier" so the b8 probe catches re-proposals.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
const R = '/Users/andylee/Downloads/saas/classraum/', B7 = R + 'scripts/study-bank/map-v2-work/math-b7/'
const j = p => JSON.parse(readFileSync(p, 'utf8'))
const norm = s => String(s ?? '').replace(/\s+/g, ' ').trim()
const base = j(B7 + 'earlier-N-chains.json')
if (base.length !== 294) { console.error(`REFUSING: batch-7 list has ${base.length} entries, expected 294`); process.exit(2) }
const cands = j(B7 + 'candidates.json'), ids = j(B7 + 'mechanism-ids.json')
if (cands.length !== 78 || ids.length !== 40) { console.error(`REFUSING: batch-7 candidates ${cands.length} (78) / mechanism ids ${ids.length} (40)`); process.exit(2) }
// verdicts from math-b7/CHAIN-CHECK.md table rows "| Dxx | VERDICT |"
const cc = readFileSync(B7 + 'CHAIN-CHECK.md', 'utf8'), verdict = {}
for (const m of cc.matchAll(/^\| (D\d\d) \| ([^|]+) \|/gm)) verdict[m[1]] = norm(m[2]).replace(/\*/g, '')
if (Object.keys(verdict).length !== 40) { console.error(`REFUSING: read ${Object.keys(verdict).length} verdicts from b7 CHAIN-CHECK.md, expected 40`); process.exit(2) }
const out = new Map(base.map(e => [e.id + '|' + norm(e.prompt).slice(0, 120), e]))
const add = e => { const k = e.id + '|' + norm(e.prompt).slice(0, 120); if (!out.has(k)) out.set(k, e) }
let b7items = 0
for (const [f, st] of [['MB7-N7-01.items.json', 'b7 written, file only (not gated)'], ['MB7-N6-01.dropped.items.json', 'b7 written then dropped (near-dup ISEE 5d6f2a16)']]) {
  const x = j(B7 + f), arr = Array.isArray(x) ? x : (x.items ?? Object.values(x))
  for (const i of arr) { b7items++; add({ id: i.id, batch: 'b7', status: st, grade: i.grade_target ?? null, chain: Array.isArray(i.mechanism) ? i.mechanism.map(norm).join(' -> ') : norm(i.mechanism), prompt: norm(i.prompt), key: String(i.correct_answer) }) }
}
const C = Object.fromEntries(cands.map(c => [c.id, c])), mapped = new Set()
for (const m of ids) { const c = C[m.draft]; mapped.add(m.draft)
  add({ id: `B7-${m.id}`, batch: 'b7 mechanism', status: `b7 mechanism ${m.id} (draft ${m.draft}), checker: ${verdict[m.id]}`, grade: c.g, chain: norm(c.chain), prompt: 'ASK: ' + norm(c.ask) + ' | TWIST: ' + norm(c.twist), key: '(mechanism, no item)' }) }
for (const c of cands) if (!mapped.has(c.id))
  add({ id: `B7-${c.id}`, batch: 'b7 draft', status: 'b7 draft dropped by probe (see math-b7/DROPPED.md)', grade: c.g, chain: norm(c.chain), prompt: 'ASK: ' + norm(c.ask) + ' | TWIST: ' + norm(c.twist), key: '(mechanism, no item)' })
const env = Object.fromEntries(readFileSync(R + '.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,cohort,verified,archived,item,verify_meta').eq('family', 'map').eq('section', 'math').eq('domain', 'Real and Complex Number Systems').order('id').range(f, f + 999)
  if (error) throw error; rows.push(...data); if (data.length < 1000) break
}
const { count } = await db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('family', 'map').eq('section', 'math').eq('domain', 'Real and Complex Number Systems')
if (count !== rows.length) { console.error('REFUSING: truncated DB read'); process.exit(2) }
const seen = new Set([...out.values()].map(e => norm(e.prompt).slice(0, 120)))
let dbOnly = 0
for (const r of rows) { const p = norm(r.item?.prompt); if (seen.has(p.slice(0, 120))) continue; dbOnly++
  add({ id: r.verify_meta?.localId ?? r.id, batch: 'DB ' + r.cohort, status: r.archived ? 'archived' : r.verified ? 'LIVE' : 'staged', grade: r.verify_meta?.map?.grade_target ?? null, chain: Array.isArray(r.item?.mechanism) ? r.item.mechanism.map(norm).join(' -> ') : norm(r.item?.mechanism ?? r.verify_meta?.solve ?? '(read the prompt)'), prompt: p, key: String(r.item?.correct_answer) }) }
const list = [...out.values()]
writeFileSync(R + 'scripts/study-bank/map-v2-work/math-b8/earlier-N-chains.json', JSON.stringify(list, null, 1) + '\n')
console.log('entries', list.length, '(b7 list 294, b7 items', b7items, ', b7 mechanisms 40, b7 dropped drafts', cands.length - mapped.size, ', DB-only rows', dbOnly + ')')
console.log('DB N rows', rows.length, 'live', rows.filter(r => r.verified && !r.archived).length, 'staged', rows.filter(r => !r.verified && !r.archived).length)
