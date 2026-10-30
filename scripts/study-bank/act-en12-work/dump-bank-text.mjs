import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('/Users/andylee/Downloads/saas/classraum/.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')]}))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const texts = new Map()
for (const fam of ['act','ssat','isee']) {
  let from = 0
  for (;;) {
    const { data, error } = await db.from('study_item_bank').select('family,section,cohort,verified,item').eq('family', fam).range(from, from+999)
    if (error) { console.error(error); process.exit(2) }
    for (const r of data) { const it=r.item||{}; const p = it.passage||it.question?.passage||''; const key=r.family+'|'+r.section+'|'+(it.passage_title||'')+'|'+p.slice(0,60); if(!texts.has(key)) texts.set(key,{fam:r.family,sec:r.section,cohort:r.cohort,title:it.passage_title||'',text:p+' '+(it.prompt||'')}) }
    if (data.length < 1000) break; from += 1000
  }
}
console.log('rows grouped', texts.size)
writeFileSync(process.argv[2], JSON.stringify([...texts.values()]))
