#!/usr/bin/env node
/** Confirmation render: 24 fresh rawsvg items, both repairs applied.
 *  Key letters dealt FLAT so the fixed-slot control is exactly 25.0%. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
const base = new URL('./', import.meta.url).pathname
const rep = JSON.parse(readFileSync(base + 'geo-confirm-repair.json', 'utf8'))
const L = ['A','B','C','D']
let s = 20260807
const rnd=()=>{s|=0;s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296}
const sh=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

const slots = sh(rep.map((_,i)=>L[i%4]))
const out=[], key={}
sh(rep).forEach((r,i)=>{
  const id=String(i+1), letter=slots[i]
  if(!r.newStem) throw new Error(`${r.id}: no newStem`)
  if(r.newDistractors.length!==3) throw new Error(`${r.id}: ${r.newDistractors.length} distractors`)
  const all=[r.key,...r.newDistractors].map(x=>String(x).trim())
  if(new Set(all).size!==4) throw new Error(`${r.id}: duplicate option`)
  const rest=sh(r.newDistractors)
  const opts=L.map(x=>x===letter?r.key:rest.pop())
  if(opts.some(o=>o===undefined)) throw new Error(`${r.id}: unfilled slot`)
  if(opts[L.indexOf(letter)]!==r.key) throw new Error(`${r.id}: key misplaced`)
  out.push({id,question:r.newStem,figureWithheld:true,options:Object.fromEntries(opts.map((o,n)=>[L[n],o]))})
  key[id]={letter,itemId:r.id}
})
const f=base+'geo-confirm.blind.json', kf=base+'geo-confirm.key.json'
if((existsSync(f)||existsSync(kf))&&!process.argv.includes('--force')){console.error('REFUSING TO OVERWRITE');process.exit(1)}
writeFileSync(f,JSON.stringify(out,null,2)); writeFileSync(kf,JSON.stringify(key,null,2))
const c=L.map(x=>Object.values(key).filter(k=>k.letter===x).length)
console.log(`items ${out.length}  key letters ${L.map((x,n)=>`${x}:${c[n]}`).join(' ')}`)
console.log(`control ${(100*Math.max(...c)/out.length).toFixed(1)}%`)
/*
 * Fraction- and radical-aware. The first version did
 * `replace(/[^0-9.-]/g,'')`, which turns "4/5" into 45 and "√29" into
 * 29 — it reported a key-rank of 9/4/5/6 and an "always smallest"
 * strategy scoring 37.5%, i.e. a positional tell that does not exist.
 * The author's own 6/6/6/6 was right and this check was wrong. A
 * measuring instrument that mis-parses its input invents defects as
 * readily as it hides them.
 */
const parse=v=>{const t=String(v).trim()
  const f=t.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/)
  if(f) return parseFloat(f[1])/parseFloat(f[2])
  const r=t.match(/^√\s*(\d+(?:\.\d+)?)$/)||t.match(/^sqrt\((\d+(?:\.\d+)?)\)$/)
  if(r) return Math.sqrt(parseFloat(r[1]))
  const n=parseFloat(t.replace(/[^0-9.\-]/g,''))
  return Number.isFinite(n)?n:null}
const ranks=out.map(o=>{const nums=L.map(x=>parse(o.options[x]))
  const kv=nums[L.indexOf(key[o.id].letter)]
  return nums.filter(n=>n!==null&&n<kv).length+1})
const h=[1,2,3,4].map(r=>ranks.filter(x=>x===r).length)
console.log(`key rank by value: 1st:${h[0]} 2nd:${h[1]} 3rd:${h[2]} 4th:${h[3]}   ("always smallest" would score ${(100*h[0]/out.length).toFixed(1)}%)`)
console.log(`longest stem ${Math.max(...out.map(o=>o.question.length))} chars; stems with a digit: ${out.filter(o=>/\d/.test(o.question)).length}/${out.length}`)
