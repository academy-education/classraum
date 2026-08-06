/**
 * Apply A1 (safe subset) + A2. Passage/option text only.
 *
 * content_hash is deliberately NOT recomputed: 163 of 200 live rows
 * match neither hash definition present in this repo, so any value I
 * wrote would be a guess that silently disagrees with the column's
 * actual history. Recorded as a finding instead.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const DRY = process.argv.includes('--dry')
const env = Object.fromEntries(readFileSync(process.cwd()+'/.env.local','utf8').split('\n')
  .filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const D='scripts/study-bank/'
const has = s => String(s||'').toLowerCase().includes('space permitting')

const rows=[]; for(let f=0;;f+=1000){const {data}=await db.from('study_item_bank').select('id,item,verify_meta,archived').order('id').range(f,f+999); if(!data?.length)break; rows.push(...data); if(data.length<1000)break}
const byId=new Map(rows.map(r=>[r.id,r]))

const fixes=[...JSON.parse(readFileSync(D+'space-permitting-fix-1.json','utf8')),
             ...JSON.parse(readFileSync(D+'space-permitting-fix-2.json','utf8'))]

const problems=[]; const plan=[]
for (const f of fixes) {
  if (f.before === f.after) continue
  const refs = f.itemIds.filter(id => { const r=byId.get(id); return r && (has(r.item.prompt)||has(r.item.explanation)) })
  if (refs.length) continue                       // deferred — an item questions the phrase
  for (const id of f.itemIds) {
    const r = byId.get(id)
    if (!r) { problems.push(`${id}: not in bank`); continue }
    if (String(r.item.passage) !== f.before) { problems.push(`${id}: live passage differs from 'before'`); continue }
    if (has(f.after) ) problems.push(`${id}: 'after' still contains the phrase`)
    plan.push({ id, before: f.before, after: f.after, kind: 'passage' })
  }
}

// A2 — the pronoun
const A2_ID='9c6944db-b83d-4479-9f18-0d3d51510e23'
const A2_OLD='Talk to their roommate about switching'
const A2_NEW='Check with their own roommate first'
{
  const r=byId.get(A2_ID)
  if(!r) problems.push('A2: item missing')
  else if(!r.item.choices.includes(A2_OLD)) problems.push('A2: original option not present')
  else if(r.item.correct_answer!==A2_OLD) problems.push('A2: that option is not the key — abort, this would re-key the item')
  else plan.push({ id:A2_ID, kind:'option', from:A2_OLD, to:A2_NEW })
}

if (problems.length) { console.error('ABORTED:'); problems.forEach(p=>console.error('  '+p)); process.exit(1) }
console.log(`validated: ${plan.filter(p=>p.kind==='passage').length} passage edits + ${plan.filter(p=>p.kind==='option').length} option edit`)
if (DRY) { console.log('DRY RUN — nothing written'); process.exit(0) }

let ok=0
for (const p of plan) {
  const r=byId.get(p.id); const meta=r.verify_meta??{}
  let item, nextMeta
  if (p.kind==='passage') {
    item={...r.item, passage:p.after}
    nextMeta = 'legacy_passage' in meta ? meta : {...meta, legacy_passage:r.item.passage, phrase_repaired_at:new Date().toISOString()}
  } else {
    item={...r.item, choices:r.item.choices.map(c=>c===p.from?p.to:c), correct_answer:p.to}
    nextMeta = 'legacy_choices_a2' in meta ? meta : {...meta, legacy_choices_a2:r.item.choices, phrase_repaired_at:new Date().toISOString()}
  }
  const {error}=await db.from('study_item_bank').update({ item, verify_meta: nextMeta }).eq('id',p.id)
  if(error){ console.error('ERR '+p.id+': '+error.message); process.exit(1) }
  ok++
}
console.log(`updated ${ok}`)
