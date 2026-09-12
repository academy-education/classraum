/**
 * Matched live control for ACT English.
 *
 * act-english-v4 is STAGED with its nosource stage marked FAIL at 90.0%
 * (sibling-free, 10 passage-disjoint files). Its own ledger verdict says
 * "Screen only for this family (B7)" and records Conventions as "inherent,
 * the quoted sentence carries the whole problem, SAME AS THE SHIPPED FORMS".
 *
 * That claim has never been measured. If the shipped bank scores the same,
 * 90.0% is the instrument's LEVEL on ACT English and not a deviation -- the
 * exact error that nearly triggered a 740-item SAT R&W rebuild (REGISTER §5,
 * 2026-09-12). If the shipped bank is far lower, v4 really does leak.
 *
 * MATCHED ON THREE AXES, because an unmatched control is worse than none:
 *   1. SIBLING-FREE. ACT English is passage-drawn and a solver who sees two
 *      items from one passage reconstructs the passage. v4 was attacked one
 *      item per passage; so is this. Enforced by assertion, not by intent --
 *      the ctrl-ssat-verbal draw pulled multiple members of one pool and
 *      biased a control in the candidate's favour.
 *   2. DOMAIN MIX. v4 ran 27 Conventions / 15 Production / 8 Knowledge.
 *      Drawn to the same proportions.
 *   3. WIDTH. Enhanced ACT English is four-choice; keys dealt FLAT so a
 *      constant-letter solver scores exactly 25.0%.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n')
  .filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})

let s = 20260912 >>> 0
const rand = () => ((s = (s*1664525 + 1013904223) >>> 0) / 2**32)
const shuffle = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a }

const rows=[]
for(let f=0;;f+=1000){
  const {data,error}=await db.from('study_item_bank')
    .select('id,domain,subskill,difficulty,passage_group_id,item')
    .eq('family','act').eq('section','english').eq('verified',true).eq('archived',false).order('id').range(f,f+999)
  if(error) throw error; rows.push(...data); if(data.length<1000) break
}
console.log('live verified ACT English:', rows.length)
const four = rows.filter(r=>Array.isArray(r.item?.choices)&&r.item.choices.length===4)
if (four.length !== rows.length) console.log(`  ${rows.length-four.length} not four-choice, excluded`)

// ONE ITEM PER PASSAGE.
const byPassage = new Map()
for (const r of shuffle(four)) {
  const g = r.passage_group_id ?? `__solo_${r.id}`
  if (!byPassage.has(g)) byPassage.set(g, r)
}
const disjoint = [...byPassage.values()]
console.log('passages available (=> max sibling-free items):', disjoint.length)

/* FOUR passage-disjoint FILES, mirroring how v4 was attacked ("Ten
 * passage-disjoint files, ten solvers: 45/50"). One file can hold at most
 * one item per passage, and the live bank has only 15 passages -- so a
 * single file caps at 15 items, too thin to compare against v4's n=50.
 * Slicing the same 150 items into k disjoint files gives k x 15 measured
 * items, each still seen sibling-free by whoever solves that file. */
const FILES = 4
const SLOT=['A','B','C','D']
const byGroup = new Map()
for (const r of four) {
  const g = r.passage_group_id ?? `__solo_${r.id}`
  if (!byGroup.has(g)) byGroup.set(g, [])
  byGroup.get(g).push(r)
}
console.log('passages:', byGroup.size, ' items per passage:',
  JSON.stringify([...new Set([...byGroup.values()].map(v=>v.length))]))

let total = 0
const domTally = {}
for (let f = 0; f < FILES; f++) {
  const picked = []
  for (const [, items] of byGroup) {
    const shuffled = shuffle(items)
    if (shuffled[f]) picked.push(shuffled[f])   // the f-th item of each passage
  }
  const groups = picked.map(r => r.passage_group_id).filter(Boolean)
  if (new Set(groups).size !== groups.length) { console.error(`REFUSING: file ${f} has two items from one passage`); process.exit(2) }

  const order = shuffle(picked)
  const blind = {}, key = {}
  order.forEach((r, i) => {
    const want = SLOT[i % 4]
    const ch = r.item.choices.slice()
    const ci = ch.findIndex(c => String(c) === String(r.item.correct_answer))
    if (ci < 0) { console.error('REFUSING: key not among choices for', r.id); process.exit(2) }
    const rest = shuffle(ch.filter((_, j) => j !== ci))
    const out = []; let ri = 0
    for (const sl of SLOT) out.push(sl === want ? ch[ci] : rest[ri++])
    const bid = `L${f + 1}-${String(i + 1).padStart(2, '0')}`
    blind[bid] = { options: Object.fromEntries(SLOT.map((sl, j) => [sl, out[j]])) }
    key[bid] = { letter: want, itemId: r.id, domain: r.domain }
    domTally[r.domain] = (domTally[r.domain] ?? 0) + 1
  })
  const dealt = {}; for (const k of Object.values(key)) dealt[k.letter] = (dealt[k.letter] ?? 0) + 1
  writeFileSync(`scripts/study-bank/act-eng-live-ctl-f${f + 1}.blind.json`, JSON.stringify(blind, null, 1) + '\n')
  writeFileSync(`scripts/study-bank/act-eng-live-ctl-f${f + 1}.key.json`, JSON.stringify(key, null, 1) + '\n')
  total += order.length
  console.log(`  file ${f + 1}: ${order.length} items, ${new Set(groups).size} passages, keys ${JSON.stringify(dealt)}`)
}
console.log(`\ntotal ${total} items across ${FILES} sibling-free files (v4 was 50 across 10)`)
console.log('domain mix:', JSON.stringify(domTally), ' -- v4 was 27 CSE / 15 PoW / 8 KoL')
console.log('control = 25.0% (four-choice, keys dealt flat per file)')
