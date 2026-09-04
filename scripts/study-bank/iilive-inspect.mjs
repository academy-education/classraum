import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const rows=[]
for(let from=0;;from+=1000){
  const {data,error}=await db.from('study_item_bank').select('id,subskill,cohort,difficulty,passage_group_id,item').eq('family','sat').eq('domain','Information and Ideas').eq('verified',true).eq('archived',false).range(from,from+999)
  if(error)throw error; rows.push(...data); if(data.length<1000) break
}
console.log('live rows',rows.length)
const norm=x=>String(x??'').replace(/\s+/g,' ').trim()
const pk=new Map(), pp=new Map(), pr=new Map()
for(const r of rows){
  const k=norm(r.item.prompt)+'||'+norm(r.item.passage)
  pk.set(k,(pk.get(k)||0)+1)
  pp.set(norm(r.item.passage),(pp.get(norm(r.item.passage))||0)+1)
  pr.set(norm(r.item.prompt),(pr.get(norm(r.item.prompt))||0)+1)
}
console.log('unique prompt+passage keys', pk.size, 'collisions', [...pk.values()].filter(v=>v>1).length)
console.log('unique passages', pp.size, 'passages shared by >1 item', [...pp.values()].filter(v=>v>1).length, 'max share', Math.max(...pp.values()))
console.log('unique prompts', pr.size, 'prompt-only collisions', [...pr.values()].filter(v=>v>1).length)
const pg={}; for(const r of rows) if(r.passage_group_id) pg[r.passage_group_id]=(pg[r.passage_group_id]||0)+1
console.log('passage_group_id non-null items', Object.values(pg).reduce((a,b)=>a+b,0), 'groups', Object.keys(pg).length)
console.log('choice counts', JSON.stringify([...new Set(rows.map(r=>r.item.choices?.length))]))
console.log('items where correct_answer not in choices:', rows.filter(r=>!r.item.choices?.includes(r.item.correct_answer)).length)
console.log('items with null/empty passage:', rows.filter(r=>!norm(r.item.passage)).length)
console.log('item keys sample', JSON.stringify(Object.keys(rows[0].item)))
console.log('\n--- one sample item ---'); console.log(JSON.stringify(rows.find(r=>r.subskill==='Inferences').item,null,1).slice(0,1600))
