#!/usr/bin/env node
/** Ledger entry for Algebra v25 (HELD: the kept set fails the pre-registered
 * key-extremity band HIGH), bound to the exact bytes of the held file. Run from
 * the repo root. Appends one entry to the CURRENT ledger.json (read fresh) and
 * touches nothing else. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
const file = `${D}/sat-math-v25-alg.held.batch.json`
const sha = createHash('sha256').update(readFileSync(file)).digest('hex')
const held = JSON.parse(readFileSync(file, 'utf8')).length
const frozenSha = createHash('sha256').update(readFileSync(`${D}/sat-math-v25-alg.batch.json`)).digest('hex')
const id = 'sat-math-v25-alg-held-2026-10-08'
if (ledger.batches.some(b => b.id === id)) { console.error(`REFUSING: ${id} already in ledger`); process.exit(2) }
if (held !== 19) { console.error(`REFUSING: held file has ${held} items, expected 19`); process.exit(2) }
if (!frozenSha.startsWith('61d98ffa')) { console.error(`REFUSING: frozen sha ${frozenSha.slice(0, 8)} != 61d98ffa`); process.exit(2) }
ledger.batches.push({
  id, createdAt: '2026-10-08', targetTest: 'sat', section: 'math',
  task: 'math_mc', family: 'mc_stem_source', cohort: 'sat-math-v25-alg', contentSha: sha, status: 'held',
  note: `32 Algebra items authored as HARD by three Claude authors (P 11, Q 11, R 10) in the shapes that graded hard (whole-interval bound; 2 non-integer-constant counts), key position commissioned from the PROJECTED kept set (A84 survival extreme 2/7, interior 5/6 -> 24/32 extreme authored, projected kept 13.5 at 50.7%) (PREREG-ALG25-2026-10-08.md, b36c5df8). Frozen 06e23f47 (32 items, sha ${frozenSha.slice(0, 8)}). Gate: 13 dropped by rule 7 (template of an earlier item), ${held} survive: 12 panel-median HARD (P1 P3 P5 P7 P9 Q1 Q7 R1 R3 R5 R6 R10) + 7 medium. HELD: the survivors have the key at an extreme on 13/19 = 68.4%, ABOVE the pre-registered 40-60% kept-set band (the equal-rate risk the prereg named). Nothing inserted; Algebra hard stays 71, hard route stays 8.`,
  stages: {
    shape: { passed: true, contentSha: frozenSha, verdict: 'On the 32-item frozen file: sandbox 32/32 and 96/96 distractor_solve recompute (mutation: P1 key changed fails); alg25-preflight PASS (setup triples unique, none banned; no non-ASCII dash; no k^2; non-integer-constant 2 with 1 offering the integer-k answer; off-by-one next to key 1/32; key 12/8/12); key-extremity-projection --profile sat-alg25 PASS (alg24-rate 50.7%, kept ~13.5; equal-rate 75.0% reported); zero +-pair sets; zero key-as-unique-composite; numeric hub 2 structured, key not hub; zero reviewer-facing text; zero stem duplicates vs 2,569 live SAT rows; near-dup 0 live FLAG vs 1,383 live SAT Math; math-mechanism-dup 15 FLAG / 39 near over 3,102 live maths rows + v24 20 as reference, all read by hand, none same mechanism with same setup.' },
    nosource: { passed: true, contentSha: frozenSha, verdict: 'Options-only, three samples of one Claude solver (pairwise agreement 80.8% vs 26.7% independent), 32 candidates + 20 live Algebra HARD-band controls excluding v2 and sat-math-v17/v18/v19/v22/v23/v24/v25-alg (32 eligible), blind sha 318e72a7. CANDIDATE 26/96 = 27.1% vs CONTROL 24/60 = 40.0% (both lines 25.0%): candidate minus control -12.9, inside +10; control far below the 90% ceiling. Unanimous-correct 7/32 = 21.9% vs 5/20 = 25.0%.' },
    withsource: { passed: true, contentSha: frozenSha, verdict: 'Three fresh Claude graders, stage 1 cold on disk before the keyed file existed: all 32 keys matched by all three; all exclusive; all on-blueprint 3/3 with a stated reason; 0 drop-recommends; 0 incoherent paths; plug-back impossible on all 32. Rule 7 (majority names it one template with an earlier item) dropped 13: P4 P6 Q2 Q3 Q4 Q5 Q6 Q8 Q10 Q11 R4 R7 R8 (Q, frozen second, lost 8 of 11). Survivors: 12 hard, 7 medium (panel median; graders D 18/14, E 12/20, F 24/8 hard/medium over 32).' },
    kept_set: { passed: false, contentSha: sha, verdict: `Pre-registered: key at an extreme on the kept file must be 40-60% (measured at n >= 10). Survivors: 13/19 = 68.4% (smallest 7, interior 6, largest 6). Gate FAILED HIGH; nothing inserted, nothing moved. Survival by position: extreme 13/24 = 54.2%, interior 6/8 = 75.0% (A84 measured 2/7 vs 5/6); the projection's 50.7% assumed A84's differential.` },
    tells: { passed: false, contentSha: frozenSha, verdict: 'All three graders: options ascending and the key at an end on 24/32 ("pick an end" 75%). E: key smallest on 8 of 12 sum/mean-of-extremes items, largest on 9 of 18 count/difference/length items ("sum -> lowest, count/width -> highest" 17/30). D: a one-slope-sign distractor on nearly every item. 30 of 32 share one insight; at most one per form if any ship.' },
  },
})
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log(`${id}  sha ${sha.slice(0, 16)}  ${held} items held\nledger written`)
