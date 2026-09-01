#!/usr/bin/env node
/**
 * Apply disambiguating stems to vocab-in-context items whose target word
 * appears more than once in the paragraph the stem points at.
 *
 * Found by a human on 2026-09-01 ("keep" used four times in four senses,
 * with the stem naming only the paragraph), then measured across the
 * whole bank because the defect is decidable.
 *
 * EVERY REPAIR IS CHECKED, NOT TRUSTED. The quoted phrase must:
 *   - appear VERBATIM in the stored passage (a paraphrase is rejected)
 *   - appear EXACTLY ONCE there, or it disambiguates nothing
 *   - contain the target word, or it points at the wrong place
 * and the new prompt must actually contain the quote, still name the
 * word, and leave the choices and key untouched.
 *
 * A repair that fails any check stops the run. Nine items is small
 * enough that a partial application is worse than none — it would leave
 * the cohort in two states with no record of which.
 *
 *   node apply-vocab-repairs.mjs [--apply]
 */
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
const env=Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const APPLY=process.argv.includes('--apply')
const norm=s=>String(s).trim().replace(/\s+/g,' ').toLowerCase()
const hashOf=it=>createHash('md5').update([norm(it.prompt),(it.choices||[]).map(norm).join('|')].join('~~')).digest('hex')
/* Compare with whitespace and curly quotes normalised: the passage may
   carry a typographic apostrophe the repair file spells straight. */
const flat=s=>String(s).replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/\s+/g,' ').trim()

const repairs=JSON.parse(readFileSync('scripts/study-bank/vocab-ambiguity-repairs.json','utf8'))
console.log(`${repairs.length} repair(s) proposed\n`)
const problems=[]
const staged=[]
for(const r of repairs){
  const { data, error } = await db.from('study_item_bank').select('id,item').eq('id',r.id).single()
  if(error){ problems.push(`${r.id}: not found`); continue }
  const it=data.item
  const passage=flat(it.passage||'')
  const quote=flat(r.quote)
  const occurrences=passage.split(quote).length-1

  if(occurrences===0) problems.push(`${r.word}: quote is NOT verbatim in the passage — "${r.quote.slice(0,50)}"`)
  else if(occurrences>1) problems.push(`${r.word}: quote appears ${occurrences} times — it disambiguates nothing`)
  if(!new RegExp(`\\b${r.word}\\w*\\b`,'i').test(quote)) problems.push(`${r.word}: the quote does not contain the target word`)
  if(!flat(r.new_prompt).includes(quote)) problems.push(`${r.word}: the new prompt does not contain the quote`)
  if(!new RegExp(`\\b${r.word}\\b`,'i').test(r.new_prompt)) problems.push(`${r.word}: the new prompt no longer names the word`)
  if(flat(r.new_prompt)===flat(it.prompt)) problems.push(`${r.word}: prompt unchanged`)

  staged.push({ id:r.id, word:r.word, sense:r.sense, before:it.prompt, after:r.new_prompt, item:{...it, prompt:r.new_prompt} })
}
if(problems.length){
  console.error('REFUSED:\n  '+problems.join('\n  '))
  process.exit(1)
}
for(const s of staged){
  console.log(`"${s.word}"  -> ${s.sense}`)
  console.log(`   -  ${s.before}`)
  console.log(`   +  ${s.after}\n`)
}
if(!APPLY){ console.log('all checks pass — DRY RUN, pass --apply to write'); process.exit(0) }

for(const s of staged){
  const { error } = await db.from('study_item_bank')
    .update({ item:s.item, content_hash:hashOf(s.item) }).eq('id',s.id)
  if(error){ console.error('ERR',s.id,error.message); process.exit(1) }
}
console.log(`updated ${staged.length}`)
