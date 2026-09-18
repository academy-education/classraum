#!/usr/bin/env node
/**
 * actrd-sitting-draw.mjs [--apply]
 *
 * Draws the ACT READING human sitting that the 54 staged items have been
 * waiting on, and that nothing else can substitute for.
 *
 * WHY A PERSON AND NOTHING ELSE. Measured 2026-09-13 on identical items: the
 * model scores 80.6% options-only on shipped ACT Reading where the co-founder
 * scored 10.0%. A 70-point gap means no model instrument can grade this family
 * -- `act-reading-v4` is held on a model 91.7% and `act-reading-v7`'s nosource
 * stage is recorded NOT RUN for exactly this reason. Three graders then found,
 * independently and unprompted, that ACT Reading leaks through SUBJECT RECALL,
 * and the same run measured it: every item a solver flagged as recognition was
 * right, 24 of 24.
 *
 * SO THE PRIMARY MEASUREMENT HERE IS NOT A SCORE. It is the recall rate: how
 * often does a person recognise the subject from the options alone, and does
 * that recognition decide the pick? The score arms are thin by construction
 * and are reported with their intervals, not as verdicts.
 *
 * TWO ITEMS PER PASSAGE, SYMMETRICALLY, AND THAT IS A DELIBERATE CHOICE.
 * ACT Reading runs nine questions on one passage, so a reader given two of them
 * can cross-infer. Strict sibling-freedom is the usual rule and it is what the
 * options-only renders use -- but here it caps the CANDIDATE arm at six items,
 * because `act-reading-v4` and `act-reading-v7` have only six passage groups
 * between them. Six picks cannot decide whether 54 held items leak.
 *
 * So both strata take TWO items per passage instead of one. The reasoning:
 *   - cross-inference pushes a score UP, never down. A staged arm that still
 *     scores LOW under it is conclusive in the direction we need, since the
 *     decision on the table is whether to RELEASE held items.
 *   - applying it to BOTH strata equally keeps the comparison matched, which
 *     is the thing that has decided every measurement this week. Absolute
 *     levels are inflated; the difference between the arms is not.
 *   - if the staged arm comes in HIGH, this design cannot separate a leak from
 *     cross-inference, and the honest answer is to re-run sibling-free rather
 *     than to read a verdict off it. That is stated in the pre-registration
 *     below, before the sitting, not after.
 *
 * THE PRIOR SITTING WAS ALSO NOT sibling-free -- `act-cofounder-2026-09-02`
 * gave him 20 reading items across only 10 groups, five from a single passage
 * -- and he still scored 10.0%, which is why that floor is conservative.
 *
 * EXPOSURE IS TRACKED AT THE PASSAGE, NOT THE ITEM. He has seen items from 10
 * of `act-reading-v1`'s 12 groups. A fresh item from a passage he has already
 * read questions about is not a clean control, so those are reported as their
 * own stratum rather than pooled with the two untouched groups.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const RUN_ID = 'actrd-recall-2026-09-14'
const REVIEWER_ID = '6ca6edaf-4044-4eed-84e0-137ebd79a81d'   // the co-founder, from the SSAT run

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

/* Everything this reviewer has EVER seen, across every run -- not just the ACT
 * one. The guard that matters is `blind_at`, not a null pick: counting null
 * picks once reported six open runs where there was one. */
const seenRows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_reviews').select('item_id,run_id')
    .order('id', { ascending: true }).range(f, f + 999)
  if (error) throw new Error(error.message)
  seenRows.push(...data)
  if (data.length < 1000) break
}
const seenItems = new Set(seenRows.map(r => r.item_id))

const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank')
    .select('id,cohort,domain,verified,passage_group_id,item')
    .eq('family', 'act').eq('section', 'reading').eq('archived', false)
    .order('id', { ascending: true }).range(f, f + 999)
  if (error) throw new Error(error.message)
  rows.push(...data)
  if (data.length < 1000) break
}
if (new Set(rows.map(r => r.id)).size !== rows.length) { console.error('REFUSING: paging slipped'); process.exit(2) }

