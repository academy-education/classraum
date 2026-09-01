#!/usr/bin/env node
/**
 * Can a candidate who cannot READ the passage still pick the answer by
 * matching strings against it?
 *
 * Four difficulty graders said some version of "the answer is stated
 * almost verbatim" and "a reader who can match a string gets it". That
 * is decidable, so it is measured over the whole population.
 *
 * The strategy is executed literally, as a real candidate could: score
 * each option by the longest run of its words that appears CONTIGUOUSLY
 * in the passage; pick the highest. No comprehension, no grammar, no
 * understanding of the question — just substring matching.
 *
 * Both directions matter and they pull opposite ways:
 *   - keys quoted verbatim  -> string-matching WINS, the item is
 *     answerable without reading
 *   - distractors quoted verbatim while the key paraphrases -> the
 *     classic echo trap, and string-matching LOSES. That is good item
 *     writing, and a score BELOW control is the sign of it.
 *
 * Control is the best fixed slot, the bar every blind attack here uses.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env=Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})

const STOP=new Set(['the','a','an','of','to','in','and','or','is','are','was','were','be','been','that','this','it','its','for','on','with','as','by','at','from','their','they','he','she','not'])
const words=s=>String(s).toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w&&!STOP.has(w))

/** Longest run of consecutive content words from `opt` found in `passage`. */
function longestRun(opt, passage){
  const w=words(opt); if(!w.length) return 0
  const p=' '+words(passage).join(' ')+' '
  let best=0
  for(let i=0;i<w.length;i++){
    for(let j=w.length;j>i+best;j--){
      if(p.includes(' '+w.slice(i,j).join(' ')+' ')){ best=Math.max(best,j-i); break }
    }
  }
  return best
}

async function run(fam,sec){
  const rows=[]
  for(let f=0;;f+=1000){
    const {data,error}=await db.from('study_item_bank').select('item')
      .eq('family',fam).eq('section',sec).eq('archived',false).eq('verified',true).range(f,f+999)
    if(error) throw new Error(error.message)
    rows.push(...(data??[])); if(!data||data.length<1000) break
  }
  let n=0, fires=0, right=0, keyLonger=0, distLonger=0
  const slots={}
  for(const r of rows){
    const it=r.item, ch=it?.choices, key=it?.correct_answer, pas=it?.passage
    if(!Array.isArray(ch)||ch.length<2||typeof key!=='string'||!ch.includes(key)||!pas) continue
    n++; slots[ch.indexOf(key)]=(slots[ch.indexOf(key)]??0)+1
    const runs=ch.map(c=>longestRun(c,pas))
    const kr=runs[ch.indexOf(key)]
    const maxOther=Math.max(...runs.filter((_,i)=>i!==ch.indexOf(key)))
    if(kr>maxOther) keyLonger++
    if(maxOther>kr) distLonger++
    const best=Math.max(...runs)
    const winners=ch.filter((_,i)=>runs[i]===best)
    if(winners.length===1){ fires++; if(winners[0]===key) right++ }
  }
  if(!n) return
  const ctl=100*Math.max(...Object.values(slots))/n
  const overall=100*right/n
  console.log(`\n${fam}/${sec}  n=${n}`)
  console.log(`  key has the longest verbatim run   ${(100*keyLonger/n).toFixed(1)}%`)
  console.log(`  a DISTRACTOR does (echo trap)      ${(100*distLonger/n).toFixed(1)}%`)
  console.log(`  strategy picks a unique winner     ${(100*fires/n).toFixed(1)}%`)
  console.log(`  strategy score / control           ${overall.toFixed(1)}% / ${ctl.toFixed(1)}%   margin ${(overall-ctl>=0?'+':'')}${(overall-ctl).toFixed(1)}`)
}
for(const [f,s] of [['toefl','reading'],['toefl','listening'],['sat','reading_writing'],['ssat','reading'],['isee','reading']]) await run(f,s)
