#!/usr/bin/env node
/** Ledger entry for sat-sec-hard-v9.kept, bound to its exact bytes. Heredoc
 *  script file, never inline node -e (a ledger write died on a quote mark
 *  on 2026-09-21 after that rule was written down). */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const D = 'scripts/study-bank'
const file = `${D}/sat-sec-hard-v9.kept.batch.json`
const sha = createHash('sha256').update(readFileSync(file)).digest('hex')
const kept = JSON.parse(readFileSync(file, 'utf8')).length
const ledger = JSON.parse(readFileSync(`${D}/ledger.json`, 'utf8'))
ledger.batches.push({
  id: 'sat-sec-hard-v9-kept-2026-09-26', createdAt: '2026-09-26', targetTest: 'sat', section: 'reading_writing',
  task: 'multiple_choice', family: 'mc_hidden_source', cohort: 'rw-v9-sec-hard', contentSha: sha, status: 'inserted',
  note: `24 authored in two halves by two agents with disjoint rule areas (boundaries; form/structure/sense), each half audited by an independent auditor BEFORE the gate and repaired once against that audit (two one-rule reflex items dropped in the repair), merged to 22, gated by three fresh blind solvers and three fresh with-source graders. ${kept} kept. Two pronoun-case items (SEC9B-11, SEC9B-12) are grammatically exclusive and HELD, not dropped: all three graders say who/whom and I/me are not on the digital SAT Form/Structure/Sense list. Blueprint-fidelity question for Andy.`,
  stages: {
    shape: { passed: true, contentSha: sha, verdict: `${kept} items, one ______ blank each, 25-42 words, all four options one construction with one feature varied. Key letters spread; key uniquely longest 3 of 22 pre-drop. Among MIXED option sets (a plain and a marked option both offered) the key is plain in 2 of 9 against the live hard bank 6 of 9 -- the batch runs against the live tell. No 3+-word key text collides with the 309 live SEC items. No reviewer-facing text in any explanation.` },
    withsource: { passed: true, contentSha: sha, verdict: `THREE INDEPENDENT GRADERS, EACH SOLVING FROM THE PASSAGE BEFORE READING THE EXPLANATION: 22 of 22 keys matched on all three grades, the unanimity accepts.mjs requires for Conventions. Two graders found no second defensible option anywhere; one called SEC9B-02 non-exclusive ("to whoever" accepted in edited AmE) and it is dropped on that single explicit recommendation. Pre-registered rule drops: five items on a grader-majority resolving word within four of the blank (A-01 hunt, A-08 and, A-09 so, A-11 show, A-12 was), two on distractors weak by majority (B-04, B-10). Difficulty by panel median: 8 medium, 3 hard; the authors labelled all 22 hard.` },
    nosource: { passed: true, contentSha: sha, verdict: `Options-only attack, three solvers, 22 candidates interleaved with 22 live HARD-band SEC items (the whole live hard band is 27; --control-difficulty hard, added for this run) with the key slot dealt flat. CANDIDATE 57.6% (38/66) vs LIVE CONTROL 63.6% (42/66), margin -6.1, inside the pre-registered +10 bar. BOTH ARMS SIT 30-36 POINTS ABOVE THEIR LETTER LINE: options-only SEC is largely decidable from the grammar inside the options, so the instrument is near saturation on this family and the with-source half decides, per the standing rule. Solver independence measured: pairwise agreement 81.8% against 26.2% under independence. Unanimity reported as a batch rate: candidate 10/22, control 12/22.` },
    elimination: { passed: true, contentSha: sha, verdict: `The solvers named their eliminations. The dangling-modifier shape (four full clauses, exactly one with the human agent as subject) resolves to two live controls at 3/3 and to the two reshaped candidates SEC9B-04 and SEC9B-09 at 3/3; B-04 dropped by the rule, B-09 kept at a panel median of medium with the finding recorded. The dash-open/comma-close mismatch distractor is never the key in 5 of 10 boundary items -- monotone with the real convention rather than a leak, but a reused distractor family and recorded as such.` },
    tells: { passed: true, contentSha: sha, verdict: `Cross-item: A-01 and A-11 were the same item twice and both fell to the rule before the duplicate had to be adjudicated. In the form block the key agreed with the FURTHEST head noun in every agreement item as authored; the repair flipped two keys to plural against a singular attractor. Pronoun case is 4 of 22 as authored -- one dropped by rule, one by an explicit grader drop, two held on blueprint fidelity. Every four-item block of the authored file was a complete ABCD permutation; choices are shuffled per item at draw time so students never see authored order.` },
  },
})
ledger.generatedAt = new Date().toISOString()
writeFileSync(`${D}/ledger.json`, JSON.stringify(ledger, null, 2))
console.log(`ledger: sat-sec-hard-v9-kept-2026-09-26  sha ${sha.slice(0,16)}  ${kept} items`)
