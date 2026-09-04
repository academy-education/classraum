import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const rows=[]
for(let from=0;;from+=1000){
  const {data,error}=await db.from('study_item_bank').select('id,subskill,cohort,difficulty,verified,archived,item').eq('family','sat').eq('domain','Information and Ideas').range(from,from+999)
  if(error)throw error; rows.push(...data); if(data.length<1000) break
}
// key on prompt+passage per CLAUDE.md
const norm=s=>String(s??'').replace(/\s+/g,' ').trim()
const map=new Map()
for(const r of rows) map.set(norm(r.item.prompt)+'||'+norm(r.item.passage), r)
const b=JSON.parse(readFileSync('scripts/study-bank/live-ii-control.batch.json','utf8'))
let hit=0
for(const it of b){
  const r=map.get(norm(it.prompt)+'||'+norm(it.passage))
  if(r){hit++; console.log(it.id, '->', r.cohort, '|', r.subskill, '| v='+r.verified, 'a='+r.archived, '|', r.difficulty)}
  else console.log(it.id, '-> NO MATCH')
}
console.log('matched', hit, 'of', b.length)
