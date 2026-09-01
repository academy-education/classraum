#!/usr/bin/env node
/**
 * Apply blind difficulty grades to the bank.
 *
 * Writes `difficulty`, and records the provenance in verify_meta so the
 * next person can tell a measurement from a default. The bank has now
 * carried two labels that asserted something nobody measured — the
 * `|| 'hard'` insert default, and a grader_difficulty that held the
 * author's own self-report — so a grade that does not say where it came
 * from is not an improvement.
 *
 * REFUSES rather than guesses:
 *   - a ref that is not in the key
 *   - a key entry with no grade (a partial run must not half-apply)
 *   - a band that is not easy/medium/hard
 * A grading run that lost items should be re-run, not patched over.
 *
 *   node apply-difficulty-grades.mjs <section> [--apply]
 */
import { readFileSync, readdirSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env=Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const SECTION=process.argv[2]||'reading'
const APPLY=process.argv.includes('--apply')
const DIR='scripts/study-bank/difficulty-grade'
const BANDS=new Set(['easy','medium','hard'])

const key=JSON.parse(readFileSync(`${DIR}/${SECTION}.key.json`,'utf8'))
const byRef=new Map(key.map(k=>[k.ref,k]))

const grades=new Map()
for(const f of readdirSync(DIR).filter(f=>f.startsWith(`${SECTION}-graded`)&&f.endsWith('.json'))){
  for(const g of JSON.parse(readFileSync(`${DIR}/${f}`,'utf8'))){
    if(!byRef.has(g.ref)){ console.error(`REFUSED: ${f} grades ${g.ref}, which is not in the key`); process.exit(1) }
    if(!BANDS.has(g.difficulty)){ console.error(`REFUSED: ${g.ref} graded '${g.difficulty}'`); process.exit(1) }
    if(grades.has(g.ref)){ console.error(`REFUSED: ${g.ref} graded twice`); process.exit(1) }
    grades.set(g.ref,g)
  }
}
const missing=key.filter(k=>!grades.has(k.ref))
console.log(`${key.length} items keyed, ${grades.size} graded, ${missing.length} missing`)
if(missing.length){
  console.error(`REFUSED: ${missing.length} item(s) ungraded — a partial run must not half-apply.`)
  console.error(`  first few: ${missing.slice(0,5).map(m=>m.ref).join(', ')}`)
  process.exit(1)
}

/* What the grade CHANGES, before writing anything. */
const move={}
for(const k of key){
  const g=grades.get(k.ref)
  const t=`${k.stored} -> ${g.difficulty}`
  move[t]=(move[t]??0)+1
}
console.log('\nlabel movement:')
for(const [t,n] of Object.entries(move).sort((a,b)=>b[1]-a[1])) console.log('  ',String(n).padStart(4),t)
const after={}
for(const k of key){ const d=grades.get(k.ref).difficulty; after[d]=(after[d]??0)+1 }
const before={}
for(const k of key){ before[k.stored]=(before[k.stored]??0)+1 }
console.log('\nbefore:',JSON.stringify(before))
console.log('after :',JSON.stringify(after))

if(!APPLY){ console.log('\nDRY RUN — pass --apply to write'); process.exit(0) }

let n=0
for(const k of key){
  const g=grades.get(k.ref)
  const { data:row } = await db.from('study_item_bank').select('verify_meta').eq('id',k.id).single()
  const vm={ ...(row?.verify_meta??{}) }
  delete vm.difficulty_ungraded
  vm.grader_difficulty=g.difficulty
  vm.difficulty_graded_at='2026-09-01'
  vm.difficulty_graded_by='blind subagent grade, stored label withheld'
  vm.difficulty_before=k.stored
  vm.difficulty_why=g.why ?? null
  const { error } = await db.from('study_item_bank').update({ difficulty:g.difficulty, verify_meta:vm }).eq('id',k.id)
  if(error){ console.error('ERR',k.id,error.message); process.exit(1) }
  n++
}
/* Re-read and CHECK. */
const check=[]
for(let f=0;;f+=1000){
  const {data}=await db.from('study_item_bank').select('difficulty,verify_meta')
    .eq('family','toefl').eq('section',SECTION).eq('archived',false).eq('verified',true).range(f,f+999)
  check.push(...(data??[])); if(!data||data.length<1000) break
}
const dist={}; let graded=0
for(const r of check){ dist[r.difficulty]=(dist[r.difficulty]??0)+1; if(r.verify_meta?.grader_difficulty) graded++ }
console.log(`\nupdated ${n}`)
console.log('verified in DB:',JSON.stringify(dist),` graded ${graded}/${check.length}`)
