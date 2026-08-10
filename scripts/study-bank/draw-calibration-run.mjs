#!/usr/bin/env node
/**
 * Draw a CALIBRATION run — a sitting whose answer we already know.
 *
 * ── Why ─────────────────────────────────────────────────────────────
 *
 * Three consecutive human sittings produced no usable number, each for
 * a different reason: wrong reviewer identity (B1), wrong cohort drawn
 * (Academic Passage on 08-10), and — on Academic Talk — a reviewer who
 * pressed "can't tell" on 19 of 20 items, including at least one he
 * said in his own note he had solved.
 *
 * CLAUDE.md's rule for this situation is explicit: *a detector that
 * cannot reproduce a known number on known data has no business being
 * pointed at unknown data.* The reviewer IS the detector. Every real
 * cohort we spend on him is 20 minutes of a co-founder's time and one
 * more chance to burn a cohort's first measurement. So before the next
 * real sitting, sit one where we already know what the answer should
 * look like.
 *
 * ── How the control is built ────────────────────────────────────────
 *
 * NOT by fabricating items. Nothing is inserted into study_item_bank
 * and no stored row is touched — the run is assembled purely by
 * SELECTION from items that already exist and have already been
 * attacked:
 *
 *   HALF  the model solved 3/3 blind  — the options give it away, to a
 *                                       model at least
 *   HALF  the model solved 0/3 blind  — the options give nothing away
 *
 * The two halves are interleaved by the same flat key-slot deal as a
 * normal run, so nothing about the ORDER or the letters distinguishes
 * them. The reviewer is told it is an ordinary sitting.
 *
 * ── What each outcome means ─────────────────────────────────────────
 *
 * The measurement is the GAP between the two halves, not either score.
 *
 *   large gap (solved the 3/3s, not the 0/3s)
 *       The instrument works and ranks cohorts the way the model does.
 *       Real sittings can be trusted, and the blind attack is validated
 *       as a screen.
 *
 *   no gap, both LOW, low abstention
 *       The reviewer engaged and could not shortcut either half. That
 *       is a real finding: the model's 100% reflects its own world
 *       knowledge rather than a leak a person can use. Real sittings
 *       are trustworthy; the model's absolute numbers are not.
 *
 *   no gap, both LOW, HIGH abstention
 *       The instrument is still broken and nothing has been learned
 *       about the bank. Fix the brief or the reviewer's understanding
 *       of "can't tell" before spending another cohort. This is the
 *       outcome the run exists to detect, and the one the 08-10 sitting
 *       would have produced.
 *
 *   no gap, both HIGH
 *       Something is leaking through the harness itself — the reviewer
 *       is seeing more than the four options. Check the review UI
 *       before believing ANY previous sitting.
 *
 * Note what is deliberately NOT claimed: that the 0/3 items are
 * "clean" and the 3/3 items are "broken". A model failing to guess is
 * not proof a person cannot, and vice versa. The run tests
 * DISCRIMINATION, which is the property every verdict so far has quietly
 * assumed the reviewer has and which nothing has ever checked.
 *
 * ── Reading it afterwards ───────────────────────────────────────────
 *
 *     score-calibration-run.mjs <runId>
 *
 * The split is written to a sidecar JSON rather than the database,
 * because study_item_reviews has nowhere to record "this item was in
 * the guessable half" and adding a column for one run would put a
 * calibration artefact into the schema every real sitting reads.
 *
 * usage: draw-calibration-run.mjs <reviewerId> [runId]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'

const [reviewerId, runIdArg] = process.argv.slice(2)
if (!reviewerId) {
  console.error('usage: draw-calibration-run.mjs <reviewerId> [runId]')
  process.exit(1)
}

const HALF = 10
const L = ['A', 'B', 'C', 'D']

const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const page = async (table, sel, tweak = q => q) => {
  const out = []
  for (let f = 0; ; f += 1000) {
    const q = tweak(db.from(table).select(sel)).range(f, f + 999)
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

// Same guard as the normal draw: never strand a half-finished sample.
const { data: open } = await db.from('study_item_reviews')
  .select('run_id').eq('reviewer_id', reviewerId).is('blind_at', null).limit(1).maybeSingle()
if (open) { console.error(`REFUSING: "${open.run_id}" is still open for this reviewer.`); process.exit(1) }

// ── The two halves ──
// study_item_attacks_fresh excludes rows whose content_sha has moved on,
// so an item whose options were edited since the attack cannot be graded
// against a stale measurement.
const attacks = await page('study_item_attacks_fresh', 'item_id, solvers, correct, attacked_at')
const latest = new Map()
for (const a of attacks) {
  const prev = latest.get(a.item_id)
  if (!prev || a.attacked_at > prev.attacked_at) latest.set(a.item_id, a)
}

// Anything this reviewer has already seen is disqualified in BOTH
// halves — a second pass over a familiar item measures memory, which is
// the exact defect that voided B1.
const seen = new Set(
  (await page('study_item_reviews', 'item_id, reviewer_id', q => q.eq('reviewer_id', reviewerId)))
    .map(r => r.item_id),
)

const guessable = [], opaque = []
for (const a of latest.values()) {
  if (seen.has(a.item_id) || a.solvers < 3) continue
  if (a.correct === a.solvers) guessable.push(a.item_id)
  else if (a.correct === 0) opaque.push(a.item_id)
}
console.log(`candidates — model solved 3/3: ${guessable.length}, model solved 0/3: ${opaque.length}`)
if (guessable.length < HALF || opaque.length < HALF) {
  console.error(`need ${HALF} of each; attack more items first`)
  process.exit(1)
}

const ids = [...guessable, ...opaque]

const bank = await page('study_item_bank', 'id, domain, item',
  q => q.in('id', ids).neq('archived', true))
const byId = new Map(bank.map(r => [r.id, r]))

/** Same usability filter as the normal draw — 4 distinct choices, key present. */
const usable = id => {
  const it = byId.get(id)?.item
  return !!it && Array.isArray(it.choices) && it.choices.length === 4
    && typeof it.correct_answer === 'string' && it.choices.indexOf(it.correct_answer) >= 0
    && new Set(it.choices.map(c => String(c).trim())).size === 4
}

