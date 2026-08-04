#!/usr/bin/env node
/**
 * check-batch-variety.mjs — the pre-flight that would have killed
 * nearmiss-v1 for zero tokens.
 *
 * ── What this is for ─────────────────────────────────────────────────
 * Four batches in this bank have now failed the same way: a batch built
 * to one brief develops a tell that is invisible within any single item
 * and obvious across the set.
 *
 *   1. key in slot A, 73% of a cohort            (letters)
 *   2. every 4-set a complete ABCD permutation   (structure)
 *   3. identical key PROSE across 8 lectures     (wording)
 *   4. identical rhetorical SHAPE across 16      (nearmiss-v1)
 *
 * (1) and (2) are guarded by verify-answer-key-spread.ts. (3) and (4)
 * were not guarded at all. This guards the LEXICAL part of (4): the
 * shared syntactic pivot, the flat length, the clustered register.
 *
 * ── What this CANNOT see, stated up front ────────────────────────────
 * Speech act is semantic. A regex cannot tell an offer from a warning,
 * and ANSWERABILITY-GATE.md is explicit: "Regexes cannot see this. Do
 * not build a gate out of them." Two gates in this directory have
 * already under-reported by trying (`check-lexical-anchor.mjs` passed
 * nearmiss-v1 at 26.6% while two human-role readers found 3-4 of 16
 * word-matchable).
 *
 * So this measures only what is genuinely lexical, and a PASS here is
 * explicitly not a claim that the batch is varied — it is a claim that
 * the batch does not have the ONE tell we have already been burned by.
 * `--acts` prints the stimuli grouped for a grader to label by hand;
 * that pass stays human.
 *
 * ── There is no clean control, and that is the finding ───────────────
 * This script was first written with the live Choose a Response cohort
 * as its control, on a NARROW pivot regex that scored it 45.1% against
 * nearmiss-v1's 100%. Both numbers were wrong in the same direction.
 *
 * A blind labeller, given the two corpora unmarked and asked to label
 * each stimulus by rhetorical shape SEMANTICALLY, returned:
 *
 *                        narrow regex   wide pivot   labelled CONCESSION
 *   live bank (n=71)        45.1%         94.4%            50.7%
 *   nearmiss-v1 (n=16)      56.3%        100.0%           100.0%
 *
 * The 94.4% was then re-derived directly in SQL, independently of the
 * labeller. The live cohort is NOT a control: ~94% of its stimuli are
 * grant-then-qualify, and the labeller noted its COMPLAINT items all
 * open with a concessive softener ("I don't want to make a fuss, but"),
 * i.e. the same surface shape wearing a different illocution.
 *
 * So the tell that killed nearmiss-v1 is ALREADY IN THE SHIPPED BANK,
 * and it is the first named, checkable candidate cause for that
 * cohort's +40.4 blind margin.
 *
 * Consequence for this file: the thresholds below are NOT calibrated
 * against a known-good corpus, because we do not have one — the ETS
 * baseline run (ledger.json, n=30) kept the scores and discarded the
 * item text. They are set where a batch stops looking like the two
 * corpora we have, both of which fail. Treat a FAIL as informative and
 * a PASS as unproven until a clean corpus exists to calibrate on.
 *
 * usage:
 *   check-batch-variety.mjs <batch.json>     # {items:[{stimulus,...}]} or [{stimulus}]
 *   check-batch-variety.mjs --bank           # the live Choose a Response cohort
 *   check-batch-variety.mjs <f> --acts       # dump stimuli for a human act-label pass
 */
import { readFileSync } from 'node:fs'

const PIVOT_MAX = 0.60      // live bank 0.944 FAIL, nearmiss 1.000 FAIL
const BRITISH_MAX = 0.10    // live bank ~0.15 FAIL, nearmiss ~0.13 FAIL
const OPENING_MIN = 0.55    // distinct first words / items
const LEN_CV_MIN = 0.18     // coefficient of variation of stimulus length

/*
 * WIDE deliberately. The narrow version — /but|though|although|however/
 * — scored nearmiss-v1 at 56.3% and passed it, while two independent
 * human-role readers each counted 16 of 16. It misses every concession
 * carried without the conjunction:
 *
 *   "The argument's fine — it's the ordering that's the problem."
 *   "The piece works. My only hesitation is the opening."
 *   "You're not far off the pace — it's the last two questions."
 *
 * Under-reporting is the failure mode that matters here, so the pattern
 * is tuned to over-report and the number is read as an upper bound.
 */
