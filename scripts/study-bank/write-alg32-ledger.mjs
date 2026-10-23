#!/usr/bin/env node
/** Ledger entry for the Algebra v32 kept file, bound to its exact bytes. Run from the
 * repo root. Appends one entry to the CURRENT ledger.json (read fresh) and touches
 * nothing else. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
const file = `${D}/sat-math-v32-alg.kept.batch.json`
const sha = createHash('sha256').update(readFileSync(file)).digest('hex')
const kept = JSON.parse(readFileSync(file, 'utf8'))
const frozenSha = createHash('sha256').update(readFileSync(`${D}/sat-math-v32-alg.batch.json`)).digest('hex')
const id = 'sat-math-v32-alg-kept-2026-10-23'
if (ledger.batches.some(b => b.id === id)) { console.error(`REFUSING: ${id} already in ledger`); process.exit(2) }
const hard = kept.filter(x => x.difficulty === 'hard').length
if (kept.length !== 10 || hard !== 10) { console.error(`REFUSING: kept ${kept.length} (hard ${hard}), expected 10 (10)`); process.exit(2) }
if (!frozenSha.startsWith('5cba2091')) { console.error(`REFUSING: frozen sha ${frozenSha.slice(0, 8)} != 5cba2091`); process.exit(2) }
ledger.batches.push({
  id, createdAt: '2026-10-23', targetTest: 'sat', section: 'math',
  task: 'math_mc', family: 'mc_stem_source', cohort: 'sat-math-v32-alg', contentSha: sha, status: 'inserted',
  note: `alg31 rerun (PREREG-MATH-ALG32-2026-10-23.md, ca8283c8): recalibrated plug-back probe (alg26 D6 replaced by algf27 D13; plant-only gate VALID 2/2), aggregate-only try-1-2 slots so the fallback drops 0 by construction, closure check gating. Three Claude authors (degenerate-parameter, integer-count-condition, integer-optimum; 8 each). Stage 0: R9 key collisions returned once per author; the returns collided at 22 (coordinator error) and C2 was dropped by the pre-written sha tie-break. Frozen ${frozenSha.slice(0, 8)} (23 items). Gate (clean-render graders only): ${kept.length} kept, ${hard} panel-median HARD; 13 dropped (rule 7 templates B2 B3 B5 C6 D7 D8; rule 4 C8 D3; rule 6 D4; EXT-1 B8 C3 D1; r5 confirmed B7). Kept-set key at an extreme 5/10 = 50.0% (band 40-60%).`,
  stages: {
    shape: { passed: true, contentSha: sha, verdict: 'alg32-preflight --merge on the authored 24 PASS except R9 (returned); after return and the C2 drop, --after-drops C2 PASS (R6 56.5%, R7 39.1%, R10 4/4 per mechanism, closure clean); projection PASS (kept ~18.0); every part PART OK (sandbox, slot, idea-probe order, near-dup, closure). Plug-back probe r1 VALID (plants 5/5, 0/8) 0/24 flagged; r2 VALID (5/5, 2/8) 0/3 flagged on the returned items.' },
    nosource: { passed: true, contentSha: sha, verdict: 'Options-only, three samples of one Claude solver, 23 candidates + 20 live Algebra HARD controls (exclude v2, v17-v32 alg/full), blind sha 0d14799e. CANDIDATE 20/69 = 29.0% (line 26.1%) vs CONTROL 25/60 = 41.7% (line 25.0%): candidate minus control -12.7, inside +10; control below 90%. Unanimous-correct 6/23 = 26.1% vs 6/20 = 30.0%.' },
    withsource: { passed: true, contentSha: sha, verdict: 'DEVIATION recorded: the first render leaked each item mechanism (make-grade-render deny-list gap); that run is kept under grade-leaked-r1 and decides nothing. Three FRESH Claude graders on the clean render (sha 4aba4359, id/prompt/choices only); stage 1 snapped before keys (coldcheck 69 rows, 0 problems). All 23 keys matched by all three; 0 key disputes. Cold difficulty: D 15/8, E 17/6, F 17/6 hard/medium. Kept 10 hard: B1 B4 B6 C1 C4 C5 C7 D2 D5 D6. Confirms decided in alg32.confirm.json (6 rejected with mf30 precedent, 1 confirmed: B7 wrong distractor explanation).' },
    tells: { passed: true, contentSha: sha, verdict: 'Kept-set key at an extreme 5/10 = 50.0%, key-extremity gate PASS. Grader-named patterns: skipped-special-case distractor sits above the key in B4/B7/C3 (B7 and C3 dropped); D6/D7 greatest-profit keys second-smallest (D7 dropped). Three mechanisms; at most one per mechanism per form if several ship together.' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log(`${id}  sha ${sha.slice(0, 16)}  ${kept.length} items\nledger written`)
