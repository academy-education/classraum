#!/usr/bin/env node
/**
 * write-wic27-ledger.mjs <ledger path> — append the sat-cs-wic-v27 entry to the given
 * ledger file. Bound to the exact bytes of sat-cs-wic-v27.kept.batch.json.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const target = process.argv[2]; if (!target) { console.error('usage: write-wic27-ledger.mjs <ledger.json>'); process.exit(2) }
const sha = f => createHash('sha256').update(readFileSync(`${D}/${f}`)).digest('hex')
const kept = sha('sat-cs-wic-v27.kept.batch.json'), frozen = sha('sat-cs-wic-v27.batch.json'), worlds = sha('sat-cs-wic-v27.worlds.json')
const ledger = JSON.parse(readFileSync(target, 'utf8'))
const id = 'sat-cs-wic-v27-kept-2026-10-23'
if (ledger.batches.some(b => b.id === id)) { console.error('entry exists'); process.exit(2) }
const pre = `Pre-registered 65cabbd3 (PREREG-WIC27-2026-10-23.md) before any item existed: third four-world batch, brief rebuilt on what the v25/v26 panel called hard (every distractor must survive a surface read and fail only on the passage logic; surface_fit + inference recorded per kill) and the world probe asking the panel's own n_struck and difficulty. Five Claude authors x 8 = 40 items / 160 worlds; world probe r1 rated 54/160 hard and 13 easy, named 147; one revision round (verify ok: 146 revised, every easy/n_struck>=2 world changed), frozen worlds sha ${worlds.slice(0, 16)}; served world drawn by seed 20262790 + sha[0:8] = 2047117303, no re-roll (served 9/10/10/11); served batch sha ${frozen.slice(0, 16)}. Nothing repaired after freeze. All agents Claude.`
ledger.batches.push({
  id, createdAt: '2026-10-23', targetTest: 'sat', section: 'reading_writing', task: 'multiple_choice', family: 'mc_hidden_source',
  cohort: 'rw-v27-cs-wic', contentSha: kept, status: 'inserted',
  note: `${pre} 34 of 40 kept (11 hard / 23 medium by panel median), 6 dropped whole by the pre-registered rules.`,
  stages: {
    shape: { passed: true, contentSha: kept, verdict: 'Served 40: bank-helper check OK; wic27-selfcheck --final 0 problems on 160 worlds; rw17-dupscan vs ALL 1372 live R&W rows (paged = exact) 0 flagged, within-batch 0; keys dealt 10/10/10/10.' },
    nosource: { passed: true, contentSha: kept, n: 120, mean: 0.208, control: 0.361, margin: -0.153, verdict: 'wic27-oo-render.mjs on the SERVED 40 + the WHOLE eligible live word-shaped WIC pool (143: 34 hard / 109 medium, incl. v25+v26), flat per arm; 3 Claude samples, 183/183 each (ids exact). Candidate 25/120 = 20.8% (line 25.0%, M -4.2) vs control 155/429 = 36.1% (line 25.2%, M +11.0): E = -15.3 <= +10 PASS; control inside (30.2%, 90%] so MEASURED. Agreement 63.2% vs 25.1% independent. Unanimity 5/40 = 12.5% vs 28/143 = 19.6%. Checks selection/rendering did not leak; not evidence the batch does not leak with the source.' },
    elimination: { passed: true, bar: 'paired-control-v1', candidateRate: 0, controlRate: 0, margin: 0, threshold: 0.2, n: 40, controlN: 40, samples: 3, contentSha: kept, verdict: 'elimination-paired.mjs --batch served, --match subskill --ratio 1, 3 Claude samples per arm: 0.0% vs 0.0%, PASS. Every sample marked every item not-certain: a default, not a reading.' },
    withsource: { passed: true, contentSha: kept, verdict: 'Three Claude graders d/e/f on BLIND=bare render (sha c7fa0e44), not told about worlds; phase 1 cold sha-recorded (d 9ffbf2f8, e 9cb54f07, f 4042cf3a) before the key. Cold on key 40/40 x3: stage bar PASS. Cold difficulty: d 11 hard, e 14, f 15. wic27-gate.mjs: KEEP 34, DROP 6 (panel-median easy B-03, D-05; explanation path wrong A-04 per 2, D-03 per 2, D-07 per 1; E-05 free-strikable median 2 + path wrong per 1), HELD 0. Panel median kept: hard 11, medium 23.' },
    tells: { passed: true, contentSha: kept, verdict: 'Kept 34: verify-answer-key-spread --batch ok (A8/B10/C6/D10); key strictly longest 3/34, strictly shortest 7/34 (each <= 11 = 35%); 0 option words repeated. Attrition check: stage-2 picks re-scored on the kept 34: 21.6% vs line 29.4%, M -7.8, E_kept = -18.8 <= +10 PASS; kept keys by declared rarity rank 11/8/8/7.' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(target, JSON.stringify(ledger, null, 2) + '\n')
console.log(`${target}: + ${id} kept ${kept.slice(0, 16)}`)
