// read-only: batch-8's 374-entry earlier-N-chains.json + batch-8's Number Systems items (5 kept: MB8-N7-01/02/03/05,
// MB8-N6-01; 2 dropped: MB8-N7-04, MB8-N8-01) + batch-8's 17 checked mechanisms (E01-E17, with the checker's verdict)
// + batch-8's 33 other drafts (14 probe-dropped, 19 not writable) + any MAP Number Systems DB row not matched by a file
// entry -> math-b9/earlier-N-chains.json. Batch-8 mechanisms and drafts are included as "earlier" so the b9 probe
// catches re-proposals. Refuses (exit 2) on any count it cannot confirm.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
const R = '/Users/andylee/Downloads/saas/classraum/', B8 = R + 'scripts/study-bank/map-v2-work/math-b8/', S8 = R + 'scratchpad/map-v2-math-b8-work/'
const j = p => JSON.parse(readFileSync(p, 'utf8'))
const norm = s => String(s ?? '').replace(/\s+/g, ' ').trim()
const base = j(B8 + 'earlier-N-chains.json')
if (base.length !== 374) { console.error(`REFUSING: batch-8 list has ${base.length} entries, expected 374`); process.exit(2) }
const cands = j(B8 + 'candidates.json'), ids = j(B8 + 'mechanism-ids.json')
if (cands.length !== 50 || ids.length !== 17) { console.error(`REFUSING: batch-8 candidates ${cands.length} (50) / mechanism ids ${ids.length} (17)`); process.exit(2) }
const cc = readFileSync(B8 + 'CHAIN-CHECK.md', 'utf8'), verdict = {}
for (const m of cc.matchAll(/^\| (E\d\d) \| ([^|]+) \|/gm)) verdict[m[1]] = norm(m[2]).replace(/\*/g, '')
if (Object.keys(verdict).length !== 17) { console.error(`REFUSING: read ${Object.keys(verdict).length} verdicts from b8 CHAIN-CHECK.md, expected 17`); process.exit(2) }
const dropTxt = readFileSync(B8 + 'DROPPED.md', 'utf8') + readFileSync(B8 + 'FEASIBILITY.md', 'utf8')
const out = new Map(base.map(e => [e.id + '|' + norm(e.prompt).slice(0, 120), e]))
const add = e => { const k = e.id + '|' + norm(e.prompt).slice(0, 120); if (!out.has(k)) out.set(k, e) }
let b8items = 0
for (const [f, st] of [['N7/items.json', 'b8 written, PART OK, file only (not gated)'], ['N6/items.json', 'b8 written, PART OK, file only (not gated)'],
  ['_dropped/N7-E09/items.json', 'b8 written then dropped (near-dup flag + sign strike)'], ['_dropped/N8-E17/items.json', 'b8 written then dropped (near-dup flag + sign strike)']]) {
  const x = j(S8 + f), arr = Array.isArray(x) ? x : (x.items ?? Object.values(x))
  for (const i of arr) { b8items++; add({ id: i.id, batch: 'b8', status: st, grade: i.grade_target ?? null, chain: Array.isArray(i.mechanism) ? i.mechanism.map(norm).join(' -> ') : norm(i.mechanism), prompt: norm(i.prompt), key: String(i.correct_answer) }) }
}
if (b8items !== 7) { console.error(`REFUSING: read ${b8items} batch-8 items, expected 7`); process.exit(2) }
const C = Object.fromEntries(cands.map(c => [c.id, c])), mapped = new Set()
for (const m of ids) { const c = C[m.draft]; mapped.add(m.draft)
  add({ id: `B8-${m.id}`, batch: 'b8 mechanism', status: `b8 mechanism ${m.id} (draft ${m.draft}), checker: ${verdict[m.id]}`, grade: c.g, chain: norm(c.chain), prompt: 'ASK: ' + norm(c.ask) + ' | TWIST: ' + norm(c.twist), key: '(mechanism, no item)' }) }
let probeDropped = 0, unwritable = 0
for (const c of cands) if (!mapped.has(c.id)) {
  const pd = new RegExp('^\\| ' + c.id + ' \\| \\d \\| [^|]+ \\| (kw|earlier|same)', 'm').test(dropTxt); pd ? probeDropped++ : unwritable++
  add({ id: `B8-${c.id}`, batch: 'b8 draft', status: pd ? 'b8 draft dropped by probe (see math-b8/DROPPED.md)' : 'b8 draft not writable (see math-b8/FEASIBILITY.md)', grade: c.g, chain: norm(c.chain), prompt: 'ASK: ' + norm(c.ask) + ' | TWIST: ' + norm(c.twist), key: '(mechanism, no item)' }) }
if (probeDropped + unwritable !== 33) { console.error('REFUSING: b8 draft split does not add to 33'); process.exit(2) }
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
writeFileSync(R + 'scripts/study-bank/map-v2-work/math-b9/earlier-N-chains.json', JSON.stringify(list, null, 1) + '\n')
console.log('entries', list.length, '(b8 list 374, b8 items', b8items, ', b8 mechanisms 17, b8 probe-dropped drafts', probeDropped, ', b8 unwritable drafts', unwritable, ', DB-only rows', dbOnly + ')')
console.log('DB N rows', rows.length, 'live', rows.filter(r => r.verified && !r.archived).length, 'staged', rows.filter(r => !r.verified && !r.archived).length)
