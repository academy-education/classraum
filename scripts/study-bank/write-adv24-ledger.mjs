#!/usr/bin/env node
/** Ledger entry for the Advanced Math v24 kept file, bound to its exact bytes. Run from the repo root,
 *  on a ledger.json just re-read from HEAD (other agents commit in parallel). */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
const file = `${D}/sat-math-v24-adv.kept.batch.json`
const sha = createHash('sha256').update(readFileSync(file)).digest('hex')
const kept = JSON.parse(readFileSync(file, 'utf8')).length
const id = 'sat-math-v24-adv-kept-2026-10-08'
if (!process.argv.includes('--easy')) {
if (ledger.batches.some(b => b.id === id)) { console.error(`REFUSING: ${id} already in ledger`); process.exit(2) }
ledger.batches.push({
  id, createdAt: '2026-10-08', targetTest: 'sat', section: 'math',
  task: 'math_mc', family: 'mc_stem_source', cohort: 'sat-math-v24-adv', contentSha: sha, status: 'inserted',
  note: `60 Advanced Math items, four Claude authors x 15 on disjoint sub-topics, live difficulty mix (4/38/18 authored), key position fixed per slot (PREREG-ADV24-2026-10-08.md, b3219209). Stage 0: one return per author (15 items), 4 replacements still duplicating dropped; frozen 6d90b316 (56 items, sha a75dc3fa). Gate: 16 dropped, 2 held off-blueprint (D09 D10, linear inverse = Algebra), ${kept} kept: panel median 5 easy / 24 medium / 9 hard.`,
  stages: {
    shape: { passed: true, contentSha: sha, verdict: `${kept} items, all 4-choice numeric. Frozen 56: sandbox 56/56 and 168/168 distractor_solve; key S17/I24/L15 (band 14-20/23-30/14-20), extreme 32/56 = 57.1%; 0 composite keys, 0 key-in-+-pair, 0 hygiene, 0 interior parity/KEY-CLEANER/complement/denominator; 0 stem duplicates (2,569 live SAT), near-dup 0 flagged, 0 duplicate option sets; math-mechanism-dup 1 FLAG (A13 vs ce0df3d6, read by hand: different) plus a hand keyword search of all live maths per item, which returned 11 mechanism duplicates the scripts did not flag. Kept ${kept}: sandbox ${kept}/${kept}, ${3 * kept}/${3 * kept}; key at an extreme 19/38 = 50.0% (gate PASS, bar 40.0%); S12/I19/L7; magnitude smallest z 2.59 (reported, not gated).` },
    nosource: { passed: true, contentSha: sha, verdict: 'Options-only attack on the frozen 56 + 56 live Advanced Math controls matched by authored band (36 medium / 16 hard / 4 easy; non-v2, session cohorts excluded; make-adv24-oo.mjs, blind sha c0a8fcc5), keys dealt flat (line 25.0%). Three samples of one Claude solver (pairwise agreement 81.0% vs 25.6% independent). CANDIDATE 49/168 = 29.2% vs CONTROL 48/168 = 28.6%: +0.6 (bar +10). Unanimous-correct 12/56 = 21.4% vs 12/56 = 21.4% (bar +15). By key position: candidate interior 42/72 = 58.3% vs control interior 43/111 = 38.7%; extreme 7/96 = 7.3% vs 5/57 = 8.8% (reported).' },
    withsource: { passed: true, contentSha: sha, verdict: 'Three fresh Claude graders (D, E, F), each over all 56 in two renders of 28 (shas 65711262, 1d41f5c5), stage 1 cold on disk before the keyed file opened. 168/168 cold answers on key; every item exclusive. Drops: R4 median >= 2 free strikes 8 (A11 B03 B08 B09 C02 D04 D05 D06), R3 weak 1 (D13), R4 key-free 2 (A13 B05), R5 path 1 (B11), R7 option-structure 3 (C05 run, C15 key = option + asymptote, D07 decimal sibling), R8 one-sided 1 (C10); HELD off-blueprint 2 (D09 D10). Kept median free strikes <= 1.' },
    tells: { passed: true, contentSha: sha, verdict: 'Recorded, not dropped: graders call B11-family u = b^x items (B12 B15) Desmos-bypassable; vertex-minimum family A06 A10 A14 A15 shares a theme (different givens); D08 key = 41 + 61 - 25 with 102 = 41 + 61 (not a key composite of options); B15 2.67/3.33 = 3 -/+ 1/3 pair; A14 and D14 keys in adjacent-integer pairs; shared key values 16 (A11 dropped/B01) and -17 (A01/D09 held).' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log(`${id}  sha ${sha.slice(0, 16)}  ${kept} items\nledger written`)
}

/* Second entry, added after the first insert: math-bank-helper refused the 5 panel-median EASY
 * items without BANK_BAND=mixed (the prereg inserts easy, capped at 6), and a re-run of the whole
 * kept file is refused by the stem-duplicate gate because the other 33 are now live. The easy five
 * go in as this byte-exact subset of the kept file, under the same gate verdicts. */
if (process.argv.includes('--easy')) {
  const L = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
  const f2 = `${D}/sat-math-v24-adv.kept-easy.batch.json`
  const sha2 = createHash('sha256').update(readFileSync(f2)).digest('hex')
  const id2 = 'sat-math-v24-adv-kept-easy-2026-10-08'
  if (L.batches.some(b => b.id === id2)) { console.error(`REFUSING: ${id2} already in ledger`); process.exit(2) }
  const base = L.batches.find(b => b.id === id)
  const st = {}; for (const [k, v] of Object.entries(base.stages)) st[k] = { ...v, contentSha: sha2, verdict: `Subset of ${id} (sha ${base.contentSha.slice(0, 16)}): the 5 panel-median easy items (A01 B01 B07 C01 D01), same gate run. ` + v.verdict }
  L.batches.push({ ...base, id: id2, contentSha: sha2, stages: st, note: 'The 5 easy items of the v24 Advanced Math kept file, inserted with BANK_BAND=mixed after the first insert refused them (easy in a hard-commissioned batch); the prereg inserts panel-median easy up to 6.' })
  L.generatedAt = new Date().toISOString()
  writeFileSync(`${D}/ledger.json`, JSON.stringify(L, null, 2))
  console.log(`${id2}  sha ${sha2.slice(0, 16)}  ledger written`)
}
