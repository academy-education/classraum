#!/usr/bin/env node
/** Ledger entry for the Algebra full-form v27 kept file, bound to its exact bytes. Run from the repo root,
 *  on a ledger.json just re-read from HEAD (other agents commit in parallel). */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
const file = `${D}/sat-math-v27-algfull.kept.batch.json`
const sha = createHash('sha256').update(readFileSync(file)).digest('hex')
const kept = JSON.parse(readFileSync(file, 'utf8')).length
const id = 'sat-math-v27-algfull-kept-2026-10-08'
if (kept !== 32) { console.error(`REFUSING: kept file holds ${kept}, the verdict says 32`); process.exit(2) }
if (ledger.batches.some(b => b.id === id)) { console.error(`REFUSING: ${id} already in ledger`); process.exit(2) }
ledger.batches.push({
  id, createdAt: '2026-10-08', targetTest: 'sat', section: 'math',
  task: 'math_mc', family: 'mc_stem_source', cohort: 'sat-math-v27-algfull', contentSha: sha, status: 'inserted',
  note: `52 Algebra items, four Claude authors x 13 on A88's disjoint sub-topics, 0/44/8 authored, difficulty and key position fixed per slot from seed 20261029 (S16/I20/L16; PREREG-ALGF27-2026-10-08.md, 65879dac). A88's cause fixed in authoring: per-distractor direction declaration, counter_error on extreme keys, one-way asks banned on extreme slots, A89's option pair joined by a printed number banned (algf27-checks PAIR/RUN/DIR, on every author file before its return). Stage 0: one return per author (A05 A13 / B05 B06 / C01 C09 C10 C12 / D07 D11); B05 and D02 dropped before freeze. Frozen 523a8710 (50 items, sha 2a032c81, seeded order 20261030). Gate: 18 dropped, 0 held off-blueprint, 0 easy past the cap; ${kept} inserted: panel median 0 easy / 29 medium / 3 hard.`,
  stages: {
    shape: { passed: true, contentSha: sha, verdict: `${kept} items, all 4-choice numeric. Frozen 50: sandbox 50/50, 150/150 distractor_solve, mutations refused (A04 key, A10 distractor); slots 50/50; PAIR/RUN/DIR 0; closure 0; 0 interior parity / KEY-CLEANER / complement; 0 stem duplicates (2,673 live SAT), near-dup 0; math-mechanism-dup 0 FLAG over 3,258 live maths rows (near hits read; D02 dropped from one); hand keyword search of every live maths row and 511 prior/held Algebra items per item (algf27.dupsearch.json); live dump re-pulled before freeze (0 changed). Key S15/I20/L15, extreme 30/50 = 60.0%. Kept ${kept}: sandbox ${kept}/${kept}, ${3 * kept}/${3 * kept}; key at an extreme 17/32 = 53.1% (refusing gate PASS, bar 40.0%); S7/I15/L10; magnitude largest z 2.19, interior z -2.33 (reported, not gated).` },
    nosource: { passed: true, contentSha: sha, verdict: 'Options-only attack on the frozen 50 + 50 live Algebra controls matched by authored band (43 medium / 7 hard; non-v2, session Algebra cohorts excluded; make-algf27-oo.mjs, seed 20261029, blind sha 83ef4301), keys dealt flat (best-letter line 26.0%). Three samples of one Claude solver (pairwise agreement 90.7% vs 27.7% independent). CANDIDATE 44/150 = 29.3% vs CONTROL 64/150 = 42.7%: -13.3 (bar +10; control far below the 90% ceiling). Unanimous-correct 12/50 = 24.0% vs 19/50 = 38.0% (bar +15). By key position: candidate extreme 4/90 = 4.4%, interior 40/60 = 66.7%; control extreme 8/60 = 13.3%, interior 56/90 = 62.2% (reported).' },
    withsource: { passed: true, contentSha: sha, verdict: 'Three fresh Claude graders (D, E, F), each over all 50 in two renders (25 + 25; render shas 0ddcd826, 15074b32), stage 1 cold on disk before the keyed file (algf27-coldcheck.mjs: 150 cold rows unchanged). The first F-h2 run edited its stage-1 file after opening the key (a positional-argument remap) and shared a scratch script with E; it was discarded and F-h2 re-run fresh in a private folder (the discarded run had recommended no drops; the re-run added D13 and C01). 150/150 cold answers on key; 0 off-blueprint. Drops (18): R6 plug-back <= 2 by majority 8 (D05 A05 D08 B09 D06 B07 B10 on S keys reached first by ascending plug-back; D13), R4 median >= 2 free strikes 3 (A09 binders multiple of 5; A10 total 4Q; A13 parity), EXT-1 one-sided / option map 4 (D10 D, D03 D F, D12 D, C01 E F - a cheap overtime-rate bound), R7pair confirmed 2 (B01 45 = 3 x the fee 15, D04 96 = 4 x the count 24), R11 template 1 (B13 ~ B02). Decisions on every single-grader flag in algf27.confirm.json.' },
    tells: { passed: true, contentSha: sha, verdict: 'Recorded, not dropped: C09 short/surplus is a known prep pattern with no live row; C07 -25 = 5 x -5 with a computed multiplier; shared key values across items 17 (C04 A03), 18 (C13 D01), 22 (D05 A06), 24 (A08 B06), -12 (A01 B02), -22 (A07 C08). Survival at the gate by key position: extreme 17/30 = 56.7%, interior 15/20 = 75.0% (A88: 25.0% / 70.0%).' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log(`${id}  sha ${sha.slice(0, 16)}  ${kept} items\nledger written`)
