#!/usr/bin/env node
/** Ledger entry for the Advanced Math v20 kept file, bound to its exact bytes. Run from the repo root. */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
const file = `${D}/sat-math-v20-adv.kept.batch.json`
const sha = createHash('sha256').update(readFileSync(file)).digest('hex')
const kept = JSON.parse(readFileSync(file, 'utf8')).length
const id = 'sat-math-v20-adv-kept-2026-10-02'
if (ledger.batches.some(b => b.id === id)) { console.error(`REFUSING: ${id} already in ledger`); process.exit(2) }
ledger.batches.push({
  id, createdAt: '2026-10-02', targetTest: 'sat', section: 'math',
  task: 'math_mc', family: 'mc_stem_source', cohort: 'sat-math-v20-adv', contentSha: sha, status: 'inserted',
  note: `Commissioned medium-weighted (PREREG-ADV20-2026-10-02.md) to buy SAT Math form 27 (needs Advanced Math +8). ${kept} kept: 1 panel-median HARD (B4) + 4 medium (A1 A5 A7 D2). DOES NOT BUY FORM 27. 21 authored in four rounds (A/B halves of 7, then C x3 and D x4 re-authored after audit drops pushed the gated file below the key-extremity bar); audit drops A4 B1 B5 C1 (>=2 free strikes); one repair round on A1 A6 B3 B6 C2 D3 (one distractor each, auditor-vetted). 17 gated. Gate drops: A6 (EXT-1, linear-linear composition off-blueprint per one grader), B7 (distractors weak 3/3). Not inserted, panel-median EASY: A2 A3 B2 B3 B6 C2 C3 D1 D3 D4. B4 explanation sentence corrected after the gate ("for every b > -3" was false; key and options unchanged).`,
  stages: {
    shape: { passed: true, contentSha: sha, verdict: `${kept} items, all 4-choice numeric. On the 17-item gate file: sandbox 17/17 and 51/51 distractor_solve recompute (mutation: a changed key and a changed distractor body are both refused); zero +-pair sets; zero key-as-unique-composite; no numeric hub; symbolic hub +4.2; key at an extreme 8/17 = 47.1% (gate bar 40.0%), key largest 23.5% / smallest 23.5%, consistent with live; no singleton tell; zero reviewer-facing text. Kept file: key extremity NO MEASUREMENT (n=5).` },
    withsource: { passed: true, contentSha: sha, verdict: 'Three fresh graders solved cold before reading keys: all three matched the key on all 17; every item exclusive. Kept five: free strikes median A1 1 (46.67 is the linear extrapolation; exponential decay lies above it), B4 1 (-21/4 by sign), others 0. Panel: B4 hard 3/3; A1 A5 A7 D2 medium 3/3. Off-blueprint by majority: none.' },
    nosource: { passed: true, contentSha: sha, verdict: 'Options-only attack on the 17-item gate file, three samples of one solver (pairwise agreement 78.4% vs 31.1% independent), 17 candidates interleaved with 17 composition-matched live Advanced Math items (13 medium + 4 hard, numeric, excluding v2 and the session cohorts; pool hard 52 / medium 126; minus glyph normalised across arms). CANDIDATE 43.1% vs CONTROL 37.3% (lines 29.4%): margin +5.9, inside the pre-registered +10; control far below the 90% ceiling. Unanimous-correct 5/17 vs 4/17 (rate only). Every pick labelled guess; heuristics: hub value, midpoint, sign/reciprocal pair.' },
    tells: { passed: true, contentSha: sha, verdict: 'Recorded, not dropped: A7 key = printed numerator at the excluded x (valid shortcut); D2 key 81 = 9 squared where 9 = c/a (the intended insight); B4 and D2 Desmos-bypassable by testing options; A1 and B4 unanimous in the blind half, each with one with-source strike only.' },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log(`${id}  sha ${sha.slice(0, 16)}  ${kept} items\nledger written`)
