#!/usr/bin/env node
/**
 * Break-test for the A22 input contract (checker-input.mjs) across the six
 * checkers it was written for. No DB: every case is a batch file or a
 * refusal. Run from anywhere:
 *
 *   node scripts/study-bank/checker-input.breaktest.mjs
 *
 * Asserts, per checker: two different real batches give different output;
 * garbage / empty / object / scalar / missing input each exit 2; no args,
 * an unknown flag and --live-plus-a-path exit 2; --selftest passes; and a
 * batch with a PLANTED defect fires (exit 1) where its clean twin passes.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const FX = mkdtempSync(path.join(tmpdir(), 'a22-'))
writeFileSync(path.join(FX, 'garbage.json'), 'not json at all')
writeFileSync(path.join(FX, 'empty.json'), '[]')
writeFileSync(path.join(FX, 'object.json'), '{"items":[{"prompt":"x"}]}')
writeFileSync(path.join(FX, 'scalars.json'), '[1,2]')
/* Planted: P1 cites a non-key letter, P2 names the key slot by ordinal, P3
 * quotes the key verbatim, P4 points at a paragraph using "keep" twice, P5's
 * caption states the key and its label sits below the viewBox. */
const PLANTED = [
 {
  "id": "P1",
  "prompt": "Which choice?",
  "choices": [
   "alpha",
   "beta",
   "gamma",
   "delta"
  ],
  "correct_answer": "beta",
  "explanation": "Choice C is correct because gamma."
 },
 {
  "id": "P2",
  "prompt": "Which choice?",
  "choices": [
   "alpha",
   "beta",
   "gamma",
   "delta"
  ],
  "correct_answer": "gamma",
  "explanation": "The first misreads it, the second overstates it, and the third is right."
 },
 {
  "id": "P3",
  "passage": "The committee approved the bridge after engineers confirmed the steel would hold under winter loads.",
  "prompt": "Why?",
  "choices": [
   "engineers confirmed the steel would hold under winter loads",
   "the mayor vetoed it",
   "costs rose",
   "floods"
  ],
  "correct_answer": "engineers confirmed the steel would hold under winter loads",
  "explanation": "Stated."
 },
 {
  "id": "P4",
  "passage": "We keep grain in the cellar.\n\nThe old keep stood on the hill, and the monks would keep the feast.",
  "prompt": "As it is used in the second paragraph, the word \"keep\" most nearly means",
  "choices": [
   "fortress",
   "store",
   "observe",
   "hold"
  ],
  "correct_answer": "fortress",
  "explanation": "x"
 },
 {
  "id": "P5",
  "prompt": "Find the area.",
  "choices": [
   "18",
   "20",
   "24",
   "30"
  ],
  "correct_answer": "24",
  "explanation": "x",
  "graphic": {
   "type": "svg",
   "caption": "Total area = 24 square units",
   "svg": "<svg viewBox=\"0 0 300 300\" width=\"300\"><text x=\"10\" y=\"330\">0</text></svg>"
  }
 }
]
const CLEAN = [
 {
  "id": "P1",
  "prompt": "Which choice?",
  "choices": [
   "alpha",
   "beta",
   "gamma",
   "delta"
  ],
  "correct_answer": "beta",
  "explanation": "Choice B is correct because beta."
 },
 {
  "id": "P2",
  "prompt": "Which choice?",
  "choices": [
   "alpha",
   "beta",
   "gamma",
   "delta"
  ],
  "correct_answer": "gamma",
  "explanation": "Beta is right; the others misread it."
 },
 {
  "id": "P3",
  "passage": "The committee approved the bridge after engineers confirmed the steel would hold under winter loads.",
  "prompt": "Why?",
  "choices": [
   "its strength was verified",
   "engineers confirmed the steel would hold",
   "the mayor vetoed it",
   "costs rose"
  ],
  "correct_answer": "its strength was verified",
  "explanation": "Stated."
 },
 {
  "id": "P4",
  "passage": "We keep grain in the cellar.\n\nThe old keep stood on the hill, and the monks would keep the feast.",
  "prompt": "As it is used in the first paragraph, the word \"keep\" most nearly means",
  "choices": [
   "fortress",
   "store",
   "observe",
   "hold"
  ],
  "correct_answer": "fortress",
  "explanation": "x"
 },
 {
  "id": "P5",
  "prompt": "Find the area.",
  "choices": [
   "18",
   "20",
   "24",
   "30"
  ],
  "correct_answer": "24",
  "explanation": "x",
  "graphic": {
   "type": "svg",
   "caption": "Rectangle",
   "svg": "<svg viewBox=\"0 0 300 300\" width=\"300\"><text x=\"10\" y=\"290\">0</text></svg>"
  }
 }
]
writeFileSync(path.join(FX, 'planted.json'), JSON.stringify(PLANTED))
writeFileSync(path.join(FX, 'clean.json'), JSON.stringify(CLEAN))
const CS = ['check-explanation-option-refs', 'check-explanation-ordinals', 'check-verbatim-key', 'check-vocab-ambiguity', 'check-svg-viewbox', 'check-graphic-leak']
const run = (c, args) => { const r = spawnSync('node', [`scripts/study-bank/${c}.mjs`, ...args], { cwd: ROOT, encoding: 'utf8' }); return { code: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') } }
const pairs = {
  default: ['scripts/study-bank/sat-cs-hard-v3.batch.json', 'scripts/study-bank/reading-worlds-s2.batch.json'],
  'check-vocab-ambiguity': ['scripts/study-bank/act-reading-v4.batch.json', 'scripts/study-bank/act-reading-v1b.batch.json'],
  'check-svg-viewbox': ['scripts/study-bank/act-math-v4gi.batch.json', 'scripts/study-bank/sat-geo-v3.batch.json'],
  'check-graphic-leak': ['scripts/study-bank/act-math-v4gi.batch.json', 'scripts/study-bank/sat-geo-v3.batch.json'],
}
let fails = 0
const expect = (cond, msg) => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails++ }
for (const c of CS) {
  if (process.env.ONLY && process.env.ONLY !== c) continue
  console.log(c)
  const [a, b] = pairs[c] ?? pairs.default
  const ra = run(c, [a]), rb = run(c, [b])
  expect(ra.out !== rb.out && ra.code !== 2 && rb.code !== 2, `two real batches differ (exit ${ra.code}/${rb.code})`)
  expect(ra.out.includes(a) && !/WHOLE LIVE BANK/.test(ra.out), 'batch output names the file, not the live bank')
  expect(/scorable \d+ of \d+/.test(ra.out.split('\n').slice(0, 8).join('\n')), 'denominator printed before verdict')
  for (const bad of ['garbage.json', 'empty.json', 'object.json', 'scalars.json', 'missing.json']) {
    const r = run(c, [`${FX}/${bad}`]); expect(r.code === 2, `${bad} -> exit ${r.code}`)
  }
  const none = run(c, []); expect(none.code === 2, `no args -> exit ${none.code} (no default population)`)
  const unk = run(c, ['--bogus', a]); expect(unk.code === 2, `unknown flag -> exit ${unk.code}`)
  const both = run(c, ['--live', a]); expect(both.code === 2, `--live + path -> exit ${both.code}`)
  const st = run(c, ['--selftest']); expect(st.code === 0, `--selftest -> exit ${st.code}`)
  const pl = run(c, [`${FX}/planted.json`]), cl = run(c, [`${FX}/clean.json`])
  if (process.env.VERBOSE) console.log(pl.out, cl.out)
  if (c === 'check-verbatim-key') {
    const m = s => (s.match(/strategy score \/ control\s+([\d.]+)%/) ?? [])[1]
    expect(m(pl.out) && m(pl.out) !== m(cl.out), `planted verbatim key moves the strategy score (${m(pl.out)} vs ${m(cl.out)})`)
  } else expect(pl.code === 1 && cl.code === 0, `planted defect fires (exit ${pl.code}), clean twin passes (exit ${cl.code})`)
}
console.log(fails ? `\n${fails} FAILED` : '\nall break-tests pass')
process.exit(fails ? 1 : 0)
