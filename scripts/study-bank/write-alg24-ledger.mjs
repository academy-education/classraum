#!/usr/bin/env node
/** Ledger entry for Algebra v24 (HELD: the kept set fails the pre-registered
 * key-extremity band), bound to the exact bytes of the held file. Run from the
 * repo root. Appends one entry to the CURRENT ledger.json and touches nothing
 * else (generatedAt is left alone so the diff is this entry only). */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
const file = `${D}/sat-math-v24-alg.held.batch.json`
const sha = createHash('sha256').update(readFileSync(file)).digest('hex')
const held = JSON.parse(readFileSync(file, 'utf8')).length
const frozenSha = createHash('sha256').update(readFileSync(`${D}/sat-math-v24-alg.batch.json`)).digest('hex')
const id = 'sat-math-v24-alg-held-2026-10-08'
if (ledger.batches.some(b => b.id === id)) { console.error(`REFUSING: ${id} already in ledger`); process.exit(2) }
if (held !== 7) { console.error(`REFUSING: held file has ${held} items, expected 7`); process.exit(2) }
ledger.batches.push({
  id, createdAt: '2026-10-08', targetTest: 'sat', section: 'math',
  task: 'math_mc', family: 'mc_stem_source', cohort: 'sat-math-v24-alg', contentSha: sha, status: 'held',
  note: `20 Algebra items authored as HARD in the two shapes that graded hard 3/3 in v23 (half A: whole-interval bound, both slope signs; half B: count over a constant that need not be an integer), two Claude authors, no auditor, no repair (PREREG-ALG24-2026-10-08.md, fa981b1d). 7 of 10 half-A items dropped at pre-flight by the pre-registered near-dup rule (word-set Jaccard 0.68-1.00 vs live v23 A6, the family reference item). Frozen be46f3de (13 items, sha ${frozenSha.slice(0, 8)}). Gate: 6 dropped (EXT-1 B1; rule 7 template-of-earlier A7 B5 B7 B9 B10), ${held} survive: 4 panel-median HARD (A2 A4 B4 B6) + 3 medium (B2 B3 B8). HELD: the survivors have the key at an extreme on 2/7 = 28.6%, outside the pre-registered 40-60% kept-set band. Nothing inserted; Algebra hard stays 71, hard route stays 8.`,
  stages: {
    shape: { passed: true, contentSha: frozenSha, verdict: 'On the 13-item frozen file: sandbox 13/13 and 39/39 distractor_solve recompute (mutation: A1 key changed fails, on the 20-item merge); zero +-pair sets; zero key-as-unique-composite; numeric hub 1 structured set, key not hub; zero reviewer-facing text; key at an extreme 7/13 = 53.8%; check-key-magnitude largest z 2.18 (recorded, not a pre-registered bar); zero stem duplicates vs 2,569 live SAT rows; near-dup 0 FLAG vs 1,383 live SAT Math rows after the 7 pre-flight drops; math-mechanism-dup 0 FLAG / 7 near over 2,784 live maths rows (read by hand: none the same mechanism); setup triples 20/20 distinct; no non-ASCII dash; no k^2.' },
    nosource: { passed: true, contentSha: frozenSha, verdict: 'Options-only, three samples of one Claude solver (pairwise agreement 77.8% vs 26.2% independent), 13 candidates + 20 live Algebra HARD-band controls excluding v2 and sat-math-v17/v18/v19/v22/v23/v24-alg (32 eligible), blind sha d0ef89d9. CANDIDATE 14/39 = 35.9% (own line 30.8%) vs CONTROL 19/60 = 31.7% (line 25.0%): candidate minus control +4.2, inside +10; control far below the 90% ceiling. Unanimous-correct 3/13 = 23.1% vs 5/20 = 25.0%.' },
    withsource: { passed: true, contentSha: frozenSha, verdict: 'Three fresh Claude graders, stage 1 cold on disk before the keyed file: all 13 keys matched by all three; all exclusive; all 13 on-blueprint 3/3 with a stated reason; k-quadratic rejected-root 0/39. Drops: B1 EXT-1 (D: key is the only fraction, 496 struck by sign); rule 7 (majority names it one template with an earlier item): A7~A2 3/3, B9~B2 3/3, B10~B4 3/3, B5~B1 2/3, B7~B1 2/3. Survivors: A2 A4 B4 hard 3/3, B6 hard 2/3, B2 B3 B8 medium 3/3. No item tripped rule 6 (plug-back <= 2 routine).' },
    kept_set: { passed: false, contentSha: sha, verdict: `Pre-registered rule 7: key at an extreme on the kept file must be 40-60%. Survivors: 2/7 = 28.6% (A2 B4 largest; A4 B2 B3 B6 B8 interior). Gate FAILED; nothing inserted, nothing moved. The gate drops fell on extreme-key items: 5 of the 7 extreme-key items in the frozen file were dropped (A7 B5 B7 largest, B1 B9 smallest), 1 of 6 interior (B10). key-extremity-gate.mjs itself returns NO-MEASUREMENT below 10 items.` },
    tells: { passed: false, contentSha: frozenSha, verdict: 'All three graders independently name one cross-item insight: every half-B item turns on "k need not be an integer", and every count/sum item offers the integer-k answer as a distractor, so "never pick the integer-k answer" strikes one option across the family. Second recipes: aggregate of the intermediate instead of k (B1 496, B9 153), off-by-one endpoint adjacent to the key (B2 11/12, B6 42/43, B5 184/3 vs 187/3, B8 93/5). D: B7 integer condition does no work.' },
  },
})
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log(`${id}  sha ${sha.slice(0, 16)}  ${held} items held\nledger written`)
