#!/usr/bin/env node
/**
 * Extract PER-ITEM human blind judgements for the calibration experiment.
 *
 * ── Why per item and not per cohort ──────────────────────────────────
 *
 * The question is whether an algorithm can stand in for the human blind
 * sitting. The obvious test — does a handicapped solver's per-COHORT
 * score track the human's — cannot answer it. Only five cohorts have a
 * usable human number (Academic Passage 13.3, Announcement 15.0, Choose
 * a Response 53.3, Conversation 20.0, Daily Life 25.0/33.3), each ±11-13
 * points, and they carry one bit between them: Choose a Response is high
 * and the rest cluster. Any solver that flags Choose a Response
 * "correlates", including the full-strength attack that is already known
 * to rank cohorts BACKWARDS against humans (r = -0.64).
 *
 * Per ITEM there are ~100 paired observations instead of 5, and it asks
 * the question that matters: does the algorithm fail where the human
 * failed? Cohort scores are averages of exactly this, so if the per-item
 * agreement holds the cohort ranking follows; if it is at chance, no
 * cohort-level fitting can rescue it.
 *
 * ── Which sittings count ─────────────────────────────────────────────
 *
 * Only segments that pass EVERY validity rule in SITTING-PROCEDURE.md §4,
 * applied per (cohort, run) because a single sweep can be careful in one
 * cohort and rushed in the next — the 2026-08-11 sweep ran 222 s/item on
 * Academic Passage and 8 s/item on Academic Talk.
 *
 * Reads study_item_reviews_fresh, so a review whose item was edited after
 * the sitting is excluded rather than silently credited (migration 076).
 *
 * usage: calibration-pairs.mjs [--out pairs.json]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } })

const ABSTENTION_CEILING = 0.20
const SITTING_SPAN_MS = 4 * 60 * 60 * 1000
const MIN_SEC_PER_ITEM = 10
const MIN_N = 10

async function all(table, cols, tweak = q => q) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await tweak(db.from(table).select(cols)).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) return out
  }
}

const reviews = await all('study_item_reviews_fresh',
  'item_id, run_id, blind_pick, key_slot, blind_at',
  q => q.not('blind_at', 'is', null).eq('reviewer_kind', 'human'))

const ids = [...new Set(reviews.map(r => r.item_id))]
/* The question lives in ONE jsonb column. Selecting stem/choices/
 * answer_index as if they were columns is an error PostgREST returns in
 * `error` while leaving `data` null — which the first version of this
 * script ignored, producing an empty meta map, zero kept segments and a
 * confident "PAIRED OBSERVATIONS: 0". Throw instead: a lookup that
 * returns nothing must not be indistinguishable from a bank with nothing
 * in it. */
const meta = new Map()
for (let i = 0; i < ids.length; i += 200) {
  const { data, error } = await db.from('study_item_bank')
    .select('id, domain, family, item')
    .in('id', ids.slice(i, i + 200))
  if (error) throw new Error(`study_item_bank: ${error.message}`)
  for (const d of data ?? []) meta.set(d.id, d)
}
if (!meta.size) throw new Error(`resolved 0 of ${ids.length} reviewed items — check the join`)

/* Group per (cohort, run) — a sweep can be careful in one cohort and
 * rushed in the next, and the pace rule has to see that. */
const seg = new Map()
for (const r of reviews) {
  const domain = meta.get(r.item_id)?.domain
  if (!domain) continue
  const k = `${domain}||${r.run_id}`
  const e = seg.get(k) ?? { domain, run: r.run_id, rows: [], first: null, last: null }
  const t = Date.parse(r.blind_at)
  if (!Number.isNaN(t)) {
    e.first = e.first === null ? t : Math.min(e.first, t)
    e.last = e.last === null ? t : Math.max(e.last, t)
  }
  e.rows.push(r)
  seg.set(k, e)
}

const kept = []
const dropped = []
for (const e of seg.values()) {
  const n = e.rows.length
  const abst = e.rows.filter(r => !r.blind_pick || String(r.blind_pick).trim() === '').length
  const secPerItem = n > 1 && e.first !== null ? (e.last - e.first) / 1000 / (n - 1) : null
  const why =
    n < MIN_N ? `n=${n} < ${MIN_N}`
    : abst / n > ABSTENTION_CEILING ? `abstained ${abst}/${n}`
    : (e.last - e.first) > SITTING_SPAN_MS ? `span ${Math.round((e.last - e.first) / 60000)}min`
    : secPerItem !== null && secPerItem < MIN_SEC_PER_ITEM ? `${secPerItem.toFixed(0)}s/item — clicking`
    : null
  const rec = { ...e, n, abst, secPerItem: secPerItem === null ? null : Math.round(secPerItem) }
  if (why) dropped.push({ ...rec, why }); else kept.push(rec)
}

