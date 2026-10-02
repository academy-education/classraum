#!/usr/bin/env node
/**
 * A vocabulary-in-context stem that names a word appearing MORE THAN
 * ONCE in the region it points at.
 *
 * Found by a human on 2026-09-01, in 10 minutes, on his first real
 * sitting. The item: 'As it is used in the third paragraph, the word
 * "keep" most nearly means'. That paragraph uses "keep" four times, in
 * four different senses — storing, a fortress, board and lodging, and
 * observing a feast — and every option is defensible depending on which
 * one the student reads.
 *
 * No machine gate here could see it. The key is correct for ONE
 * occurrence, the options are all real senses, the blind attack cannot
 * fire because the stem gives nothing away, and every structural check
 * passes. It needed someone to read the paragraph.
 *
 * But the defect is DECIDABLE, so the whole population is checked
 * rather than sampled — the same rule that measured the SAT maths hub
 * exactly instead of trusting a sampled 64.4%.
 *
 * Flags only where the stem POINTS at a region (a numbered paragraph,
 * or the passage as a whole) without quoting a sentence. A stem that
 * says "in the paragraph describing the second season" has done the
 * disambiguating and is not flagged.
 */
/*
 * usage:
 *   check-vocab-ambiguity.mjs <batch.json> [...]   report on THOSE files
 *   check-vocab-ambiguity.mjs --live               the shipped bank, per family/section
 *   check-vocab-ambiguity.mjs --selftest           fixtures, no DB
 *
 * HISTORY OF ITS INPUT HANDLING. Until 2026-09-15 it ignored argv and
 * printed live numbers for any batch path; that day it was made to REFUSE
 * any argument, which left an author no way to gate the batch in hand and
 * still defaulted to the live bank with no argument. A22 (2026-10-02): a
 * batch path is read and measured; the live bank only with --live.
 * Exit 0 clean, 1 ambiguous stems found, 2 cannot process the input.
 */
import { isMain, parseCheckerArgs, loadBatchFile, loadLive, printDenominator, populationHeader, refuse } from './checker-input.mjs'

const USAGE = 'usage: check-vocab-ambiguity.mjs <batch.json> [...] | --live | --selftest'

const ORD={first:0,second:1,third:2,fourth:3,fifth:4,final:-1,last:-1}

