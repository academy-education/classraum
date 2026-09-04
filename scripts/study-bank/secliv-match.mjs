import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const DOM=process.env.DOM
const rows=[]
for(let from=0;;from+=1000){
  const {data,error}=await db.from('study_item_bank').select('id,subskill,cohort,difficulty,verified,archived,item').eq('family','sat').eq('domain',DOM).range(from,from+999)
  if(error)throw error; rows.push(...data); if(data.length<1000) break
}
const live=rows.filter(r=>r.verified===true&&r.archived===false)
const norm=s=>String(s??'').replace(/\s+/g,' ').trim().toLowerCase()
const pp = it => norm(it.prompt)+'||'+norm(it.passage)
const ck = it => (it.choices||[]).map(norm).sort().join('~~')+'##'+norm(it.correct_answer)
// uniqueness diagnostics over the LIVE population
const u=k=>new Set(live.map(r=>k(r.item))).size
console.log(DOM,'live',live.length,' distinct prompt:',u(it=>norm(it.prompt)),' distinct prompt+passage:',u(pp),' distinct choicekey:',u(ck))
const byPP=new Map(), byCK=new Map()
for(const r of live){ byPP.set(pp(r.item),r); byCK.set(ck(r.item),r) }
const files=process.argv.slice(2)
const matched=new Set()
for(const f of files){
  const arr=JSON.parse(readFileSync(f,'utf8'))
  const items=Array.isArray(arr)?arr:Object.values(arr)
  let hp=0,hc=0,both=0,none=0
  for(const it of items){
    const a=byPP.get(pp(it)), b=byCK.get(ck(it))
    if(a)hp++; if(b)hc++
    if(a&&b){ both++; if(a.id!==b.id) console.log('  !! disagree', it.id, a.id, b.id) }
    const r=a||b
    if(r) matched.add(r.id); else none++
  }
  console.log(`${f.split('/').pop()}  n=${items.length}  prompt+passage ${hp}  choicekey ${hc}  agree ${both}  unmatched ${none}`)
}
console.log('TOTAL distinct live items previously attacked:', matched.size)
const bycoh={}; for(const r of live) if(matched.has(r.id)) bycoh[r.cohort]=(bycoh[r.cohort]||0)+1
console.log('  by cohort:', bycoh)
import { writeFileSync } from 'node:fs'
writeFileSync(`scripts/study-bank/${process.env.OUT}`, JSON.stringify([...matched],null,1))
