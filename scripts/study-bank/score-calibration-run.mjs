#!/usr/bin/env node
/**
 * Read a calibration run, and say whether the REVIEWER works.
 *
 * The subject here is the instrument, not the bank. See
 * draw-calibration-run.mjs for why that is the question.
 *
 * The rule below is written BEFORE any calibration run has been sat,
 * for the same reason B2-PREREGISTERED.md exists: B1's rule was drafted
 * after its number arrived and came out void. A threshold chosen once
 * the data is visible is not a threshold.
 *
 * usage: score-calibration-run.mjs <runId>
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const [runId] = process.argv.slice(2)
if (!runId) { console.error('usage: score-calibration-run.mjs <runId>'); process.exit(1) }

/* ── The rule, fixed in advance ──────────────────────────────────────
 *
 * ABSTENTION is checked FIRST and can veto everything else. A reviewer
 * who declines most items produces a low score on both halves and
 * therefore a small gap, which would otherwise read as the "engaged but
 * could not shortcut" outcome. Those two look identical in the gap and
 * mean opposite things — the same confusion that nearly cleared 275
 * Academic Talk items.
 *
 * 15% is the abstention level every sitting produced BEFORE the brief
 * started pushing "can't tell": 0/12, 0/20, 0/20, 0/20. 50% is where a
 * sitting stops being about the items at all.
 *
 * The GAP threshold is 25 points: at n=10 per half one item moves a
 * half by 10 points, so a gap under 20 is within the noise of two items
 * landing differently. 25 keeps a margin above that.
 */
const ABSTENTION_GOOD = 0.15
const ABSTENTION_FATAL = 0.50
const GAP_DISCRIMINATES = 25
const BOTH_HIGH = 60

const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const key = JSON.parse(readFileSync(`scripts/study-bank/calibration-key-${runId}.json`, 'utf8'))
const G = new Set(key.guessable), O = new Set(key.opaque)

const { data: rows, error } = await db.from('study_item_reviews')
  .select('item_id, blind_pick, key_slot, blind_at, reviewed_at, note, verdict, realism')
  .eq('run_id', runId)
if (error) { console.error(error.message); process.exit(1) }
if (!rows.length) { console.error(`no rows for run "${runId}"`); process.exit(1) }

const unanswered = rows.filter(r => !r.blind_at).length
if (unanswered) {
  console.log(`INCOMPLETE — ${unanswered} of ${rows.length} items not yet reached. Not scoring a partial run.`)
  process.exit(0)
}

const half = (set) => {
  const rs = rows.filter(r => set.has(r.item_id))
  const abst = rs.filter(r => !r.blind_pick || String(r.blind_pick).trim() === '').length
  const correct = rs.filter(r => r.blind_pick && r.blind_pick === r.key_slot).length
  return { n: rs.length, abst, correct, pct: rs.length ? (100 * correct) / rs.length : 0 }
}
const g = half(G), o = half(O)
const abstRate = (g.abst + o.abst) / rows.length
const gap = g.pct - o.pct

/*
 * The gap restricted to cohorts present in BOTH halves.
 *
 * The overall gap is confounded with cohort: at current attack coverage
 * the opaque half cannot be drawn from the same cohorts as the
 * guessable one (see draw-calibration-run.mjs). A reviewer who is
 * simply better at Choose a Response than at Standard English
 * Conventions would produce a gap with no discrimination at all.
 *
 * Restricting removes the confound and costs sample size. Both are
 * printed; the restricted one is the one to believe, and when it rests
 * on too few items the honest answer is that the gap says nothing —
 * which is why MIN_MATCHED exists rather than a silent fallback to the
 * overall number.
 */
const MIN_MATCHED = 6
const overlapCohorts = new Set(key.overlapCohorts ?? [])
const gm = half(new Set([...G].filter(id => overlapCohorts.has(key.domains?.[id]))))
const om = half(new Set([...O].filter(id => overlapCohorts.has(key.domains?.[id]))))
const matchedN = gm.n + om.n
const matchedGap = gm.n && om.n ? gm.pct - om.pct : null
const gapUsable = matchedN >= MIN_MATCHED && matchedGap !== null

