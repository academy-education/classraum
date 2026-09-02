#!/usr/bin/env node
/**
 * attack-split.mjs — a LEAKAGE-FREE blind attack: deal a cohort's items
 * into K files such that no file holds two items from the same passage.
 *
 *   node attack-split.mjs <run-prefix> --family act --cohort act-english-v1 \
 *        --domain "Production of Writing" [--domain "..."] --files 4 [--seed 7]
 *
 * Writes <run-prefix>-f1.blind.json / .key.json ... -fK, in the same shape
 * attack-cohort.mjs writes, so `attack-cohort.mjs ingest <run-prefix>-fN
 * <solvers...>` scores and persists each file as its own run.
 *
 * Why this exists (2026-09-02): the ACT English round-2 attack scored
 * 90.2% and all three solvers said the dominant signal was CROSS-ITEM -
 * "primary purpose" options summarise paragraph contents, which then
 * answer the placement and transition items of the same essay sitting
 * three lines away in the blind file. That is a property of the attack
 * file, not of a delivered form, where the student has the passage. The
 * question the gate must answer is per item: can THIS item's options be
 * separated without the source? So each solver sees at most one item per
 * passage. Each file needs its OWN three solvers - a solver who has read
 * file 1 has already seen the essay when it opens file 2.
 *
 * Items beyond K per passage are not drawn (they stay unmeasured and
 * visible as such in `attack-cohort.mjs report`).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const [prefix, ...rest] = process.argv.slice(2)
const argAll = f => rest.flatMap((a, i) => a === f ? [rest[i + 1]] : [])
const argOf = f => argAll(f)[0]
const family = argOf('--family'), cohort = argOf('--cohort'), domains = argAll('--domain')
const K = Number(argOf('--files') ?? 4), seed = Number(argOf('--seed') ?? 7)
if (!prefix || !family || !cohort || !K) { console.error('usage: attack-split.mjs <run-prefix> --family f --cohort c [--domain d]... --files K [--seed n]'); process.exit(1) }

let s = seed >>> 0; const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const rows = []
for (let from = 0; ; from += 1000) {
  let q = db.from('study_item_bank').select('id, item, domain, passage_group_id').eq('family', family).eq('cohort', cohort).eq('archived', false).range(from, from + 999)
  if (domains.length) q = q.in('domain', domains)
  const { data, error } = await q
  if (error) { console.error(error.message); process.exit(1) }
  rows.push(...(data ?? [])); if (!data || data.length < 1000) break
}
const groups = {}
for (const r of rows) (groups[r.passage_group_id ?? r.id] ??= []).push(r)
const files = Array.from({ length: K }, () => [])
let dropped = 0
for (const g of Object.values(groups)) {
  const dealt = shuffle(g)
  dealt.forEach((r, j) => { if (j < K) files[j].push(r); else dropped++ })
}
const LETTERS = ['A', 'B', 'C', 'D', 'E']
files.forEach((list, fi) => {
  const blind = {}, key = {}
  shuffle(list).forEach((r, i) => {
    const n = String(i + 1); const it = r.item
    const choices = it.choices; const order = shuffle(choices)
    const letters = LETTERS.slice(0, choices.length)
    const options = Object.fromEntries(order.map((c, k) => [letters[k], c]))
    blind[n] = { stem: it.prompt ?? '', options }
    key[n] = { letter: letters[order.indexOf(it.correct_answer)], _item_id: r.id }
  })
  writeFileSync(`scripts/study-bank/${prefix}-f${fi + 1}.blind.json`, JSON.stringify(blind, null, 1))
  writeFileSync(`scripts/study-bank/${prefix}-f${fi + 1}.key.json`, JSON.stringify(key, null, 1))
  const passages = new Set(list.map(r => r.passage_group_id)).size
  const spread = {}; for (const k of Object.values(key)) spread[k.letter] = (spread[k.letter] ?? 0) + 1
  console.log(`${prefix}-f${fi + 1}: ${list.length} items from ${passages} passages (one each: ${passages === list.length}) key spread ${JSON.stringify(spread)}`)
})
console.log(`${rows.length} items in ${Object.keys(groups).length} passages -> ${K} files; ${dropped} not drawn (beyond ${K} per passage)`)
