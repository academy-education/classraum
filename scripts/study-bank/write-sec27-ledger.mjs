#!/usr/bin/env node
/** Ledger entry for the SEC v27 kept file, bound to its exact bytes. Run from the repo root. Appends one entry to
 * the CURRENT ledger.json (read fresh) and touches nothing else. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const sha = f => createHash('sha256').update(readFileSync(`${D}/${f}`)).digest('hex')
const kept = sha('sat-sec-hard-v27.kept.batch.json'), frozen = sha('sat-sec-hard-v27.batch.json')
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
const id = 'sat-sec-hard-v27-kept-2026-10-23'
if (ledger.batches.some(b => b.id === id)) { console.error('REFUSING: entry exists'); process.exit(2) }
const qc = JSON.parse(readFileSync(`${D}/sec27.qc.json`, 'utf8'))
const hard = Object.values(qc).filter(v => v.difficulty === 'hard').length
if (Object.keys(qc).length !== 24 || hard !== 8) { console.error(`REFUSING: qc ${Object.keys(qc).length} (hard ${hard}), expected 24 (8)`); process.exit(2) }
if (!frozen.startsWith('7d34ca16')) { console.error(`REFUSING: frozen sha ${frozen.slice(0, 8)} != 07414395`); process.exit(2) }
ledger.batches.push({
  id, createdAt: '2026-10-23', targetTest: 'sat', section: 'reading_writing', task: 'multiple_choice', family: 'mc_hidden_source',
  cohort: 'rw-v27-sec-hard', contentSha: kept, status: 'inserted',
  note: `Pre-registered 608d0954 (PREREG-SEC27-2026-10-23.md) before any item: construction table plus a semantic-template check at prereg and merge (sec27-semcheck.mjs, which replays and fails SEC26's named templates). Four Claude authors x 10 with distinct rule families and settings; probe (2 readers) rated 21/80 reads hard (SEC26: 11/80), 36 must-revise; ONE revision round; verify ok; tellsim and semcheck all bars met; frozen sha ${frozen.slice(0, 16)}. Nothing repaired after freeze. 24 of 40 kept (8 hard / 16 medium by panel median) after gate (35) and template cover (11 held, 2 hard). All agents Claude.`,
  stages: {
    shape: { passed: true, contentSha: kept, verdict: 'Frozen 40: bank-helper check OK; check-sec-preflight clean; key spread ok; sec27-brief-counts with declarations 17/17 prereg bars, 0 quota flags; sec27-exclusion 0/40; grader render asserted free of subskill and rule-name words.' },
    nosource: { passed: true, contentSha: kept, n: 120, mean: 0.258, control: 0.611, margin: -0.353, verdict: 'make-oo-render with 24 live hard SEC control (v10-v17, v22-v26 excluded); 3 Claude samples, 64/64 each. Candidate 31/120 = 25.8% (line 25.0%) vs control 44/72 = 61.1% (line 25.0%): E = -35.3 <= +10 PASS; control measured. Reported as: the option set alone does not decide it.' },
    withsource: { passed: true, contentSha: kept, verdict: 'Three Claude graders d/e/f, phase 1 snapshots sha-recorded (d 026e7cd9, e ef51ae10, f 56541bad) before sec27.ws-key.json existed; 0 phase-1 fields changed in phase 2. Cold on key 40/39/39 (B-10 missed by e and f). sec27-gate: KEEP 35, DROP 5 (B-10 key disputed/non-exclusive; C-06, D-05 easy; D-08 recommend_drop; D-10 path wrong). sec27-template-cover: 7 components, HELD 11 (2 panel-hard: D-04, A-09), kept 24 (8 hard).' },
    elimination: { passed: true, bar: 'paired-control-v1', candidateRate: 0, controlRate: 0.063, margin: -0.063, threshold: 0.2, n: 40, controlN: 80, samples: 3, contentSha: kept, verdict: 'elimination-paired.mjs --match difficulty on all 40 authored, 3 Claude samples per arm: 0.0% vs 6.3%, PASS; key never confidently rejected.' },
    tells: { passed: true, contentSha: kept, verdict: 'Kept 24: verify-answer-key-spread --batch ok (latent; re-shuffled per session); key strictly longest 2/24, strictly shortest 4/24. Graders named: verb x pronoun grid (4 items, 3 held), ellipsis family (4, 2 held), "dash never keyed", "mismatched pronoun pair wins 3/4" (pronoun items: A-06, C-05, D-06 held; B-06 kept). Recorded by name.' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2) + '\n')
console.log(`ledger: + ${id} kept ${kept.slice(0, 16)}`)
