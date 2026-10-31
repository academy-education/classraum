#!/usr/bin/env node
/**
 * oo-render.mjs — the REPORT-ONLY no-passage attack of ITEP-SLATE-READING-V2.prereg.md §5.
 *   node scripts/study-bank/itep-reading-v2-work/oo-render.mjs <outdir>      (from the repo root; reads the DB)
 * 4 files; at most one item per unit (passage set) per file; item k of each unit -> file k (Part 1 texts spread
 * 2 per file). Each file interleaves 10 live isee/reading control items (10 groups with 4+ live items, seeded
 * 'itep-reading-v1-ctl', first 4 in stored order, item k -> file k). Option order shuffled, seeded.
 * Writes <outdir>/oo-f<k>.blind.json and <outdir>/oo-f<k>.key.json. Exits 2 on a short read or a short deal.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { rng, shuffleWith } from '../seeded-shuffle.mjs'

const out = process.argv[2]; const die = m => { console.error(`oo-render: ${m}`); process.exit(2) }
if (!out) die('usage: oo-render.mjs <outdir>')
const seed = s => parseInt(createHash('sha256').update(s).digest('hex').slice(0, 8), 16)
const W = 'scripts/study-bank/itep-reading-v2-work'
const units = []
for (const x of 'ABCDEFGH') for (const s of JSON.parse(readFileSync(`${W}/items/${x}.json`, 'utf8')).sets) units.push({ id: s.set_id, part: s.part, items: s.items.map(i => ({ id: i.qid, choices: i.choices, key: i.correct_answer })) })
const files = [[], [], [], []]
const p1 = units.filter(u => u.part === 1)
p1.forEach((u, i) => files[i % 4].push({ arm: 'cand', ...u.items[0] }))
for (const u of units.filter(u => u.part > 1)) u.items.slice(0, 4).forEach((it, k) => files[k].push({ arm: 'cand', ...it }))

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const scope = q => q.eq('family', 'isee').eq('section', 'reading').eq('verified', true).eq('archived', false).not('passage_group_id', 'is', null)
const { count } = await scope(db.from('study_item_bank').select('id', { count: 'exact', head: true }))
const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await scope(db.from('study_item_bank').select('id,passage_group_id,item,created_at')).order('created_at').order('id').range(f, f + 999)
  if (error) die(error.message); rows.push(...data); if (data.length < 1000) break
}
if (rows.length !== count) die(`read ${rows.length} of ${count}`)
const groups = new Map(); for (const r of rows) { if (!groups.has(r.passage_group_id)) groups.set(r.passage_group_id, []); groups.get(r.passage_group_id).push(r) }
const eligible = [...groups].filter(([, g]) => g.length >= 4 && g.slice(0, 4).every(r => r.item?.choices?.length === 4)).map(([k]) => k).sort()
const chosen = shuffleWith([...eligible], rng(seed('itep-reading-v1-ctl'))).slice(0, 10)
if (chosen.length !== 10) die(`only ${chosen.length} eligible control groups`)
for (const g of chosen) groups.get(g).slice(0, 4).forEach((r, k) => files[k].push({ arm: 'ctl', id: r.id, choices: r.item.choices, key: r.item.correct_answer }))
// v2: the control must be v1's exact control (prereg §5); refuse if the live pool moved under the seed.
for (let k = 0; k < 4; k++) {
  const v1 = Object.values(JSON.parse(readFileSync(`scripts/study-bank/itep-reading-v1-work/results/oo/oo-f${k + 1}.key.json`, 'utf8'))).filter(x => x.arm === 'ctl').map(x => x.localId).sort().join(',')
  const v2 = files[k].filter(x => x.arm === 'ctl').map(x => x.id).sort().join(',')
  if (v1 !== v2) die(`file ${k + 1}: control differs from v1's (pool moved); not rendering`)
}
mkdirSync(out, { recursive: true })
files.forEach((f, k) => {
  const rand = rng(seed(`itep-reading-v2-oo-f${k + 1}`))
  const order = shuffleWith([...f], rand)
  const blind = [], key = {}
  order.forEach((it, i) => {
    const ch = shuffleWith([...it.choices], rand); const n = String(i + 1)
    blind.push({ id: n, question: 'Which of these four is the answer? (the question and the passage are withheld)', options: Object.fromEntries(ch.map((c, j) => ['ABCD'[j], c])) })
    key[n] = { letter: 'ABCD'[ch.indexOf(it.key)], arm: it.arm, localId: it.id }
  })
  writeFileSync(`${out}/oo-f${k + 1}.blind.json`, JSON.stringify(blind, null, 1)); writeFileSync(`${out}/oo-f${k + 1}.key.json`, JSON.stringify(key, null, 1))
  console.log(`file ${k + 1}: ${f.filter(x => x.arm === 'cand').length} candidate + ${f.filter(x => x.arm === 'ctl').length} control`)
})
console.log(`control pool: ${rows.length} live isee/reading rows, ${eligible.length} eligible groups, chose ${chosen.length}`)
