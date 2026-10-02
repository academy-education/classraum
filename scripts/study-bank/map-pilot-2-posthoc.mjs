#!/usr/bin/env node
// map-pilot-2-posthoc.mjs  POST-HOC, not pre-registered, not gating. Tests the graders' claim that
// batch-2 comprehension keys are the "medoid" of their option set: whole-word Jaccard summed to the
// other three options; reports how often the key is the UNIQUE maximum. Self-test row must fire.
import { readFileSync } from 'node:fs'
const D='/Users/andylee/Downloads/saas/classraum/scripts/study-bank/'
const tok=s=>new Set(s.toLowerCase().replace(/[^a-z' ]/g,' ').split(/\s+/).filter(Boolean))
const jac=(a,b)=>{const A=tok(a),B=tok(b);let i=0;for(const x of A)if(B.has(x))i++;return i/(A.size+B.size-i)}
// self-test: synthetic 2x2 prose -> key (shares a half with two others) must be unique max
const st={choices:['P1 Q1','P1 Q2','P2 Q1','P2 Q2 extra'],correct_answer:'P1 Q1'}
function run(label,items){let n=0,uk=0,umax=0;for(const it of items){const ch=it.choices.map(String);const s=ch.map((a,i)=>ch.reduce((t,b,j)=>t+(i===j?0:jac(a,b)),0));const m=Math.max(...s);const at=s.map((x,i)=>x===m?i:-1).filter(i=>i>=0);const k=ch.indexOf(String(it.correct_answer));n++;if(at.length===1){umax++;if(at[0]===k)uk++}console.log(`  ${it.id??'?'} sums ${s.map(x=>x.toFixed(2)).join(',')} key=${k} ${at.length===1&&at[0]===k?'KEY=UNIQUE MEDOID':''}`)}console.log(`${label}: key is unique word-overlap medoid on ${uk} of ${n} (unique medoid exists on ${umax}; chance ~${(umax/4).toFixed(1)})`)}
run('SELFTEST (key shares words with all three, others disjoint: must fire)',[{id:'st',choices:['alpha beta gamma delta','alpha zeta','beta eta','gamma theta'],correct_answer:'alpha beta gamma delta'}])
const rd=p=>JSON.parse(readFileSync(D+p,'utf8'))
const b1=rd('map-pilot-rlu.batch.json').filter(i=>/RLU-0[1-5]$/.test(i.id))
const b2=rd('map-pilot-2-rlu.batch.json').filter(i=>i.stratum==='comprehension')
const cr=rd('map-pilot-2-control-r.batch.json')
run('batch 1 comprehension',b1);run('batch 2 comprehension',b2);run('control R (live ISEE main-idea easy)',cr)
