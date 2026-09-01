#!/usr/bin/env node
/**
 * Can "reject the absolute, pick the hedge" solve this bank WITHOUT the
 * passage?
 *
 * Raised by a difficulty grader on 2026-09-01, unprompted, while grading
 * 210 TOEFL reading items: "the wrong answer in EXCEPT / main-idea /
 * central-claim slots is overwhelmingly an ABSOLUTE (always, only,
 * never, entirely, solely) and the key is the hedged option. A solver
 * applying that rule with no passage would score far above chance."
 *
 * That is decidable, so it is measured over the whole population rather
 * than sampled — the standing rule for an arithmetic defect. It is also
 * a real strategy, not a proxy: the score below is what a candidate
 * using this one rule and reading nothing would actually get.
 *
 * Control is the best fixed slot, the same bar every blind attack here
 * uses. A strategy that only ties the control has found nothing.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env=Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})

/* Words that assert without exception. Deliberately narrow: "most" and
   "many" are hedges, not absolutes, and including them would inflate the
   hit rate by counting ordinary prose. */
const ABSOLUTE=/\b(always|never|only|solely|entirely|exclusively|all|none|every|no other|impossible|invariably|completely|totally|purely|must)\b/i

const hasAbs=s=>ABSOLUTE.test(String(s))

async function rows(family,section){
  const out=[]
  for(let f=0;;f+=1000){
    const {data,error}=await db.from('study_item_bank').select('family,section,cohort,item')
      .eq('family',family).eq('section',section).eq('archived',false).eq('verified',true).range(f,f+999)
    if(error) throw new Error(error.message)
    out.push(...(data??[])); if(!data||data.length<1000) break
  }
  return out
}

function measure(items,label){
  let n=0, keyAbs=0, anyDistAbs=0, solvable=0, correct=0
  const slots={}
  for(const r of items){
    const ch=r.item?.choices; const key=r.item?.correct_answer
    if(!Array.isArray(ch)||ch.length<2||typeof key!=='string') continue
    if(!ch.includes(key)) continue
    n++
    slots[ch.indexOf(key)]=(slots[ch.indexOf(key)]??0)+1
    const abs=ch.map(hasAbs)
    if(hasAbs(key)) keyAbs++
    if(ch.some((c,i)=>c!==key&&abs[i])) anyDistAbs++
    /* The strategy: if exactly one option lacks an absolute, choose it.
       Otherwise the rule does not fire and the candidate guesses. */
    const clean=ch.filter(c=>!hasAbs(c))
    if(clean.length===1){ solvable++; if(clean[0]===key) correct++ }
  }
  const ctl=100*Math.max(...Object.values(slots))/n
  console.log(`\n${label}  n=${n}`)
  console.log(`  key itself contains an absolute        ${(100*keyAbs/n).toFixed(1)}%`)
  console.log(`  at least one DISTRACTOR has an absolute ${(100*anyDistAbs/n).toFixed(1)}%`)
  console.log(`  rule fires (exactly one clean option)   ${(100*solvable/n).toFixed(1)}%  (${solvable} items)`)
  if(solvable) console.log(`  ...and when it fires it is RIGHT       ${(100*correct/solvable).toFixed(1)}%`)
  console.log(`  control (best fixed slot)               ${ctl.toFixed(1)}%`)
  if(solvable){
    const overall=100*correct/n
    console.log(`  strategy score over ALL items           ${overall.toFixed(1)}%   margin over control ${(overall-ctl>=0?'+':'')}${(overall-ctl).toFixed(1)}`)
  }
}

measure(await rows('toefl','reading'),'TOEFL reading')
measure(await rows('toefl','listening'),'TOEFL listening')
measure(await rows('sat','reading_writing'),'SAT reading & writing')
measure(await rows('ssat','reading'),'SSAT reading')
measure(await rows('isee','reading'),'ISEE reading')
