#!/usr/bin/env node
/** Ledger entry for the Algebra v18 kept file, bound to its exact bytes. Heredoc script, never inline. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
const file = `${D}/sat-math-v18-alg.kept.batch.json`
const sha = createHash('sha256').update(readFileSync(file)).digest('hex')
const kept = JSON.parse(readFileSync(file, 'utf8')).length
ledger.batches.push({
  id: 'sat-math-v18-alg-kept-2026-09-26', createdAt: '2026-09-26', targetTest: 'sat', section: 'math',
  task: 'math_mc', family: 'mc_stem_source', cohort: 'sat-math-v18-alg', contentSha: sha, status: 'inserted',
  note: `14 authored as hard, ${kept} kept, all panel-median MEDIUM. A FAILED COMMISSION for its stated purpose (pre-registered: alg18 shipping zero hard items is reported as failed regardless of insert count). The only three items the panel called hard (A7 rational equation with extraneous root, B5 rational inequality, B6 divisor count) are off the SAT Algebra blueprint by grader majority and are HELD for Andy in sat-math-v18-alg.held.batch.json. B1 and B7 dropped as easy by every grader. Authored in halves, audited by an independent auditor, repaired once, gated by three fresh blind solvers and three fresh with-source graders.`,
  stages: {
    shape: { passed: true, contentSha: sha, verdict: `${kept} items, all 4-choice, key present, zero key-is-unique-composite, key at an extreme 2/9 = 22.2% against live Algebra 28.8%, no singleton-parity tell, no reviewer-facing text in any explanation. Magnitude check REFUSED at 9 items (needs 10): not measured.` },
    withsource: { passed: true, contentSha: sha, verdict: 'Three independent graders solved from the stem before reading explanations: ALL THREE MATCHED THE KEY ON ALL 14, both counts (B5=13, B6=11) recounted independently by all three, no second defensible option, every distractor path produces its printed value. Median free strikes 0 or 1 on every kept item, never 2. Panel-median difficulty on the kept nine: 9 medium, 0 hard, 0 easy (A1 split hard/medium/medium). All nine judged insight-bypassable by all three graders: the intended insight is a shortcut to an answer routine procedure also reaches.' },
    nosource: { passed: true, contentSha: sha, verdict: 'Options-only attack, three samples of one solver, 14 candidates interleaved with 14 live Algebra items matched on the HARD band (59 eligible after excluding this session cohorts), key slots dealt flat A7 B7 C7 D7. CANDIDATE 38.1% against its own 28.6% line; LIVE HARD-BAND CONTROL 69.0%. Candidate minus control -31.0. Unanimity 4/14 candidate against 8/14 control. The control is the finding: the shipped hard-band Algebra items are 69% decidable from four bare values (sign pairs, derivational hubs named on nearly every one), well above every mixed-band control this month (35.7 to 42.9). Pairwise solver agreement 76.2% against 28.0% independent.' },
    tells: { passed: true, contentSha: sha, verdict: 'Recorded, not dropped (no pre-registered condition): (1) key is never the largest option in 13/14 authored and 0/9 kept, and second-smallest in 6/9 kept; options are printed ascending so rank survives the draw shuffle. Live Algebra shows the same direction (extremes 28.8%), so this is the bank habit, not a batch outlier. (2) A1 and B3 both use the reference line 4x - 6y = k verbatim; solving one warms up the other (grader E). (3) Distractor = key composed with a printed number on A6 (21 = 3 x 7) and B2 (49 = 7^2); grader D asked to hold both, the rule keeps them and the concern is recorded rather than repaired mid-round. (4) The stopped-early distractor is consistently the smaller neighbour of the key (grader F).' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log(`sat-math-v18-alg-kept-2026-09-26  sha ${sha.slice(0, 16)}  ${kept} items\nledger written`)
