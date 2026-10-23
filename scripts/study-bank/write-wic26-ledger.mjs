#!/usr/bin/env node
/**
 * write-wic26-ledger.mjs <ledger path> — append the sat-cs-wic-v26 entry to the given
 * ledger file. Bound to the exact bytes of sat-cs-wic-v26.kept.batch.json.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const target = process.argv[2]; if (!target) { console.error('usage: write-wic26-ledger.mjs <ledger.json>'); process.exit(2) }
const sha = f => createHash('sha256').update(readFileSync(`${D}/${f}`)).digest('hex')
const kept = sha('sat-cs-wic-v26.kept.batch.json'), frozen = sha('sat-cs-wic-v26.batch.json'), worlds = sha('sat-cs-wic-v26.worlds.json')
const ledger = JSON.parse(readFileSync(target, 'utf8'))
const id = 'sat-cs-wic-v26-kept-2026-10-23'
if (ledger.batches.some(b => b.id === id)) { console.error('entry exists'); process.exit(2) }
const pre = `Pre-registered 62fce447 (PREREG-WIC26-2026-10-23.md) before any item existed: second four-world batch, v25's stages and bars with the brief rewritten from v25's drops. Five Claude authors x 8 = 40 items / 160 worlds; world probe r1 named 128/160 (16 hard, 51 easy), one revision round (verify ok: 132 worlds revised, every easy world changed), frozen worlds sha ${worlds.slice(0, 16)}; served world drawn by seed 20262690 + sha[0:8] = 23687880, no re-roll (served 9/9/10/12); served batch sha ${frozen.slice(0, 16)}. Nothing repaired after freeze. All agents Claude.`
ledger.batches.push({
  id, createdAt: '2026-10-23', targetTest: 'sat', section: 'reading_writing', task: 'multiple_choice', family: 'mc_hidden_source',
  cohort: 'rw-v26-cs-wic', contentSha: kept, status: 'inserted',
  note: `${pre} 22 of 40 kept (4 hard / 18 medium by panel median), 18 dropped whole by the pre-registered rules.`,
  stages: {
    shape: { passed: true, contentSha: kept, verdict: 'Served 40: bank-helper check OK; wic26-selfcheck --final 0 problems on 160 worlds; rw17-dupscan vs ALL 1350 live R&W rows (paged = exact) 0 flagged, within-batch 0; keys dealt 10/10/10/10.' },
    nosource: { passed: true, contentSha: kept, n: 120, mean: 0.308, control: 0.353, margin: -0.044, verdict: 'wic26-oo-render.mjs on the SERVED 40 + the WHOLE eligible live word-shaped WIC pool (121: 30 hard / 91 medium, incl. v25), flat per arm; 3 Claude samples, 161/161 each (sample a wrote ids L1..L9 for L01..L09; renamed mechanically, picks unchanged, raw kept as wic26-oo.solver-a.raw.json; E was -4.7 before the rename). Candidate 37/120 = 30.8% (line 25.0%, M +5.8) vs control 128/363 = 35.3% (line 25.6%, M +9.6): E = -4.4 <= +10 PASS; control inside (30.6%, 90%] so MEASURED. Agreement 55.1% vs 25.4% independent. Unanimity 5/40 = 12.5% vs 22/121 = 18.2%. Checks selection/rendering did not leak; not evidence the batch does not leak with the source.' },
    elimination: { passed: true, bar: 'paired-control-v1', candidateRate: 0, controlRate: 0, margin: 0, threshold: 0.2, n: 40, controlN: 40, samples: 3, contentSha: kept, verdict: 'elimination-paired.mjs --batch served, --match subskill --ratio 1, 3 Claude samples per arm: 0.0% vs 0.0%, PASS. Every sample marked every item not-certain: a default, not a reading.' },
    withsource: { passed: true, contentSha: kept, verdict: 'Three Claude graders d/e/f on BLIND=bare render (sha c800c716), not told about worlds; phase 1 cold sha-recorded (d e51cda2a, e fdaa1bd4, f 985ccb76) before the key. Cold on key d 40/40, e 40/40, f 39/40 (miss A-06): stage bar (<= 4) PASS. wic26-gate.mjs: KEEP 22, DROP 18 (panel-median easy 11: A-04, A-08, B-03, C-04, C-06, C-07, D-07, E-02, E-03, E-05, E-06; median free-strikable >= 2 on A-03, B-05, B-06, C-02; antonym pair C-03 crude/bureaucratic, D-03 haphazard/evenhanded; A-06 non-exclusive 3/3 + recommend_drop 3/3), HELD 0. Panel median kept: hard 4 (A-02, B-04, C-01, D-06), medium 18.' },
    tells: { passed: true, contentSha: kept, verdict: 'Kept 22: verify-answer-key-spread --batch ok (A4/B5/C6/D7); key strictly longest 5/22, strictly shortest 6/22 (each <= 7 = 35%); 0 option words repeated. Attrition check: stage-2 picks re-scored on the kept 22: 22.7% vs line 31.8%, M -9.1, E_kept = -18.7 <= +10 PASS; kept keys by declared rarity rank 6/6/5/5.' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(target, JSON.stringify(ledger, null, 2) + '\n')
console.log(`${target}: + ${id} kept ${kept.slice(0, 16)}`)