const pairs = []
for (const e of kept) {
  for (const r of e.rows) {
    const m = meta.get(r.item_id)
    if (!m) continue
    pairs.push({
      itemId: r.item_id,
      domain: e.domain,
      run: e.run,
      // What the HUMAN did, blind. This is the label the solver is being
      // asked to reproduce.
      humanPick: r.blind_pick ?? null,
      keySlot: r.key_slot,
      humanCorrect: Boolean(r.blind_pick && r.blind_pick === r.key_slot),
      // Straight from the jsonb: `prompt` + `choices`. `passage` is the
      // source and is deliberately NOT carried — it is the thing being
      // withheld.
      stem: m.item?.prompt ?? null,
      choices: m.item?.choices ?? null,
      correctAnswer: m.item?.correct_answer ?? null,
      /* The key letter in the BANK's option order — which is NOT the
       * order the reviewer saw (measured: 23/94 alignment, i.e. chance).
       * The sitting shuffles. Correctness is still comparable because it
       * is order-independent: the human either picked the right option or
       * did not, and so does the solver — each scored in its OWN
       * coordinate system. Comparing solverPick to key_slot instead would
       * compare two different orderings and manufacture a null result. */
      bankKeySlot: (() => {
        const cs = m.item?.choices
        const ca = m.item?.correct_answer
        if (!Array.isArray(cs) || ca == null) return null
        const i = cs.findIndex(c => (typeof c === 'string' ? c : c?.text) === ca)
        return i < 0 ? null : ['A','B','C','D','E','F'][i]
      })(),
    })
  }
}

console.log('\nSEGMENTS KEPT (every §4 rule passed)\n')
for (const e of kept.sort((a, b) => a.domain.localeCompare(b.domain))) {
  const c = e.rows.filter(r => r.blind_pick && r.blind_pick === r.key_slot).length
  console.log(`  ${e.domain.padEnd(22)} ${String(e.n).padStart(3)} items  ${String(e.secPerItem).padStart(4)}s/item  human ${((100 * c) / e.n).toFixed(1)}%  ${e.run}`)
}
console.log('\nSEGMENTS DROPPED\n')
for (const e of dropped.sort((a, b) => a.domain.localeCompare(b.domain))) {
  console.log(`  ${e.domain.padEnd(22)} ${String(e.n).padStart(3)} items  ${e.why.padEnd(24)} ${e.run}`)
}

/* Does the letter the REVIEWER saw match this item's own option order?
 * blind_pick and key_slot are letters recorded during the sitting. If the
 * draw shuffled options, the bank's order is not the order the human saw,
 * and asking a solver to pick from the bank order then comparing to
 * key_slot compares two different coordinate systems — silently, and in a
 * direction that would look like "no agreement". Verify rather than
 * assume. */
const L = ['A', 'B', 'C', 'D', 'E', 'F']
let checked = 0, aligned = 0
for (const p of pairs) {
  if (!Array.isArray(p.choices) || p.correctAnswer == null) continue
  const idx = p.choices.findIndex(c => {
    const t = typeof c === 'string' ? c : c?.text
    return t === p.correctAnswer
  })
  if (idx < 0) continue
  checked++
  if (L[idx] === p.keySlot) aligned++
}
console.log(`\nOPTION-ORDER CHECK: ${aligned}/${checked} items where the bank's own key letter matches key_slot`)
if (checked && aligned / checked < 0.95) {
  console.log('  *** the sitting used a DIFFERENT option order — solver picks are not comparable to key_slot ***')
} else if (checked) {
  console.log('  bank order == presented order, so a solver pick over bank order is comparable')
}

const correct = pairs.filter(p => p.humanCorrect).length
console.log(`\nPAIRED OBSERVATIONS: ${pairs.length}  (human got ${correct} right, ${pairs.length - correct} wrong)`)
console.log(`distinct items: ${new Set(pairs.map(p => p.itemId)).size}`)
console.log(`cohorts: ${new Set(pairs.map(p => p.domain)).size}`)

/* The experiment needs BOTH classes well represented — an all-correct or
 * all-wrong label set makes agreement unmeasurable no matter how many
 * rows there are. */
const minority = Math.min(correct, pairs.length - correct)
console.log(`minority class: ${minority}` +
  (minority < 25 ? '  *** TOO FEW — agreement cannot be measured reliably ***' : '  — enough to measure'))

const out = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1] : null
if (out) { writeFileSync(out, JSON.stringify(pairs, null, 2)); console.log(`\nwrote ${out}`) }
