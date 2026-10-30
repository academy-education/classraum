import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const ROOT='/Users/andylee/Downloads/saas/classraum'
const env = Object.fromEntries(readFileSync(ROOT+'/.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const fams=['map','ssat','isee','act','toefl']
const scope=q=>q.in('family',fams).in('section',['reading','verbal']).or('archived.is.null,archived.eq.false')
const {count,error:ce}=await scope(db.from('study_item_bank').select('id',{count:'exact',head:true}))
if(ce) throw ce
const rows=[]
for(let f=0;;f+=1000){const {data,error}=await scope(db.from('study_item_bank').select('id,family,section,domain,subskill,verified,cohort,item,verify_meta,created_at')).order('id').range(f,f+999); if(error) throw error; rows.push(...data); if(data.length<1000)break}
if(rows.length!==count){console.error('truncated',rows.length,count);process.exit(2)}
const seen=new Map()
for(const r of rows){const p=r.item?.passage; if(!p||p.length<300) continue; const k=p.slice(0,200); if(seen.has(k)) continue; seen.set(k,`[${r.family} ${r.verified?'live':'staged'}] ${p.replace(/\s+/g,' ').slice(0,250)}`)}
// MRV3 held passages
for(const f of ['R1.json','R2.json']){for(const s of JSON.parse(readFileSync(ROOT+'/scratchpad/map-v3-read-work/'+f,'utf8'))) seen.set('mrv3'+s.passage_id,`[map held-MRV3] ${s.title}: ${s.passage.replace(/\s+/g,' ').slice(0,250)}`)}
const lines=[...seen.values()].sort()
writeFileSync(ROOT+'/scripts/study-bank/map-v2-work/reading-b3/EXCLUSIONS-reading-passages.txt',`# Opening of every reading passage in the bank (${lines.length} passages from ${rows.length} rows; map, ssat, isee, act, toefl reading/verbal; live and staged; archived excluded) + the 20 held MRV3 passages. Dumped read-only 2026-10-31.\n# Your passage must not share a subject, central object, or situation with any line here.\n`+lines.join('\n')+'\n')
// vocab words
const old=readFileSync(ROOT+'/scripts/study-bank/map-v2-work/reading-b2/EXCLUSIONS-vocab-words.txt','utf8').split('\n').filter(l=>l&&!l.startsWith('#'))
const words=new Map(old.map(l=>[l.replace(/\s*\(.*\)$/,'').trim().toLowerCase(),l]))
let added=0
for(const r of rows){const tw=r.verify_meta?.map?.target_word; if(tw){const w=tw.toLowerCase().trim(); if(!words.has(w)){words.set(w,`${w} (${r.family} ${r.cohort})`);added++}}
 const pr=r.item?.prompt||''; const m=pr.match(/(?:word|phrase|prefix|suffix|root)\s+["“]?([a-z][a-z' -]{1,40}?)["”]?\s+(?:mean|most nearly|as it is used|suggest|in (?:the|this)|best)/i); if(m){const w=m[1].toLowerCase().trim(); if(!words.has(w)){words.set(w,`${w} (${r.family} ${r.cohort} prompt)`);added++}}}
for(const f of ['V1.json','V2.json']) for(const it of JSON.parse(readFileSync(ROOT+'/scratchpad/map-v3-read-work/'+f,'utf8'))){const w=it.target_word.toLowerCase(); if(!words.has(w)){words.set(w,`${w} (map MRV3 staged)`);added++}}
const wl=[...words.values()].sort()
writeFileSync(ROOT+'/scripts/study-bank/map-v2-work/reading-b3/EXCLUSIONS-vocab-words.txt',`# Words already tested by a vocabulary item in the bank (${wl.length}; b2 list + verify_meta target words + prompt-extracted + MRV3 40; live + staged). Do not test any of these. Dumped 2026-10-31.\n`+wl.join('\n')+'\n')
console.log('rows',rows.length,'passages',lines.length,'vocab',wl.length,'added',added)
const mapr=rows.filter(r=>r.family==='map'&&r.section==='reading')
const t={};for(const r of mapr){const k=`${r.domain}|${r.verified?'live':'staged'}|${r.cohort}`;t[k]=(t[k]||0)+1}
console.log(t)
