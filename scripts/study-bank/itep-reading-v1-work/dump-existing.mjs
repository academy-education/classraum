// dump-existing.mjs — every passage opening and every capitalised name in the bank's passage-based rows
// (all families, live + staged, archived included), for the iTEP Reading v1 topic and name collision checks.
//   node scripts/study-bank/itep-reading-v1-work/dump-existing.mjs     (from the repo root)
// Exits 2 on a short page read (never a check over a truncated population).
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const OUT = 'scripts/study-bank/itep-reading-v1-work'
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
