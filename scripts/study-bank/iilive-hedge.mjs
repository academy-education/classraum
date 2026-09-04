/**
 * DESCRIPTIVE PROXY ONLY (CLAUDE.md: proxies are pre-flight, the attack is the gate).
 * "Is the key the unique hedged/two-part option while distractors are absolutes?"
 * Validated against banks with KNOWN blind rates before being pointed at anything new.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const HEDGE=/\b(rather than|although|though|while|whereas|but |yet |not (?:the )?(?:sole|only|decisive)|may |might |can be|partly|in part|to some (?:extent|degree)|does not (?:by itself|necessarily)|need not|less .* than|more .* than|only partly|primarily|largely|tends to|suggests|indicates)\b/i
const ABS=/\b(only|never|always|every|all |none|no |any |entirely|solely|completely|exclusively|impossible|proves|cannot|must|invariably|purely|wholly|at all|whatsoever|inevitab)\w*\b/i
const isHedged=s=>HEDGE.test(s)
const isAbs=s=>ABS.test(s)&&!HEDGE.test(s)
async function load(domain){
  const rows=[]
  for(let from=0;;from+=1000){
    const {data,error}=await db.from('study_item_bank').select('id,cohort,subskill,item').eq('family','sat').eq('domain',domain).eq('verified',true).eq('archived',false).range(from,from+999)
    if(error)throw error; rows.push(...data); if(data.length<1000) break
  }
  return rows
}
function score(rows){
  const m={}
  for(const r of rows){
    const ch=r.item.choices, ans=r.item.correct_answer
    if(!Array.isArray(ch)||ch.length!==4) continue
    const others=ch.filter(c=>c!==ans)
    const keyHedged=isHedged(ans)
    const uniqueHedge=keyHedged && others.every(o=>!isHedged(o))
    const absDistractors=others.filter(isAbs).length
    const k=r.cohort
    ;(m[k]??={n:0,keyHedged:0,uniqueHedge:0,uniqueHedgeAnd2Abs:0,absSum:0})
    m[k].n++; if(keyHedged)m[k].keyHedged++; if(uniqueHedge)m[k].uniqueHedge++
    if(uniqueHedge&&absDistractors>=2)m[k].uniqueHedgeAnd2Abs++
    m[k].absSum+=absDistractors
  }
  return m
}
const pc=(a,b)=>(100*a/b).toFixed(1).padStart(5)+'%'
for(const d of ['Information and Ideas','Craft and Structure','Standard English Conventions','Advanced Math']){
  const rows=await load(d)
  console.log('\n### '+d+'  ('+rows.length+' live)')
  console.log('  n   keyHedged uniqHedge uniq+2abs  meanAbsDistr  cohort')
  for(const [k,v] of Object.entries(score(rows)).sort((a,b)=>b[1].n-a[1].n))
    console.log(String(v.n).padStart(4), pc(v.keyHedged,v.n), pc(v.uniqueHedge,v.n), pc(v.uniqueHedgeAnd2Abs,v.n), '      '+(v.absSum/v.n).toFixed(2)+'/3', '     '+k)
}