const sh = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

/*
 * ── The cohort confound, and what is done about it ──────────────────
 *
 * A first draft of this script took both halves at random and produced
 * an opaque half that was 5 Choose a Response + 3 Standard English
 * Conventions against a guessable half that was mostly SAT Math and
 * Reading. A gap measured on that run would have been unreadable: it
 * could equally have been the reviewer discriminating, or simply him
 * being better at one cohort than another. The whole point of a
 * calibration run is that its answer is known, and that one's was not.
 *
 * A fully cohort-MATCHED design is not available: across the bank there
 * are only six cohorts-with-both, so a matched run would be 12 items —
 * under HUMAN_VERDICT_MIN, and at 6 per half a single item swings a
 * half by 17 points, which is most of the gap threshold.
 *
 * So the halves are matched as far as the pool allows and the residual
 * is REPORTED rather than buried: guessable items are drawn
 * preferentially from the cohorts the opaque half actually contains,
 * and both this script and the scorer print the per-cohort overlap. The
 * gap is read only within the overlapping cohorts; the overall gap is
 * printed but explicitly not the verdict.
 *
 * This does not make the gap strong evidence at the current attack
 * coverage. It makes its weakness visible, which is the difference
 * between a limitation and a defect. The ABSTENTION verdict — the one
 * the run mainly exists for — is unaffected by any of this, because it
 * does not depend on the halves at all.
 */
const domainOf = id => byId.get(id)?.domain ?? '?'

const pickO = sh(opaque.filter(usable)).slice(0, HALF)
const opaqueCohorts = new Set(pickO.map(domainOf))

const gUsable = guessable.filter(usable)
const gMatched = sh(gUsable.filter(id => opaqueCohorts.has(domainOf(id))))
const gRest = sh(gUsable.filter(id => !opaqueCohorts.has(domainOf(id))))
const pickG = [...gMatched, ...gRest].slice(0, HALF)

