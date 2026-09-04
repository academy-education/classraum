import { readFileSync, existsSync } from 'node:fs'
const D='scripts/study-bank/'
const rows=[]
for(const tag of ['iilive-f1','iilive-f2','iilive-f3']){
  const key=JSON.parse(readFileSync(D+tag+'.key.json','utf8'))
  const meta=JSON.parse(readFileSync(D+tag+'.meta.json','utf8'))
  const SOLVERS = tag==='iilive-f2' ? ['d','e','f'] : ['a','b','c']  /* f2 a/b/c tripped the identical-pick-string void condition; d/e/f is the verdict-bearing re-run */
  const sol=SOLVERS.map(x=>JSON.parse(readFileSync(`${D}${tag}.solver-${x}.json`,'utf8')))
  const nums=Object.keys(key)
  for(const[i,s]of sol.entries()){const m=nums.filter(n=>!'ABCD'.includes(s[n]?.pick));if(m.length){console.error('REFUSING',tag,'abc'[i],m);process.exit(2)}}
  const strs=sol.map(s=>nums.map(n=>s[n].pick).join(''))
  console.log(tag,'pick-strings all identical:',new Set(strs).size===1?'YES -> VOID':'no','| distinct',new Set(strs).size)
  for(const n of nums) rows.push({...meta[n], key:key[n].letter, file:tag, n, correct:sol.filter(s=>s[n].pick===key[n].letter).length})
}
// fold in the earlier 24-item control if present
let ctlRows=[]
if(existsSync(D+'iilive-control.rows.json')) ctlRows=JSON.parse(readFileSync(D+'iilive-control.rows.json','utf8'))
const pct=(c,t)=>(100*c/t).toFixed(1)+'%'
const agg=(list,fn,label)=>{
  const m={}
  for(const r of list){const k=fn(r); (m[k]??={n:0,c:0,all:0,none:0}); m[k].n++; m[k].c+=r.correct; if(r.correct===3)m[k].all++; if(r.correct===0)m[k].none++}
  console.log('\n== '+label+' ==')
  console.log('  n   blind    all-3   none   stratum')
  for(const [k,v] of Object.entries(m).sort((a,b)=>b[1].n-a[1].n))
    console.log(String(v.n).padStart(3), pct(v.c,v.n*3).padStart(7), String(v.all).padStart(6), String(v.none).padStart(6), '  '+k)
}
console.log('\n### FRESH DRAW ONLY (72 items, 9 solvers) ###')
console.log('TOTAL items', rows.length, 'pooled', pct(rows.reduce((a,r)=>a+r.correct,0), rows.length*3))
agg(rows,r=>r.cohort,'BY COHORT')
agg(rows,r=>r.subskill,'BY SUBSKILL (all cohorts)')
agg(rows,r=>r.cohort+' :: '+r.subskill,'BY COHORT x SUBSKILL')
agg(rows,r=>r.cohort+' :: '+r.difficulty,'BY COHORT x DIFFICULTY')
// per-stratum best-fixed-letter noise control
console.log('\n== per-subskill best-fixed-letter control (noise check; expectation 25%) ==')
{const m={};for(const r of rows){(m[r.subskill]??={n:0,L:{}});m[r.subskill].n++;m[r.subskill].L[r.key]=(m[r.subskill].L[r.key]||0)+1}
 for(const[k,v]of Object.entries(m).sort())console.log(String(v.n).padStart(3),(100*Math.max(...Object.values(v.L))/v.n).toFixed(1).padStart(6)+'%  '+k)}
console.log('\n== PER-ITEM SPLIT (fresh 72) ==')
for(const c of [3,2,1,0]) console.log(`  solved by ${c}/3 solvers: ${rows.filter(r=>r.correct===c).length}`)
console.log('  v2 only:'); for(const c of [3,2,1,0]) console.log(`    ${c}/3: ${rows.filter(r=>r.cohort==='v2'&&r.correct===c).length}`)
console.log('  rw-v7-ii-hard only:'); for(const c of [3,2,1,0]) console.log(`    ${c}/3: ${rows.filter(r=>r.cohort!=='v2'&&r.correct===c).length}`)

if(ctlRows.length){
  const all=[...rows,...ctlRows]
  const ids=new Set(all.map(r=>r.item_id))
  console.log('\n\n### FRESH DRAW + EARLIER 24-ITEM CONTROL ###')
  console.log('TOTAL measured items',all.length,'unique',ids.size,'pooled',pct(all.reduce((a,r)=>a+r.correct,0), all.length*3))
  agg(all,r=>r.cohort,'BY COHORT (combined)')
  agg(all,r=>r.cohort+' :: '+r.subskill,'BY COHORT x SUBSKILL (combined)')
  console.log('\n== PER-ITEM SPLIT (combined) ==')
  for(const c of [3,2,1,0]) console.log(`  solved by ${c}/3: ${all.filter(r=>r.correct===c).length}`)
  console.log('  v2 only:'); for(const c of [3,2,1,0]) console.log(`    ${c}/3: ${all.filter(r=>r.cohort==='v2'&&r.correct===c).length}`)
}
