#!/usr/bin/env node
/**
 * Can a candidate who cannot READ the passage still pick the answer by
 * matching strings against it?
 *
 * Four difficulty graders said some version of "the answer is stated
 * almost verbatim" and "a reader who can match a string gets it". That
 * is decidable, so it is measured over the whole population.
 *
 * The strategy is executed literally, as a real candidate could: score
 * each option by the longest run of its words that appears CONTIGUOUSLY
 * in the passage; pick the highest. No comprehension, no grammar, no
 * understanding of the question — just substring matching.
 *
 * Both directions matter and they pull opposite ways:
 *   - keys quoted verbatim  -> string-matching WINS, the item is
 *     answerable without reading
 *   - distractors quoted verbatim while the key paraphrases -> the
 *     classic echo trap, and string-matching LOSES. That is good item
 *     writing, and a score BELOW control is the sign of it.
 *
 * Control is the best fixed slot, the bar every blind attack here uses.
 */
/*
 * usage:
 *   check-verbatim-key.mjs <batch.json> [...]   report on THOSE files
 *   check-verbatim-key.mjs --live               the shipped bank, per family/section
 *   check-verbatim-key.mjs --selftest           fixtures, no DB
 *
 * HISTORY OF ITS INPUT HANDLING. Until 2026-09-15 it ignored argv and
 * printed live numbers for any batch path. That day it was made to REFUSE
 * any argument (exit 2) — honest, but it left an author with no way to
 * measure the batch they were holding, and no-argument still meant "the
 * live bank" by default. A22 (2026-10-02): a batch path is now read and
 * measured; the live bank only with --live. Exit 0 = measured (this is a
 * diagnostic with a margin, not a pass/fail gate), 2 = cannot process.
 */
import { isMain, parseCheckerArgs, loadBatchFile, loadLive, printDenominator, populationHeader, refuse } from './checker-input.mjs'

const USAGE = 'usage: check-verbatim-key.mjs <batch.json> [...] | --live | --selftest'

const STOP=new Set(['the','a','an','of','to','in','and','or','is','are','was','were','be','been','that','this','it','its','for','on','with','as','by','at','from','their','they','he','she','not'])
const words=s=>String(s).toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w&&!STOP.has(w))

/** Longest run of consecutive content words from `opt` found in `passage`. */
function longestRun(opt, passage){
  const w=words(opt); if(!w.length) return 0
  const p=' '+words(passage).join(' ')+' '
  let best=0
  for(let i=0;i<w.length;i++){
    for(let j=w.length;j>i+best;j--){
      if(p.includes(' '+w.slice(i,j).join(' ')+' ')){ best=Math.max(best,j-i); break }
    }
  }
  return best
}

/** Measure one population of items. Pure, so --selftest can drive it. */
export function measureVerbatim(items){
  let n=0, fires=0, right=0, keyLonger=0, distLonger=0
  const slots={}
  for(const it of items){
    const ch=it?.choices, key=it?.correct_answer, pas=it?.passage
    if(!Array.isArray(ch)||ch.length<2||typeof key!=='string'||!ch.includes(key)||!pas) continue
    n++; slots[ch.indexOf(key)]=(slots[ch.indexOf(key)]??0)+1
    const runs=ch.map(c=>longestRun(c,pas))
    const kr=runs[ch.indexOf(key)]
    const maxOther=Math.max(...runs.filter((_,i)=>i!==ch.indexOf(key)))
    if(kr>maxOther) keyLonger++
    if(maxOther>kr) distLonger++
    const best=Math.max(...runs)
    const winners=ch.filter((_,i)=>runs[i]===best)
    if(winners.length===1){ fires++; if(winners[0]===key) right++ }
  }
  const ctl=n?100*Math.max(...Object.values(slots))/n:NaN
  return { total:items.length, n, fires, right, keyLonger, distLonger, ctl, score:n?100*right/n:NaN }
}

function report(label, items){
  const m=measureVerbatim(items)
  console.log(`\n${label}`)
  // Scorable = has a passage, >=2 string choices, and the key among them.
  printDenominator('passage + key among choices', m.n, m.total)
  const pct=x=>(100*x/m.n).toFixed(1)
  console.log(`  n=${m.n}`)
  console.log(`  key has the longest verbatim run   ${pct(m.keyLonger)}%`)
  console.log(`  a DISTRACTOR does (echo trap)      ${pct(m.distLonger)}%`)
  console.log(`  strategy picks a unique winner     ${pct(m.fires)}%`)
  console.log(`  strategy score / control           ${m.score.toFixed(1)}% / ${m.ctl.toFixed(1)}%   margin ${(m.score-m.ctl>=0?'+':'')}${(m.score-m.ctl).toFixed(1)}`)
  if(m.n<10) console.log(`  (n=${m.n}: a rate over this few items is an anecdote, not a measurement)`)
  return m
}

export function selftest(verbose=false){
  const P='The committee approved the bridge after engineers confirmed the steel would hold under winter loads.'
  const quoted={passage:P,choices:['engineers confirmed the steel would hold under winter loads','the mayor vetoed it','costs rose sharply','the river flooded'],correct_answer:'engineers confirmed the steel would hold under winter loads'}
  const echo={passage:P,choices:['its strength was verified','engineers confirmed the steel would hold','the mayor vetoed it','costs rose'],correct_answer:'its strength was verified'}
  const cases=[
    ['key quoted verbatim -> strategy wins', [quoted], m=>m.n===1&&m.right===1&&m.keyLonger===1],
    ['echo trap -> distractor longer, strategy loses', [echo], m=>m.n===1&&m.right===0&&m.distLonger===1],
    ['no passage -> unscorable', [{choices:['a','b'],correct_answer:'a'}], m=>m.n===0],
    ['key not among choices -> unscorable', [{passage:P,choices:['a','b'],correct_answer:'c'}], m=>m.n===0],
  ]
  let bad=0
  for(const [name,items,ok] of cases){
    const pass=ok(measureVerbatim(items)); if(!pass) bad++
    if(verbose||!pass) console.log(`${pass?'ok  ':'FAIL'}  ${name}`)
  }
  console.log(bad?`${bad} self-test(s) FAILED`:`selftest ${cases.length}/${cases.length} pass`)
  return bad
}

if(isMain(import.meta.url)){
  const {mode,paths}=parseCheckerArgs(process.argv,{name:'check-verbatim-key.mjs',usage:USAGE})
  const stBad=selftest(mode==='selftest')
  if(mode==='selftest') process.exit(stBad?1:0)
  if(stBad) refuse('detector self-test failed — not running')
  if(mode==='live'){
    console.log(populationHeader('live'))
    const {rows}=await loadLive({select:'family,section,item',filter:q=>q.eq('archived',false).eq('verified',true)})
    let any=0
    for(const [f,sec] of [['toefl','reading'],['toefl','listening'],['sat','reading_writing'],['ssat','reading'],['isee','reading']]){
      const items=rows.filter(r=>r.family===f&&r.section===sec).map(r=>r.item)
      // Per-group: an empty live section is reported, not silently skipped.
      if(!measureVerbatim(items).n){ console.log(`\n${f}/${sec}  scorable 0 of ${items.length} — not measured`); continue }
      any++; report(`${f}/${sec}`, items)
    }
    if(!any) refuse('no live family/section had a scorable item')
  }else{
    for(const p of paths) report(populationHeader('batch',p), loadBatchFile(p).map(r=>r.item))
  }
  process.exit(0)
}
