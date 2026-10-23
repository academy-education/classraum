#!/usr/bin/env node
/** Ledger entry for the SEC v26 kept file, bound to its exact bytes. Run from the repo root. Appends one entry to
 * the CURRENT ledger.json (read fresh) and touches nothing else. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const sha = f => createHash('sha256').update(readFileSync(`${D}/${f}`)).digest('hex')
const kept = sha('sat-sec-hard-v26.kept.batch.json'), frozen = sha('sat-sec-hard-v26.batch.json')
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
const id = 'sat-sec-hard-v26-kept-2026-10-23'
if (ledger.batches.some(b => b.id === id)) { console.error('REFUSING: entry exists'); process.exit(2) }
const qc = JSON.parse(readFileSync(`${D}/sec26.qc.json`, 'utf8'))
const hard = Object.values(qc).filter(v => v.difficulty === 'hard').length
if (Object.keys(qc).length !== 14 || hard !== 5) { console.error(`REFUSING: qc ${Object.keys(qc).length} (hard ${hard}), expected 14 (5)`); process.exit(2) }
if (!frozen.startsWith('07414395')) { console.error(`REFUSING: frozen sha ${frozen.slice(0, 8)} != 07414395`); process.exit(2) }
ledger.batches.push({
  id, createdAt: '2026-10-23', targetTest: 'sat', section: 'reading_writing', task: 'multiple_choice', family: 'mc_hidden_source',
  cohort: 'rw-v26-sec-hard', contentSha: kept, status: 'inserted',
  note: `Pre-registered 81f5e2a9 (PREREG-SEC26-2026-10-23.md) before any item: role-balanced construction table checked at prereg time by sec26-tellsim.mjs (replays SEC25's tells). Four Claude authors x 10; probe (2 readers) rated ~11/80 reads hard and named 36 must-revise; ONE revision round; verify ok; tell check all bars met; frozen sha ${frozen.slice(0, 16)}. Nothing repaired after freeze. 14 of 40 kept (5 hard / 9 medium by panel median) after gate (33) and template cover (19 held, 2 hard). All agents Claude.`,
  stages: {
    shape: { passed: true, contentSha: kept, verdict: 'Frozen 40: bank-helper check OK; check-sec-preflight clean; key spread ok (quads 22% vs 21%); sec26-brief-counts with declarations 17/17 prereg bars, 0 quota flags; sec26-exclusion 0/40 vs PRIOR/LIVE; doubled-word drops 0; grader render asserted free of subskill and rule-name words.' },
    nosource: { passed: true, contentSha: kept, n: 120, mean: 0.35, control: 0.653, margin: -0.303, verdict: 'make-oo-render with 24 live hard SEC control (v10-v17, v22-v25 excluded); 3 Claude samples, 64/64 each. Candidate 42/120 = 35.0% (line 25.0%) vs control 47/72 = 65.3% (line 25.0%): E = -30.3 <= +10 PASS; control measured. Agreement 76.0% vs 25.4% independent (one solver sampled 3 times). Unanimity candidate 11/40 = 27.5% vs control 14/24 = 58.3%. Reported as: the option set alone does not decide it.' },
    withsource: { passed: true, contentSha: kept, verdict: 'Three Claude graders d/e/f, phase 1 snapshots sha-recorded (d 48a7bb90, e beec7c40, f c70aceae) before sec26.ws-key.json existed; 0 phase-1 fields changed in phase 2. Cold on key d 40/40, e 40/40, f 39/40 (miss D-03). sec26-gate: KEEP 33, DROP 7 (B-10, C-07, D-02 easy; C-10, D-09 non-exclusive 3/3; D-03 cold miss; D-10 resolving word). sec26-template-cover: 7 components, HELD 19 (2 panel-hard: C-09, A-10), kept 14 (5 hard).' },
    elimination: { passed: true, bar: 'paired-control-v1', candidateRate: 0.05, controlRate: 0.0542, margin: -0.0042, threshold: 0.2, n: 40, controlN: 80, samples: 3, contentSha: kept, verdict: 'elimination-paired.mjs --match difficulty on all 40 authored (qc from the panel), 3 Claude samples per arm: 5.0% vs 5.4%, margin -0.4 <= +20 PASS; key never confidently rejected.' },
    tells: { passed: true, contentSha: kept, verdict: 'Kept 14: verify-answer-key-spread --batch ok (latent; choices re-shuffled per session); key strictly longest 3/14, strictly shortest 4/14 (both <= 35%). Graders named: "since" always keys the perfect (5 items, 4 now held or dropped), trailing-comma options lose, verb x pronoun grid (8 items, 7 held by the cover). Recorded by name.' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2) + '\n')
console.log(`ledger: + ${id} kept ${kept.slice(0, 16)}`)
