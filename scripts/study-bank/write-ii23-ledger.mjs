#!/usr/bin/env node
/** Ledger entry for the I&I v23 kept file, bound to its exact bytes. Run from the
 * repo root. Appends one entry to the CURRENT ledger.json (read fresh) and touches
 * nothing else. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
const sha = f => createHash('sha256').update(readFileSync(`${D}/${f}`)).digest('hex')
const keptSha = sha('sat-ii-hard-v23.kept.batch.json'), frozenSha = sha('sat-ii-hard-v23.batch.json')
const kept = JSON.parse(readFileSync(`${D}/sat-ii-hard-v23.kept.batch.json`, 'utf8'))
const qc = JSON.parse(readFileSync(`${D}/ii23.qc.json`, 'utf8'))
const id = 'sat-ii-hard-v23-kept-2026-10-23'
if (ledger.batches.some(b => b.id === id)) { console.error(`REFUSING: ${id} already in ledger`); process.exit(2) }
const hard = kept.filter(x => qc[x.id]?.difficulty === 'hard').length
if (kept.length !== 30 || hard !== 22) { console.error(`REFUSING: kept ${kept.length} (panel hard ${hard}), expected 30 (22)`); process.exit(2) }
if (!frozenSha.startsWith('2bd44c4a')) { console.error(`REFUSING: frozen sha ${frozenSha.slice(0, 8)} != 2bd44c4a`); process.exit(2) }
ledger.batches.push({
  id, createdAt: '2026-10-23', targetTest: 'sat', section: 'reading_writing', task: 'multiple_choice', family: 'mc_hidden_source',
  cohort: 'rw-v23-ii-hard', contentSha: keptSha, status: 'inserted',
  note: `Pre-registered 331157f5 (PREREG-II23) before any item: panel-aligned brief, steering probe, prereg-time cross-item tell table (ii23-tellsim.mjs, all bars met). Four Claude authors x 8; frozen sha ${frozenSha.slice(0, 16)}. Nothing repaired after freeze. 30 of 32 kept (22 hard / 8 medium by panel median). All agents Claude.`,
  stages: {
    shape: { passed: true, contentSha: keptSha, verdict: 'Frozen 32: bank-helper check OK; rw17-dupscan 0/32 vs 1,415 live R&W (paged); ii23-exclusion 0/32.' },
    nosource: { passed: true, contentSha: keptSha, n: 96, mean: 0.354, control: 0.583, margin: -0.229, verdict: 'rw17-oo-render ii (control 12 hard textual CoE + 12 quantitative CoE live); 3 Claude samples, 56/56 each. Candidate 34/96 = 35.4% (line 25.0%) vs live control 42/72 = 58.3% (line 25.0%): E = -22.9 <= +10 PASS; control inside (30%, 90%] so MEASURED. Agreement 77.4% vs 25.8% independent (one solver sampled 3 times). Unanimity candidate 7/32 = 21.9% vs control 12/24 = 50.0%.' },
    elimination: { passed: true, bar: 'paired-control-v1', candidateRate: 0, controlRate: 0, margin: 0, threshold: 0.2, n: 32, controlN: 32, samples: 3, contentSha: keptSha, verdict: 'elimination-paired.mjs --match subskill --ratio 1, 3 Claude samples per arm: 0.0% vs 0.0%, PASS. Every sample marked every item not-certain.' },
    withsource: { passed: true, contentSha: keptSha, verdict: 'Three Claude graders d/e/f on ii23.ws.blind.txt; phase 1 cold sha-recorded (d 920e9f6b, e 4b73ba24, f 50a4851e) before the key file existed. Cold on key 32/32 each. ii23-gate.mjs: KEEP 30, DROP 2 (II23B-05: no option cleanly weakens the hypothesis - flagged non-exclusive cold by all three, key cross-year, recommend_drop 3/3; II23A-03: panel-median struck 2), HELD 0. Batch notes (all three): one textual template - four sites, one shared confound named by a "both agree" sentence; key = the single controlled comparison; distractors drawn from reversed / rival-factor / confounded-site. Recorded, not deciding (per-item strikability is already measured by n_struck).' },
    tells: { passed: true, contentSha: keptSha, verdict: 'Kept 30: verify-answer-key-spread --batch ok (quads 43% vs 24%, p=0.13); key strictly longest 4/30 (13.3%), strictly shortest 1/30 (3.3%), both <= 35%; no proper noun repeated across kept passages. Frozen 32 key-spread FAIL (quads 75%, the 2/2/2/2-per-author table) is latent - choices re-shuffled per session - recorded as SEC24/SEC25 did.' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2) + '\n')
console.log(`ledger: + ${id} kept ${keptSha.slice(0, 16)}`)
