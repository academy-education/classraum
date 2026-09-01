#!/usr/bin/env node
/**
 * Repair the three TOEFL reading items an independent adjudicator upheld
 * as genuinely ambiguous. Nine were flagged; six were overturned.
 *
 * Each repair changes ONE DISTRACTOR and leaves the key untouched, so a
 * student who knew the answer before still knows it. The alternative —
 * moving the key — silently changes what the item tests.
 *
 * R0100  A NOT-question needs exactly one option absent from the list it
 *        negates. Two were. "Cost reduction challenges" is never given
 *        as a challenge: the passage presents cost reduction as an
 *        ACHIEVEMENT ("significant advancements in efficiency and cost
 *        reduction"), so it was as correct as the key. Replaced with a
 *        challenge the passage states in its own words — it says the
 *        intermittency "presents challenges for consistent energy
 *        supply".
 *
 * R0225  The key reads the hedge's FUNCTION ("the schedule might
 *        change"); the rival read its literal CONTENT ("renovations
 *        depend on student numbers"). Both are defensible and the notice
 *        adjudicates neither. The rival is replaced with a distractor
 *        drawn from the notice that does not answer why the hedge is
 *        there.
 *
 * R0240  The passage's worked example is a value conflicting with a
 *        behaviour that violates it. Both "loves animals but eats meat"
 *        and "dislikes exercise but runs daily" fit that shape. The
 *        rival is replaced with a preference and a behaviour that are
 *        CONSISTENT, so it is no longer dissonance at all.
 *
 *   node repair-ambiguous-reading.mjs [--apply]
 */
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
const env=Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const APPLY=process.argv.includes('--apply')
const norm=s=>String(s).trim().replace(/\s+/g,' ').toLowerCase()
const hashOf=it=>createHash('md5').update([norm(it.prompt),(it.choices||[]).map(norm).join('|')].join('~~')).digest('hex')

const REPAIRS=[
  { id:'dfd85ac8-772a-45cb-abda-ed6d65fa10a7', ref:'R0100',
    from:'Cost reduction challenges', to:'Maintaining a consistent energy supply' },
  { id:'dfbf3f11-e594-4767-aff2-7fadeacae048', ref:'R0225',
    from:'To indicate that renovations depend on student numbers.',
    to:'To explain why some sections will be restricted.' },
  { id:'459aba70-4833-4cec-a330-c62d918fa415', ref:'R0240',
    from:'A person who dislikes exercise but runs daily',
    to:'A person who dislikes crowds and shops early' },
]

for(const r of REPAIRS){
  const { data, error } = await db.from('study_item_bank').select('id,item').eq('id',r.id).single()
  if(error){ console.error('MISSING',r.ref,error.message); process.exit(1) }
  const it=data.item
  if(!it.choices.includes(r.from)){ console.error(`${r.ref}: "${r.from}" is not an option — wording drifted`); process.exit(1) }
  if(it.correct_answer===r.from){ console.error(`${r.ref}: refusing to replace the KEY`); process.exit(1) }
  const choices=it.choices.map(c=>c===r.from?r.to:c)
  if(new Set(choices).size!==choices.length){ console.error(`${r.ref}: repair collides with an existing option`); process.exit(1) }
  if(choices.indexOf(it.correct_answer)!==it.choices.indexOf(it.correct_answer)){ console.error(`${r.ref}: key moved position`); process.exit(1) }
  console.log(`\n${r.ref}  key unchanged at index ${choices.indexOf(it.correct_answer)}`)
  console.log(`   -  ${r.from}`)
  console.log(`   +  ${r.to}`)
  if(APPLY){
    const item={...it, choices}
    const { error:e } = await db.from('study_item_bank').update({ item, content_hash:hashOf(item) }).eq('id',r.id)
    if(e){ console.error('ERR',r.ref,e.message); process.exit(1) }
  }
}
if(!APPLY){ console.log('\nDRY RUN — pass --apply to write'); process.exit(0) }

/* Re-read and CHECK. */
let ok=0
for(const r of REPAIRS){
  const { data } = await db.from('study_item_bank').select('item').eq('id',r.id).single()
  const has=data.item.choices.includes(r.to), gone=!data.item.choices.includes(r.from)
  if(has&&gone) ok++
  else console.error(`${r.ref}: write did not land`)
}
console.log(`\nverified in DB: ${ok}/${REPAIRS.length} repaired`)
