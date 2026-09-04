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
 * ── The control, obtained 2026-08-05 ─────────────────────────────────
 * This script was first written with the live Choose a Response cohort
 * as its control, on a NARROW pivot regex that scored it 45.1% against
 * nearmiss-v1's 100%. Both numbers were wrong in the same direction: a
 * blind labeller put the live cohort at 94.4% and SQL agreed.
 *
 * So there was no clean corpus, and the thresholds below were guesses.
 * There is one now — the 30 official ETS TOEFL Essentials reply items
 * from ets.org free practice test 1, extracted and held LOCALLY as
 * scripts/study-bank/ets-reference-v1.json (gitignored: it is ETS
 * copyright and must never be committed, served, inserted, or used as
 * few-shot material).
 *
 *                        pivot    BrE    opening    length CV
 *   ETS official (n=30)   0.0%   0.0%     60.0%       19.4%   PASS
 *   live bank   (n=71)   94.4%   0.0%     39.4%       11.8%   fail
 *   nearmiss-v1 (n=16)   87.5%   6.3%     56.3%       10.0%   fail
 *
 * The real form scores ZERO on the tell that killed both of ours. The
 * gate therefore discriminates, which is the property it lacked and
 * the property `check-lexical-anchor.mjs` never had.
 *
 * CAVEAT, carried rather than smoothed over: the official corpus clears
 * two of the four bars narrowly (opening 60.0 vs a 55 floor, CV 19.4 vs
 * an 18 floor). The thresholds were chosen before this corpus existed
 * and happen to sit just under it. They are not tuned, and a batch that
 * scrapes past them is not thereby good.
 *
 * Also from that corpus, and NOT checked here because these are
 * authoring-brief problems rather than batch tells — every one of them
 * is a place CHOOSE-A-RESPONSE-BRIEF.md is stricter than the real exam
 * on the wrong axis:
 *   - official stimuli run 5-12 words (mean 8.2). Our brief mandates
 *     12-28, so every item we author is longer than the longest real one.
 *   - 29 of 30 official stimuli are bare questions. Not one concession.
 *   - official key-length rank is 10/9/2/9 (1 = longest), skewed to the
 *     longest option; the brief demands a flat 25/25/25/25.
 *   - longest:shortest option ratio reaches 2.88x; the brief caps 1.6x.
 *   - official distractors are routinely off-topic word-echoes, which
 *     VERBAL-DISTRACTOR-CONSTRAINT.md would reject outright.
 *
 * ETS's own welcome screen calls that test a familiarization form, not
 * a simulation. Treat it as a control for SHAPE and VARIETY, not for
 * difficulty.
 *
 * usage:
 *   check-batch-variety.mjs <batch.json>     # {items:[{stimulus,...}]} or [{stimulus}]
 *   check-batch-variety.mjs --bank           # the live Choose a Response cohort
 *   check-batch-variety.mjs <f> --acts       # dump stimuli for a human act-label pass
 */
import { readFileSync } from 'node:fs'

const PIVOT_MAX = 0.60      // ETS 0.000 pass; live bank 0.944, nearmiss 0.875 FAIL
const BRITISH_MAX = 0.10    // ETS 0.000 pass (stimuli only; live-bank prose has ~15%)
const OPENING_MIN = 0.55    // ETS 0.600 pass, live bank 0.394 FAIL
const LEN_CV_MIN = 0.18     // ETS 0.194 pass, live bank 0.118 FAIL

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
  /*
   * REFUSE EMPTY INPUT — do not score it.
   *
   * This script reads `stimulus ?? passage`. Item types that carry neither
   * (SSAT/ISEE Verbal: synonyms and analogies, where `passage` is null on
   * all 180 live rows) filtered down to an empty array, and every measure
   * then compared NaN against its threshold. NaN fails every comparison,
   * so the script printed a confident "4 measure(s) failed" over data it
   * had never read — and printed the IDENTICAL output for a batch under
   * test and for a matched sample of the shipped live bank, because
   * neither was measured.
   *
   * Two authors hit this independently on 2026-09-04. It is the same shape
   * as the verifier that reported "0 problems" over a bank truncated at
   * 1000 rows: a check that cannot process its input must say so, not
   * emit a number. check-absolute-tell.mjs already exits 2 on misuse;
   * this now does the same rather than failing loudly and meaninglessly.
   */
  if (n === 0) {
    console.error(`${label} — 0 stimuli: this batch has no 'stimulus' or 'passage' field.`)
    console.error(`  Every measure here reads one of those two. With none, each threshold`)
    console.error(`  compares against NaN and reports FAIL, which is not a measurement.`)
    console.error(`  This script does not apply to item types without a stimulus`)
    console.error(`  (synonyms, analogies, standalone sentence completions).`)
    process.exit(2)
  }
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