const PIVOT = /\b(but|though|although|however|whereas|still|only|actually|just|unless|as long as|once)\b|—|;/i
// Deliberately narrow: high-signal BrE markers that a NAm-normed form
// would not carry. Not a dialect detector — a clustering detector.
const BRITISH = /\b(fortnight|whilst|chase (?:them|it|him|her) up|practise|out of interest|straight away|reckon|queue|timetable|mind\b[,.]|i'd not\b|rather not lose)\b/i

function stimuliOf(path) {
  const d = JSON.parse(readFileSync(path, 'utf8'))
  const arr = Array.isArray(d) ? d : d.items
  if (!Array.isArray(arr)) throw new Error(`${path}: no items array`)
  return arr.map(it => String(it.stimulus ?? it.passage ?? '').trim()).filter(Boolean)
}

async function bankStimuli() {
  const { createClient } = await import('@supabase/supabase-js')
  const raw = readFileSync(process.cwd() + '/.env.local', 'utf8')
  const env = Object.fromEntries(raw.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } })
  // .limit() explicitly: PostgREST silently caps at 1000 and a truncated
  // read has already produced one confident wrong number in this repo.
  const { data, error } = await admin.from('study_item_bank')
    .select('item').eq('domain', 'Choose a Response').neq('archived', true).limit(5000)
  if (error) throw new Error(error.message)
  return data.map(r => String(r.item?.passage ?? '')).filter(Boolean)
}

/** Strip the stored "Transcript: \"...\"" wrapper — every live row has
 *  it, so leaving it in makes every stimulus start with the same word
 *  and the opening-variety measure reads 1/71 for a corpus that is
 *  actually fine. */
const unwrap = s => s.replace(/^\s*Transcript:\s*/i, '').replace(/^["“]|["”]$/g, '').trim()

function measure(stimuli) {
  const n = stimuli.length
  const bare = stimuli.map(unwrap)
  const pivot = bare.filter(s => PIVOT.test(s)).length
  const brit = bare.filter(s => BRITISH.test(s)).length
  const firsts = new Set(bare.map(s => (s.toLowerCase().match(/[a-z']+/) || [''])[0]))
  const lens = bare.map(s => s.length)
  const mean = lens.reduce((a, b) => a + b, 0) / n
  const cv = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / n) / mean
  return { n, pivot, brit, opening: firsts.size, cv, mean }
}

function report(label, m) {
  const rows = [
    ['concessive pivot', `${m.pivot}/${m.n}`, m.pivot / m.n, PIVOT_MAX, 'max', 'one rhetorical shape — the nearmiss-v1 failure'],
    ['BrE idiom', `${m.brit}/${m.n}`, m.brit / m.n, BRITISH_MAX, 'max', 'TOEFL is North-American-normed'],
    ['distinct opening word', `${m.opening}/${m.n}`, m.opening / m.n, OPENING_MIN, 'min', 'one author, one sentence-opening habit'],
    ['length spread (CV)', `${Math.round(m.mean)} chars avg`, m.cv, LEN_CV_MIN, 'min', 'flat difficulty — no on-ramp, no hard item'],
  ]
  let failed = 0
  console.log(`\n${label} — ${m.n} stimuli\n`)
  for (const [name, detail, val, thr, dir, why] of rows) {
    const ok = dir === 'max' ? val <= thr : val >= thr
    if (!ok) failed++
    console.log(`  ${ok ? 'pass' : 'FAIL'}  ${name.padEnd(22)} ${(100 * val).toFixed(1).padStart(5)}%  (${dir} ${(100 * thr).toFixed(0)}%)  ${detail}`)
    if (!ok) console.log(`        ^ ${why}`)
  }
  return failed
}

const args = process.argv.slice(2)
const stimuli = args.includes('--bank')
  ? await bankStimuli()
  : stimuliOf(args.find(a => !a.startsWith('--')))
const label = args.includes('--bank') ? 'live bank / Choose a Response' : args.find(a => !a.startsWith('--'))

if (args.includes('--acts')) {
  // The semantic half. Printed, not judged — a grader labels each with
  // one act and we look at the histogram by eye.
  stimuli.map(unwrap).forEach((s, i) => console.log(`${String(i + 1).padStart(3)}. ${s}`))
  process.exit(0)
}

const failed = report(label, measure(stimuli))
console.log(`\n${failed === 0 ? 'no known batch-level tell detected' : `${failed} measure(s) failed`}`)
console.log('NOT a variety claim — speech-act mix is semantic and is not checked here.')
console.log('Run with --acts and label the acts by hand before authoring more.\n')
process.exit(failed === 0 ? 0 : 1)
