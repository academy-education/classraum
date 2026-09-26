#!/usr/bin/env node
/**
 * check-sec-preflight.mjs <batch.json ...> — the DECIDABLE half of the SEC
 * brief, checked exactly rather than taken from the author's report.
 *
 *   - key letter spread, key-longest count, one blank per passage, word counts
 *   - the mark the KEY carries vs the marks DISTRACTORS carry. Measured on the
 *     27 live hard items 2026-09-26: the key is unpunctuated in 24 of 27 while
 *     distractors carry a comma 14 times — "pick the plainest option" is a live
 *     tell, and a batch that copies it makes it worse
 *   - the four words after the blank, printed for a reader; a script cannot
 *     tell whether they RESOLVE the item, so this is shown, not judged
 *   - key text colliding with a live SEC key
 * Pre-flight only. The auditor and the attack decide.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
const mark = s => { s=String(s); if(s.includes(';')) return ';'; if(s.includes(':')) return ':'; if(/—|–|--/.test(s)) return 'dash'; if(s.includes(',')) return ','; return 'plain' }
const live = []
for (let f=0;;f+=1000){ const {data,error}=await db.from('study_item_bank').select('item,difficulty').eq('family','sat').eq('section','reading_writing').eq('domain','Standard English Conventions').eq('verified',true).eq('archived',false).range(f,f+999); if(error) throw new Error(error.message); live.push(...data); if(data.length<1000) break }
const liveKeys = new Set(live.map(r=>String(r.item?.correct_answer).toLowerCase().trim()))
for (const f of process.argv.slice(2)) {
  const b = JSON.parse(readFileSync(f,'utf8')); const name=f.replace(/^.*\//,'')
  console.log(`\n=== ${name}: ${b.length} items`)
  const L=['A','B','C','D']; const spread={}; let longest=0, blanksBad=0; const km={}, dm={}; const collide=[]
  const words=[]
  for (const it of b) {
    const ki = it.choices.findIndex(c=>c===it.correct_answer); if (ki<0) { console.log(`  REFUSING: ${it.id} key not among choices`); process.exit(2) }
    spread[L[ki]]=(spread[L[ki]]??0)+1
    const lens=it.choices.map(c=>c.length); if (lens[ki]===Math.max(...lens) && lens.filter(x=>x===lens[ki]).length===1) longest++
    const nb=(String(it.passage).match(/______/g)||[]).length; if(nb!==1) blanksBad++
    words.push(String(it.passage).split(/\s+/).length)
    km[mark(it.correct_answer)]=(km[mark(it.correct_answer)]??0)+1
    it.choices.forEach((c,i)=>{ if(i!==ki) dm[mark(c)]=(dm[mark(c)]??0)+1 })
    if (liveKeys.has(String(it.correct_answer).toLowerCase().trim())) collide.push(it.id)
    const after = String(it.passage).split('______')[1]?.trim().split(/\s+/).slice(0,4).join(' ') ?? ''
    console.log(`  ${it.id}  key[${L[ki]}] ${mark(it.correct_answer).padEnd(5)} | after blank: "${after}"`)
  }
  console.log(`  key letters ${JSON.stringify(spread)} | key uniquely longest ${longest}/${b.length} | passages not exactly one blank: ${blanksBad} | words ${Math.min(...words)}-${Math.max(...words)}`)
  console.log(`  mark on KEY ${JSON.stringify(km)}   mark on DISTRACTORS ${JSON.stringify(dm)}`)
  console.log(`  plain key: ${km.plain??0}/${b.length}  (live hard: 24/27 — lower is the goal)`)
  console.log(collide.length ? `  KEY TEXT ALREADY LIVE: ${collide.join(', ')}` : `  no key text collides with the ${live.length} live SEC items`)
}