const pc = x => `${x.toFixed(1)}%`
console.log(`\ncalibration run "${runId}"  —  ${rows.length} items\n`)
console.log(`  model-GUESSABLE half   ${g.correct}/${g.n}  ${pc(g.pct)}   (${g.abst} abstained)`)
console.log(`  model-OPAQUE   half   ${o.correct}/${o.n}  ${pc(o.pct)}   (${o.abst} abstained)`)
console.log(`  gap (all items)       ${gap >= 0 ? '+' : ''}${gap.toFixed(1)} points   — CONFOUNDED with cohort, do not read alone`)
console.log(`  gap (matched cohorts) ${matchedGap === null ? 'n/a' : `${matchedGap >= 0 ? '+' : ''}${matchedGap.toFixed(1)} points`}   over ${matchedN} items${gapUsable ? '' : `  — under ${MIN_MATCHED}, too thin to read`}`)
console.log(`  abstention            ${g.abst + o.abst}/${rows.length}  ${pc(100 * abstRate)}\n`)

let verdict, action
if (abstRate > ABSTENTION_FATAL) {
  verdict = 'INSTRUMENT BROKEN — the reviewer declined most of the run'
  action = 'Nothing has been learned about the bank. Do NOT spend another cohort. '
    + 'Fix what "can\'t tell" means to this reviewer first — say it out loud, not only in the brief.'
} else if (gapUsable && matchedGap >= GAP_DISCRIMINATES) {
  verdict = 'INSTRUMENT WORKS — the reviewer separates the two halves'
  action = 'Real sittings can be trusted, and the blind attack is validated as a screen. '
    + 'Proceed with Academic Talk and Craft and Structure.'
} else if (g.pct >= BOTH_HIGH && o.pct >= BOTH_HIGH) {
  verdict = 'HARNESS LEAK — both halves scored high, including items no model could solve'
  action = 'The reviewer is seeing more than the four options. Audit the review UI '
    + 'BEFORE believing any previous sitting, including the ones already banked.'
} else if (abstRate <= ABSTENTION_GOOD && !gapUsable) {
  verdict = 'INSTRUMENT ENGAGED — abstention is back in the normal range; the gap is too thin to read'
  action = 'The thing this run mainly existed to check has passed: the reviewer commits to answers again. '
    + 'Proceed with Academic Talk. The guessable-vs-opaque gap needs more attacked items in the '
    + 'opaque-half cohorts before it can say anything, and is NOT being read here.'
} else if (abstRate <= ABSTENTION_GOOD) {
  verdict = 'INSTRUMENT WORKS, MODEL DOES NOT — reviewer engaged, neither half was shortcuttable'
  action = 'A real finding: the model\'s 100% reflects its own world knowledge, not a leak a person '
    + 'can use. Real sittings are trustworthy; the model\'s ABSOLUTE numbers are not, and blind '
    + 'margins should stop being quoted as findings on their own.'
} else {
  verdict = 'INCONCLUSIVE'
  action = `Abstention ${pc(100 * abstRate)} is above the ${pc(100 * ABSTENTION_GOOD)} the early sittings `
    + 'produced but below the fatal line, and the gap is inside the noise band. Re-run before reading anything into it.'
}

console.log(`  ${verdict}`)
console.log(`  → ${action}\n`)

const notes = rows.filter(r => r.note)
if (notes.length) {
  console.log(`  ${notes.length} note${notes.length === 1 ? '' : 's'} — read these regardless of the verdict;`)
  console.log('  every defect no automated check caught has come out of them:')
  for (const r of notes) console.log(`    · [${G.has(r.item_id) ? 'guessable' : 'opaque'}] ${r.note}`)
  console.log('')
}

const flagged = rows.filter(r => r.verdict && r.verdict !== 'unique')
if (flagged.length) {
  console.log(`  ${flagged.length} item${flagged.length === 1 ? '' : 's'} flagged at step 2 (key not the only defensible answer) — item-level findings, logged separately from the calibration.`)
}
