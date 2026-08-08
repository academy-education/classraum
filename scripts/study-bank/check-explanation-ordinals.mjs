import fs from 'fs'
const env=fs.readFileSync('.env.local','utf8')
const g=k=>env.match(new RegExp('^'+k+'=(.*)$','m'))[1].trim()
const U=g('NEXT_PUBLIC_SUPABASE_URL'),K=g('SUPABASE_SERVICE_ROLE_KEY')
async function all(q){let o=[],f=0
  for(;;){const r=await fetch(`${U}/rest/v1/study_item_bank?${q}`,{headers:{apikey:K,Authorization:'Bearer '+K,Range:`${f}-${f+999}`}})
    const d=await r.json(); if(!Array.isArray(d))throw new Error(JSON.stringify(d)); o=o.concat(d); if(d.length<1000)break; f+=1000}
  return o}
const ORD={first:0,second:1,third:2,fourth:3}
// SELFTEST on known data before pointing it at the bank.
const fx=[
 {n:'key cited as distractor -> flag',   ex:'the third echoes it', k:2, want:true},
 {n:'distractor cited -> no flag',       ex:'the second echoes it', k:2, want:false},
 {n:'ordinal in quoted stimulus -> skip',ex:'before my "first class" does', k:0, want:false},
 {n:'no ordinal -> no flag',             ex:'the reply agreeing declines', k:0, want:false},
]
const scan=(ex,keyIdx)=>{
  // strip quoted option/stimulus text: ordinals inside quotes are prose
  const bare=ex.replace(/[""][^""]*[""]/g,' ').replace(/"[^"]*"/g,' ')
  for(const m of bare.matchAll(/\bthe (first|second|third|fourth)\b/gi))
    if(ORD[m[1].toLowerCase()]===keyIdx) return true
  return false}
let bad=0
for(const t of fx){const got=scan(t.ex,t.k); if(got!==t.want){bad++;console.log('SELFTEST FAIL:',t.n,'got',got)}}
if(bad){console.log('detector is broken — not running it on the bank'); process.exit(1)}
console.log(`selftest: ${fx.length}/${fx.length} pass\n`)

const rows=await all('select=id,cohort,family,task,item&archived=is.false')
let withOrd=0,flagged=0; const byCohort={}
for(const r of rows){
  const it=r.item||{}, ex=it.explanation, ch=it.choices
  if(!ex||!Array.isArray(ch)) continue
  const ki=ch.indexOf(it.correct_answer); if(ki<0) continue
  const bare=ex.replace(/[“”][^“”]*[“”]/g,' ').replace(/"[^"]*"/g,' ')
  if(!/\bthe (first|second|third|fourth)\b/i.test(bare)) continue
  withOrd++
  if(scan(ex,ki)){flagged++; const c=r.cohort??'(none)'; byCohort[c]=(byCohort[c]||0)+1}
}
console.log('live items scanned            ',rows.length)
console.log('explanations citing an ordinal',withOrd)
console.log('PROVABLY WRONG (ordinal = key)',flagged, `(${(100*flagged/Math.max(withOrd,1)).toFixed(1)}% of those citing one)`)
console.log('by cohort:',JSON.stringify(byCohort))
