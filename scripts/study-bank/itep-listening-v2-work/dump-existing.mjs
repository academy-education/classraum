// dump-existing.mjs — the topic and name collision lists for iTEP Listening v2 (ITEP-SLATE-LISTENING-V2.prereg.md §2):
//   existing-transcripts.txt  the opening of every listening transcript in the bank (all families, live + staged,
//                             archived included) and of every iTEP reading passage (bank + v1/v2 drafts)
//   existing-names.json       every capitalised non-initial word in ALL passage-bearing bank rows, plus every name
//                             declared by the iTEP Reading v1/v2 authors
//   node scripts/study-bank/itep-listening-v2-work/dump-existing.mjs     (from the repo root)
// Exits 2 on a short page read (never a check over a truncated population).
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const OUT = 'scripts/study-bank/itep-listening-v2-work'
const scope = q => q.not('item->>passage', 'is', null)
const { count, error: ce } = await scope(db.from('study_item_bank').select('id', { count: 'exact', head: true }))
if (ce) { console.error(ce.message); process.exit(2) }
const seen = new Map(); const names = new Map(); let n = 0
for (let from = 0; ; from += 1000) {
  const { data, error } = await scope(db.from('study_item_bank').select('id,family,section,cohort,verified,item')).order('id').range(from, from + 999)
  if (error) { console.error(error.message); process.exit(2) }
  n += data.length
  for (const r of data) {
    const p = String(r.item?.passage || '').replace(/^\s*transcript:\s*/i, '').replace(/\s+/g, ' ').trim()
    for (const m of p.matchAll(/(?<![.!?"“]\s)(?<!^)\b([A-Z][a-z]{2,})\b/g)) names.set(m[1], (names.get(m[1]) || 0) + 1)
    if (p.length < 60 || !(r.section === 'listening' || r.family === 'itep')) continue
    const k = p.slice(0, 160)
    if (!seen.has(k)) seen.set(k, `${r.family}/${r.section} ${r.cohort} ${r.verified ? 'live' : 'staged'}: ${p.slice(0, 200)}`)
  }
  if (data.length < 1000) break
}
if (n !== count) { console.error(`read ${n} of ${count}`); process.exit(2) }
let added = 0
// v2: also every iTEP Listening v1 authored set (dropped ones included), transcript speaker labels stripped.
for (const [dir, xs] of [['itep-reading-v1-work', 'ABCD'], ['itep-reading-v2-work', 'ABCDEFGH'], ['itep-listening-v1-work', 'ABCD']]) for (const x of xs) for (const s of JSON.parse(readFileSync(`scripts/study-bank/${dir}/items/${x}.json`, 'utf8')).sets) {
  for (const nm of s.names || []) for (const w of nm.split(/\s+/)) if (!names.has(w)) { names.set(w, 1); added++ }
  const p = String(s.passage ?? s.transcript).replace(/^[WM]: /gm, '').replace(/\s+/g, ' ').trim()
  const kind = dir.includes('listening') ? 'itep/listening' : 'itep/reading'
  if (![...seen.keys()].some(k => k.startsWith(p.slice(0, 120)))) seen.set(p.slice(0, 160), `${kind} ${dir} draft: ${p.slice(0, 200)}`)
}
writeFileSync(`${OUT}/existing-transcripts.txt`, [...seen.values()].sort().join('\n') + '\n')
writeFileSync(`${OUT}/existing-names.json`, JSON.stringify(Object.fromEntries([...names].sort()), null, 0))
console.log(`rows ${n} of ${count}; openings ${seen.size}; capitalised words ${names.size} (${added} from iTEP reading drafts)`)
