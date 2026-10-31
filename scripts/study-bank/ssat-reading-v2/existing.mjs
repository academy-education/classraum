// SSAT Reading v2: the d19 existing.mjs, writing to scratchpad/ssat-v2-work. Run from the repo root. Read-only on the bank.
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const out = new Map(); const att = []
for (const fam of ['ssat', 'isee']) {
  const { count } = await db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('family', fam).eq('section', 'reading')
  let n = 0
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank').select('id,cohort,verified,archived,subskill,item').eq('family', fam).eq('section', 'reading').order('id').range(from, from + 999)
    if (error) throw error
    n += data.length
    for (const r of data) {
      const p = (r.item?.passage || '').replace(/\s+/g, ' ').trim()
      if (p && !out.has(p.slice(0, 200))) out.set(p.slice(0, 200), `${fam} ${r.cohort} ${r.verified ? 'live' : 'staged'}${r.archived ? ' archived' : ''}: ${p.slice(0, 260)}`)
      if (fam === 'ssat' && r.subskill === 'attitude' && !r.archived) att.push(r.item.choices.map(c => c.toLowerCase()))
    }
    if (data.length < 1000) break
  }
  if (n !== count) throw new Error(`${fam}: read ${n} of ${count}`)
  console.log(fam, 'rows', n)
}
writeFileSync('scratchpad/ssat-v2-work/existing-passages.txt', [...out.values()].sort().join('\n') + '\n')
writeFileSync('scratchpad/ssat-v2-work/live-att.json', JSON.stringify(att))
console.log('passages', out.size, 'attitude sets', att.length)
