#!/usr/bin/env node
/**
 * write-wic25-ledger.mjs <ledger path> — append the sat-cs-wic-v25 entry to the given
 * ledger file. Bound to the exact bytes of sat-cs-wic-v25.kept.batch.json.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const target = process.argv[2]; if (!target) { console.error('usage: write-wic25-ledger.mjs <ledger.json>'); process.exit(2) }
const sha = f => createHash('sha256').update(readFileSync(`${D}/${f}`)).digest('hex')
const kept = sha('sat-cs-wic-v25.kept.batch.json'), frozen = sha('sat-cs-wic-v25.batch.json'), worlds = sha('sat-cs-wic-v25.worlds.json')
const ledger = JSON.parse(readFileSync(target, 'utf8'))
const id = 'sat-cs-wic-v25-kept-2026-10-23'
if (ledger.batches.some(b => b.id === id)) { console.error('entry exists'); process.exit(2) }
const pre = `Pre-registered 03c9265e (PREREG-WIC25-2026-10-23.md) before any item existed: four-world symmetric method (each option keys one of four passage worlds; identical blank sentence). Four Claude authors x 8 = 32 items / 128 worlds; world probe r1 named 128/128 (2 hard), one revision round, frozen worlds sha ${worlds.slice(0, 16)}; served world drawn by seed 20262590 + sha[0:8] = 3366878085, no re-roll (served 6/9/12/5); served batch sha ${frozen.slice(0, 16)}. Nothing repaired after freeze. All agents Claude.`
ledger.batches.push({
  id, createdAt: '2026-10-23', targetTest: 'sat', section: 'reading_writing', task: 'multiple_choice', family: 'mc_hidden_source',
  cohort: 'rw-v25-cs-wic', contentSha: kept, status: 'inserted',
  note: `${pre} 21 of 32 kept (6 hard / 15 medium by panel median), 11 dropped whole by the pre-registered rules.`,
  stages: {
    shape: { passed: true, contentSha: kept, verdict: 'Served 32: bank-helper check OK; wic25-selfcheck --final 0 problems on 128 worlds; rw17-dupscan vs ALL 1329 live R&W rows (paged = exact) 0 flagged, within-batch 0; keys dealt 8/8/8/8.' },
    nosource: { passed: true, contentSha: kept, n: 96, mean: 0.292, control: 0.373, margin: -0.082, verdict: 'wic25-oo-render.mjs on the SERVED 32 + the WHOLE eligible live word-shaped WIC pool (100: 24 hard / 76 medium), flat per arm; 3 Claude samples, 132/132 each. Candidate 28/96 = 29.2% (line 25.0%, M +4.2) vs control 112/300 = 37.3% (line 25.0%, M +12.3): E = -8.2 <= +10 PASS; control inside (30%, 90%] so MEASURED. Agreement 82.3% vs 26.6% independent (one solver sampled 3 times). Unanimity 7/32 = 21.9% vs 32/100 = 32.0%. This checks that selection and rendering did not leak; it is not evidence the batch does not leak with the source.' },
    elimination: { passed: true, bar: 'paired-control-v1', candidateRate: 0, controlRate: 0, margin: 0, threshold: 0.2, n: 32, controlN: 32, samples: 3, contentSha: kept, verdict: 'elimination-paired.mjs --batch served, --match subskill --ratio 1, 3 Claude samples per arm: 0.0% vs 0.0%, PASS. Every sample marked every item not-certain: a default, not a reading.' },
    withsource: { passed: true, contentSha: kept, verdict: 'Three Claude graders d/e/f on BLIND=bare render (sha 43285396), not told about worlds; phase 1 cold sha-recorded (d a36b8404, e 64684895, f e290927b) before the key. Cold on key 32/32 each: stage bar (<= 3 misses) PASS. wic25-gate.mjs: KEEP 21, DROP 11 (panel-median easy A-07, D-01, D-04, D-07, D-08; B-05 key "ancillary" above ceiling per 3; C-02 distractor "lodestar" above ceiling per 2; B-06 and C-08 non-exclusive 3/3; D-05 antonym pair per 2; D-06 median free-strikable 2 + recommend_drop), HELD 0. Panel median kept: hard 6 (A-01, A-04, A-08, B-01, B-02, B-07), medium 15. Noted, not deciding: B-03 opens "Having compared the surviving drafts" with no drafts in the passage (all three graders; no effect on the answer).' },
    tells: { passed: true, contentSha: kept, verdict: 'Kept 21: verify-answer-key-spread --batch ok (A6/B6/C4/D5); key strictly longest 5/21, strictly shortest 3/21 (each <= 7 = 35%); 0 option words repeated. Attrition check: stage-2 picks re-scored on the kept 21: 38.1% vs line 28.6%, M +9.5, E_kept = -2.8 <= +10 PASS; kept keys by declared rarity rank 4/5/6/6.' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(target, JSON.stringify(ledger, null, 2) + '\n')
console.log(`${target}: + ${id} kept ${kept.slice(0, 16)}`)
