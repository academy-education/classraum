import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const rows=[]
for(let from=0;;from+=1000){
  const {data,error}=await db.from('study_item_bank').select('id,family,domain,subskill,cohort,verified,archived,difficulty,passage_group_id,content_sha,created_at,item').eq('family','sat').eq('domain','Craft and Structure').range(from,from+999)
  if(error){console.error(error.message);process.exit(1)}
  rows.push(...data); if(data.length<1000) break
}
console.log('ALL rows (any verified/archived):', rows.length)
const live=rows.filter(r=>r.verified===true && r.archived===false)
console.log('LIVE (verified=true, archived=false):', live.length)
const tally=(arr,f)=>{const m={};for(const r of arr)m[f(r)??'(null)']=(m[f(r)??'(null)']||0)+1;return Object.entries(m).sort((a,b)=>b[1]-a[1])}
console.log('\n-- by verified/archived --'); console.log(tally(rows,r=>`v=${r.verified} a=${r.archived}`))
console.log('\n-- LIVE by cohort --'); for(const [k,v] of tally(live,r=>r.cohort)) console.log(String(v).padStart(5),k)
console.log('\n-- LIVE by subskill --'); for(const [k,v] of tally(live,r=>r.subskill)) console.log(String(v).padStart(5),k)
console.log('\n-- LIVE by difficulty --'); console.log(tally(live,r=>r.difficulty))
console.log('\n-- LIVE cohort x subskill --')
const m={}; for(const r of live){const k=`${r.cohort} :: ${r.subskill}`; m[k]=(m[k]||0)+1}
for(const [k,v] of Object.entries(m).sort()) console.log(String(v).padStart(5),k)
console.log('\n-- LIVE created_at range by cohort --')
const c={}; for(const r of live){(c[r.cohort]??=[]).push(r.created_at)}
for(const [k,v] of Object.entries(c)) console.log(k, v.sort()[0], '->', v.sort().slice(-1)[0])
