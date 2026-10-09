#!/usr/bin/env node
/**
 * write-wic18-ledger.mjs <ledger path> — append the sat-cs-wic-v18 entry to the given
 * ledger file (working copy for the insert gate; a HEAD copy for the commit, so only
 * this entry is staged). Bound to the exact bytes of sat-cs-wic-v18.kept.batch.json.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const target = process.argv[2]; if (!target) { console.error('usage: write-wic18-ledger.mjs <ledger.json>'); process.exit(2) }
const sha = f => createHash('sha256').update(readFileSync(`${D}/${f}`)).digest('hex')
const kept = sha('sat-cs-wic-v18.kept.batch.json'), frozen = sha('sat-cs-wic-v18.batch.json')
const ledger = JSON.parse(readFileSync(target, 'utf8'))
const id = 'sat-cs-wic-v18-kept-2026-10-09'
if (ledger.batches.some(b => b.id === id)) { console.error('entry exists'); process.exit(2) }
const pre = `Pre-registered 696c0ff7 (PREREG-WIC18-2026-10-09.md) before any item existed: a NEW method borrowing the ISEE SC fixes for v17's four leaks. Four Claude authors x 10 (32 hard / 8 medium), one revision round on 37 probe-named items, frozen 1da2ffbe (sha ${frozen.slice(0, 16)}); nothing repaired after freeze. All agents Claude.`
ledger.batches.push({
  id, createdAt: '2026-10-09', targetTest: 'sat', section: 'reading_writing', task: 'multiple_choice', family: 'mc_hidden_source',
  cohort: 'rw-v18-cs-wic', contentSha: kept, status: 'inserted',
  note: `${pre} 21 of 40 kept (4 hard / 17 medium by panel median), 19 dropped by the pre-registered rules.`,
  stages: {
    shape: { passed: true, contentSha: kept, verdict: 'Frozen 40: bank-helper check OK 40/40; wic18-selfcheck --final 0 problems; rw17-dupscan vs ALL 1198 live R&W rows (paged = exact) 0 flagged, within-batch 0 (self-test sat-wic-v7.kept 15/16); keys 10/10/10/10. Kept 21 re-checked under tells.' },
    nosource: { passed: true, contentSha: kept, n: 120, mean: 0.375, control: 0.436, margin: -0.061, verdict: 'wic18-oo-render.mjs on the FROZEN 40 + the WHOLE eligible live word-shaped WIC pool (39: 12 hard / 27 medium), flat per arm; 3 Claude samples, 79/79 each. Candidate 45/120 = 37.5% (line 25.0%, M +12.5) vs control 51/117 = 43.6% (line 25.6%, M +17.9): E = -6.1 <= +10 PASS; control inside the pre-registered (30.6%, 90%] so MEASURED. Agreement 80.2% vs 25.2% independent. Unanimity 12/40 = 30.0% vs 14/39 = 35.9%. "Rarest word" picks 0/9 on key. Authored-hard sub-arm 39/96 = 40.6% vs control hard 14/36 = 38.9% (printed, not decided).' },
    elimination: { passed: true, bar: 'paired-control-v1', candidateRate: 0, controlRate: 0, margin: 0, threshold: 0.2, n: 40, controlN: 40, samples: 3, contentSha: kept, verdict: 'elimination-paired.mjs --batch frozen, --match subskill --ratio 1 (40 of 49 live WIC), separate files, 3 Claude samples per arm: 0.0% vs 0.0%, PASS. Every sample marked every item not-certain: a default, not a reading.' },
    withsource: { passed: true, contentSha: kept, verdict: 'Three Claude graders d/e/f on BLIND=bare render (sha 845ff1d6, 0 subskill strings); phase 1 cold sha-recorded (d 1e5bf775, e 5b4b4c82, f 72592d4f) and unchanged after phase 2. Cold on key d 39/40 (miss A-09), e 40/40, f 40/40: stage bar (<= 4 misses) PASS. wic18-gate.mjs: KEEP 21, DROP 19 (reasons overlap: rule 4 median >= 2 free-strikable on 17; panel-median easy 10; distractors weak by majority 5; A-02 "bellwether" above ceiling per 2; A-09 key disputed + non-exclusive 3/3; B-09 resolving word "through" per 2), HELD 0. Panel median kept: hard 4 (B-01, B-02, C-02, C-04), medium 17; rule 8 caps 0.' },
    tells: { passed: true, contentSha: kept, verdict: 'Kept 21: verify-answer-key-spread --batch ok (A8/B3/C5/D5); key strictly longest 4/21 = 19.0%, strictly shortest 7/21 = 33.3% (each <= 35%); 0 option words repeated; no solver heuristic named by all three samples (named picks 13 of 120 in total; "rarest word" 0/9 on key). Probe r2 (steering, recorded at freeze): test_word on key 8/40, antonym_pole on key 0/5 where a pair was named.' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(target, JSON.stringify(ledger, null, 2))
console.log(`${target}: + ${id} kept ${kept.slice(0, 16)}`)
