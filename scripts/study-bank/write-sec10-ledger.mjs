#!/usr/bin/env node
/** Ledger entry for sat-sec-hard-v10.kept, bound to its exact bytes. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const file = `${D}/sat-sec-hard-v10.kept.batch.json`
const sha = createHash('sha256').update(readFileSync(file)).digest('hex')
const kept = JSON.parse(readFileSync(file, 'utf8')).length
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
if (ledger.batches.some(b => b.id === 'sat-sec-hard-v10-kept-2026-10-04')) { console.error('entry exists'); process.exit(2) }
ledger.batches.push({
  id: 'sat-sec-hard-v10-kept-2026-10-04', createdAt: '2026-10-04', targetTest: 'sat', section: 'reading_writing',
  task: 'multiple_choice', family: 'mc_hidden_source', cohort: 'rw-v10-sec-hard', contentSha: sha, status: 'inserted',
  note: `Pre-registered 2ecde234 (PREREG-SEC10-2026-10-02.md) before any result. 26 authored in two halves (A Boundaries, B Form/Structure/Sense) by two agents, one independent audit and one repair per half (e75c6290), merged, gated by three options-only solver samples and three fresh with-source graders. ${kept} kept: 3 hard / 14 medium by panel median; the authors labelled all 26 hard. 9 dropped by the pre-registered rule, none held.`,
  stages: {
    shape: { passed: true, contentSha: sha, verdict: `${kept} items, one ______ blank each; merged file byte-identical per item to the two repaired halves. Key letters across the 26 authored A7/B6/C6/D7 (grader F count). No grader marked any item off the digital SAT SEC blueprint.` },
    withsource: { passed: true, contentSha: sha, verdict: `THREE INDEPENDENT GRADERS (ws-d, ws-e, ws-f), each solving cold before seeing key or explanation: 26 of 26 keys matched on all three, zero cold misses, zero second-defensible options, zero incoherent explanation paths, zero explicit drop recommendations. Pre-registered drops (gate-verdict.mjs): B-02, B-03, B-07, B-16 distractors weak by majority (all four panel-median EASY, so also dropped on the easy rule); B-06, B-10, B-12, B-13, B-15 on a median of 2 of 3 distractors free-strikable. No resolving-word drops. Panel median on survivors: hard A-15, A-20, A-22; medium the other 14.` },
    nosource: { passed: true, contentSha: sha, verdict: `Options-only attack (make-oo-render --control 24 --control-difficulty hard), 26 candidates interleaved with 24 live HARD-band SEC items, keys dealt flat, three solver samples, 50/50 answered each. CANDIDATE 42.3% (33/78, letter line 26.9%) vs LIVE CONTROL 68.1% (49/72, letter line 25.0%), margin -25.7, inside the pre-registered +10 bar. Ceiling check: control 68.1% is below 90% and above its letter line +5, so the blind half is MEASURED. Solver independence: pairwise agreement 88.0% vs 25.4% if independent. Unanimity as batch rate: candidate 8/26 = 30.8%, control 16/24 = 66.7%.` },
    elimination: { passed: true, bar: 'paired-control-v1', candidateRate: 0, controlRate: 0.1078, margin: -0.1078, threshold: 0.2, n: 17, controlN: 34, samples: 3, contentSha: sha, verdict: `elimination-paired.mjs (A23 bar), candidate rendered from the kept batch file via the new --batch/--qc option because render previously read only LIVE rows and the inserter refuses without this stage. Matched on panel difficulty: 3 hard + 14 medium candidates vs 6 hard + 28 medium live SEC controls (v2 18, rw-v6 7, rw-v7 4, rw-v8 4, rw-v9 1), separate files, 3 Claude samples per arm. Candidate 0.0% [0,0,0] vs control 10.8% [8.8,14.7,8.8] -> margin -10.8, PASS. No key ever confidently rejected. Control eliminations: plural -s's possessive (2), subject-verb clash inside one option (1), double possessive (1). Grader-named free strikes (B-file non-finite template) fell to the with-source rule and are not in the kept set.` },
    tells: { passed: true, contentSha: sha, verdict: `Cross-item, recorded against the batch: in half B the non-finite option is never the key except where the item tests it (grader F, corroborated by D and E striking 2 on the same items). Half A: A-03 key the only unpunctuated option; A-16 one option leaves the parenthesis unclosed (struck on sight) - both kept, each single-strike. Choices shuffled per item at draw time.` },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log(`ledger: sat-sec-hard-v10-kept-2026-10-04  sha ${sha.slice(0,16)}  ${kept} items`)
