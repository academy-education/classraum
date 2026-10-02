#!/usr/bin/env node
/* REGISTER item: "Explanations cite option positions that don't match
 * stored order."
 *
 * A student answers, gets it wrong, and reads an explanation that says
 * "the answer is (C)" while the key sits in slot A. That is a bug the
 * student SEES, unlike everything else measured this week.
 *
 * Exactly decidable, so per MATH-HUB-RESULT.md check the whole
 * population rather than sampling it.
 *
 * usage:
 *   check-explanation-option-refs.mjs <batch.json> [...]   report on THOSE files
 *   check-explanation-option-refs.mjs --live               the whole live bank
 *   check-explanation-option-refs.mjs --selftest           fixtures, no DB
 *
 * A22 (2026-10-02): until this date a batch path was IGNORED and the live
 * bank reported instead — byte-identical output for two different files.
 * See checker-input.mjs for the contract. Exit 0 clean, 1 mismatches,
 * 2 cannot process the input. */
import { isMain, parseCheckerArgs, loadBatchFile, loadLive, printDenominator, populationHeader, refuse } from './checker-input.mjs'

const USAGE = 'usage: check-explanation-option-refs.mjs <batch.json> [...] | --live | --selftest'

const norm=s=>String(s??'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'').trim()
export function keyLetter(it){
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
/* The KEYWORD is case-insensitive by hand ([Cc]hoice), the LETTER is not.
 * Until 2026-10-02 the whole regex was case-sensitive, so a sentence-initial
 * "Choice C is correct" — the commonest way to say it — was never matched.
 * Found by the A22 self-test fixture, which is what fixtures are for. */
const CITE=[
  /\b(?:[Aa]nswer|[Cc]hoice|[Oo]ption)\s+(?:is\s+)?\(?([A-E])\)?(?![A-Za-z])/g,
  /\(([A-E])\)\s+is\s+(?:the\s+)?(?:correct|right)\b/g,
]

/** Scan rows; returns counts + defects. Pure, so --selftest can drive it. */
export function scanOptionRefs(rows){
  let withExpl=0, cited=0, mismatch=0, noKey=0
  const bad=[], noKeyShapes={}
  for(const r of rows){
    const it=r.item, ex=String(it?.explanation??'')
    if(!ex.trim())continue
    withExpl++
    const kl=keyLetter(it)
    if(!kl){
      noKey++
      const ch=Array.isArray(it?.choices)?it.choices:[]
      const shape=!ch.length ? 'no choices (free response)' :
        it?.correct_answer==null ? 'correct_answer null' : 'key text matches no choice'
      noKeyShapes[shape]=(noKeyShapes[shape]??0)+1
      continue
    }
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
  return {total:rows.length, withExpl, cited, mismatch, noKey, noKeyShapes, bad}
}

function report(label, rows){
  const s=scanOptionRefs(rows)
  console.log(`\nEXPLANATION vs STORED OPTION ORDER`)
  console.log(`  ${label}`)
  // The denominator is the items whose explanation exists AND whose key
  // resolves to a slot — the only ones a citation can be checked against.
  printDenominator('explanation + resolvable key', s.withExpl-s.noKey, s.total)
  console.log(`  with an explanation        ${s.withExpl}`)
  console.log(`  explanation cites a letter ${s.cited}`)
  console.log(`  key not resolvable         ${s.noKey}`)
  for(const [k,v] of Object.entries(s.noKeyShapes).sort((a,b)=>b[1]-a[1])) console.log(`      ${String(v).padStart(4)}  ${k}`)
  console.log(`  MISMATCH (student sees it) ${s.mismatch}` + (s.cited?`   ${(100*s.mismatch/s.cited).toFixed(1)}% of citing items`:''))
  const byFam={}
  for(const b of s.bad) byFam[`${b.family} / ${b.domain}`]=(byFam[`${b.family} / ${b.domain}`]??0)+1
  if(s.mismatch){
    console.log(`\n  per cohort:`)
    for(const [k,v] of Object.entries(byFam).sort((a,b)=>b[1]-a[1])) console.log(`    ${k.padEnd(48)} ${v}`)
    console.log(`\n  examples:\n`)
    for(const b of s.bad.slice(0,8)){
      console.log(`    ${b.id}  [${b.family}/${b.domain}]  key=${b.key}  cites ${b.cites}`)
      console.log(`      MATCHED SPAN: "${b.span}"`)
      console.log(`      ${b.explanation}\n`)
    }
  }
  return s.mismatch
}

export function selftest(verbose=true){
  const mk=(id,choices,key,explanation)=>({id,family:'t',domain:'t',item:{choices,correct_answer:key,explanation}})
  const cases=[
    ['cites the key letter — clean', 0, [mk('a',['x','y','z','w'],'y','The answer is (B) because y.')]],
    ['cites a non-key letter — fires', 1, [mk('b',['x','y','z','w'],'y','Choice C is correct since z.')]],
    ['article "a" is not letter A', 0, [mk('c',['x','y','z','w'],'y','You must answer a different question.')]],
    ['walks several letters — clean', 0, [mk('d',['x','y','z','w'],'y','Option A is wrong; option B is right; option D is off.')]],
    ['letter key resolves', 1, [mk('e',['x','y','z','w'],'D','(A) is correct here.')]],
  ]
  let bad=0
  for(const [n,want,rows] of cases){
    const got=scanOptionRefs(rows).mismatch
    const ok=got===want; if(!ok)bad++
    if(verbose||!ok) console.log(`${ok?'ok  ':'FAIL'}  ${n}  -> ${got} (want ${want})`)
  }
  console.log(bad?`${bad} self-test(s) FAILED`:`selftest ${cases.length}/${cases.length} pass`)
  return bad
}

if(isMain(import.meta.url)){
  const {mode,paths}=parseCheckerArgs(process.argv,{name:'check-explanation-option-refs.mjs',usage:USAGE})
  const stBad=selftest(mode==='selftest')
  if(mode==='selftest') process.exit(stBad?1:0)
  if(stBad) refuse('detector self-test failed — not running')
  let defects=0
  if(mode==='live'){
    const {rows}=await loadLive({select:'id, family, domain, item',filter:q=>q.eq('archived',false)})
    defects+=report(populationHeader('live'),rows)
  }else{
    for(const p of paths) defects+=report(populationHeader('batch',p),loadBatchFile(p))
  }
  process.exit(defects?1:0)
}
