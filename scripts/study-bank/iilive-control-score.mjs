/** Re-score the earlier 24-item live I&I control, with strata resolved by prompt+passage. */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const rows=[]
for(let from=0;;from+=1000){
  const {data,error}=await db.from('study_item_bank').select('id,subskill,cohort,difficulty,verified,archived,item').eq('family','sat').eq('domain','Information and Ideas').range(from,from+999)
  if(error)throw error; rows.push(...data); if(data.length<1000) break
}
const norm=s=>String(s??'').replace(/\s+/g,' ').trim()
const map=new Map(); for(const r of rows) map.set(norm(r.item.prompt)+'||'+norm(r.item.passage), r)
const batch=JSON.parse(readFileSync('scripts/study-bank/live-ii-control.batch.json','utf8'))
const byLocal=new Map(); for(const it of batch) byLocal.set(it.id, map.get(norm(it.prompt)+'||'+norm(it.passage)))
const D='scripts/study-bank/'
const key=JSON.parse(readFileSync(D+'live-ii-control.key.json','utf8'))
const sol=['a','b','c'].map(x=>JSON.parse(readFileSync(`${D}live-ii-control.solver-${x}.json`,'utf8')))
const nums=Object.keys(key)
for(const[i,s]of sol.entries()){const m=nums.filter(n=>!'ABCD'.includes(s[n]?.pick));if(m.length){console.error('REFUSING solver',i,m);process.exit(2)}}
const spread={};for(const n of nums)spread[key[n].letter]=(spread[key[n].letter]||0)+1
const ctl=Math.max(...Object.values(spread))/nums.length
const per={};let tot=0
for(const n of nums){const c=sol.filter(s=>s[n].pick===key[n].letter).length;per[n]=c;tot+=c}
console.log('items',nums.length,'key spread',JSON.stringify(spread),'dealt control',(100*ctl).toFixed(1)+'%')
sol.forEach((s,i)=>console.log(`  solver ${'abc'[i]}: ${(100*nums.filter(n=>s[n].pick===key[n].letter).length/nums.length).toFixed(1)}%`))
console.log('pooled',(100*tot/(nums.length*3)).toFixed(1)+'%','margin',(100*tot/(nums.length*3)-100*ctl).toFixed(1))
console.log('all-3 solved',nums.filter(n=>per[n]===3).length+'/'+nums.length,' none',nums.filter(n=>per[n]===0).length)
console.log('identical pick-strings:',new Set(sol.map(s=>nums.map(n=>s[n].pick).join(''))).size===1?'YES':'no')
const agg={}
const out=[]
for(const n of nums){
  const r=byLocal.get(key[n].localId)
  if(!r){console.error('NO MATCH for',key[n].localId);process.exit(2)}
  const k=r.cohort+' :: '+r.subskill.toLowerCase()
  ;(agg[k]??={n:0,c:0,all:0});agg[k].n++;agg[k].c+=per[n];if(per[n]===3)agg[k].all++
  out.push({item_id:r.id,cohort:r.cohort,subskill:r.subskill.toLowerCase(),difficulty:r.difficulty,correct:per[n],file:'live-ii-control',n})
}
console.log('per cohort x subskill:')
for(const[k,v]of Object.entries(agg).sort())console.log(String(v.n).padStart(4),(100*v.c/(v.n*3)).toFixed(1).padStart(6)+'%','all3='+v.all,' ',k)
import('node:fs').then(fs=>fs.writeFileSync(D+'iilive-control.rows.json',JSON.stringify(out,null,1)))
