import { readFileSync } from 'node:fs'
const D='scripts/study-bank/'
const PREFIX=process.argv[2]              // 'seclive' | 'eoilive'
const SOL=(process.argv[3]||'a,b,c').split(',')
const rows=[]
const FILES=(process.argv[4]||'f1,f2,f3').split(',')
for(const tag of FILES.map(f=>PREFIX+'-'+f)){
  const key=JSON.parse(readFileSync(D+tag+'.key.json','utf8'))
  const meta=JSON.parse(readFileSync(D+tag+'.meta.json','utf8'))
  const blind=JSON.parse(readFileSync(D+tag+'.blind.json','utf8'))
  /* eoilive-f4 a/b/c: two of three returned byte-identical pick-strings; re-run d/e/f is the verdict-bearing set */
  const USE = tag==='eoilive-f4' ? ['d','e','f'] : SOL
  const sol=USE.map(x=>JSON.parse(readFileSync(`${D}${tag}.solver-${x}.json`,'utf8')))
  const nums=Object.keys(key)
  for(const[i,s]of sol.entries()){const m=nums.filter(n=>!'ABCD'.includes(s[n]?.pick));if(m.length){console.error('REFUSING',tag,USE[i],m);process.exit(2)}}
  const strs=sol.map(s=>nums.map(n=>s[n].pick).join(''))
  const per=nums.map(n=>sol.filter(s=>s[n].pick===key[n].letter).length)
  console.log(tag.padEnd(12),'['+USE.join('')+'] n='+nums.length,'solvers',sol.map((s,i)=>(100*nums.filter(n=>s[n].pick===key[n].letter).length/nums.length).toFixed(1)).join(' / '),
    ' pooled '+(100*per.reduce((a,b)=>a+b,0)/(nums.length*sol.length)).toFixed(1)+'%',
    ' identical pick-strings:', new Set(strs).size===1?'YES -> VOID':'no ('+new Set(strs).size+' distinct)')
  for(const[j,n] of nums.entries()) rows.push({...meta[n], file:tag, n, correct:per[j], key:key[n].letter,
    stemLeak: /_{3,}/.test(blind[n].stem) })
}
const K=SOL.length
const pct=(c,t)=>(100*c/t).toFixed(1)+'%'
const agg=(list,fn,label)=>{
  const m={}
  for(const r of list){const k=fn(r); (m[k]??={n:0,c:0,all:0,none:0}); m[k].n++; m[k].c+=r.correct; if(r.correct===K)m[k].all++; if(r.correct===0)m[k].none++}
  console.log('\n== '+label+'   (n='+list.length+') ==')
  console.log('  n   blind    all-'+K+'   none   stratum')
  for(const [k,v] of Object.entries(m).sort((a,b)=>b[1].n-a[1].n))
    console.log(String(v.n).padStart(3), pct(v.c,v.n*K).padStart(7), String(v.all).padStart(6), String(v.none).padStart(6), '  '+k)
}
console.log('\nTOTAL items', rows.length, ' pooled', pct(rows.reduce((a,r)=>a+r.correct,0), rows.length*K))
agg(rows,r=>r.cohort,'BY COHORT')
agg(rows,r=>r.subskill.split(' | ')[0],'BY FAMILY')
agg(rows,r=>r.cohort+' :: '+r.subskill.split(' | ')[0],'BY COHORT x FAMILY')
agg(rows,r=>r.difficulty,'BY DIFFICULTY')
if(rows.some(r=>r.stemLeak)){
  console.log('\n!! '+rows.filter(r=>r.stemLeak).length+' items carry the blanked sentence INSIDE the stem - not blind at all')
  agg(rows,r=>r.stemLeak?'stem CARRIES the sentence':'genuinely blind','BY STEM-LEAK')
  const clean=rows.filter(r=>!r.stemLeak)
  console.log('\n### SENSITIVITY: excluding the stem-leaking items ###')
  console.log('TOTAL', clean.length, 'pooled', pct(clean.reduce((a,r)=>a+r.correct,0), clean.length*K))
  agg(clean,r=>r.cohort,'BY COHORT (genuinely blind only)')
  agg(clean,r=>r.cohort+' :: '+r.subskill.split(' | ')[0],'BY COHORT x FAMILY (genuinely blind only)')
}
// fine-grained subskill within v2
agg(rows.filter(r=>r.cohort==='v2'),r=>r.subskill,'v2 BY FULL SUBSKILL')
console.log('\n== per-item split ==')
for(const c of [K,2,1,0]) console.log(`  solved by ${c}/${K}: ${rows.filter(r=>r.correct===c).length}   (v2 only: ${rows.filter(r=>r.cohort==='v2'&&r.correct===c).length})`)
console.log('\n== per-stratum best-fixed-letter ceiling (noise check) ==')
{const m={};for(const r of rows){const k=r.cohort+' :: '+r.subskill.split(' | ')[0];(m[k]??={n:0,L:{}});m[k].n++;m[k].L[r.key]=(m[k].L[r.key]||0)+1}
 for(const[k,v]of Object.entries(m).sort())console.log(String(v.n).padStart(3),(100*Math.max(...Object.values(v.L))/v.n).toFixed(1).padStart(6)+'%  '+k)}
