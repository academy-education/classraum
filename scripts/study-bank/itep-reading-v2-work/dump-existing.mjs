// dump-existing.mjs — every passage opening and every capitalised name in the bank's passage-based rows
// (all families, live + staged, archived included), for the iTEP Reading v2 topic and name collision checks.
//   node scripts/study-bank/itep-reading-v2-work/dump-existing.mjs     (from the repo root)
// Exits 2 on a short page read (never a check over a truncated population).
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const OUT = 'scripts/study-bank/itep-reading-v2-work'
const scope = q => q.not('item->>passage', 'is', null)
const { count, error: ce } = await scope(db.from('study_item_bank').select('id', { count: 'exact', head: true }))
if (ce) { console.error(ce.message); process.exit(2) }
const seen = new Map(); const names = new Map(); let n = 0
for (let from = 0; ; from += 1000) {
  const { data, error } = await scope(db.from('study_item_bank').select('id,family,section,cohort,verified,item')).order('id').range(from, from + 999)
  if (error) { console.error(error.message); process.exit(2) }
  n += data.length
  for (const r of data) {
    const p = String(r.item?.passage || '').replace(/\s+/g, ' ').trim()
    if (p.length < 120) continue
    const k = p.slice(0, 160)
    if (seen.has(k)) continue
    seen.set(k, `${r.family}/${r.section} ${r.cohort} ${r.verified ? 'live' : 'staged'}: ${p.slice(0, 220)}`)
    // capitalised words not at a sentence start
    for (const m of p.matchAll(/(?<![.!?"“]\s)(?<!^)\b([A-Z][a-z]{2,})\b/g)) names.set(m[1], (names.get(m[1]) || 0) + 1)
  }
  if (data.length < 1000) break
}
if (n !== count) { console.error(`read ${n} of ${count}`); process.exit(2) }
writeFileSync(`${OUT}/existing-passages.txt`, [...seen.values()].sort().join('\n') + '\n')
writeFileSync(`${OUT}/existing-names.json`, JSON.stringify(Object.fromEntries([...names].sort()), null, 0))
console.log(`rows ${n}, distinct passages ${seen.size}, capitalised words ${names.size}`)
// v2: also every name declared by the v1 authors (staged AND dropped sets), so no v1 draft name is reused.
const extra = JSON.parse(readFileSync(`${OUT}/existing-names.json`, 'utf8'))
let added = 0
for (const x of 'ABCD') for (const s of JSON.parse(readFileSync(`scripts/study-bank/itep-reading-v1-work/items/${x}.json`, 'utf8')).sets) for (const nm of s.names || []) for (const p of nm.split(/\s+/)) if (!(p in extra)) { extra[p] = 1; added++ }
writeFileSync(`${OUT}/existing-names.json`, JSON.stringify(Object.fromEntries(Object.entries(extra).sort()), null, 0))
console.log(`added ${added} v1 draft names`)
// v2: and every v1 draft passage opening (dropped sets are not in the bank but are not fresh either).
const lines = readFileSync(`${OUT}/existing-passages.txt`, 'utf8').split('\n').filter(Boolean)
for (const x of 'ABCD') for (const s of JSON.parse(readFileSync(`scripts/study-bank/itep-reading-v1-work/items/${x}.json`, 'utf8')).sets) {
  const p = s.passage.replace(/\s+/g, ' ').trim(); const line = `itep/reading itep-reading-v1 draft: ${p.slice(0, 220)}`
  if (!lines.some(l => l.includes(p.slice(0, 120)))) lines.push(line)
}
writeFileSync(`${OUT}/existing-passages.txt`, lines.sort().join('\n') + '\n')
console.log(`passage list now ${lines.length}`)