const groupOf = r => r.passage_group_id ?? ('solo:' + r.id)
const exposedGroups = new Set(rows.filter(r => seenItems.has(r.id)).map(groupOf))
const stratumOf = r => r.cohort === 'act-reading-v1'
  ? (exposedGroups.has(groupOf(r)) ? 'control-passage-exposed' : 'control-clean')
  : `staged-${r.cohort.replace('act-reading-', '')}`

let s = 20260914 >>> 0
const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

/* PER_PASSAGE items per group, never seen, and the SAME depth in both strata.
 * Control passages are capped to the number of staged passages so neither arm
 * is built on a different design from the other. */
const PER_PASSAGE = 2
const byGroup = new Map()
for (const r of shuffle(rows)) {
  if (seenItems.has(r.id)) continue
  const g = groupOf(r)
  if (!byGroup.has(g)) byGroup.set(g, [])
  byGroup.get(g).push(r)
}
const stagedGroups = [...byGroup.entries()].filter(([, v]) => v[0].cohort !== 'act-reading-v1')
const controlGroups = [...byGroup.entries()].filter(([, v]) => v[0].cohort === 'act-reading-v1')
const deep = ([, v]) => v.length >= PER_PASSAGE
const staged = stagedGroups.filter(deep)
const control = shuffle(controlGroups.filter(deep)).slice(0, staged.length)
if (!staged.length) { console.error('REFUSING: no staged passage group has ' + PER_PASSAGE + ' unseen items'); process.exit(2) }
if (control.length !== staged.length) { console.error(`REFUSING: ${control.length} control groups against ${staged.length} staged; the arms would not match`); process.exit(2) }
const picked = [...staged, ...control].flatMap(([, v]) => v.slice(0, PER_PASSAGE))
console.log(`design: ${PER_PASSAGE} items per passage, ${staged.length} staged groups and ${control.length} control groups -- SAME depth both arms`)
const widths = [...new Set(picked.map(r => r.item?.choices?.length))]
if (widths.length !== 1) { console.error(`REFUSING: mixed option widths ${widths}`); process.exit(2) }
const W = widths[0]
const SLOT = ['A', 'B', 'C', 'D', 'E'].slice(0, W)

const tally = {}
for (const r of picked) tally[stratumOf(r)] = (tally[stratumOf(r)] ?? 0) + 1
console.log(`\n${picked.length} items, ${PER_PASSAGE} per passage group, none previously seen by the reviewer`)
for (const k of Object.keys(tally).sort()) console.log(`   ${k.padEnd(26)} ${tally[k]}`)
const gs = picked.map(groupOf)
const depths = {}
for (const g of gs) depths[g] = (depths[g] ?? 0) + 1
const uneven = Object.entries(depths).filter(([, n]) => n !== PER_PASSAGE)
if (uneven.length) { console.error(`REFUSING: uneven passage depth -- ${JSON.stringify(uneven)}. Asymmetric contamination breaks the comparison.`); process.exit(2) }

/* Key slots dealt as flat as the count allows, so the control is DERIVED and
 * chance and best-fixed-letter coincide.
 *
 * SHUFFLED AFTER DEALING -- fixed 2026-09-18. The first version wrote
 * `deal.set(r.id, SLOT[i % W])` over the presentation order, so the key ran
 * A,B,C,D,A,B,C,D... down the screen. The co-founder noticed on run
 * actrd-recall-2026-09-14 and wrote it in his note; a reviewer who acted on
 * it could score 100% without reading an option. He did not act on it and
 * scored at control, so THAT measurement stands on his honesty, not on the
 * instrument. Every other drawer in this directory already does
 * `shuffle(list.map((_, i) => L[i % 4]))`; this one was the only human-facing
 * drawer and the only one that did not. */
