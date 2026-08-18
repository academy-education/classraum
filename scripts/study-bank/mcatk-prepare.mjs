#!/usr/bin/env node
/**
 * MC-ATTACK 2026-08-18 prepare step. READ-ONLY against the bank:
 * writes blind/key/sample FILES under scripts/study-bank/, nothing to the DB.
 *
 * Fresh measurement by design: does NOT exclude items with prior rows in
 * study_item_attacks (unlike attack-cohort.mjs prepare) because the point
 * is a current per-type number after recent bank changes.
 *
 * Render matches the established blind format (attack-cohort.mjs /
 * conversation-2026-08-15.blind.json): stem = item.prompt/question only,
 * options re-lettered with a seeded shuffle. passage/audio/transcript
 * never cross the line.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'

const DIR = '/Users/andylee/Downloads/saas/classraum/scripts/study-bank'
const SEED = 'mcatk-2026-08-18'

function loadEnv() {
  const raw = readFileSync('/Users/andylee/Downloads/saas/classraum/.env.local', 'utf8')
  return Object.fromEntries(raw.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
}
const env = loadEnv()
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } })

function rng(seed) {
  let h = 2166136261
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const shuffle = (arr, rand) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

const TYPES = [
  { domain: 'Academic Passage', slug: 'academic-passage', cap: 120 },
  { domain: 'Academic Talk',    slug: 'academic-talk',    cap: 120 },
  { domain: 'Conversation',     slug: 'conversation',     cap: 120 },
  { domain: 'Daily Life',       slug: 'daily-life',       cap: null }, // <=150: whole population
  { domain: 'Announcement',     slug: 'announcement',     cap: null },
]

for (const t of TYPES) {
  // exact count first — never trust a paged read without it
  const { count, error: cErr } = await db.from('study_item_bank')
    .select('id', { count: 'exact', head: true })
    .eq('family', 'toefl').eq('archived', false).eq('domain', t.domain)
  if (cErr) { console.error(cErr.message); process.exit(1) }

  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank')
      .select('id, item, domain, cohort, difficulty')
      .eq('family', 'toefl').eq('archived', false).eq('domain', t.domain)
      .order('id')
      .range(from, from + 999)
    if (error) { console.error(error.message); process.exit(1) }
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  if (rows.length !== count) {
    console.error(`ROW COUNT MISMATCH ${t.domain}: paged ${rows.length} vs count(*) ${count}`)
    process.exit(1)
  }

  // stratified sample by cohort x difficulty, proportional, seeded
  let picked
  const rand = rng(SEED + ':' + t.slug)
  if (t.cap == null || rows.length <= (t.cap ?? Infinity)) {
    picked = shuffle(rows, rand) // shuffle anyway so item order carries nothing
  } else {
    const strata = {}
    for (const r of rows) (strata[`${r.cohort}|${r.difficulty}`] ??= []).push(r)
    picked = []
    const keys = Object.keys(strata).sort()
    // proportional allocation with largest-remainder
    const alloc = keys.map(k => ({ k, exact: strata[k].length * t.cap / rows.length }))
    for (const a of alloc) a.n = Math.floor(a.exact)
    let left = t.cap - alloc.reduce((s, a) => s + a.n, 0)
    for (const a of alloc.slice().sort((x, y) => (y.exact - Math.floor(y.exact)) - (x.exact - Math.floor(x.exact)))) {
      if (left <= 0) break
      a.n++; left--
    }
    for (const a of alloc) picked.push(...shuffle(strata[a.k], rand).slice(0, a.n))
    picked = shuffle(picked, rand)
  }

  const blind = {}, key = {}
  let skipped = 0
  picked.forEach((row, i) => {
    const it = row.item ?? {}
    const choices = it.choices ?? it.options
    const answer = it.correct_answer ?? it.answer ?? it.correct ?? it.key
    if (!Array.isArray(choices) || choices.length < 3 || answer == null) { skipped++; return }
    const answerText = typeof answer === 'number' ? choices[answer]
      : (choices.find(c => c === answer) ?? choices[{ A: 0, B: 1, C: 2, D: 3 }[String(answer).trim().toUpperCase()] ?? -1])
    if (answerText == null) { skipped++; return }
    const letters = ['A', 'B', 'C', 'D', 'E'].slice(0, choices.length)
    const order = shuffle(choices, rand)
    const n = String(Object.keys(blind).length + 1)
    blind[n] = {
      stem: it.prompt ?? it.question ?? it.stem ?? '',
      options: Object.fromEntries(order.map((txt, k) => [letters[k], txt])),
    }
    key[n] = { letter: letters[order.indexOf(answerText)], _item_id: row.id, cohort: row.cohort, difficulty: row.difficulty }
  })

  writeFileSync(`${DIR}/mcatk-${t.slug}.blind.json`, JSON.stringify(blind, null, 1))
  writeFileSync(`${DIR}/mcatk-${t.slug}.key.json`, JSON.stringify(key, null, 1))
  writeFileSync(`${DIR}/mcatk-${t.slug}.sample.json`, JSON.stringify({
    seed: SEED + ':' + t.slug, domain: t.domain, population: rows.length, sampled: Object.keys(blind).length,
    skipped, strata: Object.fromEntries(Object.entries(
      picked.reduce((m, r) => { const k = `${r.cohort}|${r.difficulty}`; m[k] = (m[k] ?? 0) + 1; return m }, {})).sort()),
    item_ids: Object.values(key).map(k => k._item_id),
  }, null, 1))
  console.log(`${t.domain.padEnd(18)} population ${String(rows.length).padStart(3)}  prepared ${Object.keys(blind).length}${skipped ? `  SKIPPED ${skipped}` : ''}`)
}
