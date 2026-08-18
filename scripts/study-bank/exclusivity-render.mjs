#!/usr/bin/env node
/**
 * exclusivity-render.mjs — build key-blind, WITH-SOURCE inputs for the
 * exclusivity grader, plus the human-labelled calibration fixture.
 *
 * The question the grader answers is NOT "can you guess the key without
 * the source" (that is the blind attack). It is the opposite one:
 * GIVEN the source, is exactly one option defensible, or is a second
 * one arguable? cr-v7 passed the blind attack at -5.0 and still had a
 * human flag 10 of 40 items as non-unique, so the two gates measure
 * different things and neither substitutes for the other.
 *
 * Modes:
 *   fixture   40 cr-v7 items a human reviewed on 2026-08-18
 *             (run cr-v7-2026-08-18) -> exclusivity-fixture.json with the
 *             human verdicts DECODED through shown_order, and
 *             exclusivity-cal-input.json which is key-blind.
 *   crv7      all live cr-v7 items -> exclusivity-crv7-input.json
 *   atv2      the cleared AT-V2 corpus, read from the batch item files
 *             minus the quarantined lectures -> exclusivity-atv2-input.json
 *
 * DECODE TRAP (this has bitten the project before): a reviewer's note
 * names HIS shuffled letters. study_item_reviews.shown_order[s] is the
 * STORED choice index displayed in slot s. Any mapping from a note to a
 * stored option must go through it, and this file is the only place that
 * mapping is written.
 *
 * Presentation order in every grader input is shuffled by a seeded RNG,
 * independent of both the stored order and the reviewer's order, so a
 * grader flag can never be an artefact of either.
 *
 * READ-ONLY against the database.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'

const HERE = new URL('./', import.meta.url).pathname
const ROOT = '/Users/andylee/Downloads/saas/classraum'
const L = ['A', 'B', 'C', 'D']
const RUN_ID = 'cr-v7-2026-08-18'

/* Pre-registered split, fixed here BEFORE any grader output was seen:
 * fixture rows sorted by item_id ascending, even index = DEV,
 * odd index = HOLDOUT. Any prompt iteration may look at DEV only. */
const splitOf = i => (i % 2 === 0 ? 'dev' : 'holdout')

