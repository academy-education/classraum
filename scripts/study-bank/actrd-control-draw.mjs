#!/usr/bin/env node
/**
 * THE ACT READING CONTROL THAT THREE REGISTER ENTRIES ASSUME AND NOBODY RAN.
 *
 * The claim, repeated at REGISTER lines 458, 738 and 748: "on ACT Reading the
 * model floor is ~83% and a human-CLEARED form scored 83.3%, so a number there
 * separates nothing". It is the SOLE justification for recording
 * `act-reading-v7`'s `nosource` stage as NOT RUN.
 *
 * It names `act-reading-v4` as the human-cleared form. That is wrong:
 * `act-reading-v4` is 36 rows at verified=false and no person has ever seen it.
 * The only human sitting that ever touched ACT Reading is
 * `act-cofounder-2026-09-02`, and every one of its 20 reading rows is
 * `act-reading-v1`, verified=true — the SHIPPED cohort. The person scored
 * 2/20 = 10.0% on it, at or below the 25% chance line.
 *
 * So the floor claim has never been measured on the cohort a human actually
 * cleared. This renders it:
 *
 *   CONTROL  act-reading-v1, shipped and human-cleared at 10.0%. If the model
 *            scores ~83% here, the floor is real, the instrument is saturated
 *            on this family, and NOT RUN was the right call.
 *            If the model scores LOW here, the floor was an artefact of the
 *            batches it was measured on, the instrument does discriminate, and
 *            act-reading-v7's nosource must actually be run.
 *
 *   ARM      act-reading-v7, 18 staged items, whose nosource was never run.
 *            UNDERPOWERED BY CONSTRUCTION and reported as such: v7 has 2
 *            passage groups against v1's 12, so a sibling-free file can hold
 *            only 2 of its items to v1's 12.
 *
 * SIBLING-FREE IS THE WHOLE DESIGN. ACT Reading is passage-drawn and nine
 * questions share one passage; a solver seeing two of them reconstructs it.
 * One item per passage group per file, asserted rather than intended.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const FILES = Number(process.env.FILES ?? 3)
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank')
    .select('id,cohort,domain,passage_group_id,item,verified')
    .eq('family', 'act').eq('section', 'reading').eq('archived', false)
    .order('id', { ascending: true }).range(f, f + 999)
  if (error) throw new Error(error.message)
  rows.push(...data)
  if (data.length < 1000) break
}
if (new Set(rows.map(r => r.id)).size !== rows.length) { console.error('REFUSING: paging slipped'); process.exit(2) }

const pick = (cohort, kind) => rows.filter(r => r.cohort === cohort).map(r => {
  const ch = r.item?.choices?.map(String)
  const key = String(r.item?.correct_answer ?? '')
  if (!Array.isArray(ch) || !ch.includes(key)) { console.error(`REFUSING: ${r.id} has no key among its choices`); process.exit(2) }
  return { id: r.id, choices: ch, key, kind, group: r.passage_group_id ?? ('solo:' + r.id), domain: r.domain }
})
const control = pick('act-reading-v1', 'control-shipped')
const arm = pick('act-reading-v7', 'v7-staged')
if (!control.length || !arm.length) { console.error('REFUSING: one stratum is empty'); process.exit(2) }

/* The control must be the HUMAN-CLEARED cohort, not merely a shipped one.
 * Asserted against the review table so a future cohort rename cannot quietly
 * turn this into an unmatched comparison. */
const { data: reviewed, error: rerr } = await db.from('study_item_reviews')
  .select('item_id').eq('run_id', 'act-cofounder-2026-09-02')
if (rerr) throw new Error(rerr.message)
const seen = new Set((reviewed ?? []).map(r => r.item_id))
const overlap = control.filter(c => seen.has(c.id)).length
console.log(`control cohort act-reading-v1: ${control.length} items, ${overlap} of them personally sat by the co-founder`)
if (!overlap) { console.error('REFUSING: no control item was ever seen by a human; this is not a human-cleared control'); process.exit(2) }

const widths = [...new Set([...control, ...arm].map(i => i.choices.length))]
if (widths.length !== 1) { console.error(`REFUSING: mixed widths ${widths}`); process.exit(2) }
const SLOT = ['A', 'B', 'C', 'D']

let s = 20260913 >>> 0
const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

const byGroup = new Map()
for (const it of shuffle([...control, ...arm])) {
  if (!byGroup.has(it.group)) byGroup.set(it.group, [])
  byGroup.get(it.group).push(it)
}
const depth = Math.min(FILES, Math.max(...[...byGroup.values()].map(v => v.length)))
console.log(`${byGroup.size} passage groups; rendering ${depth} sibling-free files`)

/* Slots dealt GLOBALLY across both strata and all files. Dealt per file the
 * pooled best-fixed-letter control inflates, which has cost a run before. */
const order = []
for (let f = 0; f < depth; f++) for (const [, list] of byGroup) if (list[f]) order.push(list[f])
const slotOf = new Map()
order.forEach((it, i) => slotOf.set(it.id, SLOT[i % 4]))
const tally = {}
for (const v of slotOf.values()) tally[v] = (tally[v] ?? 0) + 1
console.log(`global deal ${JSON.stringify(tally)} -> best-fixed-letter control ${(100 * Math.max(...Object.values(tally)) / order.length).toFixed(1)}%`)

let nC = 0, nA = 0
for (let f = 0; f < depth; f++) {
  const picked = []
  for (const [, list] of byGroup) if (list[f]) picked.push(list[f])
  const groups = picked.map(i => i.group)
  if (new Set(groups).size !== groups.length) { console.error(`REFUSING: file ${f + 1} repeats a passage group`); process.exit(2) }
  const blind = {}, key = {}
  shuffle(picked).forEach((it, i) => {
    const want = slotOf.get(it.id)
    const ci = it.choices.indexOf(it.key)
    const rest = shuffle(it.choices.filter((_, j) => j !== ci))
    let r = 0
    const out = SLOT.map(sl => (sl === want ? it.choices[ci] : rest[r++]))
    const bid = `R${f + 1}-${String(i + 1).padStart(2, '0')}`
    blind[bid] = { options: Object.fromEntries(SLOT.map((sl, j) => [sl, out[j]])) }
    key[bid] = { letter: want, localId: it.id, kind: it.kind, domain: it.domain }
    if (it.kind === 'control-shipped') nC++; else nA++
  })
  writeFileSync(`scripts/study-bank/actrd-ctrl-f${f + 1}.blind.json`, JSON.stringify(blind, null, 1) + '\n')
  writeFileSync(`scripts/study-bank/actrd-ctrl-f${f + 1}.key.json`, JSON.stringify(key, null, 1) + '\n')
  console.log(`  file ${f + 1}: ${picked.length} items, ${new Set(groups).size} distinct passages`)
}
console.log(`\ncontrol (shipped, human-cleared) ${nC} items   |   v7 arm ${nA} items`)
if (nA * 3 < 30) console.log(`UNDERPOWERED ARM: ${nA} v7 items = ${nA * 3} picks across three solvers. Report the interval; do not read a verdict off it.`)
