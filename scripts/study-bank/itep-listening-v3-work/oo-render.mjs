#!/usr/bin/env node
/**
 * oo-render.mjs — the REPORT-ONLY no-transcript attack of ITEP-SLATE-LISTENING-V3.prereg.md §5 (v1's instrument and control).
 *   node scripts/study-bank/itep-listening-v3-work/oo-render.mjs <outdir>      (from the repo root; reads the DB)
 * 4 files; at most one item per unit per file: item k of each conversation -> file k (8 per file, 32
 * candidates). Each file interleaves 10 live toefl/listening control items: 10 verified
 * groups whose first 4 items (stored order) are four-choice, seeded 'itep-listening-v1-ctl', item k -> file k. The
 * question STEM is shown (on screen in the real test); the transcript is withheld. Option order shuffled, seeded.
 * Writes <outdir>/oo-f<k>.blind.json and .key.json. Exits 2 on a short read or a short deal.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { rng, shuffleWith } from '../seeded-shuffle.mjs'

const out = process.argv[2]; const die = m => { console.error(`oo-render: ${m}`); process.exit(2) }
if (!out) die('usage: oo-render.mjs <outdir>')
const seed = s => parseInt(createHash('sha256').update(s).digest('hex').slice(0, 8), 16)
const W = 'scripts/study-bank/itep-listening-v3-work'
const units = []
for (const x of 'ABCDEFGH') for (const s of JSON.parse(readFileSync(`${W}/items/${x}.json`, 'utf8')).sets) units.push({ id: s.set_id, part: s.part, items: s.items.map(i => ({ id: i.qid, prompt: i.prompt, choices: i.choices, key: i.correct_answer })) })
const files = [[], [], [], []]
units.filter(u => u.part === 1).forEach((u, i) => files[i % 4].push({ arm: 'cand', ...u.items[0] }))
for (const u of units.filter(u => u.part > 1)) u.items.slice(0, 4).forEach((it, k) => files[k].push({ arm: 'cand', ...it }))
if (files.flat().length !== 32) die(`dealt ${files.flat().length} candidates, want 32`)

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const scope = q => q.eq('family', 'toefl').eq('section', 'listening').eq('verified', true).eq('archived', false).not('passage_group_id', 'is', null)
const { count } = await scope(db.from('study_item_bank').select('id', { count: 'exact', head: true }))
const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await scope(db.from('study_item_bank').select('id,passage_group_id,item,created_at')).order('created_at').order('id').range(f, f + 999)
  if (error) die(error.message); rows.push(...data); if (data.length < 1000) break
}
if (rows.length !== count) die(`read ${rows.length} of ${count}`)
const groups = new Map(); for (const r of rows) { if (!groups.has(r.passage_group_id)) groups.set(r.passage_group_id, []); groups.get(r.passage_group_id).push(r) }
const eligible = [...groups].filter(([, g]) => g.length >= 4 && g.slice(0, 4).every(r => r.item?.choices?.length === 4 && r.item?.prompt)).map(([k]) => k).sort()
const chosen = shuffleWith([...eligible], rng(seed('itep-listening-v1-ctl'))).slice(0, 10)
if (chosen.length !== 10) die(`only ${chosen.length} eligible control groups`)
for (const g of chosen) groups.get(g).slice(0, 4).forEach((r, k) => files[k].push({ arm: 'ctl', id: r.id, prompt: r.item.prompt, choices: r.item.choices, key: r.item.correct_answer }))
mkdirSync(out, { recursive: true })
files.forEach((f, k) => {
  const rand = rng(seed(`itep-listening-v3-oo-f${k + 1}`))
  const blind = [], key = {}
  shuffleWith([...f], rand).forEach((it, i) => {
    const ch = shuffleWith([...it.choices], rand); const n = String(i + 1)
    blind.push({ id: n, question: String(it.prompt).replace(/^\s*\[[^\]]*\]\s*/, ''), note: 'the recording is withheld', options: Object.fromEntries(ch.map((c, j) => ['ABCD'[j], c])) })
    key[n] = { letter: 'ABCD'[ch.indexOf(it.key)], arm: it.arm, localId: it.id }
  })
  writeFileSync(`${out}/oo-f${k + 1}.blind.json`, JSON.stringify(blind, null, 1)); writeFileSync(`${out}/oo-f${k + 1}.key.json`, JSON.stringify(key, null, 1))
  console.log(`file ${k + 1}: ${f.filter(x => x.arm === 'cand').length} candidate + ${f.filter(x => x.arm === 'ctl').length} control`)
})
console.log(`control pool: ${rows.length} live toefl/listening grouped rows, ${eligible.length} eligible groups, chose ${chosen.length}`)
