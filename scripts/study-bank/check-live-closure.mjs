#!/usr/bin/env node
/**
 * check-live-closure.mjs [section] — how much of the LIVE maths bank carries the
 * defect that condemned sat-math-v15-adv?
 *
 * WHY. Two blind solvers, attacking a v16 candidate batch interleaved with a
 * matched live control, independently named "one option is the sum, product,
 * quotient or midpoint of two others" as their main mechanism and cited items
 * by number. Resolving those numbers against the key file put ALL NINE hits in
 * the CONTROL arm: candidate 0 of 14, live control 9 of 14, and in four of them
 * the KEY was the composite. The candidate author's machine pass held; the
 * solvers were reading the shipped bank.
 *
 * That is a claim about live data made from a 14-item sample, and the register
 * already records what happens when a sampled rate gets quoted as a population
 * rate (the "derivational hub bank-wide 64.4%" entry, measured later at 98.3%
 * in one cohort and 8.0% everywhere else). This defect is arithmetic and
 * therefore DECIDABLE, so it is measured over the whole population instead.
 *
 * WHAT IT DOES NOT SHOW. A closure relation is not by itself a leak: three
 * consecutive integers are closed under midpoint and nothing follows. The line
 * that matters is KEY-IS-THE-COMPOSITE, which is the form check-key-is-
 * composition.mjs was built and measured against (2 fires, both solved 3/3,
 * zero false alarms, 2-of-5 recall). Both rates are printed; the second is the
 * one to act on.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n')
  .filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
const section = process.argv[2] ?? 'math'
const rows = []
for (let f=0;;f+=1000) {
  const { data, error } = await db.from('study_item_bank').select('id,domain,cohort,item')
    .eq('family','sat').eq('section',section).eq('verified',true).eq('archived',false).range(f,f+999)
  if (error) throw new Error(error.message)
  rows.push(...data); if (data.length<1000) break
}
if (new Set(rows.map(r=>r.id)).size !== rows.length) { console.error('REFUSING: paging slipped'); process.exit(2) }
if (!rows.length) { console.error('REFUSING: zero rows — nothing measured'); process.exit(2) }
const val = s => {
  const t = String(s).trim().replace(/[$,%]/g,'')
  if (/^-?\d+\s+\d+\/\d+$/.test(t)) { const [w,f]=t.split(/\s+/); const [a,b]=f.split('/').map(Number); return Number(w)+(Number(w)<0?-1:1)*a/b }
  if (/^-?\d+\/\d+$/.test(t)) { const [a,b]=t.split('/').map(Number); return a/b }
  return Number(t)
}
const near = (a,b) => Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b) < 1e-9*Math.max(1,Math.abs(a),Math.abs(b))
const by = {}
let scored = 0, skipped = 0
for (const r of rows) {
  const ch = r.item?.choices
  if (!Array.isArray(ch)) { skipped++; continue }
  const opts = ch.map(String).map(s=>({s,n:val(s)}))
  if (opts.some(o=>!Number.isFinite(o.n))) { skipped++; continue }
  scored++
  const keyStr = String(r.item?.correct_answer ?? '')
  let any = false, keyComposite = false
  for (const t of opts) for (let i=0;i<opts.length;i++) for (let j=i+1;j<opts.length;j++) {
    const a=opts[i], b=opts[j]
    if (t.s===a.s||t.s===b.s) continue
    const hit = near(t.n,a.n+b.n)||near(t.n,a.n*b.n)||near(t.n,(a.n+b.n)/2)||(b.n!==0&&near(t.n,a.n/b.n))||(a.n!==0&&near(t.n,b.n/a.n))
    if (hit) { any = true; if (t.s===keyStr) keyComposite = true }
  }
  const d = by[r.domain] ??= { n:0, any:0, key:0 }
  d.n++; if(any) d.any++; if(keyComposite) d.key++
}
console.log(`live sat/${section}: ${rows.length} rows, ${scored} fully numeric, ${skipped} skipped (non-numeric or malformed)`)
console.log(`\n${'domain'.padEnd(34)} ${'n'.padStart(5)} ${'any closure'.padStart(12)} ${'KEY is composite'.padStart(17)}`)
let tn=0,ta=0,tk=0
for (const [d,v] of Object.entries(by).sort((a,b)=>b[1].n-a[1].n)) {
  tn+=v.n; ta+=v.any; tk+=v.key
  console.log(`${d.padEnd(34)} ${String(v.n).padStart(5)} ${(v.any+' ('+(100*v.any/v.n).toFixed(1)+'%)').padStart(12)} ${(v.key+' ('+(100*v.key/v.n).toFixed(1)+'%)').padStart(17)}`)
}
console.log(`${'ALL'.padEnd(34)} ${String(tn).padStart(5)} ${(ta+' ('+(100*ta/tn).toFixed(1)+'%)').padStart(12)} ${(tk+' ('+(100*tk/tn).toFixed(1)+'%)').padStart(17)}`)
console.log(`\nA closure relation alone is NOT a defect — {3,4,5,6} is closed under midpoint and decides nothing.`)
console.log(`The actionable line is KEY IS THE COMPOSITE. Read that column, not the first.`)
