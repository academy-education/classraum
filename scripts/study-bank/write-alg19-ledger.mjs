#!/usr/bin/env node
/** Ledger entry for the Algebra v19 kept file, bound to its exact bytes. Run from the repo root. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
const file = `${D}/sat-math-v19-alg.kept.batch.json`
const sha = createHash('sha256').update(readFileSync(file)).digest('hex')
const kept = JSON.parse(readFileSync(file, 'utf8')).length
const id = 'sat-math-v19-alg-kept-2026-10-02'
if (ledger.batches.some(b => b.id === id)) { console.error(`REFUSING: ${id} already in ledger`); process.exit(2) }
ledger.batches.push({
  id, createdAt: '2026-10-02', targetTest: 'sat', section: 'math',
  task: 'math_mc', family: 'mc_stem_source', cohort: 'sat-math-v19-alg', contentSha: sha, status: 'inserted',
  note: `16 authored as HARD in two halves (separate authors), independent no-arithmetic audit before the gate, one repair, 13 gated, ${kept} kept: 1 panel-median HARD (A1) + 8 medium. PARTIAL hard commission under PREREG-ALG19-2026-10-02.md (1-6 hard): Algebra hard 65 -> 66, hard route stays 8. Pre-gate drops: A5 (quadratic factoring, off-blueprint, 3 free strikes), A8 (integer LP optimisation, off-blueprint), B4 (closure on the key after repair; no second repair). Gate drops: B6 (EXT-1, grader F: key fixed by the time limit alone; the only other median-hard item), B7 (median 2 free strikes: key = 6 x combined rate, two distractors not multiples of 6), B3/B5 (panel median easy).`,
  stages: {
    shape: { passed: true, contentSha: sha, verdict: `${kept} items, all 4-choice numeric. On the 13-item gate file: sandbox 13/13 and 39/39 distractor_solve recompute; zero +-pair sets; zero key-as-unique-composite; no numeric or symbolic hub; key at an extreme 6/13 (live Algebra 27.6%); key-magnitude consistent with live (z 1.51/-0.06/-1.13); no singleton tell; zero reviewer-facing text. Option value 8 recurs in A1/A2.` },
    withsource: { passed: true, contentSha: sha, verdict: 'Three fresh graders solved cold before reading keys: all three matched the key on all 13; every item exclusive; every distractor path produces its printed value. Kept items: median free strikes 0 (B2: 1 on all three, 41 dies to the 7-minute count being a multiple of 4). Panel median on the kept nine: A1 hard (3/3), the rest medium (A2 A3 A4 A6 A7 B1 B2 B8). Off-blueprint by majority: none (B8 called PSDA by one grader).' },
    nosource: { passed: true, contentSha: sha, verdict: 'Options-only attack on the 13-item gate file, three samples of one solver (pairwise agreement 76.9% vs 29.7% independent), 13 candidates interleaved with 13 live Algebra HARD-band items excluding v2 and sat-math-v17/v18/v19-alg (32 eligible). CANDIDATE 30.8% (line 30.8%) vs CONTROL 33.3% (line 30.8%): margin -2.6, inside the pre-registered +10 bar; control far below the 90% ceiling. Unanimous-correct 3/13 candidate vs 1/13 control (batch-level rate only). Every solver pick was labelled guess; heuristics named: hub, adjacent pair, middle-of-chain.' },
    tells: { passed: true, contentSha: sha, verdict: 'Recorded, not dropped: graders call A6 (set c=0 in Desmos) and A7 (k=5 coincident-lines trap not offered as an option) insight-bypassable; A7 distractors 35/2 and -15/2 rest on an unlikely slip (one grader: weak). Options print ascending, so rank survives the draw shuffle; key extremity 6/13.' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log(`${id}  sha ${sha.slice(0, 16)}  ${kept} items\nledger written`)