const order = shuffle(picked)
const slots = shuffle(order.map((_, i) => SLOT[i % W]))
const deal = new Map()
order.forEach((r, i) => deal.set(r.id, slots[i]))
{ /* Refuse a deal that is still cyclic in presentation order -- the guard
   * that would have caught the defect above. Counts the longest run of
   * consecutive positions that follow the A,B,C,D,... pattern at any phase. */
  let worst = 0
  for (let ph = 0; ph < W; ph++) {
    let run = 0
    for (let i = 0; i < order.length; i++) {
      if (deal.get(order[i].id) === SLOT[(i + ph) % W]) { run++; worst = Math.max(worst, run) } else run = 0
    }
  }
  if (worst >= 2 * W) { console.error(`REFUSING: key deal is cyclic in presentation order (${worst} consecutive positions on the A,B,C,D pattern)`); process.exit(2) }
  console.log(`   longest cyclic run in presentation order: ${worst} (refuses at ${2 * W})`)
}
const dt = {}
for (const v of deal.values()) dt[v] = (dt[v] ?? 0) + 1
const best = 100 * Math.max(...Object.values(dt)) / order.length
console.log(`\nkey deal ${JSON.stringify(dt)} -> chance ${(100 / W).toFixed(1)}%, best-fixed-letter ${best.toFixed(1)}%`)
if (best > 100 / W + 6) { console.error('REFUSING: the deal is lopsided enough to beat chance on letter alone'); process.exit(2) }

/* ROW CONSTRUCTION IS `draw-review-run.mjs`'s ALGORITHM, NOT A SECOND ONE.
 * That script is the canonical drawer and builds `shown_order` as a
 * permutation of ORIGINAL choice indices whose position `keyAt` holds the key
 * index -- the panel renders by that permutation, so writing option strings
 * here would have been a parallel render the app never reads. It cannot
 * express this sitting's passage-depth design, which is the only reason this
 * file selects the items; everything after selection is its logic, including
 * both assertions. */
const runId = RUN_ID
const order2 = order
const rows2 = order2.map((r, i) => {
  const ch = r.item.choices.map(String)
  const n = ch.length
  const ki = ch.indexOf(String(r.item.correct_answer))
  if (ki < 0) { console.error(`REFUSING: key absent on ${r.id}`); process.exit(2) }
  const others = shuffle(Array.from({ length: n }, (_, x) => x).filter(x => x !== ki))
  const keyAt = SLOT.indexOf(deal.get(r.id))
  if (keyAt < 0 || keyAt >= n) { console.error(`REFUSING: slot outside a ${n}-option item on ${r.id}`); process.exit(2) }
  const shown = []
  for (let sIdx = 0; sIdx < n; sIdx++) shown.push(sIdx === keyAt ? ki : others.pop())
  if (new Set(shown).size !== n) { console.error(`REFUSING: duplicate slot on ${r.id}`); process.exit(2) }
  if (shown[keyAt] !== ki) { console.error(`REFUSING: key misplaced on ${r.id}`); process.exit(2) }
  return { item_id: r.id, run_id: runId, reviewer_id: REVIEWER_ID, reviewer_kind: 'human',
           shown_order: shown, key_slot: deal.get(r.id) }
})

/* The key file is the scoring record; the blind file is NOT a render -- the
 * panel renders from shown_order. It is written only so the strata and the
 * deal can be audited without a database round trip. */
const key = Object.fromEntries(order2.map((r, i) => [`Q${String(i + 1).padStart(2, '0')}`,
  { letter: deal.get(r.id), itemId: r.id, stratum: stratumOf(r), domain: r.domain, group: groupOf(r) }]))
writeFileSync('scripts/study-bank/actrd-recall.key.json', JSON.stringify(key, null, 1) + '\n')
console.log(`\nwrote scripts/study-bank/actrd-recall.key.json (${Object.keys(key).length} items)`)

if (!APPLY) { console.log('\nDRY RUN. Re-run with --apply to create the review rows.'); process.exit(0) }

/* ONE OPEN RUN PER REVIEWER, the same guard draw-review-run.mjs enforces, so
 * two half-finished samples can never both be "the sitting". */
const { data: openRows, error: oerr } = await db.from('study_item_reviews')
  .select('run_id').eq('reviewer_id', REVIEWER_ID).is('blind_at', null).limit(1)
if (oerr) throw new Error(oerr.message)
if (openRows?.length) { console.error(`REFUSING: "${openRows[0].run_id}" is still open for this reviewer.`); process.exit(1) }

const { data: made, error: ierr } = await db.from('study_item_reviews').insert(rows2).select('id')
if (ierr) throw new Error(ierr.message)
console.log(`created ${made.length} review rows under run_id ${runId} (blind_at null = drawn, not yet sat)`)
