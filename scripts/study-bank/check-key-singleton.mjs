#!/usr/bin/env node
/**
 * check-key-singleton.mjs [batch.json ...] — is the KEY the lone member of its
 * option set under some cheap predicate a solver can apply at a glance?
 *
 * FOUND 2026-09-26 by a with-source grader on `SM17L-B7`:
 *
 *     {1800, 2025, 2160, 2700}   key 2025 is the ONLY odd value
 *
 * "Pick the odd one out" returns the key with no reading at all. This is the
 * opposite direction from A56's extremity tell — that one says where the key is
 * NOT, this one points straight at it, so a single fire is worth more.
 *
 * WHY A BASE RATE IS PRINTED FOR EVERY PREDICATE. A seventh proxy died this
 * week because four arbitrary integers are almost always separable by SOME
 * small modulus — the fire rate looked alarming and was the base rate. So each
 * predicate reports how often a RANDOM option is the singleton, beside how
 * often the key is. If the two are close, the predicate is reading nothing, and
 * the output says so rather than leaving it to the reader.
 *
 * Predicates are deliberately limited to ones a solver applies without
 * arithmetic: parity, sign, integrality, and roundness (a multiple of 10 among
 * non-multiples or the reverse).
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const val = s => { const t=String(s).trim().replace(/[$,%]/g,'')
  if(/^-?\d+\/\d+$/.test(t)){const [a,b]=t.split('/').map(Number);return a/b}
  return Number(t) }

const PREDS = {
  odd:        v => Number.isInteger(v) && Math.abs(v % 2) === 1,
  even:       v => Number.isInteger(v) && v % 2 === 0,
  negative:   v => v < 0,
  nonInteger: v => !Number.isInteger(v),
  roundTen:   v => Number.isInteger(v) && v % 10 === 0,
}

function score(label, sets) {
  const tally = {}; for (const p of Object.keys(PREDS)) tally[p] = { key: 0, rand: 0 }
  let n = 0, skipped = 0
  for (const { choices, key } of sets) {
    const nums = choices.map(val)
    if (nums.some(x => !Number.isFinite(x))) { skipped++; continue }
    const ki = choices.findIndex(c => String(c) === String(key))
    if (ki < 0) { skipped++; continue }
    n++
    for (const [name, f] of Object.entries(PREDS)) {
      const hits = nums.map(f)
      const lone = hits.filter(Boolean).length === 1
      if (!lone) continue
      const idx = hits.indexOf(true)
      if (idx === ki) tally[name].key++
      tally[name].rand++          // a singleton exists; chance of it being the key is 1/4
    }
  }
  if (!n) { console.log(`${label.padEnd(26)} NOT MEASURED — 0 numeric option sets`); return }
  console.log(`${label}  (n=${n}${skipped ? `, ${skipped} skipped` : ''})`)
  for (const [name, t] of Object.entries(tally)) {
    if (!t.rand) { console.log(`    ${name.padEnd(11)} no set has a lone ${name} value — nothing to read`); continue }
    const keyRate = 100 * t.key / n, chance = 100 * t.rand / n / 4
    const flag = t.key >= 2 && keyRate > 2.5 * chance ? '   <-- the key is the singleton far more often than chance' : ''
    console.log(`    ${name.padEnd(11)} key is the lone value in ${String(t.key).padStart(3)}/${n} = ${keyRate.toFixed(1).padStart(5)}%   (a singleton exists in ${t.rand}/${n}, so chance is ${chance.toFixed(1)}%)${flag}`)
  }
}

for (const f of process.argv.slice(2)) {
  const b = JSON.parse(readFileSync(f, 'utf8'))
  score(f.replace(/^.*\//,'').replace(/\.batch\.json$/,''), b.map(i=>({choices:i.choices.map(String), key:i.correct_answer})))
}
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n')
  .filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
const rows = []
for (let f=0;;f+=1000){ const {data,error}=await db.from('study_item_bank').select('item,verified,archived')
  .eq('family','sat').eq('section','math').range(f,f+999)
  if(error) throw new Error(error.message); rows.push(...data); if(data.length<1000) break }
const live = rows.filter(r=>r.verified && !r.archived && Array.isArray(r.item?.choices) && r.item.choices.length===4)
console.log('')
score('LIVE sat/math', live.map(r=>({choices:r.item.choices.map(String), key:r.item.correct_answer})))
