/**
 * The 12 SSAT Writing Sample / ISEE Essay rows were banked with
 * `correct_answer: null`. Free response has no key, so null looks
 * defensible — but the bank's convention, set by 182 live TOEFL
 * writing_email / writing_discussion rows, is an EMPTY STRING, and
 * readBankItem enforced the string. The result was that both essay
 * sections threw "no verified items" for any student who selected them.
 *
 * Sets correct_answer to '' on free-response rows that currently hold
 * null. Idempotent. --apply to write; default is a dry run.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env=Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const APPLY = process.argv.includes('--apply')

const {data,error}=await db.from('study_item_bank').select('id,family,section,item')
  .in('family',['ssat','isee']).eq('section','writing')
if(error) throw new Error(error.message)

const targets=(data??[]).filter(r => r.item?.correct_answer === null)
console.log(`${data.length} writing rows, ${targets.length} with a null key`)
if(!targets.length){ console.log('nothing to do'); process.exit(0) }
if(!APPLY){ console.log('DRY RUN — pass --apply to write'); process.exit(0) }

let n=0
for(const r of targets){
  const item={...r.item, correct_answer: ''}
  const {error:e}=await db.from('study_item_bank').update({item}).eq('id',r.id)
  if(e){ console.log('  FAILED', r.id, e.message); continue }
  n++
}
console.log(`updated ${n}/${targets.length}`)

// Re-read and CHECK the write landed, rather than trusting the update call.
const {data:after}=await db.from('study_item_bank').select('id,item')
  .in('family',['ssat','isee']).eq('section','writing')
const stillNull=(after??[]).filter(r=>r.item?.correct_answer===null).length
console.log(stillNull ? `STILL NULL: ${stillNull}` : 'verified: no free-response row holds a null key')
