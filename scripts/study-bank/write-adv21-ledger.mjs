#!/usr/bin/env node
/** Ledger entry for the Advanced Math v21 kept file, bound to its exact bytes. Run from the repo root. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
const file = `${D}/sat-math-v21-adv.kept.batch.json`
const sha = createHash('sha256').update(readFileSync(file)).digest('hex')
const kept = JSON.parse(readFileSync(file, 'utf8')).length
const id = 'sat-math-v21-adv-kept-2026-10-02'
if (ledger.batches.some(b => b.id === id)) { console.error(`REFUSING: ${id} already in ledger`); process.exit(2) }
ledger.batches.push({
  id, createdAt: '2026-10-02', targetTest: 'sat', section: 'math',
  task: 'math_mc', family: 'mc_stem_source', cohort: 'sat-math-v21-adv', contentSha: sha, status: 'inserted',
  note: `Commissioned per PREREG-ADV21-2026-10-02.md to buy SAT Math form 27 (needs Advanced Math +3). ${kept} kept, all panel-median MEDIUM (A1 A2 A3 B1 B3 B4 B5); hard yield 0 (A5 and B5 aimed hard). 10 authored in two halves of 5, constructs and key position fixed per item before authoring; no replacement rounds (pre-registered). Audit drops: A4 (3 free strikes: profit = 15n, so options/15 give n that violate the printed >45 or the $70 average) and A5 (2: -11/-3 the lone pair differing by the printed 8). One repair round, same-side swaps: B1 10080 -> 13824, B4 33/2 -> 4. 8 gated. Not inserted, panel-median EASY: B2. No gate drops.`,
  stages: {
    shape: { passed: true, contentSha: sha, verdict: `${kept} items, all 4-choice numeric. On the 10-item authored file: sandbox 10/10, 30/30 distractor_solve (mutation: a changed key and a changed distractor body are both refused); key at an extreme 5/10 = 50.0% PASS (bar 40.0%). On the 8-item gate file: sandbox 8/8, 24/24; zero +-pair sets with the key; zero key-as-unique-composite; numeric hub key-is-hub 0/2; no singleton tell; zero reviewer-facing text; key extremity NO MEASUREMENT (n=8; raw 5/8). Kept file: NO MEASUREMENT (n=7; raw 5/7, 3 largest / 2 smallest).` },
    withsource: { passed: true, contentSha: sha, verdict: 'Three fresh graders solved cold before reading keys: all three matched the key on all 8 gated items; every item exclusive; every distractor path reproduces; no drop recommended; all on blueprint. Free strikes on the kept: A1 median 0 (one grader: 10109 is the 4-year value, growth is monotone), A2 median 0 (one grader: -8 is the printed constant), others 0. Panel: A1 medium/easy/medium; A2 A3 B1 B3 B4 B5 medium 3/3; B2 easy 3/3 (not inserted).' },
    nosource: { passed: true, contentSha: sha, verdict: 'Options-only attack on the 8-item gate file, three samples of one solver (pairwise agreement 75.0% vs 33.7% independent), 8 candidates interleaved with 8 composition-matched live Advanced Math items (7 medium + 1 hard, numeric, excluding v2 and the session cohorts; pool hard 52 / medium 126; make-adv21-oo.mjs seed 20261021). CANDIDATE 16.7% (4/24) vs CONTROL 45.8% (11/24), line 25.0%: margin -29.2, inside the pre-registered +10; control below the 90% ceiling. n=8 per arm is small. Unanimous-correct 1/8 vs 3/8 (rate only). Heuristics: hub value, midpoint/cluster centre; two of three samples picked the B1 distractor 13824 as "a clean cube".' },
    tells: { passed: true, contentSha: sha, verdict: 'Recorded, not dropped: key is the largest option on a maximum/greatest question in B1 and B5, and the odd-one-out above the 5-6-7 cluster in A3 (three graders, no strike counted); A1 and B4 are near-easy with Desmos (one formula / graph read); option values 4, 5, 6, 7 recur across small-integer items.' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log(`${id}  sha ${sha.slice(0, 16)}  ${kept} items\nledger written`)
