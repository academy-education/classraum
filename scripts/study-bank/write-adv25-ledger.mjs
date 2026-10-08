#!/usr/bin/env node
/** Ledger entry for the Advanced Math v25 kept file, bound to its exact bytes. Run from the repo root,
 *  on a ledger.json just re-read from HEAD (other agents commit in parallel). */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
const file = `${D}/sat-math-v25-adv.kept.batch.json`
const sha = createHash('sha256').update(readFileSync(file)).digest('hex')
const kept = JSON.parse(readFileSync(file, 'utf8')).length
const id = 'sat-math-v25-adv-kept-2026-10-08'
if (kept !== 41) { console.error(`REFUSING: kept file holds ${kept}, the verdict says 41`); process.exit(2) }
if (ledger.batches.some(b => b.id === id)) { console.error(`REFUSING: ${id} already in ledger`); process.exit(2) }
ledger.batches.push({
  id, createdAt: '2026-10-08', targetTest: 'sat', section: 'math',
  task: 'math_mc', family: 'mc_stem_source', cohort: 'sat-math-v25-adv', contentSha: sha, status: 'inserted',
  note: `60 Advanced Math items, four Claude authors x 15 on disjoint sub-topics (D nonlinear functions only), 2/41/17 authored, difficulty and key position fixed per slot from seed 20261027 (PREREG-ADV25-2026-10-08.md, 0bd5a797). Stage 0: one return each for A (A08) and D (D01), both live mechanism duplicates found by the hand keyword search; A09 dropped (~ act-math-v26 8e680740, inserted mid-stage-0). Frozen db522367 (59 items, sha de285d3a, seeded order 20261028). Gate: 16 dropped, 0 held off-blueprint, 2 panel-median easy held by the easy cap (C14 C15); ${kept} inserted: panel median 1 easy / 32 medium / 8 hard.`,
  stages: {
    shape: { passed: true, contentSha: sha, verdict: `${kept} items, all 4-choice numeric. Frozen 59: sandbox 59/59, 177/177 distractor_solve, mutations refused; slots 59/59 (adv25-slots.mjs); key S16/I26/L17 inside the band, extreme 33/59 = 55.9%; 0 composite keys, 0 key-in-+-pair, 0 hygiene, 0 interior parity/KEY-CLEANER/complement/denominator; 0 stem duplicates (2,632 live SAT), near-dup 0, 0 internal duplicate option sets; math-mechanism-dup 12 FLAG over 3,217 live maths rows, each read by hand (different), plus a hand keyword search of every live maths row and the prior Advanced Math batches per item (adv25.dupsearch.json). Kept ${kept}: sandbox ${kept}/${kept}, ${3 * kept}/${3 * kept}; key at an extreme 20/41 = 48.8% (gate PASS, bar 40.0%); S9/I21/L11; magnitude interior z -2.12 (reported, not gated).` },
    nosource: { passed: true, contentSha: sha, verdict: 'Options-only attack on the frozen 59 + 59 live Advanced Math controls matched by authored band (40 medium / 17 hard / 2 easy; non-v2, session cohorts excluded; make-adv25-oo.mjs, seed 20261027, blind sha 07eea57d), keys dealt flat (best-letter line 25.4%). Three samples of one Claude solver (pairwise agreement 43.5% vs 25.6% independent). CANDIDATE 40/177 = 22.6% vs CONTROL 59/177 = 33.3%: -10.7 (bar +10; control far below the 90% ceiling). Unanimous-correct 3/59 = 5.1% vs 5/59 = 8.5% (bar +15). By key position: candidate extreme 12/99 = 12.1%, interior 28/78 = 35.9%; control extreme 10/60 = 16.7%, interior 49/117 = 41.9% (reported).' },
    withsource: { passed: true, contentSha: sha, verdict: 'Three fresh Claude graders (D, E, F), each over all 59 in two renders (30 + 29; render shas 0d228a6e, d8a94a89), stage 1 cold on disk before the keyed file (adv25-coldcheck.mjs: 177 cold rows unchanged). 177/177 cold answers on key; every item exclusive by majority; 0 off-blueprint votes. Drops (16): R4 median >= 2 free strikes 5 (D13 B09 D01 C09 A12), EXT-1 2 (D01 E F, B06 F), R8 one-sided confirmed 2 (D15 smallest-value ask, B11), R7 option-structure confirmed 8 (D12 hub, D10 = 4 x option, D14 = option - 48, C01 = option + 4, B03 = option x 720/480, B14 = 9 x (2 - 9), A08 only integer fourth power with its root present, B10 run on 125). Easy cap 1 of 43 survivors (live 3.1%): A01 inserted, C14 C15 held. Decisions on every single-grader flag in adv25.confirm.json.' },
    tells: { passed: true, contentSha: sha, verdict: 'Recorded, not dropped: D09 called a well-known odd-part prep item by all three graders (no live row in this bank); B02 15 = sqrt(225) pair (stem gives no cue to which); C06 13 +/- 15 pair around the printed remainder; partial-answer distractors whose completion needs a computed value (A02 39, A14 25, D07 13, B04 8 / -2 / -8); shared key values across items 29 (A06 C12), -21 (A05 C04), -15 (C05 A15), 31 (B08 D06). Ask -> rank best coarse rule 22/41 = 53.7% vs always-interior 21/41 (reported).' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log(`${id}  sha ${sha.slice(0, 16)}  ${kept} items\nledger written`)
