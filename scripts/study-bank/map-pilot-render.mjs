#!/usr/bin/env node
/**
 * map-pilot-render.mjs: build the MAP pilot options-only attack file.
 *
 * MAP has no live bank, so there is no matched control. Per the
 * pre-registration (MAP-PILOT-2026-10-02.prereg.md), the sanity control is
 * 12 live, verified, unarchived ISEE verbal items rated EASY: 6 synonym and
 * 6 sentence completion, drawn by seed from the whole population. Paging is
 * checked and the denominators are printed.
 *
 * Candidates and control are merged into one batch, shuffled by seed so that
 * position does not reveal which arm an item came from, and then rendered
 * through the committed make-oo-render.mjs (flat key deal, options only).
 *
 * Arms are recovered from the localId prefix in the key file:
 *   MAPP-RLU-*   R/LU candidates
 *   MAPP-MECH-*  Mechanics candidates
 *   anything else  live control
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { rng, shuffleWith } from './seeded-shuffle.mjs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,subskill,difficulty,cohort,item')
    .eq('family', 'isee').eq('section', 'verbal').eq('difficulty', 'easy')
    .eq('verified', true).eq('archived', false).order('id', { ascending: true }).range(f, f + 999)
  if (error) throw new Error(error.message)
  rows.push(...data); if (data.length < 1000) break
}
if (new Set(rows.map(r => r.id)).size !== rows.length) { console.error('REFUSING: paging slipped'); process.exit(2) }

const rand = rng(20261002)
const pick = (sub, n) => {
  const pool = rows.filter(r => r.subskill === sub && Array.isArray(r.item?.choices) && r.item.choices.length === 4
    && r.item.choices.map(String).includes(String(r.item.correct_answer)))
  console.log(`control pool ${sub}: ${pool.length} eligible of ${rows.filter(r => r.subskill === sub).length}`)
  if (pool.length < n) { console.error(`REFUSING: need ${n} ${sub}`); process.exit(2) }
  return shuffleWith(pool.slice(), rand).slice(0, n)
}
const ctl = [...pick('synonym', 6), ...pick('sentence_completion', 6)].map(r => ({
  id: r.id, family: 'isee', subskill: r.subskill, cohort: r.cohort,
  prompt: r.item.prompt, choices: r.item.choices.map(String), correct_answer: String(r.item.correct_answer),
}))
writeFileSync('scripts/study-bank/map-pilot-control.batch.json', JSON.stringify(ctl, null, 1) + '\n')

const cand = ['map-pilot-rlu', 'map-pilot-mech'].flatMap(t => JSON.parse(readFileSync(`scripts/study-bank/${t}.batch.json`, 'utf8')))
if (cand.length !== 24) { console.error(`REFUSING: expected 24 candidates, read ${cand.length}`); process.exit(2) }
/* Flat deal PER ARM, not only over the file. make-oo-render puts item i's key
 * in slot i % 4, so a free shuffle of the merged list dealt the mechanics and
 * control arms 5/4/2/1 (best fixed letter 41.7%), which would have left each
 * arm's control 17 points above chance. Each arm gets exactly 3 positions per
 * residue mod 4; which arm lands at which position is still seeded-random. */
const r2 = rng(202610021)
const armsOf = { rlu: cand.filter(i => i.id.startsWith('MAPP-RLU')), mech: cand.filter(i => i.id.startsWith('MAPP-MECH')), control: ctl }
for (const [a, l] of Object.entries(armsOf)) if (l.length !== 12) { console.error(`REFUSING: arm ${a} has ${l.length}, need 12`); process.exit(2) }
const queues = Object.fromEntries(Object.entries(armsOf).map(([a, l]) => [a, shuffleWith(l.slice(), r2)]))
const merged = Array(36)
for (let r = 0; r < 4; r++) {
  const slots = shuffleWith([0, 1, 2, 3, 4, 5, 6, 7, 8].map(k => k * 4 + r), r2)
  const owners = ['rlu', 'rlu', 'rlu', 'mech', 'mech', 'mech', 'control', 'control', 'control']
  slots.forEach((pos, j) => { merged[pos] = queues[owners[j]].pop() })
}
writeFileSync('scripts/study-bank/map-pilot-merged.batch.json', JSON.stringify(merged, null, 1) + '\n')
execFileSync('node', ['scripts/study-bank/make-oo-render.mjs', 'scripts/study-bank/map-pilot-merged.batch.json', '--tag', 'map-pilot'], { stdio: 'inherit' })

const key = JSON.parse(readFileSync('scripts/study-bank/map-pilot-oo.key.json', 'utf8'))
const arm = id => id.startsWith('MAPP-RLU') ? 'rlu' : id.startsWith('MAPP-MECH') ? 'mech' : 'control'
const deal = {}
for (const k of Object.values(key)) { const a = arm(k.localId); (deal[a] ??= {})[k.letter] = (deal[a][k.letter] ?? 0) + 1 }
for (const [a, d] of Object.entries(deal)) {
  const n = Object.values(d).reduce((x, y) => x + y, 0)
  console.log(`  arm ${a.padEnd(7)} n=${n} deal ${JSON.stringify(d)} best-fixed-letter ${(100 * Math.max(...Object.values(d)) / n).toFixed(1)}%`)
}
