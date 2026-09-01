/* Does every SECTION_TOPIC uuid resolve to the slug its comment claims?
   A wrong uuid attaches the session to the wrong topic, and
   familyFromTopicSlug then reads the wrong family — which silently drops
   the SSAT -1/4 penalty. Decidable, so check the whole map. */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env=Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const src=readFileSync('src/lib/study/section-topics.ts','utf8')
const pairs=[...src.matchAll(/(\w+):\s*'([0-9a-f-]{36})',\s*\/\/\s*([a-z0-9-]+)/g)].map(m=>({key:m[1],id:m[2],slug:m[3]}))
console.log('entries parsed:', pairs.length)
const ids=pairs.map(p=>p.id)
const {data,error}=await db.from('study_topics').select('id,slug').in('id',ids)
if(error){ console.log('ERR',error.message); process.exit(1) }
const byId=new Map((data??[]).map(t=>[t.id,t.slug]))
let bad=0
for(const p of pairs){
  const actual=byId.get(p.id)
  const ok = actual===p.slug
  if(!ok) bad++
  console.log(' ',ok?'ok  ':'BAD ',p.key.padEnd(16),'comment says',p.slug.padEnd(24),'db says',actual??'(NO SUCH TOPIC)')
}
console.log(bad? `\n${bad} MISMATCH` : '\nEvery uuid resolves to the slug its comment claims.')
