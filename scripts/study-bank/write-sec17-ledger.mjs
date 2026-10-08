#!/usr/bin/env node
/** Ledger entry for sat-sec-hard-v17.kept, bound to its exact bytes. Reads ledger.json from HEAD. */
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const file = `${D}/sat-sec-hard-v17.kept.batch.json`
const sha = createHash('sha256').update(readFileSync(file)).digest('hex')
const kept = JSON.parse(readFileSync(file, 'utf8')).length
const head = execSync(`git show HEAD:${D}/ledger.json`, { encoding: 'utf8', maxBuffer: 1 << 28 })
if (head !== readFileSync(`${D}/ledger.json`, 'utf8')) { console.error('ledger.json differs from HEAD: refusing'); process.exit(2) }
const ledger = JSON.parse(head)
const id = 'sat-sec-hard-v17-kept-2026-10-09'
if (ledger.batches.some(b => b.id === id)) { console.error('entry exists'); process.exit(2) }
ledger.batches.push({
  id, createdAt: '2026-10-09', targetTest: 'sat', section: 'reading_writing',
  task: 'multiple_choice', family: 'mc_hidden_source', cohort: 'rw-v17-sec-hard', contentSha: sha, status: 'inserted',
  note: `Pre-registered e1895b7c (PREREG-SEC17-2026-10-08.md: v16 bars/control/pipeline; 20 items, 14 agreement on distinct nearest-noun/inversion constructions; voice passive-key 1/3-1/2, comma key >=1 and strong key 2 of 4, had-key 1/3-1/2, would never keyed over will; grader-majority template pair -> lower item held; at most 2 subagents at a time) before any item existed. 20 authored by two Claude agents (10 each), one pre-freeze replacement (B-02, identical grid to A-01), frozen e5802b32 (83f1ccea); no audit/repair round, no repair after freeze. ${kept} kept: 7 hard / 5 medium by panel median; authors labelled all 20 hard. Dropped: SEC17B-08 (recommend_drop e: only "would" is a live lure, plays as an easy tense item). HELD (template-pair rule, grader majority, lower/higher-id held): SEC17B-01 (~A-01, d e), SEC17B-02 (~B-01, d f; medium), SEC17B-03 (~A-01, d e f), SEC17B-04 (~A-02, d e f), SEC17B-05 (~A-06, e f), SEC17B-06 (~A-07, d e f), SEC17B-07 (~A-05, d e f); six of the seven panel-hard. All agents Claude.`,
  stages: {
    shape: { passed: true, contentSha: sha, verdict: `${kept} items kept; bank-helper check shape OK on all 20 authored. Frozen key letters A6/B4/C5/D5 (B-09 keyed A where B was assigned; recorded), kept A4/B2/C3/D3, shuffled at draw. Key uniquely longest 1/20, max ratio 1.58. sec-near-dup.mjs frozen 20 vs all live SEC (paged 394 = exact 394): 0 flagged, max passage 0.014; within batch A-09 ~ B-10 same option skeleton (recorded). Doubled-word drop 0/20. sec17-brief-counts.mjs on the frozen file (break-tested on v16): passive key 2/5 = 40.0% MET; comma key 1, strong 2 of 4 MET; had key 1/3 = 33.3% MET; would 0/1, will 1 MET. With-source render BLIND=bare asserted (0 subskill strings, 0 header words; labelled render 20/20).` },
    withsource: { passed: true, contentSha: sha, verdict: `THREE INDEPENDENT GRADERS (ws-d, ws-e, ws-f), two phases; phase 1 snapshotted (sha 71271e59 / 83d51b15 / 8bde67cf) before the key file existed; 0 phase-1 fields changed. 60/60 cold picks on key, 0 cold misses, 20/20 exclusive 3/3, 0 path errors, 0 resolving words, 0 open-mark, 0 doubled_word, 0 off-blueprint. gate-verdict.mjs rules 1-6: 20/20 keep (panel 13 hard / 7 medium); recommend_drop drops B-08; template-pair rule holds 7. Kept hard: A-01, A-02, A-04, A-05, A-06, A-07, B-09; medium A-03, A-08, A-09, A-10, B-10.` },
    nosource: { passed: true, contentSha: sha, verdict: `Options-only (make-oo-render --control 24 --control-difficulty hard --exclude rw-v10..rw-v16-sec-hard; 30 eligible), 20 candidates + 24 controls interleaved, keys dealt flat, three solver samples, 44/44 each. CANDIDATE 33.3% (20/60, line 25.0%) vs LIVE CONTROL 63.9% (46/72), margin -30.6, inside +10. Control below 90% and above line+5: MEASURED. Pairwise agreement 81.8% vs 25.8% independent. Unanimity rate candidate 4/20 = 20.0%, control 15/24 = 62.5%.` },
    elimination: { passed: true, bar: 'paired-control-v1', candidateRate: 0, controlRate: 0.075, margin: -0.075, threshold: 0.2, n: 20, controlN: 40, samples: 3, contentSha: sha, verdict: `elimination-paired.mjs --batch/--qc (A23), all 20 authored, difficulty from the full panel (13 hard / 7 medium), 40 matched live controls, separate files, 3 Claude samples per arm. Candidate 0.0% [0,0,0] vs control 7.5% [7.5,10.0,5.0], margin -7.5, PASS. No key confidently rejected.` },
    tells: { passed: true, contentSha: sha, verdict: `All three graders: "a plural noun near the blank -> singular key" (d: A-01, A-03, A-07, B-01, B-03, B-06, B-07; e: 10 of 15 agreement keys singular; f: same list) and "since / to the present day -> present perfect key" (A-02, A-07, B-03, B-07). Graders e, f: voice readable from whether an object follows the interrupter (A-01, B-01, B-02, B-03). Grader f: the option with an extra adverb or odd auxiliary never wins (A-07, B-06, B-07). Punctuation keys all differ (comma, semicolon, none, colon) - no mark tell. Majority template pairs (7) resolved by holding; single-grader pairs recorded: B-01~B-03 (e), A-03~B-02 (e), A-05~B-05 (d).` },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log(`ledger: ${id}  sha ${sha.slice(0,16)}  ${kept} items`)
