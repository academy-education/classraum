#!/usr/bin/env node
/** Ledger entry for the Algebra v22 kept file, bound to its exact bytes. Run from the repo root. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
const file = `${D}/sat-math-v22-alg.kept.batch.json`
const sha = createHash('sha256').update(readFileSync(file)).digest('hex')
const kept = JSON.parse(readFileSync(file, 'utf8')).length
const id = 'sat-math-v22-alg-kept-2026-10-08'
if (ledger.batches.some(b => b.id === id)) { console.error(`REFUSING: ${id} already in ledger`); process.exit(2) }
ledger.batches.push({
  id, createdAt: '2026-10-08', targetTest: 'sat', section: 'math',
  task: 'math_mc', family: 'mc_stem_source', cohort: 'sat-math-v22-alg', contentSha: sha, status: 'inserted',
  note: `14 authored as HARD in two halves (separate authors), no pre-gate auditor and no repair (PREREG-ALG22-2026-10-07.md), frozen at sha 295bf16b, ${kept} kept: 3 panel-median HARD (A1 A5 A7) + 5 medium. PARTIAL hard commission (1-5 hard): Algebra hard 66 -> 69, hard route stays 8 (form 9 needs 72). Drops: A2 (median 2 free strikes: smallest-k stem with two boundary pairs, plug-back), A3 (median 2 strikes: decreasing-line direction kills both negative options; the only split-hard item), B2 (EXT-1: f-g runs -5..7 so the root sits just above 2), B3 and B6 (panel median easy). HELD: B7 (2 of 3 graders off-blueprint: three unknowns; also z=0 bypass).`,
  stages: {
    shape: { passed: true, contentSha: sha, verdict: `${kept} items, all 4-choice numeric. On the 14-item frozen file: sandbox 14/14 and 42/42 distractor_solve recompute; zero +-pair sets; zero key-as-unique-composite; no numeric or symbolic hub; key at an extreme 7/14 = 50.0% (gate bar 40%); zero reviewer-facing text; zero exact stem duplicates vs 2,517 live SAT rows; near-dup max prompt Jaccard 0.591 vs 1,364 live SAT Math rows (threshold 0.60; top three read by hand, boilerplate only). Kept file: key at an extreme 4/8 (below the gate's n>=10 floor). Shared key value 7/3 across B2/B6 (both dropped).` },
    withsource: { passed: true, contentSha: sha, verdict: 'Three fresh graders, stage 1 cold (stem + options, written to disk before the keyed file was opened): all three matched the key on all 14; every item exclusive; every path coherent. Kept items: median free strikes 0 or 1 (B4: 13 struck by all three; B5: 33 by two). Panel: A1 A5 A7 hard 3/3; A4 A6 B1 B4 B5 medium 3/3. No kept item off-blueprint.' },
    nosource: { passed: true, contentSha: sha, verdict: 'Options-only attack on the 14-item frozen file, three samples of one solver (pairwise agreement 78.6% vs 27.8% independent), 14 candidates + 14 live Algebra HARD-band controls excluding v2 and sat-math-v17/v18/v19/v22-alg (32 eligible), keys dealt flat (control line 25.0%). CANDIDATE 11/42 = 26.2% vs CONTROL 15/42 = 35.7%: margin -9.5, inside +10; control far below the 90% ceiling. Unanimous-correct 3/14 both arms.' },
    tells: { passed: true, contentSha: sha, verdict: 'Recorded, not dropped: graders call B1 B4 B6 B7 insight-bypassable; F calls A4 35 a weak distractor (one, not two). A6: one grader struck 2 by Desmos slider/plug-back, median 0.' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log(`${id}  sha ${sha.slice(0, 16)}  ${kept} items\nledger written`)
