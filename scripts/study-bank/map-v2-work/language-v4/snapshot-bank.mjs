import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const rows=[]
for (let f=0;;f+=1000){const {data,error}=await db.from('study_item_bank').select('id,cohort,domain,subskill,topic_tag,verified,archived,verify_meta,item').eq('family','map').eq('section','language').order('id').range(f,f+999); if(error) throw error; rows.push(...data); if(data.length<1000)break}
const c={}
for(const r of rows){const k=[r.cohort,r.domain,r.subskill,r.verified,r.archived].join(' | ');c[k]=(c[k]||0)+1}
console.log(rows.length);for(const [k,v] of Object.entries(c).sort())console.log(v,k)
const m=rows.find(r=>r.cohort==='map-language-v2-mechanics'); console.log(JSON.stringify(m.verify_meta).slice(0,800))
const fm={};for(const r of rows){const f=r.verify_meta?.map?.format;const k=r.cohort+' '+f;fm[k]=(fm[k]||0)+1};console.log(fm)
import('node:fs').then(fs=>fs.writeFileSync(process.argv[2],JSON.stringify(rows.map(r=>({id:r.id,cohort:r.cohort,domain:r.domain,subskill:r.subskill,verified:r.verified,archived:r.archived,prompt:r.item.prompt,passage:r.item.passage,choices:r.item.choices,key:r.item.correct_answer,meta:r.verify_meta?.map})))))
