#!/usr/bin/env node
/**
 * Does one passage carry the same question more than once?
 *
 * Two difficulty graders reported this independently on 2026-09-01,
 * neither prompted for it:
 *   "one passage carrying five copies of two questions; anyone who sees
 *    two of them gets the rest free"  (a coral block, symbiosis asked 5x)
 *   "R0041 is a near-duplicate of R0036 with the options reordered"
 *
 * Decidable, so measured over the whole population. Two kinds:
 *   WITHIN a passage group — the same passage asking one thing twice.
 *     A student meets both in one sitting; the second is free.
 *   ACROSS groups — near-identical passages on the same topic. Softer:
 *     a student meets them across different forms, and unseen-first
 *     delivery spreads them out. Reported separately, not summed.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env=Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})

const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()
const bag=s=>new Set(norm(s).split(' ').filter(w=>w.length>2))
const jac=(a,b)=>{const i=[...a].filter(x=>b.has(x)).length; return i/new Set([...a,...b]).size}

for(const [fam,sec] of [['toefl','reading'],['toefl','listening'],['ssat','reading'],['isee','reading']]){
  const rows=[]
  for(let f=0;;f+=1000){
    const {data}=await db.from('study_item_bank').select('id,passage_group_id,item')
      .eq('family',fam).eq('section',sec).eq('archived',false).eq('verified',true).range(f,f+999)
    rows.push(...(data??[])); if(!data||data.length<1000) break
  }
  const groups={}
  for(const r of rows){ const k=r.passage_group_id; if(!k) continue; (groups[k]=groups[k]||[]).push(r) }

  let dupPairs=0, affected=new Set(), worstGroup=null, worstN=0
  for(const [gid,g] of Object.entries(groups)){
    let inThis=0
    for(let i=0;i<g.length;i++)for(let j=i+1;j<g.length;j++){
      const s=jac(bag(g[i].item?.prompt), bag(g[j].item?.prompt))
      if(s>=0.75){ dupPairs++; inThis++; affected.add(g[i].id); affected.add(g[j].id) }
    }
    if(inThis>worstN){ worstN=inThis; worstGroup=gid }
  }
  const grouped=Object.values(groups).reduce((n,g)=>n+g.length,0)
  console.log(`\n${fam}/${sec}  ${rows.length} items, ${grouped} in ${Object.keys(groups).length} passage groups`)
  console.log(`  near-duplicate question PAIRS within a passage: ${dupPairs}`)
  console.log(`  items involved: ${affected.size} (${(100*affected.size/(grouped||1)).toFixed(1)}% of grouped items)`)
  if(worstGroup) console.log(`  worst group: ${worstGroup} with ${worstN} duplicate pairs`)
}
