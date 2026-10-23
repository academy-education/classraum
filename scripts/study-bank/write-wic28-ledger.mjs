#!/usr/bin/env node
/** Ledger entry for the WIC v28 kept file, bound to its exact bytes. Run from the repo root. Appends one entry to
 * the CURRENT ledger.json (read fresh) and touches nothing else. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const sha = f => createHash('sha256').update(readFileSync(`${D}/${f}`)).digest('hex')
const kept = sha('sat-cs-wic-v28.kept.batch.json'), frozen = sha('sat-cs-wic-v28.batch.json'), worlds = sha('sat-cs-wic-v28.worlds.json')
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
const id = 'sat-cs-wic-v28-kept-2026-10-23'
if (ledger.batches.some(b => b.id === id)) { console.error('REFUSING: entry exists'); process.exit(2) }
const qc = JSON.parse(readFileSync(`${D}/wic28.qc.json`, 'utf8'))
const hard = Object.values(qc).filter(v => v.difficulty === 'hard').length
if (Object.keys(qc).length !== 30 || hard !== 14) { console.error(`REFUSING: qc ${Object.keys(qc).length} (hard ${hard}), expected 30 (14)`); process.exit(2) }
if (!worlds.startsWith('afb249b9')) { console.error(`REFUSING: worlds sha ${worlds.slice(0, 8)} != afb249b9`); process.exit(2) }
ledger.batches.push({
  id, createdAt: '2026-10-23', targetTest: 'sat', section: 'reading_writing', task: 'multiple_choice', family: 'mc_hidden_source',
  cohort: 'rw-v28-cs-wic', contentSha: kept, status: 'inserted',
  note: `Pre-registered c22ae7ea (PREREG-WIC28-2026-10-23.md) before any item: four-world symmetric method, explanation-aware probe, gap-sentence caps. Five Claude authors x 8 = 40 items / 160 worlds; probe (4 readers, phase 1 sha-recorded before keys) named 127 worlds, 111 must-revise; ONE revision round; verify ok; frozen worlds sha ${worlds.slice(0, 16)}; seed 2967959971 = 20262890 + sha[0:8], no re-roll (served 16/7/12/5); served sha ${frozen.slice(0, 16)}. Nothing repaired after freeze. 30 of 40 kept (14 hard / 16 medium by panel median). All agents Claude.`,
  stages: {
    shape: { passed: true, contentSha: kept, verdict: 'Served 40: bank-helper check OK; wic28-selfcheck --final 0 problems on 160 worlds; rw17-dupscan vs all live R&W 0 flagged, within-batch 0; keys dealt 10/10/10/10.' },
    nosource: { passed: true, contentSha: kept, n: 120, mean: 0.283, control: 0.326, margin: -0.042, verdict: 'wic28-oo-render on the served 40 + the whole eligible live word-shaped WIC pool (177); 3 Claude samples, 217/217 each. Candidate 34/120 = 28.3% (line 25.0%, M +3.3) vs control 173/531 = 32.6% (line 25.4%, M +7.2): E = -4.2 <= +10 PASS; control inside (30.4%, 90%] so MEASURED, 2.2 points above the floor as the prereg projected. Agreement 79.4% vs 25.5% independent (one solver sampled 3 times). Solvers b and c filled basis/heuristic with one constant value; picks used, confidence split not used.' },
    elimination: { passed: true, bar: 'paired-control-v1', candidateRate: 0, controlRate: 0, margin: 0, threshold: 0.2, n: 40, controlN: 40, samples: 3, contentSha: kept, verdict: 'elimination-paired.mjs --match subskill --ratio 1, 3 Claude samples per arm: 0.0% vs 0.0%, PASS (pre-flight only; this stage has never measured anything).' },
    withsource: { passed: true, contentSha: kept, verdict: 'Three Claude graders d/e/f on BLIND=bare render; phase 1 cold sha-recorded (d 2f9c533d, e 8fdb1cfb, f c0855151) before the key file existed. Cold on key d 40/40, e 39/40 (miss D-07), f 40/40. wic28-gate.mjs: KEEP 30, DROP 10 (A-01, C-06, D-08 key above ceiling per 1; A-07 easy, struck 2; A-08, C-07 median struck 2; C-01 non-exclusive 2/3; C-05 antonym pair; D-05 "mantled" above ceiling per 3; D-07 non-exclusive 3/3, recommend_drop 2 - also removes its near-twin wreck with C-02), HELD 0. Batch notes (all three): one refuting clause per distractor, often a trailing post-blank sentence; stock collocation as the lure; repeated "report concluded that X had ___ the Y" frame. Recorded, not deciding.' },
    tells: { passed: true, contentSha: kept, verdict: 'Kept 30: verify-answer-key-spread --batch ok (quads 17% vs 20%); key strictly longest 4/30, strictly shortest 8/30 (bar 10 = 35%). Attrition: stage-2 picks on kept 27.8% vs line 30.0%, E_kept -9.4 <= +10 PASS.' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2) + '\n')
console.log(`ledger: + ${id} kept ${kept.slice(0, 16)}`)
