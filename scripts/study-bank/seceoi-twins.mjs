/** Topic-twin detector: distinct passages that nonetheless treat the same subject.
 *  Rare-word Jaccard over passage text. Self-tested on a known pair first. */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const STOP=new Set('the a an and or but of to in for on with that this these those it its as at by from is are was were be been being not no than then which who whose whom what when where how their they them he she his her one two more most less least some any all such other others than only also however therefore thus while although though rather may might can could would should must have has had do does did if so because about into over under between among each both very much many few first second new old own same different'.split(' '))
const toks=s=>[...new Set(String(s??'').toLowerCase().replace(/[^a-z\s]/g,' ').split(/\s+/).filter(w=>w.length>5&&!STOP.has(w)))]
const jac=(a,b)=>{const A=new Set(a);let i=0;for(const w of b)if(A.has(w))i++;return i/(a.length+b.length-i)}
async function load(domain){const rows=[];for(let f=0;;f+=1000){const{data,error}=await db.from('study_item_bank').select('id,cohort,subskill,item').eq('family','sat').eq('domain',domain).eq('verified',true).eq('archived',false).range(f,f+999);if(error)throw error;rows.push(...data);if(data.length<1000)break}return rows}
// SELF-TEST: a passage against itself must be 1.0; against unrelated text must be low
{const a=toks('Kelp forests collapsed when urchin barrens expanded after otter predation ceased entirely'),b=toks('Kelp forests collapsed when urchin barrens expanded after otter predation ceased entirely'),c=toks('Renaissance printers standardized orthography through compositor conventions in vernacular workshops')
 if(jac(a,b)!==1) throw new Error('self-test failed: identical text not 1.0')
 if(jac(a,c)>0.05) throw new Error('self-test failed: unrelated text scored '+jac(a,c))
 console.log('self-test OK (identical=1.00, unrelated='+jac(a,c).toFixed(2)+')')}
for(const d of ['Standard English Conventions','Expression of Ideas']){
  const rows=await load(d)
  const T=rows.map(r=>({r,t:toks(r.item.passage)}))
  const pairs=[]
  for(let i=0;i<T.length;i++)for(let j=i+1;j<T.length;j++){const s=jac(T[i].t,T[j].t);if(s>=0.20)pairs.push([s,T[i].r,T[j].r])}
  pairs.sort((a,b)=>b[0]-a[0])
  const involved=new Set(); for(const[,x,y]of pairs){involved.add(x.id);involved.add(y.id)}
  console.log(`\n### ${d}: ${rows.length} live, ${pairs.length} topic-twin pairs at Jaccard>=0.20, ${involved.size} items involved (${(100*involved.size/rows.length).toFixed(1)}%)`)
  for(const[s,x,y]of pairs.slice(0,12)) console.log('  '+s.toFixed(2), x.cohort+'/'+x.subskill.slice(0,22), '<->', y.cohort+'/'+y.subskill.slice(0,22), '|', String(x.item.passage).slice(0,60).replace(/\s+/g,' '))
}
