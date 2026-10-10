#!/usr/bin/env node
/** Ledger entry for the sat-math-v29-full kept file, bound to its exact bytes. Run from the repo root. Reads
 *  ledger.json from HEAD (git show), never the working tree (other agents commit in parallel), appends ONLY this
 *  entry, writes ledger.json. PREREG-MF29-2026-10-10.md. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'
const D = 'scripts/study-bank'
const ledger = JSON.parse(execSync(`git show HEAD:${D}/ledger.json`, { encoding: 'utf8', maxBuffer: 64 << 20 }))
const file = `${D}/sat-math-v29-full.kept.batch.json`
const sha = createHash('sha256').update(readFileSync(file)).digest('hex')
const items = JSON.parse(readFileSync(file, 'utf8'))
const id = 'sat-math-v29-full-kept-2026-10-10'
const n = d => items.filter(i => i.domain === d).length
if (items.length !== 52 || n('Algebra') !== 25 || n('Advanced Math') !== 27) { console.error(`REFUSING: kept file holds ${items.length} (${n('Algebra')} / ${n('Advanced Math')}); the verdict says 52 (25 / 27)`); process.exit(2) }
if (ledger.batches.some(b => b.id === id)) { console.error(`REFUSING: ${id} already in ledger`); process.exit(2) }
ledger.batches.push({
  id, createdAt: '2026-10-10', targetTest: 'sat', section: 'math',
  task: 'math_mc', family: 'mc_stem_source', cohort: 'sat-math-v29-full', contentSha: sha, status: 'inserted',
  note: `75 items (Algebra 40 from authors A-D, Advanced Math 35 from P-S, mf28's sub-topics), eight Claude authors writing one part file per item, 5-7 per run (13 runs, at most two subagents at once); slots from seed 20261050 (PREREG-MF29-2026-10-10.md, ab7981ce). A91's lessons in authoring: FAR (extreme keys: distractors not all "omits", a real distractor from a far-side error named and hand-read) and DSUM (a key/option difference equal to the sum of two printed numbers gates). Stage 0: one return per author (22 items); A06 Q01 Q05 still failing after the return, D02 (live isee 60af7d, found at the pre-freeze re-dump) and S07 (prior SM24V-D04) dropped. Frozen d8a2a394 (70, sha 49673ba7, seeded order 20261051). Gate: 16 dropped, 2 held easy; ${items.length} inserted: Algebra 25 (1 easy / 23 medium / 1 hard), Advanced Math 27 (1 / 20 / 6), panel median.`,
  stages: {
    shape: { passed: true, contentSha: sha, verdict: `${items.length} items, all 4-choice numeric. Frozen 70: sandbox 70/70, 210/210; mutation (B05 key, B10 one distractor body) refused; slots 70/70; mf29-checks 0 gating (PAIR/RUN/DIR/DPAIR/DSUM/PLUG/FAR); merged closure 0, composition 0/72; batch bands Algebra S11/I15/L12, Advanced Math S10/I14/L8; math-mechanism-dup over 3,781 live rows 0 FLAG, 19 near, each read; coordinator keyword search per item (mf29.dupsearch.json); live dump re-pulled before freeze (228 new rows read; D02 dropped). Kept: sandbox 52/52, 156/156; per-domain kept-set extremity gate Algebra 12/25 = 48.0%, Advanced Math 16/27 = 59.3% (bar 40.0%, both PASS).` },
    nosource: { passed: true, contentSha: sha, verdict: 'Options-only attack PER DOMAIN against live controls matched by authored band (make-mf29-oo.mjs; session cohorts excluded). Algebra (blind sha 3bef77c0, 38 + 38, line 26.3%): candidate 23/114 = 20.2% vs control 44/114 = 38.6%, -18.4 (bar +10); unanimous 6/38 = 15.8% vs 13/38 = 34.2% (bar +15). Advanced Math (blind sha 4a3932c5, 32 + 32, line 25.0%): 34/96 = 35.4% vs 36/96 = 37.5%, -2.1; unanimous 9/32 = 28.1% vs 8/32 = 25.0%. Controls far under the 90% ceiling. Three samples of one Claude solver (agreement 89.5% / 78.6%).' },
    withsource: { passed: true, contentSha: sha, verdict: 'Three fresh Claude graders (D, E, F) x three thirds (25/25/20; render shas 0af75158, 5902fb67, 0f1289b5); each third in a private folder outside the repo holding only the cold render; stage 1 snapshotted, hashed and made read-only before the keyed files were released (mf29-grade-stage.mjs); mf29-coldcheck.mjs 210 cold rows, 0 problems. 210/210 cold answers on key; 0 off-blueprint by majority. Drops (16): r6 plug-back <= 2 B09 D04 A07 A04 B08 A09; one-sided / single bound on extreme keys D01 B01 A04 C05 D03 P09 (EXT-1, r8/r10 confirmed); r3 weak distractors Q07 R01; r11 template B10 (of B09); EXT-1 B07 (triangle midpoint content), S10 (two-option bound). Held easy past the cap: R02, C09. Every flag decision in mf29.confirm.json.' },
    tells: { passed: true, contentSha: sha, verdict: 'Survival at the gate by key position: Algebra extreme 12/23 = 52.2%, interior 13/15 = 86.7% (mf28: 61.9 / 85.7); Advanced Math extreme 16/18 = 88.9%, interior 11/14 = 78.6% (mf28: 84.6 / 90.0). One-sided / single-bound drops on extreme keys 6 of 41 frozen extreme (mf28: 9 of 34); R7pair/DSUM drops 0 (mf28: 1); plug-back drops 6 (mf28: 1). Recorded, not dropped: A11 key 45 equals the minutes printed in 7:45; option-pair flags on C11 S09 S11 S02 S08 A11 read and rejected (coincidental, outside the gating definitions).' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log(`${id}  sha ${sha.slice(0, 16)}  ${items.length} items\nledger written from HEAD`)
