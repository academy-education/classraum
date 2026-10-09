// Dump live (verified, not archived) TOEFL Announcement rows, paged + count-asserted.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
for (const l of readFileSync('.env.local','utf8').split('\n')) { const i=l.indexOf('='); if(i>0&&!l.startsWith('#')) process.env[l.slice(0,i).trim()] ??= l.slice(i+1).trim() }
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const rows=[]; for(let f=0;;f+=1000){const {data,error}=await db.from('study_item_bank').select('id,difficulty,cohort,item').eq('family','toefl').eq('section','listening').eq('verified',true).eq('archived',false).order('id').range(f,f+999); if(error) throw error; rows.push(...data); if(data.length<1000) break}
const { count } = await db.from('study_item_bank').select('id',{count:'exact',head:true}).eq('family','toefl').eq('section','listening').eq('verified',true).eq('archived',false)
if (count !== rows.length) { console.error('REFUSING: loaded', rows.length, 'count', count); process.exit(2) }
const ann = rows.filter(r=>r.item?.listeningTask==='announcement')
writeFileSync('scripts/study-bank/toefl-depth-work/ann-live.json', JSON.stringify(ann.map(r=>({id:r.id,difficulty:r.difficulty,cohort:r.cohort,...r.item})),null,1))
const g={}; for(const r of ann) (g[r.item.passageGroupId]??=[]).push(r)
const two = Object.values(g).filter(v=>v.length===2).flat()
writeFileSync('scripts/study-bank/toefl-depth-work/ann-control.items.json', JSON.stringify(two.map(r=>({id:r.id, ...r.item})),null,1))
console.log('listening live', rows.length, '| announcement', ann.length, 'in', Object.keys(g).length, 'sets | control two-set items', two.length)
