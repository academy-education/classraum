import { readFileSync } from 'node:fs'
const D='scripts/study-bank/'
const rows=[]
for(const tag of ['cslive-f1','cslive-f2','cslive-f3']){
  const key=JSON.parse(readFileSync(D+tag+'.key.json','utf8'))
  const meta=JSON.parse(readFileSync(D+tag+'.meta.json','utf8'))
  const sol=['a','b','c'].map(x=>JSON.parse(readFileSync(`${D}${tag}.solver-${x}.json`,'utf8')))
  for(const n of Object.keys(key)){
    rows.push({...meta[n], file:tag, n, correct:sol.filter(s=>s[n].pick===key[n].letter).length, solvers:3})
  }
}
const pct=(c,t)=>(100*c/t).toFixed(1)+'%'
const agg=(fn,label)=>{
  const m={}
  for(const r of rows){const k=fn(r); (m[k]??={n:0,c:0,all:0,none:0}); m[k].n++; m[k].c+=r.correct; if(r.correct===3)m[k].all++; if(r.correct===0)m[k].none++}
  console.log('\n== '+label+' ==')
  console.log('  n   blind    all-3   none   stratum')
  for(const [k,v] of Object.entries(m).sort((a,b)=>b[1].n-a[1].n))
    console.log(String(v.n).padStart(3), pct(v.c,v.n*3).padStart(7), String(v.all).padStart(6), String(v.none).padStart(6), '  '+k)
}
console.log('TOTAL items', rows.length, 'pooled', pct(rows.reduce((a,r)=>a+r.correct,0), rows.length*3))
agg(r=>r.cohort,'BY COHORT')
agg(r=>r.subskill,'BY SUBSKILL (all cohorts)')
agg(r=>r.cohort+' :: '+r.subskill,'BY COHORT x SUBSKILL')
agg(r=>r.cohort+' :: '+r.difficulty,'BY COHORT x DIFFICULTY')
console.log('\n== PER-ITEM SPLIT ==')
for(const c of [3,2,1,0]) console.log(`  solved by ${c}/3 solvers: ${rows.filter(r=>r.correct===c).length}`)
console.log('\n  v2 only:'); for(const c of [3,2,1,0]) console.log(`    ${c}/3: ${rows.filter(r=>r.cohort==='v2'&&r.correct===c).length}`)
console.log('  rw-v7-cs-hard only:'); for(const c of [3,2,1,0]) console.log(`    ${c}/3: ${rows.filter(r=>r.cohort!=='v2'&&r.correct===c).length}`)
