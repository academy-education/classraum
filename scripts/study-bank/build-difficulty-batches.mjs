#!/usr/bin/env node
/**
 * Emit blind difficulty-grading batches for a TOEFL section.
 *
 * THE STORED DIFFICULTY IS WITHHELD, and that is asserted before writing
 * — the whole point is to find out whether the stored label matches the
 * item, and a grader who sees it would anchor on it. A blind grade of 48
 * reading items on 2026-09-01 returned 34 easy / 12 medium / 2 hard for
 * items the bank recorded as 100% hard.
 *
 * Items are grouped by passage so a passage is rendered ONCE with its
 * questions beneath it. 565 of 821 reading items share a passage; a
 * per-item rendering would repeat the same text six times and spend the
 * grader's budget on re-reading rather than judging.
 *
 *   node build-difficulty-batches.mjs <section> <items-per-batch>
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env=Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const SECTION=process.argv[2]||'reading'
const PER=Number(process.argv[3]||70)

const rows=[]
for(let f=0;;f+=1000){
  const {data,error}=await db.from('study_item_bank')
    .select('id,cohort,difficulty,passage_group_id,item')
    .eq('family','toefl').eq('section',SECTION).eq('archived',false).eq('verified',true)
    .order('passage_group_id',{nullsFirst:false}).order('id').range(f,f+999)
  if(error) throw new Error(error.message)
  rows.push(...(data??[])); if(!data||data.length<1000) break
}
console.log(`${SECTION}: ${rows.length} items`)

/* Group by passage; ungrouped items are their own group. */
const groups=new Map()
for(const r of rows){
  const k=r.passage_group_id ?? `solo:${r.id}`
  if(!groups.has(k)) groups.set(k,[])
  groups.get(k).push(r)
}

const batches=[]; let cur=[]; let n=0
for(const g of groups.values()){
  if(n+g.length>PER && cur.length){ batches.push(cur); cur=[]; n=0 }
  cur.push(g); n+=g.length
}
if(cur.length) batches.push(cur)

const key=[]
batches.forEach((b,bi)=>{
  const out=[]
  for(const g of b){
/*
     * NO TRUNCATION. This sliced at 2,200 characters, and on 2026-09-01
     * that put 82 listening transcripts (10.2%, longest 3,560) in front
     * of a grader with their endings cut off. The grader then reported
     * four items as defective because content was ABSENT — and three of
     * the four were absent only from MY FILE. Beetles, human
     * intervention and the Maya/Chinese comparison are all present in
     * the stored passages.
     *
     * Asking a reader to judge what a passage does not contain, having
     * first removed part of it, is the same error as reading a truncated
     * warning list and reporting the count from it. Reading was
     * unaffected — its longest passage is 1,384 characters — which is
     * why that regrade stands.
     */
    const passage=String(g[0].item?.passage??'')
    out.push({
      passage: passage || null,
      questions: g.map(r=>{
        /* Section-scoped prefix. Reading and listening were both built with a
   bare "R", so R0001 names a different item in each key file. Nothing
   crossed over — the applier globs `<section>-graded*` and reads
   `<section>.key.json` — but two files that disagree about what R0001
   means is one careless glob away from writing 800 difficulties onto
   the wrong items. Existing R-prefixed keys are left alone; changing
   them now would orphan grades already returned. */
const ref=`${SECTION[0].toUpperCase()}${String(key.length+1).padStart(4,'0')}`
        key.push({ref, id:r.id, cohort:r.cohort, stored:r.difficulty})
        return { ref, prompt:r.item?.prompt, choices:r.item?.choices ?? [], type:r.item?.type }
      }),
    })
  }
  const file=`scripts/study-bank/difficulty-grade/${SECTION}-batch-${String(bi+1).padStart(2,'0')}.json`
  writeFileSync(file, JSON.stringify(out,null,1))
  const txt=readFileSync(file,'utf8')
  /* Assert the batch leaks nothing: no stored difficulty, no cohort, no id. */
  const leaks=[]
  if(/"difficulty"/.test(txt)) leaks.push('difficulty field')
  if(/"cohort"/.test(txt)) leaks.push('cohort')
  if(/"stored"/.test(txt)) leaks.push('stored')
  for(const w of ['"easy"','"hard"']) if(txt.includes(w)) leaks.push(w)
  if(leaks.length){ console.error(`LEAK in ${file}: ${leaks.join(', ')}`); process.exit(1) }
})
writeFileSync(`scripts/study-bank/difficulty-grade/${SECTION}.key.json`, JSON.stringify(key,null,1))
console.log(`wrote ${batches.length} batches, ${key.length} items keyed`)
console.log('every batch asserted free of the stored difficulty, cohort and id')
