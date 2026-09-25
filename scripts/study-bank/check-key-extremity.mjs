#!/usr/bin/env node
/**
 * check-key-extremity.mjs [batch.json ...] — is the key systematically NOT the
 * largest or smallest option?
 *
 * FOUND 2026-09-25 by the v17 Advanced Math auditor, and neither author saw it.
 * The options are printed in ascending numeric order, so letter position
 * carries no information and `verify-answer-key-spread.ts` is blind by
 * construction. What carries information is RANK: with four options the key is
 * the min or the max 50% of the time by chance, and on that batch it was 3 of
 * 16. A student who strikes the largest and the smallest is then at 1-in-2 on
 * 13 of 16 items having done no mathematics.
 *
 * The cause is not the shuffle — it is distractor families that BRACKET the
 * key: one overshoot, one undershoot, one near miss. Each is a good distractor
 * on its own and the set is a tell.
 *
 * Reported with a two-sided binomial p against the 50% line, and the live bank
 * is measured alongside every batch so a candidate is never read against a
 * literal. Non-numeric option sets are skipped and counted, never guessed at.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const val = s => { const t=String(s).trim().replace(/[$,%]/g,'')
  if(/^-?\d+\s+\d+\/\d+$/.test(t)){const [w,f]=t.split(/\s+/);const [a,b]=f.split('/').map(Number);return Number(w)+(Number(w)<0?-1:1)*a/b}
  if(/^-?\d+\/\d+$/.test(t)){const [a,b]=t.split('/').map(Number);return a/b}
  return Number(t) }

/** two-sided binomial p that k of n came from rate p0 */
function binomP(k, n, p0) {
  const lc = (a,b)=>{ let s=0; for(let i=0;i<b;i++) s += Math.log(a-i) - Math.log(i+1); return s }
  const pmf = i => Math.exp(lc(n,i) + i*Math.log(p0) + (n-i)*Math.log(1-p0))
  const obs = pmf(k); let p = 0
  for (let i=0;i<=n;i++) { const q = pmf(i); if (q <= obs * (1+1e-9)) p += q }
  return Math.min(1, p)
}

function score(label, sets) {
  let n = 0, ext = 0, skipped = 0, sorted = 0
  for (const { choices, key } of sets) {
    const nums = choices.map(val)
    if (nums.some(x=>!Number.isFinite(x))) { skipped++; continue }
    const ki = choices.findIndex(c => String(c) === String(key))
    if (ki < 0) { skipped++; continue }
    n++
    const asc = nums.slice().sort((a,b)=>a-b)
    if (nums.every((x,i)=>x===asc[i])) sorted++
    const k = nums[ki]
    if (k === Math.min(...nums) || k === Math.max(...nums)) ext++
  }
  if (!n) { console.log(`${label.padEnd(26)} NOT MEASURED — 0 numeric option sets (${skipped} skipped)`); return }
  const expected = 2 / choices0(sets)          // 2 extremes out of the width
  const p = binomP(ext, n, expected)
  console.log(`${label.padEnd(26)} key at an extreme ${String(ext).padStart(4)}/${String(n).padEnd(5)} = ${(100*ext/n).toFixed(1).padStart(5)}%  (chance ${(100*expected).toFixed(1)}%)  p=${p < 0.001 ? '<0.001' : p.toFixed(3)}   printed ascending ${sorted}/${n}${skipped?`   skipped ${skipped}`:''}`)
}
function choices0(sets) { const w = sets.find(s=>s.choices?.length)?.choices.length ?? 4; return w }

const files = process.argv.slice(2)
for (const f of files) {
  const b = JSON.parse(readFileSync(f, 'utf8'))
  score(f.replace(/^.*\//,'').replace(/\.batch\.json$/,''), b.map(i=>({choices:i.choices.map(String), key:i.correct_answer})))
}
// The live bank, always, so no batch is scored against a literal.
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n')
  .filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
const rows = []
for (let f=0;;f+=1000){ const {data,error}=await db.from('study_item_bank').select('domain,item,verified,archived')
  .eq('family','sat').eq('section','math').range(f,f+999)
  if(error) throw new Error(error.message); rows.push(...data); if(data.length<1000) break }
const live = rows.filter(r=>r.verified && !r.archived && Array.isArray(r.item?.choices) && r.item.choices.length===4)
console.log('')
score('LIVE sat/math (all)', live.map(r=>({choices:r.item.choices.map(String), key:r.item.correct_answer})))
for (const d of [...new Set(live.map(r=>r.domain))].sort())
  score(`  live ${d}`, live.filter(r=>r.domain===d).map(r=>({choices:r.item.choices.map(String), key:r.item.correct_answer})))