function rng(s) {
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const shuffle = (a, rand) => { a = [...a]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a }

function db() {
  const env = Object.fromEntries(readFileSync(`${ROOT}/.env.local`, 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}
// Every read paginates: PostgREST caps at 1000 and a truncated read once
// reported "0 problems" over a bank whose defective rows never loaded.
async function page(make) {
  const out = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await make().range(f, f + 999)
    if (error) throw new Error(error.message)
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

const stimulusOf = it => String(it.passage || '').replace(/^Transcript:\s*/, '').trim()

/* Build one key-blind grader row. `seedKey` makes the presentation
 * permutation deterministic per item and independent of stored order. */
function blindRow(id, item, seedKey) {
  const rand = rng([...seedKey].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7))
  const order = shuffle(item.choices.map((_, i) => i), rand)
  const row = {
    id,
    stimulus: stimulusOf(item),
    question: 'Which is the most natural reply?',
    options: Object.fromEntries(order.map((ci, s) => [L[s], item.choices[ci]])),
  }
  return { row, order }
}

const mode = process.argv[2]

if (mode === 'fixture') {
  const d = db()
  const reviews = await page(() => d.from('study_item_reviews').select('*').eq('run_id', RUN_ID).order('item_id'))
  if (reviews.length !== 40) throw new Error(`expected 40 review rows, got ${reviews.length}`)
  const ids = reviews.map(r => r.item_id)
  const items = await page(() => d.from('study_item_bank').select('id,item,cohort,archived,content_sha').in('id', ids).order('id'))
  const byId = new Map(items.map(r => [r.id, r]))
  const fixture = [], input = []
  reviews.sort((a, b) => (a.item_id < b.item_id ? -1 : 1)).forEach((r, i) => {
    const bank = byId.get(r.item_id)
    if (!bank) throw new Error(`reviewed item ${r.item_id} not in bank`)
    const it = bank.item
    const ki = it.choices.indexOf(it.correct_answer)
    if (ki < 0) throw new Error(`item ${r.item_id}: key not among choices`)
    // DECODE: reviewer slot s showed stored choice r.shown_order[s].
    const keySlot = r.shown_order.indexOf(ki)
    if (L[keySlot] !== r.key_slot) throw new Error(`item ${r.item_id}: key_slot ${r.key_slot} but decode says ${L[keySlot]}`)
    // Letters named in the note, decoded to stored indices.
    const named = [...new Set((r.note || '').match(/\b[ABCD]\b/g) || [])]
    const namedStored = named.map(x => r.shown_order[L.indexOf(x)])
    const id = `f${String(i + 1).padStart(2, '0')}`
    const { row, order } = blindRow(id, it, `fixture:${r.item_id}`)
    input.push(row)
    fixture.push({
      id, item_id: r.item_id, split: splitOf(i),
      human_verdict: r.verdict, human_flag: r.verdict !== 'unique',
      human_note: r.note, human_realism: r.realism,
      human_blind_pick_stored: r.shown_order[L.indexOf(r.blind_pick)],
      human_blind_correct: r.blind_pick === r.key_slot,
      note_letters_reviewer: named,
      note_options_decoded: namedStored.map(x => it.choices[x]),
      stored_key_index: ki,
      grader_key_letter: L[order.indexOf(ki)],
      presentation: row.options,
      stimulus: stimulusOf(it), choices: it.choices, correct_answer: it.correct_answer,
      content_sha: bank.content_sha,
    })
  })
  writeFileSync(`${HERE}exclusivity-fixture.json`, JSON.stringify(fixture, null, 2))
  writeFileSync(`${HERE}exclusivity-cal-input.json`, JSON.stringify(input, null, 2))
  const flags = fixture.filter(f => f.human_flag)
  console.log(`fixture 40 rows: ${flags.length} human-flagged (${fixture.filter(f => f.human_verdict === 'broken').length} broken, ${fixture.filter(f => f.human_verdict === 'alternative').length} alternative)`)
  console.log(`  dev ${fixture.filter(f => f.split === 'dev' && f.human_flag).length}/20 flagged   holdout ${fixture.filter(f => f.split === 'holdout' && f.human_flag).length}/20 flagged`)
  const spread = L.map(x => fixture.filter(f => f.grader_key_letter === x).length)
  console.log(`  grader-presentation key spread ${spread.join('/')} (stored spread ${L.map((_, k) => fixture.filter(f => f.stored_key_index === k).length).join('/')})`)
  console.log(`  input file key-free: ${!JSON.stringify(input).includes('correct_answer')}`)
} else if (mode === 'crv7') {
  const d = db()
  const all = await page(() => d.from('study_item_bank').select('id,item,archived,content_sha').eq('cohort', 'cr-v7').order('id'))
  const live = all.filter(r => !r.archived)
  console.log(`cr-v7 rows ${all.length}, live ${live.length}`)
  const input = [], keyfile = {}
  live.forEach((r, i) => {
    const it = r.item
    const id = `x${String(i + 1).padStart(3, '0')}`
    const { row, order } = blindRow(id, it, `crv7:${r.id}`)
    input.push(row)
    keyfile[id] = { item_id: r.id, key_letter: L[order.indexOf(it.choices.indexOf(it.correct_answer))], content_sha: r.content_sha, stimulus: stimulusOf(it) }
  })
  writeFileSync(`${HERE}exclusivity-crv7-input.json`, JSON.stringify(input, null, 2))
  writeFileSync(`${HERE}exclusivity-crv7-key.json`, JSON.stringify(keyfile, null, 2))
  const c = L.map(x => Object.values(keyfile).filter(k => k.key_letter === x).length)
  console.log(`wrote ${input.length} key-blind rows; presentation key spread ${c.join('/')}`)
  console.log(`  input file key-free: ${!JSON.stringify(input).includes('correct_answer')}`)
} else if (mode === 'atv2') {
  /* Cleared corpus = pilot + b1..b5 item files MINUS the quarantined
   * lectures MINUS b4/b5's withdrawn inference items (tranche 1's
   * inference items were restored — ATV2-TRANCHE2-RESULT.md §Consequence).
   *
   * ATV2-TRANCHE2-RESULT.md's restored total of 166 does not reconcile:
   * its per-batch line credits b1 with 32 (26+6) while tranche 1
   * quarantined lecture atv2-b1-p4 and reported b1 cleared = 28. Applying
   * the exclusion LIST rather than the summary line gives 162. */
  const QUARANTINE = new Set(['atv2-b1-p4', 'atv2-b4-p7', 'atv2-b5-p5', 'atv2-b5-p8'])
  const INFERENCE_DROP = new Set(['atv2-b4-items.json', 'atv2-b5-items.json'])
  const files = ['atv2-items.json', 'atv2-b1-items.json', 'atv2-b2-items.json',
    'atv2-b3-items.json', 'atv2-b4-items.json', 'atv2-b5-items.json']
  const input = [], keyfile = {}
  let n = 0, dropQ = 0, dropI = 0
  for (const f of files) {
    const p = HERE + f
    if (!existsSync(p)) { console.error(`MISSING ${f}`); process.exit(1) }
    const rows = JSON.parse(readFileSync(p, 'utf8')).rows
    for (const r of rows) {
      const lec = r.passage_group_id
      if (QUARANTINE.has(lec)) { dropQ++; continue }
      if (INFERENCE_DROP.has(f) && r._meta?.qtype === 'inference') { dropI++; continue }
      const it = r.item
      const id = `a${String(++n).padStart(3, '0')}`
      const rand = rng([...`atv2:${f}:${id}`].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7))
      const order = shuffle(it.choices.map((_, i) => i), rand)
      input.push({ id, stimulus: (it.passage || '').replace(/^Transcript:\s*/, '').trim(), question: it.prompt, options: Object.fromEntries(order.map((ci, s) => [L[s], it.choices[ci]])) })
      keyfile[id] = { file: f, lecture: lec, qtype: r._meta?.qtype, key_letter: L[order.indexOf(it.choices.indexOf(it.correct_answer))] }
    }
  }
  const dropped = `${dropQ} quarantined-lecture + ${dropI} withdrawn-inference`
  writeFileSync(`${HERE}exclusivity-atv2-input.json`, JSON.stringify(input, null, 2))
  writeFileSync(`${HERE}exclusivity-atv2-key.json`, JSON.stringify(keyfile, null, 2))
  console.log(`atv2 cleared ${input.length} items (dropped ${dropped} quarantined)`)
  const c = L.map(x => Object.values(keyfile).filter(k => k.key_letter === x).length)
  console.log(`  presentation key spread ${c.join('/')}`)
  console.log(`  input file key-free: ${!JSON.stringify(input).includes('correct_answer')}`)
} else {
  console.error('usage: exclusivity-render.mjs fixture|crv7|atv2'); process.exit(1)
}
