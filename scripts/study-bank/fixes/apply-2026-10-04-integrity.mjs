#!/usr/bin/env node
/**
 * apply-2026-10-04-integrity.mjs [--write | --rollback]
 *
 * Fixes the three "Served broken" defects in BANK-INTEGRITY-2026-10-04.md §3
 * that are data edits on live rows. 45 rows, `item` only. Dry run by default.
 *
 * 1. LETTERS (38 rows: 22 v2, 15 talk-c1, 1 talk-c2). The explanation names
 *    options by letter, but shuffleDrawnChoices re-orders choices every
 *    session. Each letter is replaced by the option's own TEXT (a verbatim
 *    fragment in “…”), from the hand-written plan in letter-rewrites-2026-10-04.mjs.
 *    Only `explanation` changes (asserted). Keys, choices, stems untouched.
 * 2. SEC BLANK CHOICE (2 rows, v2). The "no punctuation" option was stored
 *    as " " and rendered as an empty button. The bank's convention for SEC
 *    punctuation sets (15 live sets with a no-punctuation variant, e.g.
 *    ["acclaim,","acclaim","acclaim;","acclaim:"]) is to carry the word before
 *    the blank inside every choice. Both items are rewritten to that shape:
 *    the anchor word moves from the passage/prompt into the choices. The key
 *    is the same option (asserted by index); rationale choice strings follow.
 * 3. DAILY LIFE SPLIT PASSAGES (5 rows, harvest-v1). A6 (commit 1e9e1909,
 *    phrase-question-fix-{1,2}.json) repaired the passage on the ONE item
 *    whose question was about the misused hedge; A1 (69b253c1) skipped the
 *    whole passage because of that item, so the sibling kept "space
 *    permitting". The sibling gets the A6 passage. Provenance is asserted:
 *    the source row's passage must equal the A6 fix file's passage, and the
 *    target's must still contain "space permitting".
 *
 * Snapshot (full rows) is written on the first run, dry run included, never
 * overwritten. --write refuses if any live row no longer matches it.
 * --rollback restores `item` from the snapshot.
 *
 * content_sha (migration 076) = md5(prompt, passage, key, choices) — NOT the
 * explanation. So part 1 leaves bound evidence fresh; parts 2 and 3 change
 * content_sha and make bound reviews/attacks stale. Counts printed.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { LETTER_REWRITES } from './letter-rewrites-2026-10-04.mjs'

const D = new URL('.', import.meta.url).pathname
const SNAP = D + 'snapshot-2026-10-04-integrity.json'
const WRITE = process.argv.includes('--write')
const ROLLBACK = process.argv.includes('--rollback')
const env = Object.fromEntries(readFileSync(D + '../../../.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const L = 'ABCDE'

// ── 2. SEC plan ──
const SEC = [
  { id: '31cc9322-00d3-4680-bc29-1b546f096fef', field: 'passage', from: 'fishing family ______ went', to: 'fishing ______ went',
    choices: { ', ': 'family,', ' ': 'family', '; ': 'family;', ': ': 'family:' } },
  { id: '3970fa5c-abf2-46b0-a14b-99d89228d932', field: 'prompt', from: 'across the region _____ thousands', to: 'across the _____ thousands',
    choices: { '; ': 'region;', ', ': 'region,', ' ': 'region', ', so, ': 'region, so,' } },
]
// ── 3. Daily Life plan: [A6-repaired source, unrepaired target] ──
const DL = [
  ['0a941e76-556b-48db-a5f5-dde6087e28ea', '56a3abee-7d47-4441-830a-19cd946c36dc'], // pg-6e3c35eb  time permitting
  ['ee40fd82-1423-4fe6-b466-6f1a29187a5e', '2b8a405f-f1b2-4c9c-ae0b-c72c196d637d'], // pg-8ec93027  subject to availability
  ['4bc339e3-c81b-4d0a-9705-506ce2cbef4a', '99a6e172-cffb-4b54-8ce6-7ccb400afbda'], // pg-7d3ae5e1  budget permitting
  ['5b59b12d-faee-4def-b7da-50294f3fbf44', 'caa70a59-d0a1-4ea8-8977-4fe6d72449d9'], // pg-d77f7662  hedge deleted
  ['8a6ff55f-c6d2-45fc-8f40-409f6cb6bdb9', '6ead2164-1d20-43bb-89ae-f0dc192d8116'], // pg-90651a93  time permitting
]
const A6 = [...JSON.parse(readFileSync(D + '../phrase-question-fix-1.json', 'utf8')), ...JSON.parse(readFileSync(D + '../phrase-question-fix-2.json', 'utf8'))]

const TOUCHED = [...LETTER_REWRITES.map(r => r.id), ...SEC.map(s => s.id), ...DL.map(p => p[1])]
if (new Set(TOUCHED).size !== 45) throw new Error(`expected 45 distinct touched ids, got ${new Set(TOUCHED).size}`)

async function rowsById(ids) {
  const { data, error } = await db.from('study_item_bank').select('*').in('id', ids)
  if (error) throw new Error(error.message)
  if (data.length !== ids.length) throw new Error(`expected ${ids.length} rows, got ${data.length}`)
  return Object.fromEntries(data.map(r => [r.id, r]))
}
async function bindings(ids) {
  const c = async (t) => {
    const { data, error } = await db.from(t).select('id,item_id').in('item_id', ids)
    if (error) throw new Error(`${t}: ${error.message}`); return data.length
  }
  return { reviews: await c('study_item_reviews'), reviewsFresh: await c('study_item_reviews_fresh'),
    attacks: await c('study_item_attacks'), attacksFresh: await c('study_item_attacks_fresh') }
}

if (ROLLBACK) {
  const snap = JSON.parse(readFileSync(SNAP, 'utf8'))
  for (const r of snap) {
    const { error } = await db.from('study_item_bank').update({ item: r.item }).eq('id', r.id)
    if (error) throw new Error(`${r.id}: ${error.message}`)
  }
  const back = await rowsById(snap.map(r => r.id))
  const bad = snap.filter(r => !same(back[r.id].item, r.item))
  console.log(`rolled back ${snap.length} rows from ${SNAP}; ${bad.length} mismatched after re-read`)
  process.exit(bad.length ? 1 : 0)
}

// Residual-letter detector for the rewritten text: B–E standalone are never
// English words; "A" only when followed by an option-verdict verb.
const RESIDUAL = /(?<![\w'’-])[B-E](?![\w'’-])|(?<![\w'’-])A (?:is|and|,|restates|treats|takes|hardens|confuses|misreads|misstates|overreaches|overstates|reverses|contradicts|captures|matches|reflects|follows|undercuts|borrows|names|fails)\b/

/** Planned item for every touched id, built from a given source of rows. */
function buildPlan(src) {
  const plan = {}
  // 1. letters
  for (const r of LETTER_REWRITES) {
    const it = src[r.id].item
    if (L[it.choices.indexOf(it.correct_answer)] !== r.key) throw new Error(`${r.id}: stored key is ${L[it.choices.indexOf(it.correct_answer)]}, plan says ${r.key}`)
    let ex = it.explanation
    for (const [o, n] of r.edits) {
      const k = ex.split(o).length - 1
      if (k !== 1) throw new Error(`${r.id}: "${o.slice(0, 50)}" occurs ${k}× (need 1)`)
      const rendered = n.replace(/«([A-E])\|([^»]+)»/g, (_, letter, frag) => {
        const hits = it.choices.map((c, i) => c.includes(frag) ? i : -1).filter(i => i >= 0)
        if (hits.length !== 1 || hits[0] !== L.indexOf(letter)) throw new Error(`${r.id}: fragment “${frag}” is in choice(s) [${hits.map(i => L[i])}], plan says ${letter}`)
        return `“${frag}”`
      })
      if (/[«»]/.test(rendered)) throw new Error(`${r.id}: unrendered placeholder`)
      ex = ex.replace(o, rendered)
    }
    const res = ex.match(RESIDUAL)
    if (res) throw new Error(`${r.id}: residual letter reference "${res[0]}" in: ${ex}`)
    plan[r.id] = { kind: 'letters', to: { ...it, explanation: ex } }
  }
  // 2. SEC
  for (const s of SEC) {
    const it = src[s.id].item
    const keyIdx = it.choices.indexOf(it.correct_answer)
    if (!it.choices.every(c => c in s.choices)) throw new Error(`${s.id}: choices ${JSON.stringify(it.choices)} not all mapped`)
    if (String(it[s.field]).split(s.from).length !== 2) throw new Error(`${s.id}: "${s.from}" not exactly once in ${s.field}`)
    const choices = it.choices.map(c => s.choices[c])
    const to = { ...it, [s.field]: it[s.field].replace(s.from, s.to), choices, correct_answer: choices[keyIdx],
      distractor_rationales: (it.distractor_rationales ?? []).map(d => ({ ...d, choice: s.choices[d.choice] ?? (() => { throw new Error(`${s.id}: rationale choice ${JSON.stringify(d.choice)} unmapped`) })() })) }
    if (to.choices.some(c => !c.trim()) || new Set(to.choices).size !== 4) throw new Error(`${s.id}: bad new choices`)
    if (to.choices.indexOf(to.correct_answer) !== keyIdx) throw new Error(`${s.id}: key moved`)
    plan[s.id] = { kind: 'sec', to }
  }
  // 3. Daily Life
  for (const [srcId, tgtId] of DL) {
    const s = src[srcId], t = src[tgtId]
    const fix = A6.find(f => f.id === srcId)
    if (!fix || fix.passage !== s.item.passage) throw new Error(`${srcId}: source passage is not the A6 passage`)
    if (s.passage_group_id !== t.passage_group_id || s.item.passageGroupId !== t.item.passageGroupId) throw new Error(`${tgtId}: not siblings`)
    if (!/space permitting/i.test(t.item.passage)) throw new Error(`${tgtId}: target no longer has "space permitting"`)
    if (/space permitting/i.test(t.item.prompt + t.item.explanation + t.item.choices.join(' '))) throw new Error(`${tgtId}: target's question refers to the phrase`)
    plan[tgtId] = { kind: 'daily-life', to: { ...t.item, passage: s.item.passage }, from: srcId }
  }
  // Only the intended fields change.
  const allowed = { letters: ['explanation'], sec: ['passage', 'prompt', 'choices', 'correct_answer', 'distractor_rationales'], 'daily-life': ['passage'] }
  for (const [id, p] of Object.entries(plan)) {
    const from = src[id].item
    for (const k of new Set([...Object.keys(from), ...Object.keys(p.to)])) if (!same(from[k], p.to[k]) && !allowed[p.kind].includes(k)) throw new Error(`${id}: ${k} would change`)
  }
  return plan
}

