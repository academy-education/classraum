// Print the actual text of proposed clusters. The previous dry run's
// numbers looked fine and the PROPOSAL was wrong; only reading the
// items caught it.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(process.cwd()+'/.env.local','utf8').split('\n')
  .filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}})
const norm = s => String(s??'').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim()
const qs = it => { const c = Array.isArray(it?.choices)?it.choices.map(x=>typeof x==='string'?x:x?.text??''):[]
  return norm([it?.prompt??'',...c.slice().sort(),it?.graphic?JSON.stringify(it.graphic):''].join(' ')) }
const sh = (t,k=5)=>{const s=t.replace(/\s+/g,' ');if(s.length<=k)return new Set(s?[s]:[]);const o=new Set();for(let i=0;i+k<=s.length;i++)o.add(s.slice(i,i+k));return o}
const jac=(a,b)=>{if(!a.size||!b.size)return 0;let i=0;for(const x of a)if(b.has(x))i++;return i/(a.size+b.size-i)}
const keyOf = it => { const raw=it?.correct_answer; if(raw==null)return null
  const ch=Array.isArray(it?.choices)?it.choices.map(c=>typeof c==='string'?c:c?.text??''):[]
  if(typeof raw==='number')return norm(ch[raw]??'')
  const s=String(raw).trim(); const L=/^[A-Da-d]$/.test(s)?ch['ABCD'.indexOf(s.toUpperCase())]:null
  return norm(L??s) }

const rows=[]
for(let f=0;;f+=1000){const {data,error}=await db.from('study_item_bank').select('id,domain,item')
  .eq('family','sat').eq('archived',false).range(f,f+999)
  if(error)throw new Error(error.message); rows.push(...(data??[])); if(!data||data.length<1000)break}

const ps = it => norm(it?.passage ?? '')
const by=new Map()
for(const r of rows){ if(!by.has(r.domain))by.set(r.domain,[]); by.get(r.domain).push({...r,q:sh(qs(r.item)),p:sh(ps(r.item)),k:keyOf(r.item)}) }
const pairs=[]
for(const items of by.values())
  for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
    const A=items[i],B=items[j]
    const q=jac(A.q,B.q); if(q<0.5) continue
    // the REAL rule, passage test included
    if(A.p.size||B.p.size){ if(jac(A.p,B.p)<0.5) continue }
    if(!A.k||A.k!==B.k) continue
    pairs.push({a:A,b:B,q})}
pairs.sort((x,y)=>y.q-x.q)
const isNum = k => /^-?\d+(\.\d+)?$/.test(k)
const numeric = pairs.filter(p=>isNum(p.a.k)), textual = pairs.filter(p=>!isNum(p.a.k))
console.log(`PROPOSED pairs under the real rule: ${pairs.length}`)
console.log(`  numeric answer  ${numeric.length}   <- same-answer is WEAK here; small integers collide`)
console.log(`  textual answer  ${textual.length}   <- same-answer is strong here\n`)
for(const p of pairs.slice(0,3).concat(pairs.slice(-2))){
  console.log('─'.repeat(70)); console.log(`q=${p.q.toFixed(3)}  ${p.a.domain}  answer="${p.a.k.slice(0,40)}"`)
  console.log('A:', String(p.a.item.prompt).replace(/\s+/g,' ').slice(0,200))
  console.log('B:', String(p.b.item.prompt).replace(/\s+/g,' ').slice(0,200))
}
