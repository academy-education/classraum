#!/usr/bin/env node
/**
 * Build-a-Sentence: does the stored chunk casing leak the opening word?
 *
 * MEASURED, AND DELIBERATELY NOT REPAIRED. 46 of 108 live items carry
 * exactly one capitalised chunk and in 44 of those it is the correct
 * opener — in the DATA, the capital is a positional tell. Students never
 * see it: the chip pool lowercases every chunk (src/lib/study/chip-display
 * .ts, pinned by chip-display.test.ts). Rewriting 44 live rows would be
 * churn with no student-visible effect, and every touched item is a fresh
 * chance to introduce a defect.
 *
 * This script exists so the number stays honest if the cohort grows, and
 * so nobody re-discovers the tell and "fixes" the data instead of the
 * render. If it ever reports a leak on a surface that does NOT lowercase,
 * that surface is the bug.
 */
import fs from 'fs'
const env=fs.readFileSync('.env.local','utf8')
const g=k=>env.match(new RegExp('^'+k+'=(.*)$','m'))[1].trim()
const U=g('NEXT_PUBLIC_SUPABASE_URL'),K=g('SUPABASE_SERVICE_ROLE_KEY')
const r=await fetch(U+'/rest/v1/study_item_bank?select=id,difficulty,item&item_type=eq.arrange_words&archived=is.false',
  {headers:{apikey:K,Authorization:'Bearer '+K}})
const rows=await r.json()
const fact=n=>{let f=1;for(let i=2;i<=n;i++)f*=i;return f}
const tell=[], clean=[]
for(const x of rows){
  const ch=x.item.choices||[]
  const ans=String(x.item.correct_answer||'').split('|').map(s=>s.trim()).filter(Boolean)
  const caps=ch.filter(c=>/^[A-Z]/.test(c))
  const leaks = caps.length===1 && caps[0].toLowerCase()===ans[0].toLowerCase()
  ;(leaks?tell:clean).push({id:x.id,n:ch.length,d:x.difficulty})
}
console.log(`leaking the opener: ${tell.length} items   clean: ${clean.length}`)
const byN={}, byD={}
tell.forEach(t=>{byN[t.n]=(byN[t.n]||0)+1; byD[t.d]=(byD[t.d]||0)+1})
console.log('\nchunks per leaking item:', JSON.stringify(byN))
console.log('difficulty of leaking items:', JSON.stringify(byD))
console.log('\nhow much the free opener is worth:')
Object.keys(byN).sort().forEach(n=>{
  const k=Number(n)
  console.log(`  ${n} chunks (${byN[n]} items): orderings ${fact(k)} -> ${fact(k-1)} once the opener is known  (${(100/fact(k-1)).toFixed(1)}% blind guess vs ${(100/fact(k)).toFixed(1)}%)`)
})
console.log('\nALSO capitalised-but-not-the-opener (a MISLEADING tell):')
let mis=0
for(const x of rows){
  const ch=x.item.choices||[]; const ans=String(x.item.correct_answer||'').split('|').map(s=>s.trim()).filter(Boolean)
  const caps=ch.filter(c=>/^[A-Z]/.test(c))
  if(caps.length===1 && caps[0].toLowerCase()!==ans[0].toLowerCase()) { mis++; if(mis<=2) console.log(`   ${x.id.slice(0,8)} cap="${caps[0]}" but opener="${ans[0]}"`) }
}
console.log(`   ${mis} items`)
import fs from 'fs'
const env=fs.readFileSync('.env.local','utf8')
const g=k=>env.match(new RegExp('^'+k+'=(.*)$','m'))[1].trim()
const U=g('NEXT_PUBLIC_SUPABASE_URL'),K=g('SUPABASE_SERVICE_ROLE_KEY')
const r=await fetch(U+'/rest/v1/study_item_bank?select=id,difficulty,item&item_type=eq.arrange_words&archived=is.false',
  {headers:{apikey:K,Authorization:'Bearer '+K}})
const rows=await r.json()
const fact=n=>{let f=1;for(let i=2;i<=n;i++)f*=i;return f}
const tell=[], clean=[]
for(const x of rows){
  const ch=x.item.choices||[]
  const ans=String(x.item.correct_answer||'').split('|').map(s=>s.trim()).filter(Boolean)
  const caps=ch.filter(c=>/^[A-Z]/.test(c))
  const leaks = caps.length===1 && caps[0].toLowerCase()===ans[0].toLowerCase()
  ;(leaks?tell:clean).push({id:x.id,n:ch.length,d:x.difficulty})
}
console.log(`leaking the opener: ${tell.length} items   clean: ${clean.length}`)
const byN={}, byD={}
tell.forEach(t=>{byN[t.n]=(byN[t.n]||0)+1; byD[t.d]=(byD[t.d]||0)+1})
console.log('\nchunks per leaking item:', JSON.stringify(byN))
console.log('difficulty of leaking items:', JSON.stringify(byD))
console.log('\nhow much the free opener is worth:')
Object.keys(byN).sort().forEach(n=>{
  const k=Number(n)
  console.log(`  ${n} chunks (${byN[n]} items): orderings ${fact(k)} -> ${fact(k-1)} once the opener is known  (${(100/fact(k-1)).toFixed(1)}% blind guess vs ${(100/fact(k)).toFixed(1)}%)`)
})
console.log('\nALSO capitalised-but-not-the-opener (a MISLEADING tell):')
let mis=0
for(const x of rows){
  const ch=x.item.choices||[]; const ans=String(x.item.correct_answer||'').split('|').map(s=>s.trim()).filter(Boolean)
  const caps=ch.filter(c=>/^[A-Z]/.test(c))
  if(caps.length===1 && caps[0].toLowerCase()!==ans[0].toLowerCase()) { mis++; if(mis<=2) console.log(`   ${x.id.slice(0,8)} cap="${caps[0]}" but opener="${ans[0]}"`) }
}
console.log(`   ${mis} items`)