const live = await rowsById([...new Set([...TOUCHED, ...DL.map(p => p[0])])])
// Re-run safety: if the snapshot exists, plan from it (the pre-edit text).
const haveSnap = existsSync(SNAP)
const snapRows = haveSnap ? Object.fromEntries(JSON.parse(readFileSync(SNAP, 'utf8')).map(r => [r.id, r])) : null
const base = haveSnap ? { ...live, ...snapRows } : live
const plan = buildPlan(base)

const pending = TOUCHED.filter(id => !same(live[id].item, plan[id].to))
const done = TOUCHED.filter(id => same(live[id].item, plan[id].to))
for (const k of ['letters', 'sec', 'daily-life']) {
  const ids = TOUCHED.filter(id => plan[id].kind === k)
  console.log(`${k.padEnd(10)} ${ids.length} rows  (${ids.filter(i => pending.includes(i)).length} pending, ${ids.filter(i => done.includes(i)).length} already applied)`)
}
const show = process.argv.includes('--show')
for (const id of pending) {
  const p = plan[id], f = base[id].item
  if (p.kind === 'letters') console.log(`\n  ${id.slice(0, 8)} [${base[id].cohort}] letters\n    OLD: ${f.explanation}\n    NEW: ${p.to.explanation}`)
  else if (p.kind === 'sec') console.log(`\n  ${id.slice(0, 8)} sec  choices ${JSON.stringify(f.choices)} -> ${JSON.stringify(p.to.choices)}  key ${JSON.stringify(f.correct_answer)} -> ${JSON.stringify(p.to.correct_answer)}\n    ${(p.to.passage ?? p.to.prompt).slice(0, 140)}`)
  else console.log(`\n  ${id.slice(0, 8)} daily-life  passage <- ${p.from.slice(0, 8)}  (${f.passage.match(/[^.]*space permitting[^.]*/i)?.[0]?.trim()} -> A6 text)`)
  if (!show && p.kind === 'letters') { /* full text printed above for hand check */ }
}

