#!/usr/bin/env node
/**
 * Apply A6 — items whose QUESTION was about the misused idiom.
 *
 * Two kinds of change, and they are NOT equivalent:
 *   repair   the hedge is fixed and the stem requotes it; same answer.
 *   repoint  the question is replaced. New stem, options, key.
 *
 * A repointed item's prior attack measurement describes DIFFERENT TEXT
 * and must not be read as evidence about the item that now exists.
 * study_item_attacks has no content binding (migration 076 gave that to
 * reviews only), so this stamps `repointed_at` on the item and the
 * register records that those measurements are void. See A8.
 *
 * usage: node apply-phrase-question-fix.mjs [--dry]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const DRY = process.argv.includes('--dry')
const D = 'scripts/study-bank/'
const env = Object.fromEntries(readFileSync(process.cwd()+'/.env.local','utf8').split('\n')
  .filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})

const targets = JSON.parse(readFileSync(D+'phrase-question-targets.json','utf8'))
const byTarget = new Map(targets.map(t=>[t.id,t]))
const fixes = [...JSON.parse(readFileSync(D+'phrase-question-fix-1.json','utf8')),
               ...JSON.parse(readFileSync(D+'phrase-question-fix-2.json','utf8'))]

const rows=[]; for(let f=0;;f+=1000){const {data}=await db.from('study_item_bank').select('id,item,verify_meta,archived').order('id').range(f,f+999); if(!data?.length)break; rows.push(...data); if(data.length<1000)break}
const byId=new Map(rows.map(r=>[r.id,r]))

const problems=[], plan=[], seen=new Set()
for (const f of fixes) {
  if (seen.has(f.id)) { problems.push(`${f.id}: duplicate proposal`); continue } seen.add(f.id)
  const t = byTarget.get(f.id), live = byId.get(f.id)
  if (!t)    { problems.push(`${f.id}: not a target`); continue }
  if (!live) { problems.push(`${f.id}: not in bank`); continue }
  if (f.action === 'retire') { plan.push({ id:f.id, retire:true }); continue }

  // The live row must still be what the author was shown.
  if (String(live.item.prompt) !== String(t.prompt)) { problems.push(`${f.id}: live prompt has changed since extraction`); continue }
  if (!Array.isArray(f.choices) || f.choices.length !== 4) problems.push(`${f.id}: not 4 options`)
  else {
    if (new Set(f.choices).size !== 4) problems.push(`${f.id}: duplicate option text`)
    if (!f.choices.includes(f.key))    problems.push(`${f.id}: key absent from choices`)
  }
  if (/\b(choice|option)\s*\d|\boption\s+[A-D]\b/i.test(f.explanation||'')) problems.push(`${f.id}: explanation names a position`)
  // A repair must not silently become a rewrite of the passage's facts.
  if (f.action === 'repair') {
    const nums = s => (String(s).match(/\d+/g)||[]).join(',')
    if (nums(f.passage) !== nums(t.passage)) problems.push(`${f.id}: repair altered the passage's numbers`)
  }
  plan.push({ id:f.id, action:f.action, passage:f.passage, prompt:f.prompt, choices:f.choices, key:f.key, explanation:f.explanation })
}
const missing = targets.filter(t=>!seen.has(t.id))
if (missing.length) problems.push(`no proposal for ${missing.length} target(s)`)

if (problems.length) { console.error(`ABORTED — ${problems.length} problem(s):`); problems.forEach(p=>console.error('  '+p)); process.exit(1) }
const repairs=plan.filter(p=>p.action==='repair').length, repoints=plan.filter(p=>p.action==='repoint').length
console.log(`validated: ${repairs} repair, ${repoints} repoint, ${plan.filter(p=>p.retire).length} retire`)
if (DRY) { console.log('DRY RUN — nothing written'); process.exit(0) }

let ok=0
for (const p of plan) {
  const live = byId.get(p.id), meta = live.verify_meta ?? {}
  if (p.retire) {
    const { error } = await db.from('study_item_bank').update({ archived:true,
      verify_meta:{...meta, retired_at:new Date().toISOString(), retired_reason:'question was about a misused idiom (A6)'} }).eq('id',p.id)
    if (error) { console.error('ERR '+p.id+': '+error.message); process.exit(1) }
    ok++; continue
  }
  const nextMeta = { ...meta,
    ...(('legacy_item_a6' in meta) ? {} : { legacy_item_a6: live.item }),
    phrase_question_fixed_at: new Date().toISOString(),
    ...(p.action==='repoint' ? { repointed_at:new Date().toISOString(),
        repointed_note:'question replaced — any attack measurement before this date describes different text' } : {}),
  }
  const { error } = await db.from('study_item_bank').update({
    item: { ...live.item, passage:p.passage, prompt:p.prompt, choices:p.choices, correct_answer:p.key, explanation:p.explanation },
    verify_meta: nextMeta,
  }).eq('id', p.id)
  if (error) { console.error('ERR '+p.id+': '+error.message); process.exit(1) }
  ok++
}
console.log(`updated ${ok}`)
