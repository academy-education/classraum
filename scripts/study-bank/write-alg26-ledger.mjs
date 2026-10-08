#!/usr/bin/env node
/** Ledger entry for the Algebra v26 kept file, bound to its exact bytes. Run from the
 * repo root. Appends one entry to the CURRENT ledger.json (read fresh) and touches
 * nothing else. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
const file = `${D}/sat-math-v26-alg.kept.batch.json`
const sha = createHash('sha256').update(readFileSync(file)).digest('hex')
const kept = JSON.parse(readFileSync(file, 'utf8'))
const frozenSha = createHash('sha256').update(readFileSync(`${D}/sat-math-v26-alg.batch.json`)).digest('hex')
const id = 'sat-math-v26-alg-kept-2026-10-08'
if (ledger.batches.some(b => b.id === id)) { console.error(`REFUSING: ${id} already in ledger`); process.exit(2) }
const hard = kept.filter(x => x.difficulty === 'hard').length
if (kept.length !== 25 || hard !== 13) { console.error(`REFUSING: kept ${kept.length} (hard ${hard}), expected 25 (13)`); process.exit(2) }
if (!frozenSha.startsWith('be8e92d8')) { console.error(`REFUSING: frozen sha ${frozenSha.slice(0, 8)} != be8e92d8`); process.exit(2) }
ledger.batches.push({
  id, createdAt: '2026-10-08', targetTest: 'sat', section: 'math',
  task: 'math_mc', family: 'mc_stem_source', cohort: 'sat-math-v26-alg', contentSha: sha, status: 'inserted',
  note: `32 Algebra items authored as HARD by four Claude authors, one mechanism each (interval-bound, degenerate-parameter, integer-count-condition, integer-optimum; 8 each), every slot's ask type and key rank pre-registered (rank 9/7/7/9, extreme 18/32), frozen order seeded 20261026 (PREREG-ALG26-2026-10-08.md, 9946ca5e). Frozen 15066742 (32 items, sha ${frozenSha.slice(0, 8)}). Gate: 7 dropped (rule 6 plug-back <= 2: B5 B6 C6 C8 D6; C6 also EXT-1; rule 7 template of an earlier item: B3~B4, A8~A7), ${kept.length} kept: ${hard} panel-median HARD + ${kept.length - hard} medium. Kept-set key at an extreme 13/25 = 52.0% (band 40-60%).`,
  stages: {
    shape: { passed: true, contentSha: sha, verdict: 'On the 32-item frozen file: sandbox 32/32 and 96/96 distractor_solve recompute (mutation: B5 key changed fails); alg26-preflight --merge PASS (66 reference triples, none matched; ranks 9/7/7/9; ask->rank rule 11/32 = 34.4%, coarse 9/32, mechanism 10/32, all <= 40%; 4 mechanisms x 8; off-by-one 5/32; non-integer-constant 1, not offering its integer-k answer; keys distinct); key-extremity-projection --profile sat-alg26 PASS (pooled v24+v25 rate 44.2% at kept ~19.7, equal-rate 56.3%); key-extremity-gate PASS 18/32; zero +-pair sets; zero unique composite keys (1 shadowed, D7); numeric hub 2 structured, key not hub; zero reviewer-facing text; zero stem duplicates vs 2,607 live SAT rows; near-dup 0 FLAG vs 1,421 live SAT Math; math-mechanism-dup 0 FLAG / 8 near over 3,140 live maths rows, read by hand. Kept file: key extreme 13/25 = 52.0% (gate PASS).' },
    nosource: { passed: true, contentSha: sha, verdict: 'Options-only, three samples of one Claude solver (pairwise agreement 76.9% vs 25.6% independent), 32 candidates + 20 live Algebra HARD-band controls excluding v2 and sat-math-v17/v18/v19/v22-v26-alg, keys dealt flat (line 25.0%), blind sha 61272ff4. CANDIDATE 18/96 = 18.8% vs CONTROL 30/60 = 50.0%: candidate minus control -31.3, inside +10; control below the 90% ceiling. Unanimous-correct 5/32 = 15.6% vs 7/20 = 35.0%.' },
    withsource: { passed: true, contentSha: sha, verdict: 'Three fresh Claude graders, stage 1 cold on disk before the keyed file: all 32 keys matched by all three; no off-blueprint majority; no incoherent path. Drops: rule 6 (majority plug-back <= 2) B5 B6 C6 C8 D6; EXT-1 C6 (D: table rows strike all three distractors); rule 7 B3~B4, A8~A7 (2/3, frozen order). Kept 25: 13 hard (A2 A7 B2 B4 B8 C2 C3 C4 C5 D1 D3 D4 D5), 12 medium (panel median; graders D 16/16, E 10/22, F 15/17 hard/medium over 32).' },
    tells: { passed: true, contentSha: sha, verdict: 'Kept-set report (not barred): best ask->rank rule 9/25 = 36.0%, coarse 7/25 = 28.0%, mechanism->rank 8/25 = 32.0%, key at an end 13/25. Graders: F notes the single-branch distractor sits below the key on the five two-branch items; E calls D7 option 18 weak (breaks the stem limit); E and F flag A8 key equal to a printed bound (A8 dropped by rule 7); template pairs named but not majority: A1~A5, A4~A6 (F), A4~A5, C1~C4 (E). Four mechanisms; if several ship together, at most one per mechanism per form.' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log(`${id}  sha ${sha.slice(0, 16)}  ${kept.length} items\nledger written`)
