#!/usr/bin/env node
/** Ledger entry for the Algebra v23 kept file, bound to its exact bytes. Run from the repo root. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
const file = `${D}/sat-math-v23-alg.kept.batch.json`
const sha = createHash('sha256').update(readFileSync(file)).digest('hex')
const kept = JSON.parse(readFileSync(file, 'utf8')).length
const id = 'sat-math-v23-alg-kept-2026-10-08'
if (ledger.batches.some(b => b.id === id)) { console.error(`REFUSING: ${id} already in ledger`); process.exit(2) }
ledger.batches.push({
  id, createdAt: '2026-10-08', targetTest: 'sat', section: 'math',
  task: 'math_mc', family: 'mc_stem_source', cohort: 'sat-math-v23-alg', contentSha: sha, status: 'inserted',
  note: `14 pure-algebra PARAMETER items authored as HARD in two halves (separate Claude authors), no auditor and no repair (PREREG-ALG23-2026-10-08.md, 2222115e), frozen 7dfb8e30 (sha 9ef5b914), ${kept} kept: 2 panel-median HARD (A6 B7) + 9 medium. PARTIAL hard commission (1-2 hard): Algebra hard 69 -> 71, hard route stays 8 (form 9 needs 72). Drop: B2 (rule 5: explanation check line prints x = 3 for k = -10, value is -3). HELD: A1 A2 (3 of 3 graders off-blueprint: a third linear condition makes three equations in x, y, k; both graded hard 3/3). No item tripped rule 6 (plug-back <= 2).`,
  stages: {
    shape: { passed: true, contentSha: sha, verdict: `${kept} items, all 4-choice numeric. On the 14-item frozen file: sandbox 14/14 and 42/42 distractor_solve recompute (mutation: A1 key -> -10 fails); zero +-pair sets holding the key (2 pair sets, key in 0); zero key-as-unique-composite; no numeric or symbolic hub; key at an extreme 8/14 = 57.1%; zero reviewer-facing text; zero stem duplicates vs 2,558 live SAT rows; near-dup max prompt Jaccard 0.500 vs 1,372 live SAT Math rows (threshold 0.60); math-mechanism-dup 0 FLAG over 2,773 live maths rows (2 near, read by hand: plain parallel/perpendicular-through-a-point, no parameter). Kept file: key at an extreme 6/11 = 54.5% (gate PASS).` },
    withsource: { passed: true, contentSha: sha, verdict: 'Three fresh Claude graders, stage 1 cold (stem + options, written to disk before the keyed file was opened): all three matched the key on all 14; every item exclusive. Kept items: median free strikes 0 (A7: 1, direction kills 9); no item with plug-back <= 2 (A7 3, B3 4, B4 4 tries; the rest not checkable by substitution). Panel: A6 B7 hard 3/3; B4 hard/medium/medium; the rest medium 3/3. No kept item off-blueprint.' },
    nosource: { passed: true, contentSha: sha, verdict: 'Options-only attack on the 14-item frozen file, three samples of one solver (pairwise agreement 71.4% vs 27.3% independent), 14 candidates + 14 live Algebra HARD-band controls excluding v2 and sat-math-v17/v18/v19/v22/v23-alg (32 eligible), keys dealt flat (control line 25.0%). CANDIDATE 1/42 = 2.4% vs CONTROL 17/42 = 40.5%: margin -38.1, inside +10; control far below the 90% ceiling. Unanimous-correct 0/14 candidate vs 3/14 control. Below chance: the solver favours interior values and 8/14 keys sit at an extreme; recorded, not a pre-registered bar.' },
    tells: { passed: true, contentSha: sha, verdict: 'Recorded, not dropped: graders call A3 A4 A7 B1 B3 insight-bypassable (Desmos slider or a two-case check); D notes B3 solvable without the perpendicular condition; F calls B4 distractors 2 and 6 one shared error; template pairs B1/B2 and B5/B6; F names a batch-level k^2 = n two-root template across A1 A2 A7 B3 B4.' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log(`${id}  sha ${sha.slice(0, 16)}  ${kept} items\nledger written`)
