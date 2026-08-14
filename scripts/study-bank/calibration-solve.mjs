#!/usr/bin/env node
/**
 * Can a HANDICAPPED solver stand in for the human blind sitting?
 *
 * ── The question ─────────────────────────────────────────────────────
 *
 * Every bank verdict rests on a person reading items with the source
 * withheld. That costs ~20 minutes of a co-founder's time per cohort and
 * has failed four times out of eight for procedural reasons. If an
 * algorithm agreed with the human ITEM BY ITEM, cohorts could be
 * measured without one.
 *
 * The full-strength attack cannot do this: it scores 77-100% blind where
 * humans score 13-53%, and across cohorts it ranks BACKWARDS against them
 * (r = -0.64). It is a ceiling detector, not a human model. The
 * hypothesis here is that a deliberately weakened solver — one pass, no
 * deliberation, small model — lands in the human range and, more
 * importantly, fails on the same items.
 *
 * ── Why per item ─────────────────────────────────────────────────────
 *
 * Only five cohorts have a usable human number and they carry one bit
 * between them (Choose a Response high, rest clustered), so a per-cohort
 * correlation is unfalsifiable. Per item there are 94 paired
 * observations. See calibration-pairs.mjs.
 *
 * ── What would count as success, fixed BEFORE running ────────────────
 *
 * The decision is asymmetric — we only care whether it is good enough to
 * REPLACE a person, so "somewhat" and "not at all" lead to the same
 * action. Pre-registered:
 *
 *   phi >= 0.5 AND solver accuracy within 15pts of human  → candidate,
 *                                                           worth a
 *                                                           second cohort
 *   anything else                                         → the sitting
 *                                                           is irreplaceable
 *
 * The human solved only 24 of 94, so the minority class is 24 and the
 * confidence interval is wide. That is survivable ONLY because of the
 * asymmetry above: this design can detect a strong association or its
 * absence, and a middling result is a "no" either way.
 *
 * ── Blindness ────────────────────────────────────────────────────────
 *
 * The solver is sent the stem and the options and NOTHING else — no
 * passage, no audio transcript, no answer key, no human judgement, and
 * no sibling items (one request per item, so it cannot infer a pattern
 * across the batch the way a single long context could). The key is
 * compared only after every response is back.
 *
 * usage: calibration-solve.mjs <pairs.json> [--out solved.json] [--limit N]
 */
import OpenAI from 'openai'
import { readFileSync, writeFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

/* THE HANDICAP. A human under blind conditions reads once and commits;
 * they do not enumerate hypotheses. So: the smallest model, one pass,
 * temperature 1 (no beam-searching toward the "test-like" option), and an
 * instruction to answer on impression rather than analysis. Pinned so a
 * re-run reproduces. */
const MODEL = 'gpt-4o-mini'
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

const SYSTEM = [
  'You are taking a test where the passage or audio is MISSING.',
  'You see only the question and the options.',
  'Answer on first impression, the way a person under time pressure would.',
  'Do NOT reason step by step. Do NOT weigh the options against each other.',
  'If nothing stands out, guess.',
  'Reply with a single letter and nothing else.',
].join(' ')

const file = process.argv[2]
if (!file) { console.error('usage: calibration-solve.mjs <pairs.json> [--out f] [--limit N]'); process.exit(1) }
const limitArg = process.argv.indexOf('--limit')
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity

let pairs = JSON.parse(readFileSync(file, 'utf8'))
const skipped = pairs.filter(p => !p.stem || !Array.isArray(p.choices) || !p.choices.length)
pairs = pairs.filter(p => p.stem && Array.isArray(p.choices) && p.choices.length && p.bankKeySlot).slice(0, limit)
if (skipped.length) console.log(`skipping ${skipped.length} item(s) with no stem/choices in the bank jsonb`)
if (!pairs.length) { console.error('nothing solvable — check the pairs file'); process.exit(1) }

async function solve(p) {
  const opts = p.choices.map((c, i) => `${LETTERS[i]}. ${typeof c === 'string' ? c : c?.text ?? JSON.stringify(c)}`).join('\n')
  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 1,
    max_tokens: 3,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `${p.stem}\n\n${opts}` },
    ],
  })
  const raw = (res.choices[0]?.message?.content ?? '').trim().toUpperCase()
  const pick = LETTERS.find(l => raw.startsWith(l)) ?? null
  return pick
}

