/** Confirmation file: the one EoI stratum that refused the prediction (eoi-v6
 *  transitions, 66.7% on n=8) plus rsw2, thinnest RS stratum. Keys flat 6/6/6/6. */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
let s = 424242 >>> 0
const rand = () => ((s = (s*1664525 + 1013904223) >>> 0) / 2**32)
const shuffle = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a }
const rows=[]
for(let from=0;;from+=1000){
  const {data,error}=await db.from('study_item_bank').select('id,subskill,cohort,difficulty,item').eq('family','sat').eq('domain','Expression of Ideas').eq('verified',true).eq('archived',false).range(from,from+999)
  if(error)throw error; rows.push(...data); if(data.length<1000) break
}
const used=new Set()
for(const t of ['eoilive-f1','eoilive-f2','eoilive-f3'])
  for(const m of Object.values(JSON.parse(readFileSync(`scripts/study-bank/${t}.meta.json`,'utf8')))) used.add(m.item_id)
console.log('already drawn', used.size)
const pick=(coh,n)=>{const a=rows.filter(r=>r.cohort===coh&&!used.has(r.id));console.log(coh,'available',a.length,'taking',n);if(a.length<n)throw new Error('short');return shuffle(a).slice(0,n)}
const list=[...pick('eoi-v6',17), ...pick('rsw2',7)]
if(list.length!==24) throw new Error('bad size')
const LETTERS=['A','B','C','D']
const order=shuffle(list), slots=shuffle(LETTERS.flatMap(L=>[L,L,L,L,L,L]))
const blind={},keyf={},meta={}
order.forEach((r,i)=>{
  const n=String(i+1), target=slots[i], ans=r.item.correct_answer
  const others=shuffle(r.item.choices.filter(c=>c!==ans))
  if(others.length!==3) throw new Error('bad choices '+r.id)
  const opts={}; let oi=0
  for(const L of LETTERS) opts[L]=(L===target)?ans:others[oi++]
  blind[n]={stem:r.item.prompt, options:opts}
  keyf[n]={letter:target,_item_id:r.id}
  meta[n]={item_id:r.id,cohort:r.cohort,subskill:(/transition/i.test(r.subskill)?'transitions':'rhetorical synthesis'),difficulty:r.difficulty}
})
const spread={}; for(const v of Object.values(keyf)) spread[v.letter]=(spread[v.letter]||0)+1
if(Object.values(spread).some(v=>v!==6)) throw new Error('keys not flat')
console.log('f4 key spread',JSON.stringify(spread),'dealt control 25.0%')
writeFileSync('scripts/study-bank/eoilive-f4.blind.json',JSON.stringify(blind,null,1))
writeFileSync('scripts/study-bank/eoilive-f4.key.json',JSON.stringify(keyf,null,1))
writeFileSync('scripts/study-bank/eoilive-f4.meta.json',JSON.stringify(meta,null,1))
