/**
 * Stratified live-I&I blind draw. Keys DEALT FLAT (6/6/6/6 per 24-item file)
 * so a constant-letter solver scores exactly 25.0%.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
let s = 20260904 >>> 0
const rand = () => ((s = (s*1664525 + 1013904223) >>> 0) / 2**32)
const shuffle = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a }
const norm = x => String(x??'').replace(/\s+/g,' ').trim()

const rows=[]
for(let from=0;;from+=1000){
  const {data,error}=await db.from('study_item_bank').select('id,subskill,cohort,difficulty,item').eq('family','sat').eq('domain','Information and Ideas').eq('verified',true).eq('archived',false).range(from,from+999)
  if(error)throw error; rows.push(...data); if(data.length<1000) break
}
if(rows.length!==250) console.warn('WARNING population changed:',rows.length)
console.log('live population', rows.length, ' with graphic:', rows.filter(r=>r.item.graphic).length)

const prior=new Set(JSON.parse(readFileSync('scripts/study-bank/live-ii-control.batch.json','utf8')).map(it=>norm(it.prompt)+'||'+norm(it.passage)))
const pool=rows.filter(r=>!prior.has(norm(r.item.prompt)+'||'+norm(r.item.passage)))
console.log('pool after excluding the 24 already attacked:', pool.length)

const key = r => `${r.cohort}::${r.subskill.toLowerCase()}`
const strata={}; for(const r of pool)(strata[key(r)]??=[]).push(r)
for(const k of Object.keys(strata).sort()) console.log('  stratum', k, strata[k].length)

const PLAN = {
  'v2::inferences': 14,
  'v2::command of evidence': 14,
  'v2::command of textual evidence': 8,
  'v2::cross-text connections': 8,
  'v2::text structure and purpose': 8,
  'v2::central ideas and details': 9,
  'v2::command of evidence (textual)': 1,
  'rw-v7-ii-hard::command of evidence (quantitative)': 5,
  'rw-v7-ii-hard::command of evidence (textual)': 3,
  'rw-v7-ii-hard::inferences': 2,
}
const K=3
const files=Array.from({length:K},()=>[])
let cursor=0
for(const [k,n] of Object.entries(PLAN)){
  const avail=strata[k]??[]
  if(avail.length<n) throw new Error(`stratum ${k} has ${avail.length} < ${n}`)
  const picked=shuffle(avail).slice(0,n)
  picked.forEach(r=>{ files[cursor%K].push(r); cursor++ })
}
files.forEach((f,i)=>{ if(f.length!==24) throw new Error(`file ${i+1} has ${f.length}, expected 24`) })

const LETTERS=['A','B','C','D']
files.forEach((list,fi)=>{
  const order=shuffle(list)
  const slots=shuffle(LETTERS.flatMap(L=>[L,L,L,L,L,L]))
  const blind={}, keyf={}, meta={}
  order.forEach((r,i)=>{
    const n=String(i+1)
    const target=slots[i]
    const ans=r.item.correct_answer
    const others=shuffle(r.item.choices.filter(c=>c!==ans))
    if(others.length!==3) throw new Error('bad choices '+r.id)
    const opts={}
    let oi=0
    for(const L of LETTERS) opts[L] = (L===target) ? ans : others[oi++]
    blind[n]={ stem:r.item.prompt, options:opts }
    keyf[n]={ letter:target, _item_id:r.id }
    meta[n]={ item_id:r.id, cohort:r.cohort, subskill:r.subskill.toLowerCase(), difficulty:r.difficulty }
  })
  const spread={}; for(const v of Object.values(keyf)) spread[v.letter]=(spread[v.letter]||0)+1
  const ctl=Math.max(...Object.values(spread))/Object.keys(keyf).length
  console.log(`file ${fi+1}: 24 items  key spread ${JSON.stringify(spread)}  dealt control ${(100*ctl).toFixed(1)}%`)
  if(Object.values(spread).some(v=>v!==6)) throw new Error('keys not flat')
  writeFileSync(`scripts/study-bank/iilive-f${fi+1}.blind.json`, JSON.stringify(blind,null,1))
  writeFileSync(`scripts/study-bank/iilive-f${fi+1}.key.json`, JSON.stringify(keyf,null,1))
  writeFileSync(`scripts/study-bank/iilive-f${fi+1}.meta.json`, JSON.stringify(meta,null,1))
  const bys={}; for(const m of Object.values(meta)) bys[m.cohort+'::'+m.subskill]=(bys[m.cohort+'::'+m.subskill]||0)+1
  console.log('   ', JSON.stringify(bys))
})
const all=files.flat().map(r=>r.id)
if(new Set(all).size!==all.length) throw new Error('duplicate item across files')
console.log('total drawn', all.length, 'unique', new Set(all).size)