const out = []
let done = 0
for (const p of pairs) {
  let pick = null
  try { pick = await solve(p) } catch (e) { console.error(`  ! ${p.itemId}: ${e.message}`) }
  /* Scored against the BANK's key, NOT the reviewer's key_slot. The
   * sitting shuffles options — measured at 23/94 alignment, which is
   * chance — so key_slot belongs to a different ordering than the one
   * this solver just saw. Correctness is order-independent, so each side
   * is scored in its own frame; comparing the LETTERS would have produced
   * a confident phi near zero for a purely clerical reason. */
  out.push({ ...p, solverPick: pick, solverCorrect: Boolean(pick && pick === p.bankKeySlot) })
  if (++done % 20 === 0) console.log(`  ${done}/${pairs.length}`)
}

const dest = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : null
if (dest) { writeFileSync(dest, JSON.stringify(out, null, 2)); console.log(`\nwrote ${dest}`) }

/* ── Scoring: the 2x2 the whole thing rests on ───────────────────────── */
const n = out.length
const both = out.filter(r => r.humanCorrect && r.solverCorrect).length
const humanOnly = out.filter(r => r.humanCorrect && !r.solverCorrect).length
const solverOnly = out.filter(r => !r.humanCorrect && r.solverCorrect).length
const neither = out.filter(r => !r.humanCorrect && !r.solverCorrect).length

const hAcc = (100 * (both + humanOnly)) / n
const sAcc = (100 * (both + solverOnly)) / n
const agree = (100 * (both + neither)) / n

// Phi = Pearson r for two binaries. Zero denominator (a solver that got
// everything right or everything wrong) is undefined, not zero.
const denom = Math.sqrt((both + humanOnly) * (solverOnly + neither) * (both + solverOnly) * (humanOnly + neither))
const phi = denom === 0 ? null : (both * neither - humanOnly * solverOnly) / denom

console.log(`\nMODEL ${MODEL}  n=${n}\n`)
console.log('                     solver right   solver wrong')
console.log(`  human right        ${String(both).padStart(8)}       ${String(humanOnly).padStart(8)}`)
console.log(`  human wrong        ${String(solverOnly).padStart(8)}       ${String(neither).padStart(8)}`)
console.log(`\n  human accuracy   ${hAcc.toFixed(1)}%`)
console.log(`  solver accuracy  ${sAcc.toFixed(1)}%   (gap ${(sAcc - hAcc >= 0 ? '+' : '')}${(sAcc - hAcc).toFixed(1)})`)
console.log(`  raw agreement    ${agree.toFixed(1)}%`)
console.log(`  phi              ${phi === null ? 'undefined (one class empty)' : phi.toFixed(3)}`)

/* Raw agreement is the seductive number: with a 26% base rate, a solver
 * that answered "wrong" every time would agree 74% of the time and be
 * worth nothing. Phi is what survives that. */
const passes = phi !== null && phi >= 0.5 && Math.abs(sAcc - hAcc) <= 15
console.log(`\nPRE-REGISTERED RULE: phi >= 0.5 AND accuracy within 15pts`)
console.log(passes
  ? '  → CANDIDATE. Worth testing on a second cohort before trusting it.'
  : '  → FAILS. The human sitting is not replaceable by this solver.')
console.log(`\nnote: raw agreement of ${agree.toFixed(1)}% is NOT evidence — always-wrong scores ${(100 * (1 - (both + humanOnly) / n)).toFixed(1)}%.`)
