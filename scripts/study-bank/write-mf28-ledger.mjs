#!/usr/bin/env node
/** Ledger entry for the sat-math-v28-full kept file, bound to its exact bytes. Run from the repo root. Reads
 *  ledger.json from HEAD (git show), never the working tree (other agents commit in parallel), appends this entry,
 *  writes ledger.json. PREREG-MF28-2026-10-09.md. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'
const D = 'scripts/study-bank'
const ledger = JSON.parse(execSync(`git show HEAD:${D}/ledger.json`, { encoding: 'utf8', maxBuffer: 64 << 20 }))
const file = `${D}/sat-math-v28-full.kept.batch.json`
const sha = createHash('sha256').update(readFileSync(file)).digest('hex')
const items = JSON.parse(readFileSync(file, 'utf8'))
const id = 'sat-math-v28-full-kept-2026-10-10'
const n = d => items.filter(i => i.domain === d).length
if (items.length !== 45 || n('Algebra') !== 25 || n('Advanced Math') !== 20) { console.error(`REFUSING: kept file holds ${items.length} (${n('Algebra')} / ${n('Advanced Math')}); the verdict says 45 (25 / 20)`); process.exit(2) }
if (ledger.batches.some(b => b.id === id)) { console.error(`REFUSING: ${id} already in ledger`); process.exit(2) }
ledger.batches.push({
  id, createdAt: '2026-10-10', targetTest: 'sat', section: 'math',
  task: 'math_mc', family: 'mc_stem_source', cohort: 'sat-math-v28-full', contentSha: sha, status: 'inserted',
  note: `60 items (Algebra 36 from authors A-D on algf27's sub-topics, Advanced Math 24 from P-S on adv25's), eight Claude authors writing one part file per item, 5-7 per run; slots from seed 20261040 (PREREG-MF28-2026-10-09.md, 33ad3345). A90's lessons in authoring: PLUG (substitutable asks need the key at try >= 3, verify() run per item), DPAIR (pairs through n +/- 1 or a sum of two printed numbers), grader private folders with stage-1 snapshots. Stage 0: one return per author (17 items); A05 (same chain as C05) and P01 (live df72b6a2, found at the pre-freeze re-dump) dropped. Frozen 0e4ac9be (58, sha 74a7eba3, seeded order 20261041). Gate: 13 dropped, 0 held; ${items.length} inserted: Algebra 25 (1 easy / 22 medium / 2 hard), Advanced Math 20 (0 / 19 / 1), panel median.`,
  stages: {
    shape: { passed: true, contentSha: sha, verdict: `${items.length} items, all 4-choice numeric. Frozen 58: sandbox 58/58, 174/174; mutation (B04 key, Q02 one distractor body) refused; slots 58/58; mf28-checks 0 gating (PAIR/RUN/DIR/DPAIR/PLUG); merged closure 0; near-dup and interior parity clean per author file after the return; math-mechanism-dup over 3,508 live rows: 9 FLAG + 15 near, each read; hand keyword search per item (mf28.dupsearch.json); live dump re-pulled before freeze (218 new rows read; P01 dropped). Kept: sandbox 45/45, 135/135; per-domain kept-set extremity gate Algebra 13/25 = 52.0%, Advanced Math 11/20 = 55.0% (bar 40.0%, both PASS).` },
    nosource: { passed: true, contentSha: sha, verdict: 'Options-only attack PER DOMAIN against live controls matched by authored band (make-mf28-oo.mjs; session cohorts excluded). Algebra (blind sha d9df1512, 35 + 35, line 25.7%): candidate 29/105 = 27.6% vs control 42/105 = 40.0%, -12.4 (bar +10); unanimous 9/35 = 25.7% vs 9/35 = 25.7% (bar +15). Advanced Math (blind sha c0abc976, 23 + 23, line 26.1%): 23/69 = 33.3% vs 25/69 = 36.2%, -2.9; unanimous 6/23 = 26.1% vs 7/23 = 30.4%. Controls far under the 90% ceiling. Three samples of one Claude solver (agreement 81.0% / 84.1%).' },
    withsource: { passed: true, contentSha: sha, verdict: 'Three fresh Claude graders (D, E, F) x three thirds (20/20/18; render shas 0dd3b58d, 36213d9a, 3b35740c); each third in a private folder holding only the cold render; stage-1 snapshotted, hashed and made read-only before the keyed files were released (mf28-grade-stage.mjs); mf28-coldcheck.mjs 174 cold rows, 0 problems. 174/174 cold answers on key; 0 off-blueprint. Drops (13): EXT-1 one-sided / single bound / tells D06 B03 R01 D02 C09 A10 Q02 A07 B08 (with r4 on B03 D02 A10 A07 and r6 on D02, r3 on A10 A07), r4 B01, r5 confirmed A06 (path for 18 incoherent), r8 confirmed S05 (every shortcut ignores the $2 per mug), r11live confirmed C02 (jar-and-water chain, live ssat b205095c). Plug-back drops: 1 (D02, which also fell to r4 and EXT-1) against A90\'s 8; R7pair drops: 0 confirmed (R01 dropped by F\'s EXT-1 on a sum-of-printed pair) against A90\'s 2. Every flag decision in mf28.confirm.json.' },
    tells: { passed: true, contentSha: sha, verdict: 'Survival at the gate by key position: Algebra extreme 13/21 = 61.9%, interior 12/14 = 85.7% (algf27: 56.7 / 75.0); Advanced Math extreme 11/13 = 84.6%, interior 9/10 = 90.0% (adv25: 66.7 / 80.8). Recorded, not dropped: S02 28/84 joined by 3 = 10 - 7 (a difference, outside DPAIR); Q06 a < 40 never tested by an option; R05 the natural 57 not an option; shared key values across authors 13 and 27.' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log(`${id}  sha ${sha.slice(0, 16)}  ${items.length} items\nledger written from HEAD`)
