#!/usr/bin/env node
/* REGISTER item: "Explanations cite option positions that don't match
 * stored order."
 *
 * A student answers, gets it wrong, and reads an explanation that says
 * "the answer is (C)" while the key sits in slot A. That is a bug the
 * student SEES, unlike everything else measured this week.
 *
 * Exactly decidable, so per MATH-HUB-RESULT.md check the whole
 * population rather than sampling it. */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env=Object.fromEntries(readFileSync(process.cwd()+'/.env.local','utf8').split('\n')
  .filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})

const rows=[]
for(let f=0;;f+=1000){
  const {data,error}=await db.from('study_item_bank').select('id, family, domain, item')
    .eq('archived',false).range(f,f+999)
  if(error)throw new Error(`study_item_bank: ${error.message}`)
  rows.push(...(data??[])); if(!data||data.length<1000)break
}
if(!rows.length) throw new Error('no live items — refusing to report on nothing')

const norm=s=>String(s??'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'').trim()
function keyLetter(it){
  const ch=Array.isArray(it?.choices)?it.choices.map(c=>typeof c==='string'?c:c?.text??''):[]
  const raw=it?.correct_answer
  if(raw==null||!ch.length)return null
  if(typeof raw==='number') return raw>=0&&raw<ch.length ? 'ABCDE'[raw] : null
  const s=String(raw).trim()
  if(/^[A-Ea-e]$/.test(s)) return s.toUpperCase()
  const i=ch.findIndex(c=>norm(c)===norm(s))
  return i>=0 ? 'ABCDE'[i] : null
}
// "the answer is (C)", "Choice B is correct", "option D is right"
/* The letter must be UPPERCASE and standalone.
 *
 * The first version used /i and matched ordinary prose in all six of
 * its six "findings":
 *
 *   "answer a formatting question that was never asked"   -> "answer a"
 *   "option (a methodological limit on generalizability)" -> "option (a"
 *   "The 7 option is a root of the equation"              -> "option is a"
 *   "assumes the angle is right"                          -> "e is right"
 *
 * A 100% false-positive rate on a six-item finding. The article "a" and
 * the letter "A" are not the same token, and (?![A-Za-z]) stops a
 * capture in the middle of a word. */
const CITE=[
  /\b(?:answer|choice|option)\s+(?:is\s+)?\(?([A-E])\)?(?![A-Za-z])/g,
  /\(([A-E])\)\s+is\s+(?:the\s+)?(?:correct|right)\b/g,
]

let withExpl=0, cited=0, mismatch=0, noKey=0
const bad=[]
for(const r of rows){
  const it=r.item, ex=String(it?.explanation??'')
  if(!ex.trim())continue
  withExpl++
  const kl=keyLetter(it)
  if(!kl){noKey++;continue}
  const found=new Set()
  for(const re of CITE){re.lastIndex=0;let m;while((m=re.exec(ex)))found.add(m[1].toUpperCase())}
  if(!found.size)continue
  cited++
  // Only a defect when the explanation names EXACTLY ONE letter and it
  // is not the key. Explanations that walk through several options
  // legitimately name all of them.
  if(found.size===1 && !found.has(kl)){
    mismatch++
    // Record the MATCHED SPAN, not just the letter. A count of six is
    // small enough that a single regex artefact would be most of it.
    let span=''
    for(const re of CITE){re.lastIndex=0;let m;while((m=re.exec(ex))) span=m[0]}
    bad.push({id:r.id,family:r.family,domain:r.domain,key:kl,cites:[...found][0],
      span, explanation:ex.replace(/\s+/g,' ')})
  }
}
console.log(`\nEXPLANATION vs STORED OPTION ORDER — whole live bank\n`)
console.log(`  live items                 ${rows.length}`)
console.log(`  with an explanation        ${withExpl}`)
console.log(`  explanation cites a letter ${cited}`)
console.log(`  key not resolvable         ${noKey}`)
const noKeyShapes={}
for(const r of rows){
  const it=r.item; if(!String(it?.explanation??'').trim())continue
  if(keyLetter(it))continue
  const ch=Array.isArray(it?.choices)?it.choices:[]
  const shape=!ch.length ? 'no choices (free response)' :
    it?.correct_answer==null ? 'correct_answer null' : 'key text matches no choice'
  noKeyShapes[shape]=(noKeyShapes[shape]??0)+1
}
for(const [k,v] of Object.entries(noKeyShapes).sort((a,b)=>b[1]-a[1])) console.log(`      ${String(v).padStart(4)}  ${k}`)
console.log(`  MISMATCH (student sees it) ${mismatch}` + (cited?`   ${(100*mismatch/cited).toFixed(1)}% of citing items`:''))
const byFam={}
for(const b of bad) byFam[`${b.family} / ${b.domain}`]=(byFam[`${b.family} / ${b.domain}`]??0)+1
if(mismatch){
  console.log(`\n  per cohort:`)
  for(const [k,v] of Object.entries(byFam).sort((a,b)=>b[1]-a[1])) console.log(`    ${k.padEnd(48)} ${v}`)
  console.log(`\n  examples:\n`)
  for(const b of bad.slice(0,8)){
    console.log(`    ${b.id}  [${b.family}/${b.domain}]  key=${b.key}  cites ${b.cites}`)
    console.log(`      MATCHED SPAN: "${b.span}"`)
    console.log(`      ${b.explanation}\n`)
  }
}
