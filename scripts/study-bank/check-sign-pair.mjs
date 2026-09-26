#!/usr/bin/env node
/**
 * check-sign-pair.mjs [--selftest] [batch.json ...] — when an option set holds
 * both x and -x, is the KEY one of that pair?
 *
 * FOUND 2026-09-26 by the options-only attack on the first HARD-BAND Algebra
 * control. The live control scored 69.0% (every mixed-band control this month
 * sat at 35.7-42.9) and all three solver samples named the same mechanism on
 * the items they hit unanimously: "x and -x both present -> the key is the
 * positive one". That is decidable without a model, so — as with the hub check
 * on 2026-08-06 — the whole population is measured rather than a sample.
 *
 * WHAT IS PRINTED, in the order that matters:
 *   n            numeric 4-option sets scorable
 *   pair sets    sets holding at least one +-pair (the denominator of the tell)
 *   key in pair  how often the key is a member. CHANCE is the pair's share of
 *                the set — 2 of 4 = 50% for one pair, 100% for two — computed
 *                per set, never a literal.
 *   key positive how often the key is the POSITIVE member (chance 25% per pair
 *                set, since either member is equally likely under a fair draw)
 *
 * A tell needs BOTH a high key-in-pair rate AND enough pair sets to matter;
 * a rate over three items is printed but says nothing, and the line says so.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const val = s => { const t=String(s).trim().replace(/−/g,'-').replace(/[$,%]/g,'')
  if(/^-?\d+\/\d+$/.test(t)){const [a,b]=t.split('/').map(Number);return a/b}
  return Number(t) }

export function scoreSets(sets) {
  let n = 0, skipped = 0, pairSets = 0, keyIn = 0, keyPos = 0, chanceIn = 0
  for (const { choices, key } of sets) {
    const nums = choices.map(val)
    if (nums.length !== 4 || nums.some(x => !Number.isFinite(x))) { skipped++; continue }
    const ki = choices.findIndex(c => String(c).trim() === String(key).trim())
    if (ki < 0) { skipped++; continue }
    n++
    const inPair = nums.map(v => v !== 0 && nums.includes(-v))
    const members = inPair.filter(Boolean).length
    if (!members) continue
    pairSets++
    chanceIn += members / 4
    if (inPair[ki]) { keyIn++; if (nums[ki] > 0) keyPos++ }
  }
  return { n, skipped, pairSets, keyIn, keyPos, chanceIn }
}

export function print(label, sets) {
  const r = scoreSets(sets)
  if (!r.n) { console.log(`${label.padEnd(34)} NOT MEASURED — 0 four-option numeric sets (${r.skipped} skipped: five-choice, non-numeric, or key not printed)`); return r }
  if (!r.pairSets) { console.log(`${label.padEnd(34)} n=${String(r.n).padStart(4)}  no +-pair in any set — nothing to read`); return r }
  const rate = 100 * r.keyIn / r.pairSets, chance = 100 * r.chanceIn / r.pairSets, pos = 100 * r.keyPos / r.pairSets
  const thin = r.pairSets < 8 ? '   (under 8 pair sets: printed, not evidence)' : ''
  const flag = !thin && r.keyIn >= 5 && rate >= chance + 25 ? '   <-- KEY SITS IN THE PAIR far above chance' : ''
  console.log(`${label.padEnd(34)} n=${String(r.n).padStart(4)}  pair sets ${String(r.pairSets).padStart(3)} = ${(100*r.pairSets/r.n).toFixed(1).padStart(5)}%   key in pair ${String(r.keyIn).padStart(3)}/${r.pairSets} = ${rate.toFixed(1).padStart(5)}% (chance ${chance.toFixed(1)}%)   key is the positive member ${pos.toFixed(1)}% (chance ~25%)${thin}${flag}`)
  return r
}

const RUN_AS_CLI = process.argv[1] && process.argv[1].endsWith('check-sign-pair.mjs')
if (RUN_AS_CLI && process.argv.includes('--selftest')) {
  // Known answers: the tell fires only when the key is in the pair.
  const rigged = Array.from({ length: 10 }, (_, i) => ({ choices: [String(i+1), String(-(i+1)), String(i+7), String(i+20)], key: String(i+1) }))
  const clean  = Array.from({ length: 10 }, (_, i) => ({ choices: [String(i+1), String(-(i+1)), String(i+7), String(i+20)], key: String(i+20) }))
  const noPair = Array.from({ length: 10 }, (_, i) => ({ choices: [String(i+1), String(i+3), String(i+7), String(i+20)], key: String(i+1) }))
  const minus  = [{ choices: ['−4', '4', '9', '12'], key: '4' }]   // typographic minus must be read, not skipped
  const a = scoreSets(rigged), b = scoreSets(clean), c = scoreSets(noPair), d = scoreSets(minus)
  const ok = a.pairSets === 10 && a.keyIn === 10 && a.keyPos === 10
        && b.pairSets === 10 && b.keyIn === 0
        && c.pairSets === 0 && c.n === 10
        && d.n === 1 && d.pairSets === 1 && d.keyIn === 1
  console.log(ok ? 'selftest OK: rigged 10/10, clean 0/10, no-pair 0 sets, U+2212 read' : `selftest FAILED ${JSON.stringify({ a, b, c, d })}`)
  process.exit(ok ? 0 : 1)
}

if (RUN_AS_CLI) {
  for (const f of process.argv.slice(2).filter(a => a.endsWith('.json'))) {
    const b = JSON.parse(readFileSync(f, 'utf8'))
    const items = Array.isArray(b) ? b : b.items
    print(f.replace(/^.*\//,'').replace(/\.batch\.json$/,''), items.map(i=>({choices:i.choices.map(String), key:i.correct_answer})))
  }
  const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n')
    .filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
  const FAMILIES = [['sat','math'],['act','math'],['ssat','math'],['isee','math']]
  console.log('')
  for (const [family, section] of FAMILIES) {
    const rows = []
    for (let f=0;;f+=1000){ const {data,error}=await db.from('study_item_bank').select('item,verified,archived,domain,difficulty,cohort')
      .eq('family',family).eq('section',section).range(f,f+999)
      if(error) throw new Error(error.message); rows.push(...data); if(data.length<1000) break }
    const live = rows.filter(r=>r.verified && !r.archived && Array.isArray(r.item?.choices))
    const toSet = r => ({ choices: r.item.choices.map(String), key: r.item.correct_answer })
    const all = print(`LIVE ${family}/${section}`, live.map(toSet))
    if (!all.pairSets) continue
    for (const d of [...new Set(live.map(r=>r.domain))].sort()) print(`  ${d}`, live.filter(r=>r.domain===d).map(toSet))
    for (const d of ['easy','medium','hard']) print(`  band ${d}`, live.filter(r=>r.difficulty===d).map(toSet))
    // cohorts holding the pair sets, worst first
    const byC = {}
    for (const r of live) { const s = scoreSets([toSet(r)]); if (s.pairSets) { const c = byC[r.cohort] ??= { p:0, k:0 }; c.p++; c.k += s.keyIn } }
    const worst = Object.entries(byC).filter(([,c])=>c.p>=5).sort((a,b)=>b[1].k/b[1].p - a[1].k/a[1].p)
    for (const [c, s] of worst) console.log(`    cohort ${c.padEnd(24)} pair sets ${String(s.p).padStart(3)}  key in pair ${s.k}/${s.p} = ${(100*s.k/s.p).toFixed(1)}%`)
  }
}