if (pickG.length < HALF || pickO.length < HALF) {
  console.error(`after the usability filter: ${pickG.length} guessable, ${pickO.length} opaque — need ${HALF} each`)
  process.exit(1)
}

const overlap = [...opaqueCohorts].filter(d => pickG.some(id => domainOf(id) === d))
const matchedPairs = overlap.reduce((n, d) => n + Math.min(
  pickG.filter(id => domainOf(id) === d).length,
  pickO.filter(id => domainOf(id) === d).length), 0)

// Interleaved by shuffle, so the two halves are indistinguishable in
// order. The key slots are dealt FLAT across the whole run for the same
// reason the normal draw does it: a free shuffle once produced a 56.3%
// control, at which a reviewer's score means nothing.
const sample = sh([...pickG, ...pickO])
const slots = sh(sample.map((_, i) => L[i % 4]))

const runId = runIdArg || `calibration-${new Date().toISOString().slice(0, 10)}`
const rows = sample.map((id, i) => {
  const it = byId.get(id).item
  const ki = it.choices.indexOf(it.correct_answer)
  const others = sh([0, 1, 2, 3].filter(x => x !== ki))
  const keyAt = L.indexOf(slots[i])
  const shown = []
  for (let s = 0; s < 4; s++) shown.push(s === keyAt ? ki : others.pop())
  if (new Set(shown).size !== 4) throw new Error(`item ${id}: duplicate slot`)
  if (shown[keyAt] !== ki) throw new Error(`item ${id}: key misplaced`)
  return { item_id: id, run_id: runId, reviewer_id: reviewerId, shown_order: shown, key_slot: slots[i] }
})

const { error } = await db.from('study_item_reviews').insert(rows)
if (error) { console.error('insert failed:', error.message, error.code ?? ''); process.exit(1) }

const keyPath = `scripts/study-bank/calibration-key-${runId}.json`
writeFileSync(keyPath, JSON.stringify({
  runId,
  reviewerId,
  drawnAt: new Date().toISOString(),
  note: 'Which half each item came from. Read by score-calibration-run.mjs. NOT in the database on purpose — see the header of draw-calibration-run.mjs.',
  guessable: pickG,
  opaque: pickO,
  domains: Object.fromEntries(sample.map(id => [id, byId.get(id).domain])),
  // Cohorts present in BOTH halves. The scorer reports the gap
  // restricted to these separately from the overall gap, because only
  // the restricted one is free of the cohort confound.
  overlapCohorts: overlap,
}, null, 2))

const counts = L.map(x => rows.filter(r => r.key_slot === x).length)
console.log(`drawn ${rows.length} into run "${runId}"  (${HALF} model-guessable + ${HALF} model-opaque, interleaved)`)
console.log(`key letters ${L.map((x, i) => `${x}:${counts[i]}`).join(' ')}  ->  control ${(100 * Math.max(...counts) / rows.length).toFixed(1)}%`)
console.log(`split written to ${keyPath}`)
const tally = list => Object.entries(list.reduce((m, id) => (m[domainOf(id)] = (m[domainOf(id)] || 0) + 1, m), {}))
  .sort((a, b) => b[1] - a[1]).map(([d, n]) => `${d} ${n}`).join(', ')
console.log(`\n  guessable half: ${tally(pickG)}`)
console.log(`  opaque    half: ${tally(pickO)}`)
console.log(`\n  cohorts in BOTH halves: ${overlap.length ? overlap.join(', ') : 'NONE'} (${matchedPairs} matched items)`)
if (matchedPairs < 6) {
  console.log('  ! the gap is confounded with cohort at this coverage — the abstention verdict is the reliable one.')
  console.log('    Attack more items in the opaque-half cohorts to strengthen it.')
}
console.log(`\nWhen it is done:  node scripts/study-bank/score-calibration-run.mjs ${runId}`)
