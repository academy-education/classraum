#!/usr/bin/env node
// score.mjs — scores the iTEP Reading v1 gate (prereg §4) with agent-review-score.mjs unchanged (exit 2, writing
// nothing, on any missing/malformed/short grader file), then copies the grader files beside the result.
//   node scripts/study-bank/itep-reading-v1-work/score.mjs      (from the repo root)
import { execFileSync } from 'node:child_process'
import { copyFileSync, readFileSync } from 'node:fs'
const W = 'scripts/study-bank/itep-reading-v1-work'
const M = 'scratchpad/agent-review/MANIFEST-itep-reading-v1.json'
try {
  process.stdout.write(execFileSync('node', ['scripts/study-bank/agent-review-score.mjs', '--manifest', M, '--out', `${W}/results`], { encoding: 'utf8' }))
} catch (e) { process.stderr.write(e.stderr || String(e)); process.exit(2) }
const p = JSON.parse(readFileSync(M, 'utf8')).packets[0]
for (const f of ['index.json', 'packet.json', 'grades-a.json', 'grades-b.json', 'grades-c.json']) copyFileSync(`${p.dir}/${f}`, `${W}/results/${f}`)
copyFileSync(M, `${W}/results/MANIFEST.json`)
