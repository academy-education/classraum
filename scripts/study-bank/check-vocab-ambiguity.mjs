#!/usr/bin/env node
/**
 * A vocabulary-in-context stem that names a word appearing MORE THAN
 * ONCE in the region it points at.
 *
 * Found by a human on 2026-09-01, in 10 minutes, on his first real
 * sitting. The item: 'As it is used in the third paragraph, the word
 * "keep" most nearly means'. That paragraph uses "keep" four times, in
 * four different senses — storing, a fortress, board and lodging, and
 * observing a feast — and every option is defensible depending on which
 * one the student reads.
 *
 * No machine gate here could see it. The key is correct for ONE
 * occurrence, the options are all real senses, the blind attack cannot
 * fire because the stem gives nothing away, and every structural check
 * passes. It needed someone to read the paragraph.
 *
 * But the defect is DECIDABLE, so the whole population is checked
 * rather than sampled — the same rule that measured the SAT maths hub
 * exactly instead of trusting a sampled 64.4%.
 *
 * Flags only where the stem POINTS at a region (a numbered paragraph,
 * or the passage as a whole) without quoting a sentence. A stem that
 * says "in the paragraph describing the second season" has done the
 * disambiguating and is not flagged.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env=Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})

const ORD={first:0,second:1,third:2,fourth:3,fifth:4,final:-1,last:-1}

/** The quoted target word, if the stem is a vocab-in-context item. */
function target(prompt){
  const m=String(prompt).match(/\bthe word\s+["'“‘]?([A-Za-z-]+)["'”’]?/i)
    || String(prompt).match(/["'“‘]([A-Za-z-]+)["'”’]\s+most nearly means/i)
  return m ? m[1] : null
}
/** Which region the stem points at: an ordinal paragraph, or the whole text. */
function region(prompt, passage){
  const paras=String(passage).split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean)
  const om=String(prompt).match(/\b(first|second|third|fourth|fifth|final|last)\s+paragraph\b/i)
  if(om){
    const i=ORD[om[1].toLowerCase()]
    const p=i<0?paras[paras.length-1]:paras[i]
    return { text:p??'', scoped:true }
  }
  /* A stem that describes the paragraph ("the paragraph describing the
     second season") has disambiguated by content; not our case. */
  if(/\bparagraph\s+(describing|about|on)\b/i.test(prompt)) return null
  if(/\bin the passage\b|\bas used in the (text|passage)\b/i.test(prompt)) return { text:String(passage), scoped:false }
  return null
}

const FAMS=[['toefl','reading'],['sat','reading_writing'],['ssat','reading'],['isee','reading'],['ssat','verbal'],['isee','verbal']]
let grand=0, grandN=0
for(const [fam,sec] of FAMS){
  const rows=[]
  for(let f=0;;f+=1000){
    const {data,error}=await db.from('study_item_bank').select('id,cohort,item')
      .eq('family',fam).eq('section',sec).eq('archived',false).eq('verified',true).range(f,f+999)
    if(error) throw new Error(error.message)
    rows.push(...(data??[])); if(!data||data.length<1000) break
  }
  const bad=[]
  let vocab=0
  for(const r of rows){
    const w=target(r.item?.prompt); if(!w) continue
    const reg=region(r.item?.prompt, r.item?.passage||''); if(!reg) continue
    vocab++
    const n=(reg.text.match(new RegExp(`\\b${w}\\w*\\b`,'gi'))??[]).length
    if(n>1) bad.push({id:r.id, cohort:r.cohort, word:w, n, scoped:reg.scoped})
  }
  grand+=bad.length; grandN+=vocab
  console.log(`${fam}/${sec}: ${rows.length} items, ${vocab} vocab-in-context with a pointed region, ${bad.length} AMBIGUOUS`)
  for(const b of bad.slice(0,6)) console.log(`   "${b.word}" x${b.n} in the ${b.scoped?'named paragraph':'passage'}  ${b.cohort}  ${b.id.slice(0,8)}`)
}
console.log(`\nTOTAL: ${grand} of ${grandN} pointed vocab items are ambiguous (${grandN?(100*grand/grandN).toFixed(1):0}%)`)
process.exit(grand?1:0)
