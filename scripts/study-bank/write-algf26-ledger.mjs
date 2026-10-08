#!/usr/bin/env node
/** Ledger entry for sat-math-v26-algfull (HELD: the kept set fails the pre-registered key-extremity
 *  gate, 7/19 = 36.8% < 40.0%), bound to the exact bytes of the held file. Run from the repo root on a
 *  ledger.json just re-read from HEAD; appends one entry and touches nothing else. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
const file = `${D}/sat-math-v26-algfull.held.batch.json`
const sha = createHash('sha256').update(readFileSync(file)).digest('hex')
const held = JSON.parse(readFileSync(file, 'utf8')).length
const frozenSha = createHash('sha256').update(readFileSync(`${D}/sat-math-v26-algfull.batch.json`)).digest('hex')
const id = 'sat-math-v26-algfull-held-2026-10-08'
if (ledger.batches.some(b => b.id === id)) { console.error(`REFUSING: ${id} already in ledger`); process.exit(2) }
if (held !== 21) { console.error(`REFUSING: held file has ${held} items, expected 21`); process.exit(2) }
if (!frozenSha.startsWith('31c91b0e')) { console.error(`REFUSING: frozen sha ${frozenSha.slice(0, 8)} != 31c91b0e`); process.exit(2) }
ledger.batches.push({
  id, createdAt: '2026-10-08', targetTest: 'sat', section: 'math',
  task: 'math_mc', family: 'mc_stem_source', cohort: 'sat-math-v26-algfull', contentSha: sha, status: 'held',
  note: `52 Algebra items, mostly medium (2/42/8 authored), four Claude authors x 13 on disjoint sub-topics, difficulty and key position fixed per slot (S15/I22/L15) (PREREG-ALGF26-2026-10-08.md, 7d16d81a). One return per author (16 items), 4 dropped before freeze; frozen 51060265 (48 items, sha ${frozenSha.slice(0, 8)}). Gate: 27 dropped, 21 pass (3 easy / 16 medium / 2 hard by panel median), easy cap 1 -> 19 would be kept. HELD: the kept set has the key at an extreme on 7/19 = 36.8%, under the refusing 40.0% bar. Nothing inserted; Algebra stays 451; SAT Math stays 29 full forms (Advanced Math binds).`,
  stages: {
    shape: { passed: true, contentSha: frozenSha, verdict: 'Frozen 48: sandbox 48/48 and 144/144 distractor_solve (mutation: changed key and changed distractor body both refused); slots 48/48 as pre-registered; key S15/I20/L13 (band 12-17/18-25/12-17), extreme 28/48 = 58.3%; 0 composite keys, 0 key-in-+-pair, 0 hygiene, 0 interior parity/KEY-CLEANER/complement/denominator; 0 stem duplicates (2,632 live SAT), near-dup 0 flagged, 0 duplicate option sets; math-mechanism-dup 1 FLAG (B03 ~ 64ad18c9, read: different) plus a hand keyword search of all 3,165 live maths rows per item (algf26.dupsearch.json), which returned 8 mechanism duplicates the scripts did not flag.' },
    nosource: { passed: true, contentSha: frozenSha, verdict: 'Options-only, frozen 48 + 48 live Algebra controls matched by authored band (38 medium / 8 hard / 2 easy; non-v2, session Algebra cohorts excluded; make-algf26-oo.mjs, blind sha 668f7c2b), keys dealt flat (line 25.0%). Three samples of one Claude solver (pairwise agreement 83.3% vs 26.0%). CANDIDATE 34/144 = 23.6% vs CONTROL 42/144 = 29.2%: -5.6 (bar +10). Unanimous-correct 9/48 = 18.8% vs 11/48 = 22.9% (bar +15). By key position: candidate extreme 4/84 = 4.8%, interior 30/60 = 50.0%; control extreme 0/69, interior 42/75 = 56.0% (reported).' },
    withsource: { passed: true, contentSha: frozenSha, verdict: 'Three fresh Claude graders (D, E, F), each over all 48 in two seeded-order halves of 24 (renders b59c3339, f364752a), stage 1 cold on disk (shas recorded) before each keyed file was released. 144/144 key_ok; every item exclusive; 0 off-blueprint. Dropped 27, all by EXT-1: one-sided error family on an extreme key 15 (A03 A05 A11 A13 B01 B12 C05 C09 C11 D02 D03 D07 D08 D12 D13), >= 2 free strikes or key identifiable free 8 (A12 B06 B13 C01 C06 C08 D04 D09; R4 median >= 2 on A12 B13 C08 D04 D09), option-structure +/- pair 3 (B07 B09 C07), incoherent explanation 1 (A08); R6 plug-back D02. Pass 21: panel median easy 3 (A07 B05 B10), medium 16, hard 2 (A02 D06).' },
    kept_set: { passed: false, contentSha: sha, verdict: 'Easy cap (live Algebra mix 2.1%) = 1: A07 inserted-candidate, B05 B10 held. Kept set 19: key at an extreme 7/19 = 36.8% (smallest 4, interior 12, largest 3) < 40.0% refusing gate (key-extremity-gate.mjs FAIL; self-test passes). Whole batch held; nothing dropped, moved or edited. Survival by key position (gate passers): extreme 7/28 = 25.0%, interior 14/20 = 70.0%, against the adv24 rates the prereg projected from (59.4% / 79.2%).' },
    tells: { passed: false, contentSha: frozenSha, verdict: 'The dominant drop class: on 15 of 28 extreme-key items the graders found a one-sided error family readable from the stem (omitted step / widened bound / greatest-under-cap stems: every natural slip lands on one side). Linear Algebra error paths are directional far more often than Advanced Math ones were; commissioning 58% extreme keys pushed authors into them.' },
  },
})
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log(`${id}  sha ${sha.slice(0, 16)}  ${held} items held\nledger written`)