/** The quoted target word, if the stem is a vocab-in-context item. */
function target(prompt){
  const m=String(prompt).match(/\bthe word\s+["'“‘]?([A-Za-z-]+)["'”’]?/i)
    || String(prompt).match(/["'“‘]([A-Za-z-]+)["'”’]\s+most nearly means/i)
  return m ? m[1] : null
}
/*
 * A stem that QUOTES a phrase is checked, not skipped.
 *
 * The nine repaired on 2026-09-01 no longer say "third paragraph", so
 * the ordinal branch below stopped matching and they dropped out of the
 * denominator — the checker read them as fixed whether or not the quote
 * disambiguated anything. A repair that makes its own gate stop looking
 * at it is not gated.
 *
 * Returns a FAILURE when the quote does not do its job: absent from the
 * passage, present more than once, or not containing the target word.
 */
function quotedStem(prompt, passage, word){
  /* ACT writes 'As it is used in the phrase "…", the word ledger …'. Until
   * A22 (2026-10-02) only a quote straight after "used in" was recognised,
   * so every ACT phrase-quoted stem fell outside the denominator. */
  const m=String(prompt).match(/as it is used in\s+(?:the\s+(?:phrase|sentence|line|clause)\s+)?["“]([^"”]{4,120})["”]/i)
  if(!m) return null
  const flat=t=>String(t).replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/\s+/g,' ').trim()
  const q=flat(m[1]).replace(/[,.;:]$/,'')
  const hits=flat(passage).split(q).length-1
  if(hits===0) return { bad:'quote is not verbatim in the passage' }
  if(hits>1) return { bad:`quote appears ${hits} times` }
  if(!new RegExp(`\\b${word}\\w*\\b`,'i').test(q)) return { bad:'quote does not contain the target word' }
  return { ok:true }
}

/** Which region the stem points at: an ordinal paragraph, or the whole text. */
function region(prompt, passage){
  const paras=String(passage).split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean)
  /* "paragraph 6" (ACT's numbered paragraphs) — unrecognised until A22, so
   * those stems were silently out of the denominator. */
  const nm=String(prompt).match(/\bparagraph\s+(\d{1,2})\b/i)
  if(nm){
    const p=paras[Number(nm[1])-1]
    return { text:p??'', scoped:true }
  }
  const om=String(prompt).match(/\b(first|second|third|fourth|fifth|final|last)\s+paragraph\b/i)
  if(om){
    const i=ORD[om[1].toLowerCase()]
    const p=i<0?paras[paras.length-1]:paras[i]
    return { text:p??'', scoped:true }
  }
  /* A stem that describes the paragraph ("the paragraph describing the
     second season") has disambiguated by content; not our case. */
  if(/\bparagraph\s+(describing|about|on)\b/i.test(prompt)) return null
  if(/\bin the passage\b|\bas used in the (text|passage)\b/i.test(prompt)) return { text:String(passage), scoped:false }
  return null
}

/** Scan rows ({id, cohort, item}). Pure, so --selftest can drive it. */
export function scanVocab(rows){
  const bad=[]
  let vocab=0, targeted=0
  for(const r of rows){
    const w=target(r.item?.prompt); if(!w) continue
    targeted++

    /* Quoted stems are counted and checked, never skipped. */
    const qs=quotedStem(r.item?.prompt, r.item?.passage||'', w)
    if(qs){
      vocab++
      if(qs.bad) bad.push({id:r.id, cohort:r.cohort, word:w, n:0, scoped:true, why:qs.bad})
      continue
    }

    const reg=region(r.item?.prompt, r.item?.passage||''); if(!reg) continue
    vocab++
    const n=(reg.text.match(new RegExp(`\\b${w}\\w*\\b`,'gi'))??[]).length
    if(n>1) bad.push({id:r.id, cohort:r.cohort, word:w, n, scoped:reg.scoped})
  }
  return {total:rows.length, targeted, vocab, bad}
}

function printBad(bad){
  for(const b of bad.slice(0,8)) console.log(b.why
    ? `   "${b.word}" QUOTED STEM FAILS: ${b.why}  ${b.cohort}  ${String(b.id).slice(0,8)}`
    : `   "${b.word}" x${b.n} in the ${b.scoped?'named paragraph':'passage'}  ${b.cohort}  ${String(b.id).slice(0,8)}`)
}

export function selftest(verbose=false){
  const P='We keep grain in the cellar.\n\nThe old keep stood on the hill, and the monks would keep the feast.\n\nNothing else.'
  const cases=[
    ['word x2 in the named paragraph fires', {prompt:'As it is used in the second paragraph, the word "keep" most nearly means', passage:P}, 1],
    ['word x1 in the named paragraph is clean', {prompt:'As it is used in the first paragraph, the word "keep" most nearly means', passage:P}, 0],
    ['quote that disambiguates is clean', {prompt:'As it is used in "The old keep stood on the hill", the word "keep" most nearly means', passage:P}, 0],
    ['quote absent from the passage fires', {prompt:'As it is used in "the keep was tall", the word "keep" most nearly means', passage:P}, 1],
    ['ACT phrase-quoted stem is read', {prompt:'As it is used in the phrase "The old keep stood on the hill," the word keep most nearly means:', passage:P}, 0],
    ['ACT numbered paragraph with x2 fires', {prompt:'As it is used in paragraph 2, the word "keep" most nearly means:', passage:P}, 1],
  ]
  let bad=0
  for(const [n,item,want] of cases){
    const s=scanVocab([{id:'fixture',cohort:'t',item}])
    const ok=s.vocab===1&&s.bad.length===want; if(!ok) bad++
    if(verbose||!ok) console.log(`${ok?'ok  ':'FAIL'}  ${n}  -> vocab ${s.vocab}, flagged ${s.bad.length} (want 1, ${want})`)
  }
  console.log(bad?`${bad} self-test(s) FAILED`:`selftest ${cases.length}/${cases.length} pass`)
  return bad
}

if(isMain(import.meta.url)){
  const {mode,paths}=parseCheckerArgs(process.argv,{name:'check-vocab-ambiguity.mjs',usage:USAGE})
  const stBad=selftest(mode==='selftest')
  if(mode==='selftest') process.exit(stBad?1:0)
  if(stBad) refuse('detector self-test failed — not running')
  let grand=0, grandN=0
  if(mode==='live'){
    console.log(populationHeader('live'))
    // act/reading added by A22: ACT vocab stems had never been in this sweep.
    const FAMS=[['act','reading'],['toefl','reading'],['sat','reading_writing'],['ssat','reading'],['isee','reading'],['ssat','verbal'],['isee','verbal']]
    const {rows}=await loadLive({select:'id,cohort,family,section,item',filter:q=>q.eq('archived',false).eq('verified',true)})
    for(const [fam,sec] of FAMS){
      const s=scanVocab(rows.filter(r=>r.family===fam&&r.section===sec))
      grand+=s.bad.length; grandN+=s.vocab
      console.log(`${fam}/${sec}: ${s.total} items, ${s.vocab} vocab-in-context with a pointed region, ${s.bad.length} AMBIGUOUS`)
      printBad(s.bad)
    }
    if(!grandN) refuse('no live vocab-in-context item with a pointed region — nothing measured')
  }else{
    for(const p of paths){
      const s=scanVocab(loadBatchFile(p))
      console.log(`\n${populationHeader('batch',p)}`)
      // Scorable = a vocab-in-context stem that points at a region or quotes one.
      printDenominator('pointed vocab-in-context stems', s.vocab, s.total)
      console.log(`  ${s.targeted} stems name a target word; ${s.vocab} point at a region or quote; ${s.bad.length} AMBIGUOUS`)
      printBad(s.bad)
      grand+=s.bad.length; grandN+=s.vocab
    }
  }
  console.log(`\nTOTAL: ${grand} of ${grandN} pointed vocab items are ambiguous (${grandN?(100*grand/grandN).toFixed(1):0}%)`)
  process.exit(grand?1:0)
}
