#!/usr/bin/env node
/** Ledger entry for the sat-math-v30-full kept file, bound to its exact bytes. Run from the repo root. Reads
 *  ledger.json from HEAD (git show), never the working tree (other agents commit in parallel), and INSERTS this
 *  entry as text at the end of the "batches" array, so every other entry keeps its exact formatting (A92 note 5:
 *  re-serialising turned another entry's 28.0 into 28). Only generatedAt changes outside this entry. Refuses unless
 *  the result parses and equals HEAD plus this entry. PREREG-MF30-2026-10-10.md. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'
import { isDeepStrictEqual } from 'node:util'
const D = 'scripts/study-bank'
const text = execSync(`git show HEAD:${D}/ledger.json`, { encoding: 'utf8', maxBuffer: 64 << 20 })
const before = JSON.parse(text)
const file = `${D}/sat-math-v30-full.kept.batch.json`
const sha = createHash('sha256').update(readFileSync(file)).digest('hex')
const items = JSON.parse(readFileSync(file, 'utf8'))
const id = 'sat-math-v30-full-kept-2026-10-10'
const n = d => items.filter(i => i.domain === d).length
const want = { Algebra: 15, 'Advanced Math': 13, 'Geometry and Trigonometry': 12, 'Problem-Solving and Data Analysis': 10 }
if (items.length !== 50 || Object.entries(want).some(([d, k]) => n(d) !== k)) { console.error(`REFUSING: kept file holds ${items.length}; the verdict says 50 (15 / 13 / 12 / 10)`); process.exit(2) }
if (before.batches.some(b => b.id === id)) { console.error(`REFUSING: ${id} already in ledger`); process.exit(2) }
const entry = {
  id, createdAt: '2026-10-10', targetTest: 'sat', section: 'math',
  task: 'math_mc', family: 'mc_stem_source', cohort: 'sat-math-v30-full', contentSha: sha, status: 'inserted',
  note: `65 items over four domains (Algebra 20 from authors A-D, Advanced Math 15 from P-R, Geometry 15 from G H J, PSDA 15 from T U V), thirteen Claude authors writing one part file per item, 5 per run, at most two subagents at once; slots from seed 20261060 (PREREG-MF30-2026-10-10.md, fca23655). mf29 machinery with FAR (far side by error) and DSUM; A92's lessons added: PLUGA (Algebra plug-back decided by a cold probe with 12 mf29 plants), INTER (solved-intermediate distractors, brief + hand read), KEYPRINT, STRUCT. Stage 0: one return per author (18 items); C05 flagged by the probe after its return and dropped. Frozen ce3a2752 (64, sha ad65f3c5, seeded order 20261061). Gate: 14 dropped; 50 inserted: Algebra 15 (0 easy / 13 medium / 2 hard), Advanced Math 13 (1 / 11 / 1), Geometry 12 (1 / 9 / 2), PSDA 10 (0 / 9 / 1), panel median.`,
  stages: {
    shape: { passed: true, contentSha: sha, verdict: `${items.length} items, all 4-choice numeric (5 PSDA items carry a table graphic). Frozen 64: sandbox 64/64, 192/192; key and distractor mutations refused; slots 64/64; mf30-checks 0 gating (PAIR/RUN/DIR/DPAIR/DSUM/PLUG/FAR/KEYPRINT/STRUCT/INTER); per-domain stage-0 bands in and extremity gate PASS; live dump re-pulled before freeze (3,833 rows, 0 new); math-mechanism-dup 5 FLAG (B02, rejected) and 52 near, read. Plug-back probe round 1 valid (plants 4/4 positives, 0/6 negatives), 0 of 20 Algebra flagged; round 2 valid (4/4, 1/6), C05 flagged and dropped. Kept: sandbox 50/50, 150/150; per-domain kept-set extremity gate Algebra 9/15 = 60.0%, Advanced Math 8/13 = 61.5%, Geometry 6/12 = 50.0%, PSDA 4/10 = 40.0% (bar 40.0%, all PASS).` },
    nosource: { passed: true, contentSha: sha, verdict: 'Options-only attack PER DOMAIN against live controls matched by authored band (make-mf30-oo.mjs; v2 and session cohorts excluded). Algebra (blind sha 0ffb9681): candidate 12/57 = 21.1% vs control 29/57 = 50.9%, -29.8 (bar +10); unanimous 1/19 = 5.3% vs 7/19 = 36.8% (bar +15). Advanced Math (df3aa9fa): 11/45 = 24.4% vs 16/45 = 35.6%, -11.1; 20.0% vs 26.7%. Geometry (a2c338e8): 12/45 = 26.7% vs 21/45 = 46.7%, -20.0; 13.3% vs 33.3%. PSDA (7cc15793): 5/45 = 11.1% vs 12/45 = 26.7%, -15.6; 6.7% vs 20.0%. Controls under the 90% ceiling. Three samples of one Claude solver (agreement 70.2 / 82.2 / 74.4 / 73.3%).' },
    withsource: { passed: true, contentSha: sha, verdict: 'Three fresh Claude graders (D, E, F) x three thirds (22/22/20; render shas 9ad0e5f7, e25812ac, 29139656); each third in a private folder outside the repo holding only the cold render; stage 1 snapshotted, hashed and made read-only before the keyed files were released (mf30-grade-stage.mjs); mf30-coldcheck.mjs 192 cold rows, 0 problems. 192/192 cold answers on key; 0 off-blueprint by majority. Drops (14): one-sided / single bound on extreme keys U05 B01 V05 H03 G05 D01 U04 Q01 V01 (EXT-1; V05 also r4, V01 also r6); free elimination A01 (EXT-1); option pair and weak distractors C04 (EXT-1); r4 median struck 2 J03; decoy condition U03 (EXT-1: Class B mean is 1 for every x); r7 arithmetic-class tell Q02 confirmed (the only rounded option under "closest to"). Every flag decision in mf30.confirm.json.' },
    tells: { passed: true, contentSha: sha, verdict: 'Survival at the gate by key position: Algebra extreme 9/12 = 75.0%, interior 6/7 = 85.7% (mf29: 52.2 / 86.7); Advanced Math 8/9 = 88.9%, 5/6 = 83.3% (mf29: 88.9 / 78.6); Geometry 6/9 = 66.7%, 6/6 = 100.0%; PSDA 4/9 = 44.4%, 6/6 = 100.0%. One-sided / single-bound drops on extreme keys 9 of 39 frozen extreme (mf29: 6 of 41), Algebra 2 of 12. Plug-back drops (r6) 1, PSDA V01; Algebra 0 (mf29: 6, all Algebra). Solved-intermediate drops 0.' },
  },
}
// text insert: find the "batches" array and its closing bracket, string-aware
const start = text.indexOf('"batches": [')
if (start < 0) { console.error('REFUSING: no batches array'); process.exit(2) }
let i = text.indexOf('[', start), depth = 0, inStr = false, esc = false, end = -1
for (; i < text.length; i++) {
  const c = text[i]
  if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue }
  if (c === '"') inStr = true; else if (c === '[' || c === '{') depth++; else if (c === ']' || c === '}') { depth--; if (depth === 0) { end = i; break } }
}
if (end < 0) { console.error('REFUSING: unterminated batches array'); process.exit(2) }
let k = end - 1; while (/\s/.test(text[k])) k--
const body = JSON.stringify(entry, null, 2).split('\n').map(l => '    ' + l).join('\n')
const now = new Date().toISOString()
let out = text.slice(0, k + 1) + ',\n' + body + text.slice(k + 1, end) + text.slice(end)
out = out.replace(/"generatedAt": "[^"]*"/, `"generatedAt": "${now}"`)
const after = JSON.parse(out)
const expect = { ...before, generatedAt: now, batches: [...before.batches, entry] }
if (!isDeepStrictEqual(after, expect)) { console.error('REFUSING: the text insert does not equal HEAD plus this entry'); process.exit(2) }
writeFileSync(`${D}/ledger.json`, out)
console.log(`${id}  sha ${sha.slice(0, 16)}  ${items.length} items\nledger written from HEAD (text insert; only generatedAt changes outside this entry)`)
