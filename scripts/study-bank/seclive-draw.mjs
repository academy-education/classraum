/**
 * Stratified live-SEC blind draw. Keys DEALT FLAT (6/6/6/6 per 24-item file)
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
  const {data,error}=await db.from('study_item_bank').select('id,subskill,cohort,difficulty,item').eq('family','sat').eq('domain','Standard English Conventions').eq('verified',true).eq('archived',false).range(from,from+999)
  if(error)throw error; rows.push(...data); if(data.length<1000) break
}
console.log('live SEC population', rows.length)
if(new Set(rows.map(r=>norm(r.item.prompt)+'||'+norm(r.item.passage))).size!==rows.length) throw new Error('prompt+passage not unique')

const prior=new Set(JSON.parse(readFileSync('scripts/study-bank/seclive-prior.json','utf8')))
const pool=rows.filter(r=>!prior.has(r.id))
console.log('pool after excluding', prior.size, 'previously attacked live items:', pool.length)

// FAMILY: the prediction is about punctuation/boundaries vs form/agreement
const PUNCT=/bound|punctuat|apostroph|possessiv|comma|semicolon|colon|dash/i
const fam = r => PUNCT.test(r.subskill) ? 'punct' : 'form'
const grp = r => (r.cohort==='v2' ? 'v2' : 'newer') + '::' + fam(r)
const strata={}; for(const r of pool)(strata[grp(r)]??=[]).push(r)
for(const k of Object.keys(strata).sort()) console.log('  stratum', k, strata[k].length)

const PLAN = { 'v2::punct':18, 'v2::form':42, 'newer::punct':6, 'newer::form':6 }
const K=3
const files=Array.from({length:K},()=>[])
let cursor=0
for(const [k,n] of Object.entries(PLAN)){
  const avail=strata[k]??[]
  if(avail.length<n) throw new Error(`stratum ${k} has ${avail.length} < ${n}`)
  shuffle(avail).slice(0,n).forEach(r=>{ files[cursor%K].push(r); cursor++ })
}
files.forEach((f,i)=>{ if(f.length!==24) throw new Error(`file ${i+1} has ${f.length}`) })

const LETTERS=['A','B','C','D']
files.forEach((list,fi)=>{
  const order=shuffle(list)
  const slots=shuffle(LETTERS.flatMap(L=>[L,L,L,L,L,L]))
  const blind={}, keyf={}, meta={}
  order.forEach((r,i)=>{
    const n=String(i+1), target=slots[i], ans=r.item.correct_answer
    const others=shuffle(r.item.choices.filter(c=>c!==ans))
    if(others.length!==3) throw new Error('bad choices '+r.id)
    const opts={}; let oi=0
    for(const L of LETTERS) opts[L] = (L===target) ? ans : others[oi++]
    blind[n]={ stem:r.item.prompt, options:opts }
    keyf[n]={ letter:target, _item_id:r.id }
    meta[n]={ item_id:r.id, cohort:r.cohort, subskill:fam(r)+' | '+r.subskill.toLowerCase(), difficulty:r.difficulty }
  })
  const spread={}; for(const v of Object.values(keyf)) spread[v.letter]=(spread[v.letter]||0)+1
  if(Object.values(spread).some(v=>v!==6)) throw new Error('keys not flat')
  console.log(`file ${fi+1}: 24 items  key spread ${JSON.stringify(spread)}  dealt control 25.0%`)
  writeFileSync(`scripts/study-bank/seclive-f${fi+1}.blind.json`, JSON.stringify(blind,null,1))
  writeFileSync(`scripts/study-bank/seclive-f${fi+1}.key.json`, JSON.stringify(keyf,null,1))
  writeFileSync(`scripts/study-bank/seclive-f${fi+1}.meta.json`, JSON.stringify(meta,null,1))
  const bys={}; for(const m of Object.values(meta)){const k=m.cohort+'::'+m.subskill.split(' | ')[0]; bys[k]=(bys[k]||0)+1}
  console.log('   ', JSON.stringify(bys))
})
const all=files.flat().map(r=>r.id)
if(new Set(all).size!==all.length) throw new Error('duplicate item across files')
console.log('total drawn', all.length, 'unique', new Set(all).size)
