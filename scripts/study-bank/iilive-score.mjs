/** Scorer for the iilive run. Usage: node _tmp_score.mjs <fileTag> <solver.json...> */
import { readFileSync } from 'node:fs'
const [tag,...paths]=process.argv.slice(2)
const D='scripts/study-bank/'
const key=JSON.parse(readFileSync(`${D}${tag}.key.json`,'utf8'))
const meta=JSON.parse(readFileSync(`${D}${tag}.meta.json`,'utf8'))
const nums=Object.keys(key)
const solvers=paths.map(p=>({p,a:JSON.parse(readFileSync(p,'utf8'))}))
for(const s of solvers){
  const missing=nums.filter(n=>!s.a?.[n]?.pick)
  if(missing.length){console.error(`REFUSING: ${s.p} missing ${missing.length}/${nums.length}`);process.exit(2)}
  const bad=nums.filter(n=>!'ABCD'.includes(s.a[n].pick))
  if(bad.length){console.error(`REFUSING: ${s.p} has non-ABCD picks at ${bad}`);process.exit(2)}
}
const spread={}; for(const n of nums) spread[key[n].letter]=(spread[key[n].letter]||0)+1
const dealtCtl=Math.max(...Object.values(spread))/nums.length
// live control: best fixed letter measured through THIS scorer
const liveCtl=Math.max(...'ABCD'.split('').map(L=>nums.filter(n=>key[n].letter===L).length/nums.length))
const strings=solvers.map(s=>nums.map(n=>s.a[n].pick).join(''))
const identical=new Set(strings).size===1
let tot=0
const perItem={}
for(const n of nums){ const c=solvers.filter(s=>s.a[n].pick===key[n].letter).length; tot+=c; perItem[n]=c }
const pooled=100*tot/(nums.length*solvers.length)
console.log(`file        : ${tag}   items ${nums.length}  solvers ${solvers.length}`)
console.log(`key spread  : ${JSON.stringify(spread)}   dealt control ${(100*dealtCtl).toFixed(1)}%  (scorer-measured ${(100*liveCtl).toFixed(1)}%)`)
solvers.forEach((s,i)=>console.log(`  solver ${i+1} : ${(100*nums.filter(n=>s.a[n].pick===key[n].letter).length/nums.length).toFixed(1)}%  ${s.p.split('/').pop()}`))
console.log(`pooled      : ${pooled.toFixed(1)}%   margin ${(pooled-100*dealtCtl).toFixed(1)}pts`)
console.log(`all-3 solved: ${nums.filter(n=>perItem[n]===solvers.length).length}/${nums.length}   none solved: ${nums.filter(n=>perItem[n]===0).length}`)
console.log(`IDENTICAL PICK-STRINGS: ${identical ? 'YES -> NO VERDICT for this file' : 'no'}`)
// per stratum
const agg={}
for(const n of nums){ const k=meta[n].cohort+' :: '+meta[n].subskill; (agg[k]??={n:0,c:0}); agg[k].n++; agg[k].c+=perItem[n] }
console.log('per cohort x subskill:')
for(const [k,v] of Object.entries(agg).sort()) console.log(`   ${String(v.n).padStart(3)} items  ${(100*v.c/(v.n*solvers.length)).toFixed(1).padStart(6)}%  ${k}`)
// machine-readable
console.log('JSON '+JSON.stringify({tag,pooled,identical,perItem,meta:Object.fromEntries(nums.map(n=>[n,meta[n]]))}))
