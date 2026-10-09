#!/usr/bin/env node
/**
 * mf29-dump.mjs <out-dir> — the duplicate-search inputs for sat-math-v29-full
 * (PREREG-MF29-2026-10-10.md; algf27-dump.mjs with the prior set widened to Advanced Math), re-pulled at authoring AND immediately before freeze
 * (A89 process lesson 1: other agents insert maths concurrently).
 *   <out-dir>/live-maths.json   every verified, unarchived maths row in every family
 *                               (sat/act/isee/ssat), paged, with cohort and key
 *   <out-dir>/prior-math.json  every held / dropped / frozen prior SAT Algebra AND Advanced Math item
 *                               from the batch files on disk (sat-math-v12..v28 alg/adv/algfull/full, sat-alg-*, sat-adv-*)
 * Refuses (exit 2) on slipped paging (duplicate ids) or a dump smaller than the table count.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
const out = process.argv[2]
if (!out) { console.error('usage: mf29-dump.mjs <out-dir>'); process.exit(2) }
mkdirSync(out, { recursive: true })
const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,family,cohort,domain,difficulty,item').eq('section', 'math').eq('verified', true).eq('archived', false).order('id').range(f, f + 999)
  if (error) { console.error(error.message); process.exit(2) }
  rows.push(...data); if (data.length < 1000) break
}
const { count } = await db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('section', 'math').eq('verified', true).eq('archived', false)
if (new Set(rows.map(r => r.id)).size !== rows.length || rows.length !== count) { console.error(`REFUSING: paged ${rows.length}, distinct ${new Set(rows.map(r => r.id)).size}, table ${count}`); process.exit(2) }
const live = rows.map(r => ({ id: r.id, family: r.family, cohort: r.cohort, domain: r.domain, difficulty: r.difficulty, prompt: r.item?.prompt ?? '', passage: r.item?.passage ?? undefined, choices: (r.item?.choices ?? []).map(c => typeof c === 'string' ? c : c?.text ?? ''), correct_answer: r.item?.correct_answer ?? null }))
writeFileSync(`${out}/live-maths.json`, JSON.stringify(live))
const D = new URL('.', import.meta.url).pathname
const prior = []
for (const f of readdirSync(D).filter(f => /^sat-math-v(1[2-9]|2[0-8])-(alg|adv|full).*\.batch\.json$/.test(f) || /^sat-(alg|adv)-.*\.batch\.json$/.test(f))) {
  let j; try { j = JSON.parse(readFileSync(D + f, 'utf8')) } catch { continue }
  if (!Array.isArray(j)) continue
  for (const it of j) if (it && it.prompt) prior.push({ id: it.id, file: f, prompt: it.prompt, choices: it.choices, correct_answer: it.correct_answer })
}
const seen = new Set(); const priorU = prior.filter(p => { const k = p.id + '|' + p.prompt; if (seen.has(k)) return false; seen.add(k); return true })
writeFileSync(`${out}/prior-math.json`, JSON.stringify(priorU))
const by = {}; for (const r of live) by[r.family] = (by[r.family] ?? 0) + 1
console.log(`live maths ${live.length} (table ${count}) ${JSON.stringify(by)}; SAT Algebra ${live.filter(r => r.family === 'sat' && r.domain === 'Algebra').length}, SAT Advanced Math ${live.filter(r => r.family === 'sat' && r.domain === 'Advanced Math').length}; prior Algebra + Advanced Math batch items ${priorU.length} -> ${out}`)