const before = await bindings(TOUCHED)
const shaIds = TOUCHED.filter(id => plan[id].kind !== 'letters')
const shaBind = await bindings(shaIds)
console.log(`\nbound to all 45: reviews ${before.reviews} (fresh ${before.reviewsFresh}), attacks ${before.attacks} (fresh ${before.attacksFresh})`)
console.log(`bound to the 7 content_sha-changing rows (sec + daily-life): reviews fresh ${shaBind.reviewsFresh}/${shaBind.reviews}, attacks fresh ${shaBind.attacksFresh}/${shaBind.attacks} → these go STALE (076/077), expected.`)
console.log(`letters edit explanation only, which is outside content_sha: their evidence stays fresh.`)

if (!haveSnap) {
  if (done.length) { console.error('REFUSING: no snapshot but some rows already match the plan'); process.exit(2) }
  writeFileSync(SNAP, JSON.stringify(TOUCHED.map(id => live[id]), null, 1) + '\n')
  console.log(`snapshot written: ${SNAP} (${TOUCHED.length} full rows)`)
}
if (!WRITE) { console.log(`\nDRY RUN — ${pending.length} row(s) would change. Re-run with --write.`); process.exit(0) }

// ── WRITE ──
for (const id of pending) if (!same(live[id].item, snapRows?.[id]?.item ?? JSON.parse(readFileSync(SNAP, 'utf8')).find(r => r.id === id).item)) {
  console.error(`REFUSING: ${id} live row no longer matches the snapshot`); process.exit(2)
}
for (const id of pending) {
  const { error } = await db.from('study_item_bank').update({ item: plan[id].to }).eq('id', id)
  if (error) throw new Error(`${id}: ${error.message}`)
}
const after = await rowsById(TOUCHED)
const snap2 = Object.fromEntries(JSON.parse(readFileSync(SNAP, 'utf8')).map(r => [r.id, r]))
let bad = 0
for (const id of TOUCHED) {
  if (!same(after[id].item, plan[id].to)) { console.error(`MISMATCH after write: ${id}`); bad++ }
  const shaShouldMove = plan[id].kind !== 'letters'
  if ((after[id].content_sha !== snap2[id].content_sha) !== shaShouldMove) { console.error(`content_sha ${shaShouldMove ? 'unchanged' : 'changed'}: ${id}`); bad++ }
}
const post = await bindings(TOUCHED)
console.log(`wrote ${pending.length}; re-read ${TOUCHED.length}: ${bad} problem(s). Now fresh: reviews ${post.reviewsFresh}/${post.reviews}, attacks ${post.attacksFresh}/${post.attacks}`)
process.exit(bad ? 1 : 0)
