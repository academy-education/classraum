#!/usr/bin/env node
// score.mjs — scores the iTEP Listening v3 gate (ITEP-SLATE-LISTENING-V3.prereg.md §4) with agent-review-score.mjs unchanged (exit 2, writing
// nothing, on any missing/malformed/short grader file), then copies every packet's grader files beside the result.
//   node scripts/study-bank/itep-listening-v3-work/score.mjs      (from the repo root)
import { execFileSync } from 'node:child_process'
import { copyFileSync, readFileSync, mkdirSync } from 'node:fs'
const W = 'scripts/study-bank/itep-listening-v3-work'
const M = 'scratchpad/agent-review/MANIFEST-itep-listening-v3.json'
try {
  process.stdout.write(execFileSync('node', ['scripts/study-bank/agent-review-score.mjs', '--manifest', M, '--out', `${W}/results`], { encoding: 'utf8' }))
} catch (e) { process.stderr.write(e.stderr || String(e)); process.exit(2) }
for (const p of JSON.parse(readFileSync(M, 'utf8')).packets) {
  const d = `${W}/results/${p.id}`; mkdirSync(d, { recursive: true })
  for (const f of ['index.json', 'packet.json', 'grades-a.json', 'grades-b.json', 'grades-c.json']) copyFileSync(`${p.dir}/${f}`, `${d}/${f}`)
}
copyFileSync(M, `${W}/results/MANIFEST.json`)
