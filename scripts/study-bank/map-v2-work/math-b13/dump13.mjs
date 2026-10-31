#!/usr/bin/env node
/**
 * dump13.mjs — duplicate-search inputs for MAP Math b13 (MAP-MATH-V2-B13.prereg.md), 2026-10-31. READ ONLY on the DB.
 *   scratchpad/map-v2-math-work/dump-b13/live-maths.json  every UNARCHIVED maths row in every family, verified AND
 *       staged (verified=false rows are released later, so a repeat of one is a repeat), with `verified` kept.
 *   scratchpad/map-v2-math-work/dump-b13/prior-math.json  dump-n11 (2,568 rows) + every n11 item (assembled,
 *       post-return) + the 21 b11 and 39 b12 stage-A candidates.
 * Exits 2 on slipped paging, a count mismatch, or a source file whose size is not the expected one.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
const ROOT = '/Users/andylee/Downloads/saas/classraum', SP = ROOT + '/scratchpad/'
const out = SP + 'map-v2-math-work/dump-b13'
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const rd = (p, n) => { let j; try { j = JSON.parse(readFileSync(SP + p, 'utf8')) } catch (e) { die(`unreadable ${p}`) } if (n != null && j.length !== n) die(`${p} holds ${j.length}, expected ${n}`); return j }
const env = Object.fromEntries(readFileSync(ROOT + '/.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,family,cohort,domain,difficulty,verified,item').eq('section', 'math').eq('archived', false).order('id').range(f, f + 999)
  if (error) die(error.message)
  rows.push(...data); if (data.length < 1000) break
}
const { count, error: ce } = await db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('section', 'math').eq('archived', false)
if (ce) die(ce.message)
if (new Set(rows.map(r => r.id)).size !== rows.length || rows.length !== count) die(`paged ${rows.length}, distinct ${new Set(rows.map(r => r.id)).size}, table ${count}`)
const live = rows.map(r => ({ id: r.id, family: r.family, cohort: r.cohort, domain: r.domain, difficulty: r.difficulty, verified: r.verified, prompt: r.item?.prompt ?? '', passage: r.item?.passage ?? (r.item?.graphic ? JSON.stringify(r.item.graphic).slice(0, 1500) : undefined), choices: (r.item?.choices ?? []).map(c => typeof c === 'string' ? c : c?.text ?? ''), correct_answer: r.item?.correct_answer ?? null }))
mkdirSync(out, { recursive: true })
writeFileSync(out + '/live-maths.json', JSON.stringify(live))
const row = (x, file) => ({ id: x.id, prompt: x.prompt, choices: x.choices, correct_answer: x.correct_answer, domain: x.domain, file })
const prior = rd('map-v2-math-work/dump-n11/prior-math.json', 2568)
const add = []
for (const x of rd('map-math-v2-n11-work/assembled.json', 7)) add.push(row(x, 'map-math-v2 n11 as screened (pass 1)'))
for (const x of rd('map-math-v2-n11-work/assembled.post-return.json')) add.push(row(x, 'map-math-v2 n11 post-return (frozen, held)'))
for (const x of rd('map-v2-math-b11-work/candidates.json', 21)) add.push(row(x, 'map-math-v2 b11 stage-A candidate'))
for (const x of rd('map-v2-math-b12-work/candidates.json', 39)) add.push(row(x, 'map-math-v2 b12 stage-A candidate'))
writeFileSync(out + '/prior-math.json', JSON.stringify([...prior, ...add]))
const by = {}; for (const r of live) { const k = `${r.family}${r.verified ? '' : '(staged)'}`; by[k] = (by[k] ?? 0) + 1 }
console.log(`maths rows ${live.length} (table ${count}) ${JSON.stringify(by)}; prior ${prior.length} + ${add.length} = ${prior.length + add.length} -> ${out}`)
